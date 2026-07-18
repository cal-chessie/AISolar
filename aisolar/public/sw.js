/**
 * Service Worker Kill Switch
 *
 * This file used to be a cache-first service worker that served stale JS
 * bundles. The current app doesn't register a service worker at all, but
 * browsers that previously registered the old sw.js still have it active.
 *
 * This replacement does ONE thing: on install, it clears ALL caches and
 * unregisters itself. Once the browser picks up this version, the SW is
 * gone for good and all cached assets are purged.
 */

// Clear all caches on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// On activate, clear any remaining caches + unregister self
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Tell all open clients to reload
      return self.clients.matchAll({ type: 'window' });
    }).then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    })
  );
});

// Pass-through fetch — don't intercept anything
self.addEventListener('fetch', (event) => {
  // intentionally empty — let the browser handle all requests normally
});
