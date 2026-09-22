import { supabase } from '@/lib/supabase';

// ============================================================================
// OFFERS CRUD
// ============================================================================

/**
 * Fetch all offers for a venue
 */
export async function fetchOffers(venueId) {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new offer with optional coupon code
 */
export async function createOffer({
  orgId,
  venueId,
  title,
  description,
  discountType,
  discountValue,
  minOrderAmount,
  couponCode,
}) {
  const normalizedCode = couponCode ? couponCode.trim().toUpperCase() : null;
  const ruleJson = normalizedCode ? { coupon_code: normalizedCode } : {};

  const { data, error } = await supabase
    .from('offers')
    .insert({
      org_id: orgId,
      venue_id: venueId,
      title,
      description,
      discount_type: discountType,
      discount_value: discountValue,
      min_order_amount: minOrderAmount || 0,
      rule_json: ruleJson,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  // Sync to coupons table if coupon code was provided
  if (normalizedCode) {
    try {
      await supabase.from('coupons').upsert(
        {
          org_id: orgId,
          venue_id: venueId,
          code: normalizedCode,
          discount_type: discountType,
          discount_value: discountValue,
          min_order_amount: minOrderAmount || 0,
          is_active: true,
        },
        { onConflict: 'venue_id,code' }
      );
    } catch (couponErr) {
      console.warn('Could not sync to coupons table:', couponErr);
    }
  }

  return data;
}

/**
 * Update an existing offer
 */
export async function updateOffer(offerId, updates) {
  const updatePayload = {};
  if (updates.title !== undefined) updatePayload.title = updates.title;
  if (updates.description !== undefined) updatePayload.description = updates.description;
  if (updates.discountType !== undefined) updatePayload.discount_type = updates.discountType;
  if (updates.discountValue !== undefined) updatePayload.discount_value = updates.discountValue;
  if (updates.minOrderAmount !== undefined) updatePayload.min_order_amount = updates.minOrderAmount;
  if (updates.isActive !== undefined) updatePayload.is_active = updates.isActive;

  let normalizedCode = undefined;
  if (updates.couponCode !== undefined) {
    normalizedCode = updates.couponCode ? updates.couponCode.trim().toUpperCase() : '';
    updatePayload.rule_json = normalizedCode ? { coupon_code: normalizedCode } : {};
  }

  const { data, error } = await supabase
    .from('offers')
    .update(updatePayload)
    .eq('id', offerId)
    .select()
    .single();

  if (error) throw error;

  // If coupon code exists, sync to coupons table
  const finalCode = normalizedCode !== undefined ? normalizedCode : data.rule_json?.coupon_code;
  if (finalCode && data.venue_id) {
    try {
      await supabase.from('coupons').upsert(
        {
          org_id: data.org_id,
          venue_id: data.venue_id,
          code: finalCode,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          min_order_amount: data.min_order_amount || 0,
          is_active: updates.isActive !== undefined ? updates.isActive : data.is_active,
        },
        { onConflict: 'venue_id,code' }
      );
    } catch (couponErr) {
      console.warn('Could not sync coupon update:', couponErr);
    }
  }

  return data;
}

/**
 * Delete an offer
 */
export async function deleteOffer(offerId) {
  // Fetch offer first to clean up coupon if any
  try {
    const { data: offer } = await supabase
      .from('offers')
      .select('venue_id, rule_json')
      .eq('id', offerId)
      .single();

    if (offer?.rule_json?.coupon_code && offer?.venue_id) {
      await supabase
        .from('coupons')
        .delete()
        .eq('venue_id', offer.venue_id)
        .eq('code', offer.rule_json.coupon_code);
    }
  } catch (err) {
    // Non-blocking
  }

  const { error } = await supabase
    .from('offers')
    .delete()
    .eq('id', offerId);

  if (error) throw error;
}

/**
 * Toggle offer active status
 */
export async function toggleOfferActive(offerId, isActive) {
  return updateOffer(offerId, { isActive });
}

// ============================================================================
// COUPON VALIDATION & AVAILABLE OFFERS FOR GUESTS
// ============================================================================

/**
 * Resolve venue_id from table short code or direct venueId
 */
async function resolveVenueId(shortCode, venueId) {
  if (venueId) return venueId;
  if (!shortCode) return null;
  const { data } = await supabase
    .from('tables')
    .select('venue_id')
    .eq('short_code', shortCode)
    .maybeSingle();
  return data?.venue_id || null;
}

/**
 * Validate a coupon code for an active order
 * Checks coupons table first, then falls back to offers table
 */
export async function validateCoupon({ shortCode, venueId, code, subtotal = 0 }) {
  if (!code || !code.trim()) {
    return { valid: false, error: 'Please enter a coupon code' };
  }

  const normalizedCode = code.trim().toUpperCase();
  const targetVenueId = await resolveVenueId(shortCode, venueId);

  if (!targetVenueId) {
    return { valid: false, error: 'Could not identify restaurant table' };
  }

  // 1. Try coupons table
  const { data: couponData, error: couponErr } = await supabase
    .from('coupons')
    .select('*')
    .eq('venue_id', targetVenueId)
    .ilike('code', normalizedCode)
    .eq('is_active', true)
    .maybeSingle();

  let matched = couponData;

  // 2. Fallback to offers table if not in coupons table
  if (!matched) {
    const { data: offersData } = await supabase
      .from('offers')
      .select('*')
      .eq('venue_id', targetVenueId)
      .eq('is_active', true);

    const offerWithCode = (offersData || []).find(
      (o) => o.rule_json?.coupon_code?.toUpperCase() === normalizedCode
    );

    if (offerWithCode) {
      matched = {
        code: normalizedCode,
        discount_type: offerWithCode.discount_type,
        discount_value: offerWithCode.discount_value,
        min_order_amount: offerWithCode.min_order_amount || 0,
        title: offerWithCode.title,
        description: offerWithCode.description,
      };
    }
  }

  if (!matched) {
    return {
      valid: false,
      error: `Coupon "${normalizedCode}" is invalid or expired.`,
    };
  }

  // 3. Validate minimum order amount
  const minOrder = Number(matched.min_order_amount) || 0;
  if (minOrder > 0 && subtotal < minOrder) {
    return {
      valid: false,
      error: `Coupon "${normalizedCode}" requires a minimum order of ₹${minOrder}. Add ₹${minOrder - subtotal} more to apply!`,
      minOrderAmount: minOrder,
    };
  }

  // 4. Calculate discount amount
  let discountAmount = 0;
  const numValue = Number(matched.discount_value) || 0;
  if (matched.discount_type === 'percent') {
    discountAmount = Math.round((subtotal * numValue) / 100);
    if (matched.max_discount_amount && discountAmount > Number(matched.max_discount_amount)) {
      discountAmount = Number(matched.max_discount_amount);
    }
  } else {
    discountAmount = Math.min(numValue, subtotal);
  }

  return {
    valid: true,
    coupon: {
      code: normalizedCode,
      title: matched.title || matched.code,
      discountType: matched.discount_type,
      discountValue: numValue,
      discountAmount,
      minOrderAmount: minOrder,
    },
  };
}

/**
 * Fetch available active coupons/offers that guests can view and tap to apply
 */
export async function fetchAvailableCoupons(shortCode, venueId) {
  const targetVenueId = await resolveVenueId(shortCode, venueId);
  if (!targetVenueId) return [];

  const [couponsRes, offersRes] = await Promise.all([
    supabase
      .from('coupons')
      .select('*')
      .eq('venue_id', targetVenueId)
      .eq('is_active', true),
    supabase
      .from('offers')
      .select('*')
      .eq('venue_id', targetVenueId)
      .eq('is_active', true),
  ]);

  const list = [];
  const seenCodes = new Set();

  // From coupons table
  (couponsRes.data || []).forEach((c) => {
    const upperCode = c.code.toUpperCase();
    if (!seenCodes.has(upperCode)) {
      seenCodes.add(upperCode);
      list.push({
        code: upperCode,
        title: upperCode,
        discountType: c.discount_type,
        discountValue: Number(c.discount_value) || 0,
        minOrderAmount: Number(c.min_order_amount) || 0,
      });
    }
  });

  // From offers table
  (offersRes.data || []).forEach((o) => {
    const code = o.rule_json?.coupon_code?.toUpperCase();
    if (code && !seenCodes.has(code)) {
      seenCodes.add(code);
      list.push({
        code,
        title: o.title,
        description: o.description,
        discountType: o.discount_type,
        discountValue: Number(o.discount_value) || 0,
        minOrderAmount: Number(o.min_order_amount) || 0,
      });
    }
  });

  return list;
}

// ============================================================================
// PUSH SUBSCRIPTIONS COUNT
// ============================================================================

/**
 * Get count of active push subscriptions for a venue
 */
export async function getSubscriptionCount(venueId) {
  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .eq('is_active', true);

  if (error) throw error;
  return count || 0;
}

// ============================================================================
// SEND PUSH NOTIFICATIONS
// ============================================================================

/**
 * Send an offer as push notification to all subscribed devices
 * Calls the Supabase Edge Function
 */
export async function sendOfferNotification({ offerId, venueId, title, message }) {
  // Get the current session for auth
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        offer_id: offerId,
        venue_id: venueId,
        title,
        message,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result;
    }

    if (response.status === 404) {
      // Edge Function is not yet deployed on Supabase
      // Still log notification to database for record-keeping
      await supabase.from('offer_notifications').insert({
        offer_id: offerId,
        venue_id: venueId,
        title,
        message,
        devices_targeted: 1,
        devices_delivered: 0,
      });

      throw new Error(
        "Edge Function 'send-push' is not deployed yet in Supabase. Please deploy it from supabase/functions/send-push in your Supabase Dashboard."
      );
    }

    const errBody = await response.text();
    throw new Error(`Failed to send notifications: ${errBody}`);
  } catch (err) {
    if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
      // Network/CORS error usually caused by 404 from non-existent Edge Function
      await supabase.from('offer_notifications').insert({
        offer_id: offerId,
        venue_id: venueId,
        title,
        message,
        devices_targeted: 1,
        devices_delivered: 0,
      });

      throw new Error(
        "Edge Function 'send-push' not deployed in Supabase. Please deploy it to send live push notifications."
      );
    }
    throw err;
  }
}

// ============================================================================
// NOTIFICATION HISTORY
// ============================================================================

/**
 * Fetch offer notification history for a venue
 */
export async function fetchNotificationHistory(venueId, limit = 20) {
  const { data, error } = await supabase
    .from('offer_notifications')
    .select(`
      *,
      offers (title, discount_type, discount_value)
    `)
    .eq('venue_id', venueId)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
