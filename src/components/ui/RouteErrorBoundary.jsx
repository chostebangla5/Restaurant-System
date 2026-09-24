import React, { useEffect, useState } from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [autoUpdating, setAutoUpdating] = useState(false);

  const msg = (error?.message || error?.toString?.() || '').toLowerCase();
  const name = (error?.name || '').toLowerCase();

  const isChunkError =
    name === 'chunkloaderror' ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('failed to load module script') ||
    msg.includes('unable to preload css') ||
    msg.includes('dynamically imported') ||
    msg.includes('loading chunk');

  const handleReload = () => {
    try {
      sessionStorage.removeItem('tablesuite_last_chunk_reload');
      sessionStorage.removeItem('vite_preload_error_reload');
      sessionStorage.removeItem('chunk_error_autoreload');
    } catch {
      // Ignore sessionStorage errors
    }
    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now().toString());
    window.location.replace(url.toString());
  };

  useEffect(() => {
    if (isChunkError) {
      console.warn('[TableSuite] Chunk mismatch caught by ErrorBoundary. Triggering cache-busted update...');
      const key = 'chunk_error_autoreload';
      const last = sessionStorage.getItem(key);
      const now = Date.now();

      // Only auto-reload if not already reloaded in the last 15s
      if (!last || now - parseInt(last, 10) > 15000) {
        sessionStorage.setItem(key, String(now));
        setAutoUpdating(true);
        const timer = setTimeout(() => {
          handleReload();
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [isChunkError]);

  console.error('[TableSuite] Route error caught by ErrorBoundary:', error);

  return (
    <div className="min-h-screen bg-[#07080B] text-[#F4F5F7] flex flex-col items-center justify-center p-6 text-center selection:bg-[#C6FF3D] selection:text-[#07080B]">
      <div className="max-w-md w-full bg-[#0E1016] border border-white/[0.08] rounded-card p-8 shadow-2xl space-y-6">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#141721] border border-white/[0.08] flex items-center justify-center text-[#C6FF3D]">
          {isChunkError ? (
            <RefreshCw className={`h-6 w-6 stroke-[1.5] ${autoUpdating ? 'animate-spin' : ''}`} />
          ) : (
            <AlertTriangle className="h-6 w-6 stroke-[1.5] text-amber-400" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-heading font-bold text-[#F4F5F7]">
            {isChunkError
              ? autoUpdating
                ? 'Updating TableSuite...'
                : 'App Update Available'
              : 'Something went wrong'}
          </h2>
          <p className="text-xs text-[#8A8F9C] leading-relaxed">
            {isChunkError
              ? autoUpdating
                ? 'A new version has been deployed. Refreshing with the latest updates...'
                : 'A newer version of the app was published while you were browsing. Tap below to get the latest version.'
              : (error?.message || 'An unexpected error occurred while loading this page.')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleReload}
            className="w-full sm:w-auto bg-[#C6FF3D] hover:bg-[#b8f52e] text-[#07080B] font-semibold rounded-full"
          >
            {isChunkError ? 'Update Now' : 'Refresh Page'}
          </Button>
          {!isChunkError && (
            <Button
              size="md"
              variant="secondary"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto rounded-full border-white/[0.12] text-[#F4F5F7] hover:border-white/[0.25]"
            >
              Go Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
