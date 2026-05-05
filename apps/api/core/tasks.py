import hashlib
import json
import asyncio
import logging
import uuid
import os
from arq import create_pool
from arq.connections import RedisSettings
from backend.modules.protocols.arcium_client import ArciumClient
from backend.modules.protocols.squads_client import SquadsClient
from backend.modules.protocols.switchboard_client import SwitchboardClient
from backend.modules.billing import service as billing_service
from backend.modules.billing import treasury_service
from backend.db.models.models import Task, Workflow, WorkflowRun, Agent, MarketOrder
from sqlalchemy import update, select
from backend.db.session import AsyncSessionLocal

from backend.core.config import (
    REDIS_QUEUE_HOST, REDIS_QUEUE_PORT, 
    REDIS_PUBSUB_HOST, REDIS_PUBSUB_PORT, 
    REDIS_PASSWORD
)

logger = logging.getLogger(__name__)

arcium_client = ArciumClient()
squads_client = SquadsClient()
switchboard_client = SwitchboardClient()

async def run_agent_task(ctx, task_id: str, agent_id: str, input_data: dict, creator_wallet: str, price: float, depth: int = 0):
    """
    VACN Protocol Worker: Executes agent in a Confidential VM (Arcium) 
    and generates a cryptographic Proof of Autonomous Execution (PoAE).
    """
    if depth > 3:
        logger.error(f"Worker: Task {task_id} exceeded recursion depth {depth}. Aborting.")
        return

    logger.info(f"Worker: Starting AgentOS task {task_id} (depth: {depth})")
    redis_pubsub = ctx['redis_pubsub']
    
    async with AsyncSessionLocal() as db:
        # 1. Load Task State
        task_res = await db.execute(select(Task).where(Task.id == task_id))
        db_task = task_res.scalars().first()
        
        if not db_task or db_task.status in ["completed", "failed", "settled"]:
            logger.warning(f"Worker: Task {task_id} skipping (state: {db_task.status if db_task else 'not found'})")
            return

        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        
        if not agent:
            logger.error(f"Worker: Agent {agent_id} not found")
            return

        # 2. Protocol Security: Verify On-chain Escrow
        # Ensure the task has been funded on-chain before executing.
        escrow_ok, detail = await billing_service.verify_escrow_funded(
            task_id, agent.price
        )
        if not escrow_ok:
            logger.warning(f"Worker: Task {task_id} aborted - {detail}")
            db_task.status = "failed"
            db_task.result = f"On-chain Escrow Error: {detail}"
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({
                "status": "failed", 
                "error": f"Task not funded. Please initialize on-chain escrow. ({detail})"
            }))
            return

        # 3. Update to 'running'
        db_task.status = "running"
        await db.commit()
        await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "running"}))

        # 3. VACN Execution: Verifiable Compute (Arcium)
        try:
            current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
            
            # Execute in Arcium (Confidential VM / WASM)
            exec_envelope = await arcium_client.execute_confidential_task(
                agent.id, 
                current_ver['files'], 
                input_data
            )
            
            exec_result = exec_envelope["result"]
            receipt_sig = exec_envelope["execution_receipt"] # Deterministic Execution Receipt
            
            status = "completed" if exec_result["status"] == "success" else "failed"
            result_data = exec_result.get("data", "")
            
            # 4. Generate Protocol Receipt
            receipt_metadata = {
                "task_id": task_id,
                "agent_id": agent_id,
                "input_hash": hashlib.sha256(json.dumps(input_data).encode()).hexdigest(),
                "execution_receipt": receipt_sig,
                "timestamp": str(asyncio.get_event_loop().time())
            }

            # 5. Update Task with Receipt
            await db.execute(
                update(Task).where(Task.id == task_id).values(
                    status=status, 
                    result=json.dumps(result_data),
                    execution_receipt=receipt_metadata,
                    poae_hash=receipt_sig
                )
            )
            
            # Update Agent Execution Stats
            agent.total_runs += 1
            if status == "completed":
                agent.successful_runs += 1
                # Wallet OS: Record earnings (Now settled on-chain)
                await treasury_service.record_agent_earnings(db, agent.id, agent.price)
            
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({
                "status": status, 
                "result": result_data,
                "receipt_hash": receipt_sig
            }))
            
            # 6. AgentOS Machine Economy: True M2M Hiring via Squads
            hire_requests = exec_result.get("hire_requests", [])
            for hire in hire_requests:
                hired_id = hire.get("agent_id")
                hired_input = hire.get("input_data")
                new_task_id = f"m2m_{task_id[:8]}_{uuid.uuid4().hex[:6]}"
                
                if agent.squads_vault_pda:
                    signed_ok = await squads_client.sign_m2m_escrow(agent.squads_vault_pda, hired_id, 0.01)
                    if signed_ok:
                        await ctx['redis_queue'].enqueue_job(
                            'run_agent_task',
                            task_id=new_task_id,
                            agent_id=hired_id,
                            input_data=hired_input,
                            creator_wallet=agent.creator_wallet,
                            price=0.01,
                            depth=depth + 1
                        )

            # 7. Protocol Verification: Oracle verification
            logger.info(f"VACN Protocol: Submitting receipt for task {task_id} to Switchboard")
            sb_tx = await switchboard_client.create_verification_request(task_id, receipt_sig)
            
            # 8. Protocol Sequencing: Push to Settlement Mempool (V2 Frontier)
            # We no longer settle directly from the worker.
            # We push the task to a mempool for decentralized sequencing/relaying.
            logger.info(f"VACN Protocol: Task {task_id} entering Settlement Mempool.")
            await ctx['redis_queue'].redis.lpush("SETTLEMENT_MEMPOOL", task_id)
            
            # Update status to sequencing
            db_task.status = "sequencing"
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "sequencing", "mempool": "SETTLEMENT_MEMPOOL"}))

        except Exception as e:
            logger.error(f"Worker: Critical protocol error in task {task_id}: {e}", exc_info=True)
            await db.execute(update(Task).where(Task.id == task_id).values(status="failed", result=str(e)))
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "failed", "error": str(e)}))

