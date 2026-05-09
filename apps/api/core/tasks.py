import json
import logging
import uuid
from arq import create_pool, cron
from arq.connections import RedisSettings
from modules.protocols.arcium_client import ArciumClient
from db.models.models import Task, Workflow, WorkflowRun, Agent, MarketOrder
from sqlalchemy import select
from db.session import AsyncSessionLocal
from core.config import (
    REDIS_QUEUE_HOST,
    REDIS_QUEUE_PORT,
    REDIS_PUBSUB_HOST,
    REDIS_PUBSUB_PORT,
    REDIS_PASSWORD,
)

logger = logging.getLogger(__name__)
arcium_client = ArciumClient()


async def run_agent_task(
    ctx,
    task_id: str,
    agent_id: str,
    input_data: dict,
    creator_wallet: str,
    depth: int = 0,
):
    """
    VACN Protocol Worker: Executes agent in a Confidential VM
    and generates a Verifiable Execution Receipt.
    """
    if depth > 3:
        logger.error(
            f"Worker: Task {task_id} exceeded recursion depth {depth}. Aborting."
        )
        return

    logger.info(f"Worker: Starting AgentOS task {task_id} (depth: {depth})")
    redis_pubsub = ctx["redis_pubsub"]

    async with AsyncSessionLocal() as db:
        # 1. Load Task State
        task_res = await db.execute(select(Task).where(Task.id == task_id))
        db_task = task_res.scalars().first()

        if not db_task or db_task.status in ["settled", "failed"]:
            return

        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()

        if not agent:
            logger.error(f"Worker: Agent {agent_id} not found")
            return

        # 2. Protocol Security: Verify Funds (Agentic Billing)
        from modules.billing import treasury_service

        is_solvent = await treasury_service.check_user_solvency(
            db, db_task.user_wallet, 0.0001
        )

        if not is_solvent:
            db_task.status = "failed"
            db_task.result = json.dumps({"error": "Insufficient funds in App Wallet."})
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "failed", "error": "Insufficient funds."}))
            return

        # 3. Update to 'running'
        db_task.status = "running"
        await db.commit()
        await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "running"}))

        # 4. VACN Execution
        try:
            current_ver = next(
                (v for v in agent.versions if v["version"] == agent.current_version),
                agent.versions[-1],
            )

            # Execute in verifiable VM
            exec_envelope = await arcium_client.execute_confidential_task(
                agent.id,
                current_ver["files"],
                input_data,
                current_ver.get("requirements", []),
                current_ver.get("entrypoint", ""),
                env_vars=agent.env_vars,
            )

            exec_result = exec_envelope["result"]
            receipt_sig = exec_envelope["execution_receipt"]

            is_success = exec_result.get("status") != "failed"
            status = "completed" if is_success else "failed"
            result_data = exec_result.get("data", "")
            usage = exec_result.get("usage", {})
            
            input_tokens = usage.get("input_tokens", len(json.dumps(input_data)) // 4)
            output_tokens = usage.get("output_tokens", len(json.dumps(result_data)) // 4)

            # 5. Update Task State
            db_task.status = "settled" if is_success else "failed"
            db_task.result = json.dumps(result_data)
            db_task.poae_hash = receipt_sig
            db_task.input_tokens = input_tokens
            db_task.output_tokens = output_tokens

            # Update Agent Stats
            agent.total_runs += 1
            actual_cost = 0.0
            if is_success:
                agent.successful_runs += 1
                # Deduct from User based on tokens (Credits Agent Creator)
                actual_cost = await treasury_service.deduct_agentic_fee(
                    db, db_task.user_wallet, agent.id, input_tokens, output_tokens
                )

            await db.commit()
            await redis_pubsub.publish(
                f"task:{task_id}",
                json.dumps({
                    "status": db_task.status,
                    "result": result_data,
                    "receipt_hash": receipt_sig,
                    "cost_deducted": actual_cost,
                    "tokens": {"in": input_tokens, "out": output_tokens}
                }),
            )

            # 6. M2M Hiring
            if status == "completed":
                hire_requests = exec_result.get("hire_requests", [])
                for hire in hire_requests:
                    hired_id = hire.get("agent_id")
                    hired_input = hire.get("input_data")
                    new_task_id = f"m2m_{task_id[:8]}_{uuid.uuid4().hex[:6]}"

                    m2m_task = Task(
                        id=new_task_id,
                        agent_id=hired_id,
                        user_wallet=db_task.user_wallet,
                        input_data=json.dumps(hired_input),
                        status="queued",
                        depth=depth + 1
                    )
                    db.add(m2m_task)
                    await db.commit()

                    await ctx["redis"].enqueue_job(
                        "run_agent_task",
                        task_id=new_task_id,
                        agent_id=hired_id,
                        input_data=hired_input,
                        creator_wallet=agent.creator_wallet,
                        depth=depth + 1,
                    )

        except Exception as e:
            logger.error(f"Worker: Critical error in task {task_id}: {e}", exc_info=True)
            db_task.status = "failed"
            db_task.result = json.dumps({"error": str(e)})
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "failed", "error": str(e)}))


