import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRANSITION_EASE, DURATION_MODAL, DURATION_REDUCED } from '@/lib/motion';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
  showCloseButton = true,
  guestTheme = false,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? DURATION_REDUCED : 0.2 }}
            onClick={onClose}
            className={cn(
              'fixed inset-0',
              guestTheme
                ? 'guest-light-modal-backdrop'
                : 'bg-bg/80 backdrop-blur-sm'
            )}
            style={guestTheme ? { background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' } : undefined}
          />

          {/* Content */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: shouldReduceMotion ? DURATION_REDUCED : DURATION_MODAL, ease: TRANSITION_EASE }}
            className={cn(
              'relative z-10 w-full p-6 sm:p-8 shadow-2xl',
              guestTheme
                ? 'rounded-2xl'
                : 'rounded-card bg-surface border border-white/10 text-text',
              sizes[size],
              className
            )}
            style={guestTheme ? {
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#1A1A1A',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
            } : undefined}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className={cn(
                'flex items-start justify-between pb-4',
                guestTheme ? '' : 'border-b border-white/10'
              )}
                style={guestTheme ? { borderBottom: '1px solid rgba(0,0,0,0.06)' } : undefined}
              >
                <div>
                  {title && (
                    <h3 className={cn(
                      'text-lg font-bold tracking-tight',
                      guestTheme ? '' : 'font-heading text-text'
                    )}
                      style={guestTheme ? { color: '#1A1A1A' } : undefined}
                    >
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className={cn(
                      'text-xs mt-1 leading-relaxed',
                      guestTheme ? '' : 'text-muted'
                    )}
                      style={guestTheme ? { color: '#8C8C8C' } : undefined}
                    >
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className={cn(
                      'rounded-full p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors',
                      guestTheme
                        ? 'hover:bg-black/[0.04]'
                        : 'text-muted hover:bg-white/[0.06] hover:text-text'
                    )}
                    style={guestTheme ? { color: '#8C8C8C' } : undefined}
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="mt-5 max-h-[70vh] overflow-y-auto no-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
