/**
 * Canonical billing calculation utility.
 * Single source of truth for subtotal → discount → tax → total
 * across POS, invoices, table balances, sales reports, and exports.
 *
 * Tax model: Tax-exclusive — prices are before tax, GST is added on top.
 *   total = (subtotal - discount) + tax
 *   tax   = (subtotal - discount) * taxRate
 *
 * All monetary values are rounded to 2 decimal places (paise precision).
 */

const DEFAULT_TAX_RATE = 0.05; // 5% GST for standalone restaurants (SAC 996331)

/**
 * Round a number to 2 decimal places (banker's rounding avoided — standard rounding).
 * @param {number} value
 * @returns {number}
 */
export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Compute a complete bill breakdown from line items or a raw subtotal.
 *
 * @param {Object} params
 * @param {number}  [params.subtotal=0]       — Pre-tax sum of item prices × quantities
 * @param {number}  [params.discountAmount=0]  — Flat discount amount (already resolved from coupon)
 * @param {number}  [params.taxRate]           — Decimal tax rate, e.g. 0.05 for 5%. Defaults to 5%.
 * @returns {{ subtotal: number, discount: number, taxableAmount: number, tax: number, cgst: number, sgst: number, total: number, taxRate: number }}
 */
export function calculateBill({
  subtotal = 0,
  discountAmount = 0,
  taxRate = DEFAULT_TAX_RATE,
} = {}) {
  const cleanSubtotal = roundMoney(Math.max(0, Number(subtotal) || 0));
  const cleanDiscount = roundMoney(Math.max(0, Math.min(Number(discountAmount) || 0, cleanSubtotal)));
  const taxableAmount = roundMoney(cleanSubtotal - cleanDiscount);
  const tax = roundMoney(taxableAmount * taxRate);
  const cgst = roundMoney(tax / 2);
  const sgst = roundMoney(tax / 2);
  const total = roundMoney(taxableAmount + tax);

  return {
    subtotal: cleanSubtotal,
    discount: cleanDiscount,
    taxableAmount,
    tax,
    cgst,
    sgst,
    total,
    taxRate,
  };
}

/**
 * Compute a bill from an array of order items.
 *
 * @param {Array<{ price: number, qty: number }>} items
 * @param {Object}  [opts]
 * @param {number}  [opts.discountAmount=0]
 * @param {number}  [opts.taxRate=0.05]
 * @returns {ReturnType<typeof calculateBill>}
 */
export function calculateBillFromItems(items = [], opts = {}) {
  const subtotal = (items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty || item.quantity) || 1),
    0
  );
  return calculateBill({ subtotal, ...opts });
}

/**
 * Format elapsed time in a human-readable way.
 * - < 1 minute  → "Just now"
 * - < 60 minutes → "12m ago"
 * - < 24 hours   → "3h 15m ago"
 * - < 48 hours   → "1d 5h ago"
 * - ≥ 48 hours   → "3d ago" (with overdue flag)
 *
 * @param {string|Date} timestamp — ISO string or Date
 * @returns {{ text: string, minutes: number, isOverdue: boolean, isWarning: boolean, isUrgent: boolean }}
 */
export function getElapsedTime(timestamp) {
  if (!timestamp) return { text: '—', minutes: 0, isOverdue: false, isWarning: false, isUrgent: false };

  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let text;
  if (minutes < 1) {
    text = 'Just now';
  } else if (minutes < 60) {
    text = `${minutes}m ago`;
  } else if (hours < 24) {
    const remainMins = minutes % 60;
    text = remainMins > 0 ? `${hours}h ${remainMins}m ago` : `${hours}h ago`;
  } else {
    const remainHours = hours % 24;
    text = remainHours > 0 ? `${days}d ${remainHours}h ago` : `${days}d ago`;
  }

  return {
    text,
    minutes,
    isOverdue: minutes >= 120, // 2+ hours = overdue for restaurant orders
    isUrgent: minutes >= 12 && minutes < 120,
    isWarning: minutes >= 8 && minutes < 12,
  };
}
