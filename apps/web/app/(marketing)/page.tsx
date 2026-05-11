"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheck, Zap, Globe, ArrowRight, Layers, 
  Database, Activity, CheckCircle2, Cpu, 
  Wallet, Network, Sparkles, Terminal, Code2,
  Scan, Crosshair, Box, ChevronRight, Binary,
  Lock, Radio, Satellite, Command, Target, ListTree
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export default function RadicalLandingPage() {
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2], [0, -100]);
  
  const scrollBlock = useTransform(scrollYProgress, [0, 1], [284910242, 284915000]);

  const [telemetry, setTelemetry] = useState({
    block: 284910242,
    tps: 4281,
    nodes: 542,
    latency: 0.04
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        block: prev.block + 1,
        tps: 4200 + Math.floor(Math.random() * 200),
        nodes: prev.nodes,
        latency: 0.03 + (Math.random() * 0.02)
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#020203] text-foreground selection:bg-protocol-cyan/30 overflow-x-hidden font-sans">
      
      {/* HUD OVERLAY - Fixed Elements */}
      <div className="fixed inset-0 pointer-events-none z-50 m-4 md:m-8 rounded-[40px] border-[1px] border-white/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
         {/* Corners */}
         <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-protocol-cyan/30 rounded-tl-[38px]" />
         <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-protocol-cyan/30 rounded-tr-[38px]" />
         <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-protocol-cyan/30 rounded-bl-[38px]" />
         <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-protocol-cyan/30 rounded-br-[38px]" />
         
         {/* Top Data Bar */}
         <div className="absolute top-6 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-12 text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-500">
            <div className="flex items-center gap-2">
               <span className="text-protocol-cyan/50">OS_CORE:</span>
               <span className="text-zinc-200 flicker">ACTIVE</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-protocol-cyan/50">NEURAL_LOAD:</span>
               <span className="text-zinc-200">{(telemetry.tps / 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-protocol-cyan/50">REGION:</span>
               <span className="text-zinc-200">SOL_SOUTH_1</span>
            </div>
         </div>

         {/* Left Side Command Stream - Responsive on Scroll */}
         <div className="absolute left-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-12">
            {[1,2,3,4,5].map(i => (
               <motion.div 
                 key={i} 
                 className="flex flex-col gap-2"
                 initial={{ opacity: 0.1 }}
                 whileInView={{ opacity: 0.5 }}
               >
                  <div className="h-[1px] w-6 bg-protocol-violet" />
                  <span className="text-[7px] font-mono uppercase tracking-tighter text-protocol-violet">SECTOR_{i * 100}</span>
               </motion.div>
            ))}
         </div>

         {/* Right Side Scroll Block Counter */}
         <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-end gap-2 opacity-30">
            <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">Sync_Progress</span>
            <div className="w-1 h-32 bg-white/5 rounded-full relative overflow-hidden">
               <motion.div 
                  className="absolute top-0 left-0 w-full bg-protocol-cyan" 
                  style={{ height: useTransform(scrollYProgress, [0, 1], ["0%", "100%"]) }} 
               />
            </div>
            <motion.span className="text-[10px] font-mono text-protocol-cyan">{telemetry.block}</motion.span>
         </div>
      </div>

      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] h-[140vw] border border-white/[0.02] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110vw] h-[110vw] border border-white/[0.015] rounded-full animate-[spin_120s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] border border-protocol-cyan/5 rounded-full animate-[spin_80s_linear_infinite_reverse]" />
        
        {/* Glow Pulses */}
        <div className="absolute top-1/4 left-1/3 w-[40%] h-[40%] bg-protocol-violet/5 blur-[150px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/3 w-[40%] h-[40%] bg-protocol-cyan/5 blur-[150px] rounded-full animate-pulse-slow" />
        
        <div className="scanline" />
      </div>

      {/* HERO SECTION - NEURAL CORE HUD */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-8 text-center overflow-hidden">
         <motion.div 
            style={{ scale, opacity, y }}
            className="z-20 space-y-16"
         >
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <div className="px-6 py-2 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl flex items-center gap-4 shadow-premium">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-protocol-cyan flicker" />
                    <div className="w-1.5 h-1.5 rounded-full bg-protocol-violet flicker" style={{ animationDelay: '0.1s' }} />
                  </div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-zinc-400">System.Initialized // Protocol_Stable</span>
                </div>
              </motion.div>

              <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-white uppercase italic leading-[0.8]">
                Neural <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-protocol-cyan via-white to-protocol-violet animate-gradient-x">Operating System</span>
              </h1>
            </div>

            {/* THE CORE - 3D PERSPECTIVE DASHBOARD */}
            <div className="relative group max-w-6xl mx-auto py-12 px-4">
               {/* Decorative HUD Elements */}
               <div className="absolute -top-10 -left-10 hidden lg:block opacity-20 group-hover:opacity-40 transition-opacity duration-1000">
                  <Scan size={120} strokeWidth={0.5} className="text-protocol-cyan animate-pulse" />
               </div>
               <div className="absolute -bottom-10 -right-10 hidden lg:block opacity-20 group-hover:opacity-40 transition-opacity duration-1000">
                  <Crosshair size={120} strokeWidth={0.5} className="text-protocol-violet animate-pulse" />
               </div>

               <div className="relative [perspective:3000px]">
                  <motion.div
                    whileHover={{ rotateY: 2, rotateX: -2, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 100, damping: 30 }}
                    className="relative rounded-[60px] border border-white/5 bg-[#050505] p-4 shadow-[0_0_120px_rgba(107,33,168,0.15)] overflow-hidden"
                  >
                     <div className="relative aspect-[16/9] rounded-[48px] overflow-hidden bg-zinc-950">
                        <Image 
                           src="/4_3_banner.png" 
                           alt="Shoujiki Core" 
                           fill
                           className="object-cover opacity-80 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-105"
                           priority
                        />
                        {/* Internal Hud Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020203] via-transparent to-[#020203] opacity-60" />
                        <div className="absolute inset-0 flex flex-col justify-between p-12 pointer-events-none">
                           <div className="flex justify-between items-start">
                              <div className="flex flex-col gap-2 p-4 bg-black/60 backdrop-blur-md rounded-2xl border-l-2 border-protocol-cyan/50">
                                 <p className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Protocol_Uptime</p>
                                 <p className="text-xl font-mono font-bold text-white tracking-tighter">99.999%</p>
                              </div>
                              <div className="flex flex-col items-end gap-2 p-4 bg-black/60 backdrop-blur-md rounded-2xl border-r-2 border-protocol-violet/50">
                                 <p className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest text-right">L2_Throughput</p>
                                 <p className="text-xl font-mono font-bold text-white tracking-tighter">1.2M EXP</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-12 pt-4">
               <Link href="/dev">
                  <Button size="lg" className="h-16 px-16 rounded-full bg-protocol-violet text-white shadow-protocol-glow hover:bg-purple-700 font-bold uppercase tracking-[0.3em] text-[11px] group relative overflow-hidden">
                     <span className="relative z-10 flex items-center gap-3">
                        Initialize Deployment
                        <Terminal size={18} />
                     </span>
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </Button>
               </Link>
               <div className="flex items-center gap-12">
                  <div className="flex flex-col items-start gap-1">
                     <span className="text-[8px] font-mono text-zinc-600 uppercase font-black tracking-widest">Network_Latency</span>
                     <span className="text-2xl font-mono font-bold text-protocol-cyan">{telemetry.latency.toFixed(4)}<span className="text-xs ml-1">MS</span></span>
                  </div>
                  <div className="h-10 w-[1px] bg-white/10" />
                  <div className="flex flex-col items-start gap-1">
                     <span className="text-[8px] font-mono text-zinc-600 uppercase font-black tracking-widest">Agent_Nodes</span>
                     <span className="text-2xl font-mono font-bold text-protocol-violet">{telemetry.nodes}</span>
                  </div>
               </div>
            </div>
         </motion.div>
      </section>

      {/* ARCHITECTURE GRID - HOLOGRAPHIC MODULES */}
      <section className="py-60 px-8 relative bg-gradient-to-b from-transparent via-zinc-950/20 to-transparent">
         <div className="max-w-7xl mx-auto space-y-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
               <div className="space-y-12">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-protocol-cyan/20 bg-protocol-cyan/5 text-protocol-cyan text-[9px] font-bold uppercase tracking-widest">
                       Hardware-Rooted-Trust
                    </div>
                    <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter leading-[0.9]">
                       Verifiable <br />
                       <span className="text-zinc-500">Execution</span> <br />
                       Environments.
                    </h2>
                    <p className="text-zinc-500 text-lg font-medium leading-relaxed max-w-lg">
                       Agents execute in hardware-hardened TEE enclaves. Proof of Autonomous Execution (PoAE) is generated and settled in real-time.
                    </p>
                  </div>

                  <div className="space-y-3 pt-6 border-l-2 border-zinc-900 pl-8">
                     {[
                       'Restricted Linux Namespaces', 
                       'AST-Level Logic Validation', 
                       'Deterministic Sandbox Isolation', 
                       'L1 Anchor Verification'
                     ].map((feat, i) => (
                        <div key={i} className="flex items-center gap-4 group cursor-default">
                           <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-protocol-cyan transition-colors" />
                           <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest group-hover:text-zinc-300 transition-colors">{feat}</span>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  <div className="absolute -inset-10 bg-protocol-violet/5 blur-[120px] rounded-full pointer-events-none" />
                  {[
                    { title: "SVM Core", icon: <Binary size={24} />, color: "protocol-cyan" },
                    { title: "L2 Bridge", icon: <Satellite size={24} />, color: "protocol-violet" },
                    { title: "M2M Mesh", icon: <Network size={24} />, color: "zinc-400" },
                    { title: "Audit Log", icon: <ListTree size={24} />, color: "protocol-cyan" }
                  ].map((m, i) => (
                     <div key={i} className="p-8 rounded-[40px] border border-white/5 bg-zinc-900/20 backdrop-blur-3xl hover:border-white/10 transition-all group h-[280px] flex flex-col justify-between shadow-sm relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                           <Target size={120} />
                        </div>
                        <div className={`w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-${m.color}`}>
                           {m.icon}
                        </div>
                        <div>
                           <h4 className="text-xl font-bold text-white uppercase italic tracking-tighter mb-2">{m.title}</h4>
                           <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest leading-relaxed">Initialized // Running_Verifiable</p>
                        </div>
                        <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                           <ChevronRight size={20} className={`text-${m.color}`} />
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </section>

      {/* SETTLEMENT BRIDGE - LIQUIDITY HUD */}
      <section className="py-60 relative overflow-hidden bg-black/40">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02]" />
         <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-protocol-cyan/20 to-transparent" />
         
         <div className="max-w-7xl mx-auto px-8 relative z-10 text-center space-y-24">
            <div className="max-w-3xl mx-auto space-y-6">
               <h2 className="text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  L2 Settlement <br />
                  <span className="text-protocol-cyan flicker">Protocols</span>
               </h2>
               <p className="text-zinc-500 text-lg font-medium">
                  High-frequency neural labor requires zero-latency economic finality. Shoujiki settles thousands of autonomous transactions per second.
               </p>
            </div>

            <div className="relative h-[500px] flex items-center justify-center">
               {/* BRIDGE CENTERPIECE */}
               <div className="relative z-20 flex items-center gap-24 md:gap-60">
                  <motion.div 
                     whileHover={{ scale: 1.05 }}
                     className="flex flex-col items-center gap-8 group"
                  >
                     <div className="w-28 h-28 rounded-[40px] bg-protocol-cyan/5 border border-protocol-cyan/30 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.1)] group-hover:border-protocol-cyan transition-all">
                        <Globe size={48} className="text-protocol-cyan" />
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-[0.4em]">Solana_L1</p>
                        <p className="text-[8px] font-mono text-zinc-600 uppercase">Trust_Anchor</p>
                     </div>
                  </motion.div>

                  <div className="relative">
                    <div className="w-40 h-40 rounded-full border-2 border-white/5 animate-[spin_20s_linear_infinite] flex items-center justify-center">
                       <div className="w-32 h-32 rounded-full border border-protocol-violet/20 animate-[spin_10s_linear_infinite_reverse] flex items-center justify-center" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Image src="/1_1-LOGO.png" alt="Shoujiki Core" width={80} height={80} className="flicker" />
                    </div>
                  </div>

                  <motion.div 
                     whileHover={{ scale: 1.05 }}
                     className="flex flex-col items-center gap-8 group"
                  >
                     <div className="w-28 h-28 rounded-[40px] bg-protocol-violet/5 border border-protocol-violet/30 flex items-center justify-center shadow-[0_0_50px_rgba(107,33,168,0.1)] group-hover:border-protocol-violet transition-all">
                        <Cpu size={48} className="text-protocol-violet" />
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-[0.4em]">Neural_L2</p>
                        <p className="text-[8px] font-mono text-zinc-600 uppercase">Compute_Labor</p>
                     </div>
                  </motion.div>
               </div>

               {/* Particle Streams (Animated) */}
               <div className="absolute w-[80%] h-px bg-white/5 overflow-hidden">
                  <div className="w-1/4 h-full bg-gradient-to-r from-transparent via-protocol-cyan to-transparent animate-shimmer" />
                  <div className="w-1/4 h-full bg-gradient-to-l from-transparent via-protocol-violet to-transparent absolute right-0 animate-shimmer" style={{ animationDelay: '2s' }} />
               </div>
            </div>
         </div>
      </section>

      {/* PROVISION CTA - FINAL TERMINAL */}
      <section className="py-60 px-8 relative overflow-hidden">
         <div className="max-w-5xl mx-auto rounded-[80px] bg-zinc-950 border border-white/5 p-16 md:p-32 text-center space-y-20 relative group shadow-premium">
            <div className="absolute inset-0 bg-protocol-violet/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="space-y-8 relative z-10">
               <h2 className="text-6xl md:text-8xl font-black text-white uppercase italic tracking-tighter leading-[0.85]">
                  Architecture <br />
                  <span className="text-protocol-cyan">Immortal</span> <br />
                  Intelligence.
               </h2>
               <p className="text-zinc-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                  Join the sovereign network architecting the verifiable machine economy. Provision your first node today.
               </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 relative z-10">
               <Link href="/dev">
                  <Button size="lg" className="h-18 px-16 rounded-full bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-[0.3em] text-[12px] shadow-[0_20px_50px_rgba(255,255,255,0.1)]">
                     Deploy Neural Agent
                  </Button>
               </Link>
               <Link href="/marketplace">
                  <Button variant="outline" size="lg" className="h-18 px-16 rounded-full border-zinc-800 text-zinc-500 hover:text-white font-black uppercase tracking-[0.3em] text-[12px] backdrop-blur-2xl">
                     Access Registry
                  </Button>
               </Link>
            </div>
            
            <div className="pt-20 text-[10px] font-mono text-zinc-800 uppercase tracking-[0.6em] relative z-10 flicker">
               // waiting for connection handshake...
            </div>
         </div>
      </section>

      {/* FOOTER - MINIMALIST HUD */}
      <footer className="py-24 px-8 border-t border-white/5 bg-[#020203] relative z-10">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-16">
            <div className="flex items-center gap-6">
               <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-sm">
                  <Image src="/1_1-LOGO.png" alt="Shoujiki" width={40} height={40} className="flicker" />
               </div>
               <div className="text-left space-y-1">
                  <p className="text-lg font-black text-white uppercase italic tracking-tighter">Shoujiki</p>
                  <p className="text-[8px] font-mono text-zinc-700 uppercase font-black tracking-widest leading-none">Neural OS // Verifiable AI // SVM Finality</p>
               </div>
            </div>

            <div className="flex flex-wrap justify-center gap-12 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-600">
               <Link href="/protocol" className="hover:text-protocol-cyan transition-colors">Protocol</Link>
               <Link href="/governance" className="hover:text-protocol-cyan transition-colors">Governance</Link>
               <Link href="/marketplace" className="hover:text-protocol-cyan transition-colors">Registry</Link>
               <Link href="/dev" className="hover:text-protocol-cyan transition-colors">Studio</Link>
               <Link href="/legal/terms" className="hover:text-protocol-cyan transition-colors">Legal</Link>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-[10px] font-mono text-zinc-800 uppercase tracking-[0.4em]">
                 © 2026_SHOUJIKI_CORE
              </div>
              <div className="flex gap-2">
                 <div className="w-1 h-1 rounded-full bg-zinc-900" />
                 <div className="w-1 h-1 rounded-full bg-zinc-900" />
                 <div className="w-1 h-1 rounded-full bg-protocol-cyan shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
              </div>
            </div>
         </div>
      </footer>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 10s ease infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateX(500%); opacity: 0; }
        }
        .animate-shimmer {
          animation: shimmer 4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .bg-grid-pattern {
          background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .shadow-premium {
          box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8);
        }
      `}</style>
    </div>
  );
}

// Simple Helper Component
function Shield(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}
