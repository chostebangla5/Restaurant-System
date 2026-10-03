import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Insert a staff call from the guest side.
 * This persists guest service requests so staff can see them via Supabase Realtime.
 */
export async function createStaffCall({ venueId, orgId, tableNumber, shortCode, reason, notes }) {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured – staff call not persisted.');
    return null;
  }

  // Lookup org_id from venue if not provided
  let resolvedOrgId = orgId;
  if (!resolvedOrgId && venueId) {
    const { data: venue } = await supabase
      .from('venues')
      .select('org_id')
      .eq('id', venueId)
      .single();
    resolvedOrgId = venue?.org_id;
  }

  if (!resolvedOrgId || !venueId) {
    console.warn('Missing venue/org info for staff call.');
    return null;
  }

  const { data, error } = await supabase
    .from('staff_calls')
    .insert({
      venue_id: venueId,
      org_id: resolvedOrgId,
      table_number: tableNumber || 'Unknown',
      short_code: shortCode || null,
      reason: reason || 'Server Assistance',
      notes: notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating staff call:', error);
    // Don't throw – the BroadcastChannel fallback still works
    return null;
  }

  return data;
}

/**
 * Fetch active (non-resolved) calls for a venue
 */
export async function fetchActiveStaffCalls(venueId) {
  if (!isSupabaseConfigured() || !venueId) return [];

  const { data, error } = await supabase
    .from('staff_calls')
    .select('*')
    .eq('venue_id', venueId)
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching staff calls:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch all calls for a venue (including resolved) for history
 */
export async function fetchStaffCallHistory(venueId, { limit = 100, dateFrom = null } = {}) {
  if (!isSupabaseConfigured() || !venueId) return [];

  let query = supabase
    .from('staff_calls')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching call history:', error);
    return [];
  }

  return data || [];
}

/**
 * Acknowledge a staff call (staff is on the way)
 */
export async function acknowledgeStaffCall(callId) {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('staff_calls')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', callId)
    .select()
    .single();

  if (error) {
    console.error('Error acknowledging staff call:', error);
    throw error;
  }
  return data;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a staff call (task completed)
 */
export async function resolveStaffCall(callId, staffUserId = null) {
  if (!isSupabaseConfigured()) return null;

  const updates = {
    status: 'resolved',
    resolved_at: new Date().toISOString(),
  };
  if (staffUserId && UUID_REGEX.test(staffUserId)) {
    updates.resolved_by = staffUserId;
  }

  const { data, error } = await supabase
    .from('staff_calls')
    .update(updates)
    .eq('id', callId)
    .select()
    .single();

  if (error) {
    console.error('Error resolving staff call:', error);
    throw error;
  }
  return data;
}

/**
 * Subscribe to realtime staff call changes for a venue
 */
export function subscribeToStaffCalls(venueId, callback) {
  if (!isSupabaseConfigured() || !venueId) return () => {};

  const channel = supabase
    .channel(`staff_calls_${venueId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'staff_calls',
        filter: `venue_id=eq.${venueId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