async def run_agent_bidding_evaluation(ctx, order_id: str, agent_id: str, budget: float):
    """
    Autonomous Bidding Worker: Executes agent logic to autonomously decide
    whether to bid on a market order.
    """
    logger.info(f"MARKET_ENGINE: Agent {agent_id} evaluating order {order_id}")
    
    async with AsyncSessionLocal() as db:
        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        if not agent: return

        # Load order details
        from backend.modules.marketplace import service as market_service
        order = await market_service.get_order_by_id(db, order_id)
        if not order: return

        try:
            current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
            
            # 1. Execute Agent Bidding Strategy
            input_data = {
                "intent": "market_bid_evaluation",
                "order_title": order.title,
                "order_description": order.description,
                "budget": order.budget
            }
            
            exec_envelope = await arcium_client.execute_confidential_task(
                agent.id, 
                current_ver['files'], 
                input_data
            )
            
            # 2. Parse Bid Decision
            # We expect the agent to return a bid payload if interested
            decision = exec_envelope["result"].get("data", {})
            if isinstance(decision, dict) and decision.get("action") == "place_bid":
                bid_amount = decision.get("amount", agent.price)
                proposal = decision.get("proposal", f"Autonomous bid from {agent.name}")
                
                logger.info(f"MARKET_ENGINE: Agent {agent_id} decided to bid {bid_amount} SOL")
                
                from backend.schemas.marketplace import BidCreate
                await market_service.place_bid(db, order_id, BidCreate(
                    agent_id=agent.id,
                    amount=bid_amount,
                    proposal=proposal
                ))
                
        except Exception as e:
            logger.error(f"MARKET_ENGINE: Bidding evaluation failed for {agent_id}: {e}")

