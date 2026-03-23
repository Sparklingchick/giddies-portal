// Giddies Express Portal - Service Worker
// Handles offline caching and background sync

const CACHE_NAME = 'gx-portal-v1';
const STATIC_ASSETS = [
  '/giddies-portal/giddyexpress-login.html',
  '/giddies-portal/giddyexpress-admin.html',
  '/giddies-portal/giddyexpress-hr.html',
  '/giddies-portal/giddyexpress-manager.html',
  '/giddies-portal/giddyexpress-it.html',
  '/giddies-portal/giddyexpress-finance.html',
  '/giddies-portal/giddyexpress-payroll.html',
  '/giddies-portal/giddyexpress-employee.html',
  '/giddies-portal/manifest.json',
];

// Install - cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(err) {
        console.log('[SW] Cache install partial:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch - cache-first for HTML pages, network-first for API
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // API calls - network first, no caching
  if (url.includes('railway.app') || url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({
          detail: 'You are offline. Please check your connection.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // HTML pages - cache first, then network
  if (url.includes('.html') || url.includes('manifest.json')) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        var networkFetch = fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(function() { return null; });

        return cached || networkFetch || new Response(
          '<html><body style="background:#0D0F14;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:1rem"><div style="font-size:2rem">📵</div><div style="font-weight:700">You are offline</div><div style="color:#9CA3AF;font-size:.85rem">Connect to the internet to use this page</div></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
    return;
  }

  // Google Fonts - cache
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
  }
});

// Push notifications (future use)
self.addEventListener('push', function(event) {
  if (!event.data) return;
  var data = event.data.json();
  self.registration.showNotification(data.title || 'Giddies Express', {
    body: data.body || 'You have a new notification',
    icon: '/giddies-portal/icons/icon-192.png',
    badge: '/giddies-portal/icons/badge.png',
    tag: 'gx-notification',
    renotify: true,
    data: { url: data.url || '/giddies-portal/giddyexpress-login.html' }
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/giddies-portal/giddyexpress-login.html';
  event.waitUntil(clients.openWindow(url));
});
