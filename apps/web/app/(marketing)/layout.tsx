import React from 'react';
import Link from 'next/link';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="h-20 border-b border-zinc-800/50 flex items-center justify-between px-8 md:px-24 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Shoujiki
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/marketplace" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Marketplace
          </Link>
          <Link href="/marketplace" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            Launch App
          </Link>
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
      <footer className="py-12 border-t border-zinc-900 bg-zinc-950 px-8 md:px-24">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-zinc-500 text-sm">
            © 2026 Shoujiki AI. Built on Solana.
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">Docs</a>
            <a href="#" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">Twitter</a>
            <a href="#" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
