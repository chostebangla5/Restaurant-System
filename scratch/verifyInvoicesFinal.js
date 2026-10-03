import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkhlfspdhsikfdwfxcgb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxraGxmc3BkaHNpa2Zkd2Z4Y2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODUzNDYsImV4cCI6MjEwNTU2MTM0Nn0.xR-NyrBGuM3QhHIV4-amuU2mG5DLKa7VBtT4omDI3qM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyAll() {
  const venueId = 'f692c434-7c67-4c00-af6a-e67bf46e824a';
  
  console.log('=== 1. INVOICE LIST ===');
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('*, table_sessions(customer_name, customer_phone, tables(table_number))')
    .eq('venue_id', venueId)
    .order('issued_at', { ascending: false });

  console.log(`Total Invoices: ${invoices?.length}, Error: ${invErr}`);
  invoices?.forEach((inv, i) => {
    const cust = inv.table_sessions?.customer_name ? `${inv.table_sessions.customer_name} (${inv.table_sessions.customer_phone})` : 'Dine-in Guest';
    console.log(`[${i+1}] ${inv.invoice_number} | Table: T-${inv.table_sessions?.tables?.table_number} | Guest: ${cust} | Subtotal: ₹${inv.subtotal} | Tax: ₹${inv.tax_amount} | Discount: ₹${inv.discount_amount} | Total: ₹${inv.total_amount}`);
  });

  console.log('\n=== 2. STATS CALCULATION ===');
  const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const todayIST = new Date(Date.now() + istOffsetMs).toISOString().slice(0, 10);
  const todayInvoices = invoices.filter(inv => {
    const d = new Date(new Date(inv.issued_at).getTime() + istOffsetMs).toISOString().slice(0, 10);
    return d === todayIST;
  });
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

  console.log(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);
  console.log(`Total Invoices: ${invoices.length}`);
  console.log(`Average Bill: ₹${(totalRevenue / invoices.length).toFixed(2)}`);
  console.log(`Today Count: ${todayInvoices.length} (Revenue: ₹${todayRevenue.toFixed(2)})`);

  console.log('\n=== 3. INVOICE DETAIL MODAL TEST ===');
  const firstInvId = invoices[0].id;
  const { data: detail, error: detErr } = await supabase
    .from('invoices')
    .select('*, table_sessions(*, tables(table_number), orders(*, order_items(*)))')
    .eq('id', firstInvId)
    .single();

  console.log('Detail fetched successfully:', Boolean(detail), 'Error:', detErr);
  console.log('Invoice #:', detail.invoice_number);
  console.log('Customer:', detail.table_sessions?.customer_name, detail.table_sessions?.customer_phone);
  console.log('Table:', detail.table_sessions?.tables?.table_number);
  const items = [];
  detail.table_sessions?.orders?.forEach(o => {
    if (o.status !== 'cancelled' && o.order_items) {
      items.push(...o.order_items);
    }
  });
  console.log(`Line items count: ${items.length}`);
  items.forEach(it => {
    console.log(` - ${it.quantity}x ${it.item_name} @ ₹${it.price_at_order} = ₹${it.price_at_order * it.quantity}`);
  });
  console.log(`Subtotal: ₹${detail.subtotal} | Tax: ₹${detail.tax_amount} | Grand Total: ₹${detail.total_amount}`);
}

verifyAll();
