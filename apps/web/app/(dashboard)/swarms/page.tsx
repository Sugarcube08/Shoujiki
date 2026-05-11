"use client";

import { useState, useEffect } from 'react';
import { getAgents, getWorkflows, createWorkflow, runWorkflow, getWorkflowRuns } from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Loader2, Activity, Layers, Terminal, Share2, Sparkles, Cpu, GitBranch, Play, History, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert } from '@/components/ui/Alert';
import SwarmFlowBuilder from '@/components/swarms/SwarmFlowBuilder';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetry } from '@/hooks/useTelemetry';

export default function SwarmsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { lastMessage, isConnected } = useTelemetry();

  const fetchData = async () => {
    try {
      const [agentsData, workflowsData, runsData] = await Promise.all([
        getAgents(),
        getWorkflows(),
        getWorkflowRuns()
      ]);
      
      setAgents(agentsData);
      setWorkflows(workflowsData);
      setRuns(runsData);
    } catch (err) {
      console.error("Failed to fetch swarm data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Telemetry real-time updates
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.channel.startsWith('workflow:')) {
      const workflowId = lastMessage.channel.split(':')[1];
      const data = lastMessage.data;
      
      setRuns(currentRuns => {
        const existingRunIndex = currentRuns.findIndex(r => r.workflow_id === workflowId && r.status === 'running');
        if (existingRunIndex >= 0) {
          const newRuns = [...currentRuns];
          newRuns[existingRunIndex] = { ...newRuns[existingRunIndex], ...data };
          return newRuns;
        } else if (data.status === 'running' || data.status === 'completed' || data.status === 'failed') {
          // If we don't have it and it's a valid state, trigger a fast refresh
          fetchData();
        }
        return currentRuns;
      });
    } else if (lastMessage.channel.startsWith('telemetry:runs')) {
      // Global refresh trigger
      fetchData();
    }
  }, [lastMessage]);

  const handleCreate = async (workflowPayload: any) => {
    setCreating(true);
    try {
      const payload = {
        ...workflowPayload,
        id: workflowPayload.name.toLowerCase().replace(/\s+/g, '-'),
      };
      await createWorkflow(payload);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleRun = async (workflowId: string) => {
    setRunningId(workflowId);
    setError('');
    try {
      await runWorkflow(workflowId, { start: true }, 0.1);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to start swarm. Ensure graph integrity.');
    } finally {
      setRunningId(null);
    }
  };

  if (loading && workflows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="relative">
        <Loader2 className="animate-spin text-protocol-cyan" size={32} />
        <div className="absolute inset-0 blur-md bg-protocol-cyan/20 animate-pulse" />
      </div>
      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Synthesizing_Graph_State...</span>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-24 text-left">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 pb-10 border-b border-white/5">
        <div className="space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest">
            <Layers size={10} />
            Architect_Mode_Active
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Protocol <span className="text-protocol-cyan">Architect</span></h1>
          <p className="text-zinc-500 text-sm font-medium max-w-xl">
            Design non-deterministic agent swarms with logic gates, conditional branching, and autonomous routing. Interconnect specialized neural nodes into a unified workflow.
          </p>
        </div>
        <div className="flex items-center gap-6 px-6 border-l border-white/10 hidden md:flex">
          <div>
            <p className="text-[10px] font-black text-zinc-600 uppercase">Registered_Swarms</p>
            <p className="text-xl font-mono font-black text-white tracking-tighter">{workflows.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-600 uppercase">Active_Frontier</p>
            <p className="text-xl font-mono font-black text-protocol-cyan tracking-tighter">{runs.filter(r => r.status === 'running').length}</p>
          </div>
        </div>
      </div>

      {/* Visual Flow Builder */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full relative"
      >
        <div className="absolute -inset-1 bg-gradient-to-br from-protocol-cyan/10 to-cyber-blue/10 blur-xl -z-10 rounded-[32px]" />
        <SwarmFlowBuilder 
          agents={agents} 
          onSave={handleCreate} 
          isLoading={creating} 
        />
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start mt-12">
        <div className="xl:col-span-12 space-y-12">
           <div className="space-y-6">
              <h2 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                 <Share2 size={18} className="text-protocol-cyan" /> Registered_Swarm_Protocols
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {workflows.map((wf, index) => (
                    <motion.div
                      key={wf.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border-white/5 bg-white/[0.02] hover:border-protocol-cyan/30 hover:bg-white/[0.04] transition-all duration-500 group overflow-hidden">
                        <CardHeader className="flex flex-row justify-between items-start pb-4 border-b-0 bg-transparent pt-8 px-8">
                            <div className="space-y-1">
                              <h4 className="text-lg font-black text-white tracking-tighter uppercase italic group-hover:text-protocol-cyan transition-colors">{wf.name}</h4>
                              <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{wf.id}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-zinc-600 group-hover:text-protocol-cyan transition-all">
                              <Layers size={16} />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8 px-8 pb-8">
                            <div className="flex gap-6">
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Nodes</p>
                                <p className="text-lg font-mono font-bold text-zinc-200">{wf.nodes?.length || 0}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Edges</p>
                                <p className="text-lg font-mono font-bold text-zinc-200">{wf.edges?.length || 0}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Type</p>
                                <p className="text-lg font-mono font-bold text-protocol-cyan uppercase italic tracking-tighter">Multi</p>
                              </div>
                            </div>
                            
                            <Button variant="protocol" size="sm" className="w-full h-11 text-[9px]" 
                                onClick={() => handleRun(wf.id)}
                                isLoading={runningId === wf.id}
                                disabled={!!runningId}
                            >
                                <Play size={12} className="fill-current" />
                                Instantiate_Swarm_Sequence
                            </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                 ))}
              </div>
           </div>

           <div className="space-y-6">
              <h2 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                 <Terminal size={18} className="text-zinc-500" /> Neural_Consensus_Logs
              </h2>
              <div className="grid grid-cols-1 gap-4">
                 {runs.map((run, index) => (
                    <motion.div 
                      key={run.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
                    >
                       <div className="flex items-center gap-6">
                          <div className={cn(
                             "w-1 h-12 rounded-full transition-all duration-1000",
                             run.status === 'completed' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' :
                             run.status === 'running' ? 'bg-protocol-cyan animate-pulse shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 'bg-zinc-800'
                          )} />
                          <div>
                             <div className="flex items-center gap-3 mb-1">
                               <h5 className="text-sm font-black text-white uppercase tracking-tighter italic">
                                  {workflows.find(w => w.id === run.workflow_id)?.name || "Task_Chain"}
                               </h5>
                               <span className={cn(
                                  "text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border",
                                  run.status === 'completed' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-protocol-cyan border-protocol-cyan/20 bg-protocol-cyan/5'
                               )}>{run.status}</span>
                             </div>
                             <div className="flex items-center gap-3 font-mono text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                                <span>ID: {run.id.slice(0, 16)}</span>
                                <span className="text-zinc-800">•</span>
                                <span>{new Date(run.created_at).toLocaleTimeString()}</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                             <Cpu size={10} className="text-zinc-600" />
                             <span className="text-[9px] font-mono font-black text-zinc-400 uppercase tracking-widest">{run.active_nodes?.length || 0} Frontier_Active</span>
                          </div>
                          <div className="w-32 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                             <motion.div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-700",
                                  run.status === 'completed' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-protocol-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]"
                                )}
                                initial={{ width: 0 }}
                                animate={{ width: run.status === 'completed' ? '100%' : '33%' }}
                             />
                          </div>
                       </div>
                    </motion.div>
                 ))}
              </div>
           </div>
        </div>
      </div>
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
    </div>
  );
}
