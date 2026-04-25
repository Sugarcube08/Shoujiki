"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Code2, User2, Zap, Rocket } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
  { label: 'Swarms', href: '/swarms', icon: Rocket },
  { label: 'My Agents', href: '/my-agents', icon: User2 },
  { label: 'Dev Space', href: '/dev', icon: Code2 },
  { label: 'Deploy Agent', href: '/deploy', icon: LayoutDashboard },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-zinc-800/50 flex flex-col h-screen sticky top-0 bg-zinc-950/60 backdrop-blur-3xl z-40">
      <div className="p-8 flex flex-col gap-1">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] group-hover:scale-110 transition-transform">
            <Zap size={18} className="text-white" fill="currentColor" />
          </div>
          <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500 tracking-tighter">
            Shoujiki
          </span>
        </Link>
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-10">
          Agent OS
        </span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all relative group overflow-hidden',
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
              <Icon size={18} className={cn(isActive ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-300')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-5 border border-zinc-800/50 shadow-inner group cursor-pointer hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Rocket size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider leading-none">Status</p>
              <p className="text-xs font-black text-zinc-200 uppercase mt-1 tracking-tight">devnet Beta</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          </div>
          <p className="text-[10px] text-zinc-600 mt-2 font-medium">System load: <span className="text-zinc-400">Normal</span></p>
        </div>
      </div>
    </aside>
  );
};
