"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Code2, User2, Zap, Rocket, Activity, Globe, ShieldCheck, BarChart3, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WalletWidget } from './WalletWidget';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const navItems = [
  { label: 'Fleet', href: '/my-agents', icon: Activity },
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
  { label: 'Swarm_OS', href: '/swarms', icon: Rocket },
  { label: 'Dev_Space', href: '/dev', icon: Code2 },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const [stats, setStats] = useState({ active_agents: 0, total_executions: 0, total_volume: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/stats`);
        setStats(res.data);
      } catch (err) {
        console.error("Stats fetch failed");
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-72 border-r border-zinc-900/80 flex flex-col h-screen sticky top-0 bg-zinc-950/90 backdrop-blur-3xl z-40">
      {/* Branding */}
      <div className="p-10 flex flex-col gap-1">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 border-t border-white/20">
            <Zap size={22} className="text-white" fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white tracking-tighter leading-none">
              Shoujiki
            </span>
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1 ml-0.5">
              Protocol_V3
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between ml-4 mb-4">
           <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Command_Menu</p>
           <div className="w-1 h-1 rounded-full bg-zinc-800" />
        </div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs transition-all relative group overflow-hidden uppercase tracking-wider',
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
              )}
            >
              <div className={cn(
                "p-2 rounded-lg transition-all",
                isActive ? "bg-blue-600/20 text-blue-500 shadow-lg" : "text-zinc-700 group-hover:text-zinc-400 group-hover:bg-zinc-800"
              )}>
                <Icon size={16} />
              </div>
              {item.label}
              {isActive && (
                <div className="ml-auto w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
            </Link>
          );
        })}

        <div className="pt-8">
           <WalletWidget />
        </div>
      </nav>

      {/* Protocol Metrics Card */}
      <div className="p-6 border-t border-zinc-900 bg-zinc-950/50">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-[28px] p-5 space-y-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <BarChart3 size={40} className="text-blue-500" />
          </div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Globe size={14} className="text-blue-500 animate-pulse" />
            </div>
            <div>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">Global_Pulse</p>
              <p className="text-[11px] font-black text-white uppercase mt-1 tracking-tight">Mainnet_Shadow</p>
            </div>
          </div>

          <div className="space-y-4 relative z-10">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter leading-none">Cycles</p>
                   <p className="text-xs font-mono font-black text-zinc-300">{stats.total_executions}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter leading-none">Agents</p>
                   <p className="text-xs font-mono font-black text-zinc-300">{stats.active_agents}</p>
                </div>
             </div>
             
             <div className="pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Zap size={10} className="text-yellow-500" />
                   <p className="text-[8px] font-black text-zinc-500 uppercase">Volume</p>
                </div>
                <p className="text-[10px] font-mono font-black text-blue-500">{stats.total_volume.toFixed(2)} SOL</p>
             </div>
          </div>
        </div>

        {/* Security / Health */}
        <div className="mt-4 flex items-center justify-between px-2">
           <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-green-500/50" />
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">SVM_Secured</span>
           </div>
           <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] font-black text-zinc-700 uppercase">Synced</span>
           </div>
        </div>
      </div>
    </aside>
  );
};
