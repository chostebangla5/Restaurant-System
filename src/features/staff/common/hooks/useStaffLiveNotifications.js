import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { playOrderAlertSound, subscribeToOrders } from '@/features/shared/orders/api/ordersApi';
import { subscribeToStaffCalls } from '@/features/staff/service-calls/api/staffCallsApi';
import { isStaffOrAdminRoute } from '@/utils/siteContext';

/**
 * useStaffLiveNotifications
 * Exclusively active for Waiter/Staff and Admin portals (/staff, /admin).
 * Provides auditory and visual alerts for:
 * 1. Customer service calls ("Table 11: Drinking Water")
 * 2. New incoming orders from tables
 *
 * Dedicated strictly to staff/admin layouts. NEVER mounted on Guest routes.
 */
export function useStaffLiveNotifications(venueId) {
  const processedCallKeysRef = useRef(new Set());
  const processedOrderIdsRef = useRef(new Set());

  useEffect(() => {
    // Hard guard: only execute on staff or admin sites
    if (!isStaffOrAdminRoute() || !venueId) return;

    // 1. Supabase Realtime subscription for customer calls to staff
    const unsubStaffCalls = subscribeToStaffCalls(venueId, (payload) => {
      try {
        if (payload?.eventType === 'INSERT' && payload.new) {
          const call = payload.new;
          const callKey = call.id || `${call.table_number}-${call.reason}`;
          if (processedCallKeysRef.current.has(callKey)) return;
          processedCallKeysRef.current.add(callKey);

          playOrderAlertSound();
          toast(
            `🔔 Table ${call.table_number || '?'}: ${call.reason || 'Staff requested'}${call.notes ? ` ("${call.notes}")` : ''}`,
            {
              id: `staff-call-${callKey}`,
              duration: 8000,
              icon: '🔔',
              style: {
                background: '#141721',
                color: '#F4F5F7',
                border: '1px solid rgba(198,255,61,0.3)',
                fontWeight: '600',
                fontSize: '13px',
                borderRadius: '12px',
              },
            }
          );
        }
      } catch (err) {
        console.warn('[StaffNotifications] Error processing staff call:', err);
      }
    });

    // 2. BroadcastChannel for cross-tab realtime sync (local/fallback)
    let syncChannel = null;
    const handleBroadcast = (event) => {
      try {
        const data = event?.data;
        if (!data) return;

        // Only handle events targeted for staff
        if (data.type === 'CALL_STAFF' && data.payload?.tableNumber) {
          const p = data.payload;
          const callKey = p.timestamp ? `call-${p.timestamp}` : `${p.tableNumber}-${p.reason}`;
          if (processedCallKeysRef.current.has(callKey)) return;
          processedCallKeysRef.current.add(callKey);

          playOrderAlertSound();
          toast(
            `🔔 Table ${p.tableNumber}: ${p.reason || 'Staff requested'}${p.notes ? ` ("${p.notes}")` : ''}`,
            {
              id: `staff-call-${callKey}`,
              duration: 8000,
              icon: '🔔',
              style: {
                background: '#141721',
                color: '#F4F5F7',
                border: '1px solid rgba(198,255,61,0.3)',
                fontWeight: '600',
                fontSize: '13px',
                borderRadius: '12px',
              },
            }
          );
        }

        if (data.type === 'new_order' && data.payload?.id) {
          const orderId = data.payload.id;
          if (processedOrderIdsRef.current.has(orderId)) return;
          processedOrderIdsRef.current.add(orderId);

          playOrderAlertSound();
          toast(`📦 New order received!`, {
            id: `staff-order-${orderId}`,
            duration: 6000,
            icon: '📦',
            style: {
              background: '#141721',
              color: '#F4F5F7',
              border: '1px solid rgba(56,189,248,0.3)',
              fontWeight: '600',
              fontSize: '13px',
              borderRadius: '12px',
            },
          });
        }
      } catch (err) {
        console.warn('[StaffNotifications] Broadcast parse error:', err);
      }
    };

    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      syncChannel = new BroadcastChannel('tablesuite_realtime_sync');
      syncChannel.addEventListener('message', handleBroadcast);
    }

    // 3. Supabase Realtime subscription for incoming orders
    const unsubOrders = subscribeToOrders((event) => {
      try {
        if (event?.eventType === 'INSERT' && event.new?.id) {
          const ord = event.new;
          if (venueId && ord.venue_id && ord.venue_id !== venueId) return;
          if (processedOrderIdsRef.current.has(ord.id)) return;
          processedOrderIdsRef.current.add(ord.id);

          playOrderAlertSound();
          toast(
            `📦 Table ${ord.table_number || '?'}: New Order #${ord.round_number || 1}`,
            {
              id: `staff-order-${ord.id}`,
              duration: 6000,
              icon: '📦',
              style: {
                background: '#141721',
                color: '#F4F5F7',
                border: '1px solid rgba(56,189,248,0.3)',
                fontWeight: '600',
                fontSize: '13px',
                borderRadius: '12px',
              },
            }
          );
        }
      } catch (err) {
        // ignore
      }
    });

    return () => {
      if (typeof unsubStaffCalls === 'function') unsubStaffCalls();
      if (typeof unsubOrders === 'function') unsubOrders();
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleBroadcast);
        syncChannel.close();
      }
    };
  }, [venueId]);
}
