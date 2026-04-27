"use client";

import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Play, BadgeCheck, CreditCard, Wallet, Cpu, Activity, Shield, ArrowUpRight } from 'lucide-react';
import { cn, truncateWallet } from '@/lib/utils';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string;
    price: number;
    creator_wallet: string;
    mint_address?: string;
    risk_score?: number;
    reputation_score?: number;
    reliability_score?: number;
    balance?: number;
    trust_level?: string;
  };
  onDelete?: () => void;
  isDeleting?: boolean;
  onWithdraw?: () => void;
  isWithdrawing?: boolean;
}

export const AgentCard = ({ agent, onDelete, isDeleting, onWithdraw, isWithdrawing }: AgentCardProps) => {
  const getTrustColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'elite': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'trusted': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-zinc-400 bg-zinc-800/40 border-zinc-700/50';
    }
  };

  return (
    <Card className="group relative flex flex-col h-full bg-[#0c0c0e] border-zinc-800/60 hover:border-zinc-700 transition-all duration-300">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-100 transition-colors">
              {agent.name}
            </h3>
            {agent.mint_address && (
              <BadgeCheck size={14} className="text-blue-500" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
             <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border shadow-sm", getTrustColor(agent.trust_level))}>
                <Shield size={10} />
                Passport: {agent.trust_level || "Verified"}
             </div>
             <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border border-zinc-800/60 bg-zinc-900/40 text-zinc-400 shadow-sm">
                <Activity size={10} />
                Rel: {(agent.reliability_score || 1.0).toLocaleString(undefined, {style: 'percent'})}
             </div>
          </div>
        </div>
        <div className="text-right">
           <p className="text-sm font-semibold text-zinc-100">{agent.price} SOL</p>
           <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Per Run</p>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-4 text-left">
        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">
          {agent.description || "Autonomous agent specialized in high-frequency execution and on-chain coordination."}
        </p>
        
        <div className="pt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-zinc-600">
          <span>Creator: <span className="text-zinc-400 font-mono">{truncateWallet(agent.creator_wallet)}</span></span>
          {agent.balance !== undefined && agent.balance > 0 && (
            <div className="flex items-center gap-1.5 text-blue-400">
              <Wallet size={10} className="text-blue-500/50" />
              Treasury: {agent.balance.toFixed(2)} SOL
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-2">
        <div className="flex gap-2 w-full">
          <Link href={`/agent/${agent.id}`} className="flex-1">
            <Button 
              variant="primary"
              className="w-full h-10 text-[11px] font-black uppercase tracking-widest rounded-lg shadow-lg"
            >
              Initialize Node
              <ArrowUpRight size={14} className="ml-1 opacity-50" />
            </Button>
          </Link>

          {onWithdraw && agent.balance !== undefined && agent.balance > 0 && (
            <Button
              variant="secondary"
              className="w-10 h-10 p-0 rounded-lg shrink-0 border-zinc-800 bg-zinc-900/50"
              onClick={onWithdraw}
              isLoading={isWithdrawing}
              title="Agent Treasury"
            >
              <CreditCard size={16} className="text-zinc-400" />
            </Button>
          )}
        </div>

        {onDelete && (
          <button
            className="w-full py-1 text-[9px] font-medium text-zinc-600 hover:text-red-400 transition-colors"
            onClick={onDelete}
          >
            Deregister Instance
          </button>
        )}
      </CardFooter>
    </Card>
  );
};
