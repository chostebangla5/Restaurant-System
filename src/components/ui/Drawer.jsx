import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRANSITION_EASE, DURATION_MODAL, DURATION_REDUCED } from '@/lib/motion';

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
}) {
  const shouldReduceMotion = useReducedMotion();

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? DURATION_REDUCED : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-bg/80 backdrop-blur-sm"
          />

          {/* Drawer Content */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={shouldReduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ duration: shouldReduceMotion ? DURATION_REDUCED : DURATION_MODAL, ease: TRANSITION_EASE }}
            className={cn(
              'relative z-10 w-full max-w-lg rounded-t-card bg-surface p-6 shadow-2xl safe-bottom border-t sm:border border-white/10 sm:rounded-card text-text',
              className
            )}
          >
            {/* Grab handle for mobile */}
            <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              {title && (
                <h3 className="font-heading text-lg font-bold text-text tracking-tight">
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="rounded-full p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:bg-white/[0.06] hover:text-text transition-colors"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )}
            </div>

            <div className="mt-4 max-h-[75vh] overflow-y-auto no-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
