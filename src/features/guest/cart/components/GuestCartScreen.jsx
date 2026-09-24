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

  const [paymentChoice, setPaymentChoice] = useState('counter');
  const [guestNotes, setGuestNotes] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');

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
      <div className="space-y-6 pt-16 text-center font-sans">
        <div className="mx-auto h-16 w-16 rounded-full border border-white/10 bg-surface-2 flex items-center justify-center text-accent">
          <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-heading font-bold text-text">Your Cart is Empty</h2>
          <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
            Explore our handcrafted specialties and add dishes to start your royal feast.
          </p>
        </div>
        <Link
          to={`/t/${shortCode}`}
          className="inline-block px-7 py-3 rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all shadow-sm"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  const handleOrderSubmission = async () => {
    if (paymentChoice === 'online') {
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
        await submitOrder({
          paymentMethod: 'online',
          paymentStatus: 'paid',
          guestNotes,
        });
        setIsPaymentModalOpen(false);
      } catch (err) {
        // error handled in context
      } finally {
        setPaymentProcessing(false);
      }
    }, 1200);
  };

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
            <h2 className="text-lg font-heading font-bold text-text">Your Order</h2>
            <p className="text-[11px] font-mono text-muted">
              Table {shortCode} · {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Clear
        </button>
      </div>

      {/* Cart Items */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="card-surface p-4 rounded-card border border-white/[0.08] hover:border-white/20 flex items-center justify-between gap-3 transition-all"
          >
            <div className="min-w-0 flex-1">
              <h4 className="font-heading font-bold text-xs sm:text-sm text-text truncate">
                {item.name}
              </h4>
              <p className="text-[11px] font-mono text-muted mt-0.5">
                {formatCurrency(item.price)} each
              </p>
            </div>

            {/* Stepper & Line Total */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1 border border-white/10 bg-surface-2 rounded-full p-0.5">
                <button
                  type="button"
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  className="h-6 w-6 rounded-full bg-surface text-text hover:bg-white/10 flex items-center justify-center text-xs transition-colors"
                >
                  <Minus className="h-3 w-3" strokeWidth={1.5} />
                </button>
                <QtyPop qty={item.qty} />
                <button
                  type="button"
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  className="h-6 w-6 rounded-full bg-accent text-bg hover:bg-accent-hover flex items-center justify-center text-xs transition-colors"
                >
                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
              <div className="w-16 text-right font-mono font-bold text-xs sm:text-sm text-accent">
                {formatCurrency(item.price * item.qty)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Kitchen Notes */}
      <div className="card-surface p-4 rounded-card border border-white/[0.08] space-y-2">
        <label className="block text-xs font-medium text-text/80">
          Kitchen Notes &amp; Preferences
        </label>
        <textarea
          value={guestNotes}
          onChange={(e) => setGuestNotes(e.target.value)}
          placeholder="E.g. Less spicy, dressing on the side, allergies..."
          rows={2}
          className="w-full rounded-xl border border-white/10 bg-surface-2 p-3 text-xs text-text placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 font-sans resize-none transition-colors"
        />
      </div>

      {/* Coupon / Promo Code */}
      <div className="card-surface p-4 rounded-card border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-accent" strokeWidth={1.5} />
            <span className="text-xs font-medium text-text">
              Offers &amp; Coupon Code
            </span>
          </div>
          {appliedCoupon && (
            <span className="text-[10px] font-mono text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
              Coupon Active
            </span>
          )}
        </div>

        {appliedCoupon ? (
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full bg-accent text-bg flex items-center justify-center font-bold text-xs shrink-0">
                ✓
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-text tracking-wider">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-[10px] font-mono text-accent">Applied!</span>
                </div>
                <p className="text-[11px] text-muted truncate mt-0.5 font-sans">
                  You saved {formatCurrency(discountAmount)} on this order
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeCoupon}
              className="text-xs font-mono text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-full transition-colors shrink-0 cursor-pointer"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex gap-2">
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
                className="flex-1 rounded-full border border-white/10 bg-surface-2 px-4 py-2 text-xs font-mono uppercase tracking-wider text-text placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
              <button
                type="button"
                onClick={() => handleApplyCoupon()}
                disabled={!couponInput.trim() || isApplyingCoupon}
                className="px-5 py-2 rounded-full bg-surface text-text border border-white/10 hover:border-white/20 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
              >
                {isApplyingCoupon ? '...' : 'Apply'}
              </button>
            </div>

            {/* Quick Available Coupons */}
            {availableCoupons && availableCoupons.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                  Available offers
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {availableCoupons.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleApplyCoupon(c.code)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-white/10 text-text text-[11px] font-mono hover:border-accent/40 transition-colors cursor-pointer"
                    >
                      <span className="font-bold">{c.code}</span>
                      <span className="text-[10px] text-muted">
                        ({c.discountType === 'percent' ? `${c.discountValue}% off` : `₹${c.discountValue} off`})
                      </span>
                      <span className="text-[10px] text-accent underline ml-0.5">Apply</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="card-surface p-4 rounded-card border border-white/[0.08] space-y-2.5">
        <label className="block text-xs font-medium text-text/80">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setPaymentChoice('counter')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-2 cursor-pointer ${
              paymentChoice === 'counter'
                ? 'border-accent bg-accent/10 text-text'
                : 'border-white/10 bg-surface-2 hover:border-white/20 text-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <Banknote className={`h-5 w-5 ${paymentChoice === 'counter' ? 'text-accent' : 'text-muted'}`} strokeWidth={1.5} />
              {paymentChoice === 'counter' && (
                <CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <span className={`text-xs font-semibold block ${paymentChoice === 'counter' ? 'text-text' : 'text-muted'}`}>
                Pay at Counter
              </span>
              <span className="text-[10px] text-muted block mt-0.5">
                Cash or card when done
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentChoice('online')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-2 cursor-pointer ${
              paymentChoice === 'online'
                ? 'border-accent bg-accent/10 text-text'
                : 'border-white/10 bg-surface-2 hover:border-white/20 text-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <CreditCard className={`h-5 w-5 ${paymentChoice === 'online' ? 'text-accent' : 'text-muted'}`} strokeWidth={1.5} />
              {paymentChoice === 'online' && (
                <CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <span className={`text-xs font-semibold block ${paymentChoice === 'online' ? 'text-text' : 'text-muted'}`}>
                Pay Online (UPI)
              </span>
              <span className="text-[10px] text-muted block mt-0.5">
                Instant Razorpay / QR
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Bill Breakdown */}
      <div className="card-surface p-5 rounded-card border border-white/[0.08] space-y-2.5 text-xs font-sans">
        <div className="flex justify-between text-muted">
          <span>Items Subtotal</span>
          <span className="font-mono text-text">{formatCurrency(subtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-accent font-medium">
            <span className="flex items-center gap-1 font-mono">
              Coupon ({appliedCoupon?.code})
            </span>
            <span className="font-mono">-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-muted">
          <span>GST (5%)</span>
          <span className="font-mono text-text">{formatCurrency(tax)}</span>
        </div>

        <div className="border-t border-white/10 pt-2.5 flex justify-between text-sm font-semibold">
          <span className="text-text">Total Amount</span>
          <span className="text-accent font-mono text-base font-bold">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Place Order Button */}
      <button
        type="button"
        onClick={handleOrderSubmission}
        disabled={isSubmitting}
        className="w-full py-4 rounded-full bg-accent text-bg text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
            Sending to Kitchen...
          </span>
        ) : paymentChoice === 'online' ? (
          `Proceed to Pay ${formatCurrency(grandTotal)} Online 💳`
        ) : (
          'Place Order & Send to Kitchen 🍳'
        )}
      </button>

      <p className="text-center text-[11px] text-muted flex items-center justify-center gap-1.5 font-mono">
        <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
        <span>Kitchen receives your order instantaneously</span>
      </p>

      {/* Razorpay Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !paymentProcessing && setIsPaymentModalOpen(false)}
        title="Pay via Razorpay"
        size="sm"
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="p-4 rounded-xl bg-surface-2 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">Payable Amount</span>
              <div className="text-lg font-mono font-bold text-accent">
                {formatCurrency(grandTotal)}
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 bg-accent/10 text-accent font-mono font-bold rounded-full flex items-center gap-1 border border-accent/20">
              <ShieldCheck className="h-3 w-3" strokeWidth={1.5} /> Secure
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
              Scan with GPay, PhonePe, Paytm or click below
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
                Verifying with Bank...
              </span>
            ) : (
              `Authorize ${formatCurrency(grandTotal)}`
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
