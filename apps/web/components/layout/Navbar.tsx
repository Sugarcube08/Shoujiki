"use client";

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, LogIn, UserCircle } from 'lucide-react';
import NoSSR from '@/components/ui/NoSSR';

export const Navbar = () => {
  const { connected, isAuthenticated, login, loading, publicKey } = useWalletAuth();

  return (
    <nav className="h-20 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-zinc-950/40 backdrop-blur-2xl sticky top-0 z-30">
      <div className="flex items-center gap-4 text-zinc-400">
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <ShieldCheck size={14} className="text-blue-500" />
          <span className="text-[10px] font-bold tracking-widest uppercase">Protocol Secure</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NoSSR>
          <div className="scale-90">
            <WalletMultiButton />
          </div>
          
          {connected && !isAuthenticated && (
            <Button 
              onClick={login} 
              isLoading={loading}
              variant="primary"
              className="px-6 py-2 h-10 rounded-xl gap-2 font-bold shadow-[0_0_20px_rgba(37,99,235,0.2)] animate-pulse hover:animate-none transition-all"
            >
              <LogIn size={16} />
              Verify Identity
            </Button>
          )}

          {isAuthenticated && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded-xl group transition-all hover:bg-blue-500/10 hover:border-blue-500/40">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              <span className="text-xs font-bold text-blue-400 tracking-tight">Access Granted</span>
            </div>
          )}
        </NoSSR>
      </div>
    </nav>
  );
};
