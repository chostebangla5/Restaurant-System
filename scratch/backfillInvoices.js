import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkhlfspdhsikfdwfxcgb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxraGxmc3BkaHNpa2Zkd2Z4Y2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODUzNDYsImV4cCI6MjEwNTU2MTM0Nn0.xR-NyrBGuM3QhHIV4-amuU2mG5DLKa7VBtT4omDI3qM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function backfillInvoices() {
  console.log('--- Starting Backfill of Invoices for Settled Sessions ---');

  // 1. Fetch all settled sessions with orders and tables
  const { data: sessions, error: sessErr } = await supabase
    .from('table_sessions')
    .select('id, venue_id, org_id, status, subtotal, tax_amount, discount_amount, total_amount, opened_at, closed_at, created_at, tables(table_number), orders(id, subtotal, status, notes, created_at, order_items(id, item_name, quantity, price_at_order))')
    .eq('status', 'settled')
    .order('created_at', { ascending: true });

  if (sessErr) {
    console.error('Error fetching sessions:', sessErr);
    return;
  }

  // 2. Fetch existing invoices to avoid duplicates
  const { data: existingInvoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, table_session_id, invoice_number');

  if (invErr) {
    console.error('Error fetching invoices:', invErr);
    return;
  }

  const existingSessionIds = new Set((existingInvoices || []).map(i => i.table_session_id));
  console.log(`Found ${sessions.length} settled sessions, ${existingSessionIds.size} already invoiced.`);

  let invoiceCounter = 1;
  const toInsert = [];

  for (const s of sessions) {
    if (existingSessionIds.has(s.id)) {
      console.log(`Session ${s.id} already has invoice, skipping.`);
      continue;
    }

    // Filter served / non-cancelled orders
    const validOrders = (s.orders || []).filter(o => o.status !== 'cancelled');
    if (validOrders.length === 0) {
      console.log(`Session ${s.id} has NO valid orders (all cancelled), skipping.`);
      continue;
    }

    // Calculate subtotal from valid orders or items
    let subtotal = 0;
    let discount = 0;

    for (const ord of validOrders) {
      if (ord.order_items && ord.order_items.length > 0) {
        for (const item of ord.order_items) {
          subtotal += (Number(item.price_at_order) || 0) * (Number(item.quantity) || 1);
        }
      } else {
        subtotal += Number(ord.subtotal) || 0;
      }

      // Check notes for coupons: e.g. [Coupon: TASTY20 (-₹210)]
      const couponMatch = (ord.notes || '').match(/\[Coupon:[^\]]*-₹?([0-9.]+)\]/i);
      if (couponMatch && couponMatch[1]) {
        discount += parseFloat(couponMatch[1]) || 0;
      }
    }

    // Use session stored discount if larger
    if (Number(s.discount_amount) > discount) {
      discount = Number(s.discount_amount);
    }

    // Tax (5% GST: 2.5% CGST + 2.5% SGST)
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Math.round(taxableAmount * 0.05 * 100) / 100;
    const total = taxableAmount + tax;

    // Determine issue date
    const dateObj = new Date(s.closed_at || s.created_at || Date.now());
    const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
    const seqStr = String(invoiceCounter).padStart(4, '0');
    invoiceCounter++;
    const invoiceNumber = `INV-${dateStr}-${seqStr}`;

    toInsert.push({
      org_id: s.org_id,
      venue_id: s.venue_id,
      table_session_id: s.id,
      invoice_number: invoiceNumber,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: tax,
      discount_amount: Math.round(discount * 100) / 100,
      total_amount: Math.round(total * 100) / 100,
      issued_at: dateObj.toISOString(),
    });
  }

  console.log(`Preparing to insert ${toInsert.length} invoices:`);
  for (const inv of toInsert) {
    console.log(`- ${inv.invoice_number} | Table Session: ${inv.table_session_id} | Subtotal: ₹${inv.subtotal} | Tax: ₹${inv.tax_amount} | Discount: ₹${inv.discount_amount} | Total: ₹${inv.total_amount}`);
    const { error: insErr } = await supabase.from('invoices').insert(inv);
    if (insErr) {
      console.error(`Failed to insert invoice ${inv.invoice_number}:`, insErr);
    } else {
      console.log(`  ✓ Inserted ${inv.invoice_number}`);
    }
  }

  console.log('--- Backfill Complete ---');
}

backfillInvoices();
