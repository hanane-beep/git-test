/* Fakturyo — service worker (hors ligne). Incrémenter V à chaque mise à jour. */
const V = 'fakturyo-v1';
const FILES = ['./', 'index.html', 'css/style.css', 'js/app.js', 'manifest.webmanifest', 'vendor/html2canvas.min.js', 'vendor/jspdf.umd.min.js',
  'fonts/inter-400.woff2', 'fonts/inter-600.woff2', 'fonts/poppins-600.woff2', 'fonts/poppins-700.woff2', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES))));
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).catch(() => caches.match('index.html'))));
});
