import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Fetch all staff members for a specific venue from Supabase
 * @param {string} venueId
 * @returns {Promise<Array>}
 */
export async function fetchStaffMembers(venueId) {
  if (!isSupabaseConfigured() || !venueId) {
    return [];
  }

  const { data, error } = await supabase
    .from('staff_users')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching staff members:', error);
    throw error;
  }

  return (data || []).map((s) => ({
    id: s.id,
    full_name: s.full_name || 'Staff Member',
    email: s.email,
    role: s.role,
    is_active: s.is_active,
    phone: s.phone || '',
    joined_at: s.created_at,
    last_active: s.updated_at,
    orders_handled_today: 0,
    avatar_initials: (s.full_name || 'ST')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  }));
}

/**
 * Add a new staff member to Supabase
 */
export async function addStaffMember({ venueId, orgId, fullName, email, role, phone = '', authUserId = null }) {
  if (!isSupabaseConfigured() || !venueId) {
    throw new Error('Supabase is not configured or venue is missing.');
  }

  const { data, error } = await supabase
    .from('staff_users')
    .insert({
      venue_id: venueId,
      org_id: orgId,
      auth_user_id: authUserId,
      full_name: fullName,
      email,
      role,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update staff member details
 */
export async function updateStaffMember(staffId, updates) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const payload = {};
  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.email !== undefined) payload.email = updates.email;

  const { data, error } = await supabase
    .from('staff_users')
    .update(payload)
    .eq('id', staffId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Approve a pending staff member and assign their role
 */
export async function approveStaffMember(staffId, role = 'waiter') {
  return updateStaffMember(staffId, { role, isActive: true });
}

/**
 * Toggle staff active status (on duty / off duty)
 */
export async function toggleStaffActive(staffId, isActive) {
  return updateStaffMember(staffId, { isActive });
}

/**
 * Delete / remove a staff member (with soft-deactivation fallback)
 */
export async function removeStaffMember(staffId) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  // 1. Attempt hard delete via Supabase
  const { data: deletedRows, error: delError } = await supabase
    .from('staff_users')
    .delete()
    .eq('id', staffId)
    .select();

  // If hard-delete succeeded, return true
  if (!delError && deletedRows && deletedRows.length > 0) {
    return true;
  }

  // 2. If RLS prevented hard-delete (0 rows returned or error), fallback to deactivating
  console.warn('Direct delete did not delete rows; applying deactivation fallback');
  const { error: updateError } = await supabase
    .from('staff_users')
    .update({ is_active: false })
    .eq('id', staffId);

  if (updateError && delError) {
    throw delError || updateError;
  }

  return true;
}

/**
 * Subscribe to realtime staff updates
 */
export function subscribeToStaff(callback) {
  if (!isSupabaseConfigured()) return () => {};

  const channel = supabase
    .channel('staff_realtime_channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'staff_users' },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
