import hashlib
import struct
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from solders.message import MessageV0
from solana.rpc.async_api import AsyncClient
from backend.core.config import SOLANA_RPC_URL, PLATFORM_SECRET_SEED, SQUADS_PROGRAM_ID as CONFIG_PROGRAM_ID
import logging

logger = logging.getLogger(__name__)

SQUADS_PROGRAM_ID = Pubkey.from_string(CONFIG_PROGRAM_ID)
platform_keypair = Keypair.from_seed(PLATFORM_SECRET_SEED.encode())
PLATFORM_WALLET = str(platform_keypair.pubkey())

async def verify_solana_payment(tx_signature: str, expected_amount_sol: float, sender_wallet: str, reference: str):
    """
    Verify payment strictly by checking the specific transaction signature.
    Verifies:
    1. Transaction exists
    2. Sender matches current_user
    3. Recipient is PLATFORM_WALLET
    4. Amount matches agent price
    5. Reference account is present in the transaction
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            logger.info(f"Strictly verifying payment signature: {tx_signature}")
            
            # 1. Fetch transaction details
            tx_resp = await client.get_transaction(
                tx_signature, 
                encoding="jsonParsed", 
                max_supported_transaction_version=0
            )
            if not tx_resp.value:
                return False, "Transaction not found on-chain"
            
            tx = tx_resp.value.transaction
            # 2. Verify sender (first account is usually fee payer/sender)
            actual_sender = str(tx.transaction.message.account_keys[0].pubkey)
            if actual_sender != sender_wallet:
                return False, f"Sender mismatch. Expected {sender_wallet}, got {actual_sender}"
            
            # 3. Check instructions for transfer to platform AND the reference
            instructions = tx.transaction.message.instructions
            expected_lamports = int(expected_amount_sol * 1e9)
            
            payment_verified = False
            reference_verified = False
            
            for ix in instructions:
                if hasattr(ix, 'parsed') and ix.program == "system":
                    info = ix.parsed.get("info")
                    if info and info.get("destination") == PLATFORM_WALLET:
                        amount = info.get("lamports", 0)
                        if amount >= expected_lamports * 0.99:
                            payment_verified = True
                    
                    # Check if reference is in this instruction's keys or the message account keys
                    # In standard Solana Pay / our escrow logic, reference is an extra account
            
            # Check all account keys in the transaction for the reference
            account_keys = [str(acc.pubkey) for acc in tx.transaction.message.account_keys]
            if reference in account_keys:
                reference_verified = True
            
            if not payment_verified:
                return False, f"Transfer to platform wallet {PLATFORM_WALLET} not found or amount incorrect"
            
            if not reference_verified:
                return False, f"Reference {reference} not found in transaction accounts"
            
            logger.info(f"Payment verified successfully: {tx_signature}")
            return True, tx_signature
        except Exception as e:
            logger.error(f"Strict payment verification error: {str(e)}", exc_info=True)
            return False, f"Verification error: {str(e)}"

async def verify_solana_pay_payment(reference: str, expected_amount_sol: float, recipient_wallet: str):
    """
    Verify payment via Solana Pay reference.
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            ref_pubkey = Pubkey.from_string(reference)
            
            # Find signatures for the reference address
            for i in range(15): # Try for 30 seconds
                resp = await client.get_signatures_for_address(ref_pubkey)
                if resp.value:
                    signature = resp.value[0].signature
                    # Get transaction details
                    tx_resp = await client.get_transaction(signature, encoding="jsonParsed", max_supported_transaction_version=0)
                    if tx_resp.value:
                        tx = tx_resp.value.transaction
                        # Check instructions for the transfer
                        instructions = tx.transaction.message.instructions
                        
                        expected_lamports = int(expected_amount_sol * 10**9)
                        
                        for ix in instructions:
                            # Standard system program transfer
                            if hasattr(ix, 'parsed') and ix.program == "system":
                                info = ix.parsed.get("info")
                                if info and info.get("destination") == recipient_wallet:
                                    amount = info.get("lamports", 0)
                                    if amount >= expected_lamports * 0.99:
                                        logger.info(f"Solana Pay payment verified: {signature}")
                                        return True, str(signature)
                        
                        # Handle case where instruction might not be parsed but is a transfer
                        # (Fallback or different parsing depending on RPC)
                
                import asyncio
                await asyncio.sleep(2)
            
            return False, "Solana Pay verification error"
        except Exception as e:
            logger.error(f"Solana Pay verification error for ref {reference}: {str(e)}", exc_info=True)
            return False, f"Solana Pay Verification error (RPC): {str(e)}"

