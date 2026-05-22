const CACHE_VERSION = '1';
const CACHE_NAME = `cork-guide-${CACHE_VERSION}`;

const PRECACHE = [
    'index.html',
    'assets/main.css',
    'assets/logo.svg',
    'assets/site.webmanifest',
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png',
    'assets/icons/apple-touch-icon.png',
    'planner.js',
    'supabase-client.js',
    'group-planning-ui.js',
    'map.js',
    'planner-ui.js',
    'weather.js',
    'pwa.js',
    'data/config.json',
    'data/coordinates.json',
    'data/weather-tips.json',
    'data/places/culture.json',
    'data/places/food.json',
    'data/places/nightlife.json',
    'data/places/shopping.json',
    'data/places/excursions.json',
    'sections/intro.html',
    'sections/culture.html',
    'sections/food.html',
    'sections/nightlife.html',
    'sections/shopping.html',
    'sections/excursions.html',
    'sections/weather.html',
    'sections/map.html',
    'sections/planner.html',
    'sections/program.html'
];

function scopeUrl(path) {
    return new URL(path, self.registration.scope).href;
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE.map(scopeUrl)))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith('cork-guide-') && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(scopeUrl('index.html')))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const network = fetch(event.request).then((response) => {
                if (response.ok && response.type === 'basic') {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                }
                return response;
            });
            return cached || network;
        })
    );
});
