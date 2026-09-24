import { lazy } from 'react';

/**
 * Checks whether an error is caused by a missing/stale deployment chunk
 * or mobile network failure during dynamic script loading.
 */
function isChunkLoadError(error) {
  if (!error) return false;
  const msg = (error.message || error.toString() || '').toLowerCase();
  const name = (error.name || '').toLowerCase();

  return (
    name === 'chunkloaderror' ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('failed to load module script') ||
    msg.includes('unable to preload css') ||
    msg.includes('dynamically imported') ||
    msg.includes('loading chunk')
  );
}

/**
 * Sleep helper for retry backoff
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Enterprise-grade lazy loader for React components that:
 * 1. Retries failed network imports 2 times with exponential backoff (for spotty mobile networks).
 * 2. On persistent chunk mismatch (new Vercel deployment), performs a cache-busting reload.
 * 3. Prevents infinite reload loops with a timestamp cooldown window.
 * 4. Yields cleanly to Error Boundaries if recovery fails.
 *
 * @param {() => Promise<{ default: React.ComponentType<any> }>} factory
 * @param {string} [componentName]
 */
export function lazyWithRetry(factory, componentName = 'Component') {
  return lazy(async () => {
    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        return await factory();
      } catch (error) {
        attempt++;

        // If it's not a chunk/network error, fail immediately (e.g. syntax or runtime error in code)
        if (!isChunkLoadError(error)) {
          throw error;
        }

        // If we haven't exhausted transient retries, wait and retry
        if (attempt <= maxRetries) {
          console.warn(
            `[TableSuite] Retry ${attempt}/${maxRetries} loading ${componentName} after network failure...`
          );
          await sleep(attempt * 600); // 600ms, 1200ms
          continue;
        }

        // All transient retries failed -> indicates a new production deployment where chunk hashes changed
        console.warn(
          `[TableSuite] Stale deployment detected while loading ${componentName}. Initiating cache-busting reload.`
        );

        const cooldownKey = 'tablesuite_last_chunk_reload';
        const lastReload = sessionStorage.getItem(cooldownKey);
        const now = Date.now();

        // Allow at most 1 automatic reload per 15 seconds to avoid infinite loops
        if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
          sessionStorage.setItem(cooldownKey, String(now));

          // Force fresh fetch of index.html by appending a cache buster
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('_v', now.toString());

          // Replace URL and reload from server
          window.location.replace(currentUrl.toString());

          // Return pending promise so React Suspense stays in loading state during navigation
          return new Promise(() => {});
        }

        // If reload loop cooldown is active, let ErrorBoundary handle it with a manual reload button
        throw error;
      }
    }
  });
}

/**
 * Preload a lazy component in the background during idle time
 */
export function preloadRoute(factory) {
  if (typeof window === 'undefined') return;

  const run = () => {
    try {
      factory().catch(() => {});
    } catch {
      // Ignore background preload errors
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    setTimeout(run, 1200);
  }
}
