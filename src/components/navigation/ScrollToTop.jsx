import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Ensures smooth scroll-to-top on route changes while honoring prefers-reduced-motion
 * and preserving hash links.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If navigating to an in-page anchor, do not override scroll
    if (hash) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
