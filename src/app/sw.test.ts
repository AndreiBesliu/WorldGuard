import { expect, it } from 'vitest'
import { registerServiceWorker } from './sw'

it('înregistrează ./sw.js doar când e pornit și doar dacă browserul știe', async () => {
  const urls: string[] = []; const nav = { serviceWorker: { register: async (u: string) => { urls.push(u) } } }
  registerServiceWorker(nav, false); registerServiceWorker({}, true); expect(urls).toEqual([])
  registerServiceWorker(nav, true); expect(urls).toEqual(['./sw.js'])
})
it('un refuz la înregistrare nu aruncă', async () => {
  const nav = { serviceWorker: { register: async () => { throw new Error('refuzat') } } }
  expect(() => registerServiceWorker(nav, true)).not.toThrow()
  await new Promise((r) => setTimeout(r, 0))
})
