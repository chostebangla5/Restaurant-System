import React from 'react';
import { AnimatedOutlet } from '@/components/animation/AnimatedOutlet';

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col selection:bg-brand-primary/20 selection:text-brand-primary">
      <AnimatedOutlet />
    </div>
  );
}
