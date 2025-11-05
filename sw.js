const CACHE_NAME = 'otcflow-cache-v1';
const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/design.css',
  'assets/css/theme.css',
  'assets/js/otc-tool.js',
  'assets/js/otc/ui.js',
  'assets/js/otc/store.js',
  'assets/js/otc/evaluator.js',
  'assets/js/otc/json-logic.js',
  'assets/js/otc/rule-packs.js',
  'assets/rules/manifest.json',
  'assets/rules/manifest.sig.txt',
  'assets/rules/public_key.pem',
  'assets/rules/pharmacy_first.uti_women_16_64.v1.json',
  'assets/rules/pharmacy_first.sore_throat_feverpain.v1.json',
  'assets/rules/pharmacy_first.acute_sinusitis.v1.json',
  'assets/rules/pharmacy_first.earache_aom.v1.json',
  'assets/rules/pharmacy_first.impetigo.v1.json',
  'assets/rules/pharmacy_first.infected_insect_bite.v1.json',
  'assets/rules/pharmacy_first.shingles.v1.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('index.html'))
    );
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
