"use client";

import React, { useEffect, useState } from 'react';
import { getDisputes, resolveDispute } from '@/lib/api';
import { Loader2, ShieldAlert, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function DisputePortalPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchDisputes = async () => {
    try {
      const data = await getDisputes();
      setDisputes(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch protocol disputes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
    const interval = setInterval(fetchDisputes, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string, resolution: string) => {
    setResolvingId(id);
    try {
      await resolveDispute(id, resolution, `Manual ${resolution} by Platform Authority`);
      await fetchDisputes();
    } catch (err) {
      console.error(err);
      setError(`Failed to resolve dispute ${id}`);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-zinc-900">
        <div className="space-y-1.5">
           <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Dispute Portal</h1>
           <p className="text-zinc-400 text-sm font-medium leading-relaxed">
            Monitor and resolve execution fraud reports from the Verifier Network.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="animate-spin text-zinc-600" size={32} />
          </div>
        ) : disputes.length > 0 ? (
          disputes.map(dispute => (
            <Card key={dispute.id} className="bg-[#0c0c0e] border-zinc-800/60 shadow-xl overflow-hidden flex flex-col">
              <CardHeader className="border-b border-zinc-800/60 bg-zinc-900/20 py-3 px-5 flex flex-row items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {dispute.id.slice(0, 12)}...
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest border",
                  dispute.status === 'resolved' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                  dispute.status === 'dismissed' ? "bg-zinc-800/50 text-zinc-400 border-zinc-700/50" :
                  "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                  {dispute.status === 'resolved' && <CheckCircle2 size={10} />}
                  {dispute.status === 'dismissed' && <XCircle size={10} />}
                  {dispute.status === 'open' && <Clock size={10} />}
                  {dispute.status}
                </span>
              </CardHeader>
              <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Reporter</p>
                  <p className="text-xs font-mono text-blue-400">{dispute.reporter_wallet}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Target Task</p>
                  <p className="text-xs font-mono text-zinc-300">{dispute.task_id}</p>
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Fraud Reason</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{dispute.reason}</p>
                </div>
                
                {dispute.status === 'open' ? (
                  <div className="pt-3 border-t border-zinc-800/60 mt-auto flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-9 text-[10px] uppercase tracking-widest font-bold border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => handleResolve(dispute.id, 'slash')}
                      disabled={resolvingId === dispute.id}
                      isLoading={resolvingId === dispute.id}
                    >
                      Slash Agent
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 h-9 text-[10px] uppercase tracking-widest font-bold border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      onClick={() => handleResolve(dispute.id, 'dismiss')}
                      disabled={resolvingId === dispute.id}
                      isLoading={resolvingId === dispute.id}
                    >
                      Dismiss
                    </Button>
                  </div>
                ) : dispute.resolution_details ? (
                  <div className="pt-3 border-t border-zinc-800/60 mt-auto">
                    <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">Resolution Trace</p>
                    <p className="text-[10px] text-zinc-400">{dispute.resolution_details}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-32 rounded-[32px] border border-dashed border-zinc-900 flex flex-col items-center gap-6">
            <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-700">
               <ShieldAlert size={24} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-zinc-200 font-semibold uppercase tracking-tight">No Active Disputes</p>
              <p className="text-zinc-600 text-xs max-w-xs mx-auto font-medium leading-relaxed uppercase tracking-tighter">The Verifier Network has not reported any execution fraud.</p>
            </div>
          </div>
        )}
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
    </div>
  );
}
