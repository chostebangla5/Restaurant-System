import React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef(
  (
    {
      className,
      label,
      error,
      helperText,
      options = [],
      placeholder = 'Select...',
      id,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 transition-all focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 appearance-none bg-no-repeat bg-[length:16px] bg-[right_12px_center]',
            "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='%2378716c' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]",
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error ? (
          <p className="mt-1.5 text-xs text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-stone-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
