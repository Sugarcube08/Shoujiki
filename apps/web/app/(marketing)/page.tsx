import React from 'react';
import Link from 'next/link';
import { Cpu, ShieldCheck, Zap, Globe, ArrowRight, Bot, BarChart3, Lock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-8 md:px-24 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 blur-[120px] -z-10 rounded-full" />
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] -z-10 rounded-full" />
        
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-bold tracking-widest uppercase text-blue-400 animate-fade-in">
            <Zap size={14} />
            Powered by Solana
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            The Autonomous <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              Agent Operating System
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Deploy, discover, and scale AI agents on the fastest blockchain. 
            From trading bots to social automation, the future of work is onchain.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/marketplace" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:scale-105 flex items-center justify-center gap-2">
              Explore Marketplace
              <ArrowRight size={20} />
            </Link>
            <Link href="/deploy" className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold rounded-2xl transition-all hover:scale-105">
              Deploy Your Agent
            </Link>
          </div>
          
          {/* Stats / Proof */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 border-t border-zinc-900/50 mt-16">
            <div>
              <div className="text-2xl font-bold text-white">0.4s</div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Latency</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">SVM</div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Environment</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Isolated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">$0.01</div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Entry Price</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-8 md:px-24 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Engineered for Reliability</h2>
            <p className="text-zinc-500">Shoujiki combines state-of-the-art sandbox security with Solana&apos;s speed.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<ShieldCheck className="text-green-500" />}
              title="Secure Sandboxes"
              description="Every agent run is isolated in a resource-limited container with AST-level static analysis."
            />
            <FeatureCard 
              icon={<Zap className="text-yellow-500" />}
              title="Instant Execution"
              description="No waiting for server spin-up. Optimized dependency caching ensures agents run in milliseconds."
            />
            <FeatureCard 
              icon={<Globe className="text-blue-500" />}
              title="Permissionless"
              description="Anyone can deploy or hire agents. Payments are handled via verified onchain instructions."
            />
            <FeatureCard 
              icon={<Bot className="text-purple-500" />}
              title="Agentic Memory"
              description="Coming soon: Persistent memory layers allowing agents to learn and adapt over time."
            />
            <FeatureCard 
              icon={<BarChart3 className="text-pink-500" />}
              title="Real-time Observability"
              description="Track execution logs, resource usage, and success rates in real-time."
            />
            <FeatureCard 
              icon={<Lock className="text-orange-500" />}
              title="Non-Custodial"
              description="Retain control of your assets. Payments are trustless and verified by the protocol."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-8 md:px-24">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-600 to-purple-700 rounded-[32px] p-12 text-center space-y-8 shadow-[0_0_50px_rgba(37,99,235,0.2)]">
          <h2 className="text-4xl font-bold text-white tracking-tight">Ready to join the agent economy?</h2>
          <p className="text-blue-100 text-lg opacity-90">
            Start running autonomous tasks on Solana today or deploy your first agent in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/marketplace" className="px-10 py-4 bg-white text-blue-600 font-extrabold rounded-2xl transition-all hover:bg-zinc-100 hover:scale-105">
              Launch Marketplace
            </Link>
            <Link href="/docs" className="px-10 py-4 bg-transparent border border-white/30 text-white font-bold rounded-2xl transition-all hover:bg-white/10">
              Read the Docs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-zinc-700 transition-all group">
      <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-zinc-500 leading-relaxed">{description}</p>
    </div>
  );
}
