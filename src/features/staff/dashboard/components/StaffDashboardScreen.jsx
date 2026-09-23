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
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  CheckBadgeIcon,
  ClockIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  UsersIcon,
  UserPlusIcon,
  PhoneIcon,
  CheckCircleIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import {
  fetchStaffMembers,
  toggleStaffActive,
} from '@/features/staff/team/api/teamApi';

const ROLE_THEMES = {
  owner: {
    label: 'Owner',
    badgeVariant: 'warning',
    border: 'border-l-amber-500',
    avatarBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
  manager: {
    label: 'Manager',
    badgeVariant: 'primary',
    border: 'border-l-blue-500',
    avatarBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  },
  kitchen: {
    label: 'Kitchen',
    badgeVariant: 'danger',
    border: 'border-l-rose-500',
    avatarBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  },
  waiter: {
    label: 'Waiter',
    badgeVariant: 'success',
    border: 'border-l-emerald-500',
    avatarBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
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
      icon: CurrencyRupeeIcon,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      title: 'Active Orders',
      value: String(stats.activeOrdersCount),
      trend: `${stats.activeOrdersCount} in Kitchen queue`,
      icon: FireIcon,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      title: 'Occupied Tables',
      value: `${stats.occupiedTablesCount} / ${stats.totalTablesCount}`,
      trend: `${Math.round((stats.occupiedTablesCount / stats.totalTablesCount) * 100) || 0}% Dining Capacity`,
      icon: TableCellsIcon,
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      title: 'Avg. Kitchen Turnaround',
      value: stats.avgKitchenTurnaround || '--',
      trend: stats.turnaroundTrend || 'Live speed metric',
      icon: ShoppingBagIcon,
      color: 'text-purple-500 bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 to-stone-800 p-6 rounded-3xl border border-stone-800 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              {venue?.name || 'TableSuite Dining Venue'} &bull; Operational
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black">Real-Time Floor & Kitchen Operations</h1>
          <p className="text-xs text-stone-400 mt-1 max-w-lg">
            Live orders stream from guest QR codes instantly. Kitchen updates reflect directly on guests' screens.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/staff/kitchen">
            <Button size="sm" variant="outline" className="border-stone-700 text-stone-200 hover:bg-stone-800">
              Open KDS Display
            </Button>
          </Link>
          <Link to="/staff/live-orders">
            <Button size="sm" className="bg-brand-primary font-bold shadow-md shadow-brand-primary/25">
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
              className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                  {stat.title}
                </span>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                  {stat.value}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-1 font-medium">
                  <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {stat.trend}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* PetPooja-Style Dynamic Staff & Shift Panel */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <UsersIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-stone-900 dark:text-white">
                  Floor & Kitchen Crew
                </h2>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {staffList.filter((s) => s.is_active).length} On Duty
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                PetPooja-style live staff status, active shift coverage, and today's performance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/staff/team">
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-bold gap-1 border-stone-300 dark:border-stone-700 hover:border-brand-primary hover:text-brand-primary"
              >
                Manage Staff
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Role Breakdown Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Waiters: <strong className="text-stone-900 dark:text-white">{staffList.filter((s) => s.role === 'waiter').length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Kitchen: <strong className="text-stone-900 dark:text-white">{staffList.filter((s) => s.role === 'kitchen').length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Management: <strong className="text-stone-900 dark:text-white">{staffList.filter((s) => s.role === 'manager' || s.role === 'owner').length}</strong>
          </div>
        </div>

        {/* Staff Cards Row */}
        {loadingStaff ? (
          <div className="py-8 text-center text-xs text-stone-400">Loading crew status...</div>
        ) : staffList.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500">
            No staff members found.{' '}
            <Link to="/staff/team" className="text-brand-primary font-bold hover:underline">
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
                  className={`p-3.5 rounded-2xl bg-stone-50/70 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/70 border-l-4 ${theme.border} transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600 flex flex-col justify-between gap-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs ${theme.avatarBg}`}>
                          {member.avatar_initials || member.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-stone-800 ${
                            member.is_active ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'
                          }`}
                          title={member.is_active ? 'On Duty' : 'Off Duty'}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate">
                          {member.full_name}
                        </h4>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 capitalize">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    <Badge variant={theme.badgeVariant} size="sm">
                      {theme.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200/50 dark:border-stone-700/50 text-[11px]">
                    <span className="text-stone-500 dark:text-stone-400 font-medium">
                      {member.orders_handled_today || 0} orders today
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleDuty(member.id, member.is_active)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                        member.is_active
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-rose-100 hover:text-rose-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300'
                          : 'bg-stone-200 text-stone-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-stone-700 dark:text-stone-300'
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
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-3 w-3 rounded-full bg-brand-primary animate-ping" />
            <h2 className="text-base font-bold text-stone-900 dark:text-white">
              Live Incoming Orders Queue
            </h2>
          </div>
          <Link
            to="/staff/live-orders"
            className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
          >
            View all stream <ChevronRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-stone-500">
            No orders in the system yet.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {stats.recentOrders.map((order) => {
              const itemsSummary = (order.items || [])
                .map((it) => `${it.qty}x ${it.name}`)
                .join(', ');

              return (
                <div
                  key={order.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/80 dark:hover:bg-stone-800/40 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-10 w-10 rounded-xl bg-brand-primary text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-brand-primary/20">
                      T-{order.table_number}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-stone-900 dark:text-white">
                          Round #{order.round_number} &bull; {order.id}
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
                      <p className="text-xs text-stone-600 dark:text-stone-300 truncate mt-0.5 max-w-md">
                        {itemsSummary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-black text-stone-900 dark:text-white">
                        {formatCurrency(order.total)}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {order.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                      </span>
                    </div>

                    {order.status !== 'served' && order.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdvanceStatus(order.id, order.status)}
                        className="h-8 text-xs font-bold border-stone-300 hover:border-brand-primary hover:text-brand-primary"
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
