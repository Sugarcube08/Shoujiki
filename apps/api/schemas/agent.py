from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class AgentVersion(BaseModel):
    version: str
    files: Dict[str, str]  # filename -> content
    requirements: List[str]
    entrypoint: str


class AgentBase(BaseModel):
    name: str = Field(default="")
    description: Optional[str] = None
    price: float = Field(default=0.0)
    env_vars: Optional[Dict[str, str]] = Field(default_factory=dict)


class AgentCreate(AgentBase):
    id: str = Field(..., min_length=1)
    files: Dict[str, str]
    requirements: List[str]
    entrypoint: str
    version: str = "v1"


class AgentTestRequest(BaseModel):
    files: Dict[str, str]
    requirements: List[str]
    entrypoint: str
    input_data: Optional[dict] = {"test": True}
    env_vars: Optional[Dict[str, str]] = Field(default_factory=dict)


class AgentResponse(AgentBase):
    id: str
    versions: List[AgentVersion]
    current_version: str
    creator_wallet: str
    mint_address: Optional[str] = None

    # Protocol Stats
    total_runs: int
    successful_runs: int

    # AgentOS Protocol Fields
    squads_vault_pda: Optional[str] = None
    credential_registry_address: Optional[str] = None

    created_at: datetime

    class Config:
        from_attributes = True
