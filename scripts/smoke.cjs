// Proba în browser: pornește `vite preview` pe build-ul existent și deschide pagina în Chromium (Playwright).
// Verifică: (1) nicio eroare în consolă sau excepție, (2) nicio cerere în afara localhost, (3) canvasul e desenat,
// apoi jocul: (4) cartonașul de start, (5) tragerea cu degetul, (6) eroul stă, (7) cartonașul de final,
// (8) „Încă o partidă”, (9) testul de viteză.
// Nu face parte din `npm run check`: are nevoie de un Playwright instalat pe mașină.
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

let chromium
try {
  ({ chromium } = require('playwright'))
} catch {
  console.log("SMOKE: Playwright trebuie să poată fi găsit de require('playwright') (instalat local sau cu NODE_PATH spre modulele globale); proba nu poate rula.")
  process.exit(2)
}

const PORT = 4180
const URL_ = `http://localhost:${PORT}/`
const PAGE = `${URL_}?seed=7&debug=1`
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'smoke-out')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function answers() {
  try { await fetch(URL_, { signal: AbortSignal.timeout(1000) }); return true } catch { return false }
}

/** Pornește `vite preview` direct (fără npx, care lasă procese în urmă), într-un grup de procese propriu. */
function startServer() {
  const child = spawn(path.join(root, 'node_modules', '.bin', 'vite'), ['preview', '--port', String(PORT), '--strictPort'], {
    cwd: root, stdio: ['ignore', 'ignore', 'pipe'], detached: true,
  })
  const server = { child, stderr: '', exited: false }
  child.stderr.on('data', (d) => { server.stderr += d })
  child.on('exit', () => { server.exited = true })
  child.on('error', (e) => { server.stderr += String(e); server.exited = true })
  return server
}

/** Oprește tot grupul serverului și așteaptă să dispară; apoi verifică că portul e liber. */
async function stopServer(server) {
  if (!server.exited) {
    for (const sig of ['SIGTERM', 'SIGKILL']) {
      try { process.kill(-server.child.pid, sig) } catch { /* grupul a dispărut deja */ }
      for (let i = 0; i < 30 && !server.exited; i++) await sleep(100)
      if (server.exited) break
    }
  }
  if (!server.exited) throw new Error(`serverul (pid ${server.child.pid}) nu a putut fi oprit`)
  for (let i = 0; i < 30 && (await answers()); i++) await sleep(100)
  if (await answers()) throw new Error(`după oprire, ceva încă răspunde pe portul ${PORT}`)
}

async function waitForServer(server) {
  for (let i = 0; i < 100; i++) {
    if (server.exited) throw new Error(`serverul de previzualizare s-a oprit: ${server.stderr.trim() || 'fără mesaj'}`)
    try { const r = await fetch(URL_); if (r.ok) return } catch { /* încă nu a pornit */ }
    await sleep(100)
  }
  throw new Error(`serverul de previzualizare nu a pornit: ${server.stderr.trim() || 'fără mesaj'}`)
}

