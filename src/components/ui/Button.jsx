import React from 'react';
import { cn } from '@/lib/utils';

export const Button = React.forwardRef(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon = null,
      rightIcon = null,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none rounded-xl';

    const variants = {
      primary:
        'bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover shadow-orange-500/20',
      secondary:
        'bg-stone-100 text-stone-900 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700',
      outline:
        'border border-stone-200 bg-transparent text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800',
      ghost:
        'bg-transparent text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-500/20',
      accent:
        'bg-amber-500 text-stone-950 font-semibold hover:bg-amber-400',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-5 py-3 gap-2.5 font-semibold',
      icon: 'p-2.5 aspect-square',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon ? (
          <span className="shrink-0">{rightIcon}</span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = 'Button';
