from pydantic import BaseModel
from typing import Optional

class WalletLoginRequest(BaseModel):
    public_key: str
    signature: str
    message: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class DepositRequest(BaseModel):
    tx_signature: str

class WithdrawRequest(BaseModel):
    amount: float

class WalletResponse(BaseModel):
    wallet_address: str
    balance: float
