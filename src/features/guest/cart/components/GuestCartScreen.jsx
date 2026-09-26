import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCart } from '../context/CartContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import toast from 'react-hot-toast';
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
  Check,
  Coins,
  ArrowRightLeft,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
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
    <span className={`w-6 text-center text-sm font-bold select-none ${pop ? 'scale-125' : ''} transition-transform`}
      style={{ color: 'var(--g-accent)' }}>
      {qty}
    </span>
  );
}

const DEFAULT_RECOMMENDATIONS = [
  { id: 'rec-1', name: 'Kadhai Paneer', price: 250, station: 'hot', tags: ['veg'] },
  { id: 'rec-2', name: 'Cream of Tomato Soup', price: 120, station: 'hot', tags: ['veg'] },
  { id: 'rec-3', name: 'Hot & Sour Soup', price: 100, station: 'hot', tags: ['veg'] },
  { id: 'rec-4', name: 'Sweet Corn Soup', price: 120, station: 'hot', tags: ['veg'] },
  { id: 'rec-5', name: 'Butter Naan', price: 45, station: 'hot', tags: ['veg'] },
  { id: 'rec-6', name: 'Fresh Lime Soda', price: 60, station: 'bar', tags: ['veg'] },
  { id: 'rec-7', name: 'Gulab Jamun (2 Pcs)', price: 80, station: 'cold', tags: ['veg'] },
];

