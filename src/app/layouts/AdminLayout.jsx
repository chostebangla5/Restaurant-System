import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/features/shared/auth';
import { AnimatedOutlet } from '@/components/animation/AnimatedOutlet';
import {
  LayoutDashboard,
  Flame,
  Activity,
  Grid,
  BookOpen,
  Receipt,
  QrCode,
  Tag,
  UserCheck,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ChevronsUpDown,
  FileText,
  MessageSquare,
  TrendingUp,
  ClipboardCheck,
  Bell,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export function AdminLayout() {
  const {
    user,
    staffProfile,
    staffProfiles,
    role,
    venue,
    venueId,
    signOut,
    switchVenue,
  } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isVenueSwitcherOpen, setIsVenueSwitcherOpen] = useState(false);

  useEffect(() => {
    const pageMetadata = {
      '/admin': { title: 'Dashboard | TableSuite Admin', desc: 'Real-time restaurant overview, live metrics, and quick actions.' },
      '/admin/live-orders': { title: 'Live Orders | TableSuite Admin', desc: 'Monitor active table orders and kitchen status in real time.' },
      '/admin/kitchen': { title: 'Kitchen KDS | TableSuite Admin', desc: 'Kitchen Display System with ticket routing and timer management.' },
      '/admin/tables': { title: 'Table Management | TableSuite Admin', desc: 'Floor plan, active table sessions, and seat turnover tracking.' },
      '/admin/menu': { title: 'Menu Management | TableSuite Admin', desc: 'Manage categories, dishes, prices, and 86-item availability.' },
      '/admin/billing': { title: 'Billing & POS | TableSuite Admin', desc: 'Point-of-Sale billing, table checkout, receipt printing, and payment settlement.' },
      '/admin/sales': { title: 'Sales & Analytics | TableSuite Admin', desc: 'Revenue analysis, tax reporting, net sales, and exportable financial reports.' },
      '/admin/team': { title: 'Staff & Team | TableSuite Admin', desc: 'Manage waitstaff, chef accounts, roles, and permissions.' },
      '/admin/qr-codes': { title: 'QR Generator | TableSuite Admin', desc: 'Generate and print table QR codes with instant menu routing.' },
      '/admin/offers': { title: 'Offers & Coupons | TableSuite Admin', desc: 'Configure promotional discounts, percentage off, and coupon limits.' },
      '/admin/guests': { title: 'Guests & CRM | TableSuite Admin', desc: 'Customer directory, dining history, visit count, and guest relationship tools.' },
      '/admin/invoices': { title: 'Invoices & Tax Records | TableSuite Admin', desc: 'Auditable GST invoice history, reconciliation, and payment records.' },
      '/admin/feedback': { title: 'Guest Feedback | TableSuite Admin', desc: 'Ratings and dining reviews submitted by diners.' },
      '/admin/attendance': { title: 'Staff Attendance | TableSuite Admin', desc: 'Team attendance tracking, clock-in/out records, and shift management.' },
      '/admin/settings': { title: 'Business Settings | TableSuite Admin', desc: 'Venue details, GSTIN, FSSAI, brand styling, and operating preferences.' },
    };

    const current = pageMetadata[location.pathname] || {
      title: 'Admin Portal | TableSuite',
      desc: 'TableSuite restaurant admin and operations platform.',
    };
    document.title = current.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', current.desc);
    }
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Live Orders', path: '/admin/live-orders', icon: Activity, badge: 'Live' },
    { label: 'Kitchen KDS', path: '/admin/kitchen', icon: Flame },
    { label: 'Tables', path: '/admin/tables', icon: Grid },
    { label: 'Menu Items', path: '/admin/menu', icon: BookOpen },
    { label: 'Billing & POS', path: '/admin/billing', icon: Receipt },
    { label: 'Sales & Analytics', path: '/admin/sales', icon: TrendingUp, badge: 'New' },
    { label: 'Staff & Team', path: '/admin/team', icon: Users },
    { label: 'Attendance', path: '/admin/attendance', icon: ClipboardCheck, badge: 'New' },
    { label: 'QR Generator', path: '/admin/qr-codes', icon: QrCode },
    { label: 'Offers & Coupons', path: '/admin/offers', icon: Tag },
    { label: 'Guests & CRM', path: '/admin/guests', icon: UserCheck },
    { label: 'Invoices', path: '/admin/invoices', icon: FileText },
    { label: 'Feedback', path: '/admin/feedback', icon: MessageSquare },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleVenueSwitch = (newVenueId) => {
    switchVenue(newVenueId);
    setIsVenueSwitcherOpen(false);
  };

  const currentVenueName = venue?.name || staffProfile?.venues?.name || 'My Venue';
  const hasMultipleVenues = staffProfiles.length > 1;

  return (
    <div className="min-h-screen bg-[#07080B] text-[#F4F5F7] flex flex-col md:flex-row selection:bg-[#C6FF3D] selection:text-[#07080B]">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-[#0E1016] border-b border-white/[0.08] safe-top sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#141721] border border-[#C6FF3D]/30 flex items-center justify-center text-[#C6FF3D] font-mono font-bold text-xs tracking-wider">
            TS
          </div>
          <span className="font-heading font-bold text-sm tracking-tight text-[#F4F5F7]">TableSuite</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08] text-[#8A8F9C] hover:text-[#F4F5F7] transition-colors"
          >
            {isDarkMode ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
          </button>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            aria-label="Toggle navigation sidebar"
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08] text-[#8A8F9C] hover:text-[#F4F5F7] transition-colors"
          >
            {isMobileSidebarOpen ? <X className="h-4 w-4" strokeWidth={1.5} /> : <Menu className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-[#0E1016] border-r border-white/[0.08] flex flex-col transition-transform duration-200 md:static md:translate-x-0',
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#141721] border border-[#C6FF3D]/30 flex items-center justify-center text-[#C6FF3D] font-mono font-bold text-xs tracking-wider shadow-sm">
              TS
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm tracking-tight text-[#F4F5F7]">
                TableSuite
              </h2>
              <p className="font-mono text-[10px] text-[#8A8F9C] uppercase tracking-wider">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Venue Switcher */}
        <div className="px-3 mt-4 relative">
          <button
            type="button"
            onClick={() => hasMultipleVenues && setIsVenueSwitcherOpen(!isVenueSwitcherOpen)}
            className={cn(
              'w-full px-3.5 py-2.5 rounded-xl bg-[#141721] border border-white/[0.08] text-left transition-all',
              hasMultipleVenues && 'hover:border-white/[0.2] cursor-pointer'
            )}
          >
            <div className="text-[10px] uppercase tracking-wider font-mono text-[#8A8F9C]">
              Active Venue
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs font-medium text-[#F4F5F7] truncate">
                {currentVenueName}
              </span>
              {hasMultipleVenues && (
                <ChevronsUpDown className="h-3.5 w-3.5 text-[#8A8F9C] shrink-0 ml-2" strokeWidth={1.5} />
              )}
            </div>
          </button>

          {/* Venue Dropdown */}
          {isVenueSwitcherOpen && hasMultipleVenues && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsVenueSwitcherOpen(false)}
              />
              <div className="absolute top-full left-3 right-3 mt-1.5 z-20 bg-[#141721] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden py-1">
                {staffProfiles.map((profile) => (
                  <button
                    key={profile.venue_id}
                    type="button"
                    onClick={() => handleVenueSwitch(profile.venue_id)}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors',
                      profile.venue_id === venueId
                        ? 'bg-[#C6FF3D]/10 text-[#C6FF3D]'
                        : 'text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.04]'
                    )}
                  >
                    <div>{profile.venues?.name || 'Venue'}</div>
                    <div className="text-[10px] font-mono text-[#8A8F9C] mt-0.5 capitalize">
                      Role: {profile.role}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setIsMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2.5 min-h-[40px] rounded-xl text-xs font-medium transition-all group relative',
                    isActive
                      ? 'bg-white/[0.06] text-[#F4F5F7] border border-white/[0.12]'
                      : 'text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.03] border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#C6FF3D] rounded-full" />
                    )}
                    <div className="flex items-center gap-3">
                      <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#C6FF3D]' : 'text-[#8A8F9C] group-hover:text-[#F4F5F7]')} strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#C6FF3D]/15 text-[#C6FF3D] border border-[#C6FF3D]/30">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer & Theme Toggle */}
        <div className="p-3 border-t border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full bg-[#141721] border border-white/[0.12] flex items-center justify-center font-mono font-medium text-[11px] text-[#F4F5F7]">
                {(staffProfile?.full_name || user?.email || 'ST').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate text-[#F4F5F7]">
                  {staffProfile?.full_name || user?.email?.split('@')[0] || 'Staff Member'}
                </p>
                <p className="text-[10px] font-mono text-[#8A8F9C] capitalize">
                  {role || 'Admin'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-1.5 rounded-full text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.05] transition-colors"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />}
            </button>
          </div>

          <Link
            to="/staff"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-[#07080B] bg-[#C6FF3D] hover:bg-[#b5f02e] rounded-xl transition-all shadow-sm group"
          >
            <UserCheck className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Staff Portal View</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-[#07080B]/90 backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-20">
          <div>
            <span className="text-base font-heading font-bold text-[#F4F5F7] block">
              {navItems.find((n) =>
                n.end ? n.path === location.pathname : location.pathname.startsWith(n.path)
              )?.label || 'Dashboard'}
            </span>
            <p className="text-xs text-[#8A8F9C]">
              {currentVenueName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/staff"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#C6FF3D] bg-[#C6FF3D]/10 hover:bg-[#C6FF3D]/20 border border-[#C6FF3D]/30 transition-colors"
              title="Open Staff Portal"
            >
              <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Staff Portal</span>
            </Link>

            <div className="flex items-center gap-2 bg-[#C6FF3D]/10 text-[#C6FF3D] px-3 py-1 rounded-full text-xs font-mono border border-[#C6FF3D]/25">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C6FF3D] animate-pulse"></span>
              Realtime Sync Active
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}
