import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  console.error('Route error caught by ErrorBoundary:', error);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-stone-800/80 border border-stone-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-md space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl">
          ⚠️
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">Something went wrong</h2>
          <p className="text-xs text-stone-400">
            {error?.message || 'An unexpected error occurred while loading this page.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto"
          >
            Refresh Page
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
