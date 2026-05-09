"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShoppingCart, Code2, Layers, 
  LayoutGrid, Landmark, ShieldAlert, FileSearch,
  Zap, Menu, ChevronRight, Sparkles, Terminal, Briefcase, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const navItems = [
  { label: 'Fleet Overview', href: '/my-agents', icon: LayoutGrid },
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
  { label: 'Labor Exchange', href: '/marketplace/labor', icon: Briefcase },
  { label: 'Agent Chat', href: '/chat', icon: Sparkles },
  { label: 'Swarm Builder', href: '/swarms', icon: Layers },
  { label: 'Task History', href: '/executions', icon: Terminal },
  { label: 'Protocol Bench', href: '/dev', icon: Code2 },
  { label: 'Treasury', href: '/wallet', icon: Landmark },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const [stats, setStats] = useState({ active_agents: 0, total_executions: 0, total_volume: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/stats`).then(res => setStats(res.data)).catch(() => {});
  }, []);

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isCollapsed ? 84 : 280,
        transition: { type: "spring", stiffness: 300, damping: 30 }
      }}
      className="relative z-50 h-screen sticky top-0 hidden md:flex flex-col bg-background border-r border-white/[0.05] px-4 py-8"
    >
      {/* Brand */}
      <div className="flex items-center gap-4 px-3 mb-12">
        <motion.div 
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.6, ease: "anticipate" }}
          className="relative w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <Zap size={20} className="text-black fill-black" />
        </motion.div>
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <span className="text-lg font-black tracking-tighter text-white uppercase italic leading-none">
                Shoujiki
              </span>
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em] mt-1">
                Autonomous_OS
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                initial={false}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group relative flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-white/[0.06] text-white" 
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"
                )}
              >
                <div className={cn(
                  "relative z-10 flex items-center justify-center w-6 h-6",
                  isActive && "text-cyber-cyan"
                )}>
                  <Icon size={18} />
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-glow"
                      className="absolute inset-0 bg-cyber-cyan/20 blur-md rounded-full -z-10"
                    />
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div 
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 border border-white/10 bg-white/[0.02] rounded-xl -z-0"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Stats Panel */}
      <div className="mt-auto">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                  <Sparkles size={12} className="text-cyber-cyan animate-pulse" />
                  Operator_Stat
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">Nodes_Active</p>
                  <p className="text-base font-mono font-black text-white italic tracking-tighter">{stats.active_agents}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">Total_Tasks</p>
                  <p className="text-base font-mono font-black text-cyber-cyan italic tracking-tighter">{stats.total_executions}</p>
                </div>
              </div>

              <div className="relative h-1 w-full bg-zinc-900/50 rounded-full overflow-hidden p-[1px] border border-white/5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyber-cyan to-blue-500 shadow-[0_0_10px_rgba(0,243,255,0.3)] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '72%' }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]" />
                <div className="w-0.5 h-4 bg-gradient-to-b from-cyber-cyan/50 to-transparent rounded-full" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-zinc-500">
                <Activity size={16} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse Toggle */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-24 w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 transition-all shadow-2xl z-50 group"
      >
        <ChevronRight size={12} className={cn("transition-transform duration-500", isCollapsed ? "" : "rotate-180")} />
        <div className="absolute inset-0 bg-cyber-cyan/10 opacity-0 group-hover:opacity-100 rounded-lg blur-md transition-opacity" />
      </motion.button>
    </motion.aside>
  );
};