async def verify_transaction_signature(tx_signature: str, expected_amount_sol: float, expected_recipient: str, expected_sender: str):
    """
    Verify a specific transaction signature for a transfer of SOL.
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            # Fetch transaction details
            tx_resp = await client.get_transaction(
                tx_signature, 
                encoding="jsonParsed", 
                max_supported_transaction_version=0
            )
            if not tx_resp.value:
                return False, "Transaction not found"
            
            tx = tx_resp.value.transaction
            # Verify sender
            # In simple transfers, the first account is the fee payer and usually the sender
            sender = str(tx.transaction.message.account_keys[0].pubkey)
            if sender != expected_sender:
                return False, f"Sender mismatch. Expected {expected_sender}, got {sender}"
            
            # Check instructions for the transfer
            instructions = tx.transaction.message.instructions
            expected_lamports = int(expected_amount_sol * 1e9)
            
            for ix in instructions:
                if hasattr(ix, 'parsed') and ix.program == "system":
                    info = ix.parsed.get("info")
                    if info and info.get("destination") == expected_recipient:
                        amount = info.get("lamports", 0)
                        if amount >= expected_lamports * 0.99:
                            return True, "Verified"
            
            return False, "Transfer instruction to recipient not found in transaction"
        except Exception as e:
            logger.error(f"Tx verification error: {e}")
            return False, str(e)

async def payout_creator(developer_wallet: str, amount_sol: float):
    """
    Simulate payout to the developer. 
    In a production Squads integration, this would trigger a multisig transaction.
    """
    try:
        logger.info(f"Triggering payout: {amount_sol} SOL to {developer_wallet}")
        # In Squads: await squads.transfer(...)
        return True, "Payout triggered"
    except Exception as e:
        logger.error(f"Payout error: {e}")
        return False, str(e)

async def transfer_sol(recipient_wallet: str, amount_sol: float):
    """
    Native SOL transfer using solders.
    """
    from solana.rpc.async_api import AsyncClient
    from solders.pubkey import Pubkey
    from solders.system_program import TransferArgs, transfer
    from solders.transaction import VersionedTransaction
    from solders.message import MessageV0
    
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            recipient_pubkey = Pubkey.from_string(recipient_wallet)
            lamports = int(amount_sol * 1e9)
            
            # 1. Get recent blockhash
            latest_blockhash_resp = await client.get_latest_blockhash()
            recent_blockhash = latest_blockhash_resp.value.blockhash
            
            # 2. Create transfer instruction
            ix = transfer(TransferArgs(
                from_pubkey=platform_keypair.pubkey(),
                to_pubkey=recipient_pubkey,
                lamports=lamports
            ))
            
            # 3. Create and sign transaction
            msg = MessageV0.try_compile(
                payer=platform_keypair.pubkey(),
                instructions=[ix],
                address_lookup_table_accounts=[],
                recent_blockhash=recent_blockhash
            )
            tx = VersionedTransaction(msg, [platform_keypair])
            
            # 4. Send transaction
            resp = await client.send_transaction(tx)
            return True, str(resp.value)
        except Exception as e:
            logger.error(f"SOL transfer error: {e}")
            return False, str(e)

async def settle_task_payment(task_id: str, agent_creator_wallet: str, success: bool, amount_sol: float = 0.01):
    """
    Settle the task payment by crediting the agent's balance on success.
    The funds stay in the platform wallet until a withdrawal is requested.
    """
    if not success:
        logger.info(f"Task {task_id} failed. No balance credited.")
        return True, "Task failed, no payout"

    async with AsyncSessionLocal() as db:
        # Find the agent associated with this task
        from backend.db.models.models import Task, Agent
        task_res = await db.execute(select(Task).where(Task.id == task_id))
        task = task_res.scalars().first()
        if task:
            agent_res = await db.execute(select(Agent).where(Agent.id == task.agent_id))
            agent = agent_res.scalars().first()
            if agent:
                agent.balance += amount_sol
                await db.commit()
                logger.info(f"Task {task_id} settled: {amount_sol} SOL credited to agent {agent.id}")
                return True, f"Credited {amount_sol} SOL"
    
    return False, "Agent not found"

async def withdraw_agent_funds(agent_id: str, creator_wallet: str):
    """
    Withdraw agent earnings to the creator's wallet on-chain.
    """
    async with AsyncSessionLocal() as db:
        from backend.db.models.models import Agent
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = result.scalars().first()
        
        if not agent:
            return False, "Agent not found"
        if agent.creator_wallet != creator_wallet:
            return False, "Unauthorized withdrawal"
        if agent.balance <= 0:
            return False, "Insufficient balance"
        
        amount_to_send = agent.balance
        logger.info(f"Worker: Withdrawing {amount_to_send} SOL for agent {agent_id} to {creator_wallet}")
        
        ok, tx_sig = await transfer_sol(creator_wallet, amount_to_send)
        if ok:
            agent.balance = 0.0
            await db.commit()
            return True, tx_sig
        else:
            return False, tx_sig
