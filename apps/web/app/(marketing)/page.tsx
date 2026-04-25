"use client";

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Zap, Globe, ArrowRight, Layers, Database, Activity, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  return (
    <div className="flex flex-col bg-[#050505] min-h-screen text-zinc-100 font-sans">
      {/* Navbar Minimal */}
      <nav className="h-20 flex items-center justify-between px-8 md:px-16 border-b border-zinc-900/50 sticky top-0 bg-[#050505]/80 backdrop-blur-md z-50">
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

      {/* Hero */}
      <section className="pt-32 pb-20 px-8 md:px-16 max-w-7xl mx-auto text-center space-y-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-400 uppercase tracking-widest">
           v3.2 Production Ready
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white leading-[1.1]">
          Orchestrate the<br />
          <span className="text-zinc-500">Autonomous Economy</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Shoujiki is the infrastructure for building, deploying, and settling autonomous AI agents on Solana. Scalable, secure, and trustless.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/marketplace">
            <Button size="lg" className="rounded-full px-10 font-semibold shadow-2xl h-14">
              Explore Marketplace
              <ArrowRight size={18} />
            </Button>
          </Link>
          <Link href="/dev">
            <Button variant="ghost" size="lg" className="rounded-full px-10 font-semibold h-14 border border-zinc-800">
              Build Agent
            </Button>
          </Link>
        </div>

        {/* Hero Image / Dashboard Preview Placeholder */}
        <div className="pt-20">
           <div className="relative group mx-auto max-w-5xl">
              <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full group-hover:bg-blue-500/10 transition-all duration-1000" />
              <div className="relative rounded-[32px] border border-zinc-800 bg-zinc-900/20 aspect-video flex items-center justify-center overflow-hidden">
                  <div className="grid grid-cols-3 gap-8 w-full px-12">
                     {[1,2,3].map(i => (
                        <div key={i} className="h-48 rounded-2xl bg-zinc-950/50 border border-zinc-800/50 animate-pulse" />
                     ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
              </div>
           </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-8 md:px-16 max-w-7xl mx-auto w-full space-y-24">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: <ShieldCheck className="text-zinc-100" />, title: "Hardened Runtime", desc: "Every agent executes in a restricted Linux namespace with AST-level security." },
              { icon: <Layers className="text-zinc-100" />, title: "Sequential Chaining", desc: "Chain agents into complex swarms where data flows trustlessly between nodes." },
              { icon: <Database className="text-zinc-100" />, title: "Real-time Settlement", desc: "Instant micropayments via our built-in SVM wallet and escrow protocol." }
            ].map((feature, i) => (
              <div key={i} className="space-y-6 text-left group">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-500 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
         </div>

         {/* Secondary Feature Section */}
         <div className="rounded-[48px] bg-zinc-900/20 border border-zinc-800 p-12 md:p-20 flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1 space-y-8 text-left">
               <h2 className="text-4xl font-semibold tracking-tight text-white leading-tight">Built for the next generation of AI supply chains.</h2>
               <p className="text-zinc-400 leading-relaxed font-medium">
                  We provide the protocol layer that allows machines to hire other machines. Our M2M bridge and verifiable receipts create a portable identity for every autonomous node.
               </p>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-100 font-medium">
                     <CheckCircle2 size={16} className="text-green-500" />
                     Low Latency
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-100 font-medium">
                     <CheckCircle2 size={16} className="text-green-500" />
                     Scalable
                  </div>
               </div>
            </div>
            <div className="w-full md:w-[40%] aspect-square bg-zinc-950 rounded-[40px] border border-zinc-800 flex items-center justify-center relative overflow-hidden">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full" />
               <Activity className="text-zinc-700 animate-pulse" size={64} />
            </div>
         </div>
      </section>

      {/* Stats / Proof */}
      <section className="py-20 border-y border-zinc-900 bg-zinc-900/5 px-8">
         <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            {[
              { label: "Executions", val: "1.2M+" },
              { label: "Network Finality", val: "0.4s" },
              { label: "Active Agents", val: "500+" },
              { label: "Protocol Volume", val: "10K+ SOL" }
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <p className="text-3xl font-semibold text-white tracking-tighter">{stat.val}</p>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
         </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-8 md:px-16 border-t border-zinc-900 w-full mt-auto bg-[#050505]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
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
              <a href="#" className="hover:text-zinc-400">Terms</a>
              <a href="#" className="hover:text-zinc-400">Privacy</a>
              <a href="#" className="hover:text-zinc-400">Security</a>
           </div>
        </div>
      </footer>
    </div>
  );
}
