from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

class AgentVersion(BaseModel):
    version: str
    files: Dict[str, str] # filename -> content
    requirements: List[str]
    entrypoint: str

class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

class AgentCreate(AgentBase):
    id: str
    files: Dict[str, str]
    requirements: List[str]
    entrypoint: str
    version: str = "v1"

class AgentTestRequest(BaseModel):
    files: Dict[str, str]
    requirements: List[str]
    entrypoint: str
    input_data: Optional[dict] = {"test": True}

class AgentResponse(AgentBase):
    id: str
    versions: List[AgentVersion]
    current_version: str
    creator_wallet: str
    mint_address: Optional[str] = None
    risk_score: Optional[float] = 0.0
    created_at: datetime

    class Config:
        from_attributes = True
