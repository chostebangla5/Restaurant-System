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
          'group relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2 dark:focus:ring-offset-stone-900 disabled:cursor-not-allowed disabled:opacity-50',
          isSm ? 'h-5 w-9' : 'h-6 w-11',
          checked
            ? 'bg-brand-primary shadow-sm shadow-brand-primary/30'
            : 'bg-stone-300 dark:bg-stone-700 hover:bg-stone-350 dark:hover:bg-stone-650'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out',
            isSm ? 'h-4 w-4' : 'h-5 w-5',
            checked
              ? isSm ? 'translate-x-4' : 'translate-x-5'
              : 'translate-x-0'
          )}
        />
      </button>
      {(label || description) && (
        <div
          className="min-w-0 cursor-pointer"
          onClick={() => !disabled && onChange?.(!checked)}
        >
          {label && (
            <span className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
              {label}
            </span>
          )}
          {description && (
            <span className="block text-[11px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
