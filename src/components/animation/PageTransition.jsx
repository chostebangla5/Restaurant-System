import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TRANSITION_EASE, DURATION_PAGE, DURATION_REDUCED } from '@/lib/motion';

export function PageTransition({ children, className = '' }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{
        duration: shouldReduceMotion ? DURATION_REDUCED : DURATION_PAGE,
        ease: TRANSITION_EASE,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
