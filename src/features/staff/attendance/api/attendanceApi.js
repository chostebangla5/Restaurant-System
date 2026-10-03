import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveValidStaffUserId(staffUserId) {
  if (staffUserId && UUID_REGEX.test(staffUserId)) {
    return staffUserId;
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: staffRow } = await supabase
        .from('staff_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (staffRow?.id) return staffRow.id;
    }
  } catch (err) {
    console.warn('Could not resolve staff user UUID:', err);
  }
  return staffUserId;
}

/**
 * Clock in a staff member
 */
export async function clockIn(staffUserId, venueId, orgId) {
  if (!isSupabaseConfigured() || !staffUserId || !venueId) {
    throw new Error('Missing required parameters for clock-in');
  }

  const validStaffId = await resolveValidStaffUserId(staffUserId);

  // Check if currently clocked in without clocking out
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('staff_attendance')
    .select('id')
    .eq('staff_user_id', validStaffId)
    .eq('work_date', today)
    .is('clock_out', null)
    .maybeSingle();

  if (existing) {
    throw new Error('Already clocked in right now. Please clock out of your current shift first.');
  }

  // Lookup org_id from venue if not passed
  let resolvedOrgId = orgId;
  if (!resolvedOrgId && venueId) {
    const { data: venue } = await supabase
      .from('venues')
      .select('org_id')
      .eq('id', venueId)
      .maybeSingle();
    resolvedOrgId = venue?.org_id;
  }

  const { data, error } = await supabase
    .from('staff_attendance')
    .insert({
      staff_user_id: validStaffId,
      venue_id: venueId,
      org_id: resolvedOrgId,
      clock_in: new Date().toISOString(),
      work_date: today,
    })
    .select()
    .single();

  if (error) {
    console.error('Error clocking in:', error);
    throw error;
  }
  return data;
}

/**
 * Clock out a staff member (update active open record)
 */
export async function clockOut(staffUserId) {
  if (!isSupabaseConfigured() || !staffUserId) {
    throw new Error('Missing required parameters for clock-out');
  }

  const validStaffId = await resolveValidStaffUserId(staffUserId);
  const today = new Date().toISOString().split('T')[0];
  
  // Find the open clock-in record for today (without clock_out)
  const { data: record, error: fetchErr } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('staff_user_id', validStaffId)
    .eq('work_date', today)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr || !record) {
    throw new Error('No active open shift found for today.');
  }

  const clockOutTime = new Date();
  const clockInTime = new Date(record.clock_in);
  const durationMinutes = Math.max(1, Math.round((clockOutTime - clockInTime) / 60000));

  const { data, error } = await supabase
    .from('staff_attendance')
    .update({
      clock_out: clockOutTime.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq('id', record.id)
    .select()
    .single();

  if (error) {
    console.error('Error clocking out:', error);
    throw error;
  }
  return data;
}

/**
 * Get today's attendance status for a specific staff member
 */
export async function getTodayAttendance(staffUserId) {
  if (!isSupabaseConfigured() || !staffUserId) return null;

  const validStaffId = await resolveValidStaffUserId(staffUserId);
  const today = new Date().toISOString().split('T')[0];

  // First prioritize an active, ongoing shift
  const { data: activeRecord } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('staff_user_id', validStaffId)
    .eq('work_date', today)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRecord) return activeRecord;

  // Otherwise return the latest shift completed today
  const { data: latestRecord, error } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('staff_user_id', validStaffId)
    .eq('work_date', today)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching today attendance:', error);
    return null;
  }
  return latestRecord;
}

/**
 * Fetch today's attendance for all staff in a venue
 */
