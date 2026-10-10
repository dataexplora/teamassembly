// Minimal service worker: makes Assemblie installable as an app.
// Network only on purpose; chat data is live from Firestore and must never come from a stale cache.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
