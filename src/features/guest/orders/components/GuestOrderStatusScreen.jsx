import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  fetchOrdersForTable,
  subscribeToOrders,
  settleOrder,
  cancelOrder,
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
  Sparkles,
  ShieldCheck,
  Plus,
  Check,
  XCircle,
  AlertTriangle,
  Coins,
  QrCode,
  ArrowRightLeft,
} from 'lucide-react';

/* ─── Modern Progress Line with Dot Pulses ─── */
function OrderProgressLine({ currentStatus }) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="card-surface p-5 rounded-card border border-rose-500/25 bg-rose-500/5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
            <XCircle className="h-4 w-4" /> Order Cancelled
          </span>
          <span className="font-mono text-[10px] text-muted">Ticket Withdrawn</span>
        </div>
        <p className="text-xs text-muted font-sans leading-relaxed">
          This order was cancelled and removed from the active kitchen prep line.
        </p>
      </div>
    );
  }

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
    <div className="card-surface p-6 rounded-card border border-white/[0.08] space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-text/80 block">
          Kitchen Dispatch Status
        </span>
        <span className="font-mono text-[10px] text-accent">Real-Time Sync</span>
      </div>

      <div className="relative px-2 pt-2 pb-1">
        {/* Background track */}
        <div className="absolute top-[13px] left-[14px] right-[14px] h-[2px] bg-white/10" />
        {/* Filled accent track */}
        <div
          className="absolute top-[13px] left-[14px] h-[2px] bg-accent transition-all duration-700 ease-out shadow-[0_0_8px_#C6FF3D]"
          style={{ width: `calc(${fillPercent}% - 28px)` }}
        />

        {/* Dots & Labels */}
        <div className="flex justify-between relative">
          {steps.map((step, idx) => {
            const completed = idx <= fillSteps;
            const current = idx === fillSteps;

            return (
              <div key={step.key} className="flex flex-col items-center gap-2.5 z-10">
                <div
                  className={`h-3.5 w-3.5 rounded-full border transition-all duration-300 ${
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
  const [settleMethod, setSettleMethod] = useState('online'); // online | counter | split
  const [customSplitOnline, setCustomSplitOnline] = useState(0);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

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

  // Total cash due across all rounds, respecting already-paid online portions
  const totalPaidOnlinePortion = ordersList
    .filter((o) => o.status !== 'cancelled' && o.split_details?.online)
    .reduce((sum, o) => sum + (Number(o.split_details.online) || 0), 0);

  const remainingCashDue = ordersList
    .filter((o) => o.status !== 'cancelled' && o.payment_status !== 'paid' && o.status !== 'completed')
    .reduce((sum, o) => {
      if (o.split_details?.cash) {
        return sum + Number(o.split_details.cash);
      }
      return sum + (Number(o.total) || 0);
    }, 0);

  const hasUnpaid = ordersList.some(
    (o) => (o.payment_status === 'pending' || o.payment_status === 'partially_paid') && o.status !== 'cancelled' && o.status !== 'completed'
  );

  const hasPartiallyPaid = ordersList.some(
    (o) => o.payment_status === 'partially_paid' && o.status !== 'cancelled' && o.status !== 'completed'
  );

  // Set default custom split online amount to 50% of remaining due
  useEffect(() => {
    if (remainingCashDue > 0) {
      setCustomSplitOnline(Math.round(remainingCashDue / 2));
    }
  }, [remainingCashDue]);

  const effectiveSettleOnline = Math.max(1, Math.min(remainingCashDue > 1 ? remainingCashDue - 1 : 1, Number(customSplitOnline) || Math.round(remainingCashDue / 2)));
  const effectiveSettleCash = Math.max(0, remainingCashDue - effectiveSettleOnline);

  const handleSettle = async (paymentMethod, splitDetails = null) => {
    setSettling(true);
    try {
      for (const o of orders) {
        if (o.payment_status === 'pending' || o.payment_status === 'partially_paid' || o.status !== 'completed') {
          await settleOrder(o.id, paymentMethod, splitDetails);
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

  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setIsCancelling(true);
    try {
      await cancelOrder(cancellingOrder.id, shortCode, 'Cancelled by guest from table app');
      toast.success(`Round #${cancellingOrder.round_number} cancelled successfully.`);
      setCancellingOrder(null);
      const updated = await fetchOrdersForTable(shortCode);
      setOrders(Array.isArray(updated) ? updated : []);
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
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
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-white/5 text-muted border-white/10';
    }
  };

  const getHeadline = (status) => {
    switch (status) {
      case 'placed':
        return { title: 'Order Sent to Kitchen', desc: 'Your ticket is on the line and queued for prep.', Icon: Clock };
      case 'acknowledged':
      case 'cooking':
        return { title: 'Chef is Preparing Your Dishes', desc: 'Ingredients on the stove. Estimated prep ~8-12 min.', Icon: Flame };
      case 'ready':
        return { title: 'Food is Plated & Ready', desc: 'Waitstaff is serving your dishes to the table now.', Icon: ShoppingBag };
      case 'served':
      case 'completed':
        return { title: 'Courses Served', desc: 'Enjoy your dining! Order additional rounds anytime.', Icon: CheckCircle2 };
      case 'cancelled':
        return { title: 'Order Round Cancelled', desc: 'Your ticket was withdrawn from the kitchen. You can order fresh dishes anytime.', Icon: XCircle };
      default:
        return { title: 'Live Kitchen Connection', desc: 'Synchronizing with kitchen display...', Icon: Clock };
    }
  };

  /* Loading state */
  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3 font-sans">
        <div className="h-7 w-7 mx-auto animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-xs font-mono text-muted tracking-wider uppercase">Connecting to live kitchen display...</p>
      </div>
    );
  }

  /* No orders */
  if (orders.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 font-sans max-w-md mx-auto">
        <div className="mx-auto h-20 w-20 rounded-full border border-white/10 bg-surface-2 flex items-center justify-center text-accent shadow-sm">
          <ClipboardList className="h-9 w-9" strokeWidth={1.5} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-heading font-extrabold text-text tracking-tight">No Active Orders Yet</h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed font-sans">
            No live kitchen tickets have been dispatched for Table {shortCode} yet.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to={`/t/${shortCode}`}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 min-h-[44px] touch-manipulation rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Browse Menu &amp; Order</span>
          </Link>
        </div>
      </div>
    );
  }

  // Track the most relevant active order, or latest order if all are cancelled
  const activeOrders = ordersList.filter((o) => o.status !== 'cancelled');
  const displayOrder = activeOrders[0] || latestOrder;
  const headline = getHeadline(displayOrder?.status);
  const HeadlineIcon = headline.Icon;

  return (
    <div className="space-y-8 pb-16 font-sans w-full">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <Link
            to={`/t/${shortCode}`}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full border border-white/10 bg-surface-2 flex items-center justify-center text-muted hover:text-white hover:border-white/20 transition-all shrink-0"
            title="Back to menu"
            aria-label="Back to menu"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-accent uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              <span>Real-Time Kitchen Feed</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-text tracking-tight">
              Live Order Status &amp; Rounds
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs font-mono text-accent bg-accent/10 px-3.5 py-1.5 rounded-full border border-accent/20 flex items-center gap-2 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span>KDS Connected</span>
          </span>
        </div>
      </div>

      {/* Two Column Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Progress & Rounds (Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Kitchen Status Card */}
          <div className="card-surface p-5 rounded-card border border-white/[0.08] flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-surface-2 border border-white/10 text-accent flex items-center justify-center shrink-0 shadow-sm">
              <HeadlineIcon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-heading font-bold text-sm sm:text-base text-text truncate">
                  {headline.title}
                </h4>
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getStatusColor(displayOrder?.status)}`}>
                  {getStatusText(displayOrder?.status)}
                </span>
              </div>
              <p className="text-xs text-muted mt-1 leading-relaxed font-sans">
                {headline.desc}
              </p>
            </div>
          </div>

          {/* Progress Line */}
          <OrderProgressLine currentStatus={displayOrder?.status} />

          {/* Order Rounds Itemized Breakdown */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-text/80">
                Dispatched Rounds ({orders.length})
              </h3>
              <span className="text-xs font-mono font-semibold text-accent">
                Rounds Total: {formatCurrency(grandTotalAllRounds)}
              </span>
            </div>

            {orders.map((round) => {
              const isCancelled = round.status === 'cancelled';
              const canCancel = ['placed', 'acknowledged'].includes(round.status);

              return (
                <div
                  key={round.id}
                  className={`card-surface p-5 rounded-card border transition-all space-y-3 ${
                    isCancelled
                      ? 'border-white/[0.04] bg-white/[0.01] opacity-75'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2.5 font-mono">
                      <span className={`font-bold text-xs sm:text-sm ${isCancelled ? 'text-muted line-through' : 'text-text'}`}>
                        Round #{round.round_number}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(round.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isCancelled && (
                        round.payment_status === 'paid' ? (
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                            Paid
                          </span>
                        ) : round.payment_status === 'partially_paid' || round.split_details ? (
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                            <Coins className="h-3 w-3 text-amber-400" />
                            Part Paid (₹{round.split_details?.online || 0} Online &bull; ₹{round.split_details?.cash || 0} Cash Due)
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 text-muted border border-white/10">
                            Pay on Exit
                          </span>
                        )
                      )}
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getStatusColor(round.status)}`}>
                        {getStatusText(round.status)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-sans">
                    {round.items.map((item, idx) => (
                      <div key={idx} className={`flex justify-between items-center ${isCancelled ? 'text-text/50 line-through' : 'text-text/90'}`}>
                        <span className="truncate pr-3">
                          <span className={`font-mono font-semibold mr-2 ${isCancelled ? 'text-muted' : 'text-accent'}`}>{item.qty}x</span> {item.name}
                        </span>
                        <span className="font-mono text-muted shrink-0">
                          {formatCurrency(item.price * item.qty)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {round.guest_notes && (
                    <p className="text-[11px] italic text-muted bg-surface-2 p-2.5 rounded-xl border border-white/[0.06] font-sans">
                      &quot;{round.guest_notes}&quot;
                    </p>
                  )}

                  <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center text-xs font-mono">
                    <span className="text-muted">Round Subtotal</span>
                    {isCancelled ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted/50 line-through">{formatCurrency(round.total)}</span>
                        <span className="font-bold text-rose-400">Cancelled (₹0.00)</span>
                      </div>
                    ) : (
                      <span className="font-bold text-accent">
                        {formatCurrency(round.total)}
                      </span>
                    )}
                  </div>

                  {/* Cancel Round Button */}
                  {canCancel && (
                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted flex items-center gap-1 font-sans">
                        <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        Queued for chef &bull; Not cooked yet
                      </span>
                      <button
                        type="button"
                        onClick={() => setCancellingOrder(round)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[34px] rounded-full text-xs font-mono font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:border-rose-500/40 transition-all cursor-pointer active:scale-95 shrink-0"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Cancel Round</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Actions & Settlement (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Bill Settlement Overview */}
          <div className="card-surface p-6 rounded-card border border-white/[0.08] space-y-4">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-text/80 pb-1 border-b border-white/[0.06]">
              Table Tab Summary
            </h4>

            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between text-muted">
                <span>Rounds Dispatched</span>
                <span className="font-mono text-text">{orders.length}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Table Code</span>
                <span className="font-mono text-text">{shortCode}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>All Rounds Total</span>
                <span className="font-mono text-accent font-bold text-sm">{formatCurrency(grandTotalAllRounds)}</span>
              </div>
              {totalPaidOnlinePortion > 0 && (
                <div className="flex justify-between text-accent text-xs">
                  <span>Online Paid (Part)</span>
                  <span className="font-mono font-semibold">-{formatCurrency(totalPaidOnlinePortion)}</span>
                </div>
              )}
              {hasPartiallyPaid && (
                <div className="flex justify-between text-amber-300 text-xs font-semibold pt-1 border-t border-dashed border-white/10">
                  <span>Balance Cash Due</span>
                  <span className="font-mono text-sm">{formatCurrency(remainingCashDue)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 space-y-3">
              <Link
                to={`/t/${shortCode}`}
                className="w-full text-center py-3.5 min-h-[44px] touch-manipulation rounded-full border border-white/10 hover:border-white/20 bg-surface-2 text-text font-heading font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add More Dishes (Round #{orders.length + 1})</span>
              </Link>

              {hasUnpaid ? (
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-accent hover:bg-accent-hover text-bg font-heading font-bold text-sm transition-all shadow-lift cursor-pointer active:scale-[0.98]"
                >
                  <Banknote className="h-4 w-4" strokeWidth={1.75} />
                  <span>
                    {hasPartiallyPaid
                      ? `Settle Cash Due &bull; ${formatCurrency(remainingCashDue)}`
                      : `Settle Bill &bull; ${formatCurrency(grandTotalAllRounds)}`}
                  </span>
                </button>
              ) : (
                <div className="p-4 text-center rounded-xl bg-accent/10 border border-accent/20 text-xs font-mono text-accent flex items-center justify-center gap-1.5">
                  <Check className="h-4 w-4" strokeWidth={2} />
                  <span>All rounds settled. Enjoy your time!</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-muted flex items-center justify-center gap-1.5 font-mono">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
            <span>Automatic kitchen receipt printing enabled</span>
          </p>
        </div>
      </div>

      {/* Bill Settlement Modal */}
      <Modal
        isOpen={isSettleModalOpen}
        onClose={() => !settling && setIsSettleModalOpen(false)}
        title="Settle Bill"
        size="sm"
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="p-4 rounded-xl bg-surface-2 border border-white/10 text-center space-y-1">
            <span className="text-xs font-mono text-muted uppercase tracking-wider">
              {hasPartiallyPaid ? 'Remaining Cash Due' : 'Total Cumulative Bill'}
            </span>
            <div className="text-2xl font-mono font-bold text-accent">
              {formatCurrency(remainingCashDue)}
            </div>
            {hasPartiallyPaid && (
              <p className="text-[11px] text-emerald-400 font-mono">
                ₹{totalPaidOnlinePortion} already paid online via UPI
              </p>
            )}
            <p className="text-[11px] text-muted font-sans">
              {orders.length} round{orders.length !== 1 ? 's' : ''} &bull; 5% GST inclusive
            </p>
          </div>

          {/* Settle Mode Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-surface-2 border border-white/10">
            <button
              type="button"
              onClick={() => setSettleMethod('online')}
              className={`py-2 px-1 text-center rounded-lg text-xs font-medium transition-all ${
                settleMethod === 'online'
                  ? 'bg-accent text-bg font-bold shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              Online (UPI)
            </button>
            <button
              type="button"
              onClick={() => setSettleMethod('counter')}
              className={`py-2 px-1 text-center rounded-lg text-xs font-medium transition-all ${
                settleMethod === 'counter'
                  ? 'bg-accent text-bg font-bold shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              Cash Counter
            </button>
            <button
              type="button"
              onClick={() => setSettleMethod('split')}
              className={`py-2 px-1 text-center rounded-lg text-xs font-medium transition-all ${
                settleMethod === 'split'
                  ? 'bg-accent text-bg font-bold shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              Part (Split)
            </button>
          </div>

          {/* Tab 1: Full Online */}
          {settleMethod === 'online' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-surface-2 border border-white/10 text-center space-y-2">
                <div className="h-24 w-24 mx-auto bg-white p-2 rounded-xl flex items-center justify-center">
                  <QrCode className="h-20 w-20 text-bg" strokeWidth={1.5} />
                </div>
                <p className="text-[11px] text-muted font-mono">Scan QR with GPay, PhonePe, or Paytm</p>
              </div>

              <button
                type="button"
                disabled={settling}
                onClick={() => handleSettle('online')}
                className="w-full py-3.5 rounded-full bg-accent text-bg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
              >
                {settling ? (
                  <span className="h-4 w-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" strokeWidth={1.5} />
                )}
                Authorize {formatCurrency(remainingCashDue)} via UPI
              </button>
            </div>
          )}

          {/* Tab 2: Full Cash */}
          {settleMethod === 'counter' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-surface-2 border border-white/10 text-center space-y-1">
                <p className="text-xs text-text">Please hand over cash directly to the service staff or counter cashier.</p>
                <span className="text-base font-mono font-bold text-amber-300 block">{formatCurrency(remainingCashDue)}</span>
              </div>
              <button
                type="button"
                disabled={settling}
                onClick={() => handleSettle('counter')}
                className="w-full py-3.5 rounded-full border border-white/10 hover:border-white/25 bg-surface text-text font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Banknote className="h-4 w-4" strokeWidth={1.5} />
                Request Cash Settle at Counter
              </button>
            </div>
          )}

          {/* Tab 3: Split Payment */}
          {settleMethod === 'split' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-surface-2 border border-accent/25 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-text">
                  <span className="flex items-center gap-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-accent" /> Configure Split
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomSplitOnline(Math.round(remainingCashDue / 2))}
                    className="text-[10px] font-mono text-accent hover:underline"
                  >
                    Reset 50/50
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-accent uppercase tracking-wider block">Pay Online</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted">₹</span>
                      <input
                        type="number"
                        min="1"
                        max={remainingCashDue - 1}
                        value={customSplitOnline}
                        onChange={(e) => setCustomSplitOnline(Number(e.target.value))}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-surface border border-accent/30 text-xs font-mono font-bold text-text focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-amber-300 uppercase tracking-wider block">Cash at Counter</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted">₹</span>
                      <input
                        type="number"
                        readOnly
                        value={effectiveSettleCash}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-surface/50 border border-white/10 text-xs font-mono font-bold text-amber-300 cursor-not-allowed select-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-surface overflow-hidden flex">
                  <div
                    className="bg-accent transition-all duration-300 h-full"
                    style={{ width: `${(effectiveSettleOnline / (remainingCashDue || 1)) * 100}%` }}
                  />
                  <div
                    className="bg-amber-400/80 transition-all duration-300 h-full"
                    style={{ width: `${(effectiveSettleCash / (remainingCashDue || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={settling}
                onClick={() =>
                  handleSettle('split', {
                    onlineAmount: effectiveSettleOnline,
                    cashAmount: effectiveSettleCash,
                  })
                }
                className="w-full py-3.5 rounded-full bg-accent text-bg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
              >
                {settling ? (
                  <span className="h-4 w-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                ) : (
                  <Coins className="h-4 w-4" strokeWidth={1.5} />
                )}
                Pay {formatCurrency(effectiveSettleOnline)} Online &bull; Rest {formatCurrency(effectiveSettleCash)} Cash
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Order Cancellation Confirmation Modal */}
      <Modal
        isOpen={!!cancellingOrder}
        onClose={() => !isCancelling && setCancellingOrder(null)}
        title="Cancel Order Round"
        size="sm"
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2.5 text-center">
            <div className="h-10 w-10 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h4 className="font-heading font-bold text-sm text-text">
              Cancel Round #{cancellingOrder?.round_number}?
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              This will pull ticket #{cancellingOrder?.round_number} ({formatCurrency(cancellingOrder?.total || 0)}) directly from the active kitchen prep queue. This action cannot be reversed.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className="w-full py-3.5 min-h-[44px] rounded-full bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer shadow-sm active:scale-98"
            >
              {isCancelling ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Confirm &amp; Cancel Round
            </button>
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => setCancellingOrder(null)}
              className="w-full py-3.5 min-h-[44px] rounded-full border border-white/10 hover:border-white/20 bg-surface-2 text-text font-semibold text-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              Keep My Order
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default GuestOrderStatusScreen;
