"use client";

import React, { useState, useEffect } from 'react';
import { getAgents, getMyAgents } from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Play, Rocket, Trash2, ArrowRight, Loader2, Info } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function SwarmsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    steps: [{ agent_id: '', input_template: '{{previous_result}}' }]
  });

  useEffect(() => {
    Promise.all([getAgents(), axios.get(`${API_URL}/workflows/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('shoujiki_token')}` }
    })])
      .then(([agentsData, workflowsRes]) => {
        setAgents(agentsData);
        setWorkflows(workflowsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addStep = () => {
    setNewWorkflow({
      ...newWorkflow,
      steps: [...newWorkflow.steps, { agent_id: '', input_template: '{{previous_result}}' }]
    });
  };

  const removeStep = (index: number) => {
    setNewWorkflow({
      ...newWorkflow,
      steps: newWorkflow.steps.filter((_, i) => i !== index)
    });
  };

  const handleCreate = async () => {
    if (!newWorkflow.name || newWorkflow.steps.some(s => !s.agent_id)) return;
    
    setCreating(true);
    try {
      const payload = {
        ...newWorkflow,
        id: newWorkflow.name.toLowerCase().replace(/\s+/g, '-'),
      };
      const res = await axios.post(`${API_URL}/workflows`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('shoujiki_token')}` }
      });
      setWorkflows([...workflows, res.data]);
      setNewWorkflow({ name: '', steps: [{ agent_id: '', input_template: '{{previous_result}}' }] });
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleRun = async (workflowId: string) => {
    try {
      const res = await axios.post(`${API_URL}/workflows/${workflowId}/run`, { initial_input: { start: true } }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('shoujiki_token')}` }
      });
      alert(`Workflow started! Run ID: ${res.data.run_id}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">Swarms</h1>
          <p className="text-zinc-500 font-medium">Chain autonomous agents into powerful workflow pipelines.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creator Section */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader>
              <h3 className="text-lg font-bold flex items-center gap-2 text-blue-400">
                <Plus size={20} />
                Build New Swarm
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Swarm Name" 
                value={newWorkflow.name}
                onChange={e => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
              />
              
              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Workflow Steps</p>
                {newWorkflow.steps.map((step, index) => (
                  <div key={index} className="space-y-2 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 relative">
                    <button 
                      onClick={() => removeStep(index)}
                      className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <p className="text-[10px] font-bold text-zinc-600">Step {index + 1}</p>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-300 outline-none focus:border-blue-500/50 transition-colors"
                      value={step.agent_id}
                      onChange={e => {
                        const steps = [...newWorkflow.steps];
                        steps[index].agent_id = e.target.value;
                        setNewWorkflow({ ...newWorkflow, steps });
                      }}
                    >
                      <option value="">Select Agent</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <textarea 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-500 font-mono h-16 outline-none focus:border-blue-500/50 transition-colors"
                      placeholder="Input Template (e.g. {{previous_result}})"
                      value={step.input_template}
                      onChange={e => {
                        const steps = [...newWorkflow.steps];
                        steps[index].input_template = e.target.value;
                        setNewWorkflow({ ...newWorkflow, steps });
                      }}
                    />
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full border-dashed border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 h-10 rounded-xl"
                  onClick={addStep}
                >
                  <Plus size={16} className="mr-2" />
                  Add Step
                </Button>
              </div>

              <Button 
                className="w-full mt-4 h-12 rounded-xl"
                onClick={handleCreate}
                isLoading={creating}
                disabled={!newWorkflow.name || newWorkflow.steps.some(s => !s.agent_id)}
              >
                Assemble Swarm
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workflows.length === 0 ? (
              <div className="col-span-2 py-24 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-zinc-900 rounded-[32px]">
                <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-700">
                  <Rocket size={32} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-zinc-300">No swarms active</p>
                  <p className="text-sm text-zinc-600">Assemble your first autonomous agent pipeline to get started.</p>
                </div>
              </div>
            ) : (
              workflows.map((wf) => (
                <Card key={wf.id} className="group hover:border-blue-500/50 transition-all">
                  <CardHeader className="flex flex-row justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">{wf.name}</h3>
                      <p className="text-xs text-zinc-500 font-mono">{wf.id}</p>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Rocket size={16} className="text-blue-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-2">
                      {wf.steps.map((step: any, i: number) => (
                        <React.Fragment key={i}>
                          <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400">
                            {agents.find(a => a.id === step.agent_id)?.name || step.agent_id}
                          </div>
                          {i < wf.steps.length - 1 && <ArrowRight size={12} className="text-zinc-700" />}
                        </React.Fragment>
                      ))}
                    </div>
                    
                    <Button 
                      className="w-full gap-2 rounded-xl h-12" 
                      variant="secondary"
                      onClick={() => handleRun(wf.id)}
                    >
                      <Play size={14} fill="currentColor" />
                      Execute Swarm
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
