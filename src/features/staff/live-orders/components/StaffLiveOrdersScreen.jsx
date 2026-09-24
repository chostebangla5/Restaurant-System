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
  Clock,
  CheckCircle2,
  ShoppingBag,
  Banknote,
  Volume2,
  Utensils,
} from 'lucide-react';

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
    // Find target order to determine table or session
    const targetOrder = (orders || []).find((o) => o.id === orderId);

    // Optimistically update orders of this table/session to completed
    setOrders((prev) =>
      (prev || []).map((o) => {
        if (
          o.id === orderId ||
          (targetOrder && o.table_number === targetOrder.table_number && o.status === 'served')
        ) {
          return { ...o, status: 'completed', payment_status: 'paid' };
        }
        return o;
      })
    );

    try {
      await settleOrder(orderId, 'counter');
      toast.success('Order marked as settled & completed!');
      load();
    } catch (err) {
      console.error(err);
      toast.error('Failed to settle order');
      load();
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
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-[#F4F5F7] flex items-center gap-3">
            Live Orders Stream
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C6FF3D]/10 text-[#C6FF3D] border border-[#C6FF3D]/25">
              {filteredOrders.length} tickets
            </span>
          </h1>
          <p className="text-xs text-[#8A8F9C] mt-1">
            Realtime dining ticket feed connected directly to tables & kitchen
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-[#0E1016] px-3.5 py-2 rounded-full border border-white/[0.08]">
            <Volume2 className="h-4 w-4 text-[#8A8F9C]" strokeWidth={1.5} />
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
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              activeFilter === tab.id
                ? 'bg-[#C6FF3D] text-[#07080B] font-semibold shadow-sm'
                : 'bg-[#0E1016] text-[#8A8F9C] hover:text-[#F4F5F7] border border-white/[0.08]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order Tickets Grid */}
      {filteredOrders.length === 0 ? (
        <div className="py-20 text-center rounded-card bg-[#0E1016] border border-white/[0.08] space-y-3">
          <div className="h-12 w-12 rounded-full bg-[#141721] border border-white/[0.08] text-[#C6FF3D] flex items-center justify-center mx-auto">
            <Utensils className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-heading font-semibold text-[#F4F5F7]">
            No orders match this filter
          </h3>
          <p className="text-xs text-[#8A8F9C] max-w-xs mx-auto">
            Guest orders placed from table QR codes will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`p-5 rounded-card bg-[#0E1016] border transition-all duration-300 flex flex-col justify-between ${
                order.status === 'placed'
                  ? 'border-rose-500/60 shadow-lg shadow-rose-950/20'
                  : order.status === 'cooking'
                  ? 'border-amber-400/60 shadow-lg shadow-amber-950/20'
                  : order.status === 'ready'
                  ? 'border-[#C6FF3D]/60 shadow-lg shadow-[#C6FF3D]/5'
                  : 'border-white/[0.08] hover:border-white/[0.18]'
              }`}
            >
              <div className="space-y-3.5">
                {/* Ticket Top Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2.5 py-1 bg-[#141721] text-[#C6FF3D] border border-white/[0.08] rounded-full">
                      T-{order.table_number}
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#F4F5F7]">
                      Round #{order.round_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#8A8F9C] flex items-center gap-1">
                      <Clock className="h-3 w-3" strokeWidth={1.5} /> {formatElapsed(order.created_at)}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2 py-2.5 border-y border-white/[0.06] text-xs">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-[#F4F5F7]">
                      <div className="min-w-0 pr-2">
                        <span className="font-mono font-bold text-[#C6FF3D] mr-1.5">
                          {item.qty}x
                        </span>
                        <span className="font-medium">{item.name}</span>
                        {item.notes && (
                          <span className="block text-[10px] font-mono text-amber-300 mt-0.5">
                            Note: {item.notes}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-medium text-[#8A8F9C] shrink-0">
                        {formatCurrency((item?.price || 0) * (item?.qty || 1))}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Guest notes */}
                {order.guest_notes && (
                  <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs font-sans text-amber-300">
                    <span className="font-semibold">Guest Note:</span> {order.guest_notes}
                  </div>
                )}
              </div>

              {/* Ticket Footer & Actions */}
              <div className="pt-4 mt-2 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {order.payment_status === 'paid' ? (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        ✓ Paid ({order.payment_method})
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                        Unpaid (Pay at Counter)
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-mono font-bold text-[#F4F5F7]">
                    {formatCurrency(order?.total || 0)}
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
                        className="text-xs font-medium rounded-full border-white/[0.12] text-[#F4F5F7] hover:border-white/[0.25]"
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(order.id, 'cooking')}
                        className="text-xs font-medium rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e]"
                      >
                        Start Cooking
                      </Button>
                    </>
                  )}

                  {order.status === 'acknowledged' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(order.id, 'cooking')}
                      className="col-span-2 text-xs font-medium rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e]"
                    >
                      Start Cooking
                    </Button>
                  )}

                  {order.status === 'cooking' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(order.id, 'ready')}
                      className="col-span-2 rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] text-xs font-medium"
                    >
                      <ShoppingBag className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Mark Ready
                    </Button>
                  )}

                  {order.status === 'ready' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(order.id, 'served')}
                      className="col-span-2 rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] text-xs font-medium"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Mark Served
                    </Button>
                  )}

                  {order.status === 'served' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSettle(order.id)}
                      className="col-span-2 text-xs font-medium rounded-full border-white/[0.12] text-[#F4F5F7] hover:border-white/[0.25]"
                    >
                      <Banknote className="h-3.5 w-3.5 mr-1.5 text-[#C6FF3D]" strokeWidth={1.5} /> Settle & Complete
                    </Button>
                  )}

                  {order.status === 'completed' && (
                    <div className="col-span-2 text-center text-xs font-mono text-[#8A8F9C] py-1">
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
