import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { calculateBill, roundMoney } from '@/utils/billCalculation';

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
export function parsePaymentDetails(notes, order = null) {
  if (order && order.payment_method) {
    const method = order.payment_method;
    const isSplit = method === 'split';
    const splitDetails = order.split_details || {};
    const online = Number(splitDetails.online || splitDetails.onlineAmount || 0);
    const cash = Number(splitDetails.cash || splitDetails.cashAmount || 0);
    return {
      method,
      isSplit,
      onlineAmount: online,
      cashAmount: cash,
      summary: isSplit
        ? `Split (₹${online} Online + ₹${cash} Cash)`
        : method === 'online'
        ? 'Online / UPI'
        : 'Cash / Counter',
    };
  }
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
  if (/\[Payment:\s*(online|upi|card)\]/i.test(notes)) {
    return { method: 'online', isSplit: false, onlineAmount: 0, cashAmount: 0, summary: 'Online / UPI' };
  }
  if (/\[Payment:\s*(cash|counter)\]/i.test(notes)) {
    return { method: 'counter', isSplit: false, onlineAmount: 0, cashAmount: 0, summary: 'Cash Counter' };
  }
  return { method: 'counter', isSplit: false, onlineAmount: 0, cashAmount: 0, summary: 'Counter' };
}

/**
 * Helper to parse guest name and phone number from order notes or metadata
 */
export function parseGuestInfo(notes) {
  if (!notes) return { name: '', phone: '' };
  const match = notes.match(/\[Guest:\s*([^|\]]+)(?:\s*\|\s*([^\]]+))?\]/i);
  return {
    name: match ? match[1].trim() : '',
    phone: match && match[2] ? match[2].trim() : '',
  };
}

/**
 * Clean special instruction tags out of guest notes so chefs see pure cooking requests
 */
export function cleanGuestInstructions(notes) {
  if (!notes) return '';
  return notes
    .replace(/\[Guest:[^\]]*\]/gi, '')
    .replace(/\[Payment:[^\]]*\]/gi, '')
    .replace(/\[Coupon:[^\]]*\]/gi, '')
    .trim();
}

/**
 * Fetch all orders for a venue from Supabase
 * @param {string} venueId
 * @returns {Promise<Array>}
 */
