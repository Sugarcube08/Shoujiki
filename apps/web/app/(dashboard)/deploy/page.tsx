"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { deployAgent } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { 
  Rocket, 
  AlertCircle, 
  FileCode, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft, 
  ShieldCheck, 
  Zap, 
  Bot, 
  Lock,
  ArrowRight,
  Cpu,
  Activity
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

export default function DeploySpacePage() {
  const router = useRouter();
  const { isAuthenticated, connected, login } = useWalletAuth();
  
  const [draft, setDraft] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'validating' | 'minting' | 'done'>('idle');
  const [error, setError] = useState('');
  const [deployedAgent, setDeployedAgent] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shoujiki_draft');
      if (saved) {
        setDraft(JSON.parse(saved));
      } else {
        router.push('/dev');
      }
    }
  }, [router]);

  const handleConfirmDeploy = async () => {
    if (!draft || !isAuthenticated) return;
    
    setError('');
    setStatus('validating');
    
    try {
      const res = await deployAgent(draft);
      
      setStatus('minting');
      setDeployedAgent(res);
      localStorage.removeItem('shoujiki_draft');
      
      setTimeout(() => {
        setStatus('done');
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Deployment failed');
      setStatus('idle');
    }
  };

  if (!draft) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="animate-spin text-blue-500" size={32} />
      <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Accessing Draft_Data...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push('/dev')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all font-black text-xs uppercase tracking-widest bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800 hover:border-zinc-700"
        >
          <ArrowLeft size={14} />
          Terminal_Return
        </button>

        <div className="flex items-center gap-3">
           <div className="px-3 py-1 bg-blue-500/5 border border-blue-500/10 rounded-lg flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
             <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest">Protocol_Ready</span>
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <Rocket size={12} />
            Mission Control
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase">
            Launch <span className="text-zinc-500 italic">Sequence</span>
          </h1>
          <p className="text-zinc-400 font-medium max-w-xl">
            Review your agent package and initialize the on-chain minting protocol.
          </p>
        </div>
      </div>

      {status === 'done' ? (
        <Card className="bg-green-500/5 border-green-500/20 rounded-[40px] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <CheckCircle2 size={200} className="text-green-500" />
          </div>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-8 relative z-10">
            <div className="w-24 h-24 bg-green-500/10 border border-green-500/20 rounded-[32px] flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.1)]">
               <CheckCircle2 size={48} className="text-green-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Agent_Deployed</h2>
              <p className="text-zinc-500 font-medium">Your autonomous entity is now live on the Shoujiki Network.</p>
            </div>
            
            <div className="w-full max-w-lg p-6 bg-zinc-950 border border-zinc-800 rounded-[24px] space-y-4 shadow-inner">
               <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Metadata_Confirmed</p>
                  <ShieldCheck size={14} className="text-blue-500" />
               </div>
               <div className="space-y-1">
                 <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter block mb-1">Solana Mint Address:</span>
                 <p className="text-xs font-mono text-zinc-300 break-all bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                   {deployedAgent?.mint_address || '0x7a...f2 (Network Confirmed)'}
                 </p>
               </div>
            </div>

            <div className="flex gap-4 w-full max-w-lg">
               <Button onClick={() => router.push('/my-agents')} className="flex-1 h-14 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 font-black tracking-tight uppercase shadow-xl">
                 GO TO MY TERMINAL
               </Button>
               <Button variant="outline" onClick={() => router.push('/marketplace')} className="flex-1 h-14 rounded-2xl border-zinc-800 bg-zinc-900/50 font-black tracking-tight uppercase">
                 MARKETPLACE
               </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-8">
            <Card className="border-zinc-800 bg-zinc-950 rounded-[32px] overflow-hidden">
              <CardHeader className="bg-zinc-900/30 p-8 border-b border-zinc-900">
                <h3 className="font-black text-white uppercase tracking-widest flex items-center gap-3">
                  <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <FileCode size={18} className="text-blue-500" />
                  </div>
                  Package_Manifest
                </h3>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-6">
                   <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800 text-zinc-700">
                      <Bot size={40} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-xl font-black text-white leading-none tracking-tight">{draft.name}</p>
                      <p className="text-xs font-mono text-zinc-500 uppercase">{draft.id}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Runtime Price</p>
                    <p className="text-lg font-black text-purple-400">{draft.price} <span className="text-[10px]">SOL</span></p>
                  </div>
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Files</p>
                    <p className="text-lg font-black text-white">{Object.keys(draft.files).length} <span className="text-[10px] text-zinc-600 uppercase ml-1">Assets</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entrypoint_Security</p>
                      <span className="text-[9px] font-mono text-blue-500 font-black px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">{draft.entrypoint}</span>
                   </div>
                   <div className="flex flex-wrap gap-2 pt-2">
                    {Object.keys(draft.files).map(f => (
                      <span key={f} className="text-[10px] font-black uppercase bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-1.5 rounded-xl transition-all hover:text-zinc-300">
                        {f}
                      </span>
                    ))}
                   </div>
                </div>
              </CardContent>
              <div className="p-8 bg-zinc-900/30 border-t border-zinc-900">
                 <div className="flex items-center gap-4 text-zinc-500">
                    <Lock size={16} className="text-blue-500/50" />
                    <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tight">Source code will be hashed and anchored to the Metaplex Core asset metadata.</p>
                 </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <Card className="h-full flex flex-col border-zinc-800 bg-zinc-950 rounded-[32px] overflow-hidden shadow-2xl">
              <CardHeader className="bg-zinc-900/30 p-8 border-b border-zinc-900">
                <h3 className="font-black text-white uppercase tracking-widest flex items-center gap-3">
                   <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <Activity size={18} className="text-purple-500" />
                  </div>
                  System_Status
                </h3>
              </CardHeader>
              <CardContent className="flex-1 p-8 space-y-10">
                <div className="space-y-10 relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[23px] top-4 bottom-4 w-px bg-zinc-800" />
                  
                  {/* Step 1 */}
                  <div className="relative flex gap-6 items-start">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-zinc-950 z-10 transition-all duration-500 shadow-xl",
                      status === 'validating' ? 'bg-blue-600 scale-110' : status !== 'idle' ? 'bg-green-600' : 'bg-zinc-800'
                    )}>
                      {status === 'validating' ? <Loader2 size={18} className="animate-spin text-white" /> : <CheckCircle2 size={18} className="text-white" />}
                    </div>
                    <div className={cn(
                      "flex-1 p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl transition-all duration-500",
                      status === 'validating' ? 'border-blue-500/50 bg-blue-500/5 translate-x-2' : ''
                    )}>
                      <h4 className="font-black text-sm uppercase tracking-wider text-white">01. AST Analysis</h4>
                      <p className="text-xs text-zinc-500 font-medium mt-1">Verifying multi-file structure and forbidden calls.</p>
                    </div>
                  </div>
                  
                  {/* Step 2 */}
                  <div className="relative flex gap-6 items-start">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-zinc-950 z-10 transition-all duration-500 shadow-xl",
                      status === 'minting' ? 'bg-purple-600 scale-110' : 'bg-zinc-800'
                    )}>
                       {status === 'minting' ? <Loader2 size={18} className="animate-spin text-white" /> : <Rocket size={18} className="text-white" />}
                    </div>
                    <div className={cn(
                      "flex-1 p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl transition-all duration-500",
                      status === 'minting' ? 'border-purple-500/50 bg-purple-500/5 translate-x-2' : ''
                    )}>
                      <h4 className="font-black text-sm uppercase tracking-wider text-white">02. Metaplex Minting</h4>
                      <p className="text-xs text-zinc-500 font-medium mt-1">Generating unique Core Passport on Solana Devnet.</p>
                    </div>
                  </div>
                  
                  {/* Step 3 */}
                  <div className="relative flex gap-6 items-start">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-zinc-950 z-10 transition-all duration-500 shadow-xl bg-zinc-800"
                    )}>
                      <ShieldCheck size={18} className="text-white" />
                    </div>
                    <div className={cn(
                      "flex-1 p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl transition-all duration-500"
                    )}>
                      <h4 className="font-black text-sm uppercase tracking-wider text-white">03. Network Registry</h4>
                      <p className="text-xs text-zinc-500 font-medium mt-1">Broadcasting agent identity to global indexes.</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-[24px] text-red-500 text-xs font-bold flex gap-4 items-center animate-in shake duration-500">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Critical_Error</p>
                      <p className="font-mono">{error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <div className="p-8 bg-zinc-900/50 border-t border-zinc-900">
                {!connected ? (
                  <div className="text-center p-6 bg-zinc-950 border border-zinc-800 rounded-[24px] space-y-4">
                    <p className="text-xs font-black uppercase text-zinc-600 tracking-widest">Biometric_Verification_Required</p>
                    <Button onClick={login} className="w-full h-14 rounded-2xl bg-blue-600 font-black">LINK WALLET</Button>
                  </div>
                ) : !isAuthenticated ? (
                  <Button className="w-full h-16 rounded-[24px] text-lg font-black uppercase tracking-tight bg-blue-600 border-t border-white/20 shadow-2xl" onClick={login}>AUTHENTICATE_SESSION</Button>
                ) : (
                  <Button 
                    className="w-full h-20 rounded-[28px] text-xl font-black tracking-tight gap-4 shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:shadow-[0_0_60px_rgba(37,99,235,0.4)] transition-all bg-blue-600 border-t border-white/30 active:scale-95 group overflow-hidden relative"
                    onClick={handleConfirmDeploy}
                    disabled={status !== 'idle'}
                    isLoading={status !== 'idle'}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <Rocket size={24} />
                    EXECUTE LAUNCH
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {error && <Alert type="error" title="Deployment Failure" message={error} onClose={() => setError('')} />}
    </div>
  );
}
