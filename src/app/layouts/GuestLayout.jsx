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
      label: 'Live Orders',
      mobileLabel: 'Orders',
      href: `/t/${shortCode}/orders`,
      icon: Clock,
      isActive: location.pathname === `/t/${shortCode}/orders`,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07080B] text-[#F4F5F7] flex flex-col font-sans selection:bg-accent selection:text-bg">
      {/* ─── Pure Restaurant Dining Header (No TableSuite Branding) ─── */}
      <header className="w-full border-b border-white/[0.08] bg-[#0E1016]/95 backdrop-blur-md sticky top-0 z-30 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-10 py-2.5 sm:py-3.5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Restaurant & Table Identity — Guaranteed prominence for venue name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-[#141721] border border-white/10 flex items-center justify-center text-accent font-bold text-xs sm:text-sm shrink-0 shadow-sm">
                <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5 text-accent" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1
                    title={tableData.venueName}
                    className="text-sm sm:text-base font-heading font-bold text-[#F4F5F7] tracking-tight truncate leading-tight"
                  >
                    {tableData.venueName}
                  </h1>
                  <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-mono text-[10px] font-medium shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                    Table {tableData.tableNumber}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] font-mono text-[#8A8F9C] flex items-center gap-1.5 truncate">
                  <span className="xs:hidden text-accent font-semibold">T-{tableData.tableNumber} &bull;</span>
                  <span>Digital Menu</span>
                  <span className="text-white/20">&bull;</span>
                  <span>Code: {shortCode}</span>
                </p>
              </div>
            </div>

            {/* Sub-Navigation Tabs — Responsive pills (active tab shows text, inactive tabs compact on mobile) */}
            <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.id}
                    to={tab.href}
                    title={tab.label}
                    className={`group relative flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2.5 min-h-[36px] sm:min-h-[42px] rounded-full text-xs font-medium transition-all duration-200 shrink-0 ${
                      tab.isActive
                        ? 'bg-accent text-bg font-semibold shadow-xs'
                        : 'bg-surface-2 text-muted hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span className={tab.isActive ? 'text-xs inline' : 'hidden sm:inline text-xs'}>
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.mobileLabel}</span>
                    </span>
                    {tab.badge && (
                      <span
                        className={`h-4 min-w-4 px-1 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                          tab.isActive ? 'bg-bg text-accent' : 'bg-accent text-bg'
                        } ${cartBounce ? 'scale-110' : ''} transition-transform`}
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
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-5 sm:py-6 safe-bottom">
        <AnimatedOutlet />
      </main>

      {/* Push Notification Opt-In (Framed at Top) */}
      {tableData.venueId && (
        <NotificationOptIn
          venueId={tableData.venueId}
          venueName={tableData.venueName}
        />
      )}

      {/* Clean Restaurant Dining Minimal Footer (No TableSuite Branding) */}
      <footer className="w-full border-t border-white/[0.06] py-5 px-4 text-center text-xs text-[#8A8F9C]/60 font-mono">
        <p>{tableData.venueName} &bull; Table {tableData.tableNumber} &bull; Digital Dining</p>
      </footer>
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

  /* Clean Restaurant Loading State (No TableSuite Navbar/Footer) */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07080B] text-[#F4F5F7] flex flex-col items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-xs font-mono text-[#8A8F9C] tracking-wider uppercase">
            Loading Digital Menu…
          </span>
        </div>
      </div>
    );
  }

  /* Clean Restaurant Table Not Found State (No TableSuite Navbar/Footer) */
  if (tableNotFound) {
    return (
      <div className="min-h-screen bg-[#07080B] text-[#F4F5F7] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full rounded-card card-surface p-8 border border-white/10 space-y-4 shadow-2xl text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg sm:text-xl font-heading font-bold text-white">Table Not Found</h2>
          <p className="text-xs text-[#8A8F9C] leading-relaxed font-sans">
            The table code (<code className="font-mono text-accent">{shortCode}</code>) is inactive or unavailable.
            Please scan the QR code on your dining table again or ask a staff member for assistance.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Scan Again / Refresh
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
