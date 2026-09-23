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
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  CreditCardIcon,
} from '@heroicons/react/24/solid';

/* ─── Gold Progress Line with Dot Pulses ─── */
function OrderProgressLine({ currentStatus }) {
  const steps = [
    { key: 'placed', label: 'Received' },
    { key: 'cooking', label: 'Preparing' },
    { key: 'ready', label: 'Ready' },
    { key: 'served', label: 'Served' },
  ];

  const statusOrder = ['placed', 'acknowledged', 'cooking', 'ready', 'served', 'completed'];
  const currentIdx = statusOrder.indexOf(currentStatus || 'placed');

  // Calculate fill percentage
  const getStepIdx = (key) => statusOrder.indexOf(key);
  const totalSteps = steps.length - 1;

  // Map current status to step position
  let fillSteps = 0;
  if (currentIdx >= getStepIdx('served') || currentStatus === 'completed') fillSteps = 3;
  else if (currentIdx >= getStepIdx('ready')) fillSteps = 2;
  else if (currentIdx >= getStepIdx('cooking') || currentStatus === 'acknowledged') fillSteps = 1;
  else fillSteps = 0;

  const fillPercent = (fillSteps / totalSteps) * 100;

  return (
    <div className="royal-card p-5 space-y-1">
      <span className="text-[10px] font-semibold text-dhaba-ink-muted uppercase tracking-widest block mb-4 font-body">
        Order Progress
      </span>

      <div className="relative px-2">
        {/* Background line */}
        <div className="absolute top-[7px] left-[7px] right-[7px] h-[2px] bg-dhaba-gold/15" />
        {/* Filled gold line */}
        <div
          className="absolute top-[7px] left-[7px] h-[2px] bg-dhaba-gold transition-all duration-700 ease-out"
          style={{ width: `calc(${fillPercent}% - 14px)` }}
        />

        {/* Dots & Labels */}
        <div className="flex justify-between relative">
          {steps.map((step, idx) => {
            const stepIdx = getStepIdx(step.key);
            const isCompleted = (step.key === 'cooking' && currentStatus === 'acknowledged') 
              ? false 
              : currentIdx >= stepIdx;
            const isCurrent = (step.key === 'cooking' && (currentStatus === 'acknowledged' || currentStatus === 'cooking'))
              || (step.key === 'placed' && currentStatus === 'placed')
              || (step.key === 'ready' && currentStatus === 'ready')
              || (step.key === 'served' && (currentStatus === 'served' || currentStatus === 'completed'));

            // Adjust: for 'cooking' step, mark completed if status is at cooking or beyond
            const completed = idx <= fillSteps;
            const current = idx === fillSteps;

            return (
              <div key={step.key} className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`status-dot ${completed ? 'completed' : ''} ${current ? 'current' : ''}`}
                />
                <span
                  className={`text-[10px] font-semibold font-body ${
                    current
                      ? 'text-dhaba-gold font-bold'
                      : completed
                      ? 'text-dhaba-ink'
                      : 'text-dhaba-ink-muted/50'
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

    // Subscribe to live status updates from the staff panel
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

  // Latest active order
  const ordersList = orders || [];
  const latestOrder = ordersList[0] || null;

  // Aggregate bill across all rounds
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
        return 'bg-dhaba-gold/10 text-dhaba-gold border-dhaba-gold/30';
      case 'cooking':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'ready':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'served':
      case 'completed':
        return 'bg-[#D4AF37]/15 text-[#A68520] border-[#D4AF37]/40 font-bold';
      default:
        return 'bg-dhaba-gold/10 text-dhaba-gold/60 border-dhaba-gold/20';
    }
  };

  const getHeadline = (status) => {
    switch (status) {
      case 'placed':
        return { title: 'Order Sent to Kitchen', desc: 'Your chef has received the ticket.', Icon: ClockIcon };
      case 'acknowledged':
      case 'cooking':
        return { title: 'Chef is Cooking', desc: 'Fresh ingredients on the stove. ~8-12 min wait.', Icon: FireIcon };
      case 'ready':
        return { title: 'Food is Ready!', desc: 'Waitstaff bringing your dishes now.', Icon: ShoppingBagIcon };
      case 'served':
      case 'completed':
        return { title: 'Dishes Served', desc: 'Enjoy your meal! Order more anytime.', Icon: CheckCircleIcon };
      default:
        return { title: 'Order Status', desc: 'Syncing with kitchen...', Icon: ClockIcon };
    }
  };

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-dhaba-gold border-t-transparent" />
        <p className="text-xs font-semibold text-[#E5C158] font-body">Connecting to live kitchen...</p>
      </div>
    );
  }

  /* ─── No orders ─── */
  if (orders.length === 0) {
    return (
      <div className="py-12 text-center space-y-4 font-body">
        <div className="mx-auto h-16 w-16 rounded-full border-2 border-dhaba-gold/20 bg-dhaba-gold/10 flex items-center justify-center text-2xl">
          📋
        </div>
        <div>
          <h3 className="text-base font-serif font-bold text-dhaba-ivory">No Active Orders</h3>
          <p className="text-xs text-dhaba-gold/50 mt-1 max-w-xs mx-auto">
            You haven't placed an order for Table {shortCode} yet.
          </p>
        </div>
        <Link
          to={`/t/${shortCode}`}
          className="inline-block px-5 py-2.5 rounded-xl bg-dhaba-sindoor text-dhaba-ivory text-sm font-bold hover:bg-dhaba-sindoor-hover transition-colors shadow-sindoor"
        >
          Explore Menu & Order
        </Link>
      </div>
    );
  }

  const headline = getHeadline(latestOrder?.status);
  const HeadlineIcon = headline.Icon;

  return (
    <div className="space-y-5 pb-8 font-body">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/t/${shortCode}`}
            className="p-2 rounded-xl text-dhaba-gold hover:bg-dhaba-gold/10 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-serif font-bold text-[#F6EEDD]">Live Status</h2>
            <p className="text-[11px] text-[#E5C158] font-semibold">Table {shortCode} · Live kitchen sync</p>
          </div>
        </div>

        <span className="text-[10px] font-bold text-[#E5C158] bg-[#E5C158]/15 px-2.5 py-1 rounded-full border border-[#E5C158]/40 flex items-center gap-1.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#E5C158] animate-pulse" />
          Live Sync
        </span>
      </div>

      {/* ═══ Kitchen Status Card ═══ */}
      <div className="royal-card p-4 flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-2xl bg-dhaba-gold/10 border border-dhaba-gold/30 flex items-center justify-center shrink-0">
          <HeadlineIcon className="h-6 w-6 text-dhaba-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-xs sm:text-sm text-dhaba-ink truncate">
              {headline.title}
            </h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusColor(latestOrder?.status)}`}>
              {getStatusText(latestOrder?.status)}
            </span>
          </div>
          <p className="text-[11px] text-dhaba-ink-muted mt-0.5 leading-snug">
            {headline.desc}
          </p>
        </div>
      </div>

      {/* ═══ Gold Progress Line ═══ */}
      <OrderProgressLine currentStatus={latestOrder?.status} />

      {/* ═══ Order Rounds ═══ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#E5C158]">
            Order Rounds ({orders.length})
          </h3>
          <span className="text-xs font-bold text-dhaba-gold">
            Total: {formatCurrency(grandTotalAllRounds)}
          </span>
        </div>

        {orders.map((round) => (
          <div
            key={round.id}
            className="royal-card p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-dhaba-gold/15">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-dhaba-ink">
                  Round #{round.round_number}
                </span>
                <span className="text-[11px] text-dhaba-ink-muted">
                  {new Date(round.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {round.payment_status === 'paid' ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#A68520] border border-[#D4AF37]/40">
                    Paid
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-dhaba-gold/10 text-dhaba-gold border border-dhaba-gold/30">
                    Pay Later
                  </span>
                )}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${getStatusColor(round.status)}`}>
                  {getStatusText(round.status)}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              {round.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-dhaba-ink">
                  <span className="truncate pr-2">
                    <span className="font-bold text-dhaba-gold">{item.qty}x</span> {item.name}
                  </span>
                  <span className="font-semibold text-dhaba-ink shrink-0">
                    {formatCurrency(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            {round.guest_notes && (
              <p className="text-[11px] italic text-dhaba-ink-muted bg-dhaba-gold/5 p-2 rounded-lg border border-dhaba-gold/10">
                "{round.guest_notes}"
              </p>
            )}

            <div className="pt-1 border-t border-dhaba-gold/15 flex justify-between items-center text-xs">
              <span className="text-dhaba-ink-muted">Round Total</span>
              <span className="font-bold text-dhaba-gold">
                {formatCurrency(round.total)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Actions ═══ */}
      <div className="space-y-2.5 pt-2">
        <Link
          to={`/t/${shortCode}`}
          className="block w-full text-center py-3 rounded-2xl border-2 border-[#E5C158]/40 text-[#E5C158] font-bold text-sm hover:bg-[#E5C158]/10 transition-colors shadow-sm"
        >
          + Add More Dishes (Round {orders.length + 1})
        </Link>

        {hasUnpaid ? (
          <button
            type="button"
            onClick={() => setIsSettleModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#C83200] hover:bg-[#A82A00] text-dhaba-ivory font-bold text-sm transition-all shadow-xl shadow-[#C83200]/40 cursor-pointer"
          >
            <BanknotesIcon className="h-4 w-4" />
            Settle Bill · {formatCurrency(grandTotalAllRounds)}
          </button>
        ) : (
          <div className="p-3.5 text-center rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-bold text-[#A68520]">
            ✓ All rounds settled. Enjoy your time!
          </div>
        )}
      </div>

      {/* ═══ Settlement Modal ═══ */}
      <Modal
        isOpen={isSettleModalOpen}
        onClose={() => !settling && setIsSettleModalOpen(false)}
        title="Settle Bill"
        size="sm"
      >
        <div className="space-y-4 py-2">
          <div className="p-3.5 rounded-xl bg-dhaba-plum-light border border-dhaba-gold/20 text-center space-y-1">
            <span className="text-xs text-dhaba-gold/50 font-semibold uppercase">Total Bill</span>
            <div className="text-2xl font-bold text-dhaba-gold font-serif">
              {formatCurrency(grandTotalAllRounds)}
            </div>
            <p className="text-[11px] text-dhaba-gold/40">
              {orders.length} round{orders.length !== 1 ? 's' : ''} · 5% GST included
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled={settling}
              onClick={() => handleSettle('online')}
              className="w-full py-3 rounded-xl bg-dhaba-sindoor text-dhaba-ivory font-bold text-sm flex items-center justify-center gap-2 hover:bg-dhaba-sindoor-hover disabled:opacity-60 transition-colors shadow-sindoor"
            >
              {settling ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CreditCardIcon className="h-4 w-4" />
              )}
              Pay Online via UPI / Card
            </button>
            <button
              type="button"
              disabled={settling}
              onClick={() => handleSettle('counter')}
              className="w-full py-3 rounded-xl border-2 border-dhaba-gold/30 text-dhaba-gold font-bold text-sm flex items-center justify-center gap-2 hover:bg-dhaba-gold/10 transition-colors"
            >
              <BanknotesIcon className="h-4 w-4" />
              Cash Settle at Counter
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
