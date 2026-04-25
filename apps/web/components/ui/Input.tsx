import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className, ...props }: InputProps) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-xs font-medium text-zinc-400 ml-1 uppercase tracking-wider">{label}</label>}
      <input
        className={cn(
          'flex h-10 w-full rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          error && 'border-red-500/50 focus-visible:ring-red-500/30',
          className
        )}
        {...props}
      />
      {error && <p className="text-[10px] text-red-500 ml-1 font-medium italic">{error}</p>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = ({ label, error, className, ...props }: TextAreaProps) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-xs font-medium text-zinc-400 ml-1 uppercase tracking-wider">{label}</label>}
      <textarea
        className={cn(
          'flex min-h-[120px] w-full rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-none',
          error && 'border-red-500/50 focus-visible:ring-red-500/30',
          className
        )}
        {...props}
      />
      {error && <p className="text-[10px] text-red-500 ml-1 font-medium italic">{error}</p>}
    </div>
  );
};
