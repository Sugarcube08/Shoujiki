"use client";

import { useState, useEffect, useRef } from 'react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { 
  Send, 
  Bot, 
  User, 
  Coins, 
  Clock, 
  ChevronRight, 
  Square, 
  Sparkles,
  Terminal,
  RefreshCw,
  Wallet,
  Search,
  Zap,
  LayoutGrid,
  Info,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Message {
  role: 'user' | 'agent';
  content: string;
  tokens?: number;
  cost?: number;
  files?: Record<string, string>; // filename -> b64_content
}

interface Agent {
  id: string;
  name: string;
  description: string;
  price_per_million_input_tokens: number;
  price_per_million_output_tokens: number;
}

interface SessionStats {
  id: string;
  total_input_tokens: number;
  total_output_tokens: number;
  aggregated_cost: number;
  status: 'active' | 'settled';
}

export default function AgentChatPage() {
  const { publicKey, connected, login } = useWalletAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionStats | null>(null);
  const [error, setError] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [searchTerm, setSearchSearchTerm] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load available agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await api.get('/agents');
        setAgents(res.data);
        // Try to select shoujiki-judge or first agent
        const defaultAgent = res.data.find((a: any) => a.id === 'shoujiki-judge') || res.data[0];
        if (defaultAgent) setSelectedAgent(defaultAgent);
      } catch (err) {
        console.error("Failed to load protocol agents");
      }
    };
    if (connected) fetchAgents();
  }, [connected]);

  const startSession = async (targetAgentId: string) => {
    try {
      const res = await api.post('/billing/sessions', { agent_id: targetAgentId });
      setSession(res.data);
      return res.data;
    } catch (err: any) {
      setError('Failed to initialize autonomous session.');
      return null;
    }
  };

  const switchAgent = async (agent: Agent) => {
    if (selectedAgent?.id === agent.id) return;
    setSelectedAgent(agent);
    setMessages([]);
    setSession(null);
  };

  const downloadFile = (filename: string, b64Content: string) => {
    const byteCharacters = atob(b64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !selectedAgent) return;
    
    let activeSession = session;
    if (!activeSession) {
      activeSession = await startSession(selectedAgent.id);
    }
    if (!activeSession) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const taskId = `task_${Math.random().toString(36).substr(2, 9)}`;
      
      await api.post('/agents/run', {
        agent_id: selectedAgent.id,
        task_id: taskId,
        input_data: { text: input },
        session_id: activeSession.id
      });

      // --- Real-time Polling for Result ---
      let attempts = 0;
      const poll = async () => {
        if (attempts > 30) {
          setMessages(prev => [...prev, { role: 'agent', content: "Protocol timeout: Execution taking longer than expected." }]);
          setLoading(false);
          return;
        }

        try {
          const statusRes = await api.get(`/agents/tasks/${taskId}`);
          const task = statusRes.data;

          if (task.status === 'settled' || task.status === 'completed') {
            let content = "";
            try {
              const parsed = JSON.parse(task.result);
              content = parsed.data || parsed.response || task.result;
            } catch {
              content = task.result;
            }

            const agentMsg: Message = { 
              role: 'agent', 
              content: content,
              cost: (task.input_tokens + task.output_tokens) / 1_000_000 * 0.05,
              files: task.generated_files || {}
            };
            setMessages(prev => [...prev, agentMsg]);
            
            setSession(prev => prev ? ({
              ...prev,
              aggregated_cost: prev.aggregated_cost + (agentMsg.cost || 0)
            }) : null);
            
            setLoading(false);
          } else if (task.status === 'failed') {
            setError(`Agent Execution Failed: ${task.result}`);
            setLoading(false);
          } else {
            attempts++;
            setTimeout(poll, 1500);
          }
        } catch (e) {
          attempts++;
          setTimeout(poll, 1500);
        }
      };

      poll();

    } catch (err: any) {
      setError('Autonomous execution failed.');
      setLoading(false);
    }
  };

  const settleSession = async () => {
    if (!session || session.status === 'settled') return;
    setLoading(true);
    try {
      await api.post(`/billing/sessions/${session.id}/settle`);
      setSession({ ...session, status: 'settled' });
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: `Conversation finalized. Economics optimized and settled to your identity.` 
      }]);
    } catch (err) {
      setError('Settlement failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-6 animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-protocol-cyan/10 rounded-3xl flex items-center justify-center text-protocol-cyan border border-protocol-cyan/20 shadow-2xl">
          <Bot size={40} />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Establish Economic Identity</h1>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto font-medium">Link your wallet to engage with autonomous agents on the Shoujiki Network.</p>
        </div>
        <Button onClick={login} className="h-12 px-10 rounded-2xl bg-protocol-violet hover:bg-protocol-cyan shadow-xl shadow-blue-900/20 font-bold uppercase tracking-widest text-[10px]">
          <Wallet size={16} className="mr-2" /> Connect Wallet
        </Button>
      </div>
    );
  }

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto h-[88vh] flex gap-8 px-4 lg:px-8">
      
      {/* 1. Agent Discovery Sidebar */}
      <div className="w-80 flex flex-col gap-6 shrink-0 hidden xl:flex">
        <Card className="flex-1 bg-[#09090b] border-zinc-800/40 rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-6 border-b border-zinc-800/40 bg-zinc-900/10">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Protocol_Nodes</h3>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-protocol-cyan transition-colors" size={14} />
              <input 
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-[11px] text-zinc-400 outline-none focus:border-protocol-cyan/50 transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
            {filteredAgents.map(agent => (
              <div
                key={agent.id}
                onClick={() => switchAgent(agent)}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer transition-all group",
                  selectedAgent?.id === agent.id 
                    ? "bg-protocol-violet border-protocol-cyan text-white shadow-lg shadow-blue-900/20" 
                    : "bg-zinc-900/30 border-zinc-800/50 text-zinc-500 hover:bg-zinc-900 hover:border-zinc-700 hover:text-zinc-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border",
                    selectedAgent?.id === agent.id ? "bg-white/20 border-white/20" : "bg-zinc-950 border-zinc-800"
                  )}>
                    <Bot size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate tracking-tight">{agent.name}</p>
                    <p className={cn(
                      "text-[8px] font-medium uppercase tracking-widest",
                      selectedAgent?.id === agent.id ? "text-white/60" : "text-zinc-600"
                    )}>{agent.id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-zinc-800/40 bg-zinc-900/5">
            <div className="flex items-center gap-2 text-zinc-600">
              <LayoutGrid size={12} />
              <span className="text-[9px] font-bold uppercase tracking-widest">{agents.length} Nodes Online</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Conversation Pane */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* Economics Header */}
        <div className="flex flex-col lg:flex-row items-center justify-between p-4 bg-[#09090b] border border-zinc-800/50 rounded-[28px] shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-protocol-cyan/10 rounded-2xl flex items-center justify-center text-protocol-cyan border border-protocol-cyan/20 shadow-inner">
              <Bot size={24} />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                {selectedAgent?.name || 'Protocol Node'}
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mt-1" />
              </h2>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">{selectedAgent?.id || '...'}</p>
            </div>
          </div>

          <div className="flex items-center gap-8 mt-4 lg:mt-0 px-8 py-3 bg-zinc-950/80 rounded-[22px] border border-zinc-800/50 shadow-inner">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Accrued_Cost</span>
              <div className="flex items-center gap-2 text-protocol-cyan font-mono text-sm font-black italic">
                <Coins size={14} className="text-protocol-cyan/50" />
                {(session?.aggregated_cost ?? 0).toFixed(6)} SOL
              </div>
            </div>
            
            <div className="w-px h-8 bg-zinc-800" />
            
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Compute_Rate</span>
              <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                {selectedAgent?.price_per_million_output_tokens || 0.05} SOL/1M
              </div>
            </div>

            <Button 
              onClick={settleSession}
              disabled={!session || session.status === 'settled'}
              className="h-10 px-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest gap-2 shadow-xl"
            >
              <Square size={12} className="fill-orange-500 text-orange-500" /> Settle
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 bg-[#09090b] border-zinc-800/40 rounded-[36px] overflow-hidden flex flex-col shadow-2xl">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 custom-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-8 py-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-protocol-cyan/20 blur-2xl rounded-full animate-pulse" />
                  <Sparkles size={64} strokeWidth={1} className="relative text-protocol-cyan/40" />
                </div>
                <div className="text-center space-y-3">
                  <p className="text-[12px] font-black uppercase tracking-[0.5em] text-zinc-500">
                    Awaiting_Input
                  </p>
                  <p className="text-xs text-zinc-700 font-medium max-w-[280px]">
                    Autonomous billing cycles activate upon initial protocol handshake.
                  </p>
                </div>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex items-start gap-6 group animate-in slide-in-from-bottom-4 duration-700",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-500 group-hover:scale-110",
                  msg.role === 'user' ? "bg-zinc-950 border-zinc-800 text-zinc-500" : "bg-protocol-violet border-protocol-cyan text-white shadow-2xl shadow-blue-900/30"
                )}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={cn(
                  "max-w-[75%] space-y-3",
                  msg.role === 'user' ? "text-right" : "text-left"
                )}>
                  <div className={cn(
                    "px-7 py-5 rounded-[28px] text-[15px] leading-relaxed font-medium shadow-sm",
                    msg.role === 'user' ? "bg-zinc-900 text-zinc-100 rounded-tr-none" : "bg-[#111114] border border-white/[0.03] text-zinc-300 rounded-tl-none"
                  )}>
                    {msg.content}

                    {msg.files && Object.keys(msg.files).length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-left">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <LayoutGrid size={10} /> Generated Artifacts
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(msg.files).map(([name, content]) => (
                            <button
                              key={name}
                              onClick={() => downloadFile(name, content)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-protocol-cyan/10 border border-protocol-cyan/20 rounded-lg text-blue-400 text-[11px] font-bold hover:bg-protocol-cyan/20 transition-all"
                            >
                              <Save size={12} /> {name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.cost && (
                    <div className={cn(
                      "flex items-center gap-4 text-[10px] font-black text-zinc-700 uppercase tracking-tighter",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}>
                      <span className="hover:text-zinc-400 transition-colors cursor-help flex items-center gap-1.5">
                        <Terminal size={10} /> {Math.random().toString(16).slice(2, 10)}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-zinc-800" />
                      <span className="text-protocol-cyan/60">+{msg.cost.toFixed(6)} SOL Accrued</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-6 animate-pulse">
                <div className="w-10 h-10 bg-protocol-violet/10 rounded-2xl border border-protocol-cyan/20 flex items-center justify-center text-protocol-cyan shadow-inner">
                  <RefreshCw size={18} className="animate-spin" />
                </div>
                <div className="px-8 py-5 bg-zinc-900/50 rounded-[28px] rounded-tl-none border border-zinc-800/40">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-protocol-cyan rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-protocol-cyan rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-protocol-cyan rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Zone */}
          <div className="p-8 bg-zinc-950/60 border-t border-zinc-800/30 backdrop-blur-md">
            <div className="relative group max-w-4xl mx-auto">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask ${selectedAgent?.name || 'Protocol Node'}...`}
                className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-[22px] py-5 pl-8 pr-24 text-[15px] text-zinc-100 outline-none focus:border-protocol-cyan/40 transition-all resize-none shadow-2xl custom-scrollbar placeholder:text-zinc-700 font-medium"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button 
                  onClick={handleSend} 
                  disabled={!input.trim() || loading}
                  className="h-12 w-12 p-0 rounded-[18px] bg-protocol-violet hover:bg-protocol-cyan shadow-2xl shadow-blue-900/40 transition-all active:scale-95"
                >
                  <Send size={22} />
                </Button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between max-w-4xl mx-auto px-4">
              <div className="flex items-center gap-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                <div className="flex items-center gap-2 transition-colors hover:text-zinc-400 cursor-default">
                  <Terminal size={12} className="text-protocol-cyan/50" /> Runtime: Python
                </div>
                <div className="flex items-center gap-2 transition-colors hover:text-zinc-400 cursor-default">
                  <RefreshCw size={12} className="text-protocol-cyan/50" /> Sync: Web3_Escrow
                </div>
              </div>
              <div className="group flex items-center gap-2 text-zinc-700 cursor-help">
                <Info size={12} />
                <p className="text-[10px] font-bold uppercase tracking-widest group-hover:text-zinc-500 transition-colors">Usage-Linked Settlement</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} className="fixed bottom-10 left-1/2 -translate-x-1/2 max-w-md w-full z-[100] shadow-2xl border-red-500/20" />}
    </div>
  );
}
