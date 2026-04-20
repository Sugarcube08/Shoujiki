"use client";

import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Play, User, Trash2, BadgeCheck } from 'lucide-react';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string;
    price: number;
    creator_wallet: string;
    mint_address?: string;
    risk_score?: number;
  };
  onDelete?: () => void;
  isDeleting?: boolean;
}

export const AgentCard = ({ agent, onDelete, isDeleting }: AgentCardProps) => {
  const truncatedWallet = `${agent.creator_wallet.slice(0, 4)}...${agent.creator_wallet.slice(-4)}`;

  return (
    <Card className="group relative bg-zinc-900/40 border-zinc-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] overflow-hidden">
      {/* Decorative Gradient Background on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <CardHeader className="space-y-3 relative z-10 text-left items-start">
        <div className="flex justify-between items-start w-full">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-zinc-100 group-hover:text-blue-400 transition-colors leading-tight">
              {agent.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {agent.mint_address && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800/80 border border-zinc-700/50 rounded-full w-fit">
                  <BadgeCheck size={10} className="text-blue-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Onchain Asset</span>
                </div>
              )}
              {agent.risk_score !== undefined && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                    Risk: {(agent.risk_score * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-sm font-mono font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg border border-blue-400/20">
              {agent.price} SOL
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 bg-zinc-950/30 w-fit px-2 py-1 rounded-md border border-zinc-800/50">
          <User size={12} className="text-zinc-600" />
          <span>{truncatedWallet}</span>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-2 text-left">
        <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3 min-h-[4.5rem]">
          {agent.description || "Deploy autonomous operations on Solana with this high-performance AI agent."}
        </p>
      </CardContent>

      <CardFooter className="flex gap-2 relative z-10 mt-2">
        {agent.id ? (
          <Link href={`/agent/${agent.id}`} className="flex-1">
            <Button 
              className="w-full gap-2 font-bold py-5 rounded-xl transition-all shadow-lg border-zinc-700 hover:border-blue-500" 
              variant="secondary"
            >
              <Play size={14} fill="currentColor" />
              Configure & Run
            </Button>
          </Link>
        ) : (
          <Button 
            className="flex-1 gap-2 opacity-50 cursor-not-allowed py-5 rounded-xl" 
            variant="secondary"
            disabled
          >
            <Play size={14} fill="currentColor" />
            Invalid Agent
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            className="px-3 py-5 rounded-xl border-zinc-800 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            onClick={onDelete}
            isLoading={isDeleting}
            title="Delete Agent"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
