import { supabase } from './supabase';

// Production VAPID Public Key fallback (ensures notifications work even if Vercel env var is omitted)
export const DEFAULT_VAPID_PUBLIC_KEY =
  'BO-f-I2V2qua0N51iuVEjlGk6jn0ZcYdSaDwxYbeCed_S18iU88YMmH-KZhOnXGhXDDsce7dHuvCsCe6CJlmdiI';

export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;

/**
 * Convert a URL-safe base64 string to a Uint8Array (for VAPID key)
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detect if opened in an In-App Browser (WhatsApp, Instagram, Facebook, TikTok, etc.)
 */
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  return /FBAN|FBAV|Instagram|WhatsApp|Line|Snapchat|Musical_ly|TikTok|WeChat|MicroMessenger/i.test(
    ua
  );
}

/**
 * Detect iOS device
 */
export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}

/**
 * Detect standalone PWA mode
 */
export function isStandalonePWA() {
  if (typeof window === 'undefined') return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/**
 * Check if the browser supports push notifications
 */
export function isPushSupported() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

/**
 * Register the service worker with fallback & ready verification
 */
export async function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this browser.');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // If installing, wait for activation
    if (registration.installing) {
      await new Promise((resolve) => {
        registration.installing.addEventListener('statechange', (e) => {
          if (e.target.state === 'activated' || e.target.state === 'installed') {
            resolve();
          }
        });
      });
    }

    return registration;
  } catch (err) {
    console.warn('Service worker registration warning:', err);
    // Return existing registration if already registered
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;
    throw err;
  }
}

/**
 * Request notification permission from the user (supports Promise & callback)
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    // Modern Promise-based API
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    // Older Safari / Android callback API fallback
    return new Promise((resolve) => {
      Notification.requestPermission((p) => resolve(p));
    });
  }
}

/**
 * Check if user has previously enabled notifications for a venue
 */
export function hasUserEnabledNotifications(venueId) {
  if (typeof window === 'undefined') return false;
  try {
    const general = localStorage.getItem('tablesuite_push_subscribed') === 'true';
    const venueSpecific = venueId
      ? localStorage.getItem(`notif_enabled_${venueId}`) === 'true'
      : false;
    return general || venueSpecific;
  } catch {
    return false;
  }
}

/**
 * Mark notifications as enabled for a venue
 */
export function markNotificationsEnabled(venueId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('tablesuite_push_subscribed', 'true');
    if (venueId) {
      localStorage.setItem(`notif_enabled_${venueId}`, 'true');
    }
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

/**
 * Check if user is already subscribed for a venue in PushManager
 */
export async function getExistingSubscription() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration || !registration.pushManager) return null;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch {
    return null;
  }
}

/**
 * Subscribe to push notifications and save to Supabase
 * @param {string} venueId - The venue to subscribe for
 * @param {string|null} guestId - Optional guest ID
 * @returns {PushSubscription|null}
 */
export async function subscribeToPush(venueId, guestId = null) {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported on this browser.');
  }

  const keyToUse = VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  if (!keyToUse) {
    throw new Error('Push notifications are not configured yet.');
  }

  // Request permission
  const permission = await requestNotificationPermission();
  if (permission === 'denied') {
    throw new Error('Notification permission was blocked in browser settings.');
  }
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  // Register service worker
  const registration = await registerServiceWorker();

  // Wait for service worker to be ready
  await navigator.serviceWorker.ready;

  // Retrieve existing or create new push subscription
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyToUse),
    });
  }

  // Extract keys from subscription
  const subscriptionJson = subscription.toJSON();
  const { endpoint } = subscriptionJson;
  const p256dh = subscriptionJson.keys?.p256dh || '';
  const authKey = subscriptionJson.keys?.auth || '';

  // Save to Supabase (upsert on venue_id + endpoint)
  if (venueId && endpoint) {
    try {
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          venue_id: venueId,
          guest_id: guestId,
          endpoint,
          p256dh,
          auth_key: authKey,
          user_agent: navigator.userAgent,
          is_active: true,
        },
        {
          onConflict: 'venue_id,endpoint',
        }
      );

      if (error) {
        console.error('Failed to save push subscription in Supabase:', error);
      }
    } catch (saveErr) {
      console.warn('Error recording push subscription in database:', saveErr);
    }
  }

  // Record that user enabled notifications
  markNotificationsEnabled(venueId);

  return subscription;
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(venueId) {
  const subscription = await getExistingSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;

  try {
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .match({ venue_id: venueId, endpoint });
  } catch (err) {
    console.warn('Error updating push subscription in Supabase:', err);
  }

  try {
    await subscription.unsubscribe();
  } catch (err) {
    console.warn('Error unsubscribing PushManager:', err);
  }

  try {
    localStorage.removeItem('tablesuite_push_subscribed');
    if (venueId) {
      localStorage.removeItem(`notif_enabled_${venueId}`);
    }
  } catch {}
}
