import React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TRANSITION_EASE, DURATION_PAGE, DURATION_REDUCED } from '@/lib/motion';

/**
 * Wraps react-router Outlet in Framer Motion AnimatePresence for seamless, GPU-accelerated page transitions
 * without layout shifts. Respects prefers-reduced-motion.
 */
export function AnimatedOutlet({ keyExtractor, className = 'w-full flex-1 flex flex-col overflow-x-clip' }) {
  const location = useLocation();
  const element = useOutlet();
  const shouldReduceMotion = useReducedMotion();
  const transitionKey = keyExtractor ? keyExtractor(location) : location.pathname;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {element && (
        <motion.div
          key={transitionKey}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{
            duration: shouldReduceMotion ? DURATION_REDUCED : DURATION_PAGE,
            ease: TRANSITION_EASE,
          }}
          className={className}
        >
          {element}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnimatedOutlet;
