"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
  Connection,
  NodeProps,
  Edge,
  Node,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Square, Bot, GitBranch, Save, Trash2, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { validateWorkflow } from '@/lib/api';

// --- Custom Nodes ---

const nodeStyle = "px-4 py-3 rounded-xl border bg-[#0c0c0e] shadow-2xl relative group";

const StartNode = ({ data }: NodeProps) => (
  <div className={`${nodeStyle} border-green-500/50 bg-green-500/5 min-w-[120px] text-center`}>
    <div className="flex items-center justify-center gap-2 text-green-400 font-black tracking-widest text-[10px] uppercase">
      <Play size={12} /> Start
    </div>
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500 border-2 border-[#0c0c0e]" />
  </div>
);

const EndNode = ({ data }: NodeProps) => (
  <div className={`${nodeStyle} border-red-500/50 bg-red-500/5 min-w-[120px] text-center`}>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500 border-2 border-[#0c0c0e]" />
    <div className="flex items-center justify-center gap-2 text-red-400 font-black tracking-widest text-[10px] uppercase">
      <Square size={12} /> End
    </div>
  </div>
);

const AgentNode = ({ id, data }: NodeProps) => {
  const agents = data.agents as any[] || [];
  const selectedAgent = agents.find(a => a.id === data.agent_id);
  
  return (
    <div className={`${nodeStyle} border-blue-500/50 bg-blue-500/5 min-w-[240px]`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-[#0c0c0e]" />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-blue-400 font-bold tracking-widest text-[10px] uppercase">
          <Bot size={12} /> Executor Agent
        </div>
        {selectedAgent && (
          <div className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[8px] font-bold text-blue-300 uppercase">
            v{selectedAgent.current_version}
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-[8px] text-zinc-500 uppercase font-bold">Select Intelligence</label>
          <select 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[10px] font-medium text-zinc-200 outline-none focus:border-blue-500/50 transition-colors"
            value={data.agent_id as string || ''}
            onChange={(e) => (data as any).onChange(id, 'agent_id', e.target.value)}
          >
            <option value="">Choose Agent...</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        
        {selectedAgent && (
          <div className="space-y-2">
            <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
              <p className="text-[9px] text-zinc-400 line-clamp-2 leading-relaxed">
                {selectedAgent.description || 'No description provided.'}
              </p>
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <label className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter">Sample Trace Output</label>
              <textarea 
                placeholder="Agent response for dry-runs..." 
                className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[9px] font-medium text-zinc-400 outline-none focus:border-orange-500/30 resize-none transition-all"
                value={data.sample_output as string || ''}
                onChange={(e) => (data as any).onChange(id, 'sample_output', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-[#0c0c0e]" />
    </div>
  );
};

const ConditionNode = ({ id, data }: NodeProps) => (
  <div className={`${nodeStyle} border-purple-500/50 bg-purple-500/5 min-w-[220px]`}>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500 border-2 border-[#0c0c0e]" />
    <div className="flex items-center gap-2 mb-3 text-purple-400 font-bold tracking-widest text-[10px] uppercase">
      <GitBranch size={12} /> Logic Gate (IF)
    </div>
    <div className="space-y-2">
      <div className="flex flex-col gap-1">
        <label className="text-[8px] text-zinc-500 uppercase font-bold">Field to check</label>
        <Input 
          placeholder="e.g. data.status" 
          className="h-7 text-[10px] bg-zinc-950 border-zinc-800"
          value={data.field as string || ''}
          onChange={(e) => (data as any).onChange(id, 'field', e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[8px] text-zinc-500 uppercase font-bold">Expected Value</label>
        <Input 
          placeholder="e.g. 200" 
          className="h-7 text-[10px] bg-zinc-950 border-zinc-800"
          value={data.value as string || ''}
          onChange={(e) => (data as any).onChange(id, 'value', e.target.value)}
        />
      </div>
    </div>
    
    {/* Multiple Outputs */}
    <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex flex-col gap-8">
      <div className="relative">
        <Handle 
          type="source" 
          position={Position.Right} 
          id="true"
          className="w-3 h-3 bg-green-500 border-2 border-[#0c0c0e]" 
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-green-500 uppercase">True</span>
      </div>
      <div className="relative">
        <Handle 
          type="source" 
          position={Position.Right} 
          id="false"
          className="w-3 h-3 bg-red-500 border-2 border-[#0c0c0e]" 
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-red-500 uppercase">False</span>
      </div>
    </div>
  </div>
);

const IntentNode = ({ id, data }: NodeProps) => {
  const paths = data.paths as Record<string, any> || {
    'path_1': { anchors: 'refund, money, return', label: 'Refund' },
    'path_2': { anchors: 'help, support, bug', label: 'Support' }
  };

  const updatePath = (pathId: string, field: string, value: string) => {
    const newPaths = { ...paths };
    newPaths[pathId] = { ...newPaths[pathId], [field]: value };
    (data as any).onChange(id, 'paths', newPaths);
  };

  const addPath = () => {
    const newId = `path_${Object.keys(paths).length + 1}`;
    const newPaths = { ...paths, [newId]: { anchors: '', label: `Intent ${Object.keys(paths).length + 1}` } };
    (data as any).onChange(id, 'paths', newPaths);
  };

  const removePath = (pathId: string) => {
    if (Object.keys(paths).length <= 1) return;
    const newPaths = { ...paths };
    delete newPaths[pathId];
    (data as any).onChange(id, 'paths', newPaths);
  };

  return (
    <div className={`${nodeStyle} border-orange-500/50 bg-orange-500/5 min-w-[280px]`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500 border-2 border-[#0c0c0e]" />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-orange-400 font-bold tracking-widest text-[10px] uppercase">
          <Zap size={12} className="fill-orange-400/20" /> Semantic Router
        </div>
        <button onClick={addPath} className="p-1 hover:bg-orange-500/20 rounded text-orange-500 transition-colors">
          <Plus size={10} />
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(paths).map(([pathId, config]) => (
          <div key={pathId} className="relative bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50 group/path">
            <div className="flex items-center justify-between mb-1.5">
              <input 
                className="bg-transparent text-[9px] font-black uppercase text-zinc-300 outline-none w-2/3"
                value={config.label}
                onChange={(e) => updatePath(pathId, 'label', e.target.value)}
              />
              <button onClick={() => removePath(pathId)} className="opacity-0 group-hover/path:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                <Trash2 size={10} />
              </button>
            </div>
            <textarea 
              placeholder="Keywords (anchors)..."
              className="w-full bg-zinc-900 border border-zinc-800/50 rounded p-1.5 text-[9px] font-mono text-zinc-400 outline-none focus:border-orange-500/30 resize-none h-12"
              value={config.anchors}
              onChange={(e) => updatePath(pathId, 'anchors', e.target.value)}
            />
            
            {/* Semantic Handle */}
            <div className="absolute -right-7 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-[7px] font-bold text-orange-500/60 uppercase pointer-events-none">Path</span>
              <Handle 
                type="source" 
                position={Position.Right} 
                id={pathId}
                className="w-3 h-3 bg-orange-500 border-2 border-[#0c0c0e]" 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const nodeTypes = {
  START: StartNode,
  END: EndNode,
  AGENT: AgentNode,
  CONDITION: ConditionNode,
  INTENT: IntentNode,
};

// --- Flow Builder Component ---

interface SwarmFlowBuilderProps {
  agents: any[];
  onSave: (workflow: any) => void;
  isLoading: boolean;
}

const initialNodes: Node[] = [
  { id: 'start', type: 'START', position: { x: 50, y: 200 }, data: {} },
  { id: 'end', type: 'END', position: { x: 800, y: 200 }, data: {} }
];

function Flow({ agents, onSave, isLoading }: SwarmFlowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState('');
  const [isSimulation, setIsSimulation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (nodes.length < 2) return;
      
      setIsValidating(true);
      try {
        const formattedNodes = nodes.map(n => {
          const config = { ...n.data };
          delete (config as any).agents;
          delete (config as any).onChange;
          return {
            id: n.id,
            type: n.type,
            config: config,
          };
        });
        const formattedEdges = edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          source_handle: e.sourceHandle,
        }));

        const res = await validateWorkflow({ 
          name: name || 'unnamed', 
          nodes: formattedNodes, 
          edges: formattedEdges 
        });
        setValidationErrors(res.errors || []);
      } catch (err) {
        console.error("Validation failed", err);
      } finally {
        setIsValidating(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [nodes, edges, name]);

  const updateNodeData = useCallback((id: string, key: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, [key]: value } };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Inject agents and updateNodeData into agent/condition/intent nodes
  const nodesWithData = nodes.map(node => {
    if (node.type === 'AGENT' || node.type === 'CONDITION' || node.type === 'INTENT') {
      return {
        ...node,
        data: {
          ...node.data,
          agents,
          onChange: updateNodeData
        }
      };
    }
    return node;
  });

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({
    ...params,
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
  }, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      // Approximate coordinates
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      };

      let initialData = {};
      if (type === 'AGENT') initialData = { agent_id: '', sample_output: 'Standard successful execution response.' };
      else if (type === 'CONDITION') initialData = { field: '', value: '' };
      else if (type === 'INTENT') initialData = {
        paths: {
          'path_1': { anchors: 'yes, success, okay', label: 'Positive' },
          'path_2': { anchors: 'no, fail, error', label: 'Negative' }
        }
      };

      const newNode = {
        id: `${type.toLowerCase()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        position,
        data: initialData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleSave = () => {
    // Map to backend expected format
    const formattedNodes = nodes.map(n => {
      const config = { ...n.data };
      delete config.agents;
      delete config.onChange;
      return {
        id: n.id,
        type: n.type,
        config: config,
        position: n.position
      };
    });

    const formattedEdges = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      source_handle: e.sourceHandle,
      condition: '' 
    }));

    onSave({
      id: `wf_${Math.random().toString(36).substr(2, 9)}`,
      name,
      nodes: formattedNodes,
      edges: formattedEdges,
      is_simulation_mode: isSimulation
    });
  };

  return (
    <div className="flex w-full h-[600px] border border-zinc-800 rounded-[24px] overflow-hidden bg-[#050505]">
      {/* Drag & Drop Palette */}
      <div className="w-64 border-r border-zinc-800 bg-[#09090b] flex flex-col">
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/30">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-1">Protocol Architect</h3>
          <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">Drag nodes onto the board to build your non-deterministic swarm.</p>
        </div>
        
        <div className="flex-1 p-5 space-y-4">
          <div 
            className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center gap-3 cursor-grab hover:bg-blue-500/10 transition-colors"
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'AGENT')}
            draggable
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><Bot size={16} /></div>
            <div>
              <p className="text-xs font-bold text-zinc-200">Executor Agent</p>
              <p className="text-[9px] text-zinc-500 font-medium">Specialized node worker</p>
            </div>
          </div>

          <div 
            className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center gap-3 cursor-grab hover:bg-purple-500/10 transition-colors"
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'CONDITION')}
            draggable
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400"><GitBranch size={16} /></div>
            <div>
              <p className="text-xs font-bold text-zinc-200">Logic Gate</p>
              <p className="text-[9px] text-zinc-500 font-medium">Conditional routing</p>
            </div>
          </div>

          <div 
            className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 flex items-center gap-3 cursor-grab hover:bg-orange-500/10 transition-colors"
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'INTENT')}
            draggable
          >
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400"><Zap size={16} className="fill-orange-400/20" /></div>
            <div>
              <p className="text-xs font-bold text-zinc-200">Intent Router</p>
              <p className="text-[9px] text-zinc-500 font-medium">Semantic multi-path</p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/30 space-y-4">
          <Input 
            placeholder="Protocol Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-950 border-zinc-800 h-10 text-xs"
          />

          <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-300">Visual Trace Mode</span>
              <span className="text-[8px] text-zinc-500 font-medium italic">Local zero-cost traversal</span>
            </div>
            <input 
              type="checkbox" 
              checked={isSimulation}
              onChange={(e) => setIsSimulation(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-500 focus:ring-blue-500/20"
            />
          </div>

          {validationErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1">
              <p className="text-[8px] font-black text-red-400 uppercase tracking-tighter">Validation Failed</p>
              {validationErrors.map((err, i) => (
                <p key={i} className="text-[9px] text-red-300/70 leading-tight">• {err}</p>
              ))}
            </div>
          )}

          <Button 
            className="w-full h-10 rounded-xl font-bold gap-2 text-xs shadow-xl shadow-blue-900/10" 
            onClick={handleSave} 
            isLoading={isLoading || isValidating}
            disabled={!name || nodes.length < 2 || validationErrors.length > 0}
          >
            <Zap size={14} /> {isSimulation ? 'Trace Swarm' : 'Register Swarm'}
          </Button>
        </div>
      </div>

      {/* Board Zone */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodesWithData}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#050505]"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272a" />
          <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400" />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function SwarmFlowBuilder(props: SwarmFlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}
