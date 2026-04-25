"use client";

import React, { useState, useEffect } from 'react';
import { getInternalWallet, depositFunds, withdrawFunds } from '@/lib/api';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PLATFORM_WALLET } from '@/lib/solana';
import { Alert } from '@/components/ui/Alert';

export const WalletWidget = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { isAuthenticated } = useWalletAuth();
  
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('0.1');
  const [status, setStatus] = useState<'idle' | 'depositing' | 'withdrawing'>('idle');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBalance = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await getInternalWallet();
      setBalance(data.balance);
    } catch (err) {
      console.error("Balance sync failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [isAuthenticated]);

  const handleDeposit = async () => {
    if (!publicKey) return;
    setStatus('depositing');
    try {
      const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(PLATFORM_WALLET),
          lamports,
        })
      );
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');
      await depositFunds(sig);
      setSuccess('Balance updated');
      fetchBalance();
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
    } finally {
      setStatus('idle');
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey) return;
    setStatus('withdrawing');
    try {
      await withdrawFunds(parseFloat(amount));
      setSuccess('Withdrawal processed');
      fetchBalance();
    } catch (err: any) {
      setError('Insufficient balance');
    } finally {
      setStatus('idle');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-6">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-500">
             <Wallet size={14} />
             <span className="text-[10px] font-bold uppercase tracking-widest">Balance</span>
          </div>
          <button onClick={fetchBalance} className="text-zinc-600 hover:text-zinc-300">
             <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
       </div>
       
       <p className="text-2xl font-medium tracking-tight text-white">
          {balance.toFixed(3)} <span className="text-zinc-600 text-sm">SOL</span>
       </p>

       <div className="space-y-2">
          <input 
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-zinc-700"
          />
          <div className="flex gap-2">
             <Button variant="primary" size="sm" onClick={handleDeposit} isLoading={status === 'depositing'} className="flex-1 h-9 rounded-lg text-[10px] font-bold">
                Deposit
                <ArrowUpRight size={12} />
             </Button>
             <Button variant="outline" size="sm" onClick={handleWithdraw} isLoading={status === 'withdrawing'} className="flex-1 h-9 rounded-lg text-[10px] font-bold border-zinc-800">
                Withdraw
             </Button>
          </div>
       </div>

       {error && <Alert type="error" message={error} onClose={() => setError('')} />}
       {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
    </div>
  );
};
