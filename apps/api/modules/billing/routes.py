from fastapi import APIRouter, Depends, HTTPException
from backend.core.dependencies import get_current_user
from backend.modules.billing import service as billing_service

router = APIRouter()

# Internal balance endpoints removed. 
# Protocol now uses direct on-chain escrow via SHoujikiEscrow program.

@router.get("/config")
async def get_billing_config():
    """Returns protocol-level billing configuration."""
    return {
        "platform_wallet": billing_service.PLATFORM_WALLET,
        "escrow_program_id": str(billing_service.ESCROW_PROGRAM_ID)
    }

@router.post("/agent/{agent_id}/withdraw")
async def withdraw_agent_earnings(
    agent_id: str,
    current_user: str = Depends(get_current_user)
):
    """Withdraws settled agent earnings from the platform wallet."""
    success, result = await billing_service.withdraw_agent_funds(agent_id, current_user)
    if not success:
        raise HTTPException(status_code=400, detail=result)
    return {"message": "Withdrawal successful", "tx_signature": result}
