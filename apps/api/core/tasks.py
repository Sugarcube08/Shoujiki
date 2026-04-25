import asyncio
from arq import create_pool
from arq.connections import RedisSettings
import os
import logging
import json
import hashlib
from backend.modules.sandbox.client import execute_in_sandbox
from backend.db.session import AsyncSessionLocal
from backend.modules.agents import service as agent_service
from backend.modules.billing import service as billing_service
from backend.db.models.models import Task, Workflow, WorkflowRun, Agent
from sqlalchemy import update, select

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

async def run_agent_task(ctx, task_id: str, agent_id: str, input_data: dict, creator_wallet: str, price: float):
    """
    Background worker task to execute agent in sandbox and settle payment.
    """
    logger.info(f"Worker: Starting task {task_id} for agent {agent_id}")
    redis = ctx['redis']
    
    # 1. Update status to 'running'
    async with AsyncSessionLocal() as db:
        # Get agent for scoring
        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        
        await db.execute(
            update(Task).where(Task.id == task_id).values(status="running")
        )
        await db.commit()
        await redis.publish(f"task:{task_id}", json.dumps({"status": "running"}))

        # 2. Get agent details (already fetched above for scoring)
        if not agent:
            logger.error(f"Worker: Agent {agent_id} not found")
            await db.execute(
                update(Task).where(Task.id == task_id).values(status="failed", result="Agent not found")
            )
            await db.commit()
            return

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
                agent.reputation_score += 1.0 # Reward success
            else:
                agent.reputation_score -= 5.0 # Penalize failure
            
            # Ensure boundaries
            agent.reputation_score = max(0.0, min(200.0, agent.reputation_score))
            agent.reliability_score = agent.successful_runs / agent.total_runs
            
            await db.commit()
            await redis.publish(f"task:{task_id}", json.dumps({"status": status, "result": result}))
            
            # 5. Settle payment
            await billing_service.settle_task_payment(
                task_id,
                creator_wallet,
                exec_result["success"],
                price
            )
            
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
    Background worker task to execute a multi-agent workflow sequentially.
    """
    logger.info(f"Worker: Starting workflow run {run_id} for workflow {workflow_id}")
    redis = ctx['redis']
    
    async with AsyncSessionLocal() as db:
        # 1. Update status to 'running'
        await db.execute(
            update(WorkflowRun).where(WorkflowRun.id == run_id).values(status="running")
        )
        await db.commit()
        await redis.publish(f"workflow:{run_id}", json.dumps({"status": "running", "step": 0}))

        # 2. Get workflow
        result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
        workflow = result.scalars().first()
        if not workflow:
            logger.error(f"Worker: Workflow {workflow_id} not found")
            return

        current_input = initial_input
        workflow_results = {"steps": [], "initial_input": initial_input}

        # 3. Execute steps
        for i, step in enumerate(workflow.steps):
            agent_id = step["agent_id"]
            template = step["input_template"]
            
            logger.info(f"Worker: Workflow {run_id} - Executing step {i} (Agent {agent_id})")
            await redis.publish(f"workflow:{run_id}", json.dumps({"status": "running", "step": i, "agent_id": agent_id}))

            # Get agent
            agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
            agent = agent_res.scalars().first()
            if not agent:
                error_msg = f"Agent {agent_id} not found at step {i}"
                await db.execute(update(WorkflowRun).where(WorkflowRun.id == run_id).values(status="failed", results={"error": error_msg}))
                await db.commit()
                return

            current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
            
            # Prepare input
            step_input = {"input": current_input}
            if "{{previous_result}}" in template:
                # Convert dict to string for replacement or handle as needed
                step_input = {"input": template.replace("{{previous_result}}", str(current_input))}

            # Execute in sandbox
            exec_result = await execute_in_sandbox(
                files=current_ver['files'],
                requirements=current_ver['requirements'],
                entrypoint=current_ver['entrypoint'],
                input_data=step_input
            )

            if not exec_result["success"]:
                error_msg = f"Step {i} failed: {exec_result['error']}"
                await db.execute(update(WorkflowRun).where(WorkflowRun.id == run_id).values(status="failed", results={"error": error_msg}))
                await db.commit()
                await redis.publish(f"workflow:{run_id}", json.dumps({"status": "failed", "error": error_msg}))
                return

            # Update results
            step_output = exec_result["output"]
            workflow_results["steps"].append({"agent_id": agent_id, "output": step_output})
            current_input = step_output
            
            await db.execute(
                update(WorkflowRun).where(WorkflowRun.id == run_id).values(
                    current_step_index=i + 1,
                    results=workflow_results
                )
            )
            await db.commit()

        # 4. Finish workflow
        await db.execute(update(WorkflowRun).where(WorkflowRun.id == run_id).values(status="completed"))
        await db.commit()
        await redis.publish(f"workflow:{run_id}", json.dumps({"status": "completed", "results": workflow_results}))
        logger.info(f"Worker: Workflow {run_id} completed successfully")

async def startup(ctx):
    logger.info("Worker starting up...")

async def shutdown(ctx):
    logger.info("Worker shutting down...")

class WorkerSettings:
    functions = [run_agent_task, run_workflow_task]
    redis_settings = RedisSettings(host=REDIS_HOST, port=REDIS_PORT)
    on_startup = startup
    on_shutdown = shutdown
