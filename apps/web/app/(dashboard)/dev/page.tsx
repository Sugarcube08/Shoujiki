"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { testAgent } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Zap, CloudUpload, History, Database, Sparkles } from 'lucide-react';
import {
  Code2,
  Rocket,
  FileCode,
  Plus,
  Trash2,
  Play,
  Terminal,
  Cpu,
  Layers,
  ChevronRight,
  MonitorPlay,
  Save,
  CheckCircle2,
  Copy,
  Check,
  Settings,
  Info
} from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import Editor from "@monaco-editor/react";
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

export default function DevSpacePage() {
  const router = useRouter();
  const { isAuthenticated, login, connected } = useWalletAuth();

  const [metadata, setMetadata] = useState({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'agent-' + Date.now(),
    name: '',
    description: '',
    price_per_million_input_tokens: 0.01,
    price_per_million_output_tokens: 0.05,
  });

  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  const [isSaving, setIsSaving] = useState(false);

  const getEnvVarsDict = () => {
    const vars: Record<string, string> = {};
    envVars.forEach(ev => {
      if (ev.key.trim()) {
        vars[ev.key.trim()] = ev.value;
      }
    });
    return vars;
  };

  const [files, setFiles] = useState<Record<string, string>>({
    'main.py': `from shoujiki import shoujiki
import requests
import json

class Agent:
    def run(self, input_data):
        # Neural logic here
        text = input_data.get("text", "Protocol")
        
        # We return a transformed result in the 'data' key
        # This ensures compatibility with Swarm OS orchestrators
        return {
            "status": "success",
            "data": f"Handshake_Success: '{text}' has been validated by Protocol_Node"
        }

agent = Agent()`,
    'utils.py': '# Utilities library\\ndef format_msg(msg):\\n    return f"log: {msg}"'
  });

  const [selectedFile, setSelectedFile] = useState('main.py');
  const [requirements, setRequirements] = useState<string[]>(['requests']);
  const [newDep, setNewDep] = useState('');
  const [entrypoint, setEntrypoint] = useState('main.py');

  const [testInput, setTestInput] = useState('{"text": "Explain Shoujiki."}');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Persistence: Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('shoujiki_studio_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.metadata) setMetadata(parsed.metadata);
        if (parsed.files) setFiles(parsed.files);
        if (parsed.envVars) setEnvVars(parsed.envVars);
        if (parsed.testInput) setTestInput(parsed.testInput);
        if (parsed.requirements) setRequirements(parsed.requirements);
      } catch (e) {
        console.error("Failed to load studio state", e);
      }
    }
  }, []);

  // Persistence: Save to localStorage (Debounced indicator)
  useEffect(() => {
    setIsSaving(true);
    const state = { metadata, files, envVars, testInput, requirements };
    localStorage.setItem('shoujiki_studio_state', JSON.stringify(state));
    const timer = setTimeout(() => setIsSaving(false), 800);
    return () => clearTimeout(timer);
  }, [metadata, files, envVars, testInput, requirements]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFile = () => {
    const filename = prompt('Enter filename (e.g. data.py):');
    if (filename && !files[filename]) {
      setFiles({ ...files, [filename]: '# Init' });
      setSelectedFile(filename);
    }
  };

  const handleDeleteFile = (filename: string) => {
    if (filename === 'main.py') return;
    if (confirm(`Delete ${filename}?`)) {
      const newFiles = { ...files };
      delete newFiles[filename];
      setFiles(newFiles);
      if (selectedFile === filename) setSelectedFile('main.py');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setTestResult(null);
    try {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(testInput);
      } catch (e) {
        throw new Error("Invalid JSON in Test Input");
      }

      const res = await testAgent({
        ...metadata,
        id: metadata.id || 'test-agent',
        name: metadata.name || 'Test Agent',
        files,
        requirements,
        entrypoint,
        input_data: parsedInput,
        env_vars: getEnvVarsDict(),
      });
      setTestResult(res);
      if (res.result) setSuccessMsg('Protocol verification pass.');
    } catch (err: any) {
      setError(err.message || err.response?.data?.detail || 'Simulation aborted');
    } finally {
      setTesting(false);
    }
  };

  const handleDeploy = () => {
    if (!isAuthenticated) {
      setError('Please Link Identity first');
      return;
    }
    if (!metadata.id.trim() || !metadata.name.trim()) {
      setError('Missing metadata identifiers (ID and Name are required)');
      return;
    }
    const draft = { ...metadata, files, requirements, entrypoint, env_vars: getEnvVarsDict(), version: 'v' + Date.now() };
    localStorage.setItem('shoujiki_draft', JSON.stringify(draft));
    router.push('/deploy');
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-8 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-surface border border-surface-border rounded-2xl flex items-center justify-center text-zinc-600 shadow-premium">
          <Terminal size={32} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-zinc-100">Development Environment Restricted</h2>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto">Authorize your wallet to access the Agent SDK and cloud runtime.</p>
        </div>
        <Button onClick={login} className="rounded-xl px-10 h-12 shadow-xl">Link Identity</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 animate-in fade-in duration-1000 px-4 lg:px-8">
      {/* Action Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-surface-border">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
              <Cpu className="text-protocol-cyan" /> Agent Studio
            </h1>
            <div className={cn(
              "px-2 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wider transition-all duration-500",
              isSaving ? "bg-protocol-violet/10 text-protocol-violet border-protocol-violet/20 opacity-100" : "opacity-0"
            )}>
              Autosaving...
            </div>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Build, verify, and deploy autonomous entities to the Shoujiki Network.</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <Button variant="outline" onClick={handleTest} isLoading={testing} className="flex-1 lg:flex-none h-11 px-6 rounded-xl text-xs font-medium gap-2">
            <Play size={14} className="text-protocol-cyan fill-protocol-cyan/20" />
            Run Bench
          </Button>
          <Button onClick={handleDeploy} className="flex-1 lg:flex-none h-11 px-8 rounded-xl text-xs font-medium gap-2 shadow-protocol-glow bg-protocol-violet hover:bg-purple-700 text-white border-none">
            <Rocket size={14} />
            Deploy Fleet
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Workspace Panels (Sidebar) */}
        <div className="w-full xl:w-[350px] space-y-6 shrink-0">
          {/* Files Card */}
          <Card className="shadow-premium rounded-[24px]">
            <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b border-surface-border bg-background">
              <div className="flex items-center gap-2">
                <FileCode size={14} className="text-zinc-500" />
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Files</span>
              </div>
              <button onClick={handleAddFile} className="p-1.5 hover:bg-surface-hover rounded-md transition-colors text-zinc-400 hover:text-zinc-100">
                <Plus size={14} />
              </button>
            </CardHeader>
            <div className="p-2 space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar">
              {Object.keys(files).map(filename => (
                <div
                  key={filename}
                  onClick={() => setSelectedFile(filename)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all group border",
                    selectedFile === filename
                      ? 'bg-protocol-violet/5 text-zinc-100 border-protocol-violet/20'
                      : 'text-zinc-500 hover:bg-surface hover:text-zinc-300 border-transparent'
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileCode size={14} className={selectedFile === filename ? 'text-protocol-cyan' : 'text-zinc-600'} />
                    <span className="text-xs font-medium truncate">{filename}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entrypoint === filename && (
                      <div className="w-1.5 h-1.5 rounded-full bg-protocol-cyan" title="Entrypoint" />
                    )}
                    {filename !== 'main.py' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteFile(filename); }} 
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Requirements Card */}
          <Card className="shadow-premium rounded-[24px]">
            <CardHeader className="py-4 px-6 border-b border-surface-border bg-background flex items-center gap-2">
              <Database size={14} className="text-zinc-500" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Runtime Requirements</span>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  placeholder="e.g. requests"
                  value={newDep}
                  onChange={e => setNewDep(e.target.value.toLowerCase())}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newDep.trim()) {
                      if (!requirements.includes(newDep.trim())) {
                        setRequirements([...requirements, newDep.trim()]);
                      }
                      setNewDep('');
                    }
                  }}
                  className="w-full bg-background border border-surface-border rounded-lg h-9 px-3 text-[10px] font-mono text-zinc-400 focus:border-zinc-500 outline-none transition-all"
                />
                <button 
                  onClick={() => {
                    if (newDep.trim() && !requirements.includes(newDep.trim())) {
                      setRequirements([...requirements, newDep.trim()]);
                      setNewDep('');
                    }
                  }} 
                  className="h-9 px-3 bg-surface hover:bg-surface-hover rounded-lg text-zinc-400 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {requirements.map(req => (
                  <div key={req} className="flex items-center gap-2 px-3 py-1 bg-surface border border-surface-border rounded-full text-[10px] font-mono text-zinc-400">
                    {req}
                    <button onClick={() => setRequirements(requirements.filter(r => r !== req))} className="hover:text-red-400">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metadata Card */}
          <Card className="shadow-premium rounded-[24px]">
            <CardHeader className="py-4 px-6 border-b border-surface-border bg-background flex items-center gap-2">
              <Settings size={14} className="text-zinc-500" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Metadata</span>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Agent Identity</label>
                <div className="relative group">
                  <Input
                    value={metadata.id}
                    onChange={e => setMetadata({ ...metadata, id: e.target.value })}
                    className="h-9 text-[10px] font-mono bg-background pr-8 overflow-hidden text-ellipsis"
                    readOnly
                  />
                  <button 
                    onClick={() => copyToClipboard(metadata.id)} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Display Name</label>
                <Input
                  placeholder="e.g. Protocol Node"
                  value={metadata.name}
                  onChange={e => setMetadata({ ...metadata, name: e.target.value })}
                  className="h-9 text-xs bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-border mt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                    <CloudUpload size={10} /> In (SOL)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={metadata.price_per_million_input_tokens}
                    onChange={e => setMetadata({ ...metadata, price_per_million_input_tokens: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-background border border-surface-border rounded-lg h-9 px-3 text-[10px] font-mono text-zinc-400 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                    <History size={10} /> Out (SOL)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={metadata.price_per_million_output_tokens}
                    onChange={e => setMetadata({ ...metadata, price_per_million_output_tokens: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-background border border-surface-border rounded-lg h-9 px-3 text-[10px] font-mono text-zinc-400 outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environment Card */}
          <Card className="shadow-premium rounded-[24px]">
            <CardHeader className="py-4 px-6 border-b border-surface-border bg-background flex flex-row justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-zinc-500" />
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Environment</span>
              </div>
              <button onClick={() => setEnvVars([...envVars, { key: '', value: '' }])} className="text-zinc-500 hover:text-zinc-100 transition-colors p-1.5 bg-surface rounded-lg">
                <Plus size={14} />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {envVars.map((ev, idx) => (
                <div key={idx} className="flex gap-2 group">
                  <input
                    placeholder="KEY"
                    value={ev.key}
                    onChange={e => {
                      const newVars = [...envVars];
                      newVars[idx].key = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
                      setEnvVars(newVars);
                    }}
                    className="w-full bg-background border border-surface-border rounded-lg h-9 px-3 text-[10px] font-mono text-zinc-400 focus:border-zinc-500 outline-none transition-all"
                  />
                  <input
                    placeholder="VALUE"
                    value={ev.value}
                    type="password"
                    onChange={e => {
                      const newVars = [...envVars];
                      newVars[idx].value = e.target.value;
                      setEnvVars(newVars);
                    }}
                    className="w-full bg-background border border-surface-border rounded-lg h-9 px-3 text-[10px] font-mono text-zinc-400 focus:border-zinc-500 outline-none transition-all"
                  />
                  <button
                    onClick={() => {
                      const newVars = envVars.filter((_, i) => i !== idx);
                      if (newVars.length === 0) newVars.push({ key: '', value: '' });
                      setEnvVars(newVars);
                    }}
                    className="text-zinc-600 hover:text-red-400 p-2"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Editor Zone (Main) */}
        <div className="flex-1 flex flex-col gap-8 min-w-0 w-full">
          {/* Code Editor */}
          <Card className="flex flex-col overflow-hidden rounded-[24px] shadow-premium">
            <div className="px-8 py-4 border-b border-surface-border flex items-center justify-between bg-surface backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-full border border-surface-border">
                  <div className="w-1.5 h-1.5 rounded-full bg-protocol-cyan animate-pulse" />
                  <span className="text-[11px] font-medium text-zinc-300 tracking-tight">{selectedFile}</span>
                </div>
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Python 3.11</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-px bg-surface-border mx-2" />
                <button onClick={() => setSelectedFile('main.py')} className="text-[10px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors uppercase tracking-widest">Reset View</button>
              </div>
            </div>
            <div className="h-[500px] w-full">
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={files[selectedFile]}
                onChange={(val) => setFiles({ ...files, [selectedFile]: val || '' })}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 20 },
                  fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace'
                }}
              />
            </div>
          </Card>

          {/* Execution/Bench Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Test Input Panel */}
            <Card className="shadow-premium rounded-[24px] flex flex-col min-h-[400px]">
              <CardHeader className="py-4 px-8 border-b border-surface-border bg-background flex items-center gap-2 shrink-0">
                <Terminal size={14} className="text-zinc-500" />
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Bench Input (JSON)</span>
              </CardHeader>
              <CardContent className="p-8 flex-1 flex flex-col">
                <textarea 
                  className="w-full flex-1 bg-background border border-surface-border rounded-2xl p-6 text-[13px] font-mono text-zinc-400 outline-none focus:border-protocol-cyan transition-all resize-none shadow-inner leading-relaxed"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder='{"key": "value"}'
                />
                <div className="mt-6 flex items-center gap-2 text-zinc-600 bg-surface p-3 rounded-xl border border-surface-border">
                  <Info size={12} className="shrink-0 text-protocol-cyan" />
                  <p className="text-[11px] font-medium italic">Payload passed to the agent.run() method during protocol verification.</p>
                </div>
              </CardContent>
            </Card>

            {/* Live Console */}
            <Card className="overflow-hidden rounded-[24px] shadow-premium flex flex-col min-h-[400px]">
              <CardHeader className="py-4 px-8 border-b border-surface-border flex flex-row items-center justify-between bg-background shrink-0">
                <div className="flex items-center gap-2">
                  <MonitorPlay size={14} className="text-protocol-cyan" />
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Live Bench Output</span>
                </div>
                {(testResult || error) && (
                  <button
                    onClick={() => copyToClipboard(error || JSON.stringify(testResult, null, 2))}
                    className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    {copied ? (
                      <><Check size={14} className="text-green-500" /> Copied</>
                    ) : (
                      <><Copy size={14} /> Copy</>
                    )}
                  </button>
                )}
              </CardHeader>
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar font-mono text-[12px] leading-relaxed bg-surface/50">
                {testing ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500 animate-pulse">
                    <Sparkles size={24} className="animate-spin text-protocol-violet" />
                    <span className="text-[10px] font-medium uppercase tracking-widest">Executing Protocol Simulation...</span>
                  </div>
                ) : error ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-red-400 font-medium uppercase text-[10px]">
                      <Zap size={12} /> Bench_Fault:
                    </div>
                    <div className="text-red-400/80 bg-red-400/5 p-6 rounded-2xl border border-red-400/10 whitespace-pre-wrap leading-loose">{error}</div>
                  </div>
                ) : testResult ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-green-500 font-medium uppercase text-[10px] flex items-center gap-2">
                        <CheckCircle2 size={12} /> Verification_Passed
                      </p>
                      <span className="text-[10px] font-medium text-zinc-600 truncate ml-4 bg-background px-2 py-0.5 rounded border border-surface-border max-w-[150px]">Trace: {testResult.execution_receipt?.slice(0, 12)}...</span>
                    </div>
                    <pre className="text-zinc-400 bg-background p-6 rounded-2xl border border-surface-border whitespace-pre-wrap leading-loose text-[11px] shadow-inner">{JSON.stringify(testResult.result || testResult, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 opacity-10 py-10">
                    <Terminal size={48} strokeWidth={1} />
                    <p className="text-[11px] font-medium uppercase tracking-[0.3em]">Awaiting Instruction</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
    </div>
  );
}

