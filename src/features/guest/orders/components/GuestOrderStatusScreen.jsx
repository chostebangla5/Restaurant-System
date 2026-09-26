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
  ShieldCheck,
  Plus,
  Check,
  XCircle,
  AlertTriangle,
  Coins,
  QrCode,
  ArrowRightLeft,
} from 'lucide-react';

/* ─── Progress Steps ─── */
function OrderProgressLine({ currentStatus }) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="g-card p-5 space-y-2" style={{ borderColor: 'rgba(226,55,68,0.15)', background: 'rgba(226,55,68,0.03)' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--g-accent)' }}>
            <XCircle className="h-4 w-4" /> Order Cancelled
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
          This order was cancelled and removed from the kitchen queue.
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
    <div className="g-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--g-text-secondary)' }}>
          Order Progress
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ background: 'var(--g-green-light)', color: 'var(--g-green)' }}>
          <span className="h-1.5 w-1.5 rounded-full g-pulse-soft" style={{ background: 'var(--g-green)' }} />
          Live
        </span>
      </div>

      <div className="relative px-2 pt-2 pb-1">
        {/* Background track */}
        <div className="absolute top-[13px] left-[14px] right-[14px] h-[2px]" style={{ background: 'var(--g-surface-3)' }} />
        {/* Filled track */}
        <div
          className="absolute top-[13px] left-[14px] h-[2px] transition-all duration-700 ease-out"
          style={{ width: `calc(${fillPercent}% - 28px)`, background: 'var(--g-accent)', boxShadow: '0 0 6px rgba(226,55,68,0.3)' }}
        />

        <div className="flex justify-between relative">
          {steps.map((step, idx) => {
            const completed = idx <= fillSteps;
            const current = idx === fillSteps;
            return (
              <div key={step.key} className="flex flex-col items-center gap-2.5 z-10">
                <div
                  className="h-3.5 w-3.5 rounded-full border-2 transition-all duration-300"
                  style={{
                    ...(current
                      ? { background: 'var(--g-accent)', borderColor: 'var(--g-accent)', boxShadow: '0 0 0 4px var(--g-accent-light)' }
                      : completed
                      ? { background: 'var(--g-accent)', borderColor: 'var(--g-accent)' }
                      : { background: 'var(--g-surface)', borderColor: 'var(--g-border-hover)' }),
                  }}
                />
                <span
                  className="text-[10px] tracking-wider uppercase font-medium"
                  style={{
                    color: current ? 'var(--g-accent)' : completed ? 'var(--g-text)' : 'var(--g-text-muted)',
                    fontWeight: current ? 600 : 400,
                  }}
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
  const [settleMethod, setSettleMethod] = useState('online');
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
    const unsubscribe = subscribeToOrders(() => { if (isMounted) load(); });
    return () => { isMounted = false; unsubscribe(); };
  }, [shortCode]);

  const ordersList = orders || [];
  const latestOrder = ordersList[0] || null;

  const grandTotalAllRounds = ordersList
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const totalPaidOnlinePortion = ordersList
    .filter((o) => o.status !== 'cancelled' && o.split_details?.online)
    .reduce((sum, o) => sum + (Number(o.split_details.online) || 0), 0);

  const remainingCashDue = ordersList
    .filter((o) => o.status !== 'cancelled' && o.payment_status !== 'paid' && o.status !== 'completed')
    .reduce((sum, o) => {
      if (o.split_details?.cash) return sum + Number(o.split_details.cash);
      return sum + (Number(o.total) || 0);
    }, 0);

  const hasUnpaid = ordersList.some(
    (o) => (o.payment_status === 'pending' || o.payment_status === 'partially_paid') && o.status !== 'cancelled' && o.status !== 'completed'
  );

  const hasPartiallyPaid = ordersList.some(
    (o) => o.payment_status === 'partially_paid' && o.status !== 'cancelled' && o.status !== 'completed'
  );

  useEffect(() => {
    if (remainingCashDue > 0) setCustomSplitOnline(Math.round(remainingCashDue / 2));
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
      toast.success('Bill settled! Thank you for dining with us.');
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
      toast.success(`Round #${cancellingOrder.round_number} cancelled.`);
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
    const map = { placed: 'Placed', acknowledged: 'Acknowledged', cooking: 'Cooking', ready: 'Ready', served: 'Served', completed: 'Completed', cancelled: 'Cancelled' };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'placed':
      case 'acknowledged':
        return { background: 'var(--g-amber-light)', color: '#D97706', borderColor: 'rgba(245,158,11,0.15)' };
      case 'cooking':
        return { background: 'rgba(249,115,22,0.08)', color: '#EA580C', borderColor: 'rgba(249,115,22,0.15)' };
      case 'ready':
        return { background: 'rgba(14,165,233,0.08)', color: '#0284C7', borderColor: 'rgba(14,165,233,0.15)' };
      case 'served':
      case 'completed':
        return { background: 'var(--g-green-light)', color: 'var(--g-green)', borderColor: 'rgba(27,166,114,0.15)' };
      case 'cancelled':
        return { background: 'var(--g-accent-light)', color: 'var(--g-accent)', borderColor: 'rgba(226,55,68,0.15)' };
      default:
        return { background: 'var(--g-surface-2)', color: 'var(--g-text-muted)', borderColor: 'var(--g-border)' };
    }
  };

  const getHeadline = (status) => {
    switch (status) {
      case 'placed':
        return { title: 'Order Received', desc: 'Your order is in queue and will be prepared shortly.', Icon: Clock };
      case 'acknowledged':
      case 'cooking':
        return { title: 'Being Prepared', desc: 'The chef is preparing your dishes. ~8-12 min.', Icon: Flame };
      case 'ready':
        return { title: 'Ready to Serve', desc: 'Your food is ready and being brought to your table.', Icon: ShoppingBag };
      case 'served':
      case 'completed':
        return { title: 'Enjoy Your Meal!', desc: 'All dishes have been served. Order more anytime.', Icon: CheckCircle2 };
      case 'cancelled':
        return { title: 'Order Cancelled', desc: 'This order was withdrawn. You can order again.', Icon: XCircle };
      default:
        return { title: 'Tracking Order', desc: 'Connecting to kitchen...', Icon: Clock };
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3 font-sans">
        <div className="h-7 w-7 mx-auto animate-spin rounded-full border-2" style={{ borderColor: 'var(--g-surface-3)', borderTopColor: 'var(--g-accent)' }} />
        <p className="text-xs" style={{ color: 'var(--g-text-muted)' }}>Connecting to kitchen…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 font-sans max-w-sm mx-auto">
        <div className="mx-auto h-20 w-20 rounded-full flex items-center justify-center"
          style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
          <ClipboardList className="h-9 w-9" style={{ color: 'var(--g-text-muted)' }} strokeWidth={1.5} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--g-text)' }}>No Orders Yet</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
            Browse the menu and place your first order.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to={`/t/${shortCode}`}
            className="g-btn-primary inline-flex items-center justify-center gap-2 px-7 py-3 text-sm active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" /> Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  const activeOrders = ordersList.filter((o) => o.status !== 'cancelled');
  const displayOrder = activeOrders[0] || latestOrder;
  const headline = getHeadline(displayOrder?.status);
  const HeadlineIcon = headline.Icon;

  return (
    <div className="space-y-5 pb-8 font-sans w-full">
      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between gap-3 pb-4" style={{ borderBottom: '1px solid var(--g-border)' }}>
        <div className="flex items-center gap-3">
          <Link
            to={`/t/${shortCode}`}
            className="h-10 w-10 rounded-full flex items-center justify-center transition-all shrink-0"
            title="Back to menu"
            aria-label="Back to menu"
            style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)', color: 'var(--g-text-muted)' }}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--g-text)' }}>Your Orders</h1>
            <p className="text-xs" style={{ color: 'var(--g-text-muted)' }}>
              Live order tracking
            </p>
          </div>
        </div>

        <span className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5"
          style={{ background: 'var(--g-green-light)', color: 'var(--g-green)', border: '1px solid rgba(27,166,114,0.12)' }}>
          <span className="h-1.5 w-1.5 rounded-full g-pulse-soft" style={{ background: 'var(--g-green)' }} />
          Connected
        </span>
      </div>

      {/* ─── Headline Status Card ─── */}
      <div className="g-card p-4 flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--g-accent-light)', border: '1px solid rgba(226,55,68,0.1)' }}>
          <HeadlineIcon className="h-5 w-5" style={{ color: 'var(--g-accent)' }} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-sm truncate" style={{ color: 'var(--g-text)' }}>
              {headline.title}
            </h4>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0"
              style={{ ...getStatusColor(displayOrder?.status), border: `1px solid ${getStatusColor(displayOrder?.status).borderColor}` }}>
              {getStatusText(displayOrder?.status)}
            </span>
          </div>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
            {headline.desc}
          </p>
        </div>
      </div>

      {/* ─── Progress Line ─── */}
      <OrderProgressLine currentStatus={displayOrder?.status} />

      {/* ─── Order Rounds ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold" style={{ color: 'var(--g-text-secondary)' }}>
            Orders ({orders.length})
          </h3>
          <span className="text-xs font-bold" style={{ color: 'var(--g-accent)' }}>
            Total: {formatCurrency(grandTotalAllRounds)}
          </span>
        </div>

        {orders.map((round) => {
          const isCancelled = round.status === 'cancelled';
          const canCancel = ['placed', 'acknowledged'].includes(round.status);

          return (
            <div
              key={round.id}
              className="g-card p-4 space-y-3 transition-all"
              style={{ opacity: isCancelled ? 0.6 : 1 }}
            >
              <div className="flex items-center justify-between pb-2.5" style={{ borderBottom: '1px solid var(--g-border)' }}>
                <div className="flex items-center gap-2.5">
                  <span className={`font-bold text-xs ${isCancelled ? 'line-through' : ''}`} style={{ color: isCancelled ? 'var(--g-text-muted)' : 'var(--g-text)' }}>
                    Round #{round.round_number}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--g-text-muted)' }}>
                    {new Date(round.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!isCancelled && (
                    round.payment_status === 'paid' ? (
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: 'var(--g-green-light)', color: 'var(--g-green)', border: '1px solid rgba(27,166,114,0.15)' }}>
                        Paid
                      </span>
                    ) : round.payment_status === 'partially_paid' || round.split_details ? (
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: 'var(--g-amber-light)', color: '#D97706', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <Coins className="h-3 w-3" /> Part Paid
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full"
                        style={{ background: 'var(--g-surface-2)', color: 'var(--g-text-muted)', border: '1px solid var(--g-border)' }}>
                        Pay Later
                      </span>
                    )
                  )}
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ ...getStatusColor(round.status), border: `1px solid ${getStatusColor(round.status).borderColor}` }}>
                    {getStatusText(round.status)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {round.items.map((item, idx) => (
                  <div key={idx} className={`flex justify-between items-center ${isCancelled ? 'line-through' : ''}`}
                    style={{ color: isCancelled ? 'var(--g-text-muted)' : 'var(--g-text-secondary)' }}>
                    <span className="truncate pr-3">
                      <span className="font-bold mr-1.5" style={{ color: isCancelled ? 'var(--g-text-muted)' : 'var(--g-accent)' }}>{item.qty}×</span>
                      {item.name}
                    </span>
                    <span className="shrink-0 font-medium" style={{ color: 'var(--g-text-muted)' }}>
                      {formatCurrency(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>

              {round.guest_notes && (
                <p className="text-[11px] italic p-2.5 rounded-xl" style={{ color: 'var(--g-text-muted)', background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
                  &quot;{round.guest_notes}&quot;
                </p>
              )}

              <div className="pt-2 flex justify-between items-center text-xs font-medium" style={{ borderTop: '1px solid var(--g-border)' }}>
                <span style={{ color: 'var(--g-text-muted)' }}>Subtotal</span>
                {isCancelled ? (
                  <div className="flex items-center gap-2">
                    <span className="line-through" style={{ color: 'var(--g-text-muted)' }}>{formatCurrency(round.total)}</span>
                    <span className="font-bold" style={{ color: 'var(--g-accent)' }}>Cancelled</span>
                  </div>
                ) : (
                  <span className="font-bold" style={{ color: 'var(--g-text)' }}>{formatCurrency(round.total)}</span>
                )}
              </div>

              {canCancel && (
                <div className="pt-2.5 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--g-border)' }}>
                  <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--g-text-muted)' }}>
                    <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: '#D97706' }} />
                    Not started yet
                  </span>
                  <button
                    type="button"
                    onClick={() => setCancellingOrder(round)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer active:scale-95 shrink-0"
                    style={{ color: 'var(--g-accent)', background: 'var(--g-accent-light)', border: '1px solid rgba(226,55,68,0.15)' }}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Table Summary & Actions ─── */}
      <div className="g-card p-5 space-y-3.5">
        <h4 className="text-xs font-semibold pb-2" style={{ color: 'var(--g-text-secondary)', borderBottom: '1px solid var(--g-border)' }}>
          Bill Summary
        </h4>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between" style={{ color: 'var(--g-text-muted)' }}>
            <span>Total Rounds</span>
            <span className="font-medium" style={{ color: 'var(--g-text)' }}>{orders.length}</span>
          </div>
          <div className="flex justify-between" style={{ color: 'var(--g-text-muted)' }}>
            <span>Grand Total</span>
            <span className="font-bold" style={{ color: 'var(--g-accent)' }}>{formatCurrency(grandTotalAllRounds)}</span>
          </div>
          {totalPaidOnlinePortion > 0 && (
            <div className="flex justify-between text-xs" style={{ color: 'var(--g-green)' }}>
              <span>Paid Online</span>
              <span className="font-semibold">-{formatCurrency(totalPaidOnlinePortion)}</span>
            </div>
          )}
          {hasPartiallyPaid && (
            <div className="flex justify-between text-xs font-semibold pt-1" style={{ color: '#D97706', borderTop: '1px dashed var(--g-border)' }}>
              <span>Cash Due</span>
              <span>{formatCurrency(remainingCashDue)}</span>
            </div>
          )}
        </div>

        <div className="pt-2 space-y-2.5" style={{ borderTop: '1px solid var(--g-border)' }}>
          <Link
            to={`/t/${shortCode}`}
            className="g-btn-outline w-full text-center py-3 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> Add More Dishes
          </Link>

          {hasUnpaid ? (
            <button
              type="button"
              onClick={() => setIsSettleModalOpen(true)}
              className="g-btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold active:scale-[0.98]"
            >
              <Banknote className="h-4 w-4" strokeWidth={1.75} />
              {hasPartiallyPaid
                ? `Pay Remaining ${formatCurrency(remainingCashDue)}`
                : `Settle Bill ${formatCurrency(grandTotalAllRounds)}`}
            </button>
          ) : (
            <div className="p-3.5 text-center rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
              style={{ background: 'var(--g-green-light)', color: 'var(--g-green)', border: '1px solid rgba(27,166,114,0.12)' }}>
              <Check className="h-4 w-4" strokeWidth={2} /> All settled. Enjoy!
            </div>
          )}
        </div>
      </div>

      {/* ─── Settle Modal ─── */}
      <Modal isOpen={isSettleModalOpen} onClose={() => !settling && setIsSettleModalOpen(false)} title="Settle Bill" size="sm" guestTheme={true}>
        <div className="space-y-4 py-2 font-sans">
          <div className="p-4 rounded-xl text-center space-y-1"
            style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--g-text-muted)' }}>
              {hasPartiallyPaid ? 'Cash Due' : 'Total Bill'}
            </span>
            <div className="text-2xl font-bold" style={{ color: 'var(--g-accent)' }}>
              {formatCurrency(remainingCashDue)}
            </div>
            {hasPartiallyPaid && (
              <p className="text-[11px] font-medium" style={{ color: 'var(--g-green)' }}>
                ₹{totalPaidOnlinePortion} already paid online
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
            {['online', 'counter', 'split'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setSettleMethod(method)}
                className="py-2 px-1 text-center rounded-lg text-xs font-medium transition-all"
                style={{
                  background: settleMethod === method ? 'var(--g-accent)' : 'transparent',
                  color: settleMethod === method ? '#fff' : 'var(--g-text-muted)',
                  fontWeight: settleMethod === method ? 700 : 500,
                }}
              >
                {method === 'online' ? 'Online' : method === 'counter' ? 'Cash' : 'Split'}
              </button>
            ))}
          </div>

          {/* Online */}
          {settleMethod === 'online' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl text-center space-y-2" style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
                <div className="h-24 w-24 mx-auto bg-white p-2 rounded-xl flex items-center justify-center"
                  style={{ border: '1px solid var(--g-border)' }}>
                  <QrCode className="h-20 w-20" style={{ color: 'var(--g-text)' }} strokeWidth={1.5} />
                </div>
                <p className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>Scan with any UPI app</p>
              </div>
              <button type="button" disabled={settling} onClick={() => handleSettle('online')}
                className="g-btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {settling ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CreditCard className="h-4 w-4" strokeWidth={1.5} />}
                Pay {formatCurrency(remainingCashDue)}
              </button>
            </div>
          )}

          {/* Cash */}
          {settleMethod === 'counter' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl text-center space-y-1" style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
                <p className="text-xs" style={{ color: 'var(--g-text-secondary)' }}>Hand over cash to the staff or counter cashier.</p>
                <span className="text-base font-bold block" style={{ color: '#D97706' }}>{formatCurrency(remainingCashDue)}</span>
              </div>
              <button type="button" disabled={settling} onClick={() => handleSettle('counter')}
                className="g-btn-outline w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2">
                <Banknote className="h-4 w-4" strokeWidth={1.5} /> Request Cash Settlement
              </button>
            </div>
          )}

          {/* Split */}
          {settleMethod === 'split' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl space-y-3" style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--g-text)' }}>
                    <ArrowRightLeft className="h-3.5 w-3.5" style={{ color: 'var(--g-accent)' }} /> Configure Split
                  </span>
                  <button type="button" onClick={() => setCustomSplitOnline(Math.round(remainingCashDue / 2))}
                    className="text-[10px] font-medium cursor-pointer" style={{ color: 'var(--g-accent)' }}>
                    Reset 50/50
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--g-accent)' }}>Online</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--g-text-muted)' }}>₹</span>
                      <input type="number" min="1" max={remainingCashDue - 1} value={customSplitOnline}
                        onChange={(e) => setCustomSplitOnline(Number(e.target.value))}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: 'var(--g-surface)', border: '1px solid rgba(226,55,68,0.3)', color: 'var(--g-text)' }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--g-amber)' }}>Cash</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--g-text-muted)' }}>₹</span>
                      <input type="number" readOnly value={effectiveSettleCash}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs font-bold cursor-not-allowed"
                        style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)', color: '#D97706' }} />
                    </div>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden flex" style={{ background: 'var(--g-surface)' }}>
                  <div className="h-full transition-all duration-300" style={{ width: `${(effectiveSettleOnline / (remainingCashDue || 1)) * 100}%`, background: 'var(--g-accent)' }} />
                  <div className="h-full transition-all duration-300" style={{ width: `${(effectiveSettleCash / (remainingCashDue || 1)) * 100}%`, background: 'var(--g-amber)' }} />
                </div>
              </div>
              <button type="button" disabled={settling}
                onClick={() => handleSettle('split', { onlineAmount: effectiveSettleOnline, cashAmount: effectiveSettleCash })}
                className="g-btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {settling ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Coins className="h-4 w-4" strokeWidth={1.5} />}
                Pay {formatCurrency(effectiveSettleOnline)} Online &bull; {formatCurrency(effectiveSettleCash)} Cash
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* ─── Cancel Confirmation Modal ─── */}
      <Modal isOpen={!!cancellingOrder} onClose={() => !isCancelling && setCancellingOrder(null)} title="Cancel Order" size="sm" guestTheme={true}>
        <div className="space-y-4 py-2 font-sans">
          <div className="p-4 rounded-xl space-y-2.5 text-center"
            style={{ background: 'var(--g-accent-light)', border: '1px solid rgba(226,55,68,0.12)' }}>
            <div className="h-10 w-10 mx-auto rounded-full flex items-center justify-center"
              style={{ background: 'rgba(226,55,68,0.1)', color: 'var(--g-accent)' }}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm" style={{ color: 'var(--g-text)' }}>
              Cancel Round #{cancellingOrder?.round_number}?
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
              This will remove the order ({formatCurrency(cancellingOrder?.total || 0)}) from the kitchen queue. This cannot be undone.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className="w-full py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer active:scale-98"
              style={{ background: 'var(--g-accent)', color: '#fff' }}
            >
              {isCancelling ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Confirm Cancel
            </button>
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => setCancellingOrder(null)}
              className="g-btn-outline w-full py-3.5 text-sm font-semibold flex items-center justify-center"
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
