/* Agri Labs — service worker
   - L'application (index.html, icônes, manifeste) est mise en cache : elle s'ouvre sans connexion.
   - index.html est toujours demandé au réseau d'abord ; la copie en cache ne sert qu'hors ligne.
   - L'API d'analyse (/api/…) ne passe jamais par le cache.
   - Pour forcer le message « Nouvelle version disponible », changez VERSION ci-dessous.        */

const VERSION = 'v1.0.0';
const SHELL_CACHE = 'agrilabs-shell-' + VERSION;
const FONT_CACHE = 'agrilabs-fonts-v1';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(n => n.startsWith('agrilabs-shell-') && n !== SHELL_CACHE)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// L'application demande l'activation d'une nouvelle version quand la personne touche « Actualiser ».
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (/\/api\//.test(url.pathname)) return;                    // réseau uniquement
    if (req.mode === 'navigate') { event.respondWith(navigate(req)); return; }
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com') { event.respondWith(staleWhileRevalidate(req, FONT_CACHE)); return; }
  if (url.hostname === 'fonts.gstatic.com') { event.respondWith(cacheFirst(req, FONT_CACHE)); return; }
});

async function navigate(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await withTimeout(fetch(req), 4000);
    if (res && res.ok) cache.put('index.html', res.clone());     // application à page unique : toutes les adresses servent index.html
    return res;
  } catch (e) {
    return (await cache.match('index.html', { ignoreSearch: true })) ||
           (await cache.match('./', { ignoreSearch: true })) ||
           new Response('Agri Labs est hors ligne. Reconnectez-vous une première fois pour installer l\'application.',
             { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  if (cached) { network.catch(() => {}); return cached; }
  return (await network) || new Response('', { status: 504 });
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response('', { status: 504 });
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
