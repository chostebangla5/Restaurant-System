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
      'group inline-flex items-center justify-center font-medium transition-all duration-200 ease-cinematic focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none rounded-full touch-manipulation';

    const variants = {
      primary:
        'bg-accent text-bg font-semibold hover:bg-accent-hover hover:-translate-y-[1px] shadow-sm',
      secondary:
        'bg-surface-2 text-text border border-white/10 hover:border-white/20 hover:-translate-y-[1px]',
      outline:
        'border border-white/10 bg-transparent text-text hover:border-white/25 hover:bg-white/[0.03] hover:-translate-y-[1px]',
      ghost:
        'bg-transparent text-muted hover:text-text hover:bg-white/[0.04]',
      danger:
        'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20',
      accent:
        'bg-accent text-bg font-semibold hover:bg-accent-hover hover:-translate-y-[1px]',
    };

    const sizes = {
      sm: 'text-xs px-4 py-2 gap-1.5 min-h-[38px] sm:min-h-[36px]',
      md: 'text-sm px-5 py-2.5 gap-2 min-h-[44px]',
      lg: 'text-base px-7 py-3.5 gap-2.5 font-semibold min-h-[48px]',
      icon: 'p-2.5 aspect-square min-h-[44px] min-w-[44px]',
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
          <span className="shrink-0 transition-transform duration-200 ease-cinematic group-hover:-translate-x-0.5">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon ? (
          <span className="shrink-0 transition-transform duration-200 ease-cinematic group-hover:translate-x-1">{rightIcon}</span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = 'Button';
