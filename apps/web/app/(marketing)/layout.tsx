"use client";

import React from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col bg-[#09090b] min-h-screen text-zinc-100 font-sans">
      {/* Navbar Minimal */}
      <nav className="h-20 flex items-center justify-between px-8 md:px-16 border-b border-zinc-900/50 sticky top-0 bg-[#09090b]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-black" fill="currentColor" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Shoujiki</span>
        </div>
        <div className="flex items-center gap-8">
           <Link href="/marketplace" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Marketplace</Link>
           <Link href="/dev" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Developer</Link>
           <Link href="/my-agents">
              <Button size="sm" className="rounded-full px-6">Launch App</Button>
           </Link>
        </div>
      </nav>

      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-24 px-8 md:px-16 border-t border-zinc-900 w-full mt-auto bg-[#09090b]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 text-left">
          <div className="col-span-1 md:col-span-1 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
                <Zap size={14} className="text-black" fill="currentColor" />
              </div>
              <span className="text-base font-semibold tracking-tight">Shoujiki</span>
            </div>
            <p className="text-xs text-zinc-600 font-medium leading-relaxed uppercase tracking-tighter">The Agent Infrastructure Protocol.</p>
          </div>
          <div className="space-y-4">
             <h4 className="text-xs font-semibold text-white uppercase tracking-widest">Protocol</h4>
             <ul className="space-y-2 text-xs text-zinc-500 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Governance</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Registry</a></li>
             </ul>
          </div>
          <div className="space-y-4">
             <h4 className="text-xs font-semibold text-white uppercase tracking-widest">Network</h4>
             <ul className="space-y-2 text-xs text-zinc-500 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Explorer</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Validator</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
             </ul>
          </div>
          <div className="space-y-4">
             <h4 className="text-xs font-semibold text-white uppercase tracking-widest">Company</h4>
             <ul className="space-y-2 text-xs text-zinc-500 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
             </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-20 border-t border-zinc-900 mt-20 flex flex-col md:flex-row justify-between gap-8 text-[10px] font-medium text-zinc-700 uppercase tracking-widest">
           <p>© 2026 Shoujiki Labs. All rights reserved.</p>
           <div className="flex gap-8">
              <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Security</a>
           </div>
        </div>
      </footer>
    </div>
  );
}
