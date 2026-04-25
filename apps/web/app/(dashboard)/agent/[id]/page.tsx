"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgent, runAgent, getConfig } from '@/lib/api';
import { createEscrowTransaction, confirmTx, setPlatformWallet, PLATFORM_WALLET } from '@/lib/solana';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { 
  Loader2, ArrowLeft, Play, ShieldCheck, Terminal, 
  AlertCircle, CreditCard, BadgeCheck, Cpu, 
  Settings, Activity, Lock, CheckCircle2, Zap,
  ChevronRight, Fingerprint
} from 'lucide-react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import bs58 from 'bs58';

export default function AgentRunPage() {
  const { id } = useParams();
  const router = useRouter();
  const { connection } = useConnection();
  const { sendTransaction, signMessage } = useWallet();
  const { isAuthenticated, login, connected, publicKey } = useWalletAuth();

  const [agent, setAgent] = useState<any>(null);
  const [inputData, setInputData] = useState('{"text": "Hello world"}');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'paying' | 'verifying' | 'signing' | 'executing' | 'done'>('idle');
  const [paymentType, setPaymentType] = useState<'escrow' | 'solana_pay'>('solana_pay');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      getAgent(id as string),
      getConfig()
    ]).then(([agentData, config]) => {
      setAgent(agentData);
      if (config.platform_wallet) {
        setPlatformWallet(config.platform_wallet);
      }
    })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRun = async () => {
    if (!publicKey || !connected || !isAuthenticated || !signMessage) return;

    setError('');
    setResult(null);
    setLogs([]);
    try {
      const taskId = crypto.randomUUID();
      let referenceBase58 = '';
      let txSignature = '';

      // 1. Payment Stage
      if (paymentType === 'solana_pay') {
        setStatus('paying');
        addLog(`Initializing direct payment for ${agent.price} SOL...`);
        const reference = Keypair.generate().publicKey;
        referenceBase58 = reference.toBase58();

        const { SystemProgram, Transaction } = await import('@solana/web3.js');
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(PLATFORM_WALLET),
            lamports: agent.price * 1e9,
          })
        );
        tx.instructions[0].keys.push({ pubkey: reference, isSigner: false, isWritable: false });

        txSignature = await sendTransaction(tx, connection);
        addLog(`Transaction broadcast: ${txSignature.slice(0, 16)}...`);

        setStatus('verifying');
        addLog("Waiting for network confirmation (finality)...");
        await confirmTx(connection, txSignature);
        addLog("Payment confirmed on Devnet.");
      } else {
        setStatus('paying');
        addLog(`Deriving Escrow PDA for Task ${taskId.slice(0, 8)}...`);
        const { tx, reference } = await createEscrowTransaction(
          publicKey,
          new PublicKey(agent.creator_wallet),
          taskId,
          agent.price
        );
        referenceBase58 = reference.toBase58();
        txSignature = await sendTransaction(tx, connection);
        addLog(`Escrow initialized: ${txSignature.slice(0, 16)}...`);

        setStatus('verifying');
        addLog("Waiting for vault verification...");
        await confirmTx(connection, txSignature);
        addLog("Vault locked successfully.");
      }

      // 2. x402 Protocol Signature Stage
      setStatus('signing');
      addLog("Preparing x402 SVM Authorization payload...");
      
      const runBody = {
        agent_id: agent.id,
        input_data: JSON.parse(inputData),
        task_id: taskId,
        reference: referenceBase58,
        payment_type: paymentType,
        signature: txSignature
      };
      
      const payloadBytes = new TextEncoder().encode(JSON.stringify(runBody));
      addLog("Waiting for biometric signature (signMessage)...");
      const x402SigBytes = await signMessage(payloadBytes);
      const x402SigBase64 = Buffer.from(x402SigBytes).toString('base64');
      addLog("x402 protocol signature generated.");

      // 3. Execution Stage
      setStatus('executing');
      addLog("Handing off to Swarm Runtime...");

      await runAgent(
        agent.id,
        runBody.input_data,
        taskId,
        referenceBase58,
        paymentType,
        "", // legacy signature param
        publicKey.toBase58(),
        txSignature,
        x402SigBase64,
        publicKey.toBase58()
      );

      // Start WebSocket for real-time updates
      const wsUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws')}/ws/tasks/${taskId}`;
      addLog(`Listening on secure execution channel: task_${taskId.slice(0,8)}`);
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.status === 'running') {
          addLog("Sandbox active. Executing agent neural cycles...");
        } else if (data.status === 'completed' || data.status === 'failed') {
          setResult(data.result || data.error);
          setStatus('done');
          if (data.status === 'failed') {
            setError(data.error || data.result || 'Execution failed');
            addLog("!! FATAL: Execution aborted due to internal agent error.");
          } else {
            addLog("SUCCESS: Execution finalized. Proof anchored to Solana.");
          }
          ws.close();
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        setError('Real-time connection failed. Falling back to polling.');
        setStatus('done');
      };

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Execution failed');
      setStatus('idle');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.1)]" />
      <div className="text-center space-y-2">
         <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Syncing_Neural_State</p>
         <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Connection: Encrypted</p>
      </div>
    </div>
  );

  if (!agent) return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
        <AlertCircle size={32} />
      </div>
      <p className="text-zinc-400 font-black uppercase tracking-widest text-xs">Agent_Not_Found_In_Registry</p>
      <Button onClick={() => router.push('/marketplace')} className="rounded-xl px-8 h-12">Return to Marketplace</Button>
    </div>
  );

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-1000">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-3 text-zinc-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.2em] bg-zinc-900/50 px-5 py-3 rounded-2xl border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 shadow-lg"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          TERMINAL_CLOSE
        </button>
        
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-inner">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
             <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Protocol_Active</span>
           </div>
           <div className="hidden md:flex flex-col items-end">
              <p className="text-[9px] font-black text-zinc-600 uppercase leading-none">Security_Level</p>
              <p className="text-[10px] font-black text-blue-500 uppercase mt-1 tracking-tighter">Tier_3_Isolated</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Module A: Agent Identity & Passport */}
        <div className="xl:col-span-4 space-y-8">
          <Card className="border-zinc-800 bg-zinc-950 rounded-[40px] overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Cpu size={120} className="text-blue-500" />
            </div>
            
            <CardHeader className="p-10 pb-6 border-b border-zinc-900 relative z-10">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] border-t border-white/20">
                  <Bot size={32} className="text-white" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-black text-white tracking-tighter leading-none">{agent.name}</h1>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">{agent.id}</span>
                     <div className="w-1 h-1 rounded-full bg-zinc-800" />
                     <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">v1.0.0</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                {agent.description || "High-frequency autonomous execution agent with native SVM bridge support."}
              </p>
            </CardHeader>

            <CardContent className="p-10 pt-8 space-y-10 relative z-10">
               {/* Metrics Grid */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl shadow-inner group/stat hover:border-blue-500/30 transition-colors">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2 group-hover/stat:text-blue-500/80 transition-colors">Cost_Per_Run</p>
                    <p className="text-2xl font-black text-white">{agent.price} <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">SOL</span></p>
                  </div>
                  <div className="p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl shadow-inner group/stat hover:border-green-500/30 transition-colors">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2 group-hover/stat:text-green-500/80 transition-colors">Reputation</p>
                    <p className="text-2xl font-black text-white">{agent.reputation_score?.toFixed(0) || "100"}</p>
                  </div>
               </div>

               {/* Payment Selection */}
               <div className="space-y-5">
                  <div className="flex items-center justify-between px-2">
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Payment_Gate</p>
                     <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-tighter font-mono">ID: 0x9f...a1</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPaymentType('solana_pay')}
                      className={cn(
                        "flex flex-col items-center gap-4 p-5 rounded-[24px] border-2 transition-all relative overflow-hidden group",
                        paymentType === 'solana_pay'
                          ? 'border-blue-600 bg-blue-600/5 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                          : 'border-zinc-900 bg-zinc-900/20 text-zinc-600 hover:border-zinc-800 hover:bg-zinc-900/40'
                      )}
                    >
                      <Zap size={22} className={paymentType === 'solana_pay' ? "text-blue-400 fill-current" : "text-zinc-800"} />
                      <div className="text-center">
                         <span className="text-[11px] font-black uppercase tracking-tight block">Direct_Pay</span>
                         <span className="text-[9px] font-bold uppercase tracking-tighter opacity-50">Instant_Clear</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setPaymentType('escrow')}
                      className={cn(
                        "flex flex-col items-center gap-4 p-5 rounded-[24px] border-2 transition-all relative overflow-hidden group",
                        paymentType === 'escrow'
                          ? 'border-purple-600 bg-purple-600/5 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.1)]'
                          : 'border-zinc-900 bg-zinc-900/20 text-zinc-600 hover:border-zinc-800 hover:bg-zinc-900/40'
                      )}
                    >
                      <Lock size={22} className={paymentType === 'escrow' ? "text-purple-400 fill-current" : "text-zinc-800"} />
                      <div className="text-center">
                         <span className="text-[11px] font-black uppercase tracking-tight block">Squads_Vault</span>
                         <span className="text-[9px] font-bold uppercase tracking-tighter opacity-50">Escrow_As_Proof</span>
                      </div>
                    </button>
                  </div>
               </div>

               {/* Integrity Check */}
               <div className="pt-6 border-t border-zinc-900 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Verification_Stamp</p>
                    <div className="flex gap-1">
                       <BadgeCheck size={14} className="text-blue-500" />
                       <ShieldCheck size={14} className="text-green-500" />
                    </div>
                  </div>
                  <div className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-3xl flex items-center gap-5 hover:bg-zinc-900/50 transition-colors cursor-help group/p">
                     <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-inner group-hover/p:border-blue-500/30 transition-colors">
                        <Activity size={20} className="text-zinc-700 group-hover/p:text-blue-400 transition-colors" />
                     </div>
                     <div className="flex-1 overflow-hidden">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 leading-none">Mint_Authority</p>
                        <p className="text-[11px] font-mono text-zinc-400 truncate tracking-tighter">
                           {agent.mint_address || "MINT_CONFIRMATION_PENDING..."}
                        </p>
                     </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Module B: Command Hub */}
        <div className="xl:col-span-8 space-y-10">
           <Card className="border-zinc-800 bg-zinc-950 rounded-[40px] overflow-hidden flex flex-col min-h-[650px] shadow-2xl relative">
              {/* Card Decoration */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
              
              <CardHeader className="bg-zinc-900/30 p-8 border-b border-zinc-900 flex flex-row items-center justify-between px-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-inner">
                    <Terminal size={20} className="text-blue-500" />
                  </div>
                  <div>
                     <h3 className="font-black text-white uppercase tracking-[0.3em] text-sm leading-none">Command_Terminal</h3>
                     <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1.5">Direct_Pipeline_Access</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-inner">
                     <Cpu size={16} className="text-blue-500/50" />
                     <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Hardened_Runtime_v3</span>
                   </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 flex flex-col md:flex-row">
                 {/* Logic Input */}
                 <div className="flex-1 p-10 space-y-8 border-b md:border-b-0 md:border-r border-zinc-900">
                    <div className="space-y-5 h-full flex flex-col">
                       <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mx-1">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                             <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Input_Parameters</p>
                          </div>
                          <span className="text-[9px] font-black text-zinc-700 uppercase">Type: JSON_Blob</span>
                       </div>
                       
                       <textarea 
                          className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-[32px] p-8 text-sm font-mono text-blue-400/80 outline-none focus:border-blue-600/30 transition-all resize-none shadow-inner custom-scrollbar leading-relaxed"
                          value={inputData}
                          onChange={(e) => setInputData(e.target.value)}
                          placeholder='{"action": "execute", "params": {...}}'
                       />
                       
                       {error && (
                         <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl text-red-500 text-xs font-bold flex gap-4 items-center animate-in shake duration-500">
                           <div className="p-2 bg-red-500/10 rounded-lg"><AlertCircle size={18} /></div>
                           <div className="flex-1">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">Execution_Fault</p>
                              <p className="font-mono opacity-80">{error}</p>
                           </div>
                         </div>
                       )}

                       <div className="pt-4">
                          <Button 
                            className={cn(
                               "w-full h-20 rounded-[28px] text-xl font-black tracking-tight gap-4 transition-all border-t border-white/20 active:scale-95 group overflow-hidden relative",
                               status === 'idle' || status === 'done' ? "bg-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.2)] hover:bg-blue-500" : "bg-zinc-800"
                            )}
                            onClick={handleRun}
                            disabled={!connected || !isAuthenticated || (status !== 'idle' && status !== 'done')}
                            isLoading={status !== 'idle' && status !== 'done'}
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                             {status === 'paying' ? <><CreditCard className="animate-pulse" /> BROADCASTING_FUNDS</> :
                              status === 'verifying' ? <><Activity className="animate-spin" /> CONFIRMING_ONCHAIN</> :
                               status === 'signing' ? <><Fingerprint className="animate-pulse" /> SVM_AUTHORIZATION</> :
                                status === 'executing' ? <><Settings className="animate-spin-slow" /> RUNTIME_ACTIVE</> :
                                <><Play size={24} fill="currentColor" className="ml-1" /> INITIALIZE_AGENT</>}
                          </Button>
                          
                          {!connected && (
                             <div className="flex items-center justify-center gap-2 mt-6">
                                <Lock size={12} className="text-zinc-700" />
                                <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.25em]">Session_Auth_Required</p>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>

                 {/* Console Stream */}
                 <div className="w-full md:w-[48%] bg-zinc-950/40 p-10 flex flex-col relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                       <Activity size={80} className="text-blue-500" />
                    </div>
                    
                    <div className="space-y-6 h-full flex flex-col relative z-10">
                       <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mx-1">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                             <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Execution_Trace</p>
                          </div>
                          <Activity size={14} className="text-zinc-800" />
                       </div>
                       
                       <div className="flex-1 bg-black/60 border border-zinc-900 rounded-[32px] p-8 overflow-hidden flex flex-col relative group/console shadow-inner">
                          {logs.length === 0 && !result ? (
                             <div className="flex flex-col items-center justify-center h-full text-center space-y-5 opacity-20 grayscale transition-all group-hover/console:opacity-30">
                                <div className="p-4 bg-zinc-900 rounded-3xl border border-zinc-800">
                                   <Settings size={32} className="text-zinc-500 animate-spin-slow" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] ml-1">Idle_State</p>
                             </div>
                          ) : (
                             <div className="flex-1 overflow-y-auto space-y-4 font-mono text-[11px] custom-scrollbar pb-16">
                                {logs.map((log, i) => (
                                   <div key={i} className="text-zinc-400 break-words leading-relaxed animate-in slide-in-from-left-2 duration-300">
                                      <span className="text-blue-500/40 font-bold mr-3 inline-block w-4">#</span>
                                      {log}
                                   </div>
                                ))}
                                
                                {status === 'executing' && (
                                   <div className="flex items-center gap-3 text-blue-500 animate-pulse font-bold tracking-tighter pl-1">
                                      <Loader2 size={12} className="animate-spin" />
                                      <span className="text-[10px] uppercase">Processing_Neural_Weights...</span>
                                   </div>
                                )}

                                {result && (
                                   <div className="mt-10 pt-8 border-t border-zinc-800/80 space-y-5 animate-in slide-in-from-bottom-5 duration-700">
                                      <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-2xl w-fit">
                                         <CheckCircle2 size={14} className="text-green-500" />
                                         <span className="text-[10px] font-black uppercase text-green-400 tracking-widest leading-none">Output_Verified_Onchain</span>
                                      </div>
                                      <div className="relative group/res">
                                         <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-green-500/10 rounded-[28px] blur opacity-0 group-hover/res:opacity-100 transition-opacity" />
                                         <pre className="relative p-6 bg-zinc-900/80 rounded-[24px] border border-zinc-800 text-green-400 font-mono text-xs whitespace-pre-wrap break-all leading-relaxed shadow-2xl">
                                            {JSON.stringify(result, null, 2)}
                                         </pre>
                                      </div>
                                      <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                         <div className="flex items-center gap-3 text-blue-500/60 mb-1">
                                            <BadgeCheck size={14} />
                                            <p className="text-[9px] font-black uppercase tracking-widest">Protocol_Anchor</p>
                                         </div>
                                         <p className="text-[10px] font-mono text-zinc-600 truncate italic">SHA-256: {bs58.encode(new TextEncoder().encode(JSON.stringify(result))).slice(0, 44)}</p>
                                      </div>
                                   </div>
                                )}
                             </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

import { Bot } from 'lucide-react';
