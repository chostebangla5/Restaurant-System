import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { formatCurrency } from '@/utils/formatCurrency';
import { getElapsedTime } from '@/utils/billCalculation';
import { useAuth } from '@/features/shared/auth';
import {
  fetchOrders,
  subscribeToOrders,
  updateOrderStatus,
  settleOrder,
  cancelOrder,
  playOrderAlertSound,
  parseGuestInfo,
  cleanGuestInstructions,
} from '@/features/shared/orders/api/ordersApi';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle2,
  ShoppingBag,
  Banknote,
  Volume2,
  Utensils,
  Check,
  XCircle,
  AlertTriangle,
  User,
  MessageSquare,
  Tag,
} from 'lucide-react';

export function StaffLiveOrdersScreen() {
  const { venueId } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

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
    if (!venueId) return;
    load();

    const unsub = subscribeToOrders(venueId, () => {
      load();
      if (soundEnabledRef.current) {
        playOrderAlertSound();
      }
    });

    return () => unsub();
  }, [venueId]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order moved to ${newStatus}`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

  const handleSettle = async (orderId) => {
    try {
      await settleOrder(orderId, 'cash');
      toast.success('Order settled successfully');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'completed', payment_status: 'paid' }
            : o
        )
      );
    } catch (err) {
      toast.error('Failed to settle order');
    }
  };

  const handleCancelByStaff = async (order) => {
    const reason = window.prompt(
      `Void / Cancel order for Table ${order.table_number}? Enter reason (optional):`,
      'Customer cancelled'
    );
    if (reason === null) return;

    try {
      await cancelOrder(order.id, reason || 'Cancelled by staff');
      toast.success(`Order for Table ${order.table_number} cancelled.`);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: 'cancelled', cancel_reason: reason }
            : o
        )
      );
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order');
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
        return <Badge variant="danger" size="sm">New Order</Badge>;
      case 'acknowledged':
        return <Badge variant="warning" size="sm">Acknowledged</Badge>;
      case 'cooking':
        return <Badge variant="warning" size="sm">Cooking</Badge>;
      case 'ready':
        return <Badge variant="primary" size="sm">Ready to Serve</Badge>;
      case 'served':
        return <Badge variant="success" size="sm">Served</Badge>;
      case 'completed':
        return <Badge variant="success" size="sm">Settled</Badge>;
      case 'cancelled':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-500">
            Cancelled
          </span>
        );
      default:
        return <Badge variant="default" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-text flex items-center gap-3">
            Live Orders Stream
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              {filteredOrders.length} tickets
            </span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Realtime dining ticket feed connected directly to tables &amp; kitchen
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-surface px-3.5 py-2 rounded-full border border-border shadow-sm">
            <Volume2 className="h-4 w-4 text-muted" strokeWidth={1.5} />
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
          { id: 'active', label: 'Active Kitchen Queue' },
          { id: 'placed', label: 'Placed' },
          { id: 'cooking', label: 'Cooking' },
          { id: 'ready', label: 'Ready' },
          { id: 'served', label: 'Served' },
          { id: 'completed', label: 'Settled' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`whitespace-nowrap px-4 py-2 min-h-[38px] rounded-full text-xs font-medium touch-manipulation transition-all shrink-0 flex items-center justify-center ${
              activeFilter === tab.id
                ? 'bg-accent text-bg font-semibold shadow-sm'
                : 'bg-surface text-muted hover:text-text border border-border hover:bg-surface-2'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order Tickets Grid */}
      {filteredOrders.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-surface border border-border space-y-3 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-surface-2 border border-border text-accent flex items-center justify-center mx-auto">
            <Utensils className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text">
            No orders match this filter
          </h3>
          <p className="text-xs text-muted max-w-xs mx-auto">
            Guest orders placed from table QR codes will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const elapsed = getElapsedTime(order.created_at);
            const isStale = elapsed.isOverdue && order.status !== 'completed' && order.status !== 'cancelled';
            const guestInfo = parseGuestInfo(order.guest_notes);
            const customerName = order.customer_name || guestInfo.name;
            const customerPhone = guestInfo.phone;
            const cleanNotes = cleanGuestInstructions(order.guest_notes);
            const couponMatch = (order.guest_notes || '').match(/\[Coupon:\s*([^\]]+)\]/i);
            const couponText = couponMatch ? couponMatch[1].trim() : null;

            return (
              <div
                key={order.id}
                className={`p-4 sm:p-5 rounded-2xl bg-surface border transition-all duration-200 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${
                  isStale
                    ? 'border-rose-500/80 bg-rose-500/[0.03] ring-1 ring-rose-500/30'
                    : order.status === 'placed'
                    ? 'border-rose-500/40 ring-1 ring-rose-500/20'
                    : order.status === 'cooking'
                    ? 'border-amber-500/40 ring-1 ring-amber-500/20'
                    : order.status === 'ready'
                    ? 'border-accent/50 ring-1 ring-accent/30'
                    : order.status === 'cancelled'
                    ? 'border-rose-500/20 opacity-70'
                    : 'border-border'
                }`}
              >
                <div className="space-y-3">
                  {/* Row 1: Table & Round, plus Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-text whitespace-nowrap shrink-0">
                        Table {order.table_number}
                      </span>
                      <span className="font-mono text-xs text-muted font-medium whitespace-nowrap shrink-0">
                        Round #{order.round_number}
                      </span>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Row 2: Customer info & Elapsed time */}
                  <div className="flex items-center justify-between gap-2 text-xs text-muted pt-0.5 border-b border-border/50 pb-2">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      {customerName ? (
                        <span className="font-medium text-text truncate flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted shrink-0" />
                          <span className="truncate">{customerName}</span>
                          {customerPhone && (
                            <span className="text-[11px] text-muted font-mono shrink-0">
                              ({customerPhone})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0" /> Guest Order
                        </span>
                      )}
                    </div>

                    <span
                      className={`font-mono text-[11px] flex items-center gap-1 shrink-0 ${
                        elapsed.isOverdue
                          ? 'text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20'
                          : elapsed.isUrgent
                          ? 'text-amber-500 font-semibold'
                          : 'text-muted'
                      }`}
                    >
                      <Clock className="h-3 w-3" strokeWidth={1.5} /> {elapsed.text}
                    </span>
                  </div>

                  {/* Overdue / Stale Warning Banner */}
                  {isStale && (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span>Overdue ({elapsed.text}) — Review table / settle</span>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-2 py-1 text-xs">
                    {(order.items || []).map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex justify-between items-start gap-2 ${
                          order.status === 'cancelled' ? 'text-muted line-through' : 'text-text'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span
                            className={`font-mono font-bold mr-1.5 ${
                              order.status === 'cancelled' ? 'text-muted' : 'text-accent font-extrabold'
                            }`}
                          >
                            {item.qty}x
                          </span>
                          <span className="font-medium text-text">{item.name}</span>
                          {item.notes && (
                            <span className="block text-[11px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                              ↳ {item.notes}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-medium text-muted shrink-0">
                          {formatCurrency((item?.price || 0) * (item?.qty || 1))}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Clean Coupon Tag (if applied) */}
                  {couponText && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 font-mono">
                      <Tag className="h-3 w-3" />
                      <span>Coupon: <strong>{couponText}</strong></span>
                    </div>
                  )}

                  {/* Real Kitchen Cooking Notes (cleaned of metadata) */}
                  {cleanNotes && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-900 dark:text-amber-200">Note:</span>{' '}
                        {cleanNotes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ticket Footer & Actions */}
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {order.status === 'cancelled' ? (
                        <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          Voided
                        </span>
                      ) : order.payment_status === 'paid' ? (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                          <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} /> Paid ({order.payment_method || 'counter'})
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          Unpaid (Counter)
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-sm font-mono font-bold ${
                        order.status === 'cancelled' ? 'text-muted line-through' : 'text-text'
                      }`}
                    >
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
                          className="text-xs font-medium rounded-xl"
                        >
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(order.id, 'cooking')}
                          className="text-xs font-semibold rounded-xl bg-accent text-bg hover:opacity-90"
                        >
                          Start Cooking
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleCancelByStaff(order)}
                          className="col-span-2 text-[11px] font-mono text-rose-500 hover:underline py-1 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <XCircle className="h-3 w-3" /> Void / Cancel Ticket
                        </button>
                      </>
                    )}

                    {order.status === 'acknowledged' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(order.id, 'cooking')}
                          className="col-span-2 text-xs font-semibold rounded-xl bg-accent text-bg hover:opacity-90"
                        >
                          Start Cooking
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleCancelByStaff(order)}
                          className="col-span-2 text-[11px] font-mono text-rose-500 hover:underline py-1 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <XCircle className="h-3 w-3" /> Void / Cancel Ticket
                        </button>
                      </>
                    )}

                    {order.status === 'cooking' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        className="col-span-2 rounded-xl bg-accent text-bg hover:opacity-90 text-xs font-semibold"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Mark Ready
                      </Button>
                    )}

                    {order.status === 'ready' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(order.id, 'served')}
                        className="col-span-2 rounded-xl bg-accent text-bg hover:opacity-90 text-xs font-semibold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Mark Served
                      </Button>
                    )}

                    {order.status === 'served' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSettle(order.id)}
                        className="col-span-2 text-xs font-medium rounded-xl"
                      >
                        <Banknote className="h-3.5 w-3.5 mr-1.5 text-accent" strokeWidth={1.5} /> Settle &amp; Complete
                      </Button>
                    )}

                    {order.status === 'completed' && (
                      <div className="col-span-2 text-center text-xs font-medium text-muted py-2 flex items-center justify-center gap-1.5 bg-surface-2 rounded-xl border border-border">
                        <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} /> Order Fulfilled
                      </div>
                    )}

                    {order.status === 'cancelled' && (
                      <div className="col-span-2 text-center text-xs font-medium text-rose-500 py-2 flex items-center justify-center gap-1.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                        <XCircle className="h-3.5 w-3.5 text-rose-500" strokeWidth={1.5} /> Ticket Cancelled
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StaffLiveOrdersScreen;
