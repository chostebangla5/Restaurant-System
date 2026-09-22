import { supabase } from '@/lib/supabase';

/**
 * Fetch all guests for an org with optional search
 */
export async function fetchGuests(orgId, searchTerm = '') {
  let query = supabase
    .from('guests')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (searchTerm.trim()) {
    query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single guest by ID
 */
export async function fetchGuest(guestId) {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('id', guestId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new guest
 */
export async function createGuest(orgId, guestData) {
  const { data, error } = await supabase
    .from('guests')
    .insert({
      org_id: orgId,
      phone: guestData.phone,
      name: guestData.name || null,
      email: guestData.email || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update guest data
 */
export async function updateGuest(guestId, updates) {
  const { data, error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', guestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch guest order history (sessions linked to guest)
 */
export async function fetchGuestSessions(guestId) {
  const { data, error } = await supabase
    .from('table_sessions')
    .select('*, tables(table_number)')
    .eq('guest_id', guestId)
    .order('opened_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

/**
 * Get aggregate guest stats for the org
 */
export async function fetchGuestStats(orgId) {
  const { data: guests, error } = await supabase
    .from('guests')
    .select('id, loyalty_tier, loyalty_points, created_at')
    .eq('org_id', orgId);

  if (error) throw error;
  if (!guests) return { total: 0, gold: 0, silver: 0, bronze: 0, newThisMonth: 0 };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return {
    total: guests.length,
    gold: guests.filter((g) => g.loyalty_tier === 'gold').length,
    silver: guests.filter((g) => g.loyalty_tier === 'silver').length,
    bronze: guests.filter((g) => g.loyalty_tier === 'bronze').length,
    newThisMonth: guests.filter((g) => g.created_at >= startOfMonth).length,
    totalPoints: guests.reduce((sum, g) => sum + (g.loyalty_points || 0), 0),
  };
}

/**
 * Export guests to CSV string
 */
export function exportGuestsCsv(guests) {
  const headers = ['Name', 'Phone', 'Email', 'Loyalty Tier', 'Points', 'Referral Code', 'Joined'];
  const rows = guests.map((g) => [
    g.name || '',
    g.phone || '',
    g.email || '',
    g.loyalty_tier || 'bronze',
    g.loyalty_points || 0,
    g.referral_code || '',
    g.created_at ? new Date(g.created_at).toLocaleDateString() : '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `guests_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
