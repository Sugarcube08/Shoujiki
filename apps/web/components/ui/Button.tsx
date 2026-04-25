import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
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
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 gap-2 active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-zinc-100 text-zinc-900 hover:bg-white shadow-sm',
    secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 shadow-sm',
    outline: 'bg-transparent border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900',
    ghost: 'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
    link: 'bg-transparent text-blue-500 hover:underline px-0 h-auto',
  };

  const sizes = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-10 px-4',
    lg: 'h-12 px-8 text-base',
    icon: 'h-10 w-10 p-0',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-current" /> : null}
      {children}
    </button>
  );
};
