from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.dependencies import get_current_user
from db.session import get_db
from modules.billing import service as billing_service
from modules.billing import treasury_service
from schemas.billing import UserWalletResponse, DepositRequest, WithdrawRequest, TransactionResponse

router = APIRouter()


@router.get("/wallet/me", response_model=UserWalletResponse)
async def get_my_app_wallet(
    current_user: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Retrieves the user's L2 App Wallet metadata."""
    return await treasury_service.get_or_create_user_wallet(db, current_user)


@router.post("/wallet/deposit", response_model=TransactionResponse)
async def deposit_to_app_wallet(
    req: DepositRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verifies an on-chain SOL transfer and credits the user's L2 App Wallet."""
    success, detail = await billing_service.verify_solana_payment(
        req.transaction_signature, req.amount, current_user, current_user
    )

    if not success:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {detail}")

    # Update User Balance
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
    }


@router.post("/agent/{agent_id}/withdraw")
async def withdraw_agent_earnings(
    agent_id: str, current_user: str = Depends(get_current_user)
):
    """Withdraws settled agent earnings directly to the creator's wallet."""
    success, result = await billing_service.withdraw_agent_funds(agent_id, current_user)
    if not success:
        raise HTTPException(status_code=400, detail=result)
    return {"message": "Withdrawal successful", "tx_signature": result}