async def verify_execution_receipts(ctx):
    """
    Protocol Verifier Node: Periodically scans for unverified execution receipts
    and replays the computation to ensure honesty before settlement.
    """
    logger.info("VERIFIER_NODE: Scanning for execution receipts to audit...")
    
    async with AsyncSessionLocal() as db:
        # Find tasks that are 'completed' but not yet 'verified' or 'verifying' on-chain
        res = await db.execute(select(Task).where(Task.status == "completed"))
        unverified_tasks = res.scalars().all()
        
        for task in unverified_tasks:
            logger.info(f"VERIFIER_NODE: Auditing receipt for task {task.id}")
            
            try:
                agent_res = await db.execute(select(Agent).where(Agent.id == task.agent_id))
                agent = agent_res.scalars().first()
                if not agent: continue

                # 1. Replay Execution
                current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
                input_data = json.loads(task.input_data)
                
                replay_envelope = await arcium_client.execute_confidential_task(
                    agent.id, 
                    current_ver['files'], 
                    input_data
                )
                
                # 2. Compare Receipts
                # The receipt now includes a TEE enclave signature: "hash:signature"
                original_receipt = task.poae_hash
                replay_receipt = replay_envelope["execution_receipt"]
                
                original_hash = original_receipt.split(":")[0] if ":" in original_receipt else original_receipt
                replay_hash = replay_receipt.split(":")[0] if ":" in replay_receipt else replay_receipt
                
                if original_hash == replay_hash:
                    logger.info(f"VERIFIER_NODE: Receipt verified for {task.id}. Honest execution.")
                    # In a real protocol, this would be a signed attestation from the verifier node
                else:
                    logger.warning(f"VERIFIER_NODE: FRAUD DETECTED in task {task.id}! Receipt mismatch.")
                    task.status = "disputed"
                    
                    # Program C: Automatic Dispute Resolution
                    from backend.modules.marketplace import service as market_service
                    from backend.schemas.marketplace import DisputeCreate, DisputeResolve
                    
                    dispute = await market_service.create_dispute(
                        db, 
                        DisputeCreate(
                            task_id=task.id, 
                            reason="Verifier node detected receipt mismatch", 
                            evidence={"original_receipt": original_receipt, "replay_receipt": replay_receipt}
                        ), 
                        "VERIFIER_NODE"
                    )
                    
                    if dispute:
                        await market_service.resolve_dispute(
                            db,
                            dispute.id,
                            DisputeResolve(
                                resolution="slash",
                                resolution_details="Automatic slashing by Verifier Consensus"
                            ),
                            "VERIFIER_NODE"
                        )
                    else:
                        await db.commit()
                    
            except Exception as e:
                logger.error(f"VERIFIER_NODE: Audit failed for {task.id}: {e}")

async def finalize_vacn_settlements(ctx):
    """
    Cron-like task to finalize optimistic settlements.
    In Phase 3, this moves tasks from 'verifying' to 'settled'.
    """
    logger.info("VACN_FINALIZER: Scanning for matured challenge periods...")
    async with AsyncSessionLocal() as db:
        # Find tasks in 'verifying' status
        res = await db.execute(select(Task).where(Task.status == "verifying"))
        matured_tasks = res.scalars().all()
        
        for task in matured_tasks:
            logger.info(f"VACN_FINALIZER: Finalizing task {task.id}")
            
            # Protocol Call: Finalize on-chain
            agent_res = await db.execute(select(Agent).where(Agent.id == task.agent_id))
            agent = agent_res.scalars().first()
            
            if agent:
                ok, tx_sig = await billing_service.finalize_task_settlement(
                    task.id, task.user_wallet, agent.creator_wallet
                )
                if ok:
                    task.status = "settled"
                    task.settlement_signature = tx_sig
                    await db.commit()
                    logger.info(f"VACN_FINALIZER: Task {task.id} finalized. Sig: {tx_sig}")

async def process_market_matching(ctx):
    """
    Cron-like task to run the Labor Market Matching Engine.
    Triggers autonomous agents to evaluate and bid on open orders.
    """
    logger.info("MARKET_ENGINE: Scanning for new labor opportunities...")
    from backend.modules.marketplace.matching_engine import MatchingEngine
    engine = MatchingEngine()
    
    async with AsyncSessionLocal() as db:
        # Get all open orders
        res = await db.execute(select(MarketOrder).where(MarketOrder.status == "open"))
        orders = res.scalars().all()
        
        for order in orders:
            await engine.trigger_autonomous_bidding(db, order.id)

