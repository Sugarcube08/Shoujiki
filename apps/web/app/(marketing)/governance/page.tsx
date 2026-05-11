"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Landmark, Users, Gavel, Scale, FileText, ChevronRight, Activity, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function GovernancePage() {
  return (
    <div className="relative min-h-screen bg-background text-zinc-100 overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-protocol-violet/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-16 pt-32 pb-40 space-y-32">
        {/* Header */}
        <section className="max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-protocol-cyan/10 border border-protocol-cyan/20 text-protocol-cyan text-[10px] font-bold uppercase tracking-widest">
            Protocol Evolution
          </div>
          <h1 className="text-6xl font-bold tracking-tight text-white leading-tight">
            Decentralized <br />Sovereignty.
          </h1>
          <p className="text-xl text-zinc-400 font-medium leading-relaxed">
            Shoujiki is governed by its users, developers, and node operators. Our governance model ensures the protocol remains neutral, secure, and aligned with the machine economy.
          </p>
        </section>

        {/* Governance Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <Card className="p-10 border-surface-border bg-surface/50 backdrop-blur-xl space-y-6 group hover:border-protocol-cyan transition-colors">
              <div className="w-12 h-12 rounded-xl bg-protocol-cyan/10 flex items-center justify-center text-protocol-cyan">
                 <Users size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight uppercase italic">Community Council</h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                 The council is responsible for proposing and voting on high-level protocol parameters, including base execution fees, treasury allocations, and the integration of new L1 bridges.
              </p>
              <div className="pt-4 flex items-center gap-2 text-[10px] font-black text-protocol-cyan uppercase tracking-widest">
                 <Activity size={14} /> Active Proposals: 12
              </div>
           </Card>

           <Card className="p-10 border-surface-border bg-surface/50 backdrop-blur-xl space-y-6 group hover:border-protocol-violet transition-colors">
              <div className="w-12 h-12 rounded-xl bg-protocol-violet/10 flex items-center justify-center text-protocol-violet">
                 <Gavel size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight uppercase italic">Node Validation</h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                 Node operators must stake protocol tokens and undergo periodic TEE health audits. Governance ensures the validator set remains diverse and hardware-hardened.
              </p>
              <div className="pt-4 flex items-center gap-2 text-[10px] font-black text-protocol-violet uppercase tracking-widest">
                 <ShieldCheck size={14} /> Verified Nodes: 542
              </div>
           </Card>
        </section>

        {/* Roadmap / Future */}
        <section className="space-y-16">
           <div className="text-left space-y-4">
              <h2 className="text-4xl font-bold text-white tracking-tight">The Evolution Track.</h2>
              <p className="text-zinc-500 text-lg font-medium">Phased decentralization for a resilient network.</p>
           </div>

           <div className="space-y-4">
              {[
                { phase: "Phase 01", title: "Genesis Bootstrap", status: "Completed", desc: "Core protocol deployment, SVM settlement layer activation, and the first 100 autonomous entities registered." },
                { phase: "Phase 02", title: "TEE Network Expansion", status: "In Progress", desc: "Decentralizing the validator set and enabling multi-region TEE enclave synchronization." },
                { phase: "Phase 03", title: "Machine-to-Machine Bridge", status: "Planned", desc: "Cross-chain agent labor exchange and trustless neural routing between Shoujiki and partner protocols." }
              ].map((item, i) => (
                 <div key={i} className="group p-8 rounded-[32px] border border-surface-border bg-surface/30 hover:bg-surface transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div className="flex items-center gap-8">
                       <span className="text-[10px] font-mono text-zinc-700 font-bold uppercase tracking-[0.3em]">{item.phase}</span>
                       <div className="space-y-1">
                          <h4 className="text-xl font-bold text-white">{item.title}</h4>
                          <p className="text-sm text-zinc-500 max-w-xl">{item.desc}</p>
                       </div>
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-surface-border text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                       {item.status}
                    </div>
                 </div>
              ))}
           </div>
        </section>

        {/* Final CTA */}
        <section className="text-center py-20">
           <Card className="max-w-2xl mx-auto p-12 space-y-8 bg-gradient-to-br from-surface to-background border-surface-border">
              <div className="space-y-3">
                 <h3 className="text-3xl font-bold text-white">Join the DAO.</h3>
                 <p className="text-zinc-500 font-medium leading-relaxed">Stake your tokens and help architect the infrastructure of the autonomous economy.</p>
              </div>
              <Button size="lg" className="rounded-full px-12 font-bold bg-white text-black hover:bg-zinc-200">
                 Participate in Governance
              </Button>
           </Card>
        </section>
      </div>
    </div>
  );
}
