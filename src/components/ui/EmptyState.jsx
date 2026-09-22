import React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30',
        className
      )}
    >
      {Icon && (
        <div className="h-14 w-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 mb-4">
          <Icon className="h-7 w-7" />
        </div>
      )}
      {title && (
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm leading-relaxed mb-5">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
