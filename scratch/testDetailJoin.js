import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkhlfspdhsikfdwfxcgb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxraGxmc3BkaHNpa2Zkd2Z4Y2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODUzNDYsImV4cCI6MjEwNTU2MTM0Nn0.xR-NyrBGuM3QhHIV4-amuU2mG5DLKa7VBtT4omDI3qM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInvoiceDetailJoin() {
  const sessionId = '8d52fad1-e729-45e8-80cc-3fa1e7529136';
  const orgId = '3881999a-aea8-490d-977a-618dea52a7cc';
  const venueId = 'f692c434-7c67-4c00-af6a-e67bf46e824a';

  console.log('Inserting test invoice...');
  const { data: inv, error: insErr } = await supabase
    .from('invoices')
    .insert({
      org_id: orgId,
      venue_id: venueId,
      table_session_id: sessionId,
      invoice_number: 'INV-TEST-0001',
      subtotal: 1050,
      tax_amount: 42,
      discount_amount: 210,
      total_amount: 882,
    })
    .select()
    .single();

  if (insErr) {
    console.error('Insert error:', insErr);
    return;
  }

  console.log('Testing fetchInvoiceDetail join...');
  const { data: detail, error: detailErr } = await supabase
    .from('invoices')
    .select('*, table_sessions(*, tables(table_number), orders(*, order_items(*)))')
    .eq('id', inv.id)
    .single();

  console.log('Detail result:', detail ? 'SUCCESS' : 'NULL', 'error:', detailErr);
  if (detail) {
    console.log('Invoice number:', detail.invoice_number);
    console.log('Table number:', detail.table_sessions?.tables?.table_number);
    console.log('Orders found:', detail.table_sessions?.orders?.length);
    console.log('Order items found in order 0:', detail.table_sessions?.orders?.[0]?.order_items?.length);
  }

  // Clean up
  await supabase.from('invoices').delete().eq('id', inv.id);
  console.log('Test invoice deleted cleanly.');
}

testInvoiceDetailJoin();
