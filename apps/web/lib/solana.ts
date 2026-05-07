import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import { encodeURL } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { sha256 } from 'js-sha256';

// Squads V4 Program ID
const SQUADS_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_SQUADS_PROGRAM_ID || "SQDS4Byj9s7BfR7atvH9iSnduXW1U9CAdX9rW5L2S8X");

// Default platform wallet (will be overridden by config if possible)
export let PLATFORM_WALLET = "H1GKFJGLNPwYKd6ZXx2bcHJ8ahtD1sszkuMbGASXzPP6";

export const setPlatformWallet = (address: string) => {
  PLATFORM_WALLET = address;
};

export const createSolanaPayURL = (recipient: PublicKey, amount: number, reference: PublicKey, label: string, message: string) => {
  const url = encodeURL({
    recipient,
    amount: new BigNumber(amount),
    reference,
    label,
    message,
  });
  return url;
};

export const confirmTx = async (connection: Connection, signature: string) => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: signature,
  }, 'confirmed');
  return true;
};
