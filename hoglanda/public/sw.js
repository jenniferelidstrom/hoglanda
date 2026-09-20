/* Höglanda Hästgård – service worker
 * Gör appen installerbar (PWA) och snabb, utan att störa Supabase.
 *
 * Strategi:
 *  - Navigeringar (sidladdningar): network-first → alltid färsk kod när nätet finns,
 *    faller tillbaka till cachad startsida när man är offline.
 *  - Statiska filer på samma domän (/assets/*, ikoner, manifest): stale-while-revalidate
 *    → snabb start, uppdateras i bakgrunden.
 *  - Allt annat (t.ex. Supabase, andra domäner) och alla icke-GET: rörs inte alls.
 *
 * Bumpa CACHE_VERSION när du vill tvinga fram en ren cache.
 */
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'hoglanda-' + CACHE_VERSION;
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// --- Push-notiser ---
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'Höglanda Hästgård', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Höglanda Hästgård';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.tag || undefined,
    renotify: !!data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { try { c.navigate(url); } catch (e) {} return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Rör bara GET på samma domän. Supabase & övriga anrop går rakt till nätet.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navigeringar: nätet först, cachad startsida som reserv (offline).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Statiska filer: svara från cache direkt, uppdatera i bakgrunden.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
