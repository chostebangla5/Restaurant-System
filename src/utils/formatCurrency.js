/**
 * Formats a number as a currency string
 * @param {number} amount
 * @param {string} currency - e.g. 'INR', 'USD', 'EUR'
 * @returns {string}
 */
export function formatCurrency(amount = 0, currency = 'INR') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `₹${num.toFixed(2)}`;
  }
}
