import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers/AppProviders';
import { router } from '@/app/routes';

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

export default App;