async function main() {
  if (await answers()) {
    console.log(`SMOKE: ceva răspunde deja pe ${URL_} (poate un build vechi); închide-l și rulează din nou.`)
    process.exit(3)
  }
  const server = startServer()
  process.on('exit', () => { if (!server.exited) { try { process.kill(-server.child.pid, 'SIGKILL') } catch { /* gata */ } } })
  let code = 0
  let browser
  const results = []
  const check = (n, name, ok, detail = '') => { results.push({ n, name, ok, detail }); return ok }
  const failFast = (n) => { const r = results.find((x) => x.n === n); if (r && !r.ok) throw new Error(`verificarea ${n}: ${r.name} (${r.detail})`) }
  try {
    await waitForServer(server)
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
    fs.mkdirSync(outDir, { recursive: true })
    const shot = (name) => page.screenshot({ path: path.join(outDir, name) })
    const load = async () => { await page.goto(PAGE); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(800) }
    const heroX = () => page.evaluate(() => window.__wg.state().hero.x)

    await load()
    await page.waitForTimeout(700)
    await shot('01-teren.png')
    const colors = await page.evaluate(() => {
      const c = document.getElementById('field')
      const ctx = c.getContext('2d')
      const d = ctx.getImageData(Math.floor(c.width / 2) - 32, Math.floor(c.height / 2) - 32, 64, 64).data
      const seen = new Set()
      for (let i = 0; i < d.length; i += 4) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])
      return seen.size
    })
    check(3, 'canvasul e desenat (cel puțin 20 de culori în proba din mijloc)', colors >= 20, `culori: ${colors}`)

    // 4. cartonașul de start
    await shot('02-start.png')
    const title = await page.locator('#startVeil h1').innerText().catch(() => '')
    check(4, 'cartonașul de start se vede, cu titlul „World Guard”', (await page.locator('#startVeil').isVisible()) && title === 'World Guard', `titlu: „${title}”`)
    failFast(4)

    // 5. tragere cu degetul de la (200, 600) la (140, 600), ținută 500 ms
    await page.click('#start')
    await page.waitForTimeout(200)
    const x0 = await heroX()
    const hintBefore = await page.locator('#hint').isVisible()
    const cdp = await context.newCDPSession(page)
    const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: 600, id: 1 }] })
    await touch('touchStart', 200)
    await touch('touchMove', 140)   // o singură mișcare, apoi ținut 500 ms: eroul merge ~0,5 s, nu mai mult
    await sleep(500)
    await shot('03-joc.png')
    const x1 = await heroX()
    const hintAfter = await page.locator('#hint').isVisible()
    check(5, 'tragerea mută eroul cu peste 40 de unități la stânga, iar indiciul dispare', x0 - x1 > 40 && hintBefore && !hintAfter, `x ${x0.toFixed(1)} → ${x1.toFixed(1)}, indiciu înainte ${hintBefore}, după ${hintAfter}`)
    failFast(5)

    // 6. după ridicarea degetului eroul stă
    await touch('touchEnd', 0)
    await page.waitForTimeout(150)
    const xa = await heroX()
    await page.waitForTimeout(300)
    const xb = await heroX()
    check(6, 'după ridicarea degetului eroul stă', xa === xb, `x ${xa} → ${xb}`)
    failFast(6)

    // 7. sfârșitul partidei
    await page.evaluate(() => window.__wg.run(200))
    await page.waitForSelector('#overVeil:not([hidden])', { timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(300)
    await shot('04-final.png')
    const overTitle = await page.locator('#overVeil h1').innerText().catch(() => '')
    const overTime = await page.locator('#overTime').innerText().catch(() => '')
    const [om, os] = overTime.split(':').map(Number)
    const overSecs = om * 60 + os
    check(7, 'cartonașul de final arată „Castelul a căzut” și un timp între 0:50 și 2:10', overTitle === 'Castelul a căzut' && overSecs >= 50 && overSecs <= 130, `titlu „${overTitle}”, timp ${overTime}`)
    failFast(7)

    // 8. încă o partidă
    await page.click('#again')
    await page.waitForTimeout(400)
    const clockText = await page.locator('#clock').innerText()
    const [cm, cs] = clockText.split(':').map(Number)
    check(8, '„Încă o partidă” pornește o partidă nouă, cu ceasul sub 0:02', !(await page.locator('#overVeil').isVisible()) && cm * 60 + cs < 2, `ceas ${clockText}`)
    failFast(8)

    // 9. testul de viteză, după reîncărcare
    await load()
    await page.click('#stress')
    await page.waitForTimeout(1500)
    await shot('05-test.png')
    const foes = await page.evaluate(() => window.__wg.state().foes.length)
    const fpsText = await page.locator('#fps').innerText()
    check(9, 'testul de viteză are 150 de dușmani și banda arată „fps” și „min”', foes === 150 && fpsText.includes('fps') && fpsText.includes('min'), `dușmani ${foes}, bandă „${fpsText}”`)

    // Informativ, nu o verificare: cât durează desenul cu 150 de dușmani (mediana a cinci serii de 200 de cadre).
    const draws = []
    for (let i = 0; i < 5; i++) draws.push(await page.evaluate(() => window.__wg.drawMs(200)))
    draws.sort((a, b) => a - b)
    console.log(`SMOKE INFO: desen cu 150 de dușmani: ${draws[2].toFixed(2)} ms pe cadru`)

    check(1, 'fără erori în consolă sau în pagină', errors.length === 0, errors.join(' | '))
    check(2, 'nicio cerere în afara localhost', outside.length === 0, outside.join(' | '))
    results.sort((a, b) => a.n - b.n)
    const bad = results.find((r) => !r.ok)
    if (bad) { console.log(`SMOKE EȘUAT la verificarea ${bad.n}: ${bad.name} (${bad.detail})`); code = 1 }
    else console.log(`SMOKE OK (${results.length} verificări)`)
  } catch (e) {
    console.log(`SMOKE EȘUAT: ${e.message}`)
    code = 1
  } finally {
    if (browser) await browser.close().catch(() => {})
    try { await stopServer(server) } catch (e) { console.log(`SMOKE: ${e.message}`); code = code || 1 }
    if (code !== 0 && server.stderr.trim()) console.log(`stderr vite:\n${server.stderr.trim()}`)
  }
  process.exit(code)
}

main()
