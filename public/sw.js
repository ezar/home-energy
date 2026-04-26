const CACHE = 'energy-v1'
const PRECACHE = ['/', '/consumo', '/coste', '/pvpc', '/configuracion']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  // Skip non-GET, API routes, Supabase, analytics
  if (
    e.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('vercel-insights')
  ) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
