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

    return (data || []).map((o) => {
      const isSettled = (o.status === 'completed' || o.table_sessions?.status === 'settled') && o.status !== 'cancelled';
      const roundSubtotal = Number(o.subtotal) || 0;
      return {
        id: o.id,
        table_number: o.table_sessions?.tables?.table_number || '01',
        short_code: o.table_sessions?.tables?.short_code || '',
        round_number: o.round_number || 1,
        status: o.status === 'cancelled' ? 'cancelled' : (isSettled ? 'completed' : o.status),
        items: (o.order_items || []).map((it) => ({
          id: it.id,
          name: it.item_name || 'Item',
          price: Number(it.price_at_order ?? it.unit_price) || 0,
          qty: it.quantity || 1,
          station: it.station || 'hot',
          notes: it.customization_notes || it.notes || '',
        })),
        subtotal: roundSubtotal,
        tax: Number(o.table_sessions?.tax_amount) || 0,
        total: roundSubtotal,
        payment_status: o.status === 'cancelled' ? 'cancelled' : (isSettled ? 'paid' : 'pending'),
        payment_method: 'counter',
        guest_notes: o.notes || '',
        placed_at: o.placed_at,
        cooking_at: o.cooking_at,
        ready_at: o.ready_at,
        served_at: o.served_at,
        created_at: o.created_at,
      };
    });
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
      .select('id, subtotal, tax_amount, discount_amount, total_amount, status, created_at')
      .eq('table_id', tableData.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) return [];

    // If session is settled and older than 6 hours, return empty for new session
    if (session.status === 'settled') {
      const ageHours = (Date.now() - new Date(session.created_at).getTime()) / (1000 * 60 * 60);
      if (ageHours > 6) return [];
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('table_session_id', session.id)
      .order('created_at', { ascending: false });

    if (error || !orders) return [];

    const isSessionSettled = session.status === 'settled';

    return orders.map((o) => {
      const isSettled = (isSessionSettled || o.status === 'completed') && o.status !== 'cancelled';
      const roundSubtotal = Number(o.subtotal) || 0;
      return {
        id: o.id,
        table_number: tableData.table_number,
        short_code: shortCode,
        round_number: o.round_number || 1,
        status: o.status === 'cancelled' ? 'cancelled' : (isSettled ? 'completed' : o.status),
        items: (o.order_items || []).map((it) => ({
          id: it.id,
          name: it.item_name || 'Item',
          price: Number(it.price_at_order ?? it.unit_price) || 0,
          qty: it.quantity || 1,
          station: it.station || 'hot',
          notes: it.customization_notes || it.notes || '',
        })),
        subtotal: roundSubtotal,
        tax: Number(session.tax_amount) || 0,
        total: roundSubtotal,
        payment_status: o.status === 'cancelled' ? 'cancelled' : (isSettled ? 'paid' : 'pending'),
        payment_method: 'counter',
        guest_notes: o.notes || '',
        created_at: o.created_at,
      };
    });
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
  let targetOrgId = null;

  if (shortCode) {
    const { data: tbl } = await supabase
      .from('tables')
      .select('id, venue_id, org_id, table_number')
      .eq('short_code', shortCode)
      .single();

    if (tbl) {
      targetTableId = tbl.id;
      targetVenueId = tbl.venue_id;
      targetOrgId = tbl.org_id;
      tableNumber = tbl.table_number;
    }
  }

  if (!targetVenueId || !targetTableId) {
    throw new Error('Valid dining table not found for this QR code.');
  }

  // If org_id is missing, resolve from table or venue
  if (!targetOrgId) {
    const { data: tblInfo } = await supabase
      .from('tables')
      .select('org_id')
      .eq('id', targetTableId)
      .single();
    targetOrgId = tblInfo?.org_id;

    if (!targetOrgId) {
      const { data: venInfo } = await supabase
        .from('venues')
        .select('org_id')
        .eq('id', targetVenueId)
        .single();
      targetOrgId = venInfo?.org_id;
    }
  }

  // 2. Get or create open table session
  let { data: session } = await supabase
    .from('table_sessions')
    .select('id, org_id, venue_id')
    .eq('table_id', targetTableId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    const { data: newSession, error: sessErr } = await supabase
      .from('table_sessions')
      .insert({
        org_id: targetOrgId,
        table_id: targetTableId,
        venue_id: targetVenueId,
        status: 'open',
        subtotal: Number(subtotal) || 0,
        tax_amount: Number(tax) || 0,
        discount_amount: Number(discountAmount) || 0,
        total_amount: Number(total) || 0,
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
  } else {
    // Update session financial totals
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
      org_id: session.org_id || targetOrgId,
      venue_id: targetVenueId,
      table_session_id: session.id,
      round_number: nextRoundNumber,
      status: 'placed',
      notes: finalGuestNotes,
      subtotal: Number(subtotal) || 0,
    })
    .select()
    .single();

  if (orderErr) throw orderErr;

  // 4b. If coupon applied, increment times_used in coupons table
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
      item_name: i.name || 'Item',
      price_at_order: Number(i.price) || 0,
      quantity: Number(i.qty) || 1,
      station: (i.station && ['hot', 'cold', 'bar'].includes(i.station)) ? i.station : 'hot',
      customization_notes: i.notes || '',
      status: 'pending',
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(itemInserts);
    if (itemsErr) {
      console.warn('Error inserting order items:', itemsErr);
    }
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
 * Update order status (placed -> acknowledged -> cooking -> ready -> served -> cancelled)
 */
export async function updateOrderStatus(orderId, newStatus) {
  if (!isSupabaseConfigured()) return;

  const validStatuses = ['placed', 'acknowledged', 'cooking', 'ready', 'served', 'cancelled'];
  const statusToSave = validStatuses.includes(newStatus) ? newStatus : (newStatus === 'completed' ? 'served' : 'placed');

  const updateFields = {
    status: statusToSave,
    updated_at: new Date().toISOString(),
  };

  if (statusToSave === 'acknowledged') updateFields.acknowledged_at = new Date().toISOString();
  if (statusToSave === 'cooking') updateFields.cooking_at = new Date().toISOString();
  if (statusToSave === 'ready') updateFields.ready_at = new Date().toISOString();
  if (statusToSave === 'served') updateFields.served_at = new Date().toISOString();

  const { error } = await supabase
    .from('orders')
    .update(updateFields)
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
    throw error;
  }

  notifySync('order_status_updated', { id: orderId, status: statusToSave });
  return true;
}

/**
 * Securely cancel an order (guest or staff initiated)
 * Validates table authorization, protects against cancelling orders already in preparation,
 * recalculates session totals, and notifies KDS & Live Orders in real time.
 */
export async function cancelOrder(orderId, shortCode = null, reason = 'Cancelled by guest') {
  if (!isSupabaseConfigured() || !orderId) {
    throw new Error('Database connection is not configured.');
  }

  // 1. Fetch order details with session and table
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      subtotal,
      notes,
      table_session_id,
      venue_id,
      table_sessions (
        id,
        status,
        table_id,
        tables (
          id,
          short_code,
          table_number
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    console.error('Error fetching order for cancellation:', fetchErr);
    throw new Error('Order not found.');
  }

  // 2. Validate table ownership if shortCode is provided
  if (shortCode && order.table_sessions?.tables?.short_code) {
    if (order.table_sessions.tables.short_code.toUpperCase() !== shortCode.toUpperCase()) {
      throw new Error('Unauthorized: This order does not belong to your table.');
    }
  }

  // 3. Status Guard: Non-vulnerable check
  // Cannot cancel if food is already being cooked, ready, served, or completed
  if (['cooking', 'ready', 'served', 'completed'].includes(order.status)) {
    throw new Error(
      `Cannot cancel this order because the kitchen has already started preparing it (${order.status.toUpperCase()}). Please speak directly with restaurant staff.`
    );
  }

  if (order.status === 'cancelled') {
    return true; // Already cancelled
  }

  // 4. Update order status to 'cancelled'
  const cancellationNote = order.notes
    ? `${order.notes} [${reason}]`.trim()
    : `[${reason}]`;

  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      notes: cancellationNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateErr) {
    console.error('Failed to update order status to cancelled:', updateErr);
    throw new Error(updateErr.message || 'Failed to cancel order.');
  }

  // 5. Recalculate session financial totals based on remaining active orders
  if (order.table_session_id) {
    try {
      const { data: remainingOrders } = await supabase
        .from('orders')
        .select('id, subtotal, status')
        .eq('table_session_id', order.table_session_id)
        .neq('status', 'cancelled');

      const activeOrders = remainingOrders || [];
      const newSubtotal = activeOrders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);

      if (activeOrders.length === 0) {
        // If ALL orders at this table are now cancelled, free the table and close session
        await supabase
          .from('table_sessions')
          .update({
            status: 'cancelled',
            subtotal: 0,
            tax_amount: 0,
            discount_amount: 0,
            total_amount: 0,
            closed_at: new Date().toISOString(),
          })
          .eq('id', order.table_session_id);

        if (order.table_sessions?.table_id) {
          await supabase
            .from('tables')
            .update({ status: 'free' })
            .eq('id', order.table_sessions.table_id);
        }
      } else {
        // Recalculate active session totals
        await supabase
          .from('table_sessions')
          .update({
            subtotal: newSubtotal,
            total_amount: newSubtotal,
          })
          .eq('id', order.table_session_id);
      }
    } catch (calcErr) {
      console.warn('Error adjusting session after cancellation:', calcErr);
    }
  }

  // 6. Broadcast realtime sync event to Live Orders, Kitchen KDS, and Table displays
  notifySync('order_status_updated', {
    id: orderId,
    status: 'cancelled',
    venueId: order.venue_id,
  });

  return true;
}

