import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCart } from '../context/CartContext';
import {
  ArrowLeftIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  CreditCardIcon,
  BanknotesIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid';

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
    <span className={`w-5 text-center text-xs font-extrabold text-[#201512] select-none ${pop ? 'animate-qty-pop' : ''}`}>
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
      <div className="space-y-6 pt-12 text-center font-body">
        <div className="mx-auto h-20 w-20 rounded-full border-2 border-[#E5C158]/40 bg-[#E5C158]/15 flex items-center justify-center text-3xl shadow-gold">
          🍽️
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold text-[#F6EEDD]">Your Cart is Empty</h2>
          <p className="text-xs font-medium text-[#E5C158] mt-1.5 max-w-xs mx-auto font-body">
            Explore our handcrafted specialties and add dishes to start your royal feast.
          </p>
        </div>
        <Link
          to={`/t/${shortCode}`}
          className="inline-block px-6 py-3 rounded-xl bg-[#C83200] text-[#F6EEDD] text-sm font-bold hover:bg-[#A82A00] active:scale-[0.98] transition-all shadow-xl shadow-[#C83200]/40 border border-[#E54818]"
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
    <div className="space-y-5 pb-8 font-body">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/t/${shortCode}`}
            className="p-2 rounded-xl text-[#E5C158] hover:bg-[#E5C158]/15 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-serif font-bold text-[#F6EEDD]">Your Order</h2>
            <p className="text-[11px] font-semibold text-[#E5C158] font-body">
              Table {shortCode} · {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="text-[11px] font-bold text-[#FF5252] hover:text-[#FF7777] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <TrashIcon className="h-3 w-3" /> Clear
        </button>
      </div>

      {/* ═══ Cart Items ═══ */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="royal-card p-3.5 flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs sm:text-sm text-dhaba-ink truncate">
                {item.name}
              </h4>
              <p className="text-[11px] font-medium text-dhaba-ink-muted mt-0.5">
                {formatCurrency(item.price)} each
              </p>
            </div>

            {/* Stepper & Line Total */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1 border border-dhaba-gold/25 bg-dhaba-ivory rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  className="h-6 w-6 rounded-md bg-dhaba-plum text-dhaba-gold flex items-center justify-center text-xs hover:bg-dhaba-plum-light transition-colors"
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <QtyPop qty={item.qty} />
                <button
                  type="button"
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  className="h-6 w-6 rounded-md bg-dhaba-sindoor text-white flex items-center justify-center text-xs hover:bg-dhaba-sindoor-hover transition-colors"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
              </div>
              <div className="w-14 text-right font-bold text-xs sm:text-sm text-dhaba-gold">
                {formatCurrency(item.price * item.qty)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Kitchen Notes ═══ */}
      <div className="royal-card p-3.5 space-y-1.5">
        <label className="block text-xs font-bold text-dhaba-ink">
          Kitchen Notes & Preferences
        </label>
        <textarea
          value={guestNotes}
          onChange={(e) => setGuestNotes(e.target.value)}
          placeholder="E.g. Less spicy, dressing on the side, allergies..."
          rows={2}
          className="w-full rounded-xl border border-dhaba-gold/20 bg-dhaba-ivory p-2.5 text-xs text-dhaba-ink placeholder:text-dhaba-ink-muted/50 focus:border-dhaba-gold/50 focus:outline-none focus:ring-1 focus:ring-dhaba-gold/30 font-body"
        />
      </div>

      {/* ═══ Coupon / Promo Code ═══ */}
      <div className="royal-card p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🏷️</span>
            <span className="text-xs font-bold text-dhaba-ink">
              Offers & Coupon Code
            </span>
          </div>
          {appliedCoupon && (
            <span className="text-[10px] font-bold text-[#A68520] bg-[#D4AF37]/15 px-2 py-0.5 rounded-full border border-[#D4AF37]/40">
              Coupon Active
            </span>
          )}
        </div>

        {appliedCoupon ? (
          <div className="p-3 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-[#D4AF37] text-[#2B0E14] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                ✓
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-dhaba-ink tracking-wider">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-[10px] font-bold text-[#A68520]">Applied!</span>
                </div>
                <p className="text-[11px] font-semibold text-[#A68520] truncate mt-0.5">
                  You saved {formatCurrency(discountAmount)} on this order
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeCoupon}
              className="text-[11px] font-bold text-dhaba-sindoor hover:text-dhaba-sindoor-hover px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer"
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
                className="flex-1 rounded-xl border border-dhaba-gold/20 bg-dhaba-ivory px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-dhaba-ink placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-dhaba-ink-muted/50 focus:border-dhaba-gold/50 focus:outline-none focus:ring-1 focus:ring-dhaba-gold/30"
              />
              <button
                type="button"
                onClick={() => handleApplyCoupon()}
                disabled={!couponInput.trim() || isApplyingCoupon}
                className="h-auto px-4 rounded-xl bg-dhaba-sindoor text-dhaba-ivory text-xs font-bold hover:bg-dhaba-sindoor-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
              >
                {isApplyingCoupon ? '...' : 'Apply'}
              </button>
            </div>

            {/* Quick Available Coupons */}
            {availableCoupons && availableCoupons.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-semibold text-dhaba-ink-muted uppercase tracking-wider block">
                  Available offers
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {availableCoupons.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleApplyCoupon(c.code)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dhaba-gold/10 border border-dhaba-gold/25 text-dhaba-gold text-[11px] font-medium hover:bg-dhaba-gold/20 transition-colors"
                    >
                      <span className="font-mono font-bold tracking-wider">{c.code}</span>
                      <span className="text-[10px] opacity-70">
                        ({c.discountType === 'percent' ? `${c.discountValue}% off` : `₹${c.discountValue} off`})
                      </span>
                      <span className="text-[10px] font-bold text-dhaba-gold underline ml-0.5">Apply</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Payment Method ═══ */}
      <div className="royal-card p-3.5 space-y-2.5">
        <label className="block text-xs font-bold text-dhaba-ink">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setPaymentChoice('counter')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
              paymentChoice === 'counter'
                ? 'border-dhaba-gold bg-dhaba-gold/15 shadow-gold text-dhaba-ink'
                : 'border-dhaba-gold/20 bg-dhaba-ivory-warm/50 hover:bg-dhaba-gold/10 text-dhaba-ink-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <BanknotesIcon className={`h-5 w-5 ${paymentChoice === 'counter' ? 'text-dhaba-gold-dim' : 'text-dhaba-ink-muted/50'}`} />
              {paymentChoice === 'counter' && (
                <CheckCircleIcon className="h-4 w-4 text-dhaba-gold-dim" />
              )}
            </div>
            <div>
              <span className={`text-xs font-bold block ${paymentChoice === 'counter' ? 'text-dhaba-ink' : 'text-dhaba-ink-muted'}`}>
                Pay at Counter
              </span>
              <span className="text-[10px] text-dhaba-ink-muted/70 block">
                Cash or card when done
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentChoice('online')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
              paymentChoice === 'online'
                ? 'border-dhaba-gold bg-dhaba-gold/15 shadow-gold text-dhaba-ink'
                : 'border-dhaba-gold/20 bg-dhaba-ivory-warm/50 hover:bg-dhaba-gold/10 text-dhaba-ink-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <CreditCardIcon className={`h-5 w-5 ${paymentChoice === 'online' ? 'text-dhaba-gold-dim' : 'text-dhaba-ink-muted/50'}`} />
              {paymentChoice === 'online' && (
                <CheckCircleIcon className="h-4 w-4 text-dhaba-gold-dim" />
              )}
            </div>
            <div>
              <span className={`text-xs font-bold block ${paymentChoice === 'online' ? 'text-dhaba-ink' : 'text-dhaba-ink-muted'}`}>
                Pay Online (UPI)
              </span>
              <span className="text-[10px] text-dhaba-ink-muted/70 block">
                Instant Razorpay / QR
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ═══ Bill Breakdown ═══ */}
      <div className="royal-card p-4 space-y-2.5 text-xs">
        <div className="flex justify-between text-dhaba-ink-muted">
          <span>Items Subtotal</span>
          <span className="font-semibold text-dhaba-ink">{formatCurrency(subtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-[#A68520] font-bold">
            <span className="flex items-center gap-1">
              Coupon ({appliedCoupon?.code})
            </span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-dhaba-ink-muted">
          <span>GST (5%)</span>
          <span className="font-semibold text-dhaba-ink">{formatCurrency(tax)}</span>
        </div>

        <div className="border-t border-dhaba-gold/20 pt-2.5 flex justify-between text-sm font-bold">
          <span className="text-dhaba-ink">Total Amount</span>
          <span className="text-dhaba-gold text-base">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* ═══ Place Order Button ═══ */}
      <button
        type="button"
        onClick={handleOrderSubmission}
        disabled={isSubmitting}
        className="w-full py-4 rounded-2xl bg-[#C83200] hover:bg-[#A82A00] text-dhaba-ivory text-sm font-bold active:scale-[0.98] transition-all shadow-xl shadow-[#C83200]/40 border border-[#E54818] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending to Kitchen...
          </span>
        ) : paymentChoice === 'online' ? (
          `Proceed to Pay ${formatCurrency(grandTotal)} Online 💳`
        ) : (
          'Place Order & Send to Kitchen 🍳'
        )}
      </button>

      <p className="text-center text-[11px] text-[#E5C158] flex items-center justify-center gap-1 font-body font-medium">
        <ShieldCheckIcon className="h-3.5 w-3.5 text-[#E5C158]" />
        Kitchen receives your order instantaneously
      </p>

      {/* ═══ Razorpay Payment Modal ═══ */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !paymentProcessing && setIsPaymentModalOpen(false)}
        title="Pay via Razorpay"
        size="sm"
      >
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-xl bg-dhaba-plum-light border border-dhaba-gold/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-dhaba-gold/50 uppercase">Payable Amount</span>
              <div className="text-lg font-bold text-dhaba-gold font-serif">
                {formatCurrency(grandTotal)}
              </div>
            </div>
            <span className="text-[11px] px-2 py-1 bg-[#D4AF37]/15 text-[#A68520] font-bold rounded-lg flex items-center gap-1 border border-[#D4AF37]/40">
              <ShieldCheckIcon className="h-3 w-3" /> Secure
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-dhaba-ivory/80">Select UPI App</span>
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
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                    selectedUpiApp === app.id
                      ? 'border-dhaba-gold bg-dhaba-gold/10 text-dhaba-gold'
                      : 'border-dhaba-gold/15 text-dhaba-ivory/50'
                  }`}
                >
                  {app.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-dhaba-plum-surface text-center space-y-2 border border-dhaba-gold/15">
            <div className="h-28 w-28 mx-auto bg-dhaba-ivory p-2 rounded-xl shadow-inner flex items-center justify-center">
              <QrCodeIcon className="h-24 w-24 text-dhaba-ink" />
            </div>
            <p className="text-[11px] text-dhaba-gold/40">
              Scan with GPay, PhonePe, Paytm or click below
            </p>
          </div>

          <button
            type="button"
            onClick={handleCompleteOnlinePayment}
            disabled={paymentProcessing}
            className="w-full py-3 rounded-xl bg-dhaba-sindoor text-dhaba-ivory font-bold text-sm hover:bg-dhaba-sindoor-hover disabled:opacity-60 transition-colors shadow-sindoor"
          >
            {paymentProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
