"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgent, withdrawAgentBalance } from '@/lib/api';
import {
   Loader2, ArrowLeft, TrendingUp,
   Wallet, CheckCircle2, Info, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AgentFinancePage() {
   const params = useParams();
   const agentId = params.id as string;
   const { isAuthenticated, connected } = useWalletAuth();

   const [agent, setAgent] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [error, setError] = useState('');
   const [success, setSuccess] = useState('');

   const fetchData = async () => {
      try {
         const agentData = await getAgent(agentId);
         setAgent(agentData);
      } catch (err) {
         console.error(err);
         setError("Failed to access agent financial data.");
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      if (isAuthenticated) {
         fetchData();
      }
   }, [isAuthenticated, agentId]);

   const handleWithdraw = async () => {
      setActionLoading(true);
      try {
         await withdrawAgentBalance(agentId);
         setSuccess(`Direct Payout successful. SOL transferred to your wallet.`);
         fetchData();
      } catch (err: any) {
         setError(err.response?.data?.detail || "Payout failed.");
      } finally {
         setActionLoading(false);
      }
   };

   if (loading) return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
         <Loader2 className="animate-spin text-zinc-600" size={24} />
         <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Auditing Agent Performance...</span>
      </div>
   );

   const reliability = ((agent?.successful_runs || 0) / (agent?.total_runs || 1) * 100);

   return (
      <div className="space-y-10 animate-in fade-in duration-700 pb-24 text-left">
         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-10">
            <div className="space-y-2">
               <Link href="/my-agents" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest mb-2">
                  <ArrowLeft size={14} /> Back to Fleet
               </Link>
               <h1 className="text-3xl font-bold text-white tracking-tight">{agent?.name} <span className="text-zinc-500 font-medium">Performance</span></h1>
               <p className="text-zinc-400 text-sm font-medium">Real-time execution metrics and direct payout management.</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Performance Overview */}
            <Card className="lg:col-span-4 bg-[#0c0c0e] border-zinc-800/60 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Activity size={140} />
               </div>
               <CardHeader className="pb-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Node Health Metric</span>
               </CardHeader>
               <CardContent className="pt-6 space-y-8 relative z-10">
                  <div className="text-center space-y-2">
                     <h2 className={cn(
                        "text-6xl font-black tracking-tighter",
                        reliability > 90 ? "text-green-400" : reliability > 70 ? "text-blue-400" : "text-zinc-400"
                     )}>
                        {reliability.toFixed(1)}%
                     </h2>
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Execution Reliability</span>
                  </div>

                  <div className="space-y-4 pt-4">
                     <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-zinc-600">Total Executions</span>
                        <span className="text-zinc-300">{agent?.total_runs}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-zinc-600">Successful Runs</span>
                        <span className="text-zinc-300">{agent?.successful_runs}</span>
                     </div>
                  </div>
               </CardContent>
            </Card>

            {/* Payout & Earnings */}
            <div className="lg:col-span-8 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-zinc-900/20 border-zinc-800/40 p-6">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                           <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Lifetime Earnings</span>
                     </div>
                     <p className="text-2xl font-bold text-white">{(agent?.total_earnings || 0).toFixed(4)} <span className="text-xs text-zinc-500 font-medium">SOL</span></p>
                     <p className="text-[10px] text-zinc-600 uppercase mt-1">95% Net Share (After 5% Protocol Fee)</p>
                  </Card>

                  <Card className="bg-[#0a0a0c] border-zinc-800 p-6 relative overflow-hidden">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-protocol-cyan/10 rounded-lg text-blue-400">
                           <Wallet size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Claimable Balance</span>
                     </div>
                     <p className="text-3xl font-bold text-white">
                        {(agent?.balance || 0).toFixed(4)} <span className="text-sm text-zinc-500 font-medium">SOL</span>
                     </p>

                     <Button
                        className="w-full mt-6 h-12 rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-lg uppercase text-[10px] tracking-widest"
                        onClick={handleWithdraw}
                        isLoading={actionLoading}
                        disabled={!connected || (agent?.balance || 0) <= 0}
                     >
                        Withdraw to Wallet
                     </Button>
                  </Card>
               </div>

               <Card className="border-zinc-800 bg-[#09090b] p-8 shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between gap-10">
                     <div className="space-y-4 max-w-sm">
                        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                           <CheckCircle2 size={18} className="text-protocol-cyan" /> Direct Payout Model
                        </h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                           This agent uses the Direct Payout protocol. All compute fees paid by users are instantly credited to your internal ledger and can be withdrawn to your Solana wallet at any time.
                        </p>
                        <div className="flex items-start gap-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                           <Info size={14} className="text-zinc-600 shrink-0 mt-0.5" />
                           <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-tight">
                              Withdrawals are processed as direct L1 SOL transfers from the platform authority.
                           </p>
                        </div>
                     </div>
                  </div>
               </Card>
            </div>
         </div>

         {error && <Alert type="error" message={error} onClose={() => setError('')} />}
         {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      </div>
   );
}
