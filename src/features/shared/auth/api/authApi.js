import { supabase } from '@/lib/supabase';

/**
 * Fetch all staff profiles for a given auth user (one per venue).
 * Joins venues and organizations for sidebar display.
 * @param {string} authUserId
 * @returns {Promise<Array>}
 */
export async function fetchStaffProfiles(authUserId) {
  const { data, error } = await supabase
    .from('staff_users')
    .select('*, venues(*), organizations(*)')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Full owner sign-up orchestration:
 *  1. Create Supabase auth user
 *  2. Insert organization
 *  3. Insert venue
 *  4. Insert staff_users row (role: owner)
 *  5. Insert default venue_settings
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.fullName
 * @param {string} params.orgName
 * @param {string} params.venueName
 * @param {string} params.venueSlug
 * @param {string} [params.brandColor]
 * @returns {Promise<{user: Object, org: Object, venue: Object}>}
 */
export async function signUpOwner({
  email,
  password,
  fullName,
  orgName,
  venueName,
  venueSlug,
  brandColor = '#EA580C',
}) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (authError) throw authError;

  const authUser = authData.user;
  if (!authUser) throw new Error('Sign up succeeded but user object is null.');

  // If email confirmation is required by Supabase, session will be null
  if (!authData.session) {
    return {
      user: authUser,
      requiresEmailVerification: true,
      message: 'Account created! Please verify your email, or disable "Confirm email" in Supabase to log in immediately.',
    };
  }

  // 2. Bootstrap restaurant data (try atomic RPC first)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('bootstrap_restaurant_owner', {
      p_org_name: orgName,
      p_venue_name: venueName,
      p_venue_slug: venueSlug,
      p_brand_color: brandColor,
    });

    if (!rpcError && rpcData) {
      return { user: authUser, ...rpcData };
    }
    if (rpcError) {
      console.warn('RPC bootstrap_restaurant_owner failed, trying table inserts:', rpcError);
    }
  } catch (rpcErr) {
    console.warn('RPC not found, falling back to direct table inserts:', rpcErr);
  }

  // Fallback: Direct table inserts
  try {
    // 2. Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        owner_auth_id: authUser.id,
        plan: 'starter',
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // 3. Create venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .insert({
        org_id: org.id,
        name: venueName,
        slug: venueSlug,
        brand_color: brandColor,
      })
      .select()
      .single();

    if (venueError) throw venueError;

    // 4. Create staff_users entry (owner)
    const { error: staffError } = await supabase
      .from('staff_users')
      .insert({
        org_id: org.id,
        venue_id: venue.id,
        auth_user_id: authUser.id,
        full_name: fullName,
        email: email,
        role: 'owner',
      });

    if (staffError) throw staffError;

    // 5. Create default venue_settings
    await supabase
      .from('venue_settings')
      .insert({
        venue_id: venue.id,
        allow_guest_ordering: true,
        enable_sound_alerts: true,
      });

    return { user: authUser, org, venue };
  } catch (err) {
    console.error('Owner bootstrap error:', err);
    throw err;
  }
}

/**
 * For users who already have an auth account but no venue yet (e.g. initial setup).
 */
export async function bootstrapVenueForCurrentUser({
  orgName,
  venueName,
  venueSlug,
  brandColor = '#EA580C',
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Try RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('bootstrap_restaurant_owner', {
      p_org_name: orgName,
      p_venue_name: venueName,
      p_venue_slug: venueSlug,
      p_brand_color: brandColor,
    });
    if (!rpcError && rpcData) return rpcData;
  } catch (e) {
    // fallback
  }

  // Fallback direct inserts
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      owner_auth_id: user.id,
      plan: 'starter',
    })
    .select()
    .single();

  if (orgError) throw orgError;

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .insert({
      org_id: org.id,
      name: venueName,
      slug: venueSlug,
      brand_color: brandColor,
    })
    .select()
    .single();

  if (venueError) throw venueError;

  await supabase
    .from('staff_users')
    .insert({
      org_id: org.id,
      venue_id: venue.id,
      auth_user_id: user.id,
      full_name: user.user_metadata?.full_name || user.email,
      email: user.email,
      role: 'owner',
    });

  await supabase
    .from('venue_settings')
    .insert({
      venue_id: venue.id,
      allow_guest_ordering: true,
      enable_sound_alerts: true,
    });

  return { org, venue };
}

/**
 * Generate a URL-safe slug from a venue name.
 * @param {string} name
 * @returns {string}
 */
export function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}