async def process_settlement_mempool(ctx):
    """
    Decentralized Sequencer Worker: Processes receipts from the mempool.
    In Phase 2, this is triggered by verifier attestations. 
    Currently, it acts as the primary protocol relayer.
    """
    redis = ctx['redis_queue'].redis
    task_id = await redis.rpop("SETTLEMENT_MEMPOOL")
    
    if not task_id:
        return
        
    if isinstance(task_id, bytes):
        task_id = task_id.decode()

    logger.info(f"SEQUENCER: Processing task {task_id} from mempool.")
    redis_pubsub = ctx['redis_pubsub']

    async with AsyncSessionLocal() as db:
        # 1. Load Task and Agent
        task_res = await db.execute(select(Task).where(Task.id == task_id))
        db_task = task_res.scalars().first()
        
        if not db_task or db_task.status != "sequencing":
            logger.warning(f"SEQUENCER: Task {task_id} invalid for settlement (state: {db_task.status if db_task else 'None'})")
            return

        agent_res = await db.execute(select(Agent).where(Agent.id == db_task.agent_id))
        agent = agent_res.scalars().first()
        
        if not agent:
            logger.error(f"SEQUENCER: Agent {db_task.agent_id} not found for task {task_id}")
            return

        try:
            # 2. Protocol Settlement: Propose outcome on-chain
            logger.info(f"SEQUENCER: Submitting receipt for task {task_id} to Solana Escrow.")
            settle_ok, tx_sig = await billing_service.settle_task_payment_onchain(
                task_id, db_task.user_wallet, agent.creator_wallet, True, db_task.poae_hash
            )
            
            if settle_ok:
                # Update status to verifying (Challenge Period active)
                db_task.status = "verifying"
                db_task.settlement_signature = tx_sig
                await db.commit()
                await redis_pubsub.publish(f"task:{task_id}", json.dumps({
                    "status": "verifying", 
                    "challenge_sig": tx_sig,
                    "sequencer": "shoujiki_relayer_01"
                }))
                logger.info(f"SEQUENCER: Task {task_id} settled on-chain. Sig: {tx_sig}")
            else:
                logger.error(f"SEQUENCER: On-chain settlement failed for task {task_id}: {tx_sig}")
                # Optional: Push back to mempool or flag as stalled
                
        except Exception as e:
            logger.error(f"SEQUENCER: Critical error settling task {task_id}: {e}")

async def run_workflow_task(ctx, run_id: str, workflow_id: str, initial_input: dict):
    """
    Swarm OS Orchestrator (Layer 3): Manages a DAG of agents.
    Dispatches independent steps in parallel and tracks dependency resolution.
    """
    logger.info(f"SWARM_OS: Orchestrating workflow run {run_id}")
    redis_pubsub = ctx['redis_pubsub']
    
    async with AsyncSessionLocal() as db:
        # 1. Load State
        run_res = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        db_run = run_res.scalars().first()
        if not db_run or db_run.status in ["completed", "failed"]:
            return

        wf_res = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
        workflow = wf_res.scalars().first()
        if not workflow: return

        # Initialize tracking
        if not db_run.completed_steps:
            db_run.completed_steps = {}
            db_run.results = {"steps": [], "initial_input": initial_input}
            db_run.status = "running"
            await db.commit()

        # 2. Determine Ready Steps
        # A step is 'ready' if its depends_on list is satisfied by completed_steps
        ready_steps = []
        all_completed = True
        
        for step in workflow.steps:
            step_id = step.get("id")
            if step_id in db_run.completed_steps:
                continue
            
            all_completed = False
            depends_on = step.get("depends_on", [])
            
            # Check if dependencies are met
            deps_satisfied = all(dep_id in db_run.completed_steps for dep_id in depends_on)
            
            # Check if currently being executed (not yet completed but enqueued)
            # We use Redis to track 'in_flight' steps for this run
            in_flight = await ctx['redis_queue'].redis.get(f"wf_flight:{run_id}:{step_id}")
            
            if deps_satisfied and not in_flight:
                ready_steps.append(step)

        # 3. Dispatch Ready Steps
        if ready_steps:
            for step in ready_steps:
                step_id = step.get("id")
                # Mark as in-flight
                await ctx['redis_queue'].redis.setex(f"wf_flight:{run_id}:{step_id}", 300, "1")
                
                await ctx['redis_queue'].enqueue_job(
                    'run_workflow_step_task',
                    run_id=run_id,
                    workflow_id=workflow_id,
                    step=step,
                    initial_input=initial_input
                )
            logger.info(f"SWARM_OS: Dispatched {len(ready_steps)} parallel steps for run {run_id}")
        
        elif all_completed:
            # 4. Finalize Swarm
            db_run.status = "completed"
            await db.commit()
            await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "completed", "results": db_run.results}))
            logger.info(f"SWARM_OS: Swarm run {run_id} finalized.")

