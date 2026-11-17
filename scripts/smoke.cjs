// Proba în browser: pornește `vite preview` pe build-ul existent și deschide pagina în Chromium (Playwright).
// Verifică: (1) nicio eroare în consolă sau excepție, (2) nicio cerere în afara localhost, (3) canvasul e desenat.
// Nu face parte din `npm run check`: are nevoie de un Playwright instalat pe mașină.
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

let chromium
try {
  ({ chromium } = require('playwright'))
} catch {
  console.log('SMOKE: Playwright nu este instalat (npm i -g playwright); proba nu poate rula.')
  process.exit(2)
}

const PORT = 4180
const URL_ = `http://localhost:${PORT}/`
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'smoke-out')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(URL_); if (r.ok) return } catch { /* încă nu a pornit */ }
    await sleep(100)
  }
  throw new Error('serverul de previzualizare nu a pornit')
}

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' })
  let code = 0
  let browser
  try {
    await waitForServer()
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
    const page = await context.newPage()
    const errors = [], outside = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
    page.on('pageerror', (e) => errors.push(`excepție: ${e.message}`))
    page.on('request', (r) => {
      const u = new URL(r.url())
      if (u.protocol === 'http:' || u.protocol === 'https:') { if (u.hostname !== 'localhost') outside.push(r.url()) }
    })
    await page.goto(URL_)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1500)
    fs.mkdirSync(outDir, { recursive: true })
    await page.screenshot({ path: path.join(outDir, '01-teren.png') })

    const colors = await page.evaluate(() => {
      const c = document.getElementById('field')
      const ctx = c.getContext('2d')
      const d = ctx.getImageData(Math.floor(c.width / 2) - 32, Math.floor(c.height / 2) - 32, 64, 64).data
      const seen = new Set()
      for (let i = 0; i < d.length; i += 4) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])
      return seen.size
    })

    const checks = [
      ['fără erori în consolă sau în pagină', errors.length === 0, errors.join(' | ')],
      ['nicio cerere în afara localhost', outside.length === 0, outside.join(' | ')],
      ['canvasul e desenat (cel puțin 20 de culori în proba din mijloc)', colors >= 20, `culori: ${colors}`],
    ]
    for (let i = 0; i < checks.length; i++) {
      const [name, ok, detail] = checks[i]
      if (!ok) { console.log(`SMOKE EȘUAT la verificarea ${i + 1}: ${name} (${detail})`); code = 1; break }
    }
    if (code === 0) console.log(`SMOKE OK (${checks.length} verificări)`)
  } catch (e) {
    console.log(`SMOKE EȘUAT: ${e.message}`)
    code = 1
  } finally {
    if (browser) await browser.close()
    server.kill()
  }
  process.exit(code)
}

main()
