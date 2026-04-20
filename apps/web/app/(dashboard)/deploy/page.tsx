"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { deployAgent } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Rocket, AlertCircle, FileCode, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

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
      // Step 1: Deploy calls backend (validates -> mints -> stores)
      const res = await deployAgent(draft);
      
      // Step 2: Show success
      setStatus('minting');
      setDeployedAgent(res);
      localStorage.removeItem('shoujiki_draft');
      
      // Brief delay to show "Minting..." before moving to done, 
      // though backend already did it, we show it for UX based on the unified pipeline spec
      setTimeout(() => {
        setStatus('done');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Deployment failed');
      setStatus('idle');
    }
  };

  if (!draft) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <button 
        onClick={() => router.push('/dev')}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Dev Space
      </button>

      <div>
        <h1 className="text-3xl font-bold mb-2">Deploy Agent Package</h1>
        <p className="text-zinc-400">Review your package, validate syntax, and mint on-chain.</p>
      </div>

      {status === 'done' ? (
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 size={48} className="text-green-500" />
            <h2 className="text-2xl font-bold text-green-400">Deployment Successful</h2>
            <p className="text-zinc-400 mb-4 text-center">
              Your agent has been validated, minted on Metaplex Core, and stored.
            </p>
            <div className="p-4 bg-black/40 rounded-xl w-full max-w-md text-sm font-mono text-zinc-300 break-all border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Mint Address:</span>
              {deployedAgent?.mint_address || 'Pending Network Confirm'}
            </div>
            <Button onClick={() => router.push('/my-agents')} className="mt-4 px-8">
              View in My Agents
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="font-bold flex items-center gap-2">
                  <FileCode size={18} className="text-blue-400" />
                  Package Preview
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 uppercase font-bold">Agent Details</p>
                  <p className="text-sm font-medium">{draft.name} ({draft.id})</p>
                  <p className="text-xs text-zinc-400">{draft.description || 'No description'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 uppercase font-bold">Price</p>
                  <p className="text-sm font-medium text-purple-400">{draft.price} SOL</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 uppercase font-bold">Entrypoint</p>
                  <p className="text-sm font-mono bg-zinc-900 px-2 py-1 rounded inline-block">{draft.entrypoint}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 uppercase font-bold">Files ({Object.keys(draft.files).length})</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(draft.files).map(f => (
                      <span key={f} className="text-xs font-mono bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-zinc-400">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="h-full flex flex-col justify-between">
              <CardHeader>
                <h3 className="font-bold">Pipeline Status</h3>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-950 ${status === 'idle' ? 'bg-zinc-700' : 'bg-blue-500'} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow transition-colors`}>
                      {status === 'validating' ? <Loader2 size={16} className="animate-spin text-white" /> : <CheckCircle2 size={16} className="text-white" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 shadow">
                      <h4 className="font-bold text-sm">1. AST Validation</h4>
                      <p className="text-xs text-zinc-500">Check multi-file structure and entrypoint</p>
                    </div>
                  </div>
                  
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-950 ${status === 'minting' ? 'bg-purple-500' : 'bg-zinc-800'} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow transition-colors`}>
                       {status === 'minting' ? <Loader2 size={16} className="animate-spin text-white" /> : <Rocket size={16} className="text-zinc-500" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 shadow">
                      <h4 className="font-bold text-sm">2. Metaplex Mint</h4>
                      <p className="text-xs text-zinc-500">Mint Core asset on Solana</p>
                    </div>
                  </div>
                  
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-950 bg-zinc-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow transition-colors`}>
                      <CheckCircle2 size={16} className="text-zinc-500" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 shadow">
                      <h4 className="font-bold text-sm">3. Registry Store</h4>
                      <p className="text-xs text-zinc-500">Save to marketplace index</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex gap-2 items-center">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </CardContent>
              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
                {!connected ? (
                  <p className="text-center text-zinc-500 text-sm">Connect wallet to deploy</p>
                ) : !isAuthenticated ? (
                  <Button className="w-full" onClick={login}>Authenticate to Deploy</Button>
                ) : (
                  <Button 
                    className="w-full h-14 text-lg gap-2 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                    onClick={handleConfirmDeploy}
                    isLoading={status !== 'idle'}
                  >
                    <Rocket size={18} />
                    Confirm & Mint Agent
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