export async function fetchOrders(venueId, { activeOnly = false, limit = 150 } = {}) {
  if (!isSupabaseConfigured() || !venueId) {
    return [];
  }

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        table_sessions(*, tables(*), guests(*), invoices(invoice_number))
      `)
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.in('status', ['placed', 'acknowledged', 'cooking', 'ready', 'served']);
    } else if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching orders from Supabase:', error);
      return [];
    }

    return (data || []).map((o) => {
      const isSettled = (o.status === 'completed' || o.table_sessions?.status === 'settled') && o.status !== 'cancelled';
      const roundSubtotal = Number(o.subtotal) || 0;
      const payInfo = parsePaymentDetails(o.notes, o);
      const guestInfo = parseGuestInfo(o.notes);

      const customerName =
        o.customer_name ||
        o.table_sessions?.customer_name ||
        o.table_sessions?.guests?.name ||
        guestInfo.name ||
        '';

      const customerPhone =
        o.customer_phone ||
        o.table_sessions?.customer_phone ||
        o.table_sessions?.guests?.phone ||
        guestInfo.phone ||
        '';

      const cleanNotes = cleanGuestInstructions(o.notes);

      // Extract per-order discount from coupon tag in notes
      let orderDiscount = 0;
      const couponMatch = (o.notes || '').match(/\[Coupon:[^\]]*-₹?([0-9.]+)\]/i);
      if (couponMatch && couponMatch[1]) {
        orderDiscount = parseFloat(couponMatch[1]) || 0;
      }

      // Use canonical billing calculation
      const bill = calculateBill({
        subtotal: roundSubtotal,
        discountAmount: orderDiscount,
      });

      let paymentStatus = o.status === 'cancelled' ? 'cancelled' : (isSettled ? 'paid' : 'pending');
      // If split payment and not fully settled yet, mark as partially_paid
      if (payInfo.isSplit && !isSettled && o.status !== 'cancelled') {
        paymentStatus = 'partially_paid';
      }

      return {
        id: o.id,
        invoice_number: o.table_sessions?.invoices?.[0]?.invoice_number || null,
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
        subtotal: bill.subtotal,
        discount: bill.discount,
        tax: bill.tax,
        total: bill.total,
        payment_status: paymentStatus,
        payment_method: payInfo.method,
        split_details: payInfo.isSplit ? { online: payInfo.onlineAmount, cash: payInfo.cashAmount } : null,
        guest_notes: cleanNotes || o.notes || '',
        raw_notes: o.notes || '',
        customer_name: customerName,
        customer_phone: customerPhone,
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
      .select('id, subtotal, tax_amount, discount_amount, total_amount, status, created_at, customer_name, customer_phone')
      .eq('table_id', tableData.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) return [];

    // Local device session & ownership identifiers
    const localMyOrderIds = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('tablesuite_my_order_ids') || '[]')
      : [];
    const localMySessionId = typeof window !== 'undefined'
      ? localStorage.getItem('tablesuite_my_session_id') || ''
      : '';
    const localPhone = typeof window !== 'undefined'
      ? (localStorage.getItem('tablesuite_guest_phone') || '').replace(/\D/g, '').slice(-10)
      : '';
    const sessionPhone = (session.customer_phone || '').replace(/\D/g, '').slice(-10);

    // ── ISOLATION RULE 1: SETTLED SESSIONS ──
    // If the latest session is settled, NEVER leak it to a new customer scanning the table QR!
    // Only return it if it truly belongs to THIS customer's device or phone, AND was settled recently (< 30m).
    if (session.status === 'settled') {
      const isMyDeviceSession = Boolean(localMySessionId && localMySessionId === session.id);
      const phoneMatches = Boolean(localPhone && sessionPhone && localPhone === sessionPhone);

      if (!isMyDeviceSession && !phoneMatches) {
        // Different customer / new party at this table: Clean empty state!
        return [];
      }

      // If it belongs to this device, only keep active view for up to 30 mins after settlement
      const ageMinutes = (Date.now() - new Date(session.created_at).getTime()) / (1000 * 60);
      if (ageMinutes > 30) {
        return [];
      }
    }

    // ── ISOLATION RULE 2: STALE OPEN SESSIONS FROM PAST DINERS ──
    // If a previous diner left without settling and the session is over 2.5 hours old,
    // do not show it to an unassociated new device.
    if (session.status === 'open') {
      const ageHours = (Date.now() - new Date(session.created_at).getTime()) / (1000 * 60 * 60);
      const isMyDeviceSession = Boolean(localMySessionId && localMySessionId === session.id);
      const phoneMatches = Boolean(localPhone && sessionPhone && localPhone === sessionPhone);

      if (ageHours > 2.5 && !isMyDeviceSession && !phoneMatches && localMyOrderIds.length === 0) {
        return [];
      }
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
      const isSettled = (isSessionSettled || o.status === 'completed' || o.payment_status === 'paid') && o.status !== 'cancelled';
      const roundSubtotal = Number(o.subtotal) || 0;
      const payInfo = parsePaymentDetails(o.notes, o);
      const guestInfo = parseGuestInfo(o.notes);
      const customerName = o.customer_name || guestInfo.name || '';
      const customerPhone = o.customer_phone || guestInfo.phone || '';
      const cleanNotes = cleanGuestInstructions(o.notes);

      // Extract per-order discount: prioritize typed column over notes regex
      let orderDiscount = Number(o.discount_amount) || 0;
      if (orderDiscount === 0) {
        const couponMatch = (o.notes || '').match(/\[Coupon:[^\]]*-₹?([0-9.]+)\]/i);
        if (couponMatch && couponMatch[1]) {
          orderDiscount = parseFloat(couponMatch[1]) || 0;
        }
      }

      // Use canonical billing calculation
      const bill = calculateBill({
        subtotal: roundSubtotal,
        discountAmount: orderDiscount,
      });

      let paymentStatus = o.status === 'cancelled'
        ? 'cancelled'
        : (isSettled || o.payment_status === 'paid' ? 'paid' : (o.payment_status || (payInfo.isSplit ? 'partially_paid' : 'pending')));

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
        subtotal: bill.subtotal,
        discount: bill.discount,
        tax: bill.tax,
        total: bill.total,
        payment_status: paymentStatus,
        payment_method: payInfo.method,
        split_details: payInfo.isSplit ? { online: payInfo.onlineAmount, cash: payInfo.cashAmount } : null,
        guest_notes: cleanNotes || o.notes || '',
        raw_notes: o.notes || '',
        customer_name: customerName,
        customer_phone: customerPhone,
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
  guestName = '',
  guestPhone = '',
  venueId,
}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase database is not configured.');
  }

  // Sanitize guest customer details for CRM
  const cleanName = (guestName || '').trim().replace(/[<>]/g, '').slice(0, 100) || 'Guest';
  const cleanPhone = (guestPhone || '').trim().replace(/[^\d+]/g, '').slice(0, 20);

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

  // 1b. Validate items array & sanitize quantities
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order must contain at least one item.');
  }

  const sanitizedItems = items.map((i) => ({
    ...i,
    qty: Math.max(1, Math.floor(Number(i.qty) || 1)),
  }));

  // Fetch true item prices & availability from menu_items table
  const itemIds = sanitizedItems
    .map((i) => i.id)
    .filter((id) => id && typeof id === 'string' && id.length > 20);

  let verifiedSubtotal = 0;
  let verifiedItems = sanitizedItems;

  if (itemIds.length > 0) {
    const { data: dbMenuItems } = await supabase
      .from('menu_items')
      .select('id, name, price, is_available, is_deleted, station')
      .in('id', itemIds);

    const dbItemMap = new Map((dbMenuItems || []).map((m) => [m.id, m]));

    for (const it of sanitizedItems) {
      const dbItem = dbItemMap.get(it.id);
      if (dbItem) {
        if (dbItem.is_deleted || dbItem.is_available === false) {
          throw new Error(`"${dbItem.name || it.name}" is currently sold out and unavailable.`);
        }
      }
    }

    verifiedItems = sanitizedItems.map((it) => {
      const dbItem = dbItemMap.get(it.id);
      const verifiedPrice = dbItem ? Number(dbItem.price) : Math.max(0, Number(it.price) || 0);
      verifiedSubtotal += verifiedPrice * it.qty;
      return {
        ...it,
        price: verifiedPrice,
        station: dbItem?.station || it.station || 'hot',
        name: dbItem?.name || it.name,
      };
    });
  } else {
    verifiedSubtotal = sanitizedItems.reduce((acc, i) => acc + (Math.max(0, Number(i.price) || 0) * i.qty), 0);
  }

  // Recalculate bill canonical figures
  const verifiedBill = calculateBill({
    subtotal: verifiedSubtotal,
    discountAmount: Number(discountAmount) || 0,
  });

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

  // 2. Get or create open table session atomically
  let session = null;
  try {
    const { data: rpcSess, error: rpcSessErr } = await supabase.rpc('get_or_create_table_session', {
      p_table_id: targetTableId,
      p_venue_id: targetVenueId,
      p_org_id: targetOrgId,
      p_customer_name: cleanName,
      p_customer_phone: cleanPhone,
    });
    if (!rpcSessErr && rpcSess) {
      session = rpcSess;
    }
  } catch (rpcErr) {
    // Fallback to query if RPC not yet migrated
  }

  if (!session) {
    let { data: existingSession } = await supabase
      .from('table_sessions')
      .select('id, org_id, venue_id, guest_id, customer_phone, customer_name, created_at')
      .eq('table_id', targetTableId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // ISOLATION: Check if open session belongs to another customer who vacated earlier
    if (existingSession) {
      const existingPhone = (existingSession.customer_phone || '').replace(/\D/g, '').slice(-10);
      const newOrderPhone = cleanPhone.replace(/\D/g, '').slice(-10);
      const sessionAgeHours = (Date.now() - new Date(existingSession.created_at).getTime()) / (1000 * 60 * 60);

      // If phones conflict or session was created > 2.5 hours ago, close the old session
      if ((existingPhone && newOrderPhone && existingPhone !== newOrderPhone) || sessionAgeHours > 2.5) {
        await supabase
          .from('table_sessions')
          .update({ status: 'settled', closed_at: new Date().toISOString() })
          .eq('id', existingSession.id);
        existingSession = null;
      }
    }
    session = existingSession;
  }

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
        customer_name: cleanName,
        customer_phone: cleanPhone,
      })
      .select()
      .single();

    if (sessErr) {
      // Fallback without customer columns if not yet migrated
      const { data: fallbackSess, error: fbErr } = await supabase
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
      if (fbErr) throw fbErr;
      session = fallbackSess;
    } else {
      session = newSession;
    }

    // Update table status to in_service
    await supabase
      .from('tables')
      .update({ status: 'in_service' })
      .eq('id', targetTableId);
  } else {
    // Update session financial totals and customer details if provided
    try {
      const sessUpdate = {
        subtotal: Number(subtotal) || 0,
        tax_amount: Number(tax) || 0,
        discount_amount: Number(discountAmount) || 0,
        total_amount: Number(total) || 0,
      };
      if (cleanName && cleanName !== 'Guest') sessUpdate.customer_name = cleanName;
      if (cleanPhone) sessUpdate.customer_phone = cleanPhone;

      await supabase
        .from('table_sessions')
        .update(sessUpdate)
        .eq('id', session.id);
    } catch (sessUpdateErr) {
      console.warn('Could not update table session totals:', sessUpdateErr);
    }
  }

  // 2b. Securely register or link guest in Admin CRM & loyalty system
  let linkedGuestId = session?.guest_id || null;
  const orgForGuest = session?.org_id || targetOrgId;

  if (orgForGuest) {
    try {
      // Attempt secure RPC call (00007 migration)
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('register_or_link_guest_order', {
        p_org_id: orgForGuest,
        p_session_id: session.id,
        p_name: cleanName,
        p_phone: cleanPhone || '',
      });

      if (!rpcErr && rpcRes?.guest_id) {
        linkedGuestId = rpcRes.guest_id;
      } else {
        // Fallback: if phone provided, upsert guest record
        if (cleanPhone && cleanPhone.length >= 10) {
          const { data: existingGuest } = await supabase
            .from('guests')
            .select('id, name')
            .eq('org_id', orgForGuest)
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (existingGuest) {
            linkedGuestId = existingGuest.id;
            if ((!existingGuest.name || existingGuest.name === 'Guest') && cleanName !== 'Guest') {
              await supabase.from('guests').update({ name: cleanName }).eq('id', existingGuest.id);
            }
          } else {
            const { data: newGuest } = await supabase
              .from('guests')
              .insert({
                org_id: orgForGuest,
                phone: cleanPhone,
                name: cleanName,
                loyalty_points: 10,
                loyalty_tier: 'bronze',
              })
              .select('id')
              .single();
            if (newGuest) linkedGuestId = newGuest.id;
          }
        }

        // Always update customer_name and customer_phone on table_sessions
        if (session?.id) {
          const sessCustUpdate = { customer_name: cleanName };
          if (linkedGuestId) sessCustUpdate.guest_id = linkedGuestId;
          if (cleanPhone) sessCustUpdate.customer_phone = cleanPhone;

          await supabase
            .from('table_sessions')
            .update(sessCustUpdate)
            .eq('id', session.id);
        }
      }
    } catch (guestCrmErr) {
      console.warn('Guest CRM record registration notice:', guestCrmErr);
    }
  }

  // 3. Determine round number
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('table_session_id', session.id);

  const nextRoundNumber = (count || 0) + 1;

  // Format notes to include guest, coupon, and split/payment info if applied
  const guestTag = cleanPhone
    ? `[Guest: ${cleanName} | ${cleanPhone}]`
    : cleanName && cleanName !== 'Guest'
    ? `[Guest: ${cleanName}]`
    : '';
  const couponTag = couponCode ? `[Coupon: ${couponCode.toUpperCase()} (-₹${discountAmount})]` : '';
  let paymentTag = '';
  if (paymentMethod === 'split' && splitDetails) {
    paymentTag = `[Payment: Split | Online: ₹${splitDetails.onlineAmount} | Cash: ₹${splitDetails.cashAmount}]`;
  } else if (paymentMethod === 'online') {
    paymentTag = `[Payment: Online]`;
  } else if (paymentMethod === 'counter' || paymentMethod === 'cash') {
    paymentTag = `[Payment: Cash]`;
  }

  const finalGuestNotes = [guestTag, couponTag, paymentTag, guestNotes].filter(Boolean).join(' ').trim();

  // Determine effective status
  const effectivePaymentStatus = paymentMethod === 'split' ? 'partially_paid' : paymentStatus;

  // 4. Insert order with fallback resilience and typed financial columns
  const baseOrderInsert = {
    org_id: session.org_id || targetOrgId,
    venue_id: targetVenueId,
    table_session_id: session.id,
    round_number: nextRoundNumber,
    status: 'placed',
    notes: finalGuestNotes,
    subtotal: verifiedBill.subtotal,
    payment_method: paymentMethod || 'counter',
    payment_status: effectivePaymentStatus || 'pending',
    discount_amount: verifiedBill.discount,
    coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
    split_details: splitDetails || null,
    tax_amount: verifiedBill.tax,
    total_amount: verifiedBill.total,
  };

  let createdOrder = null;
  try {
    const { data: oWithCust, error: oErr1 } = await supabase
      .from('orders')
      .insert({
        ...baseOrderInsert,
        customer_name: cleanName,
        customer_phone: cleanPhone,
      })
      .select()
      .single();

    if (oErr1) throw oErr1;
    createdOrder = oWithCust;
  } catch (errCol) {
    const { data: oFallback, error: oErr2 } = await supabase
      .from('orders')
      .insert(baseOrderInsert)
      .select()
      .single();

    if (oErr2) throw oErr2;
    createdOrder = oFallback;
  }

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

  // 4b. If coupon applied, increment times_used atomically via RPC
  if (couponCode && targetVenueId) {
    try {
      const { data: rpcCpn, error: rpcCpnErr } = await supabase.rpc('increment_coupon_usage', {
        p_venue_id: targetVenueId,
        p_code: couponCode.trim(),
      });

      if (rpcCpnErr || !rpcCpn?.success) {
        // Fallback to direct update if RPC not yet created
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
      }
    } catch (couponUsageErr) {
      console.warn('Could not increment coupon usage count:', couponUsageErr);
    }
  }

  // 5. Insert order items with verified quantities and prices
  if (verifiedItems && verifiedItems.length > 0) {
    const itemInserts = verifiedItems.map((i) => ({
      order_id: createdOrder.id,
      menu_item_id: i.id && i.id.length > 20 ? i.id : null,
      item_name: i.name || 'Item',
      price_at_order: Number(i.price) || 0,
      quantity: Math.max(1, Math.floor(Number(i.qty) || 1)),
      station: (i.station && ['hot', 'cold', 'bar'].includes(i.station)) ? i.station : 'hot',
      customization_notes: i.notes ? String(i.notes).slice(0, 200) : '',
      status: 'pending',
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(itemInserts);
    if (itemsErr) {
      console.warn('Error inserting order items:', itemsErr);
    }
  }

  // 6. Record ownership on guest device for user isolation and account history (BEFORE returning)
  try {
    if (typeof window !== 'undefined') {
      const existingIds = JSON.parse(localStorage.getItem('tablesuite_my_order_ids') || '[]');
      if (!existingIds.includes(createdOrder.id)) {
        existingIds.unshift(createdOrder.id);
        localStorage.setItem('tablesuite_my_order_ids', JSON.stringify(existingIds.slice(0, 50)));
      }
      if (session?.id) {
        localStorage.setItem('tablesuite_my_session_id', session.id);
      }
      if (cleanPhone) {
        localStorage.setItem('tablesuite_guest_phone', cleanPhone);
      }
      if (cleanName && cleanName !== 'Guest') {
        localStorage.setItem('tablesuite_guest_name', cleanName);
      }
    }
  } catch (storageErr) {
    console.warn('Storage sync notice:', storageErr);
  }

  // 7. Notify cross-tab listeners (audio alert is handled on staff portal)
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
 * Fetch a guest customer's previous orders across dining visits.
 * Prioritizes mobile number over name.
 */
export async function fetchGuestPreviousOrders({ phone = '', name = '', venueId = null, shortCode = null }) {
  if (!isSupabaseConfigured()) {
    // If not configured, fall back to locally saved order history
    try {
      return JSON.parse(localStorage.getItem('tablesuite_order_history') || '[]');
    } catch {
      return [];
    }
  }

  // Resolve target venue ID to strictly prevent cross-tenant order leaks
  let targetVenueId = venueId;
  if (!targetVenueId && shortCode) {
    const { data: tbl } = await supabase
      .from('tables')
      .select('venue_id')
      .eq('short_code', shortCode)
      .maybeSingle();
    targetVenueId = tbl?.venue_id;
  }

  const cleanPhone = (phone || '').replace(/[^\d]/g, '');
  const tenDigits = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : '';
  const cleanName = (name || '').trim().replace(/[<>]/g, '');

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        table_sessions(*, tables(*))
      `)
      .order('created_at', { ascending: false });

    // Strict multi-tenant scoping: only query orders for this venue
    if (targetVenueId) {
      query = query.eq('venue_id', targetVenueId);
    }

    // PRIORITY #1: Look up by Mobile Number
    if (tenDigits) {
      query = query.or(`customer_phone.ilike.%${tenDigits}%,notes.ilike.%${tenDigits}%`);
    } else if (cleanName && cleanName.toLowerCase() !== 'guest') {
      // Secondary fallback: Look up by Name only if no phone
      query = query.ilike('customer_name', `%${cleanName}%`);
    } else {
      // Fallback to local order history IDs if neither phone nor name
      const localOrderIds = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('tablesuite_my_order_ids') || '[]')
        : [];
      if (localOrderIds.length > 0) {
        query = query.in('id', localOrderIds);
      } else {
        return [];
      }
    }

    const { data: orders, error } = await query.limit(30);

    if (error || !orders) {
      console.warn('Error fetching guest previous orders:', error);
      return [];
    }

    return orders.map((o) => {
      const isSettled = (o.status === 'completed' || o.table_sessions?.status === 'settled') && o.status !== 'cancelled';
      const roundSubtotal = Number(o.subtotal) || 0;
      const payInfo = parsePaymentDetails(o.notes);
      const guestInfo = parseGuestInfo(o.notes);
      const tableName = o.table_sessions?.tables?.table_number || o.table_number || 'Dining';

      return {
        id: o.id,
        round_number: o.round_number || 1,
        table_number: tableName,
        created_at: o.created_at,
        status: o.status,
        is_settled: isSettled,
        payment_method: payInfo.summary || 'Counter',
        payment_status: isSettled ? 'paid' : (o.status === 'cancelled' ? 'cancelled' : 'pending'),
        customer_name: o.customer_name || guestInfo.name || cleanName || 'Guest',
        customer_phone: o.customer_phone || guestInfo.phone || cleanPhone || '',
        items: (o.order_items || []).map((it) => ({
          id: it.id,
          name: it.item_name || 'Dish',
          price: Number(it.price_at_order ?? it.unit_price) || 0,
          qty: it.quantity || 1,
        })),
        total: roundSubtotal,
        subtotal: roundSubtotal,
        discount: 0,
        tax: 0,
      };
    });
  } catch (err) {
    console.error('Failed to fetch previous orders:', err);
    return [];
  }
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

  // 1. Attempt atomic RPC call first (allows unauthenticated guest cancellation via SECURITY DEFINER)
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('cancel_guest_order', {
      p_order_id: orderId,
      p_short_code: shortCode || '',
      p_reason: reason,
    });
    if (!rpcErr && rpcRes) {
      if (rpcRes.success === false) {
        throw new Error(rpcRes.error || 'Failed to cancel order.');
      }
      notifySync('order_status_updated', { id: orderId, status: 'cancelled' });
      return true;
    }
  } catch (rpcErr) {
    if (rpcErr?.message && !rpcErr.message.includes('function') && !rpcErr.message.includes('not found')) {
      throw rpcErr;
    }
  }

  // 2. Fallback manual update for authenticated staff or unmigrated environments
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

  // 1b. Attempt atomic settlement via RPC (single atomic DB transaction)
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('settle_table_session', {
      p_order_id: orderId,
      p_payment_method: paymentMethod || 'cash',
      p_split_online: Number(splitDetails?.onlineAmount || 0),
      p_split_cash: Number(splitDetails?.cashAmount || 0),
    });

    if (!rpcErr && rpcRes && rpcRes.success) {
      notifySync('order_settled', { id: orderId });
      if (order.table_session_id) {
        notifySync('invoice_created', { table_session_id: order.table_session_id });
      }
      return true;
    }
  } catch (rpcErr) {
    // Fallback to manual queries below if RPC not yet migrated
  }

  // 2. Mark this order (and any other uncancelled orders in this session) as 'served' with typed payment fields
  const updatePayload = {
    status: 'served',
    payment_status: 'paid',
    payment_method: paymentMethod,
    split_details: splitDetails || null,
    notes: finalNotes,
    updated_at: new Date().toISOString(),
  };

  if (order.table_session_id) {
    await supabase
      .from('orders')
      .update(updatePayload)
      .eq('table_session_id', order.table_session_id)
      .neq('status', 'cancelled');
  } else {
    await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);
  }

  // 3. Settle session, generate tax invoice, and free table
  if (order.table_session_id) {
    // 3a. Query all active (non-cancelled) orders for this table session to get true totals
    const { data: sessionOrders } = await supabase
      .from('orders')
      .select('id, subtotal, notes, status, order_items(price_at_order, quantity)')
      .eq('table_session_id', order.table_session_id)
      .neq('status', 'cancelled');

    let sessionSubtotal = 0;
    let sessionDiscount = 0;

    (sessionOrders || []).forEach((so) => {
      if (so.order_items && so.order_items.length > 0) {
        so.order_items.forEach((it) => {
          sessionSubtotal += (Number(it.price_at_order) || 0) * (Number(it.quantity) || 1);
        });
      } else {
        sessionSubtotal += Number(so.subtotal) || 0;
      }

      // Prioritize typed column over notes regex
      if (so.discount_amount != null && Number(so.discount_amount) > 0) {
        sessionDiscount += Number(so.discount_amount);
      } else {
        const couponMatch = (so.notes || '').match(/\[Coupon:[^\]]*-₹?([0-9.]+)\]/i);
        if (couponMatch && couponMatch[1]) {
          sessionDiscount += parseFloat(couponMatch[1]) || 0;
        }
      }
    });

    if (sessionSubtotal === 0) {
      sessionSubtotal = Number(order.subtotal) || 0;
    }

    const taxableAmount = Math.max(0, sessionSubtotal - sessionDiscount);
    const sessionTax = Math.round(taxableAmount * 0.05 * 100) / 100;
    const sessionTotal = Math.round((taxableAmount + sessionTax) * 100) / 100;

    const { data: sess, error: sessErr } = await supabase
      .from('table_sessions')
      .update({
        status: 'settled',
        subtotal: sessionSubtotal,
        discount_amount: sessionDiscount,
        tax_amount: sessionTax,
        total_amount: sessionTotal,
        closed_at: new Date().toISOString(),
      })
      .eq('id', order.table_session_id)
      .select('id, table_id, org_id, venue_id, total_amount, subtotal, tax_amount, discount_amount')
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

    // 3b. Generate Tax Invoice idempotently
    try {
      const { data: existingInv } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('table_session_id', order.table_session_id)
        .maybeSingle();

      if (!existingInv) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const { count } = await supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('venue_id', sess?.venue_id || order.venue_id);
        const seq = String((count || 0) + 1).padStart(4, '0');
        const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
        const invoiceNumber = `INV-${dateStr}-${seq}-${rand}`;

        await supabase
          .from('invoices')
          .insert({
            org_id: sess?.org_id || order.org_id,
            venue_id: sess?.venue_id || order.venue_id,
            table_session_id: order.table_session_id,
            invoice_number: invoiceNumber,
            subtotal: sessionSubtotal,
            tax_amount: sessionTax,
            discount_amount: sessionDiscount,
            total_amount: sessionTotal,
            issued_at: now.toISOString(),
          });
      }
    } catch (invErr) {
      console.warn('Could not generate tax invoice:', invErr);
    }

    // 3c. Record payment in payments table
    try {
      const finalAmount = Number(sess?.total_amount || sessionTotal || order.subtotal) || 0;
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
          amount: finalAmount,
          payment_method: validMethod,
          status: 'completed',
        });
      }
    } catch (payErr) {
      console.warn('Could not insert payment record:', payErr);
    }
  }

  notifySync('order_settled', { id: orderId });
  notifySync('invoice_created', { table_session_id: order.table_session_id });
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

    // Canonical calculation helper for orders in sales analytics
    const getOrderBill = (o) => {
      let discount = Number(o.discount_amount) || 0;
      if (!discount && o.notes) {
        const couponMatch = o.notes.match(/Coupon:.*?\(-₹([\d,.]+)\)/i);
        if (couponMatch) {
          discount = parseFloat(couponMatch[1].replace(',', '')) || 0;
        }
      }
      const sub = Number(o.subtotal) || 0;
      return calculateBill({
        subtotal: sub,
        discountAmount: discount,
        taxRate: 0.05,
      });
    };

    // Calculate revenue metrics using canonical bill calculation
    let grossRevenue = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let gstAmount = 0;
    let netRevenue = 0;

    for (const o of activeOrders) {
      const bill = getOrderBill(o);
      grossRevenue += bill.subtotal;
      totalDiscount += bill.discount;
      totalTaxable += bill.taxableAmount;
      gstAmount += bill.tax;
      netRevenue += bill.total;
    }

    grossRevenue = roundMoney(grossRevenue);
    totalDiscount = roundMoney(totalDiscount);
    totalTaxable = roundMoney(totalTaxable);
    gstAmount = roundMoney(gstAmount);
    netRevenue = roundMoney(netRevenue);
    const GST_RATE = 5;
    const cgst = roundMoney(gstAmount / 2);
    const sgst = roundMoney(gstAmount / 2);

    const avgOrderValue = activeOrders.length > 0 ? roundMoney(netRevenue / activeOrders.length) : 0;

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
      const bill = getOrderBill(o);
      const amt = bill.total;
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
      const bill = getOrderBill(o);
      const amt = bill.total;
      const payInfo = parsePaymentDetails(o.notes);
      if (payInfo.isSplit) {
        // If part was paid online and part is pending at counter
        onlineRevenue += payInfo.onlineAmount;
        splitOnlineAmount += payInfo.onlineAmount;
        pendingRevenue += payInfo.cashAmount;
        splitCount++;
      } else {
        pendingRevenue += amt;
      }
      pendingCount++;
    }

    cashRevenue = roundMoney(cashRevenue);
    onlineRevenue = roundMoney(onlineRevenue);
    pendingRevenue = roundMoney(pendingRevenue);

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
      const bill = getOrderBill(o);
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
        subtotal: bill.subtotal,
        discount: bill.discount,
        taxableAmount: bill.taxableAmount,
        cgst: bill.cgst,
        sgst: bill.sgst,
        gstTotal: bill.tax,
        netTotal: bill.total,
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
 * Uses debouncing to prevent thundering-herd re-renders when multiple rows update simultaneously.
 */
export function subscribeToOrders(callback) {
  let debounceTimer = null;
  const debouncedCallback = (event) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        callback(event);
      } catch (err) {
        console.warn('[ordersApi] Callback error in subscribeToOrders:', err);
      }
    }, 150);
  };

  const handleBroadcast = (event) => {
    debouncedCallback(event);
  };

  if (syncChannel) {
    syncChannel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('tablesuite_orders_change', debouncedCallback);

  let supabaseChannel = null;
  if (isSupabaseConfigured()) {
    const channelId = `orders_stream_${Math.random().toString(36).slice(2, 8)}`;
    supabaseChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        debouncedCallback
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_sessions' },
        debouncedCallback
      )
      .subscribe();
  }

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    window.removeEventListener('tablesuite_orders_change', debouncedCallback);
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleBroadcast);
    }
    if (supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}

