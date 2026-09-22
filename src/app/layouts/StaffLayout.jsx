import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/shared/auth';
import { AnimatedOutlet } from '@/components/animation/AnimatedOutlet';
import {
  Square3Stack3DIcon,
  FireIcon,
  QueueListIcon,
  TableCellsIcon,
  BookOpenIcon,
  ReceiptPercentIcon,
  QrCodeIcon,
  TagIcon,
  UserGroupIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronUpDownIcon,
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export function StaffLayout() {
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
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isVenueSwitcherOpen, setIsVenueSwitcherOpen] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/staff', icon: Square3Stack3DIcon, end: true },
    { label: 'Live Orders', path: '/staff/live-orders', icon: QueueListIcon, badge: 'Live' },
    { label: 'Kitchen KDS', path: '/staff/kitchen', icon: FireIcon },
    { label: 'Tables', path: '/staff/tables', icon: TableCellsIcon },
    { label: 'Menu Items', path: '/staff/menu', icon: BookOpenIcon },
    { label: 'Billing & POS', path: '/staff/billing', icon: ReceiptPercentIcon },
    { label: 'Staff', path: '/staff/team', icon: UsersIcon },
    { label: 'QR Generator', path: '/staff/qr-codes', icon: QrCodeIcon },
    { label: 'Offers & Coupons', path: '/staff/offers', icon: TagIcon },
    { label: 'Guests & CRM', path: '/staff/guests', icon: UserGroupIcon },
    { label: 'Invoices', path: '/staff/invoices', icon: DocumentTextIcon },
    { label: 'Feedback', path: '/staff/feedback', icon: ChatBubbleLeftEllipsisIcon },
    { label: 'Settings', path: '/staff/settings', icon: Cog6ToothIcon },
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
    <div className="min-h-screen bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 safe-top">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-brand-primary flex items-center justify-center text-white font-black text-sm">
            TS
          </div>
          <span className="font-bold text-base tracking-tight">TableSuite</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
          >
            {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200"
          >
            {isMobileSidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-transform duration-200 md:static md:translate-x-0',
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-brand-primary to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-brand-primary/20">
              TS
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight tracking-tight text-stone-900 dark:text-white">
                TableSuite
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Staff Portal</p>
            </div>
          </div>
        </div>

        {/* Venue Switcher */}
        <div className="px-3 mt-3 relative">
          <button
            type="button"
            onClick={() => hasMultipleVenues && setIsVenueSwitcherOpen(!isVenueSwitcherOpen)}
            className={cn(
              'w-full px-4 py-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/50 text-left transition-all',
              hasMultipleVenues && 'hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer'
            )}
          >
            <div className="text-[11px] uppercase tracking-wider font-bold text-stone-400 dark:text-stone-500">
              Active Venue
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                {currentVenueName}
              </span>
              {hasMultipleVenues && (
                <ChevronUpDownIcon className="h-4 w-4 text-stone-400 shrink-0 ml-2" />
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
              <div className="absolute top-full left-3 right-3 mt-1 z-20 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-xl overflow-hidden">
                {staffProfiles.map((profile) => (
                  <button
                    key={profile.venue_id}
                    type="button"
                    onClick={() => handleVenueSwitch(profile.venue_id)}
                    className={cn(
                      'w-full text-left px-4 py-3 text-xs font-semibold transition-colors',
                      profile.venue_id === venueId
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/50'
                    )}
                  >
                    <div>{profile.venues?.name || 'Venue'}</div>
                    <div className="text-[11px] font-normal text-stone-400 mt-0.5 capitalize">
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
                    'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                    isActive
                      ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/30'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-200'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0 opacity-80 group-hover:opacity-100" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer & Theme Toggle */}
        <div className="p-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-bold text-xs text-stone-700 dark:text-stone-200">
                {(staffProfile?.full_name || user?.email || 'ST').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-stone-800 dark:text-stone-200">
                  {staffProfile?.full_name || user?.email?.split('@')[0] || 'Staff Member'}
                </p>
                <p className="text-[10px] text-stone-400 capitalize">
                  {role || 'Staff'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 dark:text-stone-400"
              title="Toggle theme"
            >
              {isDarkMode ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800/80 sticky top-0 z-20">
          <div>
            <h1 className="text-lg font-bold text-stone-900 dark:text-white">
              {navItems.find((n) =>
                n.end ? n.path === location.pathname : location.pathname.startsWith(n.path)
              )?.label || 'Dashboard'}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {currentVenueName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
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
