import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db.models.models import UserWallet, Agent

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


MINIMUM_EXECUTION_FEE = 0.0001  # 0.0001 SOL base fee per task

async def calculate_task_cost(
    db: AsyncSession, agent_id: str, input_tokens: float, output_tokens: float
) -> float:
    """
    Calculates the actual SOL cost for a task based on token usage.
    """
    agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_res.scalars().first()
    if not agent:
        return 0.0

    input_cost = (input_tokens / 1_000_000) * agent.price_per_million_input_tokens
    output_cost = (output_tokens / 1_000_000) * agent.price_per_million_output_tokens
    
    total_cost = input_cost + output_cost
    
    # Apply minimum fee to ensure small executions are still billed
    return max(total_cost, MINIMUM_EXECUTION_FEE)


async def deduct_agentic_fee(
    db: AsyncSession,
    wallet_address: str,
    agent_id: str,
    input_tokens: float,
    output_tokens: float,
) -> float:
    """
    Deducts dynamic fees from the internal App Wallet and credits the Agent net of platform fees.
    Returns the total amount deducted from the user.
    """
    # 1. Calculate Gross Cost
    gross_amount_sol = await calculate_task_cost(db, agent_id, input_tokens, output_tokens)

    # 2. Deduct from User (Full Amount)
    user_wallet = await get_or_create_user_wallet(db, wallet_address)

    if user_wallet.balance < gross_amount_sol:
        logger.error(
            f"TREASURY: Critical failure - balance went insolvent during deduction for {wallet_address}. Amount: {gross_amount_sol}"
        )
    
    user_wallet.balance -= gross_amount_sol
    logger.info(f"TREASURY: Deducted {gross_amount_sol} SOL from user {wallet_address}")

    # 3. Calculate Protocol Fee (e.g., 5%)
    fee_ratio = governance_service.NETWORK_PARAMETERS.get("fee_ratio", 0.05)
    platform_fee = gross_amount_sol * fee_ratio
    agent_net_earning = gross_amount_sol - platform_fee

    # 4. Credit Agent (Internal Ledger - Net Amount)
    agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_res.scalars().first()

    if agent:
        agent.balance += agent_net_earning
        agent.total_earnings += agent_net_earning
        logger.info(
            f"TREASURY: Credited agent {agent_id} with {agent_net_earning} SOL (Net of {platform_fee} fee) for {input_tokens}in/{output_tokens}out tokens."
        )
    else:
        logger.error(f"TREASURY: Agent {agent_id} not found during fee credit.")

    # 5. Commit and update record
    await db.commit()
    
    # Optional: Log the platform fee for protocol accounting
    logger.info(f"PROTOCOL: Collected {platform_fee} SOL platform fee from task execution.")
    
    return gross_amount_sol
