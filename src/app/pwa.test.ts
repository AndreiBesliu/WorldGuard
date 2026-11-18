import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

// citește fișierele așa cum ajung la telefon
const read = (p: string) => readFileSync(join(process.cwd(), p))
it('manifestul are ce cere instalarea', () => {
  const m = JSON.parse(read('public/manifest.webmanifest').toString('utf8'))
  expect(m).toMatchObject({ name: 'World Guard', short_name: 'World Guard', lang: 'ro', start_url: './', scope: './', display: 'fullscreen', orientation: 'portrait' })
  expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/); expect(m.background_color).toBe(m.theme_color)
  expect(m.icons).toEqual([
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ])
})
it('pictogramele sunt PNG-uri de mărimea declarată', () => {
  for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512]] as const) {
    const b = read('public/icons/' + file)
    expect(b.subarray(1, 4).toString('latin1')).toBe('PNG')
    expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([size, size])
  }
})
it('pagina trimite la manifest și la pictogramă', () => {
  const html = read('index.html').toString('utf8')
  expect(html).toContain('rel="manifest" href="./manifest.webmanifest"')
  expect(html).toContain('name="theme-color"')
})
it('service worker-ul nu sare peste așteptare și are locurile de umplut la build', () => {
  const t = read('scripts/sw-template.js').toString('utf8')
  expect(t).not.toMatch(/skipWaiting/)
  expect(t).toContain('__VERSION__'); expect(t).toContain('__FILES__')
  expect(t).toContain('ignoreVary: true')
})
