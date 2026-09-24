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
        'flex flex-col items-center justify-center py-16 px-6 text-center rounded-card border border-dashed border-white/[0.12] bg-[#0E1016]',
        className
      )}
    >
      {Icon && (
        <div className="h-14 w-14 rounded-full bg-[#141721] border border-white/[0.08] flex items-center justify-center text-[#C6FF3D] mb-4">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
      )}
      {title && (
        <h3 className="text-sm font-heading font-semibold text-[#F4F5F7] mb-1.5">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-xs text-[#8A8F9C] max-w-sm leading-relaxed mb-5">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
