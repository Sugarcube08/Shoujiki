import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  isGlass?: boolean;
}

export const Card = ({ children, className, isGlass = true, ...props }: CardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "rounded-2xl border border-surface-border transition-all duration-300",
        isGlass && "bg-surface/80 backdrop-blur-xl shadow-premium hover:border-zinc-500",
        !isGlass && "bg-surface",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("px-8 py-5 border-b border-surface-border", className)}>
    {children}
  </div>
);

export const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("p-8", className)}>
    {children}
  </div>
);
