"use client";

import React, { useEffect, useState } from 'react';
import { getTasks } from '@/lib/api';
import { Loader2, Terminal, CheckCircle2, XCircle, Clock, Search, Cpu, Hash, FileJson, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { cn, safeJsonParse } from '@/lib/utils';
import NoSSR from '@/components/ui/NoSSR';
import Link from 'next/link';

export default function ExecutionsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch task history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(t => 
    t.id.toLowerCase().includes(search.toLowerCase()) || 
    t.agent_id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'settled': return <CheckCircle2 size={16} className="text-green-400" />;
      case 'failed': return <XCircle size={16} className="text-red-500" />;
      case 'running': return <Loader2 size={16} className="text-protocol-cyan animate-spin" />;
      default: return <Clock size={16} className="text-zinc-500" />;
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-zinc-600" size={24} />
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Scanning Neural Logs...</span>
    </div>
  );

  return (
    <NoSSR>
      <div className="space-y-10 animate-in fade-in duration-700 pb-24 text-left">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">Execution History</h1>
            <p className="text-zinc-400 text-sm font-medium">Monitor your autonomous task lifecycle and protocol receipts.</p>
          </div>

          <div className="flex-1 w-full md:max-w-md relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-protocol-cyan transition-colors" />
            <input 
              type="text" 
              placeholder="Filter by Task ID or Agent ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl h-11 pl-12 pr-6 text-xs font-medium text-zinc-200 focus:outline-none focus:border-protocol-cyan/30 transition-all shadow-glass-inner"
            />
          </div>
        </div>

        {/* Task Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.length > 0 ? filteredTasks.map((task) => (
            <Card key={task.id} className="border-zinc-800/60 bg-[#0c0c0e] hover:border-zinc-700 transition-all">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Left: Metadata */}
                  <div className="p-6 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-zinc-900/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-[0.2em]",
                          task.status === 'completed' || task.status === 'settled' ? "text-green-500" :
                          task.status === 'failed' ? "text-red-500" : "text-zinc-500"
                        )}>
                          {task.status}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600 font-bold">{new Date(task.created_at).toLocaleString()}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Task ID</p>
                        <p className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                          <Hash size={12} className="text-zinc-700" />
                          {task.id}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Executor Node</p>
                        <Link href={`/agent/${task.agent_id}`} className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors">
                          <Cpu size={12} className="text-blue-900" />
                          {task.agent_id}
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Right: Results / Receipt */}
                  <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                           <Terminal size={14} className="text-zinc-700" />
                           Input_Context
                         </h4>
                      </div>
                      <div className="bg-black/60 rounded-xl p-4 border border-zinc-900 font-mono text-[11px] text-zinc-500 max-h-[100px] overflow-y-auto custom-scrollbar">
                        {task.input_data ? (
                          <pre className="whitespace-pre-wrap break-all">
                            {typeof safeJsonParse(task.input_data) === 'object' 
                              ? JSON.stringify(safeJsonParse(task.input_data), null, 2)
                              : task.input_data}
                          </pre>
                        ) : (
                          <span className="italic opacity-50">No input payload recorded.</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                           <FileJson size={14} className="text-zinc-700" />
                           Output_Result
                         </h4>
                         {task.poae_hash && (
                           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-protocol-cyan/10 border border-protocol-cyan/20">
                             <ShieldCheck size={10} className="text-blue-400" />
                             <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Protocol_Verified</span>
                           </div>
                         )}
                      </div>
                      
                      <div className="bg-black/60 rounded-xl p-4 border border-zinc-900 font-mono text-[11px] text-zinc-400 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {task.result ? (
                          <pre className="whitespace-pre-wrap break-all">
                            {typeof safeJsonParse(task.result) === 'object' 
                              ? JSON.stringify(safeJsonParse(task.result), null, 2)
                              : task.result}
                          </pre>
                        ) : (
                          <span className="italic opacity-50">{task.status === 'failed' ? 'Task execution faulted. No result payload.' : 'Awaiting computation results...'}</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-900/50 flex flex-wrap gap-6">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-zinc-600 uppercase">Input Tokens</p>
                        <p className="text-xs font-mono font-bold text-zinc-300">{task.input_tokens || 0}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-zinc-600 uppercase">Output Tokens</p>
                        <p className="text-xs font-mono font-bold text-zinc-300">{task.output_tokens || 0}</p>
                      </div>
                      <div className="flex-1 text-right">
                         <div className="inline-flex flex-col items-end">
                            <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Receipt_Hash</p>
                            <p className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]">{task.poae_hash || "Awaiting Verification..."}</p>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="py-20 text-center bg-zinc-900/10 border border-dashed border-zinc-900 rounded-3xl">
              <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">No protocol tasks found in your history.</p>
            </div>
          )}
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      </div>
    </NoSSR>
  );
}
