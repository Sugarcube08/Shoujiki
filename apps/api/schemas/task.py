from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RunRequest(BaseModel):
    agent_id: str
    task_id: str
    input_data: dict
    session_id: Optional[str] = None


class TaskResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[str] = None
    error: Optional[str] = None


class TaskHistoryResponse(BaseModel):
    id: str
    agent_id: str
    user_wallet: str
    status: str
    input_data: Optional[str] = None
    result: Optional[str] = None
    input_tokens: float = 0
    output_tokens: float = 0
    poae_hash: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
