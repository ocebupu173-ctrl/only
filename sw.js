const CACHE_NAME = 'only-us-shell-v2'
const SHELL_URL = new URL('/', self.location.origin).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(new Request(SHELL_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname === '/sw.js') return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(SHELL_URL)
        const update = fetch(new Request(SHELL_URL, { cache: 'reload' }))
          .then(async (response) => {
            if (response.ok) await cache.put(SHELL_URL, response.clone())
            return response
          })
          .catch(() => null)

        if (cached) {
          event.waitUntil(update)
          return cached
        }

        return (await update) ?? Response.error()
      })(),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME)
            await cache.put(request, response.clone())
          }
          return response
        }),
    ),
  )
})
