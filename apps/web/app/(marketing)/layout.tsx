"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col bg-background min-h-screen text-foreground font-sans">
      {/* Navbar Minimal */}
      <nav className="h-20 flex items-center justify-between px-8 md:px-16 border-b border-surface-border sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-protocol-violet/10 border border-protocol-violet/20 flex items-center justify-center overflow-hidden shadow-protocol-glow group-hover:scale-105 transition-transform">
            <Image 
              src="/1_1-LOGO.png" 
              alt="Shoujiki Logo" 
              width={32} 
              height={32} 
              className="object-cover"
            />
          </div>
          <span className="text-lg font-bold tracking-tight">Shoujiki</span>
        </Link>
        <div className="flex items-center gap-8">
           <Link href="/protocol" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Protocol</Link>
           <Link href="/marketplace" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Marketplace</Link>
           <Link href="/dev" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Developer</Link>
           <Link href="/my-agents">
              <Button size="sm" className="rounded-full px-6 bg-white text-black hover:bg-zinc-200 shadow-protocol-glow">Launch App</Button>
           </Link>
        </div>
      </nav>

      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-24 px-8 md:px-16 border-t border-surface-border w-full mt-auto bg-background">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 text-left">
          <div className="col-span-1 md:col-span-1 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-protocol-violet/10 border border-protocol-violet/20 flex items-center justify-center overflow-hidden shadow-protocol-glow">
                <Image 
                  src="/1_1-LOGO.png" 
                  alt="Shoujiki Logo" 
                  width={32} 
                  height={32} 
                  className="object-cover"
                />
              </div>
              <span className="text-base font-bold tracking-tight">Shoujiki</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-medium leading-relaxed uppercase tracking-widest">The Autonomous Agent Infrastructure Protocol.</p>
          </div>

          <div>
             <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Protocol</h4>
             <ul className="space-y-4 text-xs text-zinc-500 font-medium">
                <li><Link href="/protocol" className="hover:text-white transition-colors">Architecture</Link></li>
                <li><Link href="/governance" className="hover:text-white transition-colors">Governance</Link></li>
                <li><Link href="/marketplace" className="hover:text-white transition-colors">Registry</Link></li>
             </ul>
          </div>
          
          <div>
             <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Network</h4>
             <ul className="space-y-4 text-xs text-zinc-500 font-medium">
                <li><Link href="/explorer" className="hover:text-white transition-colors">Explorer</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Validators</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
             </ul>
          </div>

          <div>
             <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Legal</h4>
             <ul className="space-y-4 text-xs text-zinc-500 font-medium">
                <li><Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
             </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-20 border-t border-zinc-900 mt-20 flex flex-col md:flex-row justify-between gap-8 text-[10px] font-medium text-zinc-700 uppercase tracking-widest">
           <p>© 2026 Shoujiki Labs. All rights reserved.</p>
           <div className="flex gap-8">
              <Link href="/legal/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
              <a href="#" className="hover:text-zinc-400 transition-colors">Security</a>
           </div>
        </div>
      </footer>
    </div>
  );
}
