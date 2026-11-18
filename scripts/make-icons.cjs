// Desenează pictogramele PNG din `public/icons/icon.svg`, cu Chromium-ul din Playwright (`npm run icons`).
// Se rulează doar când se schimbă desenul; PNG-urile scrise se comit.
// - icon-192.png, icon-512.png („any”): desenul mărit de ICON_ZOOM ori, ca planeta să umple pictograma;
// - icon-maskable-512.png („maskable”): desenul la mărimea lui, deci în cercul din mijloc de 80% din latură,
//   iar cerul ajunge până la margini, oricum ar tăia telefonul forma.
const fs = require('node:fs')
const path = require('node:path')

let chromium
try {
  ({ chromium } = require('playwright'))
} catch {
  console.log("icons: Playwright trebuie să poată fi găsit de require('playwright'); pictogramele nu pot fi desenate.")
  process.exit(2)
}

const dir = path.resolve(__dirname, '..', 'public', 'icons')
const ICON_ZOOM = 1.2        // desenul are raza 202 din 256; mărit de 1,2 ori ajunge la 242, tot în pătrat
const OUT = [
  { file: 'icon-192.png', size: 192, zoom: ICON_ZOOM },
  { file: 'icon-512.png', size: 512, zoom: ICON_ZOOM },
  { file: 'icon-maskable-512.png', size: 512, zoom: 1 },
]

async function main() {
  const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.setContent('<!doctype html><body></body>')
    for (const o of OUT) {
      const dataUrl = await page.evaluate(async ({ svg, size, zoom }) => {
        const img = new Image()
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        await img.decode()
        const c = document.createElement('canvas')
        c.width = size; c.height = size
        const ctx = c.getContext('2d')
        const d = size * zoom
        ctx.drawImage(img, (size - d) / 2, (size - d) / 2, d, d)
        return c.toDataURL('image/png')
      }, { svg, size: o.size, zoom: o.zoom })
      const png = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
      fs.writeFileSync(path.join(dir, o.file), png)
      console.log(`icons: ${o.file} (${o.size}×${o.size}, ${png.length} octeți)`)
    }
  } finally {
    await browser.close()
  }
}

main().catch((e) => { console.error(`icons: ${e.message}`); process.exit(1) })
