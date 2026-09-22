import { supabase } from '@/lib/supabase';

// ─── Venue ────────────────────────────────────────────────────────────────────

export async function fetchVenue(venueId) {
  let query = supabase.from('venues').select('*');
  if (venueId) {
    query = query.eq('id', venueId);
  } else {
    query = query.eq('is_active', true).limit(1);
  }
  const { data, error } = await query.single();

  if (error) {
    // If no active venue found with is_active = true, fetch the first venue
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('venues')
      .select('*')
      .limit(1)
      .single();
    if (fallbackError) throw fallbackError;
    return fallbackData;
  }
  return data;
}

export async function updateVenue(venueId, updates) {
  let targetVenueId = venueId;
  if (!targetVenueId) {
    const v = await fetchVenue();
    targetVenueId = v?.id;
  }
  if (!targetVenueId) throw new Error('No venue found to update');

  const { data, error } = await supabase
    .from('venues')
    .update(updates)
    .eq('id', targetVenueId)
    .select();

  if (error) {
    console.error('Update venue error:', error);
    if (error.code === '42501' || error.message?.includes('policy')) {
      throw new Error('Database permission error. Please run migration 00003_fix_rls_and_permissions.sql in your Supabase SQL editor.');
    }
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Could not update venue. Please run migration 00003_fix_rls_and_permissions.sql in your Supabase SQL editor to allow updates.');
  }

  return data[0];
}

// ─── Venue Settings ───────────────────────────────────────────────────────────

export async function fetchVenueSettings(venueId) {
  let targetVenueId = venueId;
  if (!targetVenueId) {
    const v = await fetchVenue();
    targetVenueId = v?.id;
  }
  if (!targetVenueId) return null;

  const { data, error } = await supabase
    .from('venue_settings')
    .select('*')
    .eq('venue_id', targetVenueId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  return data;
}

export async function updateVenueSettings(venueId, updates) {
  let targetVenueId = venueId;
  if (!targetVenueId) {
    const v = await fetchVenue();
    targetVenueId = v?.id;
  }
  if (!targetVenueId) throw new Error('No venue found to update');

  // Upsert: if settings row doesn't exist, create it
  const { data, error } = await supabase
    .from('venue_settings')
    .upsert({ venue_id: targetVenueId, ...updates }, { onConflict: 'venue_id' })
    .select();

  if (error) {
    console.error('Update venue settings error:', error);
    if (error.code === '42501' || error.message?.includes('policy')) {
      throw new Error('Database permission error on venue settings. Please run migration 00003_fix_rls_and_permissions.sql in Supabase SQL editor.');
    }
    throw error;
  }
  return data?.[0] || updates;
}

// ─── Staff Management ─────────────────────────────────────────────────────────

export async function fetchStaffList(venueId) {
  let targetVenueId = venueId;
  if (!targetVenueId) {
    const v = await fetchVenue();
    targetVenueId = v?.id;
  }
  if (!targetVenueId) return [];

  const { data, error } = await supabase
    .from('staff_users')
    .select('*')
    .eq('venue_id', targetVenueId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Invite a new staff member.
 * Creates a Supabase auth user via signUp (client-side) and then inserts a staff_users row.
 * In production, this would use an Edge Function with the service role key.
 *
 * Returns the temporary password for the admin to share.
 */
export async function inviteStaff({ venueId, orgId, email, fullName, role }) {
  // Generate a temporary password
  const tempPassword = `TS-${Math.random().toString(36).slice(2, 10)}`;

  // Create auth user (this sends a confirmation email if configured)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: tempPassword,
    options: {
      data: { full_name: fullName },
    },
  });

  if (authError) throw authError;

  const authUser = authData.user;
  if (!authUser) throw new Error('Auth user creation returned null.');

  // Insert staff_users row
  const { data: staff, error: staffError } = await supabase
    .from('staff_users')
    .insert({
      org_id: orgId,
      venue_id: venueId,
      auth_user_id: authUser.id,
      full_name: fullName,
      email,
      role,
    })
    .select()
    .single();

  if (staffError) throw staffError;

  return { staff, tempPassword };
}

export async function updateStaffRole(staffId, role) {
  const { data, error } = await supabase
    .from('staff_users')
    .update({ role })
    .eq('id', staffId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deactivateStaff(staffId) {
  const { error } = await supabase
    .from('staff_users')
    .update({ is_active: false })
    .eq('id', staffId);

  if (error) throw error;
}
