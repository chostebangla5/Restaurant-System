import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { fetchStaffMonthlyAttendance, adminClockOutStaff } from '@/features/staff/attendance/api/attendanceApi';
import {
  X,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Timer,
  Download,
  Mail,
  Phone,
  Crown,
  Shield,
  ChefHat,
  ConciergeBell,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_ICONS = {
  owner: Crown,
  manager: Shield,
  kitchen: ChefHat,
  waiter: ConciergeBell,
};

const ROLE_COLORS = {
  owner: { accent: '#C6FF3D', bg: 'bg-[#C6FF3D]/10', text: 'text-[#C6FF3D]', border: 'border-[#C6FF3D]/30' },
  manager: { accent: '#38BDF8', bg: 'bg-sky-400/10', text: 'text-sky-400', border: 'border-sky-400/30' },
  kitchen: { accent: '#FBBF24', bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/30' },
  waiter: { accent: '#34D399', bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/30' },
};

function formatTime(timestamp) {
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m > 0 ? `${m}m` : ''}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function StaffProfileModal({ isOpen, onClose, staffMember, onToggleActive, venueName }) {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1); // 1-12
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'table'
  const [monthlyData, setMonthlyData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  const staffId = staffMember?.id;
  const role = staffMember?.role || 'waiter';
  const roleTheme = ROLE_COLORS[role] || ROLE_COLORS.waiter;
  const RoleIcon = ROLE_ICONS[role] || ConciergeBell;

  const loadMonthlyAttendance = useCallback(async () => {
    if (!staffId) return;
    setIsLoading(true);
    try {
      const data = await fetchStaffMonthlyAttendance(staffId, currentYear, currentMonth);
      setMonthlyData(data);
    } catch (err) {
      console.warn('Failed to load monthly attendance:', err);
      toast.error('Could not load monthly attendance');
    } finally {
      setIsLoading(false);
    }
  }, [staffId, currentYear, currentMonth]);

  useEffect(() => {
    if (isOpen && staffId) {
      loadMonthlyAttendance();
    }
  }, [isOpen, staffId, loadMonthlyAttendance]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  const handleExportCsv = () => {
    if (!monthlyData?.days?.length) {
      toast.error('No attendance records to export');
      return;
    }

    const headers = ['Date', 'Day', 'Status', 'Clock In', 'Clock Out', 'Duration (Minutes)', 'Working Hours', 'Delay (Minutes)'];
    const rows = monthlyData.days.map((d) => [
      d.dateStr,
      d.dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      d.status === 'on_time' ? 'In Time' : d.status === 'delayed' ? 'Delayed' : d.status === 'absent' ? 'Absent' : d.status === 'day_off' ? 'Day Off' : 'Future',
      d.earliestClockIn ? formatTime(d.earliestClockIn) : '--',
      d.latestClockOut ? formatTime(d.latestClockOut) : '--',
      d.totalMinutes,
      d.workingHours,
      d.delayMinutes,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${staffMember.full_name.replace(/\s+/g, '_')}_Attendance_${MONTH_NAMES[currentMonth - 1]}_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Monthly attendance report downloaded!');
  };

  // Compute calendar blanks for first day of month (Monday start)
  const calendarDaysWithBlanks = useMemo(() => {
    if (!monthlyData?.days?.length) return [];
    const firstDayIndex = (new Date(currentYear, currentMonth - 1, 1).getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => ({ isBlank: true, id: `blank-${i}` }));
    return [...blanks, ...monthlyData.days];
  }, [monthlyData, currentYear, currentMonth]);

  if (!isOpen || !staffMember) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl rounded-2xl bg-[#0E1016] border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10">
        {/* Top Header / Profile Banner */}
        <div className="p-5 sm:p-6 border-b border-white/[0.08] bg-[#141721] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar */}
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center font-mono font-bold text-lg border-2 shadow-lg shrink-0"
              style={{
                borderColor: roleTheme.accent,
                background: `${roleTheme.accent}15`,
                color: roleTheme.accent,
              }}
            >
              {(staffMember.full_name || 'ST').slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-heading font-extrabold text-[#F4F5F7] truncate">
                  {staffMember.full_name}
                </h2>
                <Badge size="sm" className={`${roleTheme.bg} ${roleTheme.text} border ${roleTheme.border} uppercase font-mono tracking-wider font-bold`}>
                  <RoleIcon className="h-3 w-3 mr-1 inline" strokeWidth={2} />
                  {staffMember.role}
                </Badge>
                {staffMember.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    Inactive
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-[#8A8F9C] font-mono">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {staffMember.email}
                </span>
                {staffMember.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {staffMember.phone}
                  </span>
                )}
                {venueName && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/[0.04] text-[11px]">
                    {venueName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download className="h-3.5 w-3.5" strokeWidth={1.5} />}
              className="text-xs"
            >
              Export Report
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Month Selector & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#141721] border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#8A8F9C] hover:text-[#F4F5F7] transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>

              <div className="px-3 py-1 text-center min-w-[170px]">
                <h3 className="text-base font-heading font-bold text-[#F4F5F7]">
                  {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#8A8F9C] hover:text-[#F4F5F7] transition-colors"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={handleCurrentMonth}
                className="ml-2 px-2.5 py-1 text-xs font-mono font-medium rounded-lg text-accent hover:bg-accent/10 border border-accent/30 transition-colors"
              >
                This Month
              </button>
            </div>

            {/* View Mode Toggle & Shift Expectation Rule */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-[#8A8F9C] bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/[0.04]">
                <Info className="h-3 w-3 text-accent shrink-0" />
                <span>Expected: 10:00 AM (Grace: 10:15 AM)</span>
              </div>

              <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-accent text-[#07080B] font-bold shadow-sm'
                      : 'text-[#8A8F9C] hover:text-[#F4F5F7]'
                  }`}
                >
                  Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-accent text-[#07080B] font-bold shadow-sm'
                      : 'text-[#8A8F9C] hover:text-[#F4F5F7]'
                  }`}
                >
                  Log Table
                </button>
              </div>
            </div>
          </div>

          {/* Color Legend (Exact Match for In-Time, Delay, Absent, Working Hours) */}
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap px-1 text-xs font-medium">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8F9C]">Legend:</span>
            
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span className="text-emerald-500 dark:text-emerald-400 font-semibold">In Time (On Time)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
              <span className="text-amber-500 dark:text-amber-400 font-semibold">Delayed (Late Clock-In)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
              <span className="text-rose-500 dark:text-rose-400 font-semibold">Absent (No Shift)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-slate-400/50" />
              <span className="text-[#8A8F9C]">Day Off / Rest</span>
            </div>
          </div>

          {/* Monthly KPI Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* In Time Card */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 dark:text-emerald-400 font-bold">In Time</p>
              <div className="text-2xl font-heading font-extrabold text-emerald-500 dark:text-emerald-300">
                {monthlyData?.summary?.onTimeDays ?? 0} <span className="text-xs font-normal">days</span>
              </div>
              <p className="text-[10px] font-mono text-emerald-500/80">
                {monthlyData?.summary?.presentDays > 0
                  ? `${Math.round(((monthlyData?.summary?.onTimeDays || 0) / monthlyData.summary.presentDays) * 100)}% on time`
                  : '0%'}
              </p>
            </div>

            {/* Delayed Card */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-500 dark:text-amber-400 font-bold">Delayed</p>
              <div className="text-2xl font-heading font-extrabold text-amber-500 dark:text-amber-300">
                {monthlyData?.summary?.delayedDays ?? 0} <span className="text-xs font-normal">days</span>
              </div>
              <p className="text-[10px] font-mono text-amber-500/80">Late arrivals</p>
            </div>

            {/* Absent Card */}
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-center space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-wider text-rose-500 dark:text-rose-400 font-bold">Absent</p>
              <div className="text-2xl font-heading font-extrabold text-rose-500 dark:text-rose-300">
                {monthlyData?.summary?.absentDays ?? 0} <span className="text-xs font-normal">days</span>
              </div>
              <p className="text-[10px] font-mono text-rose-500/80">Missed shifts</p>
            </div>

            {/* Total Working Hours */}
            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-center space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">Total Hours</p>
              <div className="text-2xl font-heading font-extrabold text-sky-300">
                {monthlyData?.summary?.totalHours ?? '0.0'} <span className="text-xs font-normal">hrs</span>
              </div>
              <p className="text-[10px] font-mono text-sky-400/80">
                {formatDuration(monthlyData?.summary?.totalMinutesWorked || 0)}
              </p>
            </div>

            {/* Avg Daily Hours */}
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-center space-y-1 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Daily Avg</p>
              <div className="text-2xl font-heading font-extrabold text-purple-300">
                {monthlyData?.summary?.avgDailyHours ?? '0.0'} <span className="text-xs font-normal">hrs</span>
              </div>
              <p className="text-[10px] font-mono text-purple-400/80">Per active day</p>
            </div>
          </div>

          {/* Calendar View vs Table View */}
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-xs font-mono text-[#8A8F9C]">Loading monthly attendance records...</p>
            </div>
          ) : viewMode === 'calendar' ? (
            <div className="space-y-2">
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-2 text-center py-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => (
                  <div
                    key={dayName}
                    className={`text-[11px] font-mono uppercase tracking-wider font-bold ${
                      idx === 6 ? 'text-rose-400/80' : 'text-[#8A8F9C]'
                    }`}
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Monthly Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDaysWithBlanks.map((d, index) => {
                  if (d.isBlank) {
                    return (
                      <div
                        key={d.id}
                        className="min-h-[92px] rounded-xl border border-transparent bg-white/[0.01] opacity-30"
                      />
                    );
                  }

                  const isSelected = selectedDayDetail?.day === d.day;

                  // Determine box styling by status
                  let statusBg = 'bg-[#141721] border-white/[0.08]';
                  let badgeContent = null;
                  let hoursBadge = null;

                  if (d.status === 'on_time') {
                    // IN TIME -> Green
                    statusBg = 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60';
                    badgeContent = (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        In Time
                      </span>
                    );
                    hoursBadge = (
                      <div className="text-xs font-mono font-bold text-emerald-300">
                        {d.workingHours} hrs
                      </div>
                    );
                  } else if (d.status === 'delayed') {
                    // DELAYED -> Amber
                    statusBg = 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60';
                    badgeContent = (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Delayed
                      </span>
                    );
                    hoursBadge = (
                      <div className="text-xs font-mono font-bold text-amber-300">
                        {d.workingHours} hrs
                      </div>
                    );
                  } else if (d.status === 'absent') {
                    // ABSENT -> Red
                    statusBg = 'bg-rose-500/10 border-rose-500/25 hover:border-rose-500/50';
                    badgeContent = (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        Absent
                      </span>
                    );
                    hoursBadge = (
                      <div className="text-[11px] font-mono text-rose-400/80">
                        0.0 hrs
                      </div>
                    );
                  } else if (d.status === 'day_off') {
                    statusBg = 'bg-white/[0.02] border-white/[0.04] text-[#8A8F9C]';
                    badgeContent = (
                      <span className="text-[9px] font-mono text-[#8A8F9C]">Rest</span>
                    );
                  } else if (d.status === 'pending_today') {
                    statusBg = 'bg-sky-500/10 border-sky-500/30';
                    badgeContent = (
                      <span className="text-[9px] font-mono text-sky-400">Today</span>
                    );
                  } else {
                    // Future day
                    statusBg = 'bg-white/[0.015] border-white/[0.04] text-[#8A8F9C]/60';
                  }

                  return (
                    <div
                      key={d.dateStr}
                      onClick={() => setSelectedDayDetail(d)}
                      className={`min-h-[96px] p-2.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group relative ${statusBg} ${
                        isSelected ? 'ring-2 ring-accent scale-[1.02]' : ''
                      } ${d.isToday ? 'ring-1 ring-sky-400' : ''}`}
                    >
                      {/* Day number & status badge */}
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-mono font-bold ${d.isToday ? 'text-sky-400' : 'text-[#F4F5F7]'}`}>
                          {d.day}
                        </span>
                        {badgeContent}
                      </div>

                      {/* Working hours prominently displayed for every day */}
                      <div className="my-1">
                        {hoursBadge}
                        {d.earliestClockIn && (
                          <p className="text-[9px] font-mono text-[#8A8F9C] truncate">
                            {formatTime(d.earliestClockIn)}
                            {d.latestClockOut && ` - ${formatTime(d.latestClockOut)}`}
                          </p>
                        )}
                        {d.delayMinutes > 0 && (
                          <p className="text-[9px] font-mono text-amber-400">
                            +{d.delayMinutes}m late
                          </p>
                        )}
                      </div>

                      {/* Active indicator */}
                      {d.hasOpenShift && (
                        <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Active Now</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected Day Quick Inspector */}
              {selectedDayDetail && (
                <div className="mt-4 p-4 rounded-xl bg-[#141721] border border-white/[0.1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-heading font-bold text-[#F4F5F7]">
                        {new Date(selectedDayDetail.dateStr).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <Badge
                        size="sm"
                        variant={
                          selectedDayDetail.status === 'on_time'
                            ? 'success'
                            : selectedDayDetail.status === 'delayed'
                            ? 'warning'
                            : selectedDayDetail.status === 'absent'
                            ? 'destructive'
                            : 'neutral'
                        }
                      >
                        {selectedDayDetail.status === 'on_time'
                          ? 'In Time (On Time)'
                          : selectedDayDetail.status === 'delayed'
                          ? `Delayed (+${selectedDayDetail.delayMinutes} mins)`
                          : selectedDayDetail.status === 'absent'
                          ? 'Absent'
                          : selectedDayDetail.status === 'day_off'
                          ? 'Day Off'
                          : 'Upcoming'}
                      </Badge>
                    </div>

                    <p className="text-xs font-mono text-[#8A8F9C]">
                      Working Hours:{' '}
                      <span className="text-[#F4F5F7] font-semibold">{selectedDayDetail.workingHours} hrs</span>{' '}
                      ({formatDuration(selectedDayDetail.totalMinutes)})
                      {selectedDayDetail.earliestClockIn && (
                        <>
                          {' '}• First In: <span className="text-accent">{formatTime(selectedDayDetail.earliestClockIn)}</span>
                        </>
                      )}
                      {selectedDayDetail.latestClockOut && (
                        <>
                          {' '}• Out: <span className="text-[#F4F5F7]">{formatTime(selectedDayDetail.latestClockOut)}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDayDetail(null)}
                    className="text-xs font-mono text-[#8A8F9C] hover:text-[#F4F5F7] underline"
                  >
                    Close inspector
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-xl border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141721] text-[#8A8F9C] font-mono uppercase tracking-wider text-[10px] border-b border-white/[0.08]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Day</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Clock In</th>
                      <th className="px-4 py-3">Clock Out</th>
                      <th className="px-4 py-3">Working Hours</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {monthlyData?.days?.map((d) => {
                      const isPastOrToday = !d.isFuture;
                      return (
                        <tr
                          key={d.dateStr}
                          className={`hover:bg-white/[0.02] transition-colors ${
                            d.isToday ? 'bg-sky-500/5' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-medium text-[#F4F5F7]">
                            {d.dateStr}
                          </td>
                          <td className="px-4 py-3 text-[#8A8F9C]">
                            {d.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                          </td>
                          <td className="px-4 py-3">
                            {d.status === 'on_time' ? (
                              <Badge size="sm" variant="success">
                                In Time
                              </Badge>
                            ) : d.status === 'delayed' ? (
                              <Badge size="sm" variant="warning">
                                Delayed (+{d.delayMinutes}m)
                              </Badge>
                            ) : d.status === 'absent' ? (
                              <Badge size="sm" variant="destructive">
                                Absent
                              </Badge>
                            ) : d.status === 'day_off' ? (
                              <span className="text-[11px] font-mono text-[#8A8F9C]">Rest</span>
                            ) : (
                              <span className="text-[11px] font-mono text-[#8A8F9C]/60">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-[#F4F5F7]">
                            {d.earliestClockIn ? formatTime(d.earliestClockIn) : '--'}
                          </td>
                          <td className="px-4 py-3 font-mono text-[#F4F5F7]">
                            {d.latestClockOut ? (
                              formatTime(d.latestClockOut)
                            ) : d.hasOpenShift ? (
                              <span className="text-emerald-400 font-bold animate-pulse">On Shift</span>
                            ) : (
                              '--'
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">
                            {isPastOrToday ? (
                              <span
                                style={{
                                  color:
                                    d.status === 'on_time'
                                      ? '#34D399'
                                      : d.status === 'delayed'
                                      ? '#FBBF24'
                                      : d.status === 'absent'
                                      ? '#F87171'
                                      : '#8A8F9C',
                                }}
                              >
                                {d.workingHours} hrs
                              </span>
                            ) : (
                              <span className="text-[#8A8F9C]">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[#8A8F9C] truncate max-w-[150px]">
                            {d.records?.[0]?.notes || (d.status === 'delayed' ? 'Late arrival' : '--')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#141721] flex items-center justify-between">
          <div className="text-xs font-mono text-[#8A8F9C]">
            Profile ID: <span className="text-[#F4F5F7]">{staffMember.id?.slice(0, 8)}...</span>
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
