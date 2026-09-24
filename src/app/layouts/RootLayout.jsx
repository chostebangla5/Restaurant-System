import React from 'react';
import { AnimatedOutlet } from '@/components/animation/AnimatedOutlet';
import { ScrollToTop } from '@/components/navigation/ScrollToTop';

// Keeps layout transitions active between top-level flows without remounting nested shells
const getRootRouteKey = (location) => {
  if (location.pathname.startsWith('/staff')) return '/staff';
  if (location.pathname.startsWith('/t/')) return '/t';
  return location.pathname;
};

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col selection:bg-accent/20 selection:text-accent overflow-x-clip">
      <ScrollToTop />
      <AnimatedOutlet keyExtractor={getRootRouteKey} />
    </div>
  );
}

export default RootLayout;
