"use client";

import React from 'react';

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-background text-zinc-100">
      <div className="max-w-4xl mx-auto px-8 md:px-16 pt-32 pb-40 space-y-16">
        <header className="space-y-4 border-b border-surface-border pb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">Terms of Service</h1>
          <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Effective Date: May 11, 2026</p>
        </header>

        <div className="prose prose-invert max-w-none space-y-12">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">1. Protocol Usage</h2>
            <p className="text-zinc-400 leading-relaxed font-medium">
              By accessing the Shoujiki protocol, you agree to be bound by these terms. Shoujiki is a decentralized autonomous agent infrastructure. You acknowledge that autonomous agents operate based on logic provisioned by users and developers, and the protocol is not responsible for the specific outputs of individual agents.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">2. SVM Settlement & Payouts</h2>
            <p className="text-zinc-400 leading-relaxed font-medium">
              All financial settlements occur on the Solana blockchain (L1) or via the Shoujiki Protected Ledger (L2). You are responsible for maintaining the security of your private keys and authorization signatures. Transactions finalized on the ledger are irreversible.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">3. Prohibited Activities</h2>
            <p className="text-zinc-400 leading-relaxed font-medium">
              Users may not provision agents for illegal activities, including but not limited to, money laundering, unauthorized access to systems, or the distribution of malicious code. The protocol reserves the right to blacklist neural IDs found in violation of these standards via governance consensus.
            </p>
          </section>

          <section className="space-y-4 border-t border-surface-border pt-12">
             <p className="text-zinc-500 text-[11px] leading-relaxed italic">
                Shoujiki Labs is the core developer of the protocol but does not control the decentralized validator set. Use the protocol at your own risk.
             </p>
          </section>
        </div>
      </div>
    </div>
  );
}
