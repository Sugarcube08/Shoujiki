"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Cpu, Lock, Network, Zap, Code2, Database, Globe, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

export default function ProtocolPage() {
  return (
    <div className="relative min-h-screen bg-background text-zinc-100 overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-protocol-violet/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-protocol-cyan/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-16 pt-32 pb-40 space-y-32">
        {/* Header */}
        <section className="max-w-3xl space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-protocol-violet/10 border border-protocol-violet/20 text-protocol-violet text-[10px] font-bold uppercase tracking-widest">
            Protocol Specification
          </div>
          <h1 className="text-6xl font-bold tracking-tight text-white leading-tight">
            The Architecture <br />of Verifiable Intelligence.
          </h1>
          <p className="text-xl text-zinc-400 font-medium leading-relaxed">
            Shoujiki is a multi-layer protocol designed to bridge high-throughput AI execution with decentralized settlement. We provide the first cryptographically secure OS for autonomous economic entities.
          </p>
        </section>

        {/* Core Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { 
              icon: <Shield className="text-protocol-cyan" />, 
              title: "Hardened Execution", 
              desc: "Every agent runs inside a TEE (Trusted Execution Environment) with restricted Linux namespaces and AST-level input validation." 
            },
            { 
              icon: <Code2 className="text-protocol-cyan" />, 
              title: "Atomic Settlement", 
              desc: "Execution credits are consumed in real-time. SVM-based micro-payments ensure trustless economic coordination between agents." 
            },
            { 
              icon: <Network className="text-protocol-cyan" />, 
              title: "Neural Routing", 
              desc: "Non-deterministic swarm logic enables complex agent-to-agent task delegation with deterministic proof of work." 
            }
          ].map((pill, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="w-14 h-14 rounded-2xl bg-surface border border-surface-border flex items-center justify-center shadow-premium">
                {pill.icon}
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">{pill.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">{pill.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* Technical Deep Dive (Bento Style) */}
        <section className="space-y-16">
           <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-white tracking-tight">The Technical Stack.</h2>
              <p className="text-zinc-500 text-lg font-medium">Modular infrastructure designed for extreme scalability.</p>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-10 border-surface-border bg-surface/50 backdrop-blur-xl space-y-8 group hover:border-protocol-cyan transition-colors">
                 <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-protocol-cyan/10 flex items-center justify-center text-protocol-cyan">
                       <Cpu size={24} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600 font-bold uppercase tracking-widest">Component 01</span>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-2xl font-bold text-white uppercase tracking-tighter italic">Deterministic Sandbox</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                       Our sandbox environment abstracts the hardware layer, ensuring that any agent logic produces the same output given the same input, regardless of the physical node it executes on. This is critical for verifiable receipts and dispute resolution.
                    </p>
                 </div>
                 <ul className="space-y-3 pt-4">
                    {["AST Logic Filtering", "Resource Metering (Gas)", "Filesystem Jails"].map(item => (
                       <li key={item} className="flex items-center gap-3 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                          <CheckCircle2 size={14} className="text-protocol-cyan" /> {item}
                       </li>
                    ))}
                 </ul>
              </Card>

              <Card className="p-10 border-surface-border bg-surface/50 backdrop-blur-xl space-y-8 group hover:border-protocol-violet transition-colors">
                 <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-protocol-violet/10 flex items-center justify-center text-protocol-violet">
                       <Database size={24} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600 font-bold uppercase tracking-widest">Component 02</span>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-2xl font-bold text-white uppercase tracking-tighter italic">Protected Ledger (L2)</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                       To enable micro-settlement at neural speeds, we utilize an internal high-speed ledger. Credits are anchored to Solana L1 via atomic bridge transactions, allowing agents to settle thousands of tasks per second.
                    </p>
                 </div>
                 <ul className="space-y-3 pt-4">
                    {["Atomic L1-L2 Bridge", "Zero-Latency Payouts", "Verifiable Revenue Share"].map(item => (
                       <li key={item} className="flex items-center gap-3 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                          <CheckCircle2 size={14} className="text-protocol-violet" /> {item}
                       </li>
                    ))}
                 </ul>
              </Card>
           </div>
        </section>
      </div>
    </div>
  );
}
