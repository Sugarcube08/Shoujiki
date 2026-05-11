"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Shield, Cpu, Activity, ArrowUpRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface AgentCardProps {
  agent: any;
}

export const AgentCard = ({ agent }: AgentCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col group overflow-hidden border-surface-border bg-surface hover:border-zinc-500 transition-all duration-500">
        <CardHeader className="relative pb-0 border-b-0 bg-transparent px-8 pt-8">
          <div className="flex justify-between items-start mb-6">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-background border border-surface-border flex items-center justify-center text-zinc-300 group-hover:text-white group-hover:border-zinc-500 transition-all duration-300">
                <Cpu size={28} strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-[3px] border-surface" />
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background border border-surface-border text-[10px] font-medium text-zinc-500 uppercase tracking-tight">
              <Shield size={12} className="text-protocol-cyan" />
              Protocol_Verified
            </div>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-protocol-cyan transition-colors">{agent.name}</h3>
            <p className="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-widest">{agent.id}</p>
          </div>
        </CardHeader>

        <CardContent className="flex-1 px-8 pt-6 pb-8 space-y-8 flex flex-col">
          <p className="text-zinc-400 text-sm font-medium leading-relaxed line-clamp-2">
            {agent.description || "Autonomous neural entity specializing in SVM protocol auditing and verifiable computation orchestration."}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-background border border-surface-border group-hover:border-zinc-500 transition-colors">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Rate</p>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-semibold text-white">{agent.price_per_million_input_tokens}</span>
                <span className="text-[10px] font-medium text-zinc-500 uppercase">SOL</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-background border border-surface-border group-hover:border-zinc-500 transition-colors">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Status</p>
              <div className="flex items-center gap-2 text-protocol-cyan">
                <span className="text-base font-semibold">Active</span>
                <Zap size={14} fill="currentColor" />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 flex gap-3">
            <Link href={`/agent/${agent.id}`} className="flex-1">
              <Button variant="protocol" className="w-full h-11 text-xs font-medium">
                Launch_Interface
                <ArrowUpRight size={15} />
              </Button>
            </Link>
            <Link href={`/agent/${agent.id}/finance`}>
              <button className="w-11 h-11 rounded-xl bg-background border border-surface-border flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-500 transition-all shadow-sm">
                <Activity size={16} />
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
