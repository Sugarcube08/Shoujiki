"use client";

import React, { useEffect, useState } from 'react';
import { getTasks } from '@/lib/api';
import { Loader2, Search, ShieldCheck, AlertCircle, FileCode2, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ProofExplorerPage() {
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
      setError("Failed to fetch execution records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000); // Auto-refresh
    return () => clearInterval(interval);
  }, []);

  const filteredTasks = tasks.filter(t => 
    t.id.includes(search) || 
    t.agent_id.includes(search) ||
    (t.poae_hash && t.poae_hash.includes(search))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-zinc-900">
        <div className="space-y-1.5">
           <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Proof Explorer</h1>
           <p className="text-zinc-400 text-sm font-medium leading-relaxed">
            Audit deterministic execution receipts and settlement traces.
          </p>
        </div>
        <div className="w-full md:w-72 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input 
             placeholder="Search by Task ID or Hash..." 
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="pl-10 h-11 bg-[#0c0c0e] border-zinc-800 text-xs"
          />
        </div>
      </div>

      <Card className="border-zinc-800/60 bg-[#0c0c0e] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/40 border-b border-zinc-800/60">
                <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Task ID</th>
                <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Agent Node</th>
                <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Execution Receipt (Hash:Signature)</th>
                <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-zinc-600 mx-auto" size={24} />
                  </td>
                </tr>
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-zinc-300">
                      {task.id.slice(0, 16)}...
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/agent/${task.agent_id}`} className="text-xs font-mono text-blue-400 hover:underline">
                        {task.agent_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest border",
                        task.status === 'settled' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        task.status === 'verifying' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                        task.status === 'disputed' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        task.status === 'sequencing' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                        "bg-zinc-800/50 text-zinc-400 border-zinc-700/50"
                      )}>
                        {task.status === 'settled' && <CheckCircle2 size={10} />}
                        {task.status === 'verifying' && <ShieldCheck size={10} />}
                        {task.status === 'disputed' && <AlertCircle size={10} />}
                        {task.status === 'sequencing' && <Clock size={10} />}
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {task.poae_hash ? (
                        <div className="flex items-center gap-2">
                          <FileCode2 size={14} className="text-zinc-600" />
                          <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]" title={task.poae_hash}>
                            {task.poae_hash}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-mono">Awaiting Execution</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {task.settlement_signature ? (
                        <a 
                          href={`https://explorer.solana.com/tx/${task.settlement_signature}?cluster=devnet`}
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] font-mono text-blue-500 hover:text-blue-400 transition-colors"
                        >
                          {task.settlement_signature.slice(0, 16)}...
                        </a>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-mono">Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
                    No execution receipts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
    </div>
  );
}
