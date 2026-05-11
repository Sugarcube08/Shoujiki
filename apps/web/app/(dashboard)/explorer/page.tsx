"use client";

import React, { useEffect, useState } from 'react';
import { getTasks, getConfig } from '@/lib/api';
import { Loader2, Search, ShieldCheck, AlertCircle, FileCode2, Clock, CheckCircle2, ShieldAlert, Cpu, Terminal as TerminalIcon } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetry } from '@/hooks/useTelemetry';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export default function ProofExplorerPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [platformKey, setPlatformKey] = useState('');
  const { lastMessage } = useTelemetry();
  
  // Verification Modal State
  const [verifyingTask, setVerifyingTask] = useState<any | null>(null);
  const [verifyLogs, setVerifyLogs] = useState<string[]>([]);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');

  const fetchInitialData = async () => {
    try {
      const [tasksData, configData] = await Promise.all([
        getTasks(),
        getConfig()
      ]);
      setTasks(tasksData);
      setPlatformKey(configData.platform_wallet);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch execution records or platform configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Telemetry updates
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.channel.startsWith('task:')) {
      const taskId = lastMessage.channel.split(':')[1];
      const data = lastMessage.data;
      setTasks(current => {
        const index = current.findIndex(t => t.id === taskId);
        if (index >= 0) {
          const newTasks = [...current];
          newTasks[index] = { ...newTasks[index], ...data };
          return newTasks;
        } else {
          // New task, trigger refresh
          fetchInitialData();
          return current;
        }
      });
    }
  }, [lastMessage]);

  const filteredTasks = tasks.filter(t => 
    t.id.includes(search) || 
    t.agent_id.includes(search) ||
    (t.poae_hash && t.poae_hash.includes(search))
  );

  const startVerification = async (task: any) => {
    setVerifyingTask(task);
    setVerifyLogs([]);
    setVerifyStatus('running');
    
    const addLog = (msg: string) => {
      setVerifyLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].slice(0,-1)}] ${msg}`]);
    };

    try {
      addLog(`INIT: Cryptographic Attestation Protocol`);
      await new Promise(r => setTimeout(r, 600));
      
      if (!task.poae_hash || !task.poae_hash.includes(':')) {
        throw new Error("Invalid or missing execution receipt structure (hash:signature).");
      }
      
      const [hash, sigB58] = task.poae_hash.split(':');
      addLog(`EXTRACTED HASH: ${hash}`);
      addLog(`EXTRACTED SIG: ${sigB58.slice(0, 16)}...`);
      await new Promise(r => setTimeout(r, 600));

      addLog(`FETCHING ENCLAVE PUBKEY: ${platformKey}`);
      await new Promise(r => setTimeout(r, 400));
      
      addLog(`DECODING Ed25519 COMPONENTS...`);
      const message = new TextEncoder().encode(hash);
      const signature = bs58.decode(sigB58);
      const pubKey = bs58.decode(platformKey);
      await new Promise(r => setTimeout(r, 800));

      addLog(`EXECUTING nacl.sign.detached.verify...`);
      const isValid = nacl.sign.detached.verify(message, signature, pubKey);
      
      await new Promise(r => setTimeout(r, 1000));

      if (isValid) {
        addLog(`>> VALIDATION SUCCESS: Integrity Confirmed.`);
        setVerifyStatus('success');
      } else {
        throw new Error("Signature mismatch! Data may have been tampered with.");
      }
      
    } catch (err: any) {
      addLog(`>> CRITICAL FAULT: ${err.message}`);
      setVerifyStatus('failed');
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-24 text-left">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 pb-10 border-b border-white/5">
        <div className="space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-protocol-violet text-[9px] font-black uppercase tracking-widest">
            <ShieldCheck size={10} />
            Cryptographic_Audit_Mode
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Proof <span className="text-protocol-cyan">Explorer</span></h1>
          <p className="text-zinc-500 text-sm font-medium max-w-xl">
            Audit deterministic execution receipts from the TEE Enclaves. Verify ed25519 signatures client-side to ensure zero tampering.
          </p>
        </div>
        <div className="w-full lg:w-96 relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-protocol-cyan transition-colors" />
          <input 
             placeholder="Search Execution Hash or Task ID..." 
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl h-14 pl-12 pr-6 text-sm font-medium text-white focus:outline-none focus:border-protocol-cyan/30 focus:ring-1 focus:ring-protocol-cyan/20 transition-all shadow-glass-inner"
          />
        </div>
      </div>

      <Card className="border-white/5 bg-white/[0.02] shadow-2xl overflow-hidden rounded-[32px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-black/40 border-b border-white/5">
                <th className="px-8 py-5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Task_Identity</th>
                <th className="px-8 py-5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Agent_Node</th>
                <th className="px-8 py-5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">TEE_Attestation_Payload</th>
                <th className="px-8 py-5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Audit_Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <Loader2 className="animate-spin text-protocol-cyan mx-auto" size={32} />
                  </td>
                </tr>
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-5 text-xs font-mono font-medium text-zinc-300">
                      {task.id.slice(0, 16)}...
                    </td>
                    <td className="px-8 py-5">
                      <Link href={`/agent/${task.agent_id}`} className="text-xs font-mono font-bold text-protocol-cyan hover:text-white transition-colors">
                        {task.agent_id.slice(0, 12)}...
                      </Link>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border",
                        task.status === 'completed' ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]" :
                        task.status === 'running' ? "bg-protocol-cyan/10 text-protocol-cyan border-protocol-cyan/20 animate-pulse shadow-[0_0_10px_rgba(0,243,255,0.2)]" :
                        task.status === 'failed' ? "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]" :
                        "bg-white/5 text-zinc-400 border-white/10"
                      )}>
                        {task.status === 'completed' && <CheckCircle2 size={10} />}
                        {task.status === 'running' && <Cpu size={10} />}
                        {task.status === 'failed' && <ShieldAlert size={10} />}
                        {task.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {task.poae_hash ? (
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-protocol-violet">
                            <FileCode2 size={12} />
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]" title={task.poae_hash}>
                            {task.poae_hash}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-mono italic">Awaiting Telemetry...</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {task.poae_hash ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => startVerification(task)}
                          className="h-8 text-[9px] border-purple-500/30 text-protocol-violet hover:bg-purple-500 hover:text-black hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:border-purple-500"
                        >
                          Verify_Integrity
                        </Button>
                      ) : (
                         <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                    No execution receipts found matching criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Verification Modal */}
      <AnimatePresence>
        {verifyingTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => verifyStatus !== 'running' && setVerifyingTask(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#050505] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TerminalIcon size={16} className="text-protocol-cyan" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">Cryptographic_Audit_Terminal</span>
                </div>
                {verifyStatus !== 'running' && (
                  <button onClick={() => setVerifyingTask(null)} className="text-zinc-500 hover:text-white transition-colors">
                    <span className="text-[10px] font-black uppercase">Close [ESC]</span>
                  </button>
                )}
              </div>
              <div className="p-6 h-80 overflow-y-auto font-mono text-[11px] leading-relaxed custom-scrollbar">
                {verifyLogs.map((log, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "mb-2",
                      log.includes('SUCCESS') ? "text-green-400 font-bold" :
                      log.includes('FAULT') || log.includes('mismatch') ? "text-red-400 font-bold" :
                      log.includes('>>') ? "text-protocol-cyan" : "text-zinc-400"
                    )}
                  >
                    {log}
                  </motion.div>
                ))}
                {verifyStatus === 'running' && (
                  <motion.div 
                    animate={{ opacity: [1, 0, 1] }} 
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-4 bg-protocol-cyan inline-block align-middle ml-1"
                  />
                )}
              </div>
              {verifyStatus === 'success' && (
                <div className="p-4 bg-green-500/10 border-t border-green-500/20 text-center animate-in slide-in-from-bottom-4">
                  <span className="text-green-400 font-black text-sm uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                    Integrity Verified
                  </span>
                </div>
              )}
              {verifyStatus === 'failed' && (
                <div className="p-4 bg-red-500/10 border-t border-red-500/20 text-center animate-in slide-in-from-bottom-4">
                  <span className="text-red-400 font-black text-sm uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    Verification Failed
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
    </div>
  );
}
