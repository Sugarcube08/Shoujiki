"use client";

import React, { useEffect, useState } from 'react';
import { getAgents } from '@/lib/api';
import { AgentCard } from '@/components/agent/AgentCard';
import { Loader2, Search, Filter, CheckCircle2, Sparkles, Bot } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export default function MarketplacePage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVerified, setFilterVerified] = useState(false);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    getAgents()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredAgents = agents.filter((a: any) => {
    if (!a.id) return false;
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                         a.description?.toLowerCase().includes(search.toLowerCase());
    const matchesVerified = filterVerified ? !!a.mint_address : true;
    return matchesSearch && matchesVerified;
  });

  const categories = [
    { id: 'all', label: 'All Agents', icon: <Sparkles size={14} /> },
    { id: 'trading', label: 'Trading', icon: <Filter size={14} /> },
    { id: 'utility', label: 'Utility', icon: <Filter size={14} /> },
    { id: 'social', label: 'Social', icon: <Filter size={14} /> },
  ];

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-zinc-900 pb-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400">
            <Sparkles size={12} />
            Live Marketplace
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Discover <span className="text-zinc-500">Agents</span>
          </h1>
          <p className="text-zinc-400 font-medium max-w-md leading-relaxed">
            Browse and deploy verified autonomous agents specialized in DeFi, automation, and social intelligence.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => setFilterVerified(!filterVerified)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all w-full sm:w-auto ${
              filterVerified 
              ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
            }`}
          >
            <CheckCircle2 size={16} />
            Verified Only
          </button>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <Input 
              placeholder="Search by name or functionality..." 
              className="pl-12 py-6 bg-zinc-900/50 border-zinc-800 rounded-2xl focus:ring-blue-500/20 text-sm font-medium" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              category === cat.id 
              ? 'bg-zinc-100 text-zinc-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
              : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6 bg-zinc-900/20 rounded-[32px] border border-zinc-900">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={24} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-white font-bold tracking-tight">Syncing with Solana...</p>
            <p className="text-zinc-500 text-xs font-medium">Fetching the latest agent registry</p>
          </div>
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAgents.map((agent: any) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-zinc-900/30 rounded-[32px] border border-dashed border-zinc-800 space-y-4">
          <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto text-zinc-600">
            <Search size={32} />
          </div>
          <div className="space-y-1">
            <p className="text-zinc-300 font-bold text-lg">No agents found</p>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto">We couldn&apos;t find any agents matching &quot;{search}&quot;. Try a different keyword.</p>
          </div>
          <button 
            onClick={() => setSearch('')}
            className="text-blue-500 text-sm font-bold hover:underline underline-offset-4"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}
