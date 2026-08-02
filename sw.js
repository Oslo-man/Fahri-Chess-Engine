/* nusantara chess service worker — offline app shell + engine caching. */
const CACHE = 'clown-analyzer-v1';
const SHELL = [
  './', './index.html', './chess.min.js', './manifest.json',
  './icon-192.png', './icon-512.png',
  './stockfish-18-lite-single.js', './stockfish-18-lite-single.wasm',
  './sounds/move-self.mp3', './sounds/capture.mp3', './sounds/castle.mp3',
  './sounds/move-check.mp3', './sounds/promote.mp3'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(()=>{})));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Cross-origin (Lichess / Chess.com APIs, fonts): go to network, don't cache dynamic data.
  if (!sameOrigin) return;

  // App HTML: network-first so deployed updates show; fall back to cache offline.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Static assets (engine, sounds, icons, chess.js): cache-first.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
