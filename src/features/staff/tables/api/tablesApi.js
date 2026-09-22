import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Generate a random URL-friendly short code for QR scanning
 */
function generateShortCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Fetch all tables for a given venue
 * @param {string} venueId
 * @returns {Promise<Array>}
 */
export async function fetchTables(venueId) {
  if (!isSupabaseConfigured()) {
    return [];
  }

  let targetVenueId = venueId;
  if (!targetVenueId) {
    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .eq('is_active', true)
      .limit(1);
    if (venues && venues.length > 0) {
      targetVenueId = venues[0].id;
    }
  }

  if (!targetVenueId) {
    return [];
  }

  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('venue_id', targetVenueId)
    .eq('is_active', true)
    .order('table_number', { ascending: true });

  if (error) {
    console.error('Error fetching tables from Supabase:', error);
    throw error;
  }

  return (data || []).map((t) => ({
    id: t.id,
    number: String(t.table_number).replace(/^T-/i, ''),
    code: t.short_code,
    capacity: t.capacity || 4,
    status: t.status || 'free',
    venue_id: t.venue_id,
    org_id: t.org_id,
  }));
}

/**
 * Create a new physical dining table with unique QR short code
 */
export async function createTable({ orgId, venueId, tableNumber, capacity = 4 }) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  let targetVenueId = venueId;
  let targetOrgId = orgId;

  // Auto-resolve venue if not provided
  if (!targetVenueId || !targetOrgId) {
    const { data: venues } = await supabase
      .from('venues')
      .select('id, org_id')
      .eq('is_active', true)
      .limit(1);

    if (venues && venues.length > 0) {
      targetVenueId = targetVenueId || venues[0].id;
      targetOrgId = targetOrgId || venues[0].org_id;
    }
  }

  if (!targetVenueId) {
    throw new Error('Restaurant venue not found. Please verify your settings.');
  }

  const cleanNumber = String(tableNumber).replace(/^T-/i, '').trim();
  const paddedNumber = cleanNumber.padStart(2, '0');
  const shortCode = generateShortCode();

  const { data, error } = await supabase
    .from('tables')
    .insert({
      org_id: targetOrgId,
      venue_id: targetVenueId,
      table_number: paddedNumber,
      short_code: shortCode,
      capacity: Number(capacity) || 4,
      status: 'free',
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase createTable error:', error);
    if (error.code === '42501') {
      throw new Error('Database permission error. Please run migration 00003_fix_rls_and_permissions.sql in your Supabase SQL editor.');
    }
    if (error.code === '23505') {
      throw new Error(`Table ${paddedNumber} already exists. Please choose a different number.`);
    }
    throw new Error(error.message || 'Failed to create table in database.');
  }

  return {
    id: data.id,
    number: String(data.table_number).replace(/^T-/i, ''),
    code: data.short_code,
    capacity: data.capacity,
    status: data.status,
    venue_id: data.venue_id,
    org_id: data.org_id,
  };
}

/**
 * Update table capacity or number
 */
export async function updateTable(tableId, updates) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

  const payload = {};
  if (updates.tableNumber !== undefined) payload.table_number = String(updates.tableNumber).padStart(2, '0');
  if (updates.capacity !== undefined) payload.capacity = Number(updates.capacity);
  if (updates.status !== undefined) payload.status = updates.status;

  const { data, error } = await supabase
    .from('tables')
    .update(payload)
    .eq('id', tableId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete table (soft delete or hard delete)
 */
export async function deleteTable(tableId) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('tables')
    .update({ is_active: false })
    .eq('id', tableId);

  if (error) throw error;
  return true;
}
