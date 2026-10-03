import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/shared/auth';
import {
  fetchVenueAttendanceToday,
  fetchAttendanceHistory,
  getAttendanceSummary,
  subscribeToAttendance,
} from '@/features/staff/attendance/api/attendanceApi';
import { fetchStaffMembers } from '@/features/staff/team/api/teamApi';
import toast from 'react-hot-toast';
import {
  ClipboardCheck,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Timer,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  User,
} from 'lucide-react';
import { StaffProfileModal } from '@/features/staff/team/components/StaffProfileModal';

const ROLE_THEMES = {
  owner: { color: '#C6FF3D', bg: 'bg-[#C6FF3D]/10', border: 'border-[#C6FF3D]/30' },
  manager: { color: '#38BDF8', bg: 'bg-sky-400/10', border: 'border-sky-400/30' },
  kitchen: { color: '#FBBF24', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
  waiter: { color: '#34D399', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
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
  return `${h}h ${m}m`;
}

function getDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export function StaffAttendanceScreen() {
  const { venueId } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [todayRecords, setTodayRecords] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [summary, setSummary] = useState({ clockedIn: 0, clockedOut: 0, totalToday: 0, avgDuration: 0 });
  const [historyRecords, setHistoryRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getDateStr());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfileMember, setSelectedProfileMember] = useState(null);

  const loadToday = useCallback(async () => {
    try {
      const [records, staff, summaryData] = await Promise.all([
        fetchVenueAttendanceToday(venueId),
        fetchStaffMembers(venueId),
        getAttendanceSummary(venueId),
      ]);
      setTodayRecords(records || []);
      setAllStaff(staff || []);
      setSummary(summaryData);
    } catch (err) {
      console.warn('Failed to load attendance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchAttendanceHistory(venueId, {
        dateFrom: selectedDate,
        dateTo: selectedDate,
      });
      setHistoryRecords(data || []);
    } catch (err) {
      console.warn('Failed to load attendance history:', err);
    }
  }, [venueId, selectedDate]);

  useEffect(() => {
    loadToday();
    const unsub = subscribeToAttendance(venueId, () => {
      loadToday();
    });
    return () => unsub();
  }, [venueId, loadToday]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, selectedDate, loadHistory]);

  // Build attendance roster: show all staff with their attendance status
  const attendanceRoster = allStaff.map((staff) => {
    const record = todayRecords.find(
      (r) => r.staff_user_id === staff.id || r.staff_users?.id === staff.id
    );
    return {
      ...staff,
      attendance: record || null,
      isClockedIn: record && !record.clock_out,
      hasClockedOut: record && record.clock_out,
      isAbsent: !record,
    };
  });

  const navigateDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleExport = () => {
    const records = activeTab === 'today' ? todayRecords : historyRecords;
    if (records.length === 0) {
      toast.error('No data to export');
      return;
    }

    const rows = records.map((r) => ({
      Staff: r.staff_users?.full_name || 'Unknown',
      Role: r.staff_users?.role || '-',
      Date: r.work_date,
      'Clock In': formatTime(r.clock_in),
      'Clock Out': formatTime(r.clock_out),
      'Duration (min)': r.duration_minutes || '-',
    }));

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${r[h] || ''}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${activeTab === 'today' ? 'today' : selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Attendance exported!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-card bg-[#0E1016] border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#C6FF3D]/10 border border-[#C6FF3D]/25 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-[#C6FF3D]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-lg font-heading font-extrabold text-[#F4F5F7] tracking-tight">
              Staff Attendance
            </h1>
            <p className="text-xs text-[#8A8F9C]">
              Track clock-in/out, shift hours, and team presence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            className="text-xs gap-1.5 border-white/[0.12] text-[#F4F5F7] hover:border-white/[0.25]"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C]">Clocked In</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-heading font-extrabold text-emerald-400">{summary.clockedIn}</div>
          <p className="text-[10px] font-mono text-[#8A8F9C] mt-1">currently on shift</p>
        </div>

        <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C]">Completed</span>
            <Clock className="h-3.5 w-3.5 text-sky-400" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-heading font-extrabold text-sky-400">{summary.clockedOut}</div>
          <p className="text-[10px] font-mono text-[#8A8F9C] mt-1">shifts done today</p>
        </div>

        <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C]">Not Present</span>
            <XCircle className="h-3.5 w-3.5 text-rose-400" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-heading font-extrabold text-rose-400">
            {Math.max(0, allStaff.length - summary.totalToday)}
          </div>
          <p className="text-[10px] font-mono text-[#8A8F9C] mt-1">not clocked in</p>
        </div>

        <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C]">Avg Duration</span>
            <Timer className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-heading font-extrabold text-amber-400">
            {formatDuration(summary.avgDuration)}
          </div>
          <p className="text-[10px] font-mono text-[#8A8F9C] mt-1">average shift</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#0E1016] rounded-xl border border-white/[0.08] p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'today'
              ? 'bg-white/[0.08] text-[#F4F5F7] border border-white/[0.12]'
              : 'text-[#8A8F9C] hover:text-[#F4F5F7]'
          }`}
        >
          Today's Roster
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-white/[0.08] text-[#F4F5F7] border border-white/[0.12]'
              : 'text-[#8A8F9C] hover:text-[#F4F5F7]'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      {activeTab === 'today' ? (
        /* Today's Roster */
        <div className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#C6FF3D]" strokeWidth={1.5} />
              <h2 className="text-sm font-heading font-bold text-[#F4F5F7]">
                Team Roster — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </h2>
            </div>
            <Badge variant="primary" size="sm">{allStaff.length} staff</Badge>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs font-mono text-[#8A8F9C]">Loading attendance...</div>
          ) : attendanceRoster.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8A8F9C]">No staff members found.</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {attendanceRoster.map((member) => {
                const roleTheme = ROLE_THEMES[member.role] || ROLE_THEMES.waiter;
                const initials = (member.full_name || 'ST')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div key={member.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center font-mono font-medium text-xs border`}
                          style={{ borderColor: `${roleTheme.color}50`, color: roleTheme.color, background: `${roleTheme.color}10` }}
                        >
                          {initials}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0E1016] ${
                            member.isClockedIn
                              ? 'bg-emerald-400'
                              : member.hasClockedOut
                              ? 'bg-sky-400'
                              : 'bg-[#8A8F9C]'
                          }`}
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#F4F5F7] truncate">
                            {member.full_name}
                          </span>
                          <Badge variant={member.isClockedIn ? 'success' : member.hasClockedOut ? 'primary' : 'danger'} size="sm">
                            {member.isClockedIn ? 'On Shift' : member.hasClockedOut ? 'Done' : 'Absent'}
                          </Badge>
                        </div>
                        <span className="text-[10px] font-mono text-[#8A8F9C] capitalize">{member.role}</span>
                      </div>
                    </div>

                    {/* Time Info & Action */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right shrink-0">
                        {member.attendance ? (
                          <>
                            <div className="text-xs font-mono text-[#F4F5F7]">
                              {formatTime(member.attendance.clock_in)}
                              {member.attendance.clock_out && (
                                <span className="text-[#8A8F9C]"> → {formatTime(member.attendance.clock_out)}</span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-[#8A8F9C]">
                              {member.attendance.duration_minutes
                                ? formatDuration(member.attendance.duration_minutes)
                                : member.isClockedIn
                                ? 'In progress...'
                                : '--'}
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] font-mono text-[#8A8F9C]">Not checked in</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedProfileMember(member)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#C6FF3D]/10 text-[#8A8F9C] hover:text-[#C6FF3D] border border-white/[0.06] hover:border-[#C6FF3D]/30 text-xs font-medium transition-all"
                        title="View monthly profile and attendance calendar"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Monthly</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* History View */
        <div className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08] space-y-4">
          {/* Date Navigator */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#C6FF3D]" strokeWidth={1.5} />
              <h2 className="text-sm font-heading font-bold text-[#F4F5F7]">
                Attendance History
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateDate(-1)}
                className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#8A8F9C] hover:text-[#F4F5F7] hover:border-white/[0.2] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getDateStr()}
                className="px-3 py-1.5 rounded-lg bg-[#141721] border border-white/[0.08] text-xs font-mono text-[#F4F5F7] focus:border-[#C6FF3D]/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => navigateDate(1)}
                disabled={selectedDate >= getDateStr()}
                className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#8A8F9C] hover:text-[#F4F5F7] hover:border-white/[0.2] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* History Records */}
          {historyRecords.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#8A8F9C]">
              No attendance records for {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {historyRecords.map((record) => {
                const name = record.staff_users?.full_name || 'Staff';
                const role = record.staff_users?.role || 'staff';
                const roleTheme = ROLE_THEMES[role] || ROLE_THEMES.waiter;
                const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                return (
                  <div key={record.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center font-mono font-medium text-xs border shrink-0"
                        style={{ borderColor: `${roleTheme.color}50`, color: roleTheme.color, background: `${roleTheme.color}10` }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-[#F4F5F7] truncate block">{name}</span>
                        <span className="text-[10px] font-mono text-[#8A8F9C] capitalize">{role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono text-[#F4F5F7]">
                          {formatTime(record.clock_in)}
                          {record.clock_out ? (
                            <span className="text-[#8A8F9C]"> → {formatTime(record.clock_out)}</span>
                          ) : (
                            <span className="text-emerald-400"> (active)</span>
                          )}
                        </div>
                      </div>
                      <div className="min-w-[60px] text-right">
                        <Badge variant={record.clock_out ? 'success' : 'warning'} size="sm">
                          {record.duration_minutes ? formatDuration(record.duration_minutes) : 'Active'}
                        </Badge>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const matched = allStaff.find((s) => s.id === record.staff_user_id) || record.staff_users || { id: record.staff_user_id, full_name: name, role };
                          setSelectedProfileMember(matched);
                        }}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-[#C6FF3D]/10 text-[#8A8F9C] hover:text-[#C6FF3D] border border-white/[0.06] hover:border-[#C6FF3D]/30 transition-all"
                        title="View monthly profile"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Staff Profile & Monthly Attendance Modal */}
      {selectedProfileMember && (
        <StaffProfileModal
          isOpen={!!selectedProfileMember}
          onClose={() => setSelectedProfileMember(null)}
          staffMember={selectedProfileMember}
        />
      )}
    </div>
  );
}
