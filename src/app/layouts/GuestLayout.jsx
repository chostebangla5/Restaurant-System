import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { applyVenueBranding } from '@/features/shared/branding';
import { AnimatedOutlet } from '@/components/animation/AnimatedOutlet';
import { ShoppingBag, Clock, AlertCircle } from 'lucide-react';
import { CartProvider, useCart } from '@/features/guest/cart/context/CartContext';
import { NotificationOptIn } from '@/features/guest/home/components/NotificationOptIn';
import { preloadGuestFlow } from '@/app/routes';

/* ─── Inner shell that can read cart context ─── */
function GuestShell({ shortCode, tableData }) {
  const { totalItemCount } = useCart();
  const [cartBounce, setCartBounce] = useState(false);
  const prevCount = React.useRef(totalItemCount);

  useEffect(() => {
    preloadGuestFlow();
    document.body.style.backgroundColor = '#07080B';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    if (totalItemCount > prevCount.current) {
      setCartBounce(true);
      const t = setTimeout(() => setCartBounce(false), 300);
      return () => clearTimeout(t);
    }
    prevCount.current = totalItemCount;
  }, [totalItemCount]);

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col items-center font-sans selection:bg-accent selection:text-bg">
      {/* Mobile-constrained viewport shell with subtle hairline borders */}
      <div className="w-full max-w-md min-h-screen bg-bg border-x border-white/[0.06] shadow-2xl flex flex-col relative">
        {/* Minimalist Top Header */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-5 py-3.5 safe-top border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            {/* Venue identity */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Table number in pill badge */}
              <div className="h-8 px-3 rounded-full border border-white/10 bg-surface-2 flex items-center justify-center text-accent font-mono font-bold text-xs shrink-0">
                T-{tableData.tableNumber}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-heading font-bold text-text tracking-tight truncate">
                  {tableData.venueName}
                </h1>
                <p className="text-[11px] font-mono text-muted flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  Table {tableData.tableNumber}
                </p>
              </div>
            </div>

            {/* Action icons */}
            <div className="flex items-center gap-2">
              {/* Order status */}
              <Link
                to={`/t/${shortCode}/orders`}
                className="p-2 rounded-full border border-white/10 bg-surface-2 text-muted hover:text-text hover:border-white/20 transition-colors"
                title="Order Status"
              >
                <Clock className="h-4 w-4" strokeWidth={1.5} />
              </Link>

              {/* Cart icon with badge */}
              <Link
                to={`/t/${shortCode}/cart`}
                className={`relative p-2 rounded-full border border-white/10 bg-surface-2 text-muted hover:text-text hover:border-white/20 transition-all ${
                  cartBounce ? '-translate-y-0.5' : ''
                }`}
                title="View Cart"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                {totalItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-accent text-bg text-[10px] font-mono font-bold flex items-center justify-center shadow-sm">
                    {totalItemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
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
    brandColor: '#C6FF3D',
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
            brandColor: venue?.brand_color || '#C6FF3D',
            currency: venue?.currency || 'INR',
            venueId: venue?.id || null,
          });
          applyVenueBranding(venue?.brand_color || '#C6FF3D');
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

  /* Loading state */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-xs font-mono text-muted">Loading your table…</span>
        </div>
      </div>
    );
  }

  /* Table not found */
  if (tableNotFound) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-sm rounded-card bg-surface p-8 border border-white/10 space-y-4 shadow-2xl">
          <div className="h-12 w-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-heading font-bold text-text">Table Not Found</h2>
          <p className="text-xs text-muted leading-relaxed font-sans">
            The QR code you scanned (<code className="font-mono text-accent">{shortCode}</code>) is invalid or the table is currently inactive.
            Please scan the QR code on your table standee or ask a waiter for assistance.
          </p>
          <Link
            to="/"
            className="inline-block mt-2 px-6 py-2.5 rounded-full bg-surface-2 hover:bg-white/[0.08] border border-white/10 text-text text-xs font-medium transition-colors"
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
