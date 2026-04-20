from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.session import get_db
from backend.core.dependencies import get_current_user
from backend.db.models.models import WalletBalance
from backend.modules.billing import service as billing_service
from pydantic import BaseModel

router = APIRouter()

class DepositRequest(BaseModel):
    tx_signature: str
    amount: float

@router.post("/deposit")
async def deposit_funds(
    req: DepositRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Lobster-style deposit: User pays on-chain, backend updates internal balance.
    """
    # 1. Verify transaction (simplified for demo)
    # In production, check that tx_signature is a transfer to PLATFORM_WALLET for 'amount'
    
    # 2. Update balance
    result = await db.execute(
        select(WalletBalance).where(WalletBalance.wallet == current_user)
    )
    balance = result.scalars().first()
    
    if not balance:
        balance = WalletBalance(wallet=current_user, balance=req.amount)
        db.add(balance)
    else:
        balance.balance += req.amount
        
    await db.commit()
    return {"status": "success", "new_balance": balance.balance}

@router.get("/balance")
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(
        select(WalletBalance).where(WalletBalance.wallet == current_user)
    )
    balance = result.scalars().first()
    return {"wallet": current_user, "balance": balance.balance if balance else 0.0}
