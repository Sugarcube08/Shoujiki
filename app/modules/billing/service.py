import httpx
from solana.rpc.async_api import AsyncClient
from solders.signature import Signature
from solders.pubkey import Pubkey
from app.core.config import SOLANA_RPC_URL, PLATFORM_WALLET
import time
import struct

async def verify_solana_payment(tx_signature_str: str, expected_amount_sol: float, sender_wallet: str):
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            signature = Signature.from_string(tx_signature_str)
            
            for _ in range(5):
                resp = await client.get_transaction(signature, max_supported_transaction_version=0)
                if resp.value:
                    tx = resp.value
                    if tx.transaction.meta.err:
                        return False, "Transaction failed on chain"
                    
                    message = tx.transaction.transaction.message
                    account_keys = message.account_keys
                    
                    # Also verify via System Program Transfer instruction parsing
                    system_program_id = "11111111111111111111111111111111"
                    valid_transfer_found = False
                    
                    for inst in message.instructions:
                        program_id = str(account_keys[inst.program_id_index])
                        if program_id == system_program_id:
                            data = inst.data
                            # Transfer instruction is 12 bytes: u32 (2) + u64 (lamports)
                            if len(data) == 12 and struct.unpack('<I', data[:4])[0] == 2:
                                lamports = struct.unpack('<Q', data[4:12])[0]
                                from_acc = str(account_keys[inst.accounts[0]])
                                to_acc = str(account_keys[inst.accounts[1]])
                                
                                if to_acc == PLATFORM_WALLET and from_acc == sender_wallet and lamports >= expected_amount_sol * 10**9 * 0.99:
                                    valid_transfer_found = True
                                    break
                    
                    if not valid_transfer_found:
                        return False, "Valid SystemProgram transfer instruction not found in transaction"

                    return True, "Payment verified"
                
                import asyncio
                await asyncio.sleep(2)
            
            return False, "Transaction not found after timeout"
        except Exception as e:
            return False, f"Verification error: {str(e)}"
