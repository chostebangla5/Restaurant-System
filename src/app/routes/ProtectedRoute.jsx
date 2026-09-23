import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/shared/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

import { PendingApprovalScreen } from '@/features/shared/auth/components/PendingApprovalScreen';

/**
 * Route guard that requires staff authentication and optional role checking
 * In dev / unconfigured mode, it permits bypass with a warning banner.
 */
export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { session, role, isPendingApproval, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-stone-900 text-stone-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          <p className="text-sm font-medium text-stone-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isPendingApproval) {
    return <PendingApprovalScreen />;
  }

  if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-stone-900">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Access Denied</h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Your role (<code className="font-semibold text-brand-primary">{role}</code>) is not authorized to access this section.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
