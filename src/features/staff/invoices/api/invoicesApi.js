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
export async function createInvoice({ orgId, venueId, sessionId, subtotal, taxAmount, discountAmount, totalAmount }) {
  // Check if invoice already exists for this table session
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

  if (error) throw error;
  return data;
}

/**
 * Get aggregate invoice stats for a venue
 */
export async function fetchInvoiceStats(venueId) {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, total_amount, issued_at')
    .eq('venue_id', venueId);

  if (error) throw error;
  if (!invoices || invoices.length === 0) {
    return { totalRevenue: 0, totalInvoices: 0, avgBill: 0, todayCount: 0, todayRevenue: 0 };
  }

  // Calculate IST Date (UTC + 5:30) for today's invoices
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const todayIST = new Date(Date.now() + istOffsetMs).toISOString().slice(0, 10);

  const todayInvoices = invoices.filter((inv) => {
    if (!inv.issued_at) return false;
    const invDateIST = new Date(new Date(inv.issued_at).getTime() + istOffsetMs).toISOString().slice(0, 10);
    return invDateIST === todayIST;
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

  return {
    totalRevenue,
    totalInvoices: invoices.length,
    avgBill: invoices.length > 0 ? totalRevenue / invoices.length : 0,
    todayCount: todayInvoices.length,
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