async def run_agent_bidding_evaluation(
    ctx, order_id: str, agent_id: str, budget: float
):
    """
    Autonomous Bidding Worker: Executes agent logic to autonomously decide
    whether to bid on a market order.
    """
    logger.info(f"MARKET_ENGINE: Agent {agent_id} evaluating order {order_id}")

    async with AsyncSessionLocal() as db:
        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        if not agent:
            return

        from modules.marketplace import service as market_service
        order = await market_service.get_order_by_id(db, order_id)
        if not order:
            return

        try:
            current_ver = next(
                (v for v in agent.versions if v["version"] == agent.current_version),
                agent.versions[-1],
            )

            input_data = {
                "intent": "market_bid_evaluation",
                "order_title": order.title,
                "order_description": order.description,
                "budget": order.budget,
            }

            exec_envelope = await arcium_client.execute_confidential_task(
                agent.id,
                current_ver["files"],
                input_data,
                current_ver.get("requirements", []),
                current_ver.get("entrypoint", ""),
            )

            decision = exec_envelope["result"].get("data", {})
            if isinstance(decision, dict) and decision.get("action") == "place_bid":
                bid_amount = decision.get("amount", budget)
                proposal = decision.get("proposal", f"Autonomous bid from {agent.name}")

                await market_service.create_bid(
                    db,
                    order_id,
                    agent.id,
                    bid_amount,
                    proposal
                )
                logger.info(f"MARKET_ENGINE: Agent {agent.id} placed a bid of {bid_amount} SOL")

        except Exception as e:
            logger.error(f"MARKET_ENGINE: Bidding failed for agent {agent_id}: {e}")


async def run_verifier_node_audit(ctx):
    """
    Practical Audit Worker: Re-runs a sample of 'settled' tasks to verify honesty.
    """
    async with AsyncSessionLocal() as db:
        # Sample settled tasks
        res = await db.execute(
            select(Task).where(Task.status == "settled").limit(5)
        )
        tasks = res.scalars().all()

        for task in tasks:
            logger.info(f"VERIFIER_NODE: Auditing task {task.id}")
            try:
                agent_res = await db.execute(select(Agent).where(Agent.id == task.agent_id))
                agent = agent_res.scalars().first()
                if not agent:
                    continue

                current_ver = next((v for v in agent.versions if v["version"] == agent.current_version), agent.versions[-1])
                input_data = json.loads(task.input_data)

                replay_envelope = await arcium_client.execute_confidential_task(
                    agent.id,
                    current_ver["files"],
                    input_data,
                    current_ver.get("requirements", []),
                    current_ver.get("entrypoint", ""),
                )

                original_hash = task.poae_hash.split(":")[0] if ":" in task.poae_hash else task.poae_hash
                replay_hash = replay_envelope["execution_receipt"].split(":")[0]

                if original_hash == replay_hash:
                    logger.info(f"VERIFIER_NODE: Task {task.id} verified.")
                else:
                    logger.warning(f"VERIFIER_NODE: FRAUD DETECTED in task {task.id}!")
                    task.status = "disputed"
                    await db.commit()
            except Exception as e:
                logger.error(f"VERIFIER_NODE: Audit failed for {task.id}: {e}")


async def process_market_matching(ctx):
    from modules.marketplace.matching_engine import MatchingEngine
    engine = MatchingEngine()
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(MarketOrder).where(MarketOrder.status == "open"))
        orders = res.scalars().all()
        for order in orders:
            await engine.trigger_autonomous_bidding(db, order.id)


