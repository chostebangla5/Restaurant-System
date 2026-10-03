import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkhlfspdhsikfdwfxcgb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxraGxmc3BkaHNpa2Zkd2Z4Y2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODUzNDYsImV4cCI6MjEwNTU2MTM0Nn0.xR-NyrBGuM3QhHIV4-amuU2mG5DLKa7VBtT4omDI3qM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQueryWithCustomer() {
  const venueId = 'f692c434-7c67-4c00-af6a-e67bf46e824a';
  const { data, error } = await supabase
    .from('invoices')
    .select('*, table_sessions(customer_name, customer_phone, tables(table_number))')
    .eq('venue_id', venueId)
    .order('issued_at', { ascending: false });

  console.log('Result count:', data?.length, 'Error:', error);
  if (data && data.length > 0) {
    console.log('First invoice:', JSON.stringify(data[0], null, 2));
  }
}

testQueryWithCustomer();
