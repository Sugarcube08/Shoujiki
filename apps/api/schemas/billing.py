from pydantic import BaseModel
from typing import Dict


class UserWalletResponse(BaseModel):
    wallet_address: str
    balance: float
    allowances: Dict[str, float]

    class Config:
        from_attributes = True


class DepositRequest(BaseModel):
    amount: float
    transaction_signature: str


class WithdrawRequest(BaseModel):
    amount: float


class TransactionResponse(BaseModel):
    message: str
    tx_signature: str
    new_balance: float


class SessionCreate(BaseModel):
    agent_id: str
