// ============================================================================
// TableSuite Service Worker — Push Notifications (v2 with Rich Branding)
// ============================================================================

const CACHE_NAME = 'tablesuite-v2';

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event — display rich branded notification
self.addEventListener('push', (event) => {
  let data = {
    title: 'TableSuite • Special Offer',
    body: 'Check out the latest dining discount right at your table.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    image: '/icons/banner-promo.png',
    tag: 'offer-notification',
    url: '/',
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  // Resolve absolute URLs for Android notification engine
  const origin = self.location.origin;
  const iconUrl = data.icon?.startsWith('http')
    ? data.icon
    : `${origin}${data.icon || '/icons/icon-192.png'}`;
  const badgeUrl = data.badge?.startsWith('http')
    ? data.badge
    : `${origin}${data.badge || '/icons/badge-72.png'}`;
  const imageUrl = data.image?.startsWith('http')
    ? data.image
    : `${origin}${data.image || '/icons/banner-promo.png'}`;

  const options = {
    body: data.body,
    icon: iconUrl,
    badge: badgeUrl,
    image: imageUrl,
    tag: data.tag || 'offer-' + Date.now(),
    vibrate: [250, 100, 250, 100, 250],
    timestamp: data.timestamp || Date.now(),
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/',
      offerId: data.offerId,
    },
    actions: [
      {
        action: 'view',
        title: '🎁 View Offer',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click — open the app/URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});
