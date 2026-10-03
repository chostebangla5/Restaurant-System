import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/features/shared/auth';
import { AnimatedOutlet } from '@/components/animation/AnimatedOutlet';
import {
  LayoutDashboard,
  Flame,
  Activity,
  Bell,
  ClipboardCheck,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export function StaffPortalLayout() {
  const {
    user,
    staffProfile,
    role,
    venue,
    signOut,
  } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const pageMetadata = {
      '/staff': { title: 'My Portal | TableSuite Staff', desc: 'Your personal staff dashboard with shift status, service calls, and attendance.' },
      '/staff/orders': { title: 'Live Orders | TableSuite Staff', desc: 'Monitor active table orders and kitchen status.' },
      '/staff/kitchen': { title: 'Kitchen View | TableSuite Staff', desc: 'Kitchen Display System for order tracking.' },
      '/staff/calls': { title: 'Service Calls | TableSuite Staff', desc: 'Guest service requests and assistance calls.' },
      '/staff/attendance': { title: 'My Attendance | TableSuite Staff', desc: 'Your clock-in/out history and shift records.' },
    };

    const current = pageMetadata[location.pathname] || {
      title: 'Staff Portal | TableSuite',
      desc: 'TableSuite staff operations portal.',
    };
    document.title = current.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', current.desc);
    }
  }, [location.pathname]);

  // Role-based nav items — all staff see portal + calls + attendance
  const navItems = [
    { label: 'My Portal', path: '/staff', icon: LayoutDashboard, end: true },
    { label: 'Live Orders', path: '/staff/orders', icon: Activity, badge: 'Live' },
    { label: 'Kitchen View', path: '/staff/kitchen', icon: Flame },
    { label: 'Service Calls', path: '/staff/calls', icon: Bell },
    { label: 'My Attendance', path: '/staff/attendance', icon: ClipboardCheck },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const currentVenueName = venue?.name || staffProfile?.venues?.name || 'My Venue';

  const ROLE_COLORS = {
    owner: '#C6FF3D',
    manager: '#38BDF8',
    kitchen: '#FBBF24',
    waiter: '#34D399',
  };
  const roleColor = ROLE_COLORS[role] || '#C6FF3D';

  return (
    <div className="min-h-screen bg-[#07080B] text-[#F4F5F7] flex flex-col md:flex-row selection:bg-[#C6FF3D] selection:text-[#07080B]">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-[#0E1016] border-b border-white/[0.08] safe-top sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-full bg-[#141721] border flex items-center justify-center font-mono font-bold text-xs tracking-wider"
            style={{ borderColor: `${roleColor}50`, color: roleColor }}
          >
            {(staffProfile?.full_name || 'ST').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-heading font-bold text-sm tracking-tight text-[#F4F5F7] block leading-tight">
              {staffProfile?.full_name || 'Staff'}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider capitalize" style={{ color: roleColor }}>
              {role || 'Staff'}
            </span>
          </div>
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
          'fixed inset-y-0 left-0 z-40 w-60 bg-[#0E1016] border-r border-white/[0.08] flex flex-col transition-transform duration-200 md:static md:translate-x-0',
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Profile Header */}
        <div className="p-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full bg-[#141721] border flex items-center justify-center font-mono font-bold text-sm tracking-wider shadow-sm"
              style={{ borderColor: `${roleColor}50`, color: roleColor }}
            >
              {(staffProfile?.full_name || 'ST').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading font-bold text-sm tracking-tight text-[#F4F5F7] truncate">
                {staffProfile?.full_name || user?.email?.split('@')[0] || 'Staff Member'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
                  style={{ color: roleColor, borderColor: `${roleColor}40`, background: `${roleColor}15` }}
                >
                  {role || 'Staff'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 px-1">
            <p className="text-[10px] font-mono text-[#8A8F9C] uppercase tracking-wider">Venue</p>
            <p className="text-xs text-[#F4F5F7] font-medium truncate mt-0.5">{currentVenueName}</p>
          </div>
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
                      <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: roleColor }} />
                    )}
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? '' : 'text-[#8A8F9C] group-hover:text-[#F4F5F7]')}
                        style={isActive ? { color: roleColor } : undefined}
                        strokeWidth={1.5}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className="text-[9px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border"
                        style={{ background: `${roleColor}15`, color: roleColor, borderColor: `${roleColor}40` }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-1.5 rounded-full text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.05] transition-colors"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />}
            </button>
          </div>

          {(role === 'owner' || role === 'manager') && (
            <Link
              to="/admin"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-[#07080B] bg-[#C6FF3D] hover:bg-[#b5f02e] rounded-xl transition-all shadow-sm"
            >
              <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Admin Dashboard</span>
            </Link>
          )}

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
              )?.label || 'My Portal'}
            </span>
            <p className="text-xs text-[#8A8F9C]">
              {currentVenueName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {(role === 'owner' || role === 'manager') && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#C6FF3D] bg-[#C6FF3D]/10 hover:bg-[#C6FF3D]/20 border border-[#C6FF3D]/30 transition-colors"
                title="Go to Admin Dashboard"
              >
                <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Admin Dashboard</span>
              </Link>
            )}

            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border"
              style={{ background: `${roleColor}15`, color: roleColor, borderColor: `${roleColor}40` }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: roleColor }}></span>
              Staff Portal • {(role || 'staff').charAt(0).toUpperCase() + (role || 'staff').slice(1)}
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
