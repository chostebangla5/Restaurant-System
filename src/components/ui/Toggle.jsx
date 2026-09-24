import React from 'react';
import { cn } from '@/lib/utils';

export function Toggle({
  checked = false,
  onChange,
  label,
  description,
  size = 'md',
  disabled = false,
  className,
  id,
}) {
  const toggleId = id || (label ? `toggle-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);

  const isSm = size === 'sm';

  return (
    <div className={cn('inline-flex items-center gap-3 select-none', className)}>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={cn(
          'group relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-accent border border-white/10 disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation before:absolute before:-inset-2 before:content-[\'\']',
          isSm ? 'h-5 w-9' : 'h-6 w-11',
          checked
            ? 'bg-accent border-accent text-bg'
            : 'bg-surface-2 hover:bg-white/[0.08]'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block rounded-full transition-transform duration-200 ease-in-out',
            isSm ? 'h-4 w-4' : 'h-5 w-5',
            checked
              ? (isSm ? 'translate-x-4 bg-bg' : 'translate-x-5 bg-bg')
              : 'translate-x-0 bg-text/80 shadow-xs'
          )}
        />
      </button>
      {(label || description) && (
        <div
          className="min-w-0 cursor-pointer"
          onClick={() => !disabled && onChange?.(!checked)}
        >
          {label && (
            <span className="block text-xs font-medium text-text">
              {label}
            </span>
          )}
          {description && (
            <span className="block text-[11px] text-muted leading-tight mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
