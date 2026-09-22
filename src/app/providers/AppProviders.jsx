import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/features/shared/auth';

export function AppProviders({ children }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1c1917',
            color: '#fafaf9',
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.875rem',
            padding: '12px 16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#1c1917',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1c1917',
            },
          },
        }}
      />
    </AuthProvider>
  );
}
