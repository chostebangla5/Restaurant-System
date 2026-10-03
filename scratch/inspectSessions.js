import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkhlfspdhsikfdwfxcgb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxraGxmc3BkaHNpa2Zkd2Z4Y2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODUzNDYsImV4cCI6MjEwNTU2MTM0Nn0.xR-NyrBGuM3QhHIV4-amuU2mG5DLKa7VBtT4omDI3qM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSessions() {
  const { data: sessions, error } = await supabase
    .from('table_sessions')
    .select('id, venue_id, org_id, status, subtotal, tax_amount, discount_amount, total_amount, opened_at, closed_at, created_at, tables(table_number), orders(id, subtotal, status, notes, order_items(id, item_name, quantity, price_at_order))')
    .eq('status', 'settled')
    .order('created_at', { ascending: false });

  console.log(`Found ${sessions?.length} settled sessions:`);
  sessions?.forEach((s, idx) => {
    console.log(`\n[${idx + 1}] Session ID: ${s.id}`);
    console.log(`Table: ${s.tables?.table_number}, Venue: ${s.venue_id}, Org: ${s.org_id}`);
    console.log(`Session financials: subtotal=${s.subtotal}, tax=${s.tax_amount}, discount=${s.discount_amount}, total=${s.total_amount}`);
    console.log(`Orders count: ${s.orders?.length}`);
    s.orders?.forEach(o => {
      console.log(`  Order ${o.id}: status=${o.status}, subtotal=${o.subtotal}, items=${o.order_items?.length}, notes=${o.notes}`);
    });
  });
}

inspectSessions();
