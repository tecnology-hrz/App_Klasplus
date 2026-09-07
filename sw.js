/* ============================================================
   Klasplus - Service Worker
   Estrategia conservadora para no romper datos en vivo:
   - Navegaciones y HTML: red primero, cache como respaldo offline.
   - CSS/JS/imágenes/fuentes propias y CDN: cache primero + refresco
     en segundo plano (stale-while-revalidate).
   - Cualquier llamada a APIs (Firebase, Firestore, Groq, Mistral,
     OpenRouter, tiles de mapas, etc.): siempre a la red, sin cache.
   ============================================================ */

const VERSION = 'klasplus-v2';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSETS_CACHE = `${VERSION}-assets`;
const PAGES_CACHE = `${VERSION}-pages`;

// Rutas relativas al scope del service worker (raíz del proyecto)
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/css/mobile-frame.css',
  './src/js/pwa.js',
  './src/img/icon-192.png',
  './src/img/icon-512.png',
  './src/img/favicon-64.png',
  './src/img/logo-klasplus.png',
  './src/secciones/login.html',
  './src/secciones/dashboard.html',
  './src/css/dashboard.css',
  './src/css/login.css',
  './src/css/modal.css'
];

// Hosts cuyas respuestas NUNCA se guardan en cache
const NO_CACHE_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebasestorage.googleapis.com',
  'www.googleapis.com',
  'api.groq.com',
  'api.mistral.ai',
  'openrouter.ai',
  'nominatim.openstreetmap.org',
  'tile.openstreetmap.org'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll falla completo si un recurso falla: los agregamos uno a uno.
      await Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isNoCache(url) {
  return NO_CACHE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith('.' + host));
}

function isStaticAsset(url) {
  return /\.(css|js|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|eot|mp3|json)$/i.test(url.pathname);
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const fresh = await network;
  if (fresh) return fresh;
  throw new Error('Sin red y sin cache para ' + request.url);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = (await cache.match(request)) || (await caches.match(request));
    if (cached) return cached;

    const shell = await caches.open(SHELL_CACHE);
    const fallback =
      (await shell.match('./index.html')) || (await shell.match('./'));
    if (fallback) return fallback;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (isNoCache(url)) return; // pasa directo a la red

  // Navegaciones y documentos HTML
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }

  // Recursos estáticos (propios o de CDN)
  if (isStaticAsset(url) || ['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, ASSETS_CACHE));
  }
});
