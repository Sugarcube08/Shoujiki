import asyncio
from arq import create_pool
from arq.connections import RedisSettings
import os
import logging
import json
import hashlib
from backend.modules.sandbox.client import execute_in_sandbox
from backend.db.session import AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from backend.modules.agents import service as agent_service
from backend.modules.billing import service as billing_service
from backend.db.models.models import Task, Workflow, WorkflowRun, Agent
from sqlalchemy import update, select
import uuid

from backend.core.config import (
    REDIS_QUEUE_HOST, REDIS_QUEUE_PORT, 
    REDIS_PUBSUB_HOST, REDIS_PUBSUB_PORT, 
    REDIS_PASSWORD
)

logger = logging.getLogger(__name__)

async def run_agent_task(ctx, task_id: str, agent_id: str, input_data: dict, creator_wallet: str, price: float, depth: int = 0):
    """
    Background worker task to execute agent in sandbox and settle payment on-chain.
    Implements idempotency and fail-closed security.
    """
    """
    Background worker task to execute agent in sandbox and settle payment.
    """
    if depth > 3:
        logger.error(f"Worker: Task {task_id} exceeded recursion depth {depth}. Aborting.")
        return

    logger.info(f"Worker: Starting task {task_id} for agent {agent_id} (depth: {depth})")
    redis_pubsub = ctx['redis_pubsub']
    
    async with AsyncSessionLocal() as db:
        # 1. Idempotency Check & Status Update
        task_res = await db.execute(select(Task).where(Task.id == task_id))
        db_task = task_res.scalars().first()
        
        if not db_task:
            logger.error(f"Worker: Task {task_id} not found in database.")
            return
            
        if db_task.status in ["completed", "failed", "settled"]:
            logger.warning(f"Worker: Task {task_id} already in final state: {db_task.status}. Skipping.")
            return

        # Get agent for metadata
        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        
        if not agent:
            logger.error(f"Worker: Agent {agent_id} not found")
            db_task.status = "failed"
            db_task.result = "Agent configuration not found"
            await db.commit()
            return

        # Update to 'running'
        db_task.status = "running"
        await db.commit()
        await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "running"}))

        current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
        
        # 3. Execute in sandbox
        try:
            exec_result = await execute_in_sandbox(
                files=current_ver['files'],
                requirements=current_ver['requirements'],
                entrypoint=current_ver['entrypoint'],
                input_data=input_data
            )
            
            # 4. Update task result and generate receipt
            status = "completed" if exec_result["success"] else "failed"
            result = exec_result["output"] if exec_result["success"] else exec_result["error"]
            
            receipt = {
                "task_id": task_id,
                "agent_id": agent_id,
                "input_hash": hashlib.sha256(json.dumps(input_data).encode()).hexdigest(),
                "output_hash": hashlib.sha256(result.encode()).hexdigest() if result else None,
                "success": exec_result["success"],
                "timestamp": str(asyncio.get_event_loop().time()) # Placeholder for real time
            }

            await db.execute(
                update(Task).where(Task.id == task_id).values(
                    status=status, 
                    result=result,
                    execution_receipt=receipt
                )
            )
            
            # Update Agent Passport (Reputation/Reliability)
            agent.total_runs += 1
            if exec_result["success"]:
                agent.successful_runs += 1
                
                # Price-weighted reputation gain (min 0.1, proportional to price)
                # Helps prevent Sybil/farming with very cheap tasks
                gain = max(0.1, price * 100.0) 
                agent.reputation_score += min(5.0, gain) # Cap gain per run
                
                # Dynamic Trust Leveling
                if agent.successful_runs >= 50:
                    agent.trust_level = "elite"
                elif agent.successful_runs >= 10:
                    agent.trust_level = "trusted"
            else:
                agent.reputation_score -= 10.0 # Heavier penalty for failure
            
            # Ensure boundaries
            agent.reputation_score = max(0.0, min(200.0, agent.reputation_score))
            agent.reliability_score = agent.successful_runs / agent.total_runs
            
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": status, "result": result}))
            
            # 4. M2M Bridge Handling (Agent hiring Agent)
            from backend.modules.billing.service import PLATFORM_WALLET
            hire_requests = exec_result.get("hire_requests", [])
            for hire in hire_requests:
                hired_id = hire.get("agent_id")
                hired_input = hire.get("input_data")
                
                # Generate a globally unique M2M Task ID
                new_task_id = f"m2m_{task_id[:8]}_{hired_id[:8]}_{uuid.uuid4().hex[:6]}"
                logger.info(f"Worker: M2M Bridge - Agent {agent_id} hiring {hired_id}. New Task: {new_task_id}")
                
                hired_agent_res = await db.execute(select(Agent).where(Agent.id == hired_id))
                hired_agent = hired_agent_res.scalars().first()
                
                if hired_agent:
                    # Create the protocol task record
                    new_task = Task(
                        id=new_task_id,
                        agent_id=hired_id,
                        user_wallet=PLATFORM_WALLET, # Platform pre-funds M2M demo escrows
                        input_data=json.dumps(hired_input),
                        status="queued",
                        depth=depth + 1
                    )
                    db.add(new_task)
                    await db.commit()
                    
                    # NOTE: In V4, the hiring agent's treasury would sign this escrow.
                    # For V3 Alpha demo, the platform pre-funds the M2M task execution.
                    
                    await ctx['redis_queue'].enqueue_job(
                        'run_agent_task',
                        task_id=new_task_id,
                        agent_id=hired_id,
                        input_data=hired_input,
                        creator_wallet=hired_agent.creator_wallet,
                        price=hired_agent.price,
                        depth=depth + 1
                    )
                    logger.info(f"Worker: M2M task {new_task_id} dispatched.")

            # 6. Settle payment (On-chain Escrow)
            # The task has the user_wallet, and agent has the creator_wallet
            db_task_res = await db.execute(select(Task).where(Task.id == task_id))
            db_task = db_task_res.scalars().first()
            
            if db_task:
                logger.info(f"Worker: Settling escrow for task {task_id} on-chain...")
                # Generate a single hash of the whole receipt object
                receipt_hash_hex = hashlib.sha256(json.dumps(receipt).encode()).hexdigest()
                
                settle_ok, tx_sig = await billing_service.settle_task_payment_onchain(
                    task_id,
                    db_task.user_wallet,
                    creator_wallet,
                    exec_result["success"],
                    receipt_hash_hex
                )
                
                if settle_ok and exec_result["success"]:
                    # Also update virtual balance for historical tracking
                    agent.balance += price
                    await db.commit()
            
            logger.info(f"Worker: Task {task_id} finished with status {status}")
            
        except Exception as e:
            logger.error(f"Worker: Critical error in task {task_id}: {e}")
            await db.execute(
                update(Task).where(Task.id == task_id).values(status="failed", result=str(e))
            )
            await db.commit()
            await redis.publish(f"task:{task_id}", json.dumps({"status": "failed", "error": str(e)}))

