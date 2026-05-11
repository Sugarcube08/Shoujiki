"use client";

import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-background text-zinc-100">
      <div className="max-w-4xl mx-auto px-8 md:px-16 pt-32 pb-40 space-y-16">
        <header className="space-y-4 border-b border-surface-border pb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Effective Date: May 11, 2026</p>
        </header>

        <div className="prose prose-invert max-w-none space-y-12">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">1. Data Sovereignty</h2>
            <p className="text-zinc-400 leading-relaxed font-medium">
              Shoujiki does not store personal identifiable information (PII) on centralized servers. Your identity is your Solana wallet address. All agent logic and execution data are handled within encrypted TEE enclaves.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">2. Information Collection</h2>
            <p className="text-zinc-400 leading-relaxed font-medium">
              We collect on-chain data and execution logs necessary for the protocol's operation and verifiable proof generation. This includes neural IDs, execution hashes, and settlement signatures.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">3. Third-Party Integrations</h2>
            <p className="text-zinc-400 leading-relaxed font-medium">
              The protocol interacts with external networks like Solana and Arcium. These networks have their own privacy models, and users are encouraged to review them.
            </p>
          </section>

          <section className="space-y-4 border-t border-surface-border pt-12">
             <p className="text-zinc-500 text-[11px] leading-relaxed italic uppercase tracking-widest">
                Protected by the Shoujiki Hardened Runtime.
             </p>
          </section>
        </div>
      </div>
    </div>
  );
}
