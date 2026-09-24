/**
 * Global Motion & Animation Design Tokens
 * Ensures strictly unified easing, timing, and accessibility across all sections and routes.
 */

// Cinematic cubic-bezier matching tailwind.config.js cinematic easing
export const TRANSITION_EASE = [0.22, 1, 0.36, 1];
export const TRANSITION_EASE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Standardized Durations (seconds)
export const DURATION_SECTION = 0.5;
export const DURATION_ITEM = 0.4;
export const DURATION_PAGE = 0.24;
export const DURATION_MODAL = 0.3;
export const DURATION_REDUCED = 0.15;

// Standard Stagger Delays (seconds)
export const STAGGER_CHILDREN = 0.08;
export const DELAY_CHILDREN = 0.04;

// Global Viewport Trigger Config: Guaranteed to run once only without re-trigger layout shifts
export const VIEWPORT_CONFIG = {
  once: true,
  margin: '-50px',
};

// Reusable standard variants for sections
export const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_SECTION,
      ease: TRANSITION_EASE,
      staggerChildren: STAGGER_CHILDREN,
      delayChildren: DELAY_CHILDREN,
    },
  },
};

// Reusable standard variants for cards & items inside sections
export const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_ITEM,
      ease: TRANSITION_EASE,
    },
  },
};

// Container variants for staggered lists
export const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER_CHILDREN,
      delayChildren: DELAY_CHILDREN,
    },
  },
};