/**
 * Settle bill / Mark order as paid and complete
 */
export async function settleOrder(orderId, paymentMethod = 'counter') {
  if (!isSupabaseConfigured()) return;

  const validMethod = ['cash', 'card', 'upi', 'online'].includes(paymentMethod)
    ? paymentMethod
    : 'cash';

  // 1. Fetch order details
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, table_session_id, venue_id, org_id, subtotal, status')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    console.error('Error fetching order for settle:', fetchErr);
    throw fetchErr || new Error('Order not found');
  }

  // 2. Mark this order (and any other uncancelled orders in this session) as 'served'
  if (order.table_session_id) {
    await supabase
      .from('orders')
      .update({
        status: 'served',
        updated_at: new Date().toISOString(),
      })
      .eq('table_session_id', order.table_session_id)
      .neq('status', 'cancelled');
  } else {
    await supabase
      .from('orders')
      .update({
        status: 'served',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }

  // 3. Settle session and free table
  if (order.table_session_id) {
    const { data: sess, error: sessErr } = await supabase
      .from('table_sessions')
      .update({ status: 'settled', closed_at: new Date().toISOString() })
      .eq('id', order.table_session_id)
      .select('table_id, org_id, venue_id, total_amount, subtotal')
      .single();

    if (sessErr) {
      console.warn('Could not update table session to settled:', sessErr);
    }

    if (sess?.table_id) {
      await supabase
        .from('tables')
        .update({ status: 'free' })
        .eq('id', sess.table_id);
    }

    // Record payment in payments table
    try {
      await supabase.from('payments').insert({
        org_id: sess?.org_id || order.org_id,
        venue_id: sess?.venue_id || order.venue_id,
        table_session_id: order.table_session_id,
        amount: Number(sess?.total_amount || sess?.subtotal || order.subtotal) || 0,
        payment_method: validMethod,
        status: 'completed',
      });
    } catch (payErr) {
      console.warn('Could not insert payment record:', payErr);
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
      avgKitchenTurnaround: '--',
      turnaroundTrend: 'No turnaround data yet',
    };
  }

  const [orders, { data: tables }] = await Promise.all([
    fetchOrders(venueId),
    supabase
      .from('tables')
      .select('id, table_number, status')
      .eq('venue_id', venueId)
      .eq('is_active', true),
  ]);

  const allTables = tables || [];

  // 1. Gross sales from all non-cancelled orders today
  const todayGrossSales = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);

  // 2. Active orders count in kitchen queue
  const activeOrders = orders.filter(
    (o) =>
      o.status === 'placed' ||
      o.status === 'acknowledged' ||
      o.status === 'cooking' ||
      o.status === 'ready'
  );

  // 3. Occupied tables count (active dining sessions)
  const activeTableNumbers = new Set(
    orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'completed')
      .map((o) => String(o.table_number))
  );

  const occupiedTables = allTables.filter(
    (t) =>
      t.status === 'in_service' ||
      t.status === 'occupied' ||
      activeTableNumbers.has(String(t.table_number))
  ).length;

  // 4. Compute real-time average kitchen turnaround duration
  const turnaroundTimesSec = [];
  for (const o of orders) {
    if (['ready', 'served', 'completed'].includes(o.status)) {
      const startTime = o.cooking_at || o.placed_at || o.created_at;
      const endTime = o.ready_at || o.served_at;
      if (startTime && endTime) {
        const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
        const diffSec = Math.round(diffMs / 1000);
        if (diffSec > 0 && diffSec < 86400) {
          turnaroundTimesSec.push(diffSec);
        }
      }
    }
  }

  let avgKitchenTurnaround = '--';
  let turnaroundTrend = 'No completed tickets yet';
  if (turnaroundTimesSec.length > 0) {
    const avgSec = Math.round(
      turnaroundTimesSec.reduce((a, b) => a + b, 0) / turnaroundTimesSec.length
    );
    if (avgSec < 60) {
      avgKitchenTurnaround = `${avgSec}s`;
    } else {
      const mins = Math.floor(avgSec / 60);
      const secs = avgSec % 60;
      avgKitchenTurnaround = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    turnaroundTrend = `Live speed based on ${turnaroundTimesSec.length} ticket${turnaroundTimesSec.length > 1 ? 's' : ''}`;
  }

  return {
    todayGrossSales,
    activeOrdersCount: activeOrders.length,
    occupiedTablesCount: occupiedTables,
    totalTablesCount: allTables.length || 6,
    avgKitchenTurnaround,
    turnaroundTrend,
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_sessions' },
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
