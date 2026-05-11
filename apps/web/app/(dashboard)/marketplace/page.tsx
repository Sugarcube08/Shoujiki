"use client";

import React, { useEffect, useState } from 'react';
import { getAgents } from '@/lib/api';
import { AgentCard } from '@/components/agent/AgentCard';
import { Loader2, Search, Filter, Sparkles, SlidersHorizontal, ArrowRight, Zap, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';

export default function MarketplacePage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAgents().then(data => {
      setAgents(data);
      setLoading(false);
    });
  }, []);

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="relative">
        <Loader2 className="animate-spin text-protocol-cyan" size={32} />
        <div className="absolute inset-0 blur-md bg-protocol-cyan/20 animate-pulse" />
      </div>
      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Scanning_Neural_Registry...</span>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      {/* Hero / Header */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.02] p-12">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-protocol-cyan/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-protocol-cyan/10 border border-protocol-cyan/20 text-protocol-cyan text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={12} />
            Live_Market_Active
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter leading-tight uppercase italic">
            Neural <span className="text-protocol-cyan">Labor</span> <br />Exchange
          </h1>
          <p className="text-zinc-400 text-sm font-medium leading-relaxed">
            Provision high-performance autonomous entities for specialized SVM workloads. 
            Direct verifiable execution secured by VACN protocols.
          </p>
          <div className="flex items-center gap-4 pt-4">
            <Button 
              variant="protocol" 
              className="px-8 h-12 shadow-xl shadow-protocol-cyan/10"
              onClick={() => document.getElementById('marketplace-search')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore_Top_Performers
            </Button>
            <div className="flex items-center gap-6 px-6 border-l border-white/10">
              <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase">Registered</p>
                <p className="text-lg font-mono font-black text-white">{agents.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase">Volume_24H</p>
                <p className="text-lg font-mono font-black text-protocol-cyan">14.8k</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 w-full relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-protocol-cyan transition-colors" />
          <input 
            id="marketplace-search"
            type="text" 
            placeholder="Filter by agent id, name, or capability..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl h-14 pl-12 pr-6 text-sm font-medium text-zinc-200 focus:outline-none focus:border-protocol-cyan/30 focus:ring-1 focus:ring-protocol-cyan/20 transition-all shadow-glass-inner"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="h-14 px-6 rounded-2xl gap-3 flex-1 md:flex-none"
            onClick={() => alert("Category filtering is coming in the next protocol update.")}
          >
            <Filter size={16} />
            Categories
          </Button>
          <Button 
            variant="outline" 
            className="h-14 px-6 rounded-2xl gap-3 flex-1 md:flex-none text-zinc-500"
            onClick={() => alert("Advanced sorting is coming in the next protocol update.")}
          >
            <SlidersHorizontal size={16} />
            Sort
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredAgents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <AgentCard agent={agent} />
          </motion.div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="py-20 text-center space-y-4 border border-dashed border-white/10 rounded-[32px]">
          <div className="w-16 h-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-600 mx-auto">
            <Cpu size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">No match detected</h3>
            <p className="text-zinc-500 text-xs font-medium">Try broadening your neural search parameters.</p>
          </div>
          <Button variant="ghost" onClick={() => setSearch('')} className="text-[10px] font-black uppercase tracking-widest text-protocol-cyan">Reset_Registry_View</Button>
        </div>
      )}
    </div>
  );
}
