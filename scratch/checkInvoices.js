import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkhlfspdhsikfdwfxcgb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxraGxmc3BkaHNpa2Zkd2Z4Y2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODUzNDYsImV4cCI6MjEwNTU2MTM0Nn0.xR-NyrBGuM3QhHIV4-amuU2mG5DLKa7VBtT4omDI3qM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkInvoices() {
  console.log('--- Testing query on invoices table ---');
  const { data: invData, error: invErr } = await supabase
    .from('invoices')
    .select('*, table_sessions(tables(table_number))')
    .limit(10);
  console.log('Invoices query result:', invData, 'error:', invErr);

  console.log('--- Testing query on table_sessions with settled status ---');
  const { data: sessData, error: sessErr } = await supabase
    .from('table_sessions')
    .select('*, tables(table_number), orders(*, order_items(*))')
    .eq('status', 'settled');
  console.log(`Found ${sessData?.length || 0} settled sessions`, 'error:', sessErr);
  if (sessData && sessData.length > 0) {
    console.log('Sample session:', JSON.stringify(sessData[0], null, 2));
  }

  console.log('--- Testing attempt to insert test invoice ---');
  if (sessData && sessData.length > 0) {
    const s = sessData[0];
    const testInv = {
      org_id: s.org_id,
      venue_id: s.venue_id,
      table_session_id: s.id,
      invoice_number: `TEST-INV-${Date.now()}`,
      subtotal: s.subtotal || 100,
      tax_amount: s.tax_amount || 5,
      discount_amount: s.discount_amount || 0,
      total_amount: s.total_amount || 105,
    };
    const { data: inserted, error: insErr } = await supabase
      .from('invoices')
      .insert(testInv)
      .select();
    console.log('Insert test invoice result:', inserted, 'error:', insErr);
    if (inserted && inserted[0]) {
      // Clean up test invoice
      await supabase.from('invoices').delete().eq('id', inserted[0].id);
      console.log('Test invoice deleted cleanly');
    }
  }
}

checkInvoices();
