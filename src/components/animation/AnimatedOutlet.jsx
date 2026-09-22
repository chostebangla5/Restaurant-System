import React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Wraps react-router Outlet in Framer Motion AnimatePresence for seamless page transitions
 */
export function AnimatedOutlet() {
  const location = useLocation();
  const element = useOutlet();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {element && (
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          className="w-full flex-1"
        >
          {element}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
