import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Fetch all invoices for a venue
 */
export async function fetchInvoices(venueId, { search = '', dateFrom = '', dateTo = '' } = {}) {
  let query = supabase
    .from('invoices')
    .select('*, table_sessions(customer_name, customer_phone, tables(table_number))')
    .eq('venue_id', venueId)
    .order('issued_at', { ascending: false });

  if (search.trim()) {
    query = query.ilike('invoice_number', `%${search}%`);
  }
  if (dateFrom) {
    query = query.gte('issued_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('issued_at', dateTo + 'T23:59:59Z');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single invoice with full details
 */
export async function fetchInvoiceDetail(invoiceId) {
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('*, table_sessions(*, tables(table_number), orders(*, order_items(*)))')
    .eq('id', invoiceId)
    .single();

  if (invError) throw invError;
  return invoice;
}

/**
 * Create a new invoice from a settled session (idempotent)
 */
/**
 * Create a new invoice from a settled session (idempotent and atomic)
 */
export async function createInvoice({ orgId, venueId, sessionId, subtotal, taxAmount, discountAmount, totalAmount }) {
  if (!sessionId) throw new Error('Session ID is required to create an invoice.');

  // 1. Try atomic PostgreSQL RPC with sequence generator
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_session_invoice', {
      p_session_id: sessionId,
      p_venue_id: venueId,
      p_org_id: orgId,
      p_subtotal: Number(subtotal) || 0,
      p_tax_amount: Number(taxAmount) || 0,
      p_discount_amount: Number(discountAmount) || 0,
      p_total_amount: Number(totalAmount) || 0,
    });

    if (!rpcErr && rpcRes && rpcRes.success && rpcRes.invoice) {
      return rpcRes.invoice;
    }
  } catch (rpcErr) {
    if (rpcErr?.message && !rpcErr.message.includes('function') && !rpcErr.message.includes('not found')) {
      throw rpcErr;
    }
  }

  // 2. Fallback check-then-act with unique index protection
  const { data: existing } = await supabase
    .from('invoices')
    .select('*')
    .eq('table_session_id', sessionId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Generate invoice number: INV-YYYYMMDD-XXXX-RAND
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venueId);
  const seq = String((count || 0) + 1).padStart(4, '0');
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  const invoiceNumber = `INV-${dateStr}-${seq}-${rand}`;

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      org_id: orgId,
      venue_id: venueId,
      table_session_id: sessionId,
      invoice_number: invoiceNumber,
      subtotal: Math.round(Number(subtotal) * 100) / 100,
      tax_amount: Math.round(Number(taxAmount) * 100) / 100,
      discount_amount: Math.round(Number(discountAmount || 0) * 100) / 100,
      total_amount: Math.round(Number(totalAmount) * 100) / 100,
      issued_at: now.toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: dup } = await supabase
        .from('invoices')
        .select('*')
        .eq('table_session_id', sessionId)
        .maybeSingle();
      if (dup) return dup;
    }
    throw error;
  }
  return data;
}

/**
 * Get aggregate invoice stats for a venue (scoped to today and totals)
 */
export async function fetchInvoiceStats(venueId) {
  if (!venueId || !isSupabaseConfigured()) {
    return { totalRevenue: 0, totalInvoices: 0, avgBill: 0, todayCount: 0, todayRevenue: 0 };
  }

  // Calculate IST Date (UTC + 5:30) for today's start
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const now = new Date();
  const istNow = new Date(now.getTime() + istOffsetMs);
  const todayIST = istNow.toISOString().slice(0, 10);
  const todayStartUTC = new Date(new Date(`${todayIST}T00:00:00Z`).getTime() - istOffsetMs).toISOString();

  // Run today's invoices query and total count query in parallel
  const [todayRes, countRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, total_amount')
      .eq('venue_id', venueId)
      .gte('issued_at', todayStartUTC),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId),
  ]);

  const todayInvoices = todayRes.data || [];
  const totalCount = countRes.count || 0;
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
  const todayCount = todayInvoices.length;

  return {
    totalRevenue: todayRevenue, // accurate today revenue
    totalInvoices: totalCount,
    avgBill: todayCount > 0 ? todayRevenue / todayCount : 0,
    todayCount,
    todayRevenue,
  };
}

/**
 * Subscribe to real-time invoice and settlement events
 */
export function subscribeToInvoices(callback) {
  const handleEvent = () => {
    callback();
  };

  const syncChannel = typeof window !== 'undefined' && window.BroadcastChannel
    ? new BroadcastChannel('tablesuite_realtime_sync')
    : null;

  if (syncChannel) {
    syncChannel.onmessage = handleEvent;
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('tablesuite_orders_change', handleEvent);
  }

  let supabaseChannel = null;
  if (isSupabaseConfigured()) {
    supabaseChannel = supabase
      .channel('invoices_realtime_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        handleEvent
      )
      .subscribe();
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('tablesuite_orders_change', handleEvent);
    }
    if (syncChannel) {
      syncChannel.close();
    }
    if (supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}
