import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/shared/auth';
import { clockIn, clockOut, getTodayAttendance } from '@/features/staff/attendance/api/attendanceApi';
import { fetchActiveStaffCalls, acknowledgeStaffCall, resolveStaffCall, subscribeToStaffCalls } from '@/features/staff/service-calls/api/staffCallsApi';
import { getDashboardStats, subscribeToOrders } from '@/features/shared/orders/api/ordersApi';
import { playOrderAlertSound } from '@/features/shared/orders/api/ordersApi';
import { formatCurrency } from '@/utils/formatCurrency';
import toast from 'react-hot-toast';
import {
  Clock,
  LogIn,
  LogOut as LogOutIcon,
  Bell,
  Activity,
  Flame,
  ChevronRight,
  CheckCircle2,
  Timer,
  Droplets,
  Utensils,
  Receipt,
  HelpCircle,
  Sparkles,
  Check,
  CheckCheck,
  ShoppingBag,
  Grid,
  TrendingUp,
  User,
} from 'lucide-react';

const ROLE_COLORS = {
  owner: { accent: '#C6FF3D', bg: '#C6FF3D15', border: '#C6FF3D40' },
  manager: { accent: '#38BDF8', bg: '#38BDF815', border: '#38BDF840' },
  kitchen: { accent: '#FBBF24', bg: '#FBBF2415', border: '#FBBF2440' },
  waiter: { accent: '#34D399', bg: '#34D39915', border: '#34D39940' },
};

const REASON_ICONS = {
  'Drinking Water': Droplets,
  'Cutlery & Napkins': Utensils,
  'Request Bill': Receipt,
  'Server Assistance': HelpCircle,
  'Clean Table': Sparkles,
};

