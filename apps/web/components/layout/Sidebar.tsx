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
import Image from 'next/image';

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
      className="relative z-50 h-screen sticky top-0 hidden md:flex flex-col bg-background border-r border-surface-border px-4 py-8"
    >
      {/* Brand */}
      <div className="flex items-center gap-4 px-3 mb-12">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-10 h-10 rounded-xl bg-protocol-violet/10 flex items-center justify-center shrink-0 shadow-protocol-glow border border-protocol-violet/20 overflow-hidden"
        >
          <Image 
            src="/1_1-LOGO.png" 
            alt="Shoujiki Logo" 
            width={40} 
            height={40} 
            className="object-cover"
          />
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
              <span className="text-lg font-bold tracking-tight text-white leading-none">
                Shoujiki
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
                    ? "bg-surface text-white border border-surface-border" 
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-surface/50 border border-transparent"
                )}
              >
                <div className={cn(
                  "relative z-10 flex items-center justify-center w-6 h-6",
                  isActive && "text-protocol-cyan"
                )}>
                  <Icon size={18} />
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-glow"
                      className="absolute inset-0 bg-protocol-cyan-glow blur-md rounded-full -z-10"
                    />
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      className="text-[12px] font-medium tracking-wide whitespace-nowrap z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div 
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 bg-surface rounded-xl -z-0"
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
              className="p-5 rounded-2xl bg-surface border border-surface-border space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                  <Activity size={12} className="text-protocol-cyan animate-pulse" />
                  Network
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-protocol-cyan shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-zinc-600 tracking-tight">Active Nodes</p>
                  <p className="text-lg font-mono font-medium text-white">{stats.active_agents}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-medium text-zinc-600 tracking-tight">Total Tasks</p>
                  <p className="text-lg font-mono font-medium text-protocol-cyan">{stats.total_executions}</p>
                </div>
              </div>

              <div className="relative h-1 w-full bg-background rounded-full overflow-hidden p-[1px] border border-surface-border">
                <motion.div 
                  className="h-full bg-gradient-to-r from-protocol-violet to-protocol-cyan shadow-protocol-glow rounded-full"
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
                <div className="w-1.5 h-1.5 rounded-full bg-protocol-cyan shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                <div className="w-0.5 h-4 bg-gradient-to-b from-protocol-cyan/50 to-transparent rounded-full" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-zinc-500">
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
        className="absolute -right-3 top-24 w-7 h-7 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-500 transition-all shadow-premium z-50 group"
      >
        <ChevronRight size={12} className={cn("transition-transform duration-500", isCollapsed ? "" : "rotate-180")} />
      </motion.button>
    </motion.aside>
  );
};
