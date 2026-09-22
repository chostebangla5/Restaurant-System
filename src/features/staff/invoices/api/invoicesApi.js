import { supabase } from '@/lib/supabase';

/**
 * Fetch all invoices for a venue
 */
export async function fetchInvoices(venueId, { search = '', dateFrom = '', dateTo = '' } = {}) {
  let query = supabase
    .from('invoices')
    .select('*, table_sessions(tables(table_number))')
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
 * Create a new invoice from a settled session
 */
export async function createInvoice({ orgId, venueId, sessionId, subtotal, taxAmount, discountAmount, totalAmount }) {
  // Generate invoice number: INV-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const invoiceNumber = `INV-${dateStr}-${rand}`;

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      org_id: orgId,
      venue_id: venueId,
      table_session_id: sessionId,
      invoice_number: invoiceNumber,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount || 0,
      total_amount: totalAmount,
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

  const today = new Date().toISOString().slice(0, 10);
  const todayInvoices = invoices.filter((inv) => inv.issued_at?.startsWith(today));

  const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

  return {
    totalRevenue,
    totalInvoices: invoices.length,
    avgBill: totalRevenue / invoices.length,
    todayCount: todayInvoices.length,
    todayRevenue,
  };
}
