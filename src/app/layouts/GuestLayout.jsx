import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { applyVenueBranding } from '@/features/shared/branding';
import { AnimatedOutlet } from '@/components/animation/AnimatedOutlet';
import { ShoppingBagIcon, ClockIcon } from '@heroicons/react/24/outline';
import { CartProvider, useCart } from '@/features/guest/cart/context/CartContext';
import { NotificationOptIn } from '@/features/guest/home/components/NotificationOptIn';

/* ─── Inner shell that can read cart context ─── */
function GuestShell({ shortCode, tableData }) {
  const { totalItemCount } = useCart();
  const [cartBounce, setCartBounce] = useState(false);
  const prevCount = React.useRef(totalItemCount);

  useEffect(() => {
    document.body.style.backgroundColor = '#2B0E14';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    if (totalItemCount > prevCount.current) {
      setCartBounce(true);
      const t = setTimeout(() => setCartBounce(false), 350);
      return () => clearTimeout(t);
    }
    prevCount.current = totalItemCount;
  }, [totalItemCount]);

  return (
    <div className="min-h-screen bg-[#2B0E14] flex flex-col items-center font-body">
      {/* Mobile-constrained viewport shell */}
      <div className="w-full max-w-md min-h-screen bg-[#2B0E14] shadow-2xl flex flex-col relative">
        {/* ═══ Royal Plum Header with Gold Trim ═══ */}
        <header className="sticky top-0 z-30 royal-header px-4 py-3 safe-top">
          <div className="flex items-center justify-between">
            {/* Venue identity */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Table number in gold-bordered badge */}
              <div className="h-9 w-9 rounded-xl border border-[#E5C158] bg-[#E5C158]/15 flex items-center justify-center text-[#E5C158] font-serif font-bold text-sm shrink-0 shadow-gold">
                {tableData.tableNumber}
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-serif font-bold text-[#F6EEDD] tracking-wide truncate">
                  {tableData.venueName}
                </h1>
                <p className="text-[11px] font-body font-bold text-[#E5C158] flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#E5C158] animate-pulse" />
                  Table {tableData.tableNumber}
                </p>
              </div>
            </div>

            {/* Action icons */}
            <div className="flex items-center gap-2">
              {/* Order status */}
              <Link
                to={`/t/${shortCode}/orders`}
                className="p-2 rounded-xl text-[#E5C158] hover:text-[#FFFDF7] hover:bg-[#E5C158]/15 transition-colors"
                title="Order Status"
              >
                <ClockIcon className="h-5 w-5" />
              </Link>

              {/* Cart icon with badge */}
              <Link
                to={`/t/${shortCode}/cart`}
                className={`relative p-2 rounded-xl text-[#E5C158] hover:text-[#FFFDF7] hover:bg-[#E5C158]/15 transition-colors ${cartBounce ? 'animate-cart-bounce' : ''}`}
                title="View Cart"
              >
                <ShoppingBagIcon className="h-5 w-5" />
                {totalItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[#C83200] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {totalItemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* ═══ Dynamic Route Content ═══ */}
        <main className="flex-1 flex flex-col p-4 pb-24 safe-bottom">
          <AnimatedOutlet />
        </main>

        {/* Push Notification Opt-In */}
        {tableData.venueId && (
          <NotificationOptIn
            venueId={tableData.venueId}
            venueName={tableData.venueName}
          />
        )}
      </div>
    </div>
  );
}

export function GuestLayout() {
  const { shortCode } = useParams();
  const [tableData, setTableData] = useState({
    tableNumber: '',
    venueName: '',
    brandColor: '#C9A227',
    currency: 'INR',
    venueId: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tableNotFound, setTableNotFound] = useState(false);

  useEffect(() => {
    async function loadTableAndVenue() {
      if (!shortCode) return;

      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        setTableNotFound(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tables')
          .select('*, venues(*)')
          .eq('short_code', shortCode)
          .single();

        if (error || !data) {
          setTableNotFound(true);
        } else {
          const venue = data.venues;
          setTableData({
            tableNumber: data.table_number,
            venueName: venue?.name || 'Restaurant Dining',
            brandColor: venue?.brand_color || '#C9A227',
            currency: venue?.currency || 'INR',
            venueId: venue?.id || null,
          });
          applyVenueBranding(venue?.brand_color || '#C9A227');
        }
      } catch (err) {
        console.warn('Error loading table info:', err);
        setTableNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadTableAndVenue();
  }, [shortCode]);

  /* ─── Loading state ─── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dhaba-plum flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-dhaba-gold border-t-transparent" />
          <span className="text-xs font-body text-dhaba-gold/60">Loading your table…</span>
        </div>
      </div>
    );
  }

  /* ─── Table not found ─── */
  if (tableNotFound) {
    return (
      <div className="min-h-screen bg-dhaba-plum flex flex-col items-center justify-center p-6 text-center font-body">
        <div className="max-w-sm rounded-2xl royal-card p-8 shadow-gold space-y-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-dhaba-sindoor/10 text-dhaba-sindoor flex items-center justify-center font-serif font-bold text-2xl">
            ⚠
          </div>
          <h2 className="text-xl font-serif font-bold text-dhaba-ink">Table Not Found</h2>
          <p className="text-xs text-dhaba-ink-muted leading-relaxed">
            The QR code you scanned (<code className="font-mono text-dhaba-sindoor">{shortCode}</code>) is invalid or the table is currently inactive.
            Please scan the QR code on your table standee or ask a waiter for assistance.
          </p>
          <Link
            to="/"
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-dhaba-sindoor hover:bg-dhaba-sindoor-hover text-white text-xs font-bold transition-colors shadow-sindoor"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CartProvider>
      <GuestShell shortCode={shortCode} tableData={tableData} />
    </CartProvider>
  );
}