async def run_workflow_task(ctx, run_id: str, workflow_id: str, initial_input: dict):
    """
    Background worker task to execute a multi-agent workflow.
    Implements step-by-step state tracking and idempotency.
    """
    logger.info(f"Worker: Starting workflow run {run_id} for workflow {workflow_id}")
    redis_pubsub = ctx['redis_pubsub']
    
    async with AsyncSessionLocal() as db:
        # 1. Load State & Idempotency Check
        run_res = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        db_run = run_res.scalars().first()
        
        if not db_run or db_run.status in ["completed", "failed"]:
            logger.warning(f"Worker: Workflow run {run_id} already finished or not found. Skipping.")
            return

        db_run.status = "running"
        await db.commit()
        await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "running"}))

        # 2. Get workflow
        wf_res = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
        workflow = wf_res.scalars().first()
        if not workflow:
            logger.error(f"Worker: Workflow {workflow_id} not found")
            return

        # Initialize tracking if new
        if not db_run.completed_steps:
            db_run.completed_steps = {}
            db_run.results = {"steps": [], "initial_input": initial_input}

        # 3. Process Steps (DAG Linear Fallback for MVP)
        # Future: Resolve dependency tree for parallel execution
        for i, step in enumerate(workflow.steps):
            step_id = step.get("id", str(i))
            
            # Skip if already completed (Idempotency)
            if step_id in db_run.completed_steps:
                continue

            agent_id = step["agent_id"]
            template = step["input_template"]
            
            logger.info(f"Worker: Workflow {run_id} - Executing step {step_id} (Agent {agent_id})")
            await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({
                "status": "running", 
                "step_id": step_id, 
                "agent_id": agent_id
            }))

            try:
                agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
                agent = agent_res.scalars().first()
                if not agent: raise Exception(f"Agent {agent_id} not found")

                current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
                
                # Resolve Input: Check previous results or initial
                prev_out = db_run.results["steps"][-1]["output"] if db_run.results["steps"] else initial_input
                
                step_input = {"input": prev_out}
                if template and "{{previous_result}}" in template:
                    filled = template.replace("{{previous_result}}", str(prev_out))
                    try: step_input = json.loads(filled) if filled.strip().startswith("{") else {"input": filled}
                    except: step_input = {"input": filled}

                exec_result = await execute_in_sandbox(
                    files=current_ver['files'],
                    requirements=current_ver['requirements'],
                    entrypoint=current_ver['entrypoint'],
                    input_data=step_input
                )

                if not exec_result["success"]:
                    raise Exception(f"Agent {agent_id} error: {exec_result['error']}")

                # Success: update tracking
                step_output = exec_result["output"]
                step_data = {
                    "status": "completed",
                    "output": step_output,
                    "receipt": hashlib.sha256(str(step_output).encode()).hexdigest()
                }
                
                db_run.completed_steps[step_id] = step_data
                db_run.results["steps"].append({
                    "step_id": step_id,
                    "agent_id": agent_id,
                    "output": step_output
                })

                # Update Agent economic & trust scores
                agent.balance += agent.price
                agent.contribution_score += 2.0
                agent.successful_runs += 1
                agent.total_runs += 1
                if agent.successful_runs >= 50: agent.trust_level = "elite"
                elif agent.successful_runs >= 10: agent.trust_level = "trusted"

                # Commit progress after each step (Robustness)
                await db.commit()

            except Exception as e:
                logger.error(f"Worker: Workflow {run_id} failed at step {step_id}: {e}")
                db_run.status = "failed"
                await db.commit()
                await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "failed", "error": str(e)}))
                return

        # 4. Finalize Workflow
        db_run.status = "completed"
        await db.commit()
        await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "completed", "results": db_run.results}))
        logger.info(f"Worker: Workflow {run_id} finalized.")

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

class WorkerSettings:
    functions = [run_agent_task, run_workflow_task]
    redis_settings = RedisSettings(host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT, password=REDIS_PASSWORD)
    on_startup = startup
    on_shutdown = shutdown
