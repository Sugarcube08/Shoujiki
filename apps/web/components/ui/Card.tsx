import React from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm', className)}>
    {children}
  </div>
);

export const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('px-6 py-5 flex flex-col gap-1.5', className)}>
    {children}
  </div>
);

export const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('px-6 pb-6 pt-0', className)}>
    {children}
  </div>
);

export const CardFooter = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('px-6 py-4 border-t border-zinc-800/60 bg-zinc-900/20', className)}>
    {children}
  </div>
);
