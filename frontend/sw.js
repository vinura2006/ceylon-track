/**
 * Ceylon Track — Service Worker
 * Provides offline support by caching the timetable, station list,
 * and static assets. Uses a network-first strategy for API calls
 * that change frequently (live GPS, status) and cache-first for
 * stable data (stations, all-schedules, static pages).
 */

const CACHE_NAME = 'ceylon-track-v4';

// Static assets always cached on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/timetable.html',
    '/schedules.html',
    '/disruptions.html',
    '/login.html',
    '/register.html',
    '/js/config.js',
    '/js/api.js',
    '/js/theme-loader.js',
    '/mfa-setup.html',
    '/css/theme.css',
];

// API paths to cache (network-first, serve stale on failure)
const CACHEABLE_API_PATHS = [
    '/api/stations',
    '/api/schedules/all',
    '/api/timetable',
];

// ─── Install: pre-cache static assets ───────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ─── Activate: delete old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ─── Fetch: routing strategy ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
 
    // Skip non-GET and cross-origin requests
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;

    // Skip live/real-time API paths (GPS, WebSocket, auth, MFA)
    const livePatterns = ['/api/gps', '/api/auth', '/ws', '/api/staff', '/api/sessions', '/api/mfa'];
    if (livePatterns.some(p => url.pathname.startsWith(p))) return;

    // Cacheable API paths: network-first, stale fallback
    if (CACHEABLE_API_PATHS.some(p => url.pathname.startsWith(p))) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Static assets: network-first with cache fallback
    if (!url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
    }
});
