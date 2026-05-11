"use client";

import React, { useEffect, useState } from 'react';
import { getMyAgents, deleteAgent, getTasks } from '@/lib/api';
import { AgentCard } from '@/components/agent/AgentCard';
import { Loader2, LayoutGrid, Shield, Activity, Sparkles, Cpu, Wallet, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import { cn, safeJsonParse } from '@/lib/utils';

export default function MyAgentsPage() {
  const router = useRouter();
  const { connected, login } = useWalletAuth();
  
  const [agents, setAgents] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [agentData, tasksData] = await Promise.all([
        getMyAgents(),
        getTasks()
      ]);
      setAgents(agentData);
      setRecentTasks(tasksData.slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected) fetchData();
    else setLoading(false);
  }, [connected]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <Loader2 className="animate-spin text-zinc-500" size={32} strokeWidth={1.5} />
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Accessing Fleet...</span>
    </div>
  );

  if (!connected) return (
    <div className="flex flex-col items-center justify-center py-40 gap-10 animate-fade-in">
      <div className="w-24 h-24 rounded-[2rem] bg-surface border border-surface-border flex items-center justify-center text-zinc-700 relative shadow-premium">
        <Shield size={44} strokeWidth={1} />
        <div className="absolute inset-0 blur-3xl bg-protocol-cyan/5 -z-10" />
      </div>
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-white tracking-tight">Operator Authentication Required</h2>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto font-medium">Link your sovereign wallet to manage and monitor your provisioned autonomous entities.</p>
      </div>
      <Button variant="primary" onClick={login} className="px-12 h-14 rounded-2xl shadow-2xl">Initialize Connection</Button>
    </div>
  );

  return (
    <div className="space-y-16 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 pb-12 border-b border-surface-border">
        <div className="space-y-5">
           <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface border border-surface-border text-zinc-400 text-[10px] font-medium tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-protocol-cyan shadow-[0_0_8px_rgba(6,182,212,0.4)] animate-pulse" />
            Registry Online
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">Agent <span className="text-zinc-500">Fleet</span></h1>
          <p className="text-zinc-500 text-base font-medium max-w-2xl leading-relaxed">
            Manage your fleet of autonomous neural entities. Review execution receipts, adjust throughput rates, and monitor on-chain settlements.
          </p>
        </div>
        <Button onClick={() => router.push('/dev')} className="h-14 px-10 rounded-2xl gap-3 shadow-2xl group transition-all duration-300">
          <Rocket size={20} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          Deploy New Entity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { label: 'Live Nodes', value: agents.length, icon: Cpu, color: 'text-white' },
          { label: 'Total Earnings', value: agents.reduce((acc, a) => acc + (a.total_earnings || 0), 0).toFixed(4), unit: 'SOL', icon: Wallet, color: 'text-green-500' },
          { label: 'Network Uptime', value: '99.9', unit: '%', icon: Activity, color: 'text-protocol-cyan' },
          { label: 'Compute Load', value: '14.2', unit: 'PFLOPS', icon: Sparkles, color: 'text-protocol-violet' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 rounded-[32px] bg-surface border border-surface-border hover:border-zinc-500 transition-all duration-300 group shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-background border border-surface-border shadow-inner", stat.color)}>
                <stat.icon size={22} strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight font-mono">{stat.value}</span>
              {stat.unit && <span className="text-[11px] font-bold text-zinc-600 uppercase">{stat.unit}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.4 }}
            >
              <AgentCard agent={agent} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-40 text-center space-y-8 border border-dashed border-surface-border rounded-[48px] bg-surface/50">
          <div className="w-24 h-24 bg-surface border border-surface-border rounded-[2.5rem] flex items-center justify-center text-zinc-700 mx-auto relative overflow-hidden group shadow-premium">
            <LayoutGrid size={44} strokeWidth={1} className="group-hover:rotate-90 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-white tracking-tight">Fleet Registry Empty</h3>
            <p className="text-zinc-500 text-base font-medium max-w-sm mx-auto">Your private fleet registry is currently empty. Provision your first autonomous entity in the Protocol Studio.</p>
          </div>
          <Button variant="primary" onClick={() => router.push('/dev')} className="h-14 px-12 rounded-2xl shadow-2xl">Initialize Provisioning</Button>
        </div>
      )}

      {/* Recent Fleet Activity Section */}
      <div className="pt-20 space-y-10">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">Fleet Activity</h2>
            <p className="text-zinc-500 text-sm font-medium">Real-time audit of recent autonomous executions across your fleet.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push('/executions')}
            className="h-10 border-surface-border text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-surface"
          >
            Execution Log
          </Button>
        </div>

        <div className="bg-surface border border-surface-border rounded-[32px] overflow-hidden shadow-premium">
           <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background/50 border-b border-surface-border">
                   <th className="px-8 py-5 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Execution_ID</th>
                   <th className="px-8 py-5 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Agent_Node</th>
                   <th className="px-8 py-5 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Status</th>
                   <th className="px-8 py-5 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Result_Preview</th>
                   <th className="px-8 py-5 text-[10px] font-medium text-zinc-500 uppercase tracking-widest text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                 {recentTasks.length > 0 ? recentTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-surface-hover transition-colors group cursor-pointer" onClick={() => router.push(`/agent/${task.agent_id}`)}>
                       <td className="px-8 py-5 font-mono text-[11px] text-zinc-400 group-hover:text-protocol-cyan transition-colors">{task.id.slice(0, 12)}...</td>
                       <td className="px-8 py-5 text-[11px] font-bold text-zinc-300">{task.agent_id}</td>
                       <td className="px-8 py-5">
                          <div className={cn(
                             "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-medium tracking-wider",
                             task.status === 'completed' || task.status === 'settled' ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                             task.status === 'failed' ? "bg-red-500/10 text-red-500 border border-red-500/20" : 
                             "bg-surface border border-surface-border text-zinc-400"
                          )}>
                             <div className={cn("w-1 h-1 rounded-full", 
                               task.status === 'completed' || task.status === 'settled' ? "bg-green-500" :
                               task.status === 'failed' ? "bg-red-500" : "bg-zinc-500"
                             )} />
                             {task.status}
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <p className="text-[11px] font-mono text-zinc-500 truncate max-w-[200px]">
                             {task.result ? (
                               typeof safeJsonParse(task.result) === 'object' 
                                 ? JSON.stringify(safeJsonParse(task.result))
                                 : task.result
                             ) : "..."}
                          </p>
                       </td>
                       <td className="px-8 py-5 text-right text-[10px] font-mono text-zinc-600">
                          {new Date(task.created_at).toLocaleTimeString()}
                       </td>
                    </tr>
                 )) : (
                    <tr>
                       <td colSpan={5} className="px-8 py-20 text-center text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
                          No autonomous activity recorded in this session.
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
    </div>
  );
}
