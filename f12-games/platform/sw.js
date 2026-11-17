// F12 Games service worker (filled in by vite-plugin.ts at build time).
// The game's files are cached on install so it starts instantly and plays
// offline. Big folders (music) are cached the first time they're used.
// A new version downloads in the background and takes over once it's complete.
// A game that's already open keeps running the code it loaded; the next launch
// gets the new version.

const SLUG = '__SLUG__';
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const LAZY = __LAZY__;

const CACHE = `f12-${SLUG}-${VERSION}`;
const RUNTIME = `f12-${SLUG}-runtime`;
const SCOPE = new URL('./', self.location).href;

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

/** Downloads a few files at a time with retries, so a busy server can't break the install. */
async function precache() {
  const cache = await caches.open(CACHE);
  const queue = [...PRECACHE];
  const worker = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      if (await cache.match(url)) continue; // resuming an install that stopped halfway
      for (let attempt = 1; ; attempt++) {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (!res.ok) throw new Error(`${url}: ${res.status}`);
          await cache.put(url, res);
          break;
        } catch (err) {
          if (attempt >= 3) throw err;
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(`f12-${SLUG}-`) && key !== CACHE && key !== RUNTIME) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: serve the saved copy, refresh it in the background
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (!req.url.startsWith(SCOPE)) return;

  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./', { cacheName: CACHE }).then((hit) => hit ?? fetch(req)));
    return;
  }
  const rel = req.url.slice(SCOPE.length).split('?')[0];
  if (LAZY.some((p) => rel.startsWith(p))) {
    event.respondWith(cacheFirst(req, RUNTIME));
    return;
  }
  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((hit) => hit ?? fetch(req)));
});

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok || res.type === 'opaque') void cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit ?? fresh;
}
