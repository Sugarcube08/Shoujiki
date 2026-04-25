import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps {
  type: 'error' | 'success' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
}

export const Alert = ({ type, title, message, onClose }: AlertProps) => {
  const styles = {
    error: 'bg-red-500/5 border-red-500/20 text-red-400',
    success: 'bg-green-500/5 border-green-500/20 text-green-400',
    info: 'bg-blue-500/5 border-blue-500/20 text-blue-400',
  };

  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className={cn('fixed bottom-8 right-8 z-[100] w-full max-w-sm p-4 rounded-xl border flex gap-4 animate-in slide-in-from-right-4 shadow-2xl backdrop-blur-xl', styles[type])}>
      <Icon size={20} className="shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        {title && <p className="text-xs font-bold uppercase tracking-widest leading-none">{title}</p>}
        <p className="text-sm font-medium leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md transition-colors h-fit">
          <X size={14} />
        </button>
      )}
    </div>
  );
};
