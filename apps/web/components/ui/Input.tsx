import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({
  className,
  label,
  error,
  type = 'text',
  ...props
}: InputProps) => {
  return (
    <div className="space-y-1.5 w-full group">
      {label && (
        <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 group-focus-within:text-protocol-cyan transition-colors ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          className={cn(
            "w-full bg-background border border-surface-border rounded-xl h-11 px-4 text-sm text-foreground placeholder:text-zinc-600 transition-all duration-300 focus:outline-none focus:border-protocol-cyan/50 focus:ring-1 focus:ring-protocol-cyan/20",
            error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none border border-protocol-cyan/0 group-focus-within:border-protocol-cyan/20 transition-all duration-500"
          initial={false}
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-[10px] font-medium text-red-500 ml-1 uppercase tracking-wider"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

