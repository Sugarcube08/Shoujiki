from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.dependencies import get_current_user
from backend.db.session import get_db
from backend.modules.billing import service as billing_service
from backend.modules.billing import treasury_service
from backend.schemas.billing import UserWalletResponse, DepositRequest, WithdrawRequest, TransactionResponse
from backend.modules.billing import credit_service
from backend.schemas.capital import AgentCreditResponse, LoanRequest

router = APIRouter()


@router.get("/wallet/me", response_model=UserWalletResponse)
async def get_my_app_wallet(
    current_user: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Retrieves the user's wallet metadata (Layer 1)."""
    return await treasury_service.get_or_create_user_wallet(db, current_user)


@router.post("/wallet/deposit", response_model=TransactionResponse)
async def deposit_to_app_wallet(
    req: DepositRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verifies an on-chain SOL transfer and credits the user's L2 App Wallet."""
    # 1. Verify payment on-chain
    # The reference is the user's wallet address itself for simplicity in this flow,
    # or we could use a specific memo. Here we use the signature verification.
    success, detail = await billing_service.verify_solana_payment(
        req.transaction_signature, req.amount, current_user, current_user
    )

    if not success:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {detail}")

    # 2. Update User Balance
    user_wallet = await treasury_service.get_or_create_user_wallet(db, current_user)
    user_wallet.balance += req.amount
    await db.commit()
    await db.refresh(user_wallet)

    return {
        "message": "Deposit successful",
        "tx_signature": req.transaction_signature,
        "new_balance": user_wallet.balance,
    }


@router.post("/wallet/withdraw", response_model=TransactionResponse)
async def withdraw_from_app_wallet(
    req: WithdrawRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Withdraws funds from L2 App Wallet back to Layer 1 Solana wallet."""
    success, result = await billing_service.withdraw_user_wallet_balance(
        db, current_user, req.amount
    )

    if not success:
        raise HTTPException(status_code=400, detail=result)

    user_wallet = await treasury_service.get_or_create_user_wallet(db, current_user)
    
    return {
        "message": "Withdrawal successful",
        "tx_signature": result,
        "new_balance": user_wallet.balance,
    }


@router.get("/config")
async def get_billing_config():
    """Returns protocol-level billing configuration."""
    return {
        "platform_wallet": billing_service.PLATFORM_WALLET,
        "escrow_program_id": str(billing_service.ESCROW_PROGRAM_ID),
    }


@router.post("/agent/{agent_id}/withdraw")
async def withdraw_agent_earnings(
    agent_id: str, current_user: str = Depends(get_current_user)
):
    """Withdraws settled agent earnings. Triggers Squads proposal."""
    success, result = await billing_service.withdraw_agent_funds(agent_id, current_user)
    if not success:
        raise HTTPException(status_code=400, detail=result)
    return {"message": "Withdrawal successful", "tx_signature": result}


@router.get("/agent/{agent_id}/credit", response_model=AgentCreditResponse)
async def get_agent_credit_profile(
    agent_id: str,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves the real credit and lending profile for a specific agent."""
    from backend.modules.agents import service as agent_service

    agent = await agent_service.get_agent(db, agent_id)
    if not agent or agent.creator_wallet != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")

    return await credit_service.get_or_create_agent_credit(db, agent_id)


@router.post("/agent/{agent_id}/credit/refresh")
async def refresh_agent_credit_score(
    agent_id: str,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Triggers a recalculation of the agent's protocol credit score based on actual metrics."""
    await credit_service.update_agent_credit_score(db, agent_id)
    return {"message": "Credit score updated"}


@router.get("/agent/{agent_id}/loans", response_model=list)
async def get_agent_loans(
    agent_id: str,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves all loans for an agent."""
    from backend.modules.agents import service as agent_service
    from sqlalchemy.future import select
    from backend.db.models.models import AgentLoan

    agent = await agent_service.get_agent(db, agent_id)
    if not agent or agent.creator_wallet != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(AgentLoan).where(AgentLoan.agent_id == agent_id))
    loans = result.scalars().all()

    return [
        {
            "id": loan.id,
            "principal": loan.principal,
            "interest_rate": loan.interest_rate,
            "balance_remaining": loan.balance_remaining,
            "status": loan.status,
            "due_at": loan.due_at.isoformat() if loan.due_at else None,
        }
        for loan in loans
    ]


@router.post("/agent/{agent_id}/loans", response_model=dict)
async def apply_for_agent_loan(
    agent_id: str,
    req: LoanRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Requests an undercollateralized loan that provisions on-chain liquidity."""
    from backend.modules.agents import service as agent_service

    agent = await agent_service.get_agent(db, agent_id)
    if not agent or agent.creator_wallet != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")

    success, result = await credit_service.request_agent_loan(db, agent_id, req.amount)
    if not success:
        raise HTTPException(status_code=400, detail=result)

    return {"message": "Loan approved and funded", "tx_signature": result}
