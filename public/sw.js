// ============================================================================
// TableSuite Service Worker — Push Notifications
// ============================================================================

const CACHE_NAME = 'tablesuite-v1';

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event — display notification
self.addEventListener('push', (event) => {
  let data = {
    title: 'New Offer!',
    body: 'Check out the latest deal from your restaurant.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'offer-notification',
    url: '/',
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    // If JSON parse fails, try as text
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    tag: data.tag || 'offer-' + Date.now(),
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: {
      url: data.url || '/',
      offerId: data.offerId,
    },
    actions: [
      {
        action: 'view',
        title: 'View Offer',
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
