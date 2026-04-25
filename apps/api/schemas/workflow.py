from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

class WorkflowStep(BaseModel):
    agent_id: str
    input_template: str # e.g. "Process this: {{previous_result}}"

class WorkflowBase(BaseModel):
    name: str
    steps: List[WorkflowStep]

class WorkflowCreate(WorkflowBase):
    id: str

class WorkflowResponse(WorkflowBase):
    id: str
    creator_wallet: str
    created_at: datetime

    class Config:
        from_attributes = True

class WorkflowRunRequest(BaseModel):
    initial_input: dict

class WorkflowRunResponse(BaseModel):
    run_id: str
    status: str
    current_step_index: int