export function GuestCartScreen() {
  const { shortCode } = useParams();
  const {
    items,
    addToCart,
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

  // Customer Details for Kitchen Ticket & CRM System
  const [guestName, setGuestName] = useState(() => {
    try {
      return localStorage.getItem('tablesuite_guest_name') || '';
    } catch (e) {
      return '';
    }
  });

  const [guestPhone, setGuestPhone] = useState(() => {
    try {
      return localStorage.getItem('tablesuite_guest_phone') || '';
    } catch (e) {
      return '';
    }
  });

  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const detailsSectionRef = useRef(null);

  // Recommendations ("Goes Well With Your Order")
  const [recommendedItems, setRecommendedItems] = useState(DEFAULT_RECOMMENDATIONS);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const recsScrollRef = useRef(null);

  // Load recommendations from venue menu
  useEffect(() => {
    async function loadRecommendations() {
      if (!shortCode) return;
      try {
        setIsLoadingRecs(true);
        if (isSupabaseConfigured()) {
          const { data: tableData } = await supabase
            .from('tables')
            .select('venue_id')
            .ilike('short_code', shortCode.trim())
            .maybeSingle();

          if (tableData?.venue_id) {
            const { data: menuList } = await supabase
              .from('menu_items')
              .select('id, name, price, station, tags, is_available, is_deleted')
              .eq('venue_id', tableData.venue_id)
              .eq('is_available', true)
              .eq('is_deleted', false)
              .limit(16);

            if (menuList && menuList.length > 0) {
              setRecommendedItems(
                menuList.map((m) => ({
                  id: m.id,
                  name: m.name,
                  price: Number(m.price) || 0,
                  station: m.station || 'hot',
                  tags: m.tags || ['veg'],
                }))
              );
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Could not load menu recommendations:', err);
      } finally {
        setIsLoadingRecs(false);
      }
    }
    loadRecommendations();
  }, [shortCode]);

  const scrollRecs = (direction) => {
    if (recsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      recsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const pool = recommendedItems && recommendedItems.length > 0 ? recommendedItems : DEFAULT_RECOMMENDATIONS;
  const filteredRecs = pool.filter(
    (rec) => !items.some((cartItem) => cartItem.id === rec.id || cartItem.name.toLowerCase() === rec.name.toLowerCase())
  );
  const visibleRecommendations = filteredRecs.length > 0 ? filteredRecs : DEFAULT_RECOMMENDATIONS;

  const handleNameChange = (val) => {
    const sanitized = val.replace(/[<>]/g, '').slice(0, 50);
    setGuestName(sanitized);
    if (nameError && sanitized.trim().length >= 2) {
      setNameError('');
    }
    try {
      localStorage.setItem('tablesuite_guest_name', sanitized);
    } catch (e) {}
  };

  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/[^\d+]/g, '').slice(0, 15);
    setGuestPhone(cleaned);
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (phoneError && (digitsOnly.length === 0 || digitsOnly.length >= 10)) {
      setPhoneError('');
    }
    try {
      localStorage.setItem('tablesuite_guest_phone', cleaned);
    } catch (e) {}
  };

  const validateGuestDetails = () => {
    let isValid = true;
    const trimmedName = guestName.trim();
    const digitsOnly = guestPhone.replace(/\D/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      setNameError('Please enter your name (min. 2 characters)');
      isValid = false;
    } else {
      setNameError('');
    }

    // Mobile number is optional. Only validate if user provided one
    if (digitsOnly.length > 0 && digitsOnly.length < 10) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      isValid = false;
    } else {
      setPhoneError('');
    }

    if (!isValid && detailsSectionRef.current) {
      detailsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return isValid;
  };

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
      <div className="space-y-6 py-20 text-center font-sans max-w-sm mx-auto">
        <div className="mx-auto h-20 w-20 rounded-full flex items-center justify-center"
          style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
          <ShoppingBag className="h-9 w-9" style={{ color: 'var(--g-text-muted)' }} strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--g-text)' }}>Your Cart is Empty</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
            Explore the menu and add dishes to start your order.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to={`/t/${shortCode}`}
            className="g-btn-primary inline-flex items-center gap-2 px-7 py-3 text-sm active:scale-[0.98] transition-all"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  const handleOrderSubmission = async () => {
    if (!validateGuestDetails()) {
      toast.error('Please enter your name for the kitchen to place your order');
      return;
    }

    if (paymentChoice === 'online' || paymentChoice === 'split') {
      setIsPaymentModalOpen(true);
      return;
    }

    await submitOrder({
      paymentMethod: 'counter',
      paymentStatus: 'pending',
      guestNotes,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
    });
  };

  const handleCompleteOnlinePayment = async () => {
    if (!validateGuestDetails()) {
      setIsPaymentModalOpen(false);
      toast.error('Please enter your Name and Mobile Number');
      return;
    }

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
            guestName: guestName.trim(),
            guestPhone: guestPhone.trim(),
          });
        } else {
          await submitOrder({
            paymentMethod: 'online',
            paymentStatus: 'paid',
            guestNotes,
            guestName: guestName.trim(),
            guestPhone: guestPhone.trim(),
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
    <div className="space-y-6 pb-8 font-sans w-full">
      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between gap-3 pb-4"
        style={{ borderBottom: '1px solid var(--g-border)' }}>
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
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--g-text)' }}>
              Your Cart
            </h1>
            <p className="text-xs" style={{ color: 'var(--g-text-muted)' }}>
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer px-3 py-1.5 rounded-full"
          style={{ color: 'var(--g-accent)', background: 'var(--g-accent-light)' }}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Clear
        </button>
      </div>

      {/* ─── Cart Items ─── */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="g-card p-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm truncate" style={{ color: 'var(--g-text)' }}>
                {item.name}
              </h4>
              <p className="text-xs mt-0.5" style={{ color: 'var(--g-text-muted)' }}>
                {formatCurrency(item.price)} each
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Stepper */}
              <div className="flex items-center gap-0 rounded-lg overflow-hidden"
                style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
                <button
                  type="button"
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  aria-label={`Decrease quantity of ${item.name}`}
                  className="h-8 w-8 flex items-center justify-center transition-colors cursor-pointer"
                  style={{ color: 'var(--g-accent)' }}
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <span className="w-6 text-center text-sm font-bold" style={{ color: 'var(--g-accent)' }}>
                  {item.qty}
                </span>
                <button
                  type="button"
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  aria-label={`Increase quantity of ${item.name}`}
                  className="h-8 w-8 flex items-center justify-center transition-colors cursor-pointer"
                  style={{ color: 'var(--g-accent)' }}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>

              <div className="w-20 text-right font-bold text-sm" style={{ color: 'var(--g-text)' }}>
                {formatCurrency(item.price * item.qty)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── GOES WELL WITH YOUR ORDER ─── */}
      {visibleRecommendations.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--g-accent)' }} />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--g-text)' }}>
                Goes Well With Your Order
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollRecs('left')}
                className="h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer"
                style={{ background: 'var(--g-surface)', border: '1px solid var(--g-border)', color: 'var(--g-text-secondary)' }}
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRecs('right')}
                className="h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer"
                style={{ background: 'var(--g-surface)', border: '1px solid var(--g-border)', color: 'var(--g-text-secondary)' }}
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Scroll Cards */}
          <div
            ref={recsScrollRef}
            className="flex gap-3 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {visibleRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="g-card p-3.5 flex flex-col justify-between shrink-0 transition-all hover:scale-[1.01]"
                style={{ width: '160px', scrollSnapAlign: 'start', borderRadius: '16px' }}
              >
                <div className="space-y-1">
                  <h4 className="font-semibold text-xs leading-snug line-clamp-2" style={{ color: 'var(--g-text)' }}>
                    {rec.name}
                  </h4>
                  <p className="text-xs font-bold" style={{ color: 'var(--g-text)' }}>
                    {formatCurrency(rec.price)}
                  </p>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => addToCart(rec)}
                    className="w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                    style={{
                      background: 'var(--g-surface-2)',
                      border: '1px solid var(--g-border)',
                      color: 'var(--g-accent)',
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── YOUR DETAILS • REQUIRED ─── */}
      <div
        ref={detailsSectionRef}
        className="g-card p-4 space-y-3.5 transition-all"
        style={{
          border: nameError || phoneError ? '1.5px solid var(--g-accent)' : '1px solid var(--g-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--g-text)' }}>
              Your Details &bull; Required
            </span>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'var(--g-green-light)', color: 'var(--g-green)', border: '1px solid rgba(27,166,114,0.15)' }}
          >
            <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
            <span>Secure &amp; Private</span>
          </span>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
          The order goes to the kitchen under this name, so the restaurant knows whose it is.
        </p>

        <div className="space-y-3 pt-0.5">
          {/* Name Input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold" style={{ color: 'var(--g-text-secondary)' }}>
                Name <span style={{ color: 'var(--g-accent)' }}>*</span>
              </label>
              {nameError && (
                <span className="text-[10px] font-medium" style={{ color: 'var(--g-accent)' }}>
                  {nameError}
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--g-text-muted)' }}>
                <User className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <input
                type="text"
                value={guestName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                autoComplete="name"
                className="g-input w-full pl-10 pr-3.5 py-2.5 text-sm font-medium"
                style={{
                  borderRadius: '12px',
                  border: nameError ? '1.5px solid var(--g-accent)' : undefined,
                }}
              />
            </div>
          </div>

          {/* Mobile Number Input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold" style={{ color: 'var(--g-text-secondary)' }}>
                Mobile number <span className="text-[11px] font-normal" style={{ color: 'var(--g-text-muted)' }}>(optional)</span>
              </label>
              {phoneError ? (
                <span className="text-[10px] font-medium" style={{ color: 'var(--g-accent)' }}>
                  {phoneError}
                </span>
              ) : guestPhone.replace(/\D/g, '').length >= 10 ? (
                <span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: 'var(--g-green)' }}>
                  <Check className="h-3 w-3" strokeWidth={2.5} /> Valid
                </span>
              ) : null}
            </div>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--g-text-muted)' }}>
                <Phone className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="e.g. 98765 43210"
                autoComplete="tel"
                className="g-input w-full pl-10 pr-3.5 py-2.5 text-sm font-medium"
                style={{
                  borderRadius: '12px',
                  border: phoneError ? '1.5px solid var(--g-accent)' : undefined,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Kitchen Notes ─── */}
      <div className="g-card p-4 space-y-2">
        <label className="block text-xs font-semibold" style={{ color: 'var(--g-text-secondary)' }}>
          Special Instructions
        </label>
        <textarea
          value={guestNotes}
          onChange={(e) => setGuestNotes(e.target.value)}
          placeholder="E.g. Less spicy, no dairy, extra napkins..."
          rows={2}
          className="g-input w-full p-3 text-sm resize-none"
          style={{ borderRadius: '12px' }}
        />
      </div>

      {/* ─── Coupon / Promo Code ─── */}
      <div className="g-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" style={{ color: 'var(--g-accent)' }} strokeWidth={1.5} />
            <span className="text-xs font-semibold" style={{ color: 'var(--g-text-secondary)' }}>
              Offers &amp; Coupons
            </span>
          </div>
          {appliedCoupon && (
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: 'var(--g-green-light)', color: 'var(--g-green)' }}>
              Applied ✓
            </span>
          )}
        </div>

        {appliedCoupon ? (
          <div className="p-3 rounded-xl flex items-center justify-between gap-3"
            style={{ background: 'var(--g-green-light)', border: '1px solid rgba(27,166,114,0.15)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--g-green)', color: '#fff' }}>
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs tracking-wider" style={{ color: 'var(--g-text)' }}>
                  {appliedCoupon.code}
                </span>
                <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--g-green)' }}>
                  You save {formatCurrency(discountAmount)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeCoupon}
              className="text-xs font-medium px-3 py-1 rounded-full transition-colors shrink-0 cursor-pointer"
              style={{ color: 'var(--g-accent)' }}
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
                placeholder="Enter coupon code"
                className="g-input flex-1 px-4 py-2.5 text-sm font-medium uppercase tracking-wider"
                style={{ borderRadius: '10px' }}
              />
              <button
                type="button"
                onClick={() => handleApplyCoupon()}
                disabled={!couponInput.trim() || isApplyingCoupon}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
                style={{ background: 'var(--g-accent)', color: '#fff' }}
              >
                {isApplyingCoupon ? '...' : 'Apply'}
              </button>
            </div>

            {availableCoupons && availableCoupons.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-medium uppercase tracking-wider block"
                  style={{ color: 'var(--g-text-muted)' }}>
                  Available Offers
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableCoupons.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleApplyCoupon(c.code)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                      style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)', color: 'var(--g-text-secondary)' }}
                    >
                      <span className="font-bold" style={{ color: 'var(--g-accent)' }}>{c.code}</span>
                      <span style={{ color: 'var(--g-text-muted)' }}>
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

      {/* ─── Payment Method ─── */}
      <div className="g-card p-4 space-y-3">
        <label className="block text-xs font-semibold" style={{ color: 'var(--g-text-secondary)' }}>
          Payment Method
        </label>

        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'counter', label: 'At Counter', sublabel: 'Cash or Card', Icon: Banknote },
            { key: 'online', label: 'Pay Online', sublabel: 'UPI / QR', Icon: CreditCard },
            { key: 'split', label: 'Split Pay', sublabel: 'Online + Cash', Icon: Coins },
          ].map(({ key, label, sublabel, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPaymentChoice(key)}
              className="p-3 rounded-xl text-left transition-all flex flex-col gap-1.5 cursor-pointer"
              style={{
                border: `1.5px solid ${paymentChoice === key ? 'var(--g-accent)' : 'var(--g-border)'}`,
                background: paymentChoice === key ? 'var(--g-accent-light)' : 'var(--g-surface)',
              }}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4" style={{ color: paymentChoice === key ? 'var(--g-accent)' : 'var(--g-text-muted)' }} strokeWidth={1.5} />
                {paymentChoice === key && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--g-accent)' }} strokeWidth={2} />}
              </div>
              <div>
                <span className="text-xs font-semibold block" style={{ color: paymentChoice === key ? 'var(--g-text)' : 'var(--g-text-muted)' }}>
                  {label}
                </span>
                <span className="text-[10px] block mt-0.5" style={{ color: 'var(--g-text-muted)' }}>
                  {sublabel}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Part Payment Config */}
        {paymentChoice === 'split' && (
          <div className="p-3.5 rounded-xl space-y-3 mt-1"
            style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--g-text)' }}>
                <ArrowRightLeft className="h-3.5 w-3.5" style={{ color: 'var(--g-accent)' }} />
                <span>Configure Split</span>
              </div>
              <span className="text-[10px] font-medium" style={{ color: 'var(--g-text-muted)' }}>Total: {formatCurrency(grandTotal)}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: '50/50', onlineRatio: 0.5 },
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
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer"
                    style={{
                      background: isSelected ? 'var(--g-accent)' : 'var(--g-surface)',
                      color: isSelected ? '#fff' : 'var(--g-text-muted)',
                      border: isSelected ? 'none' : '1px solid var(--g-border)',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--g-accent)' }}>Online</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--g-text-muted)' }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    max={grandTotal - 1}
                    value={splitOnlineAmount}
                    onChange={(e) => setSplitOnlineAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--g-surface)', border: '1px solid rgba(226,55,68,0.3)', color: 'var(--g-text)' }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--g-amber)' }}>Cash Due</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--g-text-muted)' }}>₹</span>
                  <input
                    type="number"
                    readOnly
                    value={effectiveCashAmount}
                    className="w-full pl-7 pr-3 py-2 rounded-lg text-xs font-bold cursor-not-allowed"
                    style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)', color: 'var(--g-amber)' }}
                  />
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="h-2 w-full rounded-full overflow-hidden flex" style={{ background: 'var(--g-surface)' }}>
                <div className="h-full transition-all duration-300" style={{ width: `${(effectiveOnlineAmount / (grandTotal || 1)) * 100}%`, background: 'var(--g-accent)' }} />
                <div className="h-full transition-all duration-300" style={{ width: `${(effectiveCashAmount / (grandTotal || 1)) * 100}%`, background: 'var(--g-amber)' }} />
              </div>
              <div className="flex justify-between text-[10px] font-medium">
                <span style={{ color: 'var(--g-accent)' }}>Online: {formatCurrency(effectiveOnlineAmount)}</span>
                <span style={{ color: 'var(--g-amber)' }}>Cash: {formatCurrency(effectiveCashAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bill Summary ─── */}
      <div className="g-card p-5 space-y-3 text-sm">
        <h4 className="text-xs font-semibold pb-2" style={{ color: 'var(--g-text-secondary)', borderBottom: '1px solid var(--g-border)' }}>
          Bill Details
        </h4>

        <div className="flex justify-between" style={{ color: 'var(--g-text-muted)' }}>
          <span>Subtotal</span>
          <span className="font-medium" style={{ color: 'var(--g-text)' }}>{formatCurrency(subtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between font-medium" style={{ color: 'var(--g-green)' }}>
            <span>Discount ({appliedCoupon?.code})</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between" style={{ color: 'var(--g-text-muted)' }}>
          <span>GST (5%)</span>
          <span className="font-medium" style={{ color: 'var(--g-text)' }}>{formatCurrency(tax)}</span>
        </div>

        <div className="pt-3 flex justify-between items-center" style={{ borderTop: '1px solid var(--g-border)' }}>
          <span className="text-base font-bold" style={{ color: 'var(--g-text)' }}>Total</span>
          <span className="text-lg font-extrabold" style={{ color: 'var(--g-accent)' }}>{formatCurrency(grandTotal)}</span>
        </div>

        {paymentChoice === 'split' && (
          <div className="mt-1 pt-2 space-y-1 text-xs font-medium" style={{ borderTop: '1px dashed var(--g-border)' }}>
            <div className="flex justify-between" style={{ color: 'var(--g-accent)' }}>
              <span>• Online (UPI)</span>
              <span>{formatCurrency(effectiveOnlineAmount)}</span>
            </div>
            <div className="flex justify-between" style={{ color: 'var(--g-amber)' }}>
              <span>• Cash at Counter</span>
              <span>{formatCurrency(effectiveCashAmount)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Place Order Button ─── */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleOrderSubmission}
          disabled={isSubmitting}
          className="g-btn-primary w-full py-4 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending Order…
            </span>
          ) : paymentChoice === 'split' ? (
            `Pay ${formatCurrency(effectiveOnlineAmount)} Online & ${formatCurrency(effectiveCashAmount)} Cash`
          ) : paymentChoice === 'online' ? (
            `Pay ${formatCurrency(grandTotal)} Online`
          ) : (
            'Place Order'
          )}
        </button>

        <p className="text-center text-[11px] flex items-center justify-center gap-1.5"
          style={{ color: 'var(--g-text-muted)' }}>
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--g-green)' }} strokeWidth={1.5} />
          <span>Your order is sent directly to the kitchen</span>
        </p>
      </div>

      {/* ─── Payment Modal ─── */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !paymentProcessing && setIsPaymentModalOpen(false)}
        title={paymentChoice === 'split' ? 'Part Payment' : 'Pay Online'}
        size="sm"
        guestTheme={true}
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="p-4 rounded-xl flex items-center justify-between"
            style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--g-text-muted)' }}>
                {paymentChoice === 'split' ? 'Online Amount' : 'Amount to Pay'}
              </span>
              <div className="text-lg font-bold" style={{ color: 'var(--g-accent)' }}>
                {formatCurrency(paymentChoice === 'split' ? effectiveOnlineAmount : grandTotal)}
              </div>
              {paymentChoice === 'split' && (
                <span className="text-[10px] font-medium block mt-0.5" style={{ color: 'var(--g-amber)' }}>
                  + {formatCurrency(effectiveCashAmount)} cash at counter
                </span>
              )}
            </div>
            <span className="text-[11px] px-2.5 py-1 font-semibold rounded-full flex items-center gap-1"
              style={{ background: 'var(--g-green-light)', color: 'var(--g-green)', border: '1px solid rgba(27,166,114,0.15)' }}>
              <ShieldCheck className="h-3 w-3" strokeWidth={1.5} /> Secure
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium" style={{ color: 'var(--g-text-secondary)' }}>Select UPI App</span>
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
                  className="py-2 px-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
                  style={{
                    border: `1.5px solid ${selectedUpiApp === app.id ? 'var(--g-accent)' : 'var(--g-border)'}`,
                    color: selectedUpiApp === app.id ? 'var(--g-accent)' : 'var(--g-text-muted)',
                    background: selectedUpiApp === app.id ? 'var(--g-accent-light)' : 'var(--g-surface)',
                  }}
                >
                  {app.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl text-center space-y-2"
            style={{ background: 'var(--g-surface-2)', border: '1px solid var(--g-border)' }}>
            <div className="h-28 w-28 mx-auto bg-white p-2 rounded-xl shadow-sm flex items-center justify-center"
              style={{ border: '1px solid var(--g-border)' }}>
              <QrCode className="h-24 w-24" style={{ color: 'var(--g-text)' }} strokeWidth={1.5} />
            </div>
            <p className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
              Scan with any UPI app
            </p>
          </div>

          <button
            type="button"
            onClick={handleCompleteOnlinePayment}
            disabled={paymentProcessing}
            className="g-btn-primary w-full py-3.5 text-sm font-semibold disabled:opacity-50"
          >
            {paymentProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying…
              </span>
            ) : (
              `Pay ${formatCurrency(paymentChoice === 'split' ? effectiveOnlineAmount : grandTotal)}`
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default GuestCartScreen;
