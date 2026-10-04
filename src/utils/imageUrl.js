/**
 * Utility functions for handling food menu item images:
 * - Normalizing external URLs (Google Drive, Dropbox, Unsplash, protocol fixing)
 * - Detecting webpage URLs mistakenly pasted instead of image files
 * - Validating image loadability in browser with no-referrer
 * - Compressing local image files into lightweight data URLs
 */

/**
 * Normalizes an image URL from various common sources into a direct image link.
 * @param {string} url - Raw URL or Data URI
 * @returns {string} - Clean, normalized direct image URL
 */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  // Data URLs (base64)
  if (trimmed.startsWith('data:image/')) return trimmed;

  // Google Drive share links
  // e.g. https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // or https://drive.google.com/open?id=FILE_ID
  const gdriveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${gdriveMatch[1]}&sz=w400`;
  }

  // Dropbox links: ensure dl=0 is converted to raw=1
  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace(/([?&])dl=0/, '$1raw=1');
  }

  // Google Images search redirect link (extract target imgurl)
  if (trimmed.includes('google.com/imgres')) {
    try {
      const parsed = new URL(trimmed);
      const imgUrlParam = parsed.searchParams.get('imgurl');
      if (imgUrlParam) return decodeURIComponent(imgUrlParam);
    } catch {
      // fallback
    }
  }

  // Unsplash photo page URL (e.g. https://unsplash.com/photos/abc-123)
  const unsplashMatch = trimmed.match(/unsplash\.com\/photos\/([a-zA-Z0-9_-]+)/);
  if (unsplashMatch && unsplashMatch[1] && !trimmed.includes('images.unsplash.com')) {
    return `https://images.unsplash.com/photo-${unsplashMatch[1]}?w=320&auto=format&fit=crop&q=75&fm=webp`;
  }

  // Protocol-relative or missing protocol
  if (trimmed.startsWith('//')) {
    trimmed = 'https:' + trimmed;
  } else if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  return trimmed;
}

/**
 * Dynamically resizes CDN image URLs to target thumbnail/container dimensions.
 * Avoids downloading 800px-1000px images for 80px mobile list icons.
 */
export function getOptimizedImageUrl(url, { width = 240, quality = 75 } = {}) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;

  // Unsplash image optimization
  if (trimmed.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(trimmed);
      parsed.searchParams.set('w', String(width));
      parsed.searchParams.set('q', String(quality));
      parsed.searchParams.set('fm', 'webp');
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  // Google Drive thumbnail optimization
  if (trimmed.includes('drive.google.com/thumbnail')) {
    try {
      const parsed = new URL(trimmed);
      parsed.searchParams.set('sz', `w${width}`);
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Checks if a given string looks like a webpage URL rather than a direct image file.
 * @param {string} url
 * @returns {boolean}
 */
export function isLikelyWebpage(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('data:image/')) return false;

  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp'];
  const cleanPath = trimmed.split('?')[0].split('#')[0];
  const hasImageExt = imageExts.some((ext) => cleanPath.endsWith(ext));
  if (hasImageExt) return false;

  // Unsplash or CDN dynamic image endpoints may not have extensions
  if (trimmed.includes('images.unsplash.com') || trimmed.includes('cloudinary.com') || trimmed.includes('supabase.co/storage')) {
    return false;
  }

  // Known webpage markers
  if (cleanPath.endsWith('.html') || cleanPath.endsWith('.htm') || cleanPath.endsWith('.php')) {
    return true;
  }
  if (/(\/recipe\/|\/blog\/|\/article\/|\/post\/|\/wiki\/|\/dish\/|\/product\/)/i.test(cleanPath)) {
    return true;
  }
  if (cleanPath.endsWith('/') && !cleanPath.includes('images.')) {
    return true;
  }

  return false;
}

/**
 * Asynchronously verifies if a URL can be loaded as an image in the browser.
 * @param {string} url
 * @returns {Promise<{ valid: boolean, reason?: string, url?: string }>}
 */
export function validateImageUrl(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return resolve({ valid: false, reason: 'empty' });
    }

    const normalized = normalizeImageUrl(url);
    if (!normalized) {
      return resolve({ valid: false, reason: 'invalid_format' });
    }

    if (normalized.startsWith('data:image/')) {
      return resolve({ valid: true, url: normalized });
    }

    const img = new Image();
    let timer = setTimeout(() => {
      img.src = '';
      resolve({ valid: false, reason: 'timeout', url: normalized });
    }, 8000);

    img.onload = () => {
      clearTimeout(timer);
      resolve({ valid: true, url: normalized });
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve({ valid: false, reason: 'load_error', url: normalized });
    };

    img.referrerPolicy = 'no-referrer';
    img.src = normalized;
  });
}

/**
 * Resizes and compresses an image file from the user's device into a lightweight base64 Data URL.
 * Produces crisp ~20-50KB images suitable for direct storage and rendering.
 * @param {File} file
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @param {number} quality
 * @returns {Promise<string>} Data URL
 */
export async function compressImageFile(file, maxWidth = 600, maxHeight = 600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file (JPG, PNG, WEBP, etc.)'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data'));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(readerEvent.target.result);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Try WebP first
          try {
            const webpData = canvas.toDataURL('image/webp', quality);
            if (webpData.startsWith('data:image/webp')) {
              return resolve(webpData);
            }
          } catch {
            // fallback to jpeg
          }

          const jpegData = canvas.toDataURL('image/jpeg', quality);
          resolve(jpegData);
        } catch {
          resolve(readerEvent.target.result);
        }
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  });
}
