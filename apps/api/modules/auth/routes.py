from fastapi import APIRouter, HTTPException
from schemas.auth import WalletLoginRequest, TokenResponse
from modules.auth.service import authenticate_wallet

router = APIRouter()


@router.post("/verify", response_model=TokenResponse)
async def verify_login(req: WalletLoginRequest):
    token = authenticate_wallet(req.public_key, req.signature, req.message)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid signature")
    return TokenResponse(access_token=token)
