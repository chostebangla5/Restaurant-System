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
    default: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    primary: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    accent: 'bg-amber-400/20 text-amber-900 dark:text-amber-300 font-semibold',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 rounded-full font-medium',
    md: 'text-xs px-2.5 py-1 rounded-full font-semibold',
    lg: 'text-sm px-3 py-1.5 rounded-full font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-1 font-sans transition-colors',
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
