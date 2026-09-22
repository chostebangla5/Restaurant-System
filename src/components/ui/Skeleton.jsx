import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-stone-200/80 dark:bg-stone-800/80',
        className
      )}
      {...props}
    />
  );
}
