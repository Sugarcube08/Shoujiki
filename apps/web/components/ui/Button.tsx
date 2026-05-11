import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'protocol';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = 'relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-protocol-cyan/30 disabled:pointer-events-none disabled:opacity-50 gap-2 overflow-hidden';
  
  const variants = {
    primary: 'bg-white text-black shadow-lg hover:bg-zinc-100',
    secondary: 'bg-surface border border-surface-border text-white shadow-sm hover:border-zinc-500',
    outline: 'bg-transparent border border-surface-border text-zinc-400 hover:text-white hover:border-zinc-500',
    ghost: 'bg-transparent text-zinc-400 hover:text-white hover:bg-surface',
    protocol: 'bg-protocol-violet text-white shadow-protocol-glow hover:bg-protocol-violet/80 border border-protocol-violet/50',
  };

  const sizes = {
    sm: 'h-9 px-4 text-xs',
    md: 'h-11 px-6 text-sm',
    lg: 'h-14 px-10 text-base',
    icon: 'h-11 w-11 p-0',
  };

  return (
    <motion.button
      whileHover={{ 
        scale: 1.02,
        y: -1,
        transition: { type: "spring", stiffness: 400, damping: 10 }
      }}
      whileTap={{ scale: 0.97 }}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {/* Subtle Overlay on hover */}
      <motion.div 
        className="absolute inset-0 bg-current opacity-0 hover:opacity-[0.08] transition-opacity duration-300"
      />

      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-current" /> : null}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
};