async def run_workflow_task(ctx, run_id: str, workflow_id: str, initial_input: dict):
    logger.info(f"SWARM_OS: Orchestrating graph run {run_id}")
    redis_pubsub = ctx["redis_pubsub"]
    
    async with AsyncSessionLocal() as db:
        # 1. Load State
        res_w = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
        workflow = res_w.scalars().first()
        res_r = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        run = res_r.scalars().first()

        if not workflow or not run:
            logger.error(f"SWARM_OS: Workflow or Run not found for {run_id}")
            return

        is_simulation = workflow.nodes[0].get('is_simulation_mode', False) if isinstance(workflow.nodes, list) else False
        # Re-check from root if stored differently, but practical check:
        # Metadata check is better
        # (For now let's assume it's passed or stored in Workflow model)
        
        nodes_map = {n['id']: n for n in workflow.nodes}
        edges_list = workflow.edges

        # 2. Start Execution
        start_node = next((n for n in workflow.nodes if n['type'] == 'START'), None)
        if not start_node:
            run.status = "failed"
            run.results['error'] = "No START node found"
            await db.commit()
            return

        run.status = "running"
        await db.commit()

        queue = [start_node['id']]
        visited = set()
        node_outputs = {"initial": initial_input}
        last_output = initial_input

        while queue:
            node_id = queue.pop(0)
            if node_id in visited:
                continue
            visited.add(node_id)
            
            node = nodes_map.get(node_id)
            if not node:
                continue

            logger.info(f"SWARM_OS: Executing node {node_id} ({node['type']})")
            run.active_nodes = [node_id]
            await db.commit()

            node_result = None

            if node['type'] == 'START':
                node_result = initial_input
            
            elif node['type'] == 'AGENT':
                agent_id = node['config'].get('agent_id')
                agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
                agent = agent_res.scalars().first()
                if agent:
                    try:
                        current_ver = next((v for v in agent.versions if v["version"] == agent.current_version), agent.versions[-1])
                        
                        # Billing: Skip for simulation
                        if not is_simulation:
                            from modules.billing import treasury_service
                            is_solvent = await treasury_service.check_user_solvency(db, run.user_wallet, 0.0001)
                            if not is_solvent:
                                run.status = "failed"
                                run.results['error'] = f"Insufficient funds for agent {agent.name}"
                                await db.commit()
                                return

                            envelope = await arcium_client.execute_confidential_task(
                                agent.id, current_ver["files"], last_output,
                                current_ver.get("requirements", []), current_ver.get("entrypoint", ""),
                                env_vars=agent.env_vars
                            )
                            node_result = envelope.get("result", {})
                            
                            # Billing: Deduct fee
                            await treasury_service.deduct_agentic_fee(
                                db, run.user_wallet, agent.id, 
                                len(json.dumps(last_output))//4, 
                                len(json.dumps(node_result))//4
                            )
                        else:
                            # SIMULATION MODE: Mock output or pass-through
                            logger.info(f"SWARM_OS: [SIMULATION] Mocking execution for {agent.name}")
                            node_result = {
                                "status": 200, 
                                "data": f"Simulation output for {agent.name}", 
                                "original_input": last_output,
                                "is_simulation": True
                            }
                    except Exception as e:
                        logger.error(f"SWARM_OS: Agent node {node_id} failed: {e}")
                        node_result = {"status": "failed", "error": str(e)}
                else:
                    node_result = {"status": "failed", "error": "Agent not found"}

            elif node['type'] == 'CONDITION':
                field = node['config'].get('field', '')
                expected_value = node['config'].get('value', '')
                
                # Support nested access
                actual_value = last_output
                for p in field.split('.'):
                    if isinstance(actual_value, dict):
                        actual_value = actual_value.get(p)
                    else:
                        actual_value = None
                        break
                
                condition_met = str(actual_value) == str(expected_value)
                handle = "true" if condition_met else "false"
                
                logger.info(f"SWARM_OS: Logic Gate {node_id}: {field}({actual_value}) == {expected_value} -> {condition_met}")
                
                next_edges = [e for e in edges_list if e['source'] == node_id and e.get('source_handle') == handle]
                if not next_edges:
                    next_edges = [e for e in edges_list if e['source'] == node_id]
                
                for e in next_edges:
                    queue.append(e['target'])
                
                run.results['steps'].append({"node_id": node_id, "type": "CONDITION", "result": {"met": condition_met, "handle": handle}})
                await db.commit()
                continue 

            elif node['type'] == 'END':
                run.status = "completed"
                run.results['final_output'] = last_output
                run.active_nodes = []
                await db.commit()
                await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "completed", "output": last_output}))
                return

            # Store result and update last_output
            node_outputs[node_id] = node_result
            last_output = node_result
            
            run.results['steps'].append({"node_id": node_id, "type": node['type'], "output": node_result})
            await db.commit()
            await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "running", "node": node_id}))

            # Standard edge finding
            next_edges = [e for e in edges_list if e['source'] == node_id]
            for e in next_edges:
                queue.append(e['target'])

        run.status = "completed"
        await db.commit()
        await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "completed"}))


async def on_startup(ctx):
    """
    Worker Startup: Initialize shared resources like Redis PubSub.
    """
    ctx["redis_pubsub"] = await create_pool(
        RedisSettings(
            host=REDIS_PUBSUB_HOST, port=REDIS_PUBSUB_PORT, password=REDIS_PASSWORD
        )
    )
    logger.info("Worker: Shared Redis PubSub pool initialized.")


async def on_shutdown(ctx):
    """
    Worker Shutdown: Clean up resources.
    """
    if "redis_pubsub" in ctx:
        await ctx["redis_pubsub"].close()
    logger.info("Worker: Shared resources cleaned up.")


# ARQ Worker Settings
class WorkerSettings:
    on_startup = on_startup
    on_shutdown = on_shutdown
    functions = [
        run_agent_task,
        run_agent_bidding_evaluation,
        run_verifier_node_audit,
        process_market_matching,
        run_workflow_task,
    ]
    redis_settings = RedisSettings(
        host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT, password=REDIS_PASSWORD
    )
    # Cron Jobs: Run market matching and verifier audits every minute
    cron_jobs = [
        cron(process_market_matching, minute={0, 1, 2, 3, 4, 5, 10, 20, 30, 40, 50}),
        cron(run_verifier_node_audit, minute={0, 15, 30, 45}),
    ]
