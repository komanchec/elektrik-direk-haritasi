// ============================================
// Service Worker — Çevrimdışı Çalışma
// ============================================
const CACHE_NAME = 'direk-haritasi-v1';
const urlsToCache = [
    '/',
    '/css/style.css',
    '/js/app.js',
    '/js/modules/state.js',
    '/js/modules/api.js',
    '/js/modules/ui.js',
    '/js/modules/map-core.js',
    '/js/modules/tools.js',
    '/js/modules/direk.js',
    '/js/modules/hat.js',
    '/js/modules/export.js',
    '/js/modules/import.js',
    '/js/modules/location.js',
    '/js/modules/theme.js',
    '/js/modules/filter.js',
    '/js/modules/metraj.js',
    '/js/modules/pdf-rapor.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css'
];

// Install — cache önemli dosyalar
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('SW: Caching app shell');
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Activate — eski cache temizleme
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — Network first, cache fallback
self.addEventListener('fetch', event => {
    // API istekleri cache'lenmez
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(JSON.stringify({ error: 'Çevrimdışı' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );
        return;
    }

    // Statik dosyalar — network-first, cache fallback
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
