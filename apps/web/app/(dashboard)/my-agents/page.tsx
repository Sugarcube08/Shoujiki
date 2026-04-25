"use client";

import React, { useEffect, useState } from 'react';
import { getMyAgents, deleteAgent, withdrawAgentBalance } from '@/lib/api';
import { AgentCard } from '@/components/agent/AgentCard';
import { Loader2, Plus, AlertCircle, LayoutGrid, Terminal as TerminalIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Alert } from '@/components/ui/Alert';

export default function MyAgentsPage() {
  const router = useRouter();
  const { isAuthenticated, login, connected } = useWalletAuth();
  
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAgents = async () => {
    try {
      const data = await getMyAgents();
      setAgents(data.filter((a: any) => !!a.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAgents();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAgent(id);
      setAgents(agents.filter((a: any) => a.id !== id));
      setSuccess('Agent terminated successfully.');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to delete agent');
    } finally {
      setDeletingId(null);
    }
  };

  const handleWithdraw = async (id: string) => {
    setWithdrawingId(id);
    try {
      const res = await withdrawAgentBalance(id);
      setSuccess(`Withdrawal successful! TX: ${res.tx_signature.slice(0, 16)}...`);
      fetchAgents(); // Refresh balances
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to withdraw funds');
    } finally {
      setWithdrawingId(null);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-8 bg-zinc-950 border border-zinc-900 rounded-[40px] shadow-2xl">
        <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800 shadow-inner text-zinc-700">
          <TerminalIcon size={48} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Terminal_Restricted</h2>
          <p className="text-zinc-500 font-medium">Please connect your Solana wallet to access your agent fleet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400">
            <LayoutGrid size={12} />
            Command Center
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase leading-none">
            Your <span className="text-zinc-500">Fleet</span>
          </h1>
          <p className="text-zinc-400 font-medium max-w-xl leading-relaxed">
            Monitor, manage, and scale your autonomous agent collection. Track on-chain earnings and performance metrics.
          </p>
        </div>
        
        <Button onClick={() => router.push('/dev')} className="h-16 px-10 rounded-2xl bg-blue-600 border-t border-white/20 font-black tracking-tight gap-3 shadow-[0_0_30px_rgba(37,99,235,0.2)] hover:scale-105 active:scale-95 transition-all">
          <Plus size={20} />
          NEW_MISSION
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.1)]" />
          <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px]">Syncing_Fleet_Data</p>
        </div>
      ) : agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {agents.map((agent: any) => (
            <AgentCard 
              key={agent.id} 
              agent={agent} 
              onDelete={() => handleDelete(agent.id)}
              isDeleting={deletingId === agent.id}
              onWithdraw={() => handleWithdraw(agent.id)}
              isWithdrawing={withdrawingId === agent.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-40 bg-zinc-900/10 rounded-[48px] border-2 border-dashed border-zinc-900 flex flex-col items-center gap-6 group">
          <div className="w-20 h-20 bg-zinc-950 border border-zinc-900 rounded-3xl flex items-center justify-center text-zinc-800 transition-all duration-500 group-hover:border-blue-500/30 group-hover:text-blue-500/30 group-hover:scale-110">
             <Plus size={40} />
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">No Active Deployments</p>
            <p className="text-zinc-600 text-xs font-medium">Your agent fleet is currently empty. Initialize a new mission.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dev')} className="h-12 px-8 rounded-xl border-zinc-800 font-bold">
            START_MISSION
          </Button>
        </div>
      )}

      {error && <Alert type="error" title="Command Failed" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" title="Success" message={success} onClose={() => setSuccess('')} />}
    </div>
  );
}
