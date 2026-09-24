import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { applyVenueBranding } from '@/features/shared/branding';
import { AnimatedOutlet } from '@/components/animation/AnimatedOutlet';
import { Navbar } from '@/components/navigation/Navbar';
import { Footer } from '@/components/navigation/Footer';
import {
  ShoppingBag,
  Clock,
  AlertCircle,
  UtensilsCrossed,
  ShieldCheck,
  ArrowLeft,
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
      href: `/t/${shortCode}`,
      icon: UtensilsCrossed,
      isActive: location.pathname === `/t/${shortCode}`,
    },
    {
      id: 'cart',
      label: 'Cart',
      href: `/t/${shortCode}/cart`,
      icon: ShoppingBag,
      badge: totalItemCount > 0 ? totalItemCount : null,
      isActive: location.pathname === `/t/${shortCode}/cart`,
    },
    {
      id: 'orders',
      label: 'Live Orders',
      href: `/t/${shortCode}/orders`,
      icon: Clock,
      isActive: location.pathname === `/t/${shortCode}/orders`,
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans selection:bg-accent selection:text-bg">
      {/* Top Navbar */}
      <Navbar />

      <div className="pt-20 sm:pt-24 flex-1 flex flex-col">
        {/* Clean Guest Page Header */}
        <header className="w-full border-b border-white/[0.08] bg-surface/85 backdrop-blur-md sticky top-[68px] sm:top-[76px] z-30 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-3.5 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              {/* Venue & Table Identity */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 sm:h-9 px-3 rounded-full border border-accent/30 bg-accent/10 flex items-center justify-center text-accent font-mono font-bold text-xs tracking-wider shrink-0 shadow-[0_0_12px_rgba(198,255,61,0.12)]">
                  T-{tableData.tableNumber}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-heading font-bold text-text tracking-tight truncate">
                      {tableData.venueName}
                    </span>
                    <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-mono text-[10px] font-medium shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      Active Session
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted flex items-center gap-1.5 truncate">
                    <span>Table {tableData.tableNumber}</span>
                    <span className="text-white/20">&bull;</span>
                    <span className="text-muted/80">Code: {shortCode}</span>
                  </p>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <nav className="flex items-center gap-2 shrink-0">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Link
                      key={tab.id}
                      to={tab.href}
                      className={`group relative flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 min-h-[44px] rounded-full text-xs font-medium transition-all duration-200 shrink-0 ${
                        tab.isActive
                          ? 'bg-accent text-bg font-semibold shadow-xs'
                          : 'bg-surface-2 text-muted hover:text-white border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span>{tab.label}</span>
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

        {/* Dynamic Route Content with consistent container width */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 safe-bottom">
          <AnimatedOutlet />
        </main>
      </div>

      {/* Push Notification Opt-In */}
      {tableData.venueId && (
        <NotificationOptIn
          venueId={tableData.venueId}
          venueName={tableData.venueName}
        />
      )}

      {/* Unified Restyled Footer */}
      <Footer />
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
      <div className="min-h-screen bg-bg text-text flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 pt-28">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-xs font-mono text-muted tracking-wider uppercase">Loading table session…</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  /* Table not found */
  if (tableNotFound) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 pt-32 pb-16">
          <div className="max-w-md w-full rounded-card card-surface p-8 border border-white/10 space-y-4 shadow-2xl text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-text">Table Not Found</h2>
            <p className="text-xs text-muted leading-relaxed font-sans">
              The QR code scanned (<code className="font-mono text-accent">{shortCode}</code>) is invalid or the table is currently inactive.
              Please scan the QR standee on your dining table or request staff assistance.
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-surface-2 hover:bg-white/[0.08] border border-white/10 text-text text-xs font-medium transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Home
              </Link>
            </div>
          </div>
        </div>
        <Footer />
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
