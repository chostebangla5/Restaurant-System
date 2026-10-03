import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkhlfspdhsikfdwfxcgb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxraGxmc3BkaHNpa2Zkd2Z4Y2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODUzNDYsImV4cCI6MjEwNTU2MTM0Nn0.xR-NyrBGuM3QhHIV4-amuU2mG5DLKa7VBtT4omDI3qM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOrderSessionInvoice() {
  const venueId = 'f692c434-7c67-4c00-af6a-e67bf46e824a';
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      table_session_id,
      table_sessions(id, status, tables(table_number), invoices(invoice_number))
    `)
    .eq('venue_id', venueId)
    .limit(5);

  console.log('Error:', error);
  console.log('Sample order session invoice:', JSON.stringify(data, null, 2));
}

testOrderSessionInvoice();
