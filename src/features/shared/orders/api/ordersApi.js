import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// BroadcastChannel for instant cross-tab realtime sync
const syncChannel = typeof window !== 'undefined' && window.BroadcastChannel
  ? new BroadcastChannel('tablesuite_realtime_sync')
  : null;

function notifySync(type, payload) {
  if (syncChannel) {
    syncChannel.postMessage({ type, payload, timestamp: Date.now() });
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tablesuite_orders_change', { detail: { type, payload } }));
  }
}

/**
 * Pleasant Web Audio POS Order Alert Bell (Synthesizer Chime)
 */
export function playOrderAlertSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Note 1: E5 (659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Note 2: B5 (987Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.7);
  } catch (e) {
    // AudioContext autoplay restrictions or disabled
  }
}

/**
 * Fetch all orders for a venue from Supabase
 * @param {string} venueId
 * @returns {Promise<Array>}
 */
export async function fetchOrders(venueId) {
  if (!isSupabaseConfigured() || !venueId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        table_sessions(*, tables(*))
      `)
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders from Supabase:', error);
      return [];
    }

    return (data || []).map((o) => ({
      id: o.id,
      table_number: o.table_sessions?.tables?.table_number || '01',
      short_code: o.table_sessions?.tables?.short_code || '',
      round_number: o.round_number || 1,
      status: o.status,
      items: (o.order_items || []).map((it) => ({
        id: it.id,
        name: it.item_name || 'Item',
        price: Number(it.unit_price) || 0,
        qty: it.quantity || 1,
        station: it.station || 'hot',
        notes: it.notes || '',
      })),
      subtotal: Number(o.subtotal) || 0,
      tax: Number(o.tax_amount) || 0,
      total: Number(o.total_amount) || 0,
      payment_status: o.payment_status || 'pending',
      payment_method: o.payment_method || 'counter',
      guest_notes: o.guest_notes || '',
      created_at: o.created_at,
    }));
  } catch (err) {
    console.error('Failed to query Supabase orders:', err);
    return [];
  }
}

/**
 * Fetch orders for a specific table short code (for guest tracking)
 */
export async function fetchOrdersForTable(shortCode) {
  if (!isSupabaseConfigured() || !shortCode) {
    return [];
  }

  try {
    const { data: tableData } = await supabase
      .from('tables')
      .select('id, venue_id, table_number')
      .eq('short_code', shortCode)
      .single();

    if (!tableData) return [];

    const { data: session } = await supabase
      .from('table_sessions')
      .select('id')
      .eq('table_id', tableData.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!session) return [];

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('table_session_id', session.id)
      .order('created_at', { ascending: false });

    if (error || !orders) return [];

    return orders.map((o) => ({
      id: o.id,
      table_number: tableData.table_number,
      short_code: shortCode,
      round_number: o.round_number || 1,
      status: o.status,
      items: (o.order_items || []).map((it) => ({
        id: it.id,
        name: it.item_name || 'Item',
        price: Number(it.unit_price) || 0,
        qty: it.quantity || 1,
        station: it.station || 'hot',
        notes: it.notes || '',
      })),
      subtotal: Number(o.subtotal) || 0,
      tax: Number(o.tax_amount) || 0,
      total: Number(o.total_amount) || 0,
      payment_status: o.payment_status || 'pending',
      payment_method: o.payment_method || 'counter',
      guest_notes: o.guest_notes || '',
      created_at: o.created_at,
    }));
  } catch (err) {
    console.error('Error fetching table orders:', err);
    return [];
  }
}

/**
 * Place a new order from a guest table directly into Supabase
 */
export async function createOrder({
  shortCode,
  tableNumber = '01',
  items,
  subtotal,
  discountAmount = 0,
  couponCode = null,
  tax,
  total,
  paymentMethod = 'counter',
  paymentStatus = 'pending',
  guestNotes = '',
  venueId,
}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase database is not configured.');
  }

  // 1. Resolve table
  let targetVenueId = venueId;
  let targetTableId = null;

  if (shortCode) {
    const { data: tbl } = await supabase
      .from('tables')
      .select('id, venue_id, table_number')
      .eq('short_code', shortCode)
      .single();

    if (tbl) {
      targetTableId = tbl.id;
      targetVenueId = tbl.venue_id;
      tableNumber = tbl.table_number;
    }
  }

  if (!targetVenueId || !targetTableId) {
    throw new Error('Valid dining table not found for this QR code.');
  }

  // 2. Get or create active table session
  let { data: session } = await supabase
    .from('table_sessions')
    .select('id, org_id')
    .eq('table_id', targetTableId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!session) {
    // Get org_id from table
    const { data: tblInfo } = await supabase
      .from('tables')
      .select('org_id')
      .eq('id', targetTableId)
      .single();

    const { data: newSession, error: sessErr } = await supabase
      .from('table_sessions')
      .insert({
        org_id: tblInfo?.org_id,
        table_id: targetTableId,
        venue_id: targetVenueId,
        status: 'active',
      })
      .select()
      .single();

    if (sessErr) throw sessErr;
    session = newSession;

    // Update table status to in_service
    await supabase
      .from('tables')
      .update({ status: 'in_service' })
      .eq('id', targetTableId);
  }

  // 3. Determine round number
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('table_session_id', session.id);

  const nextRoundNumber = (count || 0) + 1;

  // Format notes to include coupon if applied
  const finalGuestNotes = couponCode
    ? `[Coupon: ${couponCode.toUpperCase()} (-₹${discountAmount})] ${guestNotes || ''}`.trim()
    : (guestNotes || '');

  // 4. Insert order
  const { data: createdOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      venue_id: targetVenueId,
      table_session_id: session.id,
      round_number: nextRoundNumber,
      status: 'placed',
      subtotal: Number(subtotal) || 0,
      tax_amount: Number(tax) || 0,
      total_amount: Number(total) || 0,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      guest_notes: finalGuestNotes,
    })
    .select()
    .single();

  if (orderErr) throw orderErr;

  // 4b. Update table session financial totals
  try {
    await supabase
      .from('table_sessions')
      .update({
        subtotal: Number(subtotal) || 0,
        tax_amount: Number(tax) || 0,
        discount_amount: Number(discountAmount) || 0,
        total_amount: Number(total) || 0,
      })
      .eq('id', session.id);
  } catch (sessUpdateErr) {
    console.warn('Could not update table session totals:', sessUpdateErr);
  }

  // 4c. If coupon applied, increment times_used in coupons table
  if (couponCode && targetVenueId) {
    try {
      const { data: cpn } = await supabase
        .from('coupons')
        .select('id, times_used')
        .eq('venue_id', targetVenueId)
        .ilike('code', couponCode.trim())
        .maybeSingle();

      if (cpn) {
        await supabase
          .from('coupons')
          .update({ times_used: (cpn.times_used || 0) + 1 })
          .eq('id', cpn.id);
      }
    } catch (couponUsageErr) {
      console.warn('Could not increment coupon usage count:', couponUsageErr);
    }
  }

  // 5. Insert order items
  if (items && items.length > 0) {
    const itemInserts = items.map((i) => ({
      order_id: createdOrder.id,
      menu_item_id: i.id && i.id.length > 20 ? i.id : null,
      item_name: i.name,
      unit_price: Number(i.price) || 0,
      quantity: Number(i.qty) || 1,
      station: i.station || 'hot',
      notes: i.notes || '',
      status: 'pending',
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(itemInserts);
    if (itemsErr) console.warn('Error inserting order items:', itemsErr);
  }

  // Play audio alert and notify cross-tab listeners
  playOrderAlertSound();
  notifySync('new_order', { id: createdOrder.id, venueId: targetVenueId });

  return {
    id: createdOrder.id,
    table_number: tableNumber,
    short_code: shortCode,
    round_number: nextRoundNumber,
    status: 'placed',
    items,
    subtotal,
    discount_amount: Number(discountAmount) || 0,
    coupon_code: couponCode,
    tax,
    total,
    payment_status: paymentStatus,
    payment_method: paymentMethod,
    guest_notes: finalGuestNotes,
    created_at: createdOrder.created_at,
  };
}

/**
 * Update order status (placed -> acknowledged -> cooking -> ready -> served -> completed)
 */
export async function updateOrderStatus(orderId, newStatus) {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
    throw error;
  }

  notifySync('order_status_updated', { id: orderId, status: newStatus });
  return true;
}

/**
 * Settle bill / Mark order as paid and complete
 */
export async function settleOrder(orderId, paymentMethod = 'counter') {
  if (!isSupabaseConfigured()) return;

  const { data: order, error } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      payment_status: 'paid',
      payment_method: paymentMethod,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('table_session_id')
    .single();

  if (error) {
    console.error('Error settling order:', error);
    throw error;
  }

  // Check if session has any other unsettled orders
  if (order?.table_session_id) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('table_session_id', order.table_session_id)
      .neq('status', 'completed')
      .neq('status', 'cancelled');

    if (count === 0) {
      // Settle session and free table
      const { data: sess } = await supabase
        .from('table_sessions')
        .update({ status: 'settled', settled_at: new Date().toISOString() })
        .eq('id', order.table_session_id)
        .select('table_id')
        .single();

      if (sess?.table_id) {
        await supabase
          .from('tables')
          .update({ status: 'free' })
          .eq('id', sess.table_id);
      }
    }
  }

  notifySync('order_settled', { id: orderId });
  return true;
}

/**
 * Compute real-time dashboard analytics from Supabase
 */
export async function getDashboardStats(venueId) {
  if (!isSupabaseConfigured() || !venueId) {
    return {
      todayGrossSales: 0,
      activeOrdersCount: 0,
      occupiedTablesCount: 0,
      totalTablesCount: 0,
      recentOrders: [],
    };
  }

  const [orders, { data: tables }] = await Promise.all([
    fetchOrders(venueId),
    supabase
      .from('tables')
      .select('id, status')
      .eq('venue_id', venueId)
      .eq('is_active', true),
  ]);

  const allTables = tables || [];
  const todayGrossSales = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const activeOrders = orders.filter(
    (o) =>
      o.status === 'placed' ||
      o.status === 'acknowledged' ||
      o.status === 'cooking' ||
      o.status === 'ready'
  );

  const occupiedTables = allTables.filter((t) => t.status === 'in_service' || t.status === 'occupied').length;

  return {
    todayGrossSales,
    activeOrdersCount: activeOrders.length,
    occupiedTablesCount: occupiedTables,
    totalTablesCount: allTables.length,
    recentOrders: orders.slice(0, 6),
  };
}

/**
 * Subscribe to real-time order updates via Supabase Realtime Channel
 */
export function subscribeToOrders(callback) {
  const handleEvent = () => {
    callback();
  };

  if (syncChannel) {
    syncChannel.onmessage = handleEvent;
  }
  window.addEventListener('tablesuite_orders_change', handleEvent);

  let supabaseChannel = null;
  if (isSupabaseConfigured()) {
    supabaseChannel = supabase
      .channel('orders_realtime_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        handleEvent
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener('tablesuite_orders_change', handleEvent);
    if (supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}
