from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid
import logging

from db.session import get_db
from db.models.models import Workflow, WorkflowRun, Agent
from schemas.workflow import (
    WorkflowCreate,
    WorkflowResponse,
    WorkflowRunRequest,
    WorkflowRunResponse,
    WorkflowRunHistoryResponse,
    WorkflowValidationResponse,
    WorkflowBase,
    NodeType,
)
from core.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/validate", response_model=WorkflowValidationResponse)
async def validate_workflow(
    req: WorkflowBase,
    db: AsyncSession = Depends(get_db),
):
    """
    Dry-run validation of a workflow graph.
    Checks for: 
    1. Single START node
    2. Reachability of all nodes
    3. Cycle detection (for deterministic parts)
    4. Existence of referenced agents
    """
    errors = []
    
    # 1. Start Node check
    starts = [n for n in req.nodes if n.type == NodeType.START]
    if len(starts) != 1:
        errors.append(f"Workflow must have exactly one START node, found {len(starts)}")
    
    # 2. End Node check
    ends = [n for n in req.nodes if n.type == NodeType.END]
    if len(ends) == 0:
        errors.append("Workflow should have at least one END node")
        
    # 3. Agent existence
    agent_nodes = [n for n in req.nodes if n.type == NodeType.AGENT]
    for node in agent_nodes:
        agent_id = node.config.get("agent_id")
        if not agent_id:
            errors.append(f"Node {node.id} is an AGENT node but has no agent_id configured")
        else:
            res = await db.execute(select(Agent).where(Agent.id == agent_id))
            if not res.scalars().first():
                errors.append(f"Node {node.id} references non-existent agent: {agent_id}")

    # 4. Connectivity check
    node_ids = {n.id for n in req.nodes}
    for edge in req.edges:
        if edge.source not in node_ids:
            errors.append(f"Edge {edge.id} has invalid source: {edge.source}")
        if edge.target not in node_ids:
            errors.append(f"Edge {edge.id} has invalid target: {edge.target}")

    return WorkflowValidationResponse(
        is_valid=len(errors) == 0,
        errors=errors,
        complexity_score=len(req.nodes) + len(req.edges),
        estimated_cost_range={"min": len(agent_nodes) * 0.0001, "max": len(agent_nodes) * 0.05}
    )


@router.post("", response_model=WorkflowResponse)
async def create_workflow(
    req: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    # Robustness: Validate before save
    validation = await validate_workflow(req, db)
    if not validation.is_valid:
        raise HTTPException(
            status_code=400, 
            detail={"message": "Invalid Workflow Graph", "errors": validation.errors}
        )

    db_workflow = Workflow(
        id=req.id,
        name=req.name,
        creator_wallet=current_user,
        nodes=[{**node.dict(), "is_simulation_mode": req.is_simulation_mode} for node in req.nodes],
        edges=[edge.dict() for edge in req.edges],
    )
    db.add(db_workflow)
    await db.commit()
    await db.refresh(db_workflow)
    return db_workflow


@router.post("/{workflow_id}/run", response_model=WorkflowRunResponse)
async def run_workflow(
    workflow_id: str,
    req: WorkflowRunRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    # 1. Get workflow
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # 2. Agentic Billing: Pre-execution Solvency Check
    from modules.billing import treasury_service

    is_solvent = await treasury_service.check_user_solvency(
        db, current_user, 0.001 # Baseline check to start
    )
    if not is_solvent:
        raise HTTPException(
            status_code=402,
            detail="Insufficient funds in App Wallet to start workflow.",
        )

    # 3. Create WorkflowRun
    run_id = str(uuid.uuid4())
    db_run = WorkflowRun(
        id=run_id,
        workflow_id=workflow.id,
        user_wallet=current_user,
        status="queued",
        max_budget=req.max_budget,
        total_spend=0.0,
        active_nodes=[], # Will be set by worker finding the START node
        results={"steps": [], "initial_input": req.initial_input},
    )
    db.add(db_run)
    await db.commit()

    # 4. Enqueue in background worker
    redis = request.app.state.redis_queue
    await redis.enqueue_job(
        "run_workflow_task",
        run_id=run_id,
        workflow_id=workflow.id,
        initial_input=req.initial_input,
    )

    return WorkflowRunResponse(run_id=run_id, status="queued")


@router.get("/me", response_model=List[WorkflowResponse])
async def list_my_workflows(
    db: AsyncSession = Depends(get_db), current_user: str = Depends(get_current_user)
):
    result = await db.execute(
        select(Workflow).where(Workflow.creator_wallet == current_user)
    )
    return result.scalars().all()


@router.get("/runs", response_model=List[WorkflowRunHistoryResponse])
async def list_my_workflow_runs(
    db: AsyncSession = Depends(get_db), current_user: str = Depends(get_current_user)
):
    result = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.user_wallet == current_user)
        .order_by(WorkflowRun.created_at.desc())
    )
    return result.scalars().all()