async def run_workflow_step_task(ctx, run_id: str, workflow_id: str, step: dict, initial_input: dict):
    """
    Executes a single node within a Swarm OS DAG.
    """
    step_id = step["id"]
    agent_id = step["agent_id"]
    template = step["input_template"]
    
    logger.info(f"SWARM_OS: Executing swarm node {step_id} (Agent {agent_id})")
    redis_pubsub = ctx['redis_pubsub']

    async with AsyncSessionLocal() as db:
        run_res = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        db_run = run_res.scalars().first()
        if not db_run: return

        try:
            agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
            agent = agent_res.scalars().first()
            if not agent: raise Exception("Agent not found")

            # 1. Resolve Input from dependencies
            depends_on = step.get("depends_on", [])
            if not depends_on:
                prev_out = initial_input
            else:
                # Aggregate outputs from all listed dependencies
                prev_out = {dep_id: db_run.completed_steps[dep_id]["output"] for dep_id in depends_on}

            step_input = {"input": prev_out}
            if template and "{{previous_result}}" in template:
                # Simple single-dependency fallback for legacy templates
                val = list(prev_out.values())[0] if isinstance(prev_out, dict) else prev_out
                filled = template.replace("{{previous_result}}", str(val))
                try: step_input = json.loads(filled)
                except: step_input = {"input": filled}

            # 2. VACN: Verifiable compute
            current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
            exec_envelope = await arcium_client.execute_confidential_task(
                agent.id, current_ver['files'], step_input
            )
            
            exec_result = exec_envelope["result"]
            receipt_sig = exec_envelope["execution_receipt"]

            if exec_result["status"] != "success":
                raise Exception(f"Node fault: {exec_result.get('error')}")

            # 3. Commit Step Completion
            step_output = exec_result.get("data", "")
            
            # Using copy to avoid mutation issues with JSON columns
            completed = dict(db_run.completed_steps)
            completed[step_id] = {
                "status": "completed",
                "output": step_output,
                "execution_receipt": receipt_sig
            }
            db_run.completed_steps = completed
            
            results = dict(db_run.results)
            results["steps"].append({
                "step_id": step_id,
                "agent_id": agent_id,
                "output": step_output
            })
            db_run.results = results
            
            # Update Node Stats
            agent.successful_runs += 1
            agent.total_runs += 1
            await db.commit()

            # 4. Trigger Orchestrator to check for next ready steps
            await ctx['redis_queue'].redis.delete(f"wf_flight:{run_id}:{step_id}")
            await ctx['redis_queue'].enqueue_job('run_workflow_task', run_id=run_id, workflow_id=workflow_id, initial_input=initial_input)

        except Exception as e:
            logger.error(f"SWARM_OS: Node {step_id} failed: {e}")
            db_run.status = "failed"
            await db.commit()
            await ctx['redis_queue'].redis.delete(f"wf_flight:{run_id}:{step_id}")
            await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "failed", "error": str(e), "step_id": step_id}))

async def startup(ctx):
    logger.info("Worker starting up...")
    ctx['redis_queue'] = await create_pool(RedisSettings(
        host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT, password=REDIS_PASSWORD
    ))
    ctx['redis_pubsub'] = await create_pool(RedisSettings(
        host=REDIS_PUBSUB_HOST, port=REDIS_PUBSUB_PORT, password=REDIS_PASSWORD
    ))
    logger.info("Worker: Redis connections initialized: Queue and PubSub isolated.")

async def shutdown(ctx):
    logger.info("Worker shutting down...")
    await ctx['redis_queue'].close()
    await ctx['redis_pubsub'].close()

from arq import cron

class WorkerSettings:
    functions = [
        run_agent_task, 
        run_workflow_task, 
        run_workflow_step_task, 
        finalize_vacn_settlements, 
        process_market_matching,
        run_agent_bidding_evaluation,
        verify_execution_receipts,
        process_settlement_mempool
    ]
    cron_jobs = [
        cron(finalize_vacn_settlements, minute=None, second=0), # Run every minute
        cron(process_market_matching, minute=None, second=30),  # Run every minute (offset by 30s)
        cron(verify_execution_receipts, minute=None, second=15), # Run every minute (offset by 15s)
        cron(process_settlement_mempool, minute=None, second=45) # Run every minute (offset by 45s)
    ]
    redis_settings = RedisSettings(host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT, password=REDIS_PASSWORD)
    on_startup = startup
    on_shutdown = shutdown
