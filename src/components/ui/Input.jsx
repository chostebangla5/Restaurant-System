import React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-stone-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            className={cn(
              'w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-stone-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-stone-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
