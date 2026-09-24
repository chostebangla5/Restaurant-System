import React from 'react';
import { cn } from '@/lib/utils';

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}) {
  const variants = {
    default: 'bg-white/[0.04] text-text border border-white/10',
    primary: 'bg-accent/10 text-accent border border-accent/20',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    accent: 'bg-accent text-bg font-semibold',
  };

  const sizes = {
    sm: 'text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider',
    md: 'text-xs px-3 py-1 rounded-full font-medium',
    lg: 'text-xs px-4 py-1.5 rounded-full font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-1.5 transition-colors',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
