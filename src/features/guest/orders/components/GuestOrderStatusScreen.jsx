import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  fetchOrdersForTable,
  subscribeToOrders,
  settleOrder,
} from '@/features/shared/orders/api/ordersApi';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flame,
  ShoppingBag,
  Banknote,
  CreditCard,
  ClipboardList,
} from 'lucide-react';

/* ─── Modern Progress Line with Dot Pulses ─── */
function OrderProgressLine({ currentStatus }) {
  const steps = [
    { key: 'placed', label: 'Received' },
    { key: 'cooking', label: 'Preparing' },
    { key: 'ready', label: 'Ready' },
    { key: 'served', label: 'Served' },
  ];

  const statusOrder = ['placed', 'acknowledged', 'cooking', 'ready', 'served', 'completed'];
  const currentIdx = statusOrder.indexOf(currentStatus || 'placed');

  const getStepIdx = (key) => statusOrder.indexOf(key);
  const totalSteps = steps.length - 1;

  let fillSteps = 0;
  if (currentIdx >= getStepIdx('served') || currentStatus === 'completed') fillSteps = 3;
  else if (currentIdx >= getStepIdx('ready')) fillSteps = 2;
  else if (currentIdx >= getStepIdx('cooking') || currentStatus === 'acknowledged') fillSteps = 1;
  else fillSteps = 0;

  const fillPercent = (fillSteps / totalSteps) * 100;

  return (
    <div className="card-surface p-5 rounded-card border border-white/[0.08] space-y-4">
      <span className="eyebrow text-muted block font-mono">
        Order Progress
      </span>

      <div className="relative px-2 pt-1 pb-1">
        {/* Background track */}
        <div className="absolute top-[9px] left-[10px] right-[10px] h-[1px] bg-white/10" />
        {/* Filled accent track */}
        <div
          className="absolute top-[9px] left-[10px] h-[1px] bg-accent transition-all duration-700 ease-out"
          style={{ width: `calc(${fillPercent}% - 20px)` }}
        />

        {/* Dots & Labels */}
        <div className="flex justify-between relative">
          {steps.map((step, idx) => {
            const completed = idx <= fillSteps;
            const current = idx === fillSteps;

            return (
              <div key={step.key} className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`h-3 w-3 rounded-full border transition-all duration-300 ${
                    current
                      ? 'bg-accent border-accent ring-4 ring-accent/20'
                      : completed
                      ? 'bg-accent border-accent'
                      : 'bg-surface border-white/20'
                  }`}
                />
                <span
                  className={`text-[10px] font-mono tracking-wider uppercase ${
                    current
                      ? 'text-accent font-semibold'
                      : completed
                      ? 'text-text font-medium'
                      : 'text-muted/60'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GuestOrderStatusScreen() {
  const { shortCode } = useParams();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await fetchOrdersForTable(shortCode);
        if (isMounted) {
          setOrders(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setOrders([]);
          setIsLoading(false);
        }
      }
    }

    load();

    const unsubscribe = subscribeToOrders(() => {
      if (isMounted) {
        load();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [shortCode]);

  const ordersList = orders || [];
  const latestOrder = ordersList[0] || null;

  const grandTotalAllRounds = ordersList
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const hasUnpaid = ordersList.some(
    (o) => o.payment_status === 'pending' && o.status !== 'cancelled' && o.status !== 'completed'
  );

  const handleSettle = async (paymentMethod) => {
    setSettling(true);
    try {
      for (const o of orders) {
        if (o.payment_status === 'pending' || o.status !== 'completed') {
          await settleOrder(o.id, paymentMethod);
        }
      }
      toast.success('Bill settled successfully! Thank you for dining with us.');
      setIsSettleModalOpen(false);
      const updated = await fetchOrdersForTable(shortCode);
      setOrders(updated);
    } catch (err) {
      toast.error('Failed to settle bill');
    } finally {
      setSettling(false);
    }
  };

  const getStatusText = (status) => {
    const map = {
      placed: 'Placed',
      acknowledged: 'Acknowledged',
      cooking: 'Cooking',
      ready: 'Ready',
      served: 'Served',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'placed':
      case 'acknowledged':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'cooking':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'ready':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'served':
      case 'completed':
        return 'bg-accent/10 text-accent border-accent/20';
      default:
        return 'bg-white/5 text-muted border-white/10';
    }
  };

  const getHeadline = (status) => {
    switch (status) {
      case 'placed':
        return { title: 'Order Sent to Kitchen', desc: 'Your chef has received the ticket.', Icon: Clock };
      case 'acknowledged':
      case 'cooking':
        return { title: 'Chef is Cooking', desc: 'Fresh ingredients on the stove. ~8-12 min wait.', Icon: Flame };
      case 'ready':
        return { title: 'Food is Ready!', desc: 'Waitstaff bringing your dishes now.', Icon: ShoppingBag };
      case 'served':
      case 'completed':
        return { title: 'Dishes Served', desc: 'Enjoy your meal! Order more anytime.', Icon: CheckCircle2 };
      default:
        return { title: 'Order Status', desc: 'Syncing with kitchen...', Icon: Clock };
    }
  };

  /* Loading */
  if (isLoading) {
    return (
      <div className="py-16 text-center space-y-3 font-sans">
        <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-xs font-mono text-muted">Connecting to live kitchen...</p>
      </div>
    );
  }

  /* No orders */
  if (orders.length === 0) {
    return (
      <div className="py-16 text-center space-y-4 font-sans">
        <div className="mx-auto h-16 w-16 rounded-full border border-white/10 bg-surface-2 flex items-center justify-center text-accent">
          <ClipboardList className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-heading font-bold text-text">No Active Orders</h3>
          <p className="text-xs text-muted max-w-xs mx-auto">
            You haven&apos;t placed an order for Table {shortCode} yet.
          </p>
        </div>
        <Link
          to={`/t/${shortCode}`}
          className="inline-block px-6 py-2.5 rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
        >
          Explore Menu &amp; Order
        </Link>
      </div>
    );
  }

  const headline = getHeadline(latestOrder?.status);
  const HeadlineIcon = headline.Icon;

  return (
    <div className="space-y-5 pb-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/t/${shortCode}`}
            className="p-2 rounded-full border border-white/10 bg-surface text-muted hover:text-text hover:border-white/20 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div>
            <h2 className="text-lg font-heading font-bold text-text">Live Status</h2>
            <p className="text-[11px] font-mono text-muted">Table {shortCode} · Live kitchen sync</p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20 flex items-center gap-1.5 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Live Sync
        </span>
      </div>

      {/* Kitchen Status Card */}
      <div className="card-surface p-4 rounded-card border border-white/[0.08] flex items-center gap-3.5">
        <div className="h-10 w-10 rounded-full bg-surface-2 border border-white/10 text-accent flex items-center justify-center shrink-0">
          <HeadlineIcon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-heading font-bold text-xs sm:text-sm text-text truncate">
              {headline.title}
            </h4>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getStatusColor(latestOrder?.status)}`}>
              {getStatusText(latestOrder?.status)}
            </span>
          </div>
          <p className="text-[11px] text-muted mt-0.5 leading-snug">
            {headline.desc}
          </p>
        </div>
      </div>

      {/* Progress Line */}
      <OrderProgressLine currentStatus={latestOrder?.status} />

      {/* Order Rounds */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="eyebrow text-muted font-mono">
            Order Rounds ({orders.length})
          </h3>
          <span className="text-xs font-mono font-semibold text-accent">
            Total: {formatCurrency(grandTotalAllRounds)}
          </span>
        </div>

        {orders.map((round) => (
          <div
            key={round.id}
            className="card-surface p-4 rounded-card border border-white/[0.08] hover:border-white/20 space-y-2.5 transition-all"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-xs text-text">
                  Round #{round.round_number}
                </span>
                <span className="text-[11px] text-muted">
                  {new Date(round.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {round.payment_status === 'paid' ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    Paid
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-muted border border-white/10">
                    Pay Later
                  </span>
                )}
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getStatusColor(round.status)}`}>
                  {getStatusText(round.status)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-sans">
              {round.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-text/90">
                  <span className="truncate pr-2">
                    <span className="font-mono text-accent font-semibold mr-1.5">{item.qty}x</span> {item.name}
                  </span>
                  <span className="font-mono text-muted shrink-0">
                    {formatCurrency(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            {round.guest_notes && (
              <p className="text-[11px] italic text-muted bg-surface-2 p-2 rounded-xl border border-white/[0.06]">
                &quot;{round.guest_notes}&quot;
              </p>
            )}

            <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center text-xs font-mono">
              <span className="text-muted">Round Total</span>
              <span className="font-bold text-accent">
                {formatCurrency(round.total)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        <Link
          to={`/t/${shortCode}`}
          className="block w-full text-center py-3 rounded-full border border-white/10 hover:border-white/20 bg-surface text-text font-semibold text-xs transition-colors"
        >
          + Add More Dishes (Round {orders.length + 1})
        </Link>

        {hasUnpaid ? (
          <button
            type="button"
            onClick={() => setIsSettleModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-accent hover:bg-accent-hover text-bg font-semibold text-sm transition-all shadow-sm cursor-pointer"
          >
            <Banknote className="h-4 w-4" strokeWidth={1.5} />
            Settle Bill · {formatCurrency(grandTotalAllRounds)}
          </button>
        ) : (
          <div className="p-3.5 text-center rounded-xl bg-accent/10 border border-accent/20 text-xs font-mono text-accent">
            ✓ All rounds settled. Enjoy your time!
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      <Modal
        isOpen={isSettleModalOpen}
        onClose={() => !settling && setIsSettleModalOpen(false)}
        title="Settle Bill"
        size="sm"
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="p-4 rounded-xl bg-surface-2 border border-white/10 text-center space-y-1">
            <span className="text-xs font-mono text-muted uppercase">Total Bill</span>
            <div className="text-2xl font-mono font-bold text-accent">
              {formatCurrency(grandTotalAllRounds)}
            </div>
            <p className="text-[11px] text-muted">
              {orders.length} round{orders.length !== 1 ? 's' : ''} · 5% GST included
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={settling}
              onClick={() => handleSettle('online')}
              className="w-full py-3.5 rounded-full bg-accent text-bg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {settling ? (
                <span className="h-4 w-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" strokeWidth={1.5} />
              )}
              Pay Online via UPI / Card
            </button>
            <button
              type="button"
              disabled={settling}
              onClick={() => handleSettle('counter')}
              className="w-full py-3.5 rounded-full border border-white/10 hover:border-white/25 bg-surface text-text font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Banknote className="h-4 w-4" strokeWidth={1.5} />
              Cash Settle at Counter
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
