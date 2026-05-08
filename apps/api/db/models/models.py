from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from backend.db.session import Base


class UserWallet(Base):
    __tablename__ = "user_wallets"

    wallet_address = Column(String, primary_key=True, index=True)
    balance = Column(Float, nullable=False, default=0.0)

    # Allowance Configuration: { agent_id: limit_amount }
    allowances = Column(JSON, nullable=False, default={})

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    versions = Column(
        JSON, nullable=False, default=[]
    )  # List of {version, files, requirements, entrypoint}
    current_version = Column(String, nullable=False, default="v1")
    
    # Token-based Pricing (SOL per 1M tokens)
    price_per_million_input_tokens = Column(Float, nullable=False, default=0.01)
    price_per_million_output_tokens = Column(Float, nullable=False, default=0.05)

    creator_wallet = Column(String, nullable=False, index=True)
    env_vars = Column(JSON, nullable=True, default={})

    # Execution Stats
    total_runs = Column(Float, nullable=False, default=0)
    successful_runs = Column(Float, nullable=False, default=0)

    # Financials (Internal Ledger before final settlement/withdrawal)
    balance = Column(Float, nullable=False, default=0.0)
    total_earnings = Column(Float, nullable=False, default=0.0)

    # Lineage tracking
    lineage_parent_id = Column(
        String, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(
        String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    user_wallet = Column(String, nullable=False, index=True)
    input_data = Column(Text, nullable=False)
    result = Column(Text, nullable=True)
    status = Column(
        String, default="queued"
    )  # queued, running, completed, failed, settled
    depth = Column(Float, default=0)

    # Token Usage
    input_tokens = Column(Float, default=0)
    output_tokens = Column(Float, default=0)

    # Practical Verifiable Receipt
    poae_hash = Column(String, nullable=True)  # Verifiable Execution Receipt Manifest Hash

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    creator_wallet = Column(String, nullable=False, index=True)
    
    # Graph Representation
    nodes = Column(JSON, nullable=False) # List of {id, type, config, position}
    edges = Column(JSON, nullable=False) # List of {id, source, target, condition}
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id = Column(String, primary_key=True, index=True)
    workflow_id = Column(
        String, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False
    )
    user_wallet = Column(String, nullable=False, index=True)
    status = Column(String, default="queued")  # queued, running, completed, failed

    # Agentic Budgeting
    max_budget = Column(Float, default=0.0)
    total_spend = Column(Float, default=0.0)

    # Node-Connector Tracking
    active_nodes = Column(JSON, nullable=True, default=[])
    completed_steps = Column(JSON, nullable=True, default={})
    results = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MarketOrder(Base):
    __tablename__ = "market_orders"

    id = Column(String, primary_key=True, index=True)
    creator_wallet = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    budget = Column(Float, nullable=False)
    required_skills = Column(JSON, nullable=False, default=[])
    status = Column(
        String, default="open"
    )  # open, bidding_closed, active, completed, cancelled
    selected_bid_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Bid(Base):
    __tablename__ = "bids"

    id = Column(String, primary_key=True, index=True)
    order_id = Column(
        String, ForeignKey("market_orders.id", ondelete="CASCADE"), nullable=False
    )
    agent_id = Column(
        String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    amount = Column(Float, nullable=False)
    proposal = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, accepted, rejected

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    reporter_wallet = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    evidence = Column(JSON, nullable=True)
    status = Column(String, default="open")  # open, investigating, resolved, dismissed
    resolution_details = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ProtocolProposal(Base):
    __tablename__ = "protocol_proposals"

    id = Column(String, primary_key=True, index=True)
    proposer_wallet = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    parameter_change = Column(JSON, nullable=True)
    status = Column(String, default="active")

    votes_for = Column(Float, default=0.0)
    votes_against = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)


class ExecutorStake(Base):
    __tablename__ = "executor_stakes"

    executor_id = Column(String, primary_key=True, index=True)
    wallet_address = Column(String, nullable=False, index=True)
    amount_staked = Column(Float, nullable=False)
    reputation_score = Column(Float, default=100.0)
    status = Column(String, default="active")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
