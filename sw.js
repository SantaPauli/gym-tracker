// Offline-Cache. Bei Änderungen an der App die Versionsnummer erhöhen.
const CACHE = 'gym-tracker-v7';
const ICS_CACHE = 'gym-ics'; // von app.js befüllt, siehe openIcsOnIos()
const FILES = [
  './',
  'index.html',
  'style.css',
  'plan.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== ICS_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sofort aus dem Cache antworten (auch bei schlechtem Netz im Gym) und im
// Hintergrund aktualisieren – Updates sind beim nächsten Öffnen da.
// Nur eigene Dateien; Anfragen an GitHub usw. gehen unverändert durch.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Kalenderdateien, die die App gerade erzeugt hat (für iPhone/iPad).
  if (url.pathname.includes('/kalender/')) {
    e.respondWith(caches.open(ICS_CACHE)
      .then(c => c.match(req))
      .then(res => res || new Response('Kalenderdatei nicht gefunden', { status: 404 })));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req)
      .then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
      .catch(() => cached || Response.error());
    if (cached) {
      e.waitUntil(network.catch(() => {}));
      return cached;
    }
    return network;
  }));
});
