/**
 * UPI Payment and Gateway Service
 * Handles NPCI standard UPI deep links, app-specific intents, dynamic QR codes,
 * and Razorpay gateway integration with automatic fallback to Counter payment.
 */

/**
 * Checks if the current browser is running on a mobile device
 */
export function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
}

/**
 * Generates standard NPCI UPI URI
 * Example: upi://pay?pa=restaurant@okaxis&pn=ChosteBangla&am=504.00&cu=INR&tn=Table%2001%20Order
 */
export function generateUpiUrl({
  vpa = 'tablesuite@upi',
  payeeName = 'Restaurant Dining',
  amount = 0,
  tableNumber = '01',
  orderId = '',
}) {
  const cleanVpa = (vpa || 'tablesuite@upi').trim();
  const cleanName = (payeeName || 'Restaurant Dining').trim();
  const formattedAmount = Number(amount || 0).toFixed(2);
  const note = `Table ${tableNumber || 'Order'} ${orderId ? '#' + orderId.slice(0, 6) : ''}`.trim();

  const params = new URLSearchParams({
    pa: cleanVpa,
    pn: cleanName,
    am: formattedAmount,
    cu: 'INR',
    tn: note,
  });

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates app-specific URI or fallback universal intent URL
 */
export function getAppSpecificUpiUrl(appId, params) {
  const universalUrl = generateUpiUrl(params);
  const upiQuery = universalUrl.replace(/^upi:\/\/pay\?/, '');

  switch (appId) {
    case 'gpay':
      // Google Pay Tez Intent
      return `tez://upi/pay?${upiQuery}`;
    case 'phonepe':
      // PhonePe Intent
      return `phonepe://pay?${upiQuery}`;
    case 'paytm':
      // Paytm Intent
      return `paytmmp://pay?${upiQuery}`;
    case 'bhim':
      // BHIM universal
      return universalUrl;
    default:
      return universalUrl;
  }
}

/**
 * Attempts to launch native UPI application on mobile
 */
export function launchUpiApp(appId, params) {
  const intentUrl = getAppSpecificUpiUrl(appId, params);
  const universalUrl = generateUpiUrl(params);

  try {
    // Try launching the specific app intent
    window.location.href = intentUrl;

    // Fallback timer: if app does not open after 1.5s, try universal intent
    const fallbackTimer = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.location.href = universalUrl;
      }
    }, 1500);

    return () => clearTimeout(fallbackTimer);
  } catch (err) {
    console.warn('Could not launch app specific intent, attempting universal upi://pay:', err);
    window.location.href = universalUrl;
    return null;
  }
}

/**
 * Dynamically loads Razorpay checkout script if Razorpay Key is provided
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Initiates Razorpay Standard Checkout with UPI Priority
 */
export async function openRazorpayCheckout({
  keyId,
  amount,
  venueName,
  tableNumber,
  guestName,
  guestPhone,
  brandColor = '#E23744',
  onSuccess,
  onFailure,
}) {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error('Razorpay SDK failed to load. Falling back to UPI direct.');
  }

  const amountInPaise = Math.round(Number(amount) * 100);

  const options = {
    key: keyId,
    amount: amountInPaise,
    currency: 'INR',
    name: venueName || 'Restaurant Dining',
    description: `Table ${tableNumber || 'Order'} Dining Bill`,
    image: undefined,
    prefill: {
      name: guestName || 'Guest',
      contact: guestPhone || '',
    },
    theme: {
      color: brandColor || '#E23744',
    },
    config: {
      display: {
        blocks: {
          upi: {
            name: 'Pay via UPI',
            instruments: [
              {
                method: 'upi',
              },
            ],
          },
        },
        sequence: ['block.upi'],
        preferences: {
          show_default_blocks: true,
        },
      },
    },
    handler: function (response) {
      if (onSuccess) {
        onSuccess(response);
      }
    },
    modal: {
      ondismiss: function () {
        if (onFailure) {
          onFailure('Payment cancelled by customer');
        }
      },
    },
  };

  const rzp = new window.Razorpay(options);

  rzp.on('payment.failed', function (response) {
    if (onFailure) {
      onFailure(response.error?.description || 'Online payment failed');
    }
  });

  rzp.open();
}
