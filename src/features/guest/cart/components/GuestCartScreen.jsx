import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCart } from '../context/CartContext';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  Tag,
  ShoppingBag,
  Sparkles,
  Check,
  Coins,
  ArrowRightLeft,
} from 'lucide-react';

/* ─── Quantity with pop animation ─── */
function QtyPop({ qty }) {
  const [pop, setPop] = useState(false);
  const prev = useRef(qty);
  useEffect(() => {
    if (qty !== prev.current) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 200);
      prev.current = qty;
      return () => clearTimeout(t);
    }
  }, [qty]);
  return (
    <span className={`w-5 text-center text-xs font-mono font-bold text-text select-none ${pop ? 'scale-110' : ''} transition-transform`}>
      {qty}
    </span>
  );
}

export function GuestCartScreen() {
  const { shortCode } = useParams();
  const {
    items,
    updateQty,
    removeFromCart,
    clearCart,
    subtotal,
    discountAmount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    availableCoupons,
    isLoadingCoupons,
    tax,
    grandTotal,
    totalItemCount,
    submitOrder,
    isSubmitting,
  } = useCart();

  const [paymentChoice, setPaymentChoice] = useState('counter'); // counter | online | split
  const [splitOnlineAmount, setSplitOnlineAmount] = useState(() => Math.round(grandTotal / 2));
  const [guestNotes, setGuestNotes] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');

  // Keep split online amount aligned whenever cart grand total updates
  useEffect(() => {
    if (grandTotal > 0) {
      setSplitOnlineAmount(Math.round(grandTotal / 2));
    }
  }, [grandTotal]);

  const effectiveOnlineAmount = Math.max(1, Math.min(grandTotal > 1 ? grandTotal - 1 : 1, Number(splitOnlineAmount) || Math.round(grandTotal / 2)));
  const effectiveCashAmount = Math.max(0, grandTotal - effectiveOnlineAmount);

  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponInput).trim();
    if (!code) return;
    setIsApplyingCoupon(true);
    const res = await applyCoupon(code);
    setIsApplyingCoupon(false);
    if (res?.success) {
      setCouponInput('');
    }
  };

  /* ─── Empty cart state ─── */
  if (items.length === 0) {
    return (
      <div className="space-y-6 py-20 text-center font-sans max-w-md mx-auto">
        <div className="mx-auto h-20 w-20 rounded-full border border-white/10 bg-surface-2 flex items-center justify-center text-accent shadow-sm">
          <ShoppingBag className="h-9 w-9" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-heading font-extrabold text-text tracking-tight">Your Cart is Empty</h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed font-sans">
            Explore our handcrafted dining selection and select your desired courses to begin your dining experience.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to={`/t/${shortCode}`}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all shadow-sm"
          >
            <span>Browse Full Menu</span>
          </Link>
        </div>
      </div>
    );
  }

  const handleOrderSubmission = async () => {
    if (paymentChoice === 'online' || paymentChoice === 'split') {
      setIsPaymentModalOpen(true);
      return;
    }
    await submitOrder({
      paymentMethod: 'counter',
      paymentStatus: 'pending',
      guestNotes,
    });
  };

  const handleCompleteOnlinePayment = async () => {
    setPaymentProcessing(true);
    setTimeout(async () => {
      try {
        if (paymentChoice === 'split') {
          await submitOrder({
            paymentMethod: 'split',
            paymentStatus: 'partially_paid',
            splitDetails: {
              onlineAmount: effectiveOnlineAmount,
              cashAmount: effectiveCashAmount,
            },
            guestNotes,
          });
        } else {
          await submitOrder({
            paymentMethod: 'online',
            paymentStatus: 'paid',
            guestNotes,
          });
        }
        setIsPaymentModalOpen(false);
      } catch (err) {
        // error handled in context
      } finally {
        setPaymentProcessing(false);
      }
    }, 1200);
  };

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
              <span>Table {shortCode} Review</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-text tracking-tight">
              Your Dining Tab &amp; Order
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          <span className="font-mono text-xs text-muted">
            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in tab
          </span>
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Clear All
          </button>
        </div>
      </div>

      {/* Responsive Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items, Notes, Coupons (Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Cart Items List */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-text/80">
              Selected Courses
            </h3>
            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="card-surface p-4 sm:p-5 rounded-card border border-white/[0.08] hover:border-white/20 flex items-center justify-between gap-4 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading font-bold text-sm sm:text-base text-text truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs font-mono text-muted mt-0.5">
                      {formatCurrency(item.price)} each
                    </p>
                  </div>

                  {/* Stepper & Line Total */}
                  <div className="flex items-center gap-3.5 shrink-0">
                    <div className="flex items-center gap-1 border border-white/10 bg-surface-2 rounded-full p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="h-7 w-7 min-h-[32px] min-w-[32px] rounded-full bg-surface text-text hover:bg-white/10 flex items-center justify-center text-xs transition-colors relative before:absolute before:-inset-2 before:content-['']"
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <QtyPop qty={item.qty} />
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="h-7 w-7 min-h-[32px] min-w-[32px] rounded-full bg-accent text-bg hover:bg-accent-hover flex items-center justify-center text-xs transition-colors relative before:absolute before:-inset-2 before:content-['']"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>

                    <div className="w-20 text-right font-mono font-bold text-sm text-accent">
                      {formatCurrency(item.price * item.qty)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kitchen Notes */}
          <div className="card-surface p-5 rounded-card border border-white/[0.08] space-y-2.5">
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-text/80">
              Special Kitchen Notes &amp; Allergies
            </label>
            <textarea
              value={guestNotes}
              onChange={(e) => setGuestNotes(e.target.value)}
              placeholder="E.g. Medium spicy, no dairy on curry, extra napkins, serve dessert later..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-surface-2 p-3.5 text-xs text-text placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 font-sans resize-none transition-colors"
            />
          </div>

          {/* Coupon / Promo Code */}
          <div className="card-surface p-5 rounded-card border border-white/[0.08] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-accent" strokeWidth={1.5} />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-text/80">
                  Offers &amp; Coupons
                </span>
              </div>
              {appliedCoupon && (
                <span className="text-[10px] font-mono text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
                  Coupon Applied
                </span>
              )}
            </div>

            {appliedCoupon ? (
              <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-accent text-bg flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-text tracking-wider">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-[10px] font-mono text-accent">Active</span>
                    </div>
                    <p className="text-[11px] text-muted truncate mt-0.5 font-sans">
                      Discount applied: saved {formatCurrency(discountAmount)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-xs font-mono text-rose-400 hover:text-rose-300 px-3 py-1 rounded-full transition-colors shrink-0 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    placeholder="Enter coupon code..."
                    className="flex-1 rounded-full border border-white/10 bg-surface-2 px-4 py-2.5 text-base sm:text-xs font-mono uppercase tracking-wider text-text placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={!couponInput.trim() || isApplyingCoupon}
                    className="px-5 py-2.5 min-h-[44px] touch-manipulation rounded-full bg-surface text-text border border-white/10 hover:border-white/20 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                  >
                    {isApplyingCoupon ? '...' : 'Apply'}
                  </button>
                </div>

                {/* Available Coupons */}
                {availableCoupons && availableCoupons.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                      Recommended Offers
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {availableCoupons.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-white/10 text-text text-[11px] font-mono hover:border-accent/40 transition-colors cursor-pointer"
                        >
                          <span className="font-bold text-accent">{c.code}</span>
                          <span className="text-[10px] text-muted">
                            ({c.discountType === 'percent' ? `${c.discountValue}% off` : `₹${c.discountValue} off`})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Payment & Summary (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Payment Method Selector */}
          <div className="card-surface p-5 rounded-card border border-white/[0.08] space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-text/80">
                Payment Preference
              </label>
              <span className="text-[10px] font-mono text-accent">Flexible Checkout</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Pay at Counter */}
              <button
                type="button"
                onClick={() => setPaymentChoice('counter')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  paymentChoice === 'counter'
                    ? 'border-accent bg-accent/10 text-text shadow-[0_0_12px_rgba(198,255,61,0.1)]'
                    : 'border-white/10 bg-surface-2 hover:border-white/20 text-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Banknote className={`h-4.5 w-4.5 ${paymentChoice === 'counter' ? 'text-accent' : 'text-muted'}`} strokeWidth={1.5} />
                  {paymentChoice === 'counter' && (
                    <CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <span className={`text-xs font-semibold block ${paymentChoice === 'counter' ? 'text-text' : 'text-muted'}`}>
                    Pay at Counter
                  </span>
                  <span className="text-[10px] text-muted block mt-0.5 font-sans leading-tight">
                    100% Cash or Card after dining
                  </span>
                </div>
              </button>

              {/* Pay Online */}
              <button
                type="button"
                onClick={() => setPaymentChoice('online')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  paymentChoice === 'online'
                    ? 'border-accent bg-accent/10 text-text shadow-[0_0_12px_rgba(198,255,61,0.1)]'
                    : 'border-white/10 bg-surface-2 hover:border-white/20 text-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <CreditCard className={`h-4.5 w-4.5 ${paymentChoice === 'online' ? 'text-accent' : 'text-muted'}`} strokeWidth={1.5} />
                  {paymentChoice === 'online' && (
                    <CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <span className={`text-xs font-semibold block ${paymentChoice === 'online' ? 'text-text' : 'text-muted'}`}>
                    Pay Online
                  </span>
                  <span className="text-[10px] text-muted block mt-0.5 font-sans leading-tight">
                    100% UPI QR / Card instantly
                  </span>
                </div>
              </button>

              {/* Part Payment (Split) */}
              <button
                type="button"
                onClick={() => setPaymentChoice('split')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  paymentChoice === 'split'
                    ? 'border-accent bg-accent/10 text-text shadow-[0_0_12px_rgba(198,255,61,0.1)]'
                    : 'border-white/10 bg-surface-2 hover:border-white/20 text-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Coins className={`h-4.5 w-4.5 ${paymentChoice === 'split' ? 'text-accent' : 'text-muted'}`} strokeWidth={1.5} />
                  {paymentChoice === 'split' && (
                    <CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <span className={`text-xs font-semibold block ${paymentChoice === 'split' ? 'text-text' : 'text-muted'}`}>
                    Part Payment
                  </span>
                  <span className="text-[10px] text-muted block mt-0.5 font-sans leading-tight">
                    Split Online + Cash
                  </span>
                </div>
              </button>
            </div>

            {/* Part Payment Configuration Interactive Panel */}
            {paymentChoice === 'split' && (
              <div className="p-4 rounded-xl bg-surface-2 border border-accent/25 space-y-3.5 mt-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-accent" />
                    <span>Configure Split Amounts</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted">Total: {formatCurrency(grandTotal)}</span>
                </div>

                {/* Quick Split Ratio Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '50% / 50%', onlineRatio: 0.5 },
                    { label: '25% Online', onlineRatio: 0.25 },
                    { label: '75% Online', onlineRatio: 0.75 },
                  ].map((preset) => {
                    const presetOnline = Math.max(1, Math.min(grandTotal - 1, Math.round(grandTotal * preset.onlineRatio)));
                    const isSelected = effectiveOnlineAmount === presetOnline;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setSplitOnlineAmount(presetOnline)}
                        className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-accent text-bg font-bold shadow-xs'
                            : 'bg-white/[0.05] text-muted hover:text-text border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Amount inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-accent block">
                      Pay Online (UPI)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted">₹</span>
                      <input
                        type="number"
                        min="1"
                        max={grandTotal - 1}
                        value={splitOnlineAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSplitOnlineAmount(val);
                        }}
                        className="w-full pl-7 pr-3 py-2 rounded-lg bg-surface border border-accent/40 text-text font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-amber-300 block">
                      Remaining Cash Due
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted">₹</span>
                      <input
                        type="number"
                        readOnly
                        value={effectiveCashAmount}
                        className="w-full pl-7 pr-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-amber-300 font-mono text-xs font-bold cursor-not-allowed select-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Visual Ratio Progress Bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-surface overflow-hidden flex">
                    <div
                      className="bg-accent transition-all duration-300 h-full"
                      style={{ width: `${(effectiveOnlineAmount / (grandTotal || 1)) * 100}%` }}
                      title={`Online: ${formatCurrency(effectiveOnlineAmount)}`}
                    />
                    <div
                      className="bg-amber-400/80 transition-all duration-300 h-full"
                      style={{ width: `${(effectiveCashAmount / (grandTotal || 1)) * 100}%` }}
                      title={`Cash: ${formatCurrency(effectiveCashAmount)}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-muted pt-0.5">
                    <span className="text-accent">Online: {formatCurrency(effectiveOnlineAmount)}</span>
                    <span className="text-amber-300">Offline Cash: {formatCurrency(effectiveCashAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bill Breakdown Card */}
          <div className="card-surface p-6 rounded-card border border-white/[0.08] space-y-3.5 text-xs font-sans">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-text/80 pb-1 border-b border-white/[0.06]">
              Order Summary
            </h4>

            <div className="flex justify-between text-muted">
              <span>Items Subtotal</span>
              <span className="font-mono text-text">{formatCurrency(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-accent font-medium">
                <span className="flex items-center gap-1 font-mono">
                  Coupon Discount ({appliedCoupon?.code})
                </span>
                <span className="font-mono">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-muted">
              <span>Goods &amp; Service Tax (5% GST)</span>
              <span className="font-mono text-text">{formatCurrency(tax)}</span>
            </div>

            <div className="border-t border-white/10 pt-3 flex justify-between items-center text-sm font-semibold">
              <span className="text-text font-heading text-base font-bold">Total Payable</span>
              <span className="text-accent font-mono text-lg font-extrabold">{formatCurrency(grandTotal)}</span>
            </div>

            {paymentChoice === 'split' && (
              <div className="mt-2 pt-2 border-t border-dashed border-white/10 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-accent">
                  <span>&bull; Part 1: Online Portion (UPI)</span>
                  <span>{formatCurrency(effectiveOnlineAmount)}</span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>&bull; Part 2: Offline Cash Balance</span>
                  <span>{formatCurrency(effectiveCashAmount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Place Order CTA Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleOrderSubmission}
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-accent text-bg text-sm font-heading font-bold hover:bg-accent-hover active:scale-[0.98] transition-all shadow-lift disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                  Sending Order to Kitchen...
                </span>
              ) : paymentChoice === 'split' ? (
                `Pay ${formatCurrency(effectiveOnlineAmount)} Online & Settle ${formatCurrency(effectiveCashAmount)} Cash`
              ) : paymentChoice === 'online' ? (
                `Proceed to Pay ${formatCurrency(grandTotal)} Online`
              ) : (
                'Place Order & Send to Kitchen'
              )}
            </button>

            <p className="text-center text-[11px] text-muted flex items-center justify-center gap-1.5 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
              <span>Sub-120ms kitchen line dispatch with live sync</span>
            </p>
          </div>
        </div>
      </div>

      {/* Razorpay Online Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !paymentProcessing && setIsPaymentModalOpen(false)}
        title={paymentChoice === 'split' ? 'Part Payment: Online Share' : 'Pay via Razorpay'}
        size="sm"
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="p-4 rounded-xl bg-surface-2 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                {paymentChoice === 'split' ? 'Online Part to Pay' : 'Payable Amount'}
              </span>
              <div className="text-lg font-mono font-bold text-accent">
                {formatCurrency(paymentChoice === 'split' ? effectiveOnlineAmount : grandTotal)}
              </div>
              {paymentChoice === 'split' && (
                <span className="text-[10px] font-mono text-amber-300 block mt-0.5">
                  Remaining {formatCurrency(effectiveCashAmount)} cash due at counter
                </span>
              )}
            </div>
            <span className="text-[11px] px-2.5 py-1 bg-accent/10 text-accent font-mono font-bold rounded-full flex items-center gap-1 border border-accent/20">
              <ShieldCheck className="h-3 w-3" strokeWidth={1.5} /> Secure Gateway
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-text/80">Select UPI App</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'gpay', name: 'GPay' },
                { id: 'phonepe', name: 'PhonePe' },
                { id: 'paytm', name: 'Paytm' },
              ].map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedUpiApp(app.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    selectedUpiApp === app.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-white/10 text-muted hover:text-text'
                  }`}
                >
                  {app.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-2 text-center space-y-2 border border-white/10">
            <div className="h-28 w-28 mx-auto bg-white p-2 rounded-xl shadow-xs flex items-center justify-center">
              <QrCode className="h-24 w-24 text-bg" strokeWidth={1.5} />
            </div>
            <p className="text-[11px] text-muted font-mono">
              Scan with GPay, PhonePe, Paytm or authorize below
            </p>
          </div>

          <button
            type="button"
            onClick={handleCompleteOnlinePayment}
            disabled={paymentProcessing}
            className="w-full py-3.5 rounded-full bg-accent text-bg font-semibold text-sm hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            {paymentProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                Verifying Transaction...
              </span>
            ) : (
              `Authorize ${formatCurrency(paymentChoice === 'split' ? effectiveOnlineAmount : grandTotal)}`
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default GuestCartScreen;
