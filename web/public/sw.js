/**
 * AgroNexus Service Worker
 * Strategy:
 *   - App shell (HTML/JS/CSS/fonts/images) → Cache-first with network fallback
 *   - API calls (/api/*)                   → Network-first with no cache
 *   - Supabase / external URLs             → Network-only
 */

const CACHE_NAME = 'agronexus-v1'
const OFFLINE_URL = '/offline.html'

// Files to pre-cache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-192.png',
  '/favicon-512.png',
  '/logo.png',
]

// ─── Install: pre-cache app shell ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  // Activate immediately — don't wait for old SW to finish
  self.skipWaiting()
})

// ─── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ─── Fetch: routing strategy ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests (Supabase, Leaflet CDN, etc.)
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // API calls → network-first, no cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'You are offline. Please reconnect.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )
    return
  }

  // Navigation requests (HTML pages) → network-first, fallback to cached '/'
  // then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy of the shell
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(async () => {
          const cached = await caches.match('/')
          return cached ?? (await caches.match(OFFLINE_URL)) ?? fetch(OFFLINE_URL)
        })
    )
    return
  }

  // Static assets (JS/CSS/fonts/images) → cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        // Only cache successful responses for same-origin assets
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
    })
  )
})

// ─── Push notifications (future) ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'AgroNexus', {
      body:  data.body ?? '',
      icon:  '/favicon-192.png',
      badge: '/favicon-48.png',
      data:  { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const existing = cs.find((c) => c.url === target && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(target)
    })
  )
})
