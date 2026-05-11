"use client";

import React from 'react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { Wallet, Bell, Search, Hexagon } from 'lucide-react';
import { motion } from 'framer-motion';
import { truncateWallet } from '@/lib/utils';

export const Navbar = () => {
  const { connected, login, publicKey, isAuthenticated } = useWalletAuth();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 w-full bg-background/60 backdrop-blur-xl border-b border-surface-border px-6 lg:px-12 py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-surface border border-surface-border shadow-sm">
            <div className="w-2 h-2 rounded-full bg-protocol-cyan shadow-[0_0_8px_rgba(6,182,212,0.4)] animate-pulse" />
            <span className="text-[10px] font-medium text-zinc-400 tracking-tight">Devnet Connected</span>
          </div>
        </div>

        {/* Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <div className="w-full relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search registry..."
              className="w-full bg-surface border border-surface-border rounded-xl h-10 pl-11 pr-4 text-xs font-medium text-zinc-300 focus:outline-none focus:border-white/[0.12] focus:bg-white/[0.05] transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-all shadow-sm">
            <Bell size={16} />
          </button>

          {connected ? (
            isAuthenticated ? (
              <div className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-xl bg-surface border border-surface-border hover:border-white/[0.15] transition-all cursor-pointer group shadow-sm">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold text-zinc-100 font-mono">{truncateWallet(publicKey?.toString() || '')}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center shadow-lg group-hover:bg-zinc-200 transition-colors">
                  <Wallet size={14} />
                </div>
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={login} className="h-10 shadow-xl text-[10px] px-4">
                Authenticate
              </Button>
            )
          ) : (
            <Button variant="primary" size="sm" onClick={login} className="h-10 shadow-xl text-[10px] px-4">
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};
