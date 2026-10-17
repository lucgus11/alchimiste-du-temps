/* Service worker — offline-first.
 * Au build, la liste des fichiers et l'identifiant de version sont injectés (voir vite.config.ts).
 * Stratégie : tout est précaché à l'installation, puis servi depuis le cache d'abord. */

const VERSION = '__BUILD_ID__';
const PRECACHE = '__PRECACHE__';
const CACHE = `alchimiste-${VERSION}`;
const SHELL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const urls = Array.isArray(PRECACHE) ? PRECACHE : [];
      // Chaque fichier est récupéré hors cache HTTP pour garantir une version cohérente.
      await Promise.all(
        urls.map(async (url) => {
          const response = await fetch(new Request(url, { cache: 'reload' }));
          if (!response.ok) throw new Error(`Précache impossible : ${url} (${response.status})`);
          await cache.put(url, response);
        }),
      );
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('alchimiste-') && n !== CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      // Navigation : on sert toujours l'application (SPA), même sans réseau.
      if (request.mode === 'navigate') {
        const shell = (await cache.match(SHELL)) || (await cache.match('/'));
        if (shell) return shell;
        try {
          return await fetch(request);
        } catch {
          return new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }
      }

      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') cache.put(request, response.clone());
        return response;
      } catch {
        return new Response('', { status: 504, statusText: 'Hors ligne' });
      }
    })(),
  );
});
