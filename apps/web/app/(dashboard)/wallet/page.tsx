"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getMyAppWallet, getMyAgents, withdrawAgentBalance, depositToAppWallet, withdrawFromAppWallet, getBillingConfig } from '@/lib/api';
import { 
  Loader2, Wallet, ArrowUpRight, ArrowDownLeft, 
  Shield, Banknote, History, ExternalLink, 
  Activity, RefreshCw, Layers, Landmark, 
  CheckCircle2, Send, ShieldCheck, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Alert } from '@/components/ui/Alert';
import NoSSR from '@/components/ui/NoSSR';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import { cn } from '@/lib/utils';

export default function WalletPage() {
  const { isAuthenticated, publicKey, connected, login, balance: onChainBalance } = useWalletAuth();
  const { connection } = useConnection();
  const { sendTransaction } = useWallet();
  
  const [wallet, setWallet] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [withdrawAmount, setWithdrawAmount] = useState('0.1');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [walletData, agentsData, configData] = await Promise.all([
        getMyAppWallet(),
        getMyAgents(),
        getBillingConfig()
      ]);
      setWallet(walletData);
      setAgents(agentsData);
      setConfig(configData);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch protocol financial data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchData]);

  const handleDeposit = async () => {
    if (!connected || !publicKey || !config?.platform_wallet) return;
    setActionLoading(true);
    setError('');
    try {
      addLog("Initializing L1 -> L2 Bridge...");
      
      const amount = parseFloat(depositAmount);
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new (await import('@solana/web3.js')).PublicKey(config.platform_wallet),
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      addLog(`On-chain transaction submitted: ${signature.slice(0, 8)}...`);
      
      await depositToAppWallet(amount, signature);
      setSuccess("Deposit successful. Your Protected Ledger has been credited.");
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Deposit failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawFromApp = async () => {
    if (!withdrawAmount) return;
    setActionLoading(true);
    try {
      await withdrawFromAppWallet(parseFloat(withdrawAmount));
      setSuccess("Withdrawal successful. SOL transferred back to your wallet.");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Withdrawal failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawAgent = async (agentId: string) => {
    setActionLoading(true);
    try {
      await withdrawAgentBalance(agentId);
      setSuccess(`Direct Payout successful. Earnings transferred to your on-chain wallet.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Payout failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-zinc-600" size={24} />
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Querying Global Ledger...</span>
    </div>
  );

  if (!isAuthenticated) return (
    <div className="flex flex-col items-center justify-center py-40 gap-8 animate-in fade-in">
        <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-700 shadow-2xl">
            <Landmark size={32} strokeWidth={1.5} />
        </div>
        <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Access Restricted</h2>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto">Authorize your sovereign session to manage protocol liquidity and fleet revenue.</p>
        </div>
        <Button onClick={login} className="px-12 h-12 rounded-xl shadow-xl font-bold uppercase text-[10px] tracking-widest">Authenticate Session</Button>
    </div>
  );

  const totalFleetEarnings = agents.reduce((acc, a) => acc + (a.total_earnings || 0), 0);
  const totalFleetBalance = agents.reduce((acc, a) => acc + (a.balance || 0), 0);

  return (
    <NoSSR>
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 pb-24 text-left">
        {/* Modern Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Financial_Protocol_Active</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Financial <span className="text-zinc-500">Hub</span></h1>
            <p className="text-zinc-400 text-sm font-medium">Manage on-chain liquidity, L2 protected balances, and fleet revenue.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchData} 
            className="border-zinc-800 rounded-xl h-10 px-5 text-[10px] font-bold uppercase tracking-widest gap-2 hover:bg-zinc-900/50"
          >
            <RefreshCw size={14} className={cn(actionLoading && "animate-spin")} /> Refresh_Balances
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Main Wallets */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* On-chain Solana Wallet */}
            <Card className="bg-[#0c0c0e] border-zinc-800/60 shadow-2xl relative overflow-hidden group">
               <div className="absolute -top-10 -right-10 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500">
                  <Wallet size={240} />
               </div>
               <CardHeader className="pb-2 border-b border-zinc-900/50 bg-zinc-900/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Layers size={12} className="text-purple-500" /> Layer 1: Solana Wallet
                    </span>
                    <div className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-[9px] font-mono text-zinc-500">{publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}</span>
                    </div>
                  </div>
               </CardHeader>
               <CardContent className="pt-8 pb-10 space-y-8 relative z-10">
                  <div className="text-center space-y-1">
                    <h2 className="text-6xl font-black text-white tracking-tighter">
                       {onChainBalance?.toFixed(4) || '0.0000'} <span className="text-2xl text-zinc-500">SOL</span>
                    </h2>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Available On-chain Balance</p>
                  </div>
                  
                  <div className="pt-6 grid grid-cols-1 gap-4">
                    <div className="bg-zinc-950/50 rounded-2xl p-6 border border-zinc-900/50 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Deposit to Protected Ledger</span>
                            <ArrowDownLeft size={16} className="text-blue-500" />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-700">SOL</span>
                                <Input 
                                    type="number" 
                                    value={depositAmount} 
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 text-white font-mono h-11 pl-10 text-sm focus:border-blue-500/50 transition-all"
                                />
                            </div>
                            <Button 
                                className="h-11 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest bg-protocol-cyan hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all"
                                onClick={handleDeposit}
                                isLoading={actionLoading}
                            >
                                Deposit
                            </Button>
                        </div>
                    </div>
                  </div>
               </CardContent>
            </Card>

            {/* Layer 2 Protected Ledger */}
            <Card className="bg-[#0c0c0e] border-zinc-800/60 shadow-2xl relative overflow-hidden group">
               <CardHeader className="pb-2 border-b border-zinc-900/50 bg-blue-500/[0.03]">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        <Shield size={12} /> Layer 2: Protected Ledger
                    </span>
                    <div className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                        <span className="text-[8px] font-black text-protocol-cyan uppercase tracking-widest">Zero-Latency Active</span>
                    </div>
                  </div>
               </CardHeader>
               <CardContent className="pt-8 pb-10 space-y-8 relative z-10">
                  <div className="text-center space-y-1">
                    <h2 className="text-6xl font-black text-white tracking-tighter">
                       {wallet?.balance?.toFixed(4) || '0.0000'} <span className="text-2xl text-zinc-500">SOL</span>
                    </h2>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Internal Execution Credits</p>
                  </div>
                  
                  <div className="pt-6 grid grid-cols-1 gap-4">
                    <div className="bg-zinc-950/50 rounded-2xl p-6 border border-zinc-900/50 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Withdraw to On-chain Wallet</span>
                            <ArrowUpRight size={16} className="text-zinc-600" />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-700">SOL</span>
                                <Input 
                                    type="number" 
                                    value={withdrawAmount} 
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 text-white font-mono h-11 pl-10 text-sm focus:border-zinc-700 transition-all"
                                />
                            </div>
                            <Button 
                                variant="outline"
                                className="h-11 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest border-zinc-800 text-zinc-300 hover:bg-white hover:text-black transition-all"
                                onClick={handleWithdrawFromApp}
                                isLoading={actionLoading}
                                disabled={!wallet?.balance || wallet.balance <= 0}
                            >
                                Withdraw
                            </Button>
                        </div>
                    </div>
                  </div>
               </CardContent>
            </Card>

            <div className="p-6 rounded-2xl bg-zinc-900/10 border border-dashed border-zinc-800/60">
                <p className="text-[10px] text-zinc-600 font-bold leading-relaxed uppercase">
                    The Protected Ledger enables high-speed, zero-fee agent execution by utilizing an internal off-chain ledger anchored to the Solana network.
                </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Fleet Revenue */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Revenue Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-zinc-800 bg-[#0c0c0e] p-8 group relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Banknote size={80} />
                    </div>
                    <div className="space-y-4">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Total Fleet Earnings</span>
                        <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-black text-white tracking-tighter">{totalFleetEarnings.toFixed(4)}</p>
                            <span className="text-sm font-bold text-zinc-500 uppercase">SOL</span>
                        </div>
                        <div className="flex items-center gap-2 pt-2 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                            <TrendingUp size={12} /> lifetime protocol revenue
                        </div>
                    </div>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/20 p-8 group relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShieldCheck size={80} className="text-green-500" />
                    </div>
                    <div className="space-y-4">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Claimable Balance</span>
                        <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-black text-green-400 tracking-tighter">{totalFleetBalance.toFixed(4)}</p>
                            <span className="text-sm font-bold text-zinc-500 uppercase">SOL</span>
                        </div>
                        <div className="flex items-center gap-2 pt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            <Activity size={12} /> net available for payout
                        </div>
                    </div>
                </Card>
            </div>

            {/* Payout Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-zinc-200 uppercase tracking-[0.3em] flex items-center gap-2">
                        <History size={14} className="text-blue-500" /> Fleet Payout Registry
                    </h3>
                </div>

                <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-[32px] overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-900/40 border-b border-zinc-800/60">
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Agent Entity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Revenue Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Settlement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/40">
                            {agents.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-800/60 flex items-center justify-center text-zinc-800">
                                                <Activity size={32} strokeWidth={1} />
                                            </div>
                                            <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">No active autonomous entities detected</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : agents.map(agent => (
                                <tr key={agent.id} className="group hover:bg-white/[0.01] transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:border-zinc-700 transition-all">
                                                <Shield size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-200 leading-none mb-1.5">{agent.name}</p>
                                                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">{agent.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-white">{(agent.balance || 0).toFixed(4)}</span>
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase">SOL Net</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 flex-1 bg-zinc-900 rounded-full overflow-hidden max-w-[100px]">
                                                    <div className="h-full bg-green-500" style={{ width: `${Math.min(((agent.balance || 0) / (agent.total_earnings || 1)) * 100, 100)}%` }} />
                                                </div>
                                                <span className="text-[8px] font-black text-zinc-700 uppercase">Settled</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <Button 
                                            size="sm"
                                            disabled={!agent.balance || agent.balance <= 0}
                                            onClick={() => handleWithdrawAgent(agent.id)}
                                            isLoading={actionLoading}
                                            className="h-10 rounded-xl bg-white text-black hover:bg-zinc-200 text-[10px] font-black uppercase tracking-widest px-6 shadow-xl disabled:bg-zinc-900 disabled:text-zinc-700"
                                        >
                                            <ArrowUpRight size={14} /> Withdraw
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 bg-[#0a0a0c] border border-zinc-800/60 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/20 shadow-inner">
                         <ShieldCheck size={28} />
                      </div>
                      <div>
                         <p className="text-sm font-black text-white uppercase tracking-tight">Direct Payout Protocol Active</p>
                         <p className="text-[11px] text-zinc-500 font-medium max-w-sm leading-relaxed">
                            Earnings are automatically processed as a direct on-chain transfer from the platform authority to your verified wallet.
                         </p>
                      </div>
                   </div>
                   <div className="flex gap-3 w-full md:w-auto">
                      <Button variant="outline" className="flex-1 md:flex-none h-11 px-6 text-[10px] font-black uppercase rounded-xl border-zinc-800 text-zinc-400 hover:text-white gap-2">
                         <ExternalLink size={14} /> Protocol_Audit
                      </Button>
                   </div>
                </div>
            </div>
          </div>
        </div>

        {/* Logs Panel (Overlay when active) */}
        {logs.length > 0 && (
            <div className="fixed bottom-8 right-8 w-96 bg-[#050505] border border-zinc-800 rounded-2xl shadow-3xl overflow-hidden z-50 animate-in slide-in-from-right-10">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} className="text-blue-500" /> Bridge Transaction Log
                    </span>
                    <button onClick={() => setLogs([])} className="text-zinc-600 hover:text-white transition-colors"><CheckCircle2 size={14} /></button>
                </div>
                <div className="p-5 max-h-60 overflow-y-auto custom-scrollbar space-y-3 bg-black">
                    {logs.map((log, i) => (
                        <p key={i} className="text-[11px] font-mono text-zinc-400 flex gap-3">
                            <span className="text-zinc-800 select-none">[{i}]</span> {log}
                        </p>
                    ))}
                </div>
            </div>
        )}

        {error && <Alert type="error" title="Protocol Fault" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" title="Success" message={success} onClose={() => setSuccess('')} />}
      </div>
    </NoSSR>
  );
}
