import { useState, useEffect, useCallback } from 'react';
import { applyVenueBranding } from '../utils/colorUtils';

/**
 * Hook to manage and apply venue theme colors dynamically
 * @param {string} initialColorHex
 */
export function useBranding(initialColorHex = '#EA580C') {
  const [brandColor, setBrandColor] = useState(initialColorHex);

  useEffect(() => {
    applyVenueBranding(brandColor);
  }, [brandColor]);

  const updateBrandColor = useCallback((newHex) => {
    if (!newHex) return;
    setBrandColor(newHex);
    applyVenueBranding(newHex);
  }, []);

  return {
    brandColor,
    updateBrandColor,
  };
}
