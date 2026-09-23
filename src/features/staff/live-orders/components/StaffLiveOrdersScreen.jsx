import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { formatCurrency } from '@/utils/formatCurrency';
import { useAuth } from '@/features/shared/auth';
import {
  fetchOrders,
  subscribeToOrders,
  updateOrderStatus,
  settleOrder,
  playOrderAlertSound,
} from '@/features/shared/orders/api/ordersApi';
import toast from 'react-hot-toast';
import {
  FireIcon,
  ClockIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  SpeakerWaveIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';

export function StaffLiveOrdersScreen() {
  const { venueId } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchOrders(venueId);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load orders:', err);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = subscribeToOrders(() => {
      load();
      if (soundEnabled) {
        playOrderAlertSound();
      }
    });
    return () => unsubscribe();
  }, [venueId, soundEnabled]);

  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      await updateOrderStatus(orderId, nextStatus);
      toast.success(`Order updated to ${nextStatus.toUpperCase()}`);
      load();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update order');
    }
  };

  const handleSettle = async (orderId) => {
    try {
      await settleOrder(orderId, 'counter');
      toast.success('Order marked as settled & completed!');
      load();
    } catch (err) {
      console.error(err);
      toast.error('Failed to settle order');
    }
  };

  const filteredOrders = (orders || []).filter((o) => {
    if (!o) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') {
      return ['placed', 'acknowledged', 'cooking', 'ready'].includes(o.status);
    }
    return o.status === activeFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'placed':
        return <Badge variant="danger">Placed (New)</Badge>;
      case 'acknowledged':
        return <Badge variant="warning">Acknowledged</Badge>;
      case 'cooking':
        return <Badge variant="warning">Cooking</Badge>;
      case 'ready':
        return <Badge variant="primary">Ready to Serve</Badge>;
      case 'served':
        return <Badge variant="success">Served</Badge>;
      case 'completed':
        return <Badge variant="accent">Settled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatElapsed = (isoString) => {
    if (!isoString) return 'Just now';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-stone-900 dark:text-white flex items-center gap-2">
            Live Orders Stream
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary">
              {filteredOrders.length} tickets
            </span>
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Realtime dining ticket feed connected directly to tables & kitchen
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xs">
            <SpeakerWaveIcon className="h-4 w-4 text-stone-400" />
            <Toggle
              size="sm"
              checked={soundEnabled}
              onChange={(val) => {
                setSoundEnabled(val);
                if (val) playOrderAlertSound();
              }}
              label="Audio Chime"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'active', label: '🔥 Active Kitchen Queue' },
          { id: 'placed', label: 'Placed' },
          { id: 'cooking', label: 'Cooking' },
          { id: 'ready', label: 'Ready' },
          { id: 'served', label: 'Served' },
          { id: 'completed', label: 'Settled' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFilter === tab.id
                ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/25'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 border border-stone-200 dark:border-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order Tickets Grid */}
      {filteredOrders.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 space-y-3">
          <div className="text-3xl">🍽️</div>
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
            No orders match this filter
          </h3>
          <p className="text-xs text-stone-400 max-w-xs mx-auto">
            Guest orders placed from table QR codes will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`p-5 rounded-3xl bg-white dark:bg-stone-900 border transition-all shadow-sm flex flex-col justify-between ${
                order.status === 'placed'
                  ? 'border-rose-400 dark:border-rose-700 ring-1 ring-rose-400/20 shadow-rose-500/5'
                  : order.status === 'cooking'
                  ? 'border-amber-400 dark:border-amber-700 ring-1 ring-amber-400/20'
                  : order.status === 'ready'
                  ? 'border-blue-400 dark:border-blue-700 ring-1 ring-blue-400/20'
                  : 'border-stone-200/80 dark:border-stone-800'
              }`}
            >
              <div className="space-y-3.5">
                {/* Ticket Top Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs px-2.5 py-1 bg-brand-primary text-white rounded-lg shadow-xs">
                      T-{order.table_number}
                    </span>
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Round #{order.round_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" /> {formatElapsed(order.created_at)}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 py-2 border-y border-stone-100 dark:border-stone-800 text-xs">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-stone-800 dark:text-stone-200">
                      <div className="min-w-0 pr-2">
                        <span className="font-black text-brand-primary mr-1.5">
                          {item.qty}x
                        </span>
                        <span className="font-bold">{item.name}</span>
                        {item.notes && (
                          <span className="block text-[10px] italic text-amber-500">
                            Note: {item.notes}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-stone-500 shrink-0">
                        {formatCurrency(item.price * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Guest notes */}
                {order.guest_notes && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400">
                    <span className="font-bold">Guest Note:</span> {order.guest_notes}
                  </div>
                )}
              </div>

              {/* Ticket Footer & Actions */}
              <div className="pt-4 mt-2 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {order.payment_status === 'paid' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        ✓ Paid ({order.payment_method})
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Unpaid (Pay at Counter)
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-black text-stone-900 dark:text-white">
                    {formatCurrency(order.total)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {order.status === 'placed' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStatusChange(order.id, 'acknowledged')}
                        className="text-xs font-bold"
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(order.id, 'cooking')}
                        className="text-xs font-bold"
                      >
                        Start Cooking
                      </Button>
                    </>
                  )}

                  {order.status === 'acknowledged' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(order.id, 'cooking')}
                      className="col-span-2 text-xs font-bold"
                    >
                      Start Cooking
                    </Button>
                  )}

                  {order.status === 'cooking' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(order.id, 'ready')}
                      className="col-span-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                    >
                      <ShoppingBagIcon className="h-3.5 w-3.5 mr-1" /> Mark Ready
                    </Button>
                  )}

                  {order.status === 'ready' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(order.id, 'served')}
                      className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                    >
                      <CheckCircleIcon className="h-3.5 w-3.5 mr-1" /> Mark Served
                    </Button>
                  )}

                  {order.status === 'served' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSettle(order.id)}
                      className="col-span-2 text-xs font-bold"
                    >
                      <BanknotesIcon className="h-3.5 w-3.5 mr-1 text-brand-primary" /> Settle & Complete
                    </Button>
                  )}

                  {order.status === 'completed' && (
                    <div className="col-span-2 text-center text-xs font-bold text-stone-400 py-1">
                      ✓ Order Fulfilled
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
