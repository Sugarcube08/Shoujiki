import hashlib
import asyncio
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.signature import Signature
from solders.transaction import VersionedTransaction
from solders.message import MessageV0
from solana.rpc.async_api import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from core.config import (
    SOLANA_RPC_URL,
    PLATFORM_SECRET_SEED_BYTES,
)
from db.session import AsyncSessionLocal
from sqlalchemy.future import select
import logging

logger = logging.getLogger(__name__)

# Initialize Platform Keypair
platform_keypair = Keypair.from_seed(PLATFORM_SECRET_SEED_BYTES)
PLATFORM_WALLET = str(platform_keypair.pubkey())
logger.info(f"SOLANA: Platform Authority initialized: {PLATFORM_WALLET}")


def get_anchor_discriminator(name: str) -> bytes:
    """Compute Anchor discriminator for a method name."""
    return hashlib.sha256(f"global:{name}".encode()).digest()[:8]


async def verify_solana_payment(
    tx_signature: str, expected_amount_sol: float, sender_wallet: str, reference: str
):
    """
    Verify payment strictly by checking the specific transaction signature on-chain.
    Supports legacy system transfers to the platform wallet.
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            logger.info(f"Strictly verifying payment signature: {tx_signature}")

            # Retry loop for slow RPC/Finalization
            tx_resp = None
            for i in range(10):
                tx_resp = await client.get_transaction(
                    Signature.from_string(tx_signature),
                    encoding="jsonParsed",
                    commitment="confirmed",
                    max_supported_transaction_version=0,
                )
                if tx_resp.value:
                    break
                logger.info(f"Tx {tx_signature} not found yet, retrying {i + 1}/10...")
                await asyncio.sleep(2)

            if not tx_resp or not tx_resp.value:
                return False, "Transaction not found on-chain (timeout)"

            tx = tx_resp.value.transaction
            # Verify sender (first account is usually fee payer/sender)
            message = tx.transaction.message
            
            # Handle both UI/Parsed and Raw message structures
            if hasattr(message, "account_keys"):
                raw_keys = message.account_keys
                account_keys = []
                for k in raw_keys:
                    if hasattr(k, "pubkey"): # UiParsedMessageAccount
                        account_keys.append(str(k.pubkey))
                    else: # str or Pubkey
                        account_keys.append(str(k))
            else:
                return False, "Could not extract account keys from transaction"

            actual_sender = account_keys[0]
            if actual_sender != sender_wallet:
                logger.warning(f"Sender mismatch: expected {sender_wallet}, got {actual_sender}")
                return (
                    False,
                    f"Sender mismatch. Expected {sender_wallet}, got {actual_sender}",
                )

            # Check instructions for a direct transfer
            instructions = message.instructions
            expected_lamports = int(expected_amount_sol * 1e9)

            verified = False

            for ix in instructions:
                # Case A: Legacy System Program Transfer
                # When jsonParsed is used, ix is a UiPartiallyDecodedInstruction or UiParsedInstruction
                if hasattr(ix, "program") and ix.program == "system":
                    info = ix.parsed.get("info")
                    if info and info.get("destination") == PLATFORM_WALLET:
                        amount = info.get("lamports", 0)
                        # Use a small buffer for rounding/fees (99% check)
                        if amount >= expected_lamports * 0.99:
                            # For direct deposits, the sender IS the reference.
                            # Since we verified the sender already, we are good.
                            if reference in account_keys:
                                verified = True
                                break

            if not verified:
                logger.warning(f"Payment verification failed for {tx_signature}: No matching system transfer found.")
                return (
                    False,
                    "Valid transfer not found in transaction instructions",
                )

            logger.info(f"Payment verified successfully: {tx_signature}")
            return True, tx_signature
        except Exception as e:
            logger.error(f"Payment verification error: {str(e)}", exc_info=True)
            return False, f"Verification error: {str(e)}"


async def transfer_sol(recipient_wallet: str, amount_sol: float):
    """
    Directly transfers SOL from the Platform Authority to a recipient.
    Used for paying out agent earnings accumulated via legacy system transfers.
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            from solders.system_program import TransferParams, transfer

            amount_lamports = int(amount_sol * 1e9)
            ix = transfer(
                TransferParams(
                    from_pubkey=platform_keypair.pubkey(),
                    to_pubkey=Pubkey.from_string(recipient_wallet),
                    lamports=amount_lamports,
                )
            )

            latest_blockhash = (await client.get_latest_blockhash()).value.blockhash
            msg = MessageV0.try_compile(
                payer=platform_keypair.pubkey(),
                instructions=[ix],
                address_lookup_table_accounts=[],
                recent_blockhash=latest_blockhash,
            )
            tx = VersionedTransaction(msg, [platform_keypair])

            resp = await client.send_transaction(tx)
            return True, str(resp.value)
        except Exception as e:
            logger.error(f"SOL Transfer failed: {e}")
            return False, str(e)


async def withdraw_agent_funds(agent_id: str, requester_wallet: str):
    """
    Withdraws settled agent earnings.
    Direct Payout Model: Transfers SOL from the Platform Authority directly to the Creator's Wallet.
    """
    async with AsyncSessionLocal() as db:
        from db.models.models import Agent

        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()

        if not agent:
            return False, "Agent not found"
        if agent.creator_wallet != requester_wallet:
            return False, "Unauthorized"

        amount = agent.balance
        if amount <= 0:
            return False, "No earnings to withdraw"

        logger.info(
            f"TREASURY: Initializing Direct Payout for agent {agent_id}. Amount: {amount} SOL to {agent.creator_wallet}"
        )

        # Protocol Call: Direct SOL transfer from Platform Authority to Creator
        ok, result = await transfer_sol(agent.creator_wallet, amount)

        if ok:
            # Update internal ledger: Clear balance
            agent.balance = 0.0
            await db.commit()
            
            logger.info(
                f"TREASURY: Direct Payout successful for {agent_id}. Tx: {result}"
            )
            return True, result
        else:
            logger.error(f"TREASURY: Direct Payout failed for {agent_id}: {result}")
            return False, f"Payout failed: {result}"


async def withdraw_user_wallet_balance(
    db: AsyncSession, wallet_address: str, amount_sol: float
):
    """
    Withdraws funds from the User's Layer 2 App Wallet back to their Layer 1 Solana wallet.
    """
    from db.models.models import UserWallet

    result = await db.execute(
        select(UserWallet).where(UserWallet.wallet_address == wallet_address)
    )
    user_wallet = result.scalars().first()

    if not user_wallet or user_wallet.balance < amount_sol:
        return False, "Insufficient balance in App Wallet"

    # Protocol Call: Trigger real SOL transfer from Platform to User
    ok, tx_sig = await transfer_sol(wallet_address, amount_sol)

    if ok:
        user_wallet.balance -= amount_sol
        await db.commit()
        return True, tx_sig
    else:
        return False, tx_sig
