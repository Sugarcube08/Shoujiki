from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from backend.db.session import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    versions = Column(JSON, nullable=False, default=[]) # List of {version, files, requirements, entrypoint}
    current_version = Column(String, nullable=False, default="v1")
    price = Column(Float, nullable=False)
    creator_wallet = Column(String, nullable=False, index=True)
    mint_address = Column(String, nullable=True, index=True) # Metaplex Core Asset Address
    successful_runs = Column(Float, nullable=False, default=0)
    
    # Reputation Graph / Trust Fields
    reputation_score = Column(Float, nullable=False, default=100.0)
    reliability_score = Column(Float, nullable=False, default=1.0)
    contribution_score = Column(Float, nullable=False, default=0.0) # For Swarm involvement
    trust_level = Column(String, default="verified") # verified, trusted, elite
    
    # Treasury Fields
    balance = Column(Float, nullable=False, default=0.0)
    treasury_address = Column(String, nullable=True) # PDA or sub-wallet

    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    user_wallet = Column(String, nullable=False, index=True)
    input_data = Column(Text, nullable=False)
    result = Column(Text, nullable=True)
    status = Column(String, default="pending") # pending, running, completed, failed
    execution_receipt = Column(JSON, nullable=True) # Verifiable receipt data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Payment(Base):
    __tablename__ = "payments"

    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    tx_signature = Column(String, unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="locked") # locked, released
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    creator_wallet = Column(String, nullable=False, index=True)
    steps = Column(JSON, nullable=False) # List of {agent_id, input_template}
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id = Column(String, primary_key=True, index=True)
    workflow_id = Column(String, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    user_wallet = Column(String, nullable=False, index=True)
    status = Column(String, default="pending") # pending, running, completed, failed
    current_step_index = Column(Float, default=0)
    results = Column(JSON, nullable=True) # List of results from each step
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
