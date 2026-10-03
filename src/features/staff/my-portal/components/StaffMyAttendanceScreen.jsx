import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/shared/auth';
import {
  clockIn,
  clockOut,
  getTodayAttendance,
  fetchAttendanceHistory,
} from '@/features/staff/attendance/api/attendanceApi';
import toast from 'react-hot-toast';
import {
  ClipboardCheck,
  Clock,
  LogIn,
  LogOut as LogOutIcon,
  CheckCircle2,
  Calendar,
  Timer,
  CalendarDays,
} from 'lucide-react';
import { StaffProfileModal } from '@/features/staff/team/components/StaffProfileModal';

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
  return `${h}h ${m}m`;
}

const ROLE_COLORS = {
  owner: '#C6FF3D',
  manager: '#38BDF8',
  kitchen: '#FBBF24',
  waiter: '#34D399',
};

export function StaffMyAttendanceScreen() {
  const { venueId, orgId, staffProfile, role } = useAuth();
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [isClocking, setIsClocking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  const staffId = staffProfile?.id;
  const accent = ROLE_COLORS[role] || '#C6FF3D';

  const loadData = useCallback(async () => {
    if (!staffId) return;
    try {
      const [todayData, historyData] = await Promise.all([
        getTodayAttendance(staffId),
        fetchAttendanceHistory(venueId, { staffUserId: staffId }),
      ]);
      setToday(todayData);
      setHistory(historyData || []);
    } catch (err) {
      console.warn('Failed to load attendance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [staffId, venueId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleClockIn = async () => {
    if (!staffId) return;
    setIsClocking(true);
    try {
      await clockIn(staffId, venueId, orgId);
      await loadData();
      toast.success('Clocked in! 🎉');
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
      await loadData();
      toast.success('Clocked out! 👏');
    } catch (err) {
      toast.error(err.message || 'Failed to clock out');
    } finally {
      setIsClocking(false);
    }
  };

  const isClockedIn = today && !today.clock_out;
  let liveDuration = '--';
  if (isClockedIn && today?.clock_in) {
    const mins = Math.floor((currentTime - new Date(today.clock_in)) / 60000);
    liveDuration = formatDuration(mins);
  }

  // Calculate stats from history
  const totalShifts = history.filter((r) => r.duration_minutes).length;
  const totalMinutes = history.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
  const avgMinutes = totalShifts > 0 ? Math.round(totalMinutes / totalShifts) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08] flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}40` }}>
            <ClipboardCheck className="h-5 w-5" style={{ color: accent }} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-lg font-heading font-extrabold text-[#F4F5F7] tracking-tight">
              My Attendance
            </h1>
            <p className="text-xs text-[#8A8F9C]">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMonthlyModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-xs font-semibold text-[#F4F5F7] transition-all"
        >
          <CalendarDays className="h-4 w-4" style={{ color: accent }} />
          <span>Monthly Calendar</span>
        </button>
      </div>

      {/* Clock In/Out Card */}
      <div className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08] space-y-5">
        <div className="text-center space-y-4">
          {/* Big Clock Display */}
          <div className="py-4">
            <div className="text-4xl font-heading font-extrabold tracking-tight" style={{ color: accent }}>
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
            <p className="text-xs font-mono text-[#8A8F9C] mt-1">
              {isClockedIn ? `Shift duration: ${liveDuration}` : today?.clock_out ? 'Shift completed' : 'Ready to start'}
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
                isClockedIn
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : today?.clock_out
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  : 'bg-white/[0.04] text-[#8A8F9C] border-white/[0.08]'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isClockedIn ? 'bg-emerald-400 animate-pulse' : today?.clock_out ? 'bg-sky-400' : 'bg-[#8A8F9C]'}`} />
              {isClockedIn ? 'On Shift' : today?.clock_out ? 'Shift Done' : 'Off Shift'}
            </div>
          </div>

          {/* Clock In/Out Details */}
          {today && (
            <div className="flex items-center justify-center gap-6 py-2">
              <div className="text-center">
                <p className="text-[10px] font-mono text-[#8A8F9C] uppercase tracking-wider">Clock In</p>
                <p className="text-sm font-mono font-semibold text-[#F4F5F7]">{formatTime(today.clock_in)}</p>
              </div>
              {today.clock_out && (
                <>
                  <div className="h-6 w-px bg-white/[0.08]" />
                  <div className="text-center">
                    <p className="text-[10px] font-mono text-[#8A8F9C] uppercase tracking-wider">Clock Out</p>
                    <p className="text-sm font-mono font-semibold text-[#F4F5F7]">{formatTime(today.clock_out)}</p>
                  </div>
                  <div className="h-6 w-px bg-white/[0.08]" />
                  <div className="text-center">
                    <p className="text-[10px] font-mono text-[#8A8F9C] uppercase tracking-wider">Duration</p>
                    <p className="text-sm font-mono font-semibold" style={{ color: accent }}>
                      {formatDuration(today.duration_minutes)}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Clock Button */}
          <button
            type="button"
            onClick={isClockedIn ? handleClockOut : handleClockIn}
            disabled={isClocking}
            className={`w-full max-w-xs mx-auto py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              isClockedIn
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 active:scale-[0.98]'
                : 'text-[#07080B] font-semibold active:scale-[0.98]'
            }`}
            style={!isClockedIn ? { background: accent } : undefined}
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
            ) : today?.clock_out ? (
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
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08] text-center">
          <div className="text-xl font-heading font-extrabold" style={{ color: accent }}>{totalShifts}</div>
          <p className="text-[10px] font-mono text-[#8A8F9C] mt-1">Total Shifts</p>
        </div>
        <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08] text-center">
          <div className="text-xl font-heading font-extrabold" style={{ color: accent }}>{formatDuration(totalMinutes)}</div>
          <p className="text-[10px] font-mono text-[#8A8F9C] mt-1">Total Hours</p>
        </div>
        <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08] text-center">
          <div className="text-xl font-heading font-extrabold" style={{ color: accent }}>{formatDuration(avgMinutes)}</div>
          <p className="text-[10px] font-mono text-[#8A8F9C] mt-1">Avg Shift</p>
        </div>
      </div>

      {/* Recent History */}
      <div className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <Calendar className="h-4 w-4" style={{ color: accent }} strokeWidth={1.5} />
          <h2 className="text-sm font-heading font-bold text-[#F4F5F7]">Recent Shifts</h2>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-[#8A8F9C]">
            No attendance records yet. Clock in to start tracking!
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {history.slice(0, 15).map((record) => (
              <div key={record.id} className="py-3 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-xl transition-colors">
                <div>
                  <p className="text-xs font-semibold text-[#F4F5F7]">
                    {new Date(record.work_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-[10px] font-mono text-[#8A8F9C]">
                    {formatTime(record.clock_in)}
                    {record.clock_out && ` → ${formatTime(record.clock_out)}`}
                  </p>
                </div>
                <Badge variant={record.clock_out ? 'success' : 'warning'} size="sm">
                  {record.duration_minutes ? formatDuration(record.duration_minutes) : 'Active'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Attendance Profile Modal */}
      {showMonthlyModal && staffProfile && (
        <StaffProfileModal
          isOpen={showMonthlyModal}
          onClose={() => setShowMonthlyModal(false)}
          staffMember={staffProfile}
        />
      )}
    </div>
  );
}
