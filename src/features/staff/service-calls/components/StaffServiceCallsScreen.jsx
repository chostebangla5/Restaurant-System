import React from 'react';
import { ServiceCallsPanel } from '@/features/staff/service-calls/components/ServiceCallsPanel';

/**
 * Full-page service calls view for staff portal (/staff/calls)
 */
export function StaffServiceCallsScreen() {
  return (
    <div className="space-y-6">
      <ServiceCallsPanel compact={false} />
    </div>
  );
}
