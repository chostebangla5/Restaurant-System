import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm"
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn(
              'relative z-10 w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl safe-bottom dark:bg-stone-900 sm:rounded-3xl',
              className
            )}
          >
            {/* Grab handle for mobile */}
            <div className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-stone-300 dark:bg-stone-700 sm:hidden" />

            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              {title && (
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                >
                  <XMarkIcon className="h-5 w-5" />
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