export async function fetchVenueAttendanceToday(venueId) {
  if (!isSupabaseConfigured() || !venueId) return [];

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('staff_attendance')
    .select('*, staff_users(id, full_name, role, email)')
    .eq('venue_id', venueId)
    .eq('work_date', today)
    .order('clock_in', { ascending: true });

  if (error) {
    console.error('Error fetching venue attendance:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch attendance history for a venue with date range
 */
export async function fetchAttendanceHistory(venueId, { dateFrom = null, dateTo = null, staffUserId = null } = {}) {
  if (!isSupabaseConfigured() || !venueId) return [];

  let query = supabase
    .from('staff_attendance')
    .select('*, staff_users(id, full_name, role, email)')
    .eq('venue_id', venueId)
    .order('work_date', { ascending: false })
    .order('clock_in', { ascending: true })
    .limit(200);

  if (dateFrom) query = query.gte('work_date', dateFrom);
  if (dateTo) query = query.lte('work_date', dateTo);
  if (staffUserId) query = query.eq('staff_user_id', staffUserId);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching attendance history:', error);
    return [];
  }
  return data || [];
}

/**
 * Get attendance summary stats for a venue (today)
 */
export async function getAttendanceSummary(venueId) {
  if (!isSupabaseConfigured() || !venueId) {
    return { clockedIn: 0, clockedOut: 0, totalToday: 0, avgDuration: 0 };
  }

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('venue_id', venueId)
    .eq('work_date', today);

  if (error || !data) {
    return { clockedIn: 0, clockedOut: 0, totalToday: 0, avgDuration: 0 };
  }

  const clockedIn = data.filter((r) => r.clock_out === null).length;
  const clockedOut = data.filter((r) => r.clock_out !== null).length;
  const durations = data.filter((r) => r.duration_minutes).map((r) => r.duration_minutes);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  return {
    clockedIn,
    clockedOut,
    totalToday: data.length,
    avgDuration,
  };
}

/**
 * Subscribe to realtime attendance changes for a venue
 */
export function subscribeToAttendance(venueId, callback) {
  if (!isSupabaseConfigured() || !venueId) return () => {};

  const channel = supabase
    .channel(`staff_attendance_${venueId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'staff_attendance',
        filter: `venue_id=eq.${venueId}`,
      },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetch and compute detailed monthly attendance for a specific staff member
 * Calculates: In Time (green), Delayed (amber), Absent (red), and daily working hours
 */
export async function fetchStaffMonthlyAttendance(
  staffUserId,
  year,
  month, // 0-indexed (0 = Jan, 9 = Oct) or 1-indexed (1-12)
  { expectedStartHour = 10, expectedStartMinute = 0, graceMinutes = 15 } = {}
) {
  if (!isSupabaseConfigured() || !staffUserId) {
    return { days: [], summary: { presentDays: 0, onTimeDays: 0, delayedDays: 0, absentDays: 0, totalHours: 0 } };
  }

  const validStaffId = await resolveValidStaffUserId(staffUserId);

  // Normalize month to 1-12 and 0-11
  let numYear = parseInt(year, 10);
  let numMonth = parseInt(month, 10);
  if (numMonth > 12) numMonth = 12;
  if (numMonth < 1) numMonth = 1;

  const monthStr = String(numMonth).padStart(2, '0');
  const daysInMonth = new Date(numYear, numMonth, 0).getDate();
  const dateFrom = `${numYear}-${monthStr}-01`;
  const dateTo = `${numYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  const { data: records, error } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('staff_user_id', validStaffId)
    .gte('work_date', dateFrom)
    .lte('work_date', dateTo)
    .order('clock_in', { ascending: true });

  if (error) {
    console.error('Error fetching staff monthly attendance:', error);
  }

  const recordsByDate = {};
  (records || []).forEach((r) => {
    if (!recordsByDate[r.work_date]) {
      recordsByDate[r.work_date] = [];
    }
    recordsByDate[r.work_date].push(r);
  });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const cutoffMinutes = expectedStartHour * 60 + expectedStartMinute + graceMinutes;

  let presentCount = 0;
  let onTimeCount = 0;
  let delayedCount = 0;
  let absentCount = 0;
  let totalMinutesWorked = 0;

  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${numYear}-${monthStr}-${dayStr}`;
    const dateObj = new Date(numYear, numMonth - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const isSunday = dayOfWeek === 0;
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    const dayRecords = recordsByDate[dateStr] || [];
    const hasAttendance = dayRecords.length > 0;

    let dayTotalMinutes = 0;
    let earliestClockIn = null;
    let latestClockOut = null;
    let hasOpenShift = false;

    dayRecords.forEach((r) => {
      if (!earliestClockIn || new Date(r.clock_in) < new Date(earliestClockIn)) {
        earliestClockIn = r.clock_in;
      }
      if (r.clock_out) {
        if (!latestClockOut || new Date(r.clock_out) > new Date(latestClockOut)) {
          latestClockOut = r.clock_out;
        }
        dayTotalMinutes += r.duration_minutes || 0;
      } else {
        hasOpenShift = true;
        // Ongoing live shift
        const elapsed = Math.max(1, Math.round((now - new Date(r.clock_in)) / 60000));
        dayTotalMinutes += elapsed;
      }
    });

    let status = 'future';
    let delayMinutes = 0;

    if (hasAttendance) {
      presentCount++;
      totalMinutesWorked += dayTotalMinutes;

      // Check arrival time against expected cutoff
      const clockInDate = new Date(earliestClockIn);
      const clockInMinutes = clockInDate.getHours() * 60 + clockInDate.getMinutes();

      if (clockInMinutes <= cutoffMinutes) {
        status = 'on_time';
        onTimeCount++;
      } else {
        status = 'delayed';
        delayMinutes = clockInMinutes - (expectedStartHour * 60 + expectedStartMinute);
        delayedCount++;
      }
    } else if (isPast || (isToday && now.getHours() >= 16)) {
      // Past day with no clock in
      if (isSunday) {
        status = 'day_off';
      } else {
        status = 'absent';
        absentCount++;
      }
    } else if (isToday) {
      status = 'pending_today';
    } else {
      status = isSunday ? 'day_off' : 'future';
    }

    days.push({
      day: d,
      dateStr,
      dateObj,
      dayOfWeek,
      isSunday,
      isToday,
      isPast,
      isFuture,
      status, // 'on_time' (green) | 'delayed' (amber) | 'absent' (rose) | 'day_off' | 'future' | 'pending_today'
      records: dayRecords,
      totalMinutes: dayTotalMinutes,
      workingHours: (dayTotalMinutes / 60).toFixed(1),
      earliestClockIn,
      latestClockOut,
      hasOpenShift,
      delayMinutes,
    });
  }

  const totalHours = (totalMinutesWorked / 60).toFixed(1);
  const avgDailyHours = presentCount > 0 ? (totalMinutesWorked / presentCount / 60).toFixed(1) : '0.0';
  const onTimeRate = presentCount > 0 ? Math.round((onTimeCount / presentCount) * 100) : 100;

  return {
    year: numYear,
    month: numMonth,
    daysInMonth,
    days,
    summary: {
      presentDays: presentCount,
      onTimeDays: onTimeCount,
      delayedDays: delayedCount,
      absentDays: absentCount,
      totalMinutesWorked,
      totalHours,
      avgDailyHours,
      onTimeRate,
    },
    records: records || [],
  };
}

/**
 * Admin override: Clock out a staff member forcefully if they forgot to clock out
 */
export async function adminClockOutStaff(attendanceId, { notes = 'Clocked out by manager' } = {}) {
  if (!isSupabaseConfigured() || !attendanceId) return null;

  const { data: record, error: fetchErr } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('id', attendanceId)
    .single();

  if (fetchErr || !record) throw new Error('Attendance record not found');

  const clockOutTime = new Date();
  const clockInTime = new Date(record.clock_in);
  const durationMinutes = Math.max(1, Math.round((clockOutTime - clockInTime) / 60000));

  const { data, error } = await supabase
    .from('staff_attendance')
    .update({
      clock_out: clockOutTime.toISOString(),
      duration_minutes: durationMinutes,
      notes: record.notes ? `${record.notes} | ${notes}` : notes,
    })
    .eq('id', attendanceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

