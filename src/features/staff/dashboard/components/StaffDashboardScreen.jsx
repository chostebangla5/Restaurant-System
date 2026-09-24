import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/formatCurrency';
import { useAuth } from '@/features/shared/auth';
import {
  getDashboardStats,
  subscribeToOrders,
  updateOrderStatus,
} from '@/features/shared/orders/api/ordersApi';
import toast from 'react-hot-toast';
import {
  Coins,
  ShoppingBag,
  Grid,
  Flame,
  TrendingUp,
  Clock,
  ChevronRight,
  Users,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import {
  fetchStaffMembers,
  toggleStaffActive,
} from '@/features/staff/team/api/teamApi';

const ROLE_THEMES = {
  owner: {
    label: 'Owner',
    badgeVariant: 'warning',
    border: 'border-l-[#C6FF3D]',
    avatarBg: 'bg-white/[0.06] text-[#C6FF3D] border border-[#C6FF3D]/30',
  },
  manager: {
    label: 'Manager',
    badgeVariant: 'primary',
    border: 'border-l-sky-400',
    avatarBg: 'bg-white/[0.06] text-sky-400 border border-sky-400/30',
  },
  kitchen: {
    label: 'Kitchen',
    badgeVariant: 'danger',
    border: 'border-l-amber-400',
    avatarBg: 'bg-white/[0.06] text-amber-400 border border-amber-400/30',
  },
  waiter: {
    label: 'Waiter',
    badgeVariant: 'success',
    border: 'border-l-emerald-400',
    avatarBg: 'bg-white/[0.06] text-emerald-400 border border-emerald-400/30',
  },
};

export function StaffDashboardScreen() {
  const { venueId, venue } = useAuth();
  const [stats, setStats] = useState({
    todayGrossSales: 0,
    activeOrdersCount: 0,
    occupiedTablesCount: 0,
    totalTablesCount: 6,
    avgKitchenTurnaround: '--',
    turnaroundTrend: 'Live speed metric',
    recentOrders: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats(venueId);
      setStats(data);
    } catch (err) {
      console.warn('Failed to load dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      setLoadingStaff(true);
      const members = await fetchStaffMembers(venueId);
      setStaffList(members || []);
    } catch (err) {
      console.warn('Failed to load staff list:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadStaff();
    const unsubscribe = subscribeToOrders(() => {
      loadStats();
    });
    return () => unsubscribe();
  }, [venueId]);

  const handleToggleDuty = async (staffId, currentStatus) => {
    try {
      const updated = !currentStatus;
      await toggleStaffActive(staffId, updated);
      setStaffList((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, is_active: updated } : s))
      );
      toast.success(updated ? 'Staff marked On Duty' : 'Staff marked Off Duty');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleAdvanceStatus = async (orderId, currentStatus) => {
    const nextStatusMap = {
      placed: 'cooking',
      acknowledged: 'cooking',
      cooking: 'ready',
      ready: 'served',
    };
    const next = nextStatusMap[currentStatus] || 'served';
    await updateOrderStatus(orderId, next);
    toast.success(`Order status updated to ${next.toUpperCase()}`);
    loadStats();
  };

  const statCards = [
    {
      title: "Today's Gross Sales",
      value: formatCurrency(stats.todayGrossSales),
      trend: 'Real-time billing total',
      icon: Coins,
      color: 'text-[#C6FF3D] bg-[#C6FF3D]/10 border border-[#C6FF3D]/25',
    },
    {
      title: 'Active Orders',
      value: String(stats.activeOrdersCount),
      trend: `${stats.activeOrdersCount} in Kitchen queue`,
      icon: Flame,
      color: 'text-amber-400 bg-amber-400/10 border border-amber-400/25',
    },
    {
      title: 'Occupied Tables',
      value: `${stats.occupiedTablesCount} / ${stats.totalTablesCount}`,
      trend: `${Math.round((stats.occupiedTablesCount / stats.totalTablesCount) * 100) || 0}% Dining Capacity`,
      icon: Grid,
      color: 'text-sky-400 bg-sky-400/10 border border-sky-400/25',
    },
    {
      title: 'Avg. Kitchen Turnaround',
      value: stats.avgKitchenTurnaround || '--',
      trend: stats.turnaroundTrend || 'Live speed metric',
      icon: ShoppingBag,
      color: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/25',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[#0E1016] p-6 sm:p-8 rounded-card border border-white/[0.08] relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C6FF3D] animate-pulse" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#8A8F9C]">
              {venue?.name || 'TableSuite Dining Venue'} &bull; Operational
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-[#F4F5F7]">
            Real-Time Floor & Kitchen Operations
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8F9C] max-w-xl leading-relaxed">
            Live orders stream from guest QR codes instantly. Kitchen updates reflect directly on guests' screens.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <Link to="/staff/kitchen">
            <Button size="sm" variant="outline" className="border-white/[0.12] text-[#F4F5F7] hover:border-white/[0.25] hover:bg-white/[0.04]">
              Open KDS Display
            </Button>
          </Link>
          <Link to="/staff/live-orders">
            <Button size="sm" className="bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">
              Live Orders Feed
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-card bg-[#0E1016] border border-white/[0.08] space-y-3 hover:border-white/[0.18] hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#8A8F9C]">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-xl ${stat.color}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-heading font-extrabold text-[#F4F5F7] tracking-tight">
                  {stat.value}
                </h3>
                <p className="text-xs text-[#8A8F9C] flex items-center gap-1.5 mt-1 font-sans">
                  <TrendingUp className="h-3 w-3 text-[#C6FF3D] shrink-0" strokeWidth={1.5} />
                  {stat.trend}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Staff & Shift Panel */}
      <div className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#C6FF3D] flex items-center justify-center">
              <Users className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm sm:text-base font-heading font-bold text-[#F4F5F7]">
                  Floor & Kitchen Crew
                </h2>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] bg-[#C6FF3D]/10 text-[#C6FF3D] border border-[#C6FF3D]/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C6FF3D] animate-pulse" />
                  {staffList.filter((s) => s.is_active).length} On Duty
                </span>
              </div>
              <p className="text-xs text-[#8A8F9C] mt-0.5">
                PetPooja-style live staff status, active shift coverage, and today's performance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/staff/team">
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-medium gap-1.5 border-white/[0.12] text-[#F4F5F7] hover:border-white/[0.25]"
              >
                Manage Staff
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Role Breakdown Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-[#141721] border border-white/[0.08] text-xs font-mono text-[#8A8F9C] flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C6FF3D]" />
            Waiters: <strong className="text-[#F4F5F7] font-semibold">{staffList.filter((s) => s.role === 'waiter').length}</strong>
          </div>
          <div className="px-3 py-1 rounded-full bg-[#141721] border border-white/[0.08] text-xs font-mono text-[#8A8F9C] flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Kitchen: <strong className="text-[#F4F5F7] font-semibold">{staffList.filter((s) => s.role === 'kitchen').length}</strong>
          </div>
          <div className="px-3 py-1 rounded-full bg-[#141721] border border-white/[0.08] text-xs font-mono text-[#8A8F9C] flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Management: <strong className="text-[#F4F5F7] font-semibold">{staffList.filter((s) => s.role === 'manager' || s.role === 'owner').length}</strong>
          </div>
        </div>

        {/* Staff Cards Row */}
        {loadingStaff ? (
          <div className="py-8 text-center text-xs font-mono text-[#8A8F9C]">Loading crew status...</div>
        ) : staffList.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8A8F9C]">
            No staff members found.{' '}
            <Link to="/staff/team" className="text-[#C6FF3D] font-medium hover:underline">
              Add team members
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {staffList.map((member) => {
              const theme = ROLE_THEMES[member.role] || ROLE_THEMES.waiter;
              return (
                <div
                  key={member.id}
                  className={`p-3.5 rounded-card bg-[#141721] border border-white/[0.08] border-l-2 ${theme.border} transition-all hover:border-white/[0.2] flex flex-col justify-between gap-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-mono font-medium text-xs ${theme.avatarBg}`}>
                          {member.avatar_initials || member.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#141721] ${
                            member.is_active ? 'bg-[#C6FF3D]' : 'bg-[#8A8F9C]'
                          }`}
                          title={member.is_active ? 'On Duty' : 'Off Duty'}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-[#F4F5F7] truncate">
                          {member.full_name}
                        </h4>
                        <span className="text-[10px] font-mono text-[#8A8F9C] capitalize">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    <Badge variant={theme.badgeVariant} size="sm">
                      {theme.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px]">
                    <span className="text-[#8A8F9C] font-mono text-[10px]">
                      {member.orders_handled_today || 0} orders today
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleDuty(member.id, member.is_active)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors border ${
                        member.is_active
                          ? 'bg-[#C6FF3D]/10 text-[#C6FF3D] border-[#C6FF3D]/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30'
                          : 'bg-white/[0.04] text-[#8A8F9C] border-white/[0.08] hover:bg-[#C6FF3D]/10 hover:text-[#C6FF3D] hover:border-[#C6FF3D]/30'
                      }`}
                      title="Click to toggle Shift / Duty"
                    >
                      {member.is_active ? '● On Duty' : '○ Off Duty'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Recent Orders Section */}
      <div className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#C6FF3D] animate-pulse" />
            <h2 className="text-sm sm:text-base font-heading font-bold text-[#F4F5F7]">
              Live Incoming Orders Queue
            </h2>
          </div>
          <Link
            to="/staff/live-orders"
            className="text-xs font-mono text-[#C6FF3D] hover:underline flex items-center gap-1"
          >
            View all stream <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-[#8A8F9C]">
            No orders in the system yet.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {stats.recentOrders.map((order) => {
              const itemsSummary = (order.items || [])
                .map((it) => `${it.qty}x ${it.name}`)
                .join(', ');

              return (
                <div
                  key={order.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-9 w-9 rounded-full bg-[#141721] border border-white/[0.08] text-[#C6FF3D] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      T-{order.table_number}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#F4F5F7]">
                          Round #{order.round_number} &bull; <span className="text-[#8A8F9C]">{order.id}</span>
                        </span>
                        <Badge
                          variant={
                            order.status === 'cooking'
                              ? 'warning'
                              : order.status === 'ready'
                              ? 'primary'
                              : order.status === 'served'
                              ? 'success'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {order.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#8A8F9C] truncate mt-0.5 max-w-md">
                        {itemsSummary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-[#F4F5F7]">
                        {formatCurrency(order.total)}
                      </div>
                      <span className="text-[10px] font-mono text-[#8A8F9C]">
                        {order.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                      </span>
                    </div>

                    {order.status !== 'served' && order.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdvanceStatus(order.id, order.status)}
                        className="h-8 text-xs border-white/[0.12] text-[#F4F5F7] hover:border-[#C6FF3D] hover:text-[#C6FF3D]"
                      >
                        {order.status === 'placed'
                          ? 'Start Cooking'
                          : order.status === 'cooking'
                          ? 'Mark Ready'
                          : 'Mark Served'}
                      </Button>
                    )}
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
