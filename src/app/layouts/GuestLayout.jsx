import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { applyVenueBranding } from '@/features/shared/branding';
import { AnimatedOutlet } from '@/components/animation/AnimatedOutlet';
import {
  ShoppingBag,
  Clock,
  AlertCircle,
  UtensilsCrossed,
  RotateCw,
} from 'lucide-react';
import { CartProvider, useCart } from '@/features/guest/cart/context/CartContext';
import { NotificationOptIn } from '@/features/guest/home/components/NotificationOptIn';
import { preloadGuestFlow } from '@/app/routes';

/* ─── Inner shell that reads cart context ─── */
function GuestShell({ shortCode, tableData }) {
  const { totalItemCount } = useCart();
  const [cartBounce, setCartBounce] = useState(false);
  const location = useLocation();
  const prevCount = React.useRef(totalItemCount);

  useEffect(() => {
    preloadGuestFlow();
    document.body.style.backgroundColor = '#FAFAF8';
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

  const navTabs = [
    {
      id: 'menu',
      label: 'Menu',
      mobileLabel: 'Menu',
      href: `/t/${shortCode}`,
      icon: UtensilsCrossed,
      isActive: location.pathname === `/t/${shortCode}`,
    },
    {
      id: 'cart',
      label: 'Cart',
      mobileLabel: 'Cart',
      href: `/t/${shortCode}/cart`,
      icon: ShoppingBag,
      badge: totalItemCount > 0 ? totalItemCount : null,
      isActive: location.pathname === `/t/${shortCode}/cart`,
    },
    {
      id: 'orders',
      label: 'Orders',
      mobileLabel: 'Orders',
      href: `/t/${shortCode}/orders`,
      icon: Clock,
      isActive: location.pathname === `/t/${shortCode}/orders`,
    },
  ];

  return (
    <div className="guest-light min-h-screen flex flex-col font-sans">
      {/* ─── Clean Light Header ─── */}
      <header className="w-full bg-white/95 backdrop-blur-md sticky top-0 z-30 border-b"
        style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Restaurant Identity */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--g-accent-light)', border: '1px solid rgba(226,55,68,0.12)' }}>
                <UtensilsCrossed className="h-4.5 w-4.5" style={{ color: 'var(--g-accent)' }} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <h1
                  title={tableData.venueName}
                  className="text-sm font-semibold tracking-tight truncate leading-tight"
                  style={{ color: 'var(--g-text)' }}
                >
                  {tableData.venueName}
                </h1>
                <p className="text-[11px] flex items-center gap-1.5 truncate"
                  style={{ color: 'var(--g-text-muted)' }}>
                  <span style={{ color: 'var(--g-accent)', fontWeight: 600 }}>Table {tableData.tableNumber}</span>
                  <span style={{ color: 'rgba(0,0,0,0.2)' }}>&bull;</span>
                  <span>Code: {shortCode}</span>
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1.5 shrink-0">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.id}
                    to={tab.href}
                    title={tab.label}
                    className="group relative flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0"
                    style={{
                      ...(tab.isActive
                        ? { background: 'var(--g-accent)', color: '#fff', fontWeight: 600, boxShadow: '0 2px 8px rgba(226,55,68,0.2)' }
                        : { background: 'var(--g-surface-2)', color: 'var(--g-text-muted)', border: '1px solid var(--g-border)' }),
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span className={tab.isActive ? 'text-xs inline' : 'hidden sm:inline text-xs'}>
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.mobileLabel}</span>
                    </span>
                    {tab.badge && (
                      <span
                        className={`h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${cartBounce ? 'scale-110' : ''} transition-transform`}
                        style={{
                          ...(tab.isActive
                            ? { background: '#fff', color: 'var(--g-accent)' }
                            : { background: 'var(--g-accent)', color: '#fff' }),
                        }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Dynamic Route Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-6 safe-bottom">
        <AnimatedOutlet />
      </main>

      {/* Push Notification Opt-In */}
      {tableData.venueId && (
        <NotificationOptIn
          venueId={tableData.venueId}
          venueName={tableData.venueName}
        />
      )}

      {/* Minimal Footer */}
      <footer className="w-full py-5 px-4 text-center text-[11px]"
        style={{ color: 'var(--g-text-muted)', borderTop: '1px solid var(--g-border)' }}>
        <p>{tableData.venueName} &bull; Table {tableData.tableNumber} &bull; Digital Menu</p>
      </footer>
    </div>
  );
}

export function GuestLayout() {
  const { shortCode } = useParams();
  const [tableData, setTableData] = useState({
    tableNumber: '',
    venueName: '',
    brandColor: '#E23744',
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
            brandColor: venue?.brand_color || '#E23744',
            currency: venue?.currency || 'INR',
            venueId: venue?.id || null,
          });
          applyVenueBranding(venue?.brand_color || '#E23744');
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

  /* Loading State — Light Theme */
  if (isLoading) {
    return (
      <div className="guest-light min-h-screen flex flex-col items-center justify-center p-6 font-sans"
        style={{ background: 'var(--g-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-3"
            style={{ borderColor: 'var(--g-surface-3)', borderTopColor: 'var(--g-accent)' }} />
          <span className="text-xs tracking-wide" style={{ color: 'var(--g-text-muted)' }}>
            Loading Menu…
          </span>
        </div>
      </div>
    );
  }

  /* Table Not Found — Light Theme */
  if (tableNotFound) {
    return (
      <div className="guest-light min-h-screen flex items-center justify-center p-6 font-sans"
        style={{ background: 'var(--g-bg)' }}>
        <div className="max-w-sm w-full rounded-2xl p-8 text-center space-y-4"
          style={{ background: 'var(--g-surface)', boxShadow: 'var(--g-shadow-lg)', border: '1px solid var(--g-border)' }}>
          <div className="h-14 w-14 mx-auto rounded-full flex items-center justify-center"
            style={{ background: 'rgba(226,55,68,0.08)', border: '1px solid rgba(226,55,68,0.15)' }}>
            <AlertCircle className="h-7 w-7" style={{ color: 'var(--g-accent)' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--g-text)' }}>Table Not Found</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
            The table code (<code className="font-mono font-semibold" style={{ color: 'var(--g-accent)' }}>{shortCode}</code>) is inactive or unavailable.
            Please scan the QR code on your dining table again.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="g-btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm"
            >
              <RotateCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
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

export default GuestLayout;
