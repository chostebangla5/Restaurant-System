import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Convert a URL-safe base64 string to a Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String) {
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
 * Check if the browser supports push notifications
 */
export function isPushSupported() {
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
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

/**
 * Register the service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this browser.');
  }
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  });
  return registration;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to push notifications and save to Supabase
 * @param {string} venueId - The venue to subscribe for
 * @param {string|null} guestId - Optional guest ID
 * @returns {PushSubscription|null}
 */
export async function subscribeToPush(venueId, guestId = null) {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('VAPID_PUBLIC_KEY is not configured. Push notifications will not work.');
    throw new Error('Push notifications are not configured yet.');
  }

  // Request permission
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied.');
  }

  // Get or register service worker
  const registration = await registerServiceWorker();

  // Wait for the service worker to be ready
  await navigator.serviceWorker.ready;

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Extract keys from subscription
  const subscriptionJson = subscription.toJSON();
  const { endpoint } = subscriptionJson;
  const p256dh = subscriptionJson.keys?.p256dh || '';
  const authKey = subscriptionJson.keys?.auth || '';

  // Save to Supabase (upsert on venue_id + endpoint)
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
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
    console.error('Failed to save push subscription:', error);
    throw error;
  }

  return subscription;
}

/**
 * Check if user is already subscribed for a venue
 */
export async function getExistingSubscription() {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return null;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch {
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(venueId) {
  const subscription = await getExistingSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;

  // Remove from Supabase
  await supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .match({ venue_id: venueId, endpoint });

  // Unsubscribe from browser
  await subscription.unsubscribe();
}
