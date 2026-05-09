from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from db.session import get_db
from schemas.agent import AgentCreate, AgentResponse, AgentTestRequest
from schemas.task import RunRequest, TaskResponse, TaskHistoryResponse
from modules.agents import service as agent_service
from db.models.models import Task
from core.dependencies import get_current_user
from core.security import verify_signature
from modules.agents.validation import validate_agent_code
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/run", response_model=TaskResponse)
async def run_agent(
    request: Request,
    req: RunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    # 1. VACN Security: Verify Wallet Signature
    if not req.session_id:
        signature = request.headers.get("X-Payment-Signature")
        if not signature:
            raise HTTPException(status_code=400, detail="Missing X-Payment-Signature header")

        message_dict = {
            "agent_id": req.agent_id,
            "input_data": req.input_data,
            "task_id": req.task_id,
        }
        message_json = json.dumps(message_dict, separators=(",", ":"))
        message_bytes = message_json.encode()

        is_valid = verify_signature(current_user, signature, message_bytes)
        if not is_valid:
            logger.warning(f"VACN: Signature verification failed for user {current_user}")
    else:
        logger.info(f"SWARM_OS: Session {req.session_id} active, bypassing per-task signature.")

    # 2. Get agent
    agent = await agent_service.get_agent(db, req.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # 3. Agentic Billing: Solvency Check
    from modules.billing import treasury_service
    is_solvent = await treasury_service.check_user_solvency(db, current_user, 0.0001)
    if not is_solvent:
        raise HTTPException(status_code=402, detail="Insufficient funds in App Wallet.")

    # 4. Create task record
    db_task = Task(
        id=req.task_id,
        agent_id=agent.id,
        user_wallet=current_user,
        session_id=req.session_id,
        input_data=json.dumps(req.input_data),
        status="queued",
    )
    db.add(db_task)
    await db.commit()

    # 5. Enqueue
    redis = request.app.state.redis_queue
    await redis.enqueue_job(
        "run_agent_task",
        task_id=req.task_id,
        agent_id=agent.id,
        input_data=req.input_data,
        creator_wallet=agent.creator_wallet,
    )

    return TaskResponse(task_id=req.task_id, status="queued", result=None, error=None)


@router.post("/test")
async def test_agent(
    req: AgentTestRequest, current_user: str = Depends(get_current_user)
):
    entry_code = req.files.get(req.entrypoint, "")
    if not entry_code:
        raise HTTPException(status_code=400, detail=f"Entrypoint {req.entrypoint} not found")

    valid, msg = validate_agent_code(entry_code, available_files=req.files)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    from modules.protocols.arcium_client import ArciumClient
    arcium = ArciumClient()

    try:
        envelope = await arcium.execute_confidential_task(
            req.id,
            req.files,
            req.input_data or {"test": True},
            req.requirements,
            req.entrypoint,
            env_vars=req.env_vars,
        )
        return envelope
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks", response_model=List[dict])
async def list_tasks(
    status: Optional[str] = None, limit: int = 50, db: AsyncSession = Depends(get_db)
):
    from db.models.models import Task
    query = select(Task).order_by(Task.created_at.desc())
    if status:
        query = query.where(Task.status == status)
    query = query.limit(limit)

    result = await db.execute(query)
    tasks = result.scalars().all()

    return [
        {
            "id": t.id,
            "agent_id": t.agent_id,
            "status": t.status,
            "poae_hash": t.poae_hash,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tasks
    ]


@router.post("/deploy", response_model=AgentResponse)
async def deploy_agent(
    req: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    entry_code = req.files.get(req.entrypoint)
    if not entry_code:
        raise HTTPException(status_code=400, detail=f"Entrypoint {req.entrypoint} not found")

    valid, msg = validate_agent_code(entry_code, available_files=req.files)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    return await agent_service.create_agent(db, req, current_user)


@router.post("/deploy/zip", response_model=AgentResponse)
async def deploy_agent_zip(
    file: UploadFile = File(...),
    id: str = Form(...),
    name: str = Form(...),
    description: str = Form(""),
    price_per_million_input_tokens: float = Form(0.01),
    price_per_million_output_tokens: float = Form(0.05),
    entrypoint: str = Form("main.py"),
    env_vars: str = Form("{}"),
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    import zipfile
    import io

    zip_bytes = await file.read()
    zip_buffer = io.BytesIO(zip_bytes)

    files = {}
    with zipfile.ZipFile(zip_buffer, "r") as zip_ref:
        for filename in zip_ref.namelist():
            if not filename.endswith("/"):
                with zip_ref.open(filename) as f:
                    files[filename] = f.read().decode("utf-8", errors="ignore")

    entry_code = files.get(entrypoint)
    if not entry_code:
        raise HTTPException(status_code=400, detail=f"Entrypoint {entrypoint} not found in zip")

    valid, msg = validate_agent_code(entry_code, available_files=list(files.keys()))
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    try:
        env_vars_dict = json.loads(env_vars)
    except Exception:
        env_vars_dict = {}

    agent_data = AgentCreate(
        id=id,
        name=name,
        description=description,
        price_per_million_input_tokens=price_per_million_input_tokens,
        price_per_million_output_tokens=price_per_million_output_tokens,
        files=files,
        requirements=[],
        entrypoint=entrypoint,
        version="v1",
        env_vars=env_vars_dict,
    )

    return await agent_service.create_agent(db, agent_data, current_user)


@router.get("/tasks/me", response_model=List[TaskHistoryResponse])
async def list_my_tasks(
    agent_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    query = select(Task).where(Task.user_wallet == current_user)
    if agent_id:
        query = query.where(Task.agent_id == agent_id)
    
    result = await db.execute(query.order_by(Task.created_at.desc()))
    return result.scalars().all()


@router.get("/tasks/{task_id}", response_model=TaskHistoryResponse)
async def get_task_status(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.user_wallet != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    return task


@router.get("/me", response_model=List[AgentResponse])
async def list_my_agents(
    db: AsyncSession = Depends(get_db), current_user: str = Depends(get_current_user)
):
    return await agent_service.get_agents_by_creator(db, current_user)


@router.get("", response_model=List[AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    return await agent_service.get_all_agents(db)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.creator_wallet != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")

    await agent_service.delete_agent(db, agent_id)
    return {"message": "Agent deleted successfully"}
