// Generat la build: __VERSION__ și __FILES__ sunt înlocuite de scripts/build-sw.mjs.
// O versiune nouă așteaptă până se închide jocul: nu schimbă fișierele sub o partidă în curs.
const CACHE = 'wg-__VERSION__'
const FILES = __FILES__

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wg-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return
  e.respondWith((async () => {
    const c = await caches.open(CACHE)
    // Cache-ul ține doar fișierele noastre, puse la instalare; un antet `Vary` (de pildă `Vary: Origin` de la server) ar face ca cererile paginii să nu le găsească.
    const hit = await c.match(e.request, { ignoreSearch: true, ignoreVary: true })
    if (hit) return hit
    if (e.request.mode === 'navigate') { const page = await c.match('./'); if (page) return page }
    return fetch(e.request)
  })())
})
