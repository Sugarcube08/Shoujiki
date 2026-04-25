"use client";

import React, { useEffect, useState } from 'react';
import { getMyAgents, deleteAgent, withdrawAgentBalance } from '@/lib/api';
import { AgentCard } from '@/components/agent/AgentCard';
import { Loader2, Plus, LayoutGrid, Terminal as TerminalIcon, Shield, Activity } from 'lucide-react';
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
      setSuccess('Instance decommissioned.');
    } catch (err: any) {
      setError('Operation failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleWithdraw = async (id: string) => {
    setWithdrawingId(id);
    try {
      await withdrawAgentBalance(id);
      setSuccess(`Earnings transferred`);
      fetchAgents();
    } catch (err: any) {
      setError('Transfer failed');
    } finally {
      setWithdrawingId(null);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6 animate-in fade-in duration-500">
        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-600">
          <Shield size={24} />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-zinc-100 uppercase tracking-tight">Identity Required</h2>
          <p className="text-zinc-500 text-sm">Link your wallet to manage your nodes.</p>
        </div>
        <Button onClick={login} className="rounded-full px-8 h-11">Connect Wallet</Button>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-10 border-b border-zinc-900">
        <div className="space-y-1.5">
           <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Fleet Overview</h1>
           <p className="text-zinc-400 text-sm font-medium leading-relaxed">
            Monitor telemetry and earnings for your deployed autonomous agents.
          </p>
        </div>
        
        <Button onClick={() => router.push('/dev')} className="rounded-xl h-11 px-6 text-xs font-bold uppercase tracking-widest gap-2">
          <Plus size={16} /> Deploy Agent
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="animate-spin text-zinc-700" size={24} />
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Syncing Fleet State...</p>
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
        <div className="py-32 rounded-[32px] border border-dashed border-zinc-900 flex flex-col items-center gap-6 group hover:bg-zinc-900/10 transition-colors">
          <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-700">
             <Activity size={24} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-zinc-200 font-semibold uppercase tracking-tight">Fleet Offline</p>
            <p className="text-zinc-600 text-xs max-w-xs mx-auto font-medium leading-relaxed uppercase tracking-tighter">No active nodes registered to this identity.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dev')} className="h-10 px-8 rounded-lg font-bold text-[10px] uppercase tracking-widest border-zinc-800">
            Initialize First Node
          </Button>
        </div>
      )}

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
    </div>
  );
}