function getElapsed(timestamp) {
  const diff = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function formatDuration(minutes) {
  if (!minutes) return '--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function StaffMyPortalScreen() {
  const { venueId, orgId, staffProfile, role, venue } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [isClocking, setIsClocking] = useState(false);
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({
    activeOrdersCount: 0,
    occupiedTablesCount: 0,
    totalTablesCount: 0,
    todayOrdersCount: 0,
    todayGrossSales: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const theme = ROLE_COLORS[role] || ROLE_COLORS.waiter;
  const staffId = staffProfile?.id;

  // Load today's attendance
  const loadAttendance = useCallback(async () => {
    if (!staffId) return;
    try {
      const data = await getTodayAttendance(staffId);
      setAttendance(data);
    } catch (err) {
      console.warn('Failed to load attendance:', err);
    }
  }, [staffId]);

  // Load active service calls
  const loadCalls = useCallback(async () => {
    try {
      const data = await fetchActiveStaffCalls(venueId);
      setCalls(data || []);
    } catch (err) {
      console.warn('Failed to load calls:', err);
    }
  }, [venueId]);

  // Load order stats
  const loadStats = useCallback(async () => {
    try {
      const data = await getDashboardStats(venueId);
      setStats(data);
    } catch (err) {
      console.warn('Failed to load stats:', err);
    }
  }, [venueId]);

  useEffect(() => {
    Promise.all([loadAttendance(), loadCalls(), loadStats()]).finally(() =>
      setIsLoading(false)
    );

    const unsubOrders = subscribeToOrders(() => loadStats());
    const unsubCalls = subscribeToStaffCalls(venueId, (payload) => {
      loadCalls();
      if (payload?.eventType === 'INSERT') {
        playOrderAlertSound();
      }
    });

    // Update clock every minute
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 60000);

    return () => {
      unsubOrders();
      unsubCalls();
      clearInterval(clockInterval);
    };
  }, [venueId, staffId]);

  // Clock in/out handlers
  const handleClockIn = async () => {
    if (!staffId) return;
    setIsClocking(true);
    try {
      await clockIn(staffId, venueId, orgId);
      await loadAttendance();
      toast.success('Clocked in! Have a great shift 🎉');
    } catch (err) {
      toast.error(err.message || 'Failed to clock in');
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!staffId) return;
    setIsClocking(true);
    try {
      await clockOut(staffId);
      await loadAttendance();
      toast.success('Clocked out! Great work today 👏');
    } catch (err) {
      toast.error(err.message || 'Failed to clock out');
    } finally {
      setIsClocking(false);
    }
  };

  const handleAcknowledgeCall = async (callId) => {
    try {
      await acknowledgeStaffCall(callId);
      setCalls((prev) =>
        prev.map((c) => (c.id === callId ? { ...c, status: 'acknowledged' } : c))
      );
      toast.success('On the way!');
    } catch (err) {
      toast.error('Failed to acknowledge');
    }
  };

  const handleResolveCall = async (callId) => {
    try {
      await resolveStaffCall(callId, staffId);
      setCalls((prev) => prev.filter((c) => c.id !== callId));
      toast.success('Call resolved ✓');
    } catch (err) {
      toast.error('Failed to resolve');
    }
  };

  const isClockedIn = attendance && !attendance.clock_out;
  const pendingCalls = calls.filter((c) => c.status === 'pending');

  // Calculate live shift duration
  let shiftDuration = '--';
  if (isClockedIn && attendance?.clock_in) {
    const mins = Math.floor((currentTime - new Date(attendance.clock_in)) / 60000);
    shiftDuration = formatDuration(mins);
  }

  const greeting = (() => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-card bg-[#0E1016] border border-white/[0.08] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5" style={{ background: theme.accent, filter: 'blur(60px)' }} />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: theme.accent }} />
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#8A8F9C]">
              {venue?.name || 'TableSuite'} • {greeting}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-[#F4F5F7]">
            Welcome back, {staffProfile?.full_name?.split(' ')[0] || 'Team Member'}!
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8F9C] max-w-xl leading-relaxed">
            {role === 'kitchen'
              ? 'Check kitchen orders and manage your station. Service calls from guests appear here.'
              : role === 'waiter'
              ? 'View live orders, respond to guest calls, and track your shift hours.'
              : 'Your staff dashboard with shift tracking, orders, and service calls.'}
          </p>
        </div>
      </div>

      {/* Clock In/Out + Shift Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Attendance Card */}
        <div className="p-5 rounded-card bg-[#0E1016] border border-white/[0.08] space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
              <Clock className="h-4 w-4" style={{ color: theme.accent }} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-[#F4F5F7]">Today's Shift</h3>
              <p className="text-[10px] font-mono text-[#8A8F9C]">
                {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>

          {/* Status Row */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${isClockedIn ? 'animate-pulse' : ''}`}
                  style={{ background: isClockedIn ? '#34D399' : '#8A8F9C' }}
                />
                <span className="text-xs font-semibold text-[#F4F5F7]">
                  {isClockedIn ? 'On Shift' : attendance?.clock_out ? 'Shift Completed' : 'Not Clocked In'}
                </span>
              </div>
              {isClockedIn && (
                <p className="text-[10px] font-mono text-[#8A8F9C] pl-4.5">
                  Started at {new Date(attendance.clock_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {attendance?.clock_out && (
                <p className="text-[10px] font-mono text-[#8A8F9C] pl-4.5">
                  Worked: {formatDuration(attendance.duration_minutes)}
                </p>
              )}
            </div>

            {/* Duration Badge */}
            {isClockedIn && (
              <div className="text-right">
                <div className="text-xl font-heading font-extrabold tracking-tight" style={{ color: theme.accent }}>
                  {shiftDuration}
                </div>
                <p className="text-[10px] font-mono text-[#8A8F9C]">shift duration</p>
              </div>
            )}
          </div>

          {/* Clock In/Out Button */}
          <button
            type="button"
            onClick={isClockedIn ? handleClockOut : handleClockIn}
            disabled={isClocking}
            className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              isClockedIn
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 active:scale-[0.98]'
                : 'text-[#07080B] font-semibold active:scale-[0.98]'
            }`}
            style={!isClockedIn ? { background: theme.accent } : undefined}
          >
            {isClocking ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : isClockedIn ? (
              <>
                <LogOutIcon className="h-4 w-4" strokeWidth={2} />
                Clock Out
              </>
            ) : attendance?.clock_out ? (
              <>
                <LogIn className="h-4 w-4" strokeWidth={2} />
                Clock In for Next Shift
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" strokeWidth={2} />
                Clock In
              </>
            )}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/staff/orders" className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08] hover:border-white/[0.18] hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C]">Active Orders</span>
              <Activity className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
            </div>
            <div className="text-xl font-heading font-extrabold text-[#F4F5F7]">{stats.activeOrdersCount}</div>
            <p className="text-[10px] font-mono mt-1" style={{ color: theme.accent }}>View live →</p>
          </Link>

          <Link to="/staff/kitchen" className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08] hover:border-white/[0.18] hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C]">Tables</span>
              <Grid className="h-3.5 w-3.5 text-sky-400" strokeWidth={1.5} />
            </div>
            <div className="text-xl font-heading font-extrabold text-[#F4F5F7]">
              {stats.occupiedTablesCount}/{stats.totalTablesCount}
            </div>
            <p className="text-[10px] font-mono text-[#8A8F9C] mt-1">occupied</p>
          </Link>

          <Link to="/staff/calls" className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08] hover:border-white/[0.18] hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C]">Calls</span>
              {pendingCalls.length > 0 && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />}
              <Bell className="h-3.5 w-3.5 text-rose-400" strokeWidth={1.5} />
            </div>
            <div className="text-xl font-heading font-extrabold text-[#F4F5F7]">{pendingCalls.length}</div>
            <p className="text-[10px] font-mono text-rose-400 mt-1">{pendingCalls.length > 0 ? 'needs attention' : 'all clear'}</p>
          </Link>

          <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C]">Today Sales</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div className="text-xl font-heading font-extrabold text-[#F4F5F7]">
              {formatCurrency(stats.todayGrossSales || 0)}
            </div>
            <p className="text-[10px] font-mono text-[#8A8F9C] mt-1">{stats.todayOrdersCount || 0} orders</p>
          </div>
        </div>
      </div>

      {/* Live Service Calls */}
      <div className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            {pendingCalls.length > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            )}
            <Bell className="h-4 w-4 text-rose-400" strokeWidth={1.5} />
            <h2 className="text-sm font-heading font-bold text-[#F4F5F7]">
              Guest Service Calls
            </h2>
          </div>
          <Link to="/staff/calls" className="text-xs font-mono hover:underline flex items-center gap-1" style={{ color: theme.accent }}>
            View all <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        </div>

        {calls.length === 0 ? (
          <div className="py-8 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
              <Bell className="h-5 w-5 text-[#8A8F9C]" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-[#8A8F9C]">No active service calls</p>
            <p className="text-[10px] text-[#8A8F9C]/60 mt-1">Guest requests will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {calls.slice(0, 5).map((call) => {
              const ReasonIcon = REASON_ICONS[call.reason] || HelpCircle;
              const isPending = call.status === 'pending';

              return (
                <div
                  key={call.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isPending
                      ? 'bg-rose-500/[0.06] border-rose-500/20'
                      : 'bg-amber-500/[0.04] border-amber-500/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
                          isPending
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        T-{call.table_number}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <ReasonIcon className="h-3.5 w-3.5 text-[#F4F5F7]" strokeWidth={1.75} />
                          <span className="text-xs font-semibold text-[#F4F5F7]">{call.reason}</span>
                          <Badge variant={isPending ? 'danger' : 'warning'} size="sm">
                            {isPending ? 'NEW' : 'ON IT'}
                          </Badge>
                        </div>
                        <span className="text-[10px] font-mono text-[#8A8F9C] mt-0.5 block">
                          {getElapsed(call.created_at)}
                          {call.notes && ` • "${call.notes}"`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPending && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledgeCall(call.id)}
                          className="h-8 text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          <Check className="h-3 w-3 mr-1" strokeWidth={2} />
                          On it
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveCall(call.id)}
                        className="h-8 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <CheckCheck className="h-3 w-3 mr-1" strokeWidth={2} />
                        Done
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
