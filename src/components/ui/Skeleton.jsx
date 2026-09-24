import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-card bg-white/[0.04] border border-white/[0.04]',
        className
      )}
      {...props}
    />
  );
}
