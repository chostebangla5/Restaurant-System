/**
 * Converts a hex color string (#RGB, #RRGGBB) to HSL components
 * @param {string} hex - e.g. "#EA580C"
 * @returns {{ h: number, s: number, l: number, hslString: string }}
 */
export function hexToHsl(hex) {
  let cleaned = hex.replace(/^#/, '');

  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((char) => char + char).join('');
  }

  if (cleaned.length !== 6) {
    // Default fallback to warm orange
    return { h: 24, s: 94, l: 50, hslString: '24 94% 50%' };
  }

  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        break;
    }
    h = h * 60;
  }

  const roundH = Math.round(h);
  const roundS = Math.round(s * 100);
  const roundL = Math.round(l * 100);

  return {
    h: roundH,
    s: roundS,
    l: roundL,
    hslString: `${roundH} ${roundS}% ${roundL}%`,
  };
}

/**
 * Dynamically applies a venue's brand color to the CSS root variables
 * @param {string} brandColorHex - e.g. "#EA580C"
 */
export function applyVenueBranding(brandColorHex) {
  if (!brandColorHex) return;

  try {
    const { h, s, l } = hexToHsl(brandColorHex);

    // Primary
    const primary = `${h} ${s}% ${l}%`;
    // Hover (slightly darker)
    const hoverL = Math.max(l - 8, 15);
    const primaryHover = `${h} ${s}% ${hoverL}%`;
    // Light tint (for badges, active tabs, subtle backgrounds)
    const lightL = 96;
    const primaryLight = `${h} ${Math.min(s, 95)}% ${lightL}%`;

    const root = document.documentElement;
    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-primary-hover', primaryHover);
    root.style.setProperty('--brand-primary-light', primaryLight);
  } catch (error) {
    console.error('Failed to apply venue branding:', error);
  }
}
