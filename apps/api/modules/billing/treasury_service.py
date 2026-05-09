import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db.models.models import UserWallet, Agent, AgentSession

from modules.protocols import governance_service

logger = logging.getLogger(__name__)


async def get_or_create_user_wallet(
    db: AsyncSession, wallet_address: str
) -> UserWallet:
    """
    Retrieves the UserWallet metadata and internal App Wallet balance.
    """
    result = await db.execute(
        select(UserWallet).where(UserWallet.wallet_address == wallet_address)
    )
    user_wallet = result.scalars().first()

    if not user_wallet:
        user_wallet = UserWallet(
            wallet_address=wallet_address, balance=0.0, allowances={}
        )
        db.add(user_wallet)
        await db.commit()
        await db.refresh(user_wallet)

    return user_wallet


async def check_user_solvency(
    db: AsyncSession, wallet_address: str, required_amount_sol: float
) -> bool:
    """
    Checks if the user has sufficient internal balance to proceed with execution.
    """
    user_wallet = await get_or_create_user_wallet(db, wallet_address)
    is_solvent = user_wallet.balance >= required_amount_sol
    if not is_solvent:
        logger.warning(
            f"TREASURY: User {wallet_address} insolvent. Balance: {user_wallet.balance}, Required: {required_amount_sol}"
        )
    return is_solvent


async def create_agent_session(db: AsyncSession, user_wallet: str, agent_id: str) -> AgentSession:
    """
    Starts a new conversational session to aggregate multiple task costs.
    """
    session = AgentSession(
        id=f"sess_{uuid.uuid4().hex[:12]}",
        user_wallet=user_wallet,
        agent_id=agent_id,
        status="active"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


MINIMUM_SESSION_FEE = 0.0001  # Minimum SOL charged for an entire aggregated session

async def calculate_task_cost(
    db: AsyncSession, agent_id: str, input_tokens: float, output_tokens: float
) -> float:
    """
    Calculates the actual SOL cost for a task based purely on token usage.
    No minimum fee is applied here to support aggregated session billing.
    """
    agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_res.scalars().first()
    if not agent:
        return 0.0

    input_cost = (input_tokens / 1_000_000) * agent.price_per_million_input_tokens
    output_cost = (output_tokens / 1_000_000) * agent.price_per_million_output_tokens
    
    return input_cost + output_cost


async def accrue_session_cost(
    db: AsyncSession,
    session_id: str,
    input_tokens: float,
    output_tokens: float,
) -> float:
    """
    Updates the session with new token usage and accrued cost without immediate deduction.
    """
    result = await db.execute(select(AgentSession).where(AgentSession.id == session_id))
    session = result.scalars().first()
    if not session:
        return 0.0

    cost = await calculate_task_cost(db, session.agent_id, input_tokens, output_tokens)
    
    session.total_input_tokens += input_tokens
    session.total_output_tokens += output_tokens
    session.aggregated_cost += cost
    
    await db.commit()
    return cost


async def settle_session(db: AsyncSession, session_id: str) -> float:
    """
    Finalizes a session, applies the global minimum fee once, and settles the user wallet.
    """
    result = await db.execute(select(AgentSession).where(AgentSession.id == session_id))
    session = result.scalars().first()
    if not session or session.status != "active":
        return 0.0

    # 1. Determine Final Gross Cost (Apply minimum only once for the whole session)
    final_gross_sol = max(session.aggregated_cost, MINIMUM_SESSION_FEE)

    # 2. Deduct from User
    user_wallet = await get_or_create_user_wallet(db, session.user_wallet)
    user_wallet.balance -= final_gross_sol
    
    # 3. Handle Protocol Fees and Agent Credit
    fee_ratio = governance_service.NETWORK_PARAMETERS.get("fee_ratio", 0.05)
    platform_fee = final_gross_sol * fee_ratio
    agent_net_earning = final_gross_sol - platform_fee

    agent_res = await db.execute(select(Agent).where(Agent.id == session.agent_id))
    agent = agent_res.scalars().first()
    if agent:
        agent.balance += agent_net_earning
        agent.total_earnings += agent_net_earning

    # 4. Finalize session status
    session.status = "settled"
    
    await db.commit()
    logger.info(f"TREASURY: Settled session {session_id}. Total: {final_gross_sol} SOL.")
    return final_gross_sol


async def deduct_agentic_fee(
    db: AsyncSession,
    wallet_address: str,
    agent_id: str,
    input_tokens: float,
    output_tokens: float,
) -> float:
    """
    LEGACY/DIRECT: Deducts dynamic fees immediately. 
    Maintained for single-task workflows but removes internal minimum logic.
    """
    gross_amount_sol = await calculate_task_cost(db, agent_id, input_tokens, output_tokens)
    user_wallet = await get_or_create_user_wallet(db, wallet_address)
    user_wallet.balance -= gross_amount_sol

    fee_ratio = governance_service.NETWORK_PARAMETERS.get("fee_ratio", 0.05)
    platform_fee = gross_amount_sol * fee_ratio
    agent_net_earning = gross_amount_sol - platform_fee

    agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_res.scalars().first()
    if agent:
        agent.balance += agent_net_earning
        agent.total_earnings += agent_net_earning

    await db.commit()
    return gross_amount_sol
