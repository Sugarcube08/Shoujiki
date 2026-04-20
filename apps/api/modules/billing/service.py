import hashlib
import struct
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from solders.message import MessageV0
from solana.rpc.async_api import AsyncClient
from backend.core.config import SOLANA_RPC_URL, PLATFORM_SECRET_SEED, PROGRAM_ID as CONFIG_PROGRAM_ID
import logging

logger = logging.getLogger(__name__)

PROGRAM_ID = Pubkey.from_string(CONFIG_PROGRAM_ID)
platform_keypair = Keypair.from_seed(PLATFORM_SECRET_SEED.encode())
PLATFORM_WALLET = str(platform_keypair.pubkey())

def get_discriminator(namespace: str, name: str) -> bytes:
    preimage = f"{namespace}:{name}"
    return hashlib.sha256(preimage.encode()).digest()[:8]

async def verify_solana_payment(task_id: str, expected_amount_sol: float, sender_wallet: str):
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            # PDA seeds: [b"escrow", task_id]
            seeds = [b"escrow", task_id.encode()]
            escrow_pda, _ = Pubkey.find_program_address(seeds, PROGRAM_ID)
            
            logger.info(f"Verifying Escrow PDA: {escrow_pda} for task {task_id}")

            for i in range(10): # Try for 20 seconds
                resp = await client.get_account_info(escrow_pda)
                if resp.value:
                    data = resp.value.data
                    # Anchor account discriminator is 8 bytes
                    # maker is next 32 bytes
                    maker_pubkey = Pubkey.from_bytes(data[8:40])
                    # amount is at offset 104 (8+32+32+32)
                    amount_lamports = struct.unpack('<Q', data[104:112])[0]
                    
                    expected_lamports = int(expected_amount_sol * 10**9)
                    
                    if str(maker_pubkey) == sender_wallet and amount_lamports >= expected_lamports * 0.99:
                        logger.info("Escrow payment verified successfully")
                        return True, "Escrow funded"
                    else:
                        return False, f"Escrow mismatch: maker={maker_pubkey}, amount={amount_lamports}"
                
                import asyncio
                await asyncio.sleep(2)
            
            return False, "Escrow PDA not found or not initialized"
        except Exception as e:
            logger.error(f"Escrow verification error: {e}")
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
            logger.error(f"Solana Pay verification error: {e}")
            return False, f"Verification error: {str(e)}"

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

async def settle_escrow(task_id: str, agent_creator_wallet: str, success: bool):
    """
    Settle the escrow on-chain: resolve (payout) or refund.
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            seeds = [b"escrow", task_id.encode()]
            escrow_pda, _ = Pubkey.find_program_address(seeds, PROGRAM_ID)
            
            if success:
                logger.info(f"Resolving escrow for task {task_id}")
                disc = get_discriminator("global", "resolve")
                ix = Instruction(
                    program_id=PROGRAM_ID,
                    data=disc,
                    accounts=[
                        AccountMeta(pubkey=escrow_pda, is_signer=False, is_writable=True),
                        AccountMeta(pubkey=platform_keypair.pubkey(), is_signer=True, is_writable=True),
                        AccountMeta(pubkey=Pubkey.from_string(agent_creator_wallet), is_signer=False, is_writable=True),
                    ]
                )
            else:
                logger.info(f"Refunding escrow for task {task_id}")
                # We need the maker address from the state to refund
                resp = await client.get_account_info(escrow_pda)
                if not resp.value:
                    return False, "Escrow account not found"
                maker_pubkey = Pubkey.from_bytes(resp.value.data[8:40])
                
                disc = get_discriminator("global", "refund")
                ix = Instruction(
                    program_id=PROGRAM_ID,
                    data=disc,
                    accounts=[
                        AccountMeta(pubkey=escrow_pda, is_signer=False, is_writable=True),
                        AccountMeta(pubkey=platform_keypair.pubkey(), is_signer=True, is_writable=True),
                        AccountMeta(pubkey=maker_pubkey, is_signer=False, is_writable=True),
                    ]
                )

            recent_blockhash = (await client.get_latest_blockhash()).value.blockhash
            msg = MessageV0.try_compile(
                payer=platform_keypair.pubkey(),
                instructions=[ix],
                address_lookup_table_accounts=[],
                recent_blockhash=recent_blockhash,
            )
            tx = VersionedTransaction(msg, [platform_keypair])
            res = await client.send_transaction(tx)
            logger.info(f"Escrow settlement tx sent: {res.value}")
            return True, str(res.value)
        except Exception as e:
            logger.error(f"Escrow settlement error: {e}")
            return False, str(e)
