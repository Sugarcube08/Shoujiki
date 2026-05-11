import React from 'react';
import { cn } from '@/lib/utils';
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertProps {
  type?: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert = ({ type = 'info', title, message, onClose, className }: AlertProps) => {
  const types = {
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      icon: CheckCircle2,
      glow: 'shadow-[0_0_15px_rgba(34,197,94,0.2)]'
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: AlertCircle,
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]'
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      icon: AlertTriangle,
      glow: 'shadow-[0_0_15px_rgba(234,179,8,0.2)]'
    },
    info: {
      bg: 'bg-protocol-cyan/10',
      border: 'border-protocol-cyan/30',
      text: 'text-protocol-cyan',
      icon: Info,
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]'
    },
  };

  const config = types[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className={cn(
        "fixed bottom-8 right-8 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl border bg-surface/90 backdrop-blur-xl transition-all shadow-premium",
        config.border, config.text, config.glow,
        className
      )}
    >
      <Icon size={18} className="shrink-0" />
      <div className="flex flex-col">
        {title && <h5 className="text-[10px] font-medium uppercase tracking-[0.2em] mb-0.5">{title}</h5>}
        <p className="text-[11px] font-medium opacity-90 uppercase tracking-widest">{message}</p>
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </motion.div>
  );
};
