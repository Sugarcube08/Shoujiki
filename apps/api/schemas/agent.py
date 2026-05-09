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
    price_per_million_input_tokens: float = Field(default=0.01)
    price_per_million_output_tokens: float = Field(default=0.05)
    env_vars: Optional[Dict[str, str]] = Field(default_factory=dict)


class AgentCreate(AgentBase):
    id: str = Field(..., min_length=1)
    files: Dict[str, str]
    requirements: List[str]
    entrypoint: str
    version: str = "v1"


class AgentTestRequest(BaseModel):
    id: str = Field(default="test-agent")
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

    # Execution Stats
    total_runs: float
    successful_runs: float

    # Financials
    balance: float
    total_earnings: float

    created_at: datetime

    class Config:
        from_attributes = True
