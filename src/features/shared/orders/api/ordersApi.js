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
 * Helper to parse payment method and split details from order notes
 */
export function parsePaymentDetails(notes) {
  if (!notes) {
    return { method: 'counter', isSplit: false, onlineAmount: 0, cashAmount: 0, summary: 'Cash / Counter' };
  }
  const splitMatch = notes.match(/\[Payment:\s*Split\s*\|\s*Online:\s*₹?([\d,.]+)\s*\|\s*Cash:\s*₹?([\d,.]+)\]/i);
  if (splitMatch) {
    const online = parseFloat(splitMatch[1].replace(/,/g, '')) || 0;
    const cash = parseFloat(splitMatch[2].replace(/,/g, '')) || 0;
    return {
      method: 'split',
      isSplit: true,
      onlineAmount: online,
      cashAmount: cash,
      summary: `Split (₹${online} Online + ₹${cash} Cash)`,
    };
  }
  if (/\[Payment:\s*(online|upi|card)\]/i.test(notes) || notes.toLowerCase().includes('online') || notes.toLowerCase().includes('upi')) {
    return { method: 'online', isSplit: false, onlineAmount: 0, cashAmount: 0, summary: 'Online / UPI' };
  }
  if (/\[Payment:\s*(cash|counter)\]/i.test(notes) || notes.toLowerCase().includes('cash')) {
    return { method: 'counter', isSplit: false, onlineAmount: 0, cashAmount: 0, summary: 'Cash Counter' };
  }
  return { method: 'counter', isSplit: false, onlineAmount: 0, cashAmount: 0, summary: 'Counter' };
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
      const payInfo = parsePaymentDetails(o.notes);

      let paymentStatus = o.status === 'cancelled' ? 'cancelled' : (isSettled ? 'paid' : 'pending');
      // If split payment and not fully settled yet, mark as partially_paid
      if (payInfo.isSplit && !isSettled && o.status !== 'cancelled') {
        paymentStatus = 'partially_paid';
      }

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
        payment_status: paymentStatus,
        payment_method: payInfo.method,
        split_details: payInfo.isSplit ? { online: payInfo.onlineAmount, cash: payInfo.cashAmount } : null,
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
      const payInfo = parsePaymentDetails(o.notes);

      let paymentStatus = o.status === 'cancelled' ? 'cancelled' : (isSettled ? 'paid' : 'pending');
      if (payInfo.isSplit && !isSettled && o.status !== 'cancelled') {
        paymentStatus = 'partially_paid';
      }

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
        payment_status: paymentStatus,
        payment_method: payInfo.method,
        split_details: payInfo.isSplit ? { online: payInfo.onlineAmount, cash: payInfo.cashAmount } : null,
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
  splitDetails = null,
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

  // Format notes to include coupon and split/payment info if applied
  const couponTag = couponCode ? `[Coupon: ${couponCode.toUpperCase()} (-₹${discountAmount})]` : '';
  let paymentTag = '';
  if (paymentMethod === 'split' && splitDetails) {
    paymentTag = `[Payment: Split | Online: ₹${splitDetails.onlineAmount} | Cash: ₹${splitDetails.cashAmount}]`;
  } else if (paymentMethod === 'online') {
    paymentTag = `[Payment: Online]`;
  } else if (paymentMethod === 'counter' || paymentMethod === 'cash') {
    paymentTag = `[Payment: Cash]`;
  }

  const finalGuestNotes = [couponTag, paymentTag, guestNotes].filter(Boolean).join(' ').trim();

  // Determine effective status
  const effectivePaymentStatus = paymentMethod === 'split' ? 'partially_paid' : paymentStatus;

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

  // 4a. If split payment, record online portion in payments table
  if (paymentMethod === 'split' && splitDetails?.onlineAmount > 0) {
    try {
      await supabase.from('payments').insert({
        org_id: session.org_id || targetOrgId,
        venue_id: targetVenueId,
        table_session_id: session.id,
        amount: Number(splitDetails.onlineAmount) || 0,
        payment_method: 'upi',
        status: 'completed',
      });
    } catch (payErr) {
      console.warn('Could not insert part payment record:', payErr);
    }
  }

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
    payment_status: effectivePaymentStatus,
    payment_method: paymentMethod,
    split_details: splitDetails,
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
export async function settleOrder(orderId, paymentMethod = 'counter', splitDetails = null) {
  if (!isSupabaseConfigured()) return;

  // 1. Fetch order details
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, table_session_id, venue_id, org_id, subtotal, status, notes')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    console.error('Error fetching order for settle:', fetchErr);
    throw fetchErr || new Error('Order not found');
  }

  let finalNotes = order.notes || '';
  if ((paymentMethod === 'split' || splitDetails) && splitDetails) {
    const splitTag = `[Payment: Split | Online: ₹${splitDetails.onlineAmount} | Cash: ₹${splitDetails.cashAmount}]`;
    finalNotes = finalNotes.replace(/\[Payment:[^\]]+\]/gi, '').trim() + ' ' + splitTag;
    finalNotes = finalNotes.trim();
  } else if (paymentMethod === 'online' || paymentMethod === 'upi') {
    finalNotes = finalNotes.replace(/\[Payment:[^\]]+\]/gi, '').trim() + ' [Payment: Online]';
    finalNotes = finalNotes.trim();
  } else if (paymentMethod === 'counter' || paymentMethod === 'cash') {
    finalNotes = finalNotes.replace(/\[Payment:[^\]]+\]/gi, '').trim() + ' [Payment: Cash]';
    finalNotes = finalNotes.trim();
  }

  // 2. Mark this order (and any other uncancelled orders in this session) as 'served' with updated notes
  if (order.table_session_id) {
    await supabase
      .from('orders')
      .update({
        status: 'served',
        notes: finalNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('table_session_id', order.table_session_id)
      .neq('status', 'cancelled');
  } else {
    await supabase
      .from('orders')
      .update({
        status: 'served',
        notes: finalNotes,
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
      if ((paymentMethod === 'split' || splitDetails) && splitDetails) {
        if (splitDetails.onlineAmount > 0) {
          await supabase.from('payments').insert({
            org_id: sess?.org_id || order.org_id,
            venue_id: sess?.venue_id || order.venue_id,
            table_session_id: order.table_session_id,
            amount: Number(splitDetails.onlineAmount) || 0,
            payment_method: 'upi',
            status: 'completed',
          });
        }
        if (splitDetails.cashAmount > 0) {
          await supabase.from('payments').insert({
            org_id: sess?.org_id || order.org_id,
            venue_id: sess?.venue_id || order.venue_id,
            table_session_id: order.table_session_id,
            amount: Number(splitDetails.cashAmount) || 0,
            payment_method: 'cash',
            status: 'completed',
          });
        }
      } else {
        const validMethod = ['cash', 'card', 'upi', 'online'].includes(paymentMethod)
          ? paymentMethod
          : 'cash';
        await supabase.from('payments').insert({
          org_id: sess?.org_id || order.org_id,
          venue_id: sess?.venue_id || order.venue_id,
          table_session_id: order.table_session_id,
          amount: Number(sess?.total_amount || sess?.subtotal || order.subtotal) || 0,
          payment_method: validMethod,
          status: 'completed',
        });
      }
    } catch (payErr) {
      console.warn('Could not insert payment record:', payErr);
    }
  }

  notifySync('order_settled', { id: orderId });
  return true;
}

/**
 * Fetch comprehensive sales analytics for a venue with date-range support.
 * Queries Supabase directly for accuracy, calculates GST (CGST+SGST @2.5% each per Indian govt rules),
 * payment method splits, top-selling items, hourly revenue distribution, and table-wise performance.
 *
 * @param {string} venueId
 * @param {'today'|'week'|'month'|'year'|'custom'} period
 * @param {string|null} customStart - ISO date string for custom range start
 * @param {string|null} customEnd - ISO date string for custom range end
 * @returns {Promise<Object>}
 */
export async function getSalesAnalytics(venueId, period = 'today', customStart = null, customEnd = null) {
  if (!isSupabaseConfigured() || !venueId) {
    return {
      period,
      dateRange: { start: null, end: null },
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      grossRevenue: 0,
      netRevenue: 0,
      totalDiscount: 0,
      gst: { cgst: 0, sgst: 0, total: 0, rate: 5 },
      avgOrderValue: 0,
      paymentSplit: { cash: 0, online: 0, pending: 0 },
      paymentSplitCount: { cash: 0, online: 0, pending: 0 },
      topItems: [],
      hourlyRevenue: [],
      tablePerformance: [],
      dailyRevenue: [],
    };
  }

  // Compute date range boundaries (IST-aware: UTC+05:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  let startDate, endDate;

  switch (period) {
    case 'today': {
      const todayIST = new Date(istNow);
      todayIST.setUTCHours(0, 0, 0, 0);
      startDate = new Date(todayIST.getTime() - istOffset);
      endDate = now;
      break;
    }
    case 'yesterday': {
      const yestIST = new Date(istNow);
      yestIST.setUTCDate(yestIST.getUTCDate() - 1);
      yestIST.setUTCHours(0, 0, 0, 0);
      startDate = new Date(yestIST.getTime() - istOffset);

      const yestEndIST = new Date(yestIST);
      yestEndIST.setUTCHours(23, 59, 59, 999);
      endDate = new Date(yestEndIST.getTime() - istOffset);
      break;
    }
    case 'week': {
      const weekAgo = new Date(istNow);
      weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
      weekAgo.setUTCHours(0, 0, 0, 0);
      startDate = new Date(weekAgo.getTime() - istOffset);
      endDate = now;
      break;
    }
    case 'month': {
      if (customStart && /^\d{4}-\d{2}$/.test(customStart)) {
        // Specific Month (e.g., '2026-09')
        const [yr, mo] = customStart.split('-').map(Number);
        const mStart = new Date(Date.UTC(yr, mo - 1, 1, 0, 0, 0));
        startDate = new Date(mStart.getTime() - istOffset);
        const mEnd = new Date(Date.UTC(yr, mo, 0, 23, 59, 59, 999));
        endDate = new Date(mEnd.getTime() - istOffset);
      } else {
        const monthStart = new Date(istNow);
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);
        startDate = new Date(monthStart.getTime() - istOffset);
        endDate = now;
      }
      break;
    }
    case 'financial_year': {
      // Indian Financial Year: 1st April to 31st March
      const currYear = istNow.getUTCFullYear();
      const currMonth = istNow.getUTCMonth(); // 0-indexed (3 = April)
      const fyStartYear = currMonth >= 3 ? currYear : currYear - 1;
      const fyStart = new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0)); // April 1
      startDate = new Date(fyStart.getTime() - istOffset);
      endDate = now;
      break;
    }
    case 'year': {
      if (customStart && /^\d{4}$/.test(customStart)) {
        const yr = Number(customStart);
        const yStart = new Date(Date.UTC(yr, 0, 1, 0, 0, 0));
        startDate = new Date(yStart.getTime() - istOffset);
        const yEnd = new Date(Date.UTC(yr, 11, 31, 23, 59, 59, 999));
        endDate = new Date(yEnd.getTime() - istOffset);
      } else {
        const yearStart = new Date(istNow);
        yearStart.setUTCMonth(0, 1);
        yearStart.setUTCHours(0, 0, 0, 0);
        startDate = new Date(yearStart.getTime() - istOffset);
        endDate = now;
      }
      break;
    }
    case 'all': {
      startDate = null; // Unbounded beginning
      endDate = now;
      break;
    }
    case 'custom': {
      startDate = customStart ? new Date(`${customStart}T00:00:00+05:30`) : new Date(now.getTime() - 30 * 86400000);
      endDate = customEnd ? new Date(`${customEnd}T23:59:59+05:30`) : now;
      break;
    }
    default: {
      const tIST = new Date(istNow);
      tIST.setUTCHours(0, 0, 0, 0);
      startDate = new Date(tIST.getTime() - istOffset);
      endDate = now;
    }
  }

  try {
    // Build query for orders in date range
    let query = supabase
      .from('orders')
      .select(`
        id,
        status,
        subtotal,
        notes,
        created_at,
        round_number,
        table_session_id,
        order_items(id, item_name, quantity, price_at_order, station),
        table_sessions(id, tables(id, table_number, short_code))
      `)
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data: rawOrders, error: ordersErr } = await query;

    if (ordersErr) {
      console.error('getSalesAnalytics: Error fetching orders:', ordersErr);
      return null;
    }

    const orders = rawOrders || [];

    // --- Core Metrics ---
    const totalOrders = orders.length;
    const completedOrders = orders.filter(
      (o) => o.status === 'completed' || o.status === 'served'
    ).length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;
    const activeOrders = orders.filter((o) => o.status !== 'cancelled');

    // Gross revenue = sum of subtotals of all non-cancelled orders
    const grossRevenue = activeOrders.reduce(
      (sum, o) => sum + (Number(o.subtotal) || 0),
      0
    );

    // GST calculation per Indian government rules:
    // Standalone Restaurant Services: 5% GST (2.5% CGST + 2.5% SGST) without ITC (SAC 996331)
    const GST_RATE = 5; // percent total
    const gstAmount = Math.round((grossRevenue * GST_RATE) / 100 * 100) / 100;
    const cgst = Math.round(gstAmount / 2 * 100) / 100;
    const sgst = Math.round(gstAmount / 2 * 100) / 100;

    // Total discount (extract from notes if coupon was used)
    let totalDiscount = 0;
    for (const o of activeOrders) {
      const couponMatch = o.notes?.match(/Coupon:.*?\(-₹([\d,.]+)\)/i);
      if (couponMatch) {
        totalDiscount += parseFloat(couponMatch[1].replace(',', '')) || 0;
      }
    }

    const netRevenue = Math.round((grossRevenue + gstAmount - totalDiscount) * 100) / 100;
    const avgOrderValue = activeOrders.length > 0 ? Math.round((grossRevenue / activeOrders.length) * 100) / 100 : 0;

    // --- Payment Method Split ---
    const paidOrders = orders.filter(
      (o) => o.status === 'completed' || o.status === 'served'
    );
    const pendingOrders = orders.filter(
      (o) =>
        o.status !== 'cancelled' &&
        o.status !== 'completed' &&
        o.status !== 'served'
    );

    let cashRevenue = 0,
      onlineRevenue = 0,
      pendingRevenue = 0;
    let cashCount = 0,
      onlineCount = 0,
      splitCount = 0,
      splitOnlineAmount = 0,
      splitCashAmount = 0,
      pendingCount = 0;

    for (const o of paidOrders) {
      const amt = Number(o.subtotal) || 0;
      const payInfo = parsePaymentDetails(o.notes);

      if (payInfo.isSplit) {
        // Split payment: accurately divide revenue between online & cash
        onlineRevenue += payInfo.onlineAmount;
        cashRevenue += payInfo.cashAmount;
        splitOnlineAmount += payInfo.onlineAmount;
        splitCashAmount += payInfo.cashAmount;
        splitCount++;
      } else if (payInfo.method === 'online' || o.notes?.toLowerCase().includes('online') || o.notes?.toLowerCase().includes('upi') || o.notes?.toLowerCase().includes('card')) {
        onlineRevenue += amt;
        onlineCount++;
      } else {
        cashRevenue += amt;
        cashCount++;
      }
    }

    for (const o of pendingOrders) {
      const payInfo = parsePaymentDetails(o.notes);
      if (payInfo.isSplit) {
        // If part was paid online and part is pending at counter
        onlineRevenue += payInfo.onlineAmount;
        splitOnlineAmount += payInfo.onlineAmount;
        pendingRevenue += payInfo.cashAmount;
        splitCount++;
      } else {
        pendingRevenue += Number(o.subtotal) || 0;
      }
      pendingCount++;
    }

    // --- Top Selling Items ---
    const itemMap = new Map();
    for (const o of activeOrders) {
      for (const it of o.order_items || []) {
        const key = it.item_name || 'Unknown Item';
        const existing = itemMap.get(key) || { name: key, qty: 0, revenue: 0 };
        existing.qty += it.quantity || 1;
        existing.revenue += (Number(it.price_at_order) || 0) * (it.quantity || 1);
        itemMap.set(key, existing);
      }
    }
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // --- Hourly Revenue Distribution (Peak Hours in IST) ---
    const hourlyMap = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = { hour: h, orders: 0, revenue: 0 };
    }
    for (const o of activeOrders) {
      const orderDate = new Date(o.created_at);
      const istHour = new Date(orderDate.getTime() + istOffset).getUTCHours();
      hourlyMap[istHour].orders++;
      hourlyMap[istHour].revenue += Number(o.subtotal) || 0;
    }
    const hourlyRevenue = Object.values(hourlyMap).filter(
      (h) => h.orders > 0 || (h.hour >= 8 && h.hour <= 23)
    );

    // --- Table Performance ---
    const tableMap = new Map();
    for (const o of activeOrders) {
      const tblNum = o.table_sessions?.tables?.table_number || '??';
      const existing = tableMap.get(tblNum) || {
        table: tblNum,
        orders: 0,
        revenue: 0,
      };
      existing.orders++;
      existing.revenue += Number(o.subtotal) || 0;
      tableMap.set(tblNum, existing);
    }
    const tablePerformance = Array.from(tableMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    // --- Date-Wise Daily Sales Ledger & Audit Store ---
    const dailyMap = new Map();
    for (const o of orders) {
      const isCancelled = o.status === 'cancelled';
      const isCompleted = o.status === 'completed' || o.status === 'served';
      const d = new Date(o.created_at);
      const istD = new Date(d.getTime() + istOffset);
      const dateKey = `${istD.getUTCFullYear()}-${String(istD.getUTCMonth() + 1).padStart(2, '0')}-${String(istD.getUTCDate()).padStart(2, '0')}`;

      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        grossRevenue: 0,
        cashRevenue: 0,
        onlineRevenue: 0,
      };

      existing.totalOrders++;
      if (isCancelled) {
        existing.cancelledOrders++;
      } else {
        const amt = Number(o.subtotal) || 0;
        existing.grossRevenue += amt;
        if (isCompleted) {
          existing.completedOrders++;
        }
        const payInfo = parsePaymentDetails(o.notes);
        if (payInfo.isSplit) {
          existing.onlineRevenue += payInfo.onlineAmount;
          existing.cashRevenue += payInfo.cashAmount;
        } else if (payInfo.method === 'online' || o.notes?.toLowerCase().includes('online') || o.notes?.toLowerCase().includes('upi') || o.notes?.toLowerCase().includes('card')) {
          existing.onlineRevenue += amt;
        } else {
          existing.cashRevenue += amt;
        }
      }
      dailyMap.set(dateKey, existing);
    }

    const dailyRevenue = Array.from(dailyMap.values())
      .map((day) => {
        const gst = Math.round((day.grossRevenue * GST_RATE) / 100 * 100) / 100;
        const cgstDay = Math.round(gst / 2 * 100) / 100;
        const sgstDay = Math.round(gst / 2 * 100) / 100;
        const net = Math.round((day.grossRevenue + gst) * 100) / 100;
        const activeCount = day.totalOrders - day.cancelledOrders;
        return {
          ...day,
          revenue: day.grossRevenue, // for backwards-compatibility
          orders: day.totalOrders,   // for backwards-compatibility
          gstAmount: gst,
          cgst: cgstDay,
          sgst: sgstDay,
          netRevenue: net,
          avgOrderValue: activeCount > 0 ? Math.round((day.grossRevenue / activeCount) * 100) / 100 : 0,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Newest first

    // Detailed order entries for CSV/Excel export
    const exportOrders = orders.map((o) => {
      const orderDate = new Date(o.created_at);
      const istD = new Date(orderDate.getTime() + istOffset);
      const dateStr = `${istD.getUTCFullYear()}-${String(istD.getUTCMonth() + 1).padStart(2, '0')}-${String(istD.getUTCDate()).padStart(2, '0')}`;
      const timeStr = `${String(istD.getUTCHours()).padStart(2, '0')}:${String(istD.getUTCMinutes()).padStart(2, '0')}`;
      const subtotal = Number(o.subtotal) || 0;
      const tax = Math.round((subtotal * GST_RATE) / 100 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;
      const payInfo = parsePaymentDetails(o.notes);

      let payModeStr = 'Cash';
      if (payInfo.isSplit) {
        payModeStr = `Split (₹${payInfo.onlineAmount} Online + ₹${payInfo.cashAmount} Cash)`;
      } else if (payInfo.method === 'online') {
        payModeStr = 'Online/UPI';
      }

      return {
        id: o.id,
        date: dateStr,
        time: timeStr,
        table: o.table_sessions?.tables?.table_number || 'Takeaway',
        round: o.round_number || 1,
        status: o.status,
        itemsCount: (o.order_items || []).reduce((s, it) => s + (it.quantity || 1), 0),
        itemsSummary: (o.order_items || []).map((it) => `${it.item_name} x${it.quantity}`).join('; '),
        subtotal,
        cgst: Math.round(tax / 2 * 100) / 100,
        sgst: Math.round(tax / 2 * 100) / 100,
        gstTotal: tax,
        netTotal: total,
        paymentMode: payModeStr,
      };
    });

    return {
      period,
      dateRange: {
        start: startDate ? startDate.toISOString() : null,
        end: endDate ? endDate.toISOString() : now.toISOString(),
      },
      totalOrders,
      completedOrders,
      cancelledOrders,
      grossRevenue,
      netRevenue,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      gst: {
        cgst,
        sgst,
        total: gstAmount,
        rate: GST_RATE,
      },
      avgOrderValue,
      paymentSplit: {
        cash: cashRevenue,
        online: onlineRevenue,
        pending: pendingRevenue,
        splitOnline: splitOnlineAmount,
        splitCash: splitCashAmount,
      },
      paymentSplitCount: {
        cash: cashCount,
        online: onlineCount,
        split: splitCount,
        pending: pendingCount,
      },
      topItems,
      hourlyRevenue,
      tablePerformance,
      dailyRevenue,
      exportOrders,
    };
  } catch (err) {
    console.error('getSalesAnalytics: Unexpected error:', err);
    return null;
  }
}

/**
 * Compute real-time dashboard analytics from Supabase
 * Strictly filters today's gross sales in Indian Standard Time (IST: UTC+05:30)
 */
export async function getDashboardStats(venueId) {
  if (!isSupabaseConfigured() || !venueId) {
    return {
      todayGrossSales: 0,
      monthGrossSales: 0,
      allTimeGrossSales: 0,
      todayOrdersCount: 0,
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

  // IST offset calculation
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + istOffsetMs);
  const todayDateStrIST = nowIST.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const currentMonthStrIST = todayDateStrIST.slice(0, 7);    // 'YYYY-MM'

  const isTodayOrder = (createdAt) => {
    if (!createdAt) return false;
    const itemIST = new Date(new Date(createdAt).getTime() + istOffsetMs);
    return itemIST.toISOString().slice(0, 10) === todayDateStrIST;
  };

  const isMonthOrder = (createdAt) => {
    if (!createdAt) return false;
    const itemIST = new Date(new Date(createdAt).getTime() + istOffsetMs);
    return itemIST.toISOString().slice(0, 7) === currentMonthStrIST;
  };

  // 1. Gross sales from non-cancelled orders TODAY (IST)
  const todayOrders = orders.filter(
    (o) => o.status !== 'cancelled' && isTodayOrder(o.created_at)
  );
  const todayGrossSales = todayOrders.reduce(
    (sum, o) => sum + (Number(o.subtotal) || 0),
    0
  );

  // Month-to-date gross sales
  const monthOrders = orders.filter(
    (o) => o.status !== 'cancelled' && isMonthOrder(o.created_at)
  );
  const monthGrossSales = monthOrders.reduce(
    (sum, o) => sum + (Number(o.subtotal) || 0),
    0
  );

  // All-time gross sales
  const allTimeGrossSales = orders
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
    monthGrossSales,
    allTimeGrossSales,
    todayOrdersCount: todayOrders.length,
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
