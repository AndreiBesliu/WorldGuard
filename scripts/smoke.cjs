// Proba în browser: pornește `vite preview` pe build-ul existent și deschide pagina în Chromium (Playwright).
// Verifică: (1) nicio eroare în consolă sau excepție, (2) nicio cerere în afara localhost, (3) canvasul e desenat,
// apoi jocul: (4) cartonașul de start, (5) tragerea cu degetul, (6) eroul stă, (7) cartonașul de final,
// (8) „Încă o partidă”, (9) testul de viteză, apoi pauza și reluarea: (10) butonul și cartonașul de pauză, (11) „Continuă”,
// (12) pauza la pagina ascunsă, (13) „Continuă partida” după reîncărcare, (14) „Partidă nouă” din pauză,
// (15) finalul șterge salvarea, (16) testul de viteză nu salvează.
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
    await shot('01-cer.png')
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
    const faces = await page.evaluate(async () => (await document.fonts.load('800 20px "Exo 2"', 'Planetă șț')).map((f) => `${f.family.replace(/["']/g, '')}:${f.status}`))
    const fontOk = faces.length >= 2 && faces.every((f) => f === 'Exo 2:loaded')
    const digits = await page.evaluate(() => {
      const host = document.getElementById('clock')
      const width = (t) => { const e = document.createElement('span'); e.textContent = t; e.style.position = 'absolute'; host.appendChild(e); const w = e.getBoundingClientRect().width; e.remove(); return w }
      return [width('1111'), width('0000')]
    })
    check(4, 'cartonașul de start se vede, cu titlul „World Guard”, în Exo 2, cu cifre de lățime egală', (await page.locator('#startVeil').isVisible()) && title === 'World Guard' && fontOk && Math.abs(digits[0] - digits[1]) < 0.01, `titlu: „${title}”, fețe de font: ${faces.join(', ') || 'niciuna'}, cifre ${digits.join(' / ')}`)
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
    check(7, 'cartonașul de final arată „Planeta a căzut” și un timp între 0:50 și 2:10', overTitle === 'Planeta a căzut' && overSecs >= 50 && overSecs <= 130, `titlu „${overTitle}”, timp ${overTime}`)
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
    const foes = await page.evaluate(() => window.__wg.state().foes.length)
    const fpsText = await page.locator('#fps').innerText()
    check(9, 'testul de viteză are 150 de dușmani și banda arată „fps” și „min”', foes === 150 && fpsText.includes('fps') && fpsText.includes('min'), `dușmani ${foes}, bandă „${fpsText}”`)

    // Informativ, nu o verificare: cât durează desenul cu 150 de nave în vedere (mediana a cinci serii de 200 de cadre).
    // La 1,5 s navele sunt încă la marginea hărții, în afara vederii, iar desenul le sare; de aceea sunt aduse,
    // la fel de fiecare dată, în jurul planetei: nava i la unghiul i × 2,399963 rad și la raza 70 + (i % 5) × 28.
    await page.evaluate(() => {
      window.__wg.state().foes.forEach((f, i) => {
        const a = i * 2.399963, r = 70 + (i % 5) * 28
        f.x = 550 + Math.cos(a) * r; f.y = 750 + Math.sin(a) * r
      })
    })
    await shot('05-test.png')
    const draws = []
    for (let i = 0; i < 5; i++) draws.push(await page.evaluate(() => window.__wg.drawMs(200)))
    draws.sort((a, b) => a - b)
    console.log(`SMOKE INFO: desen cu 150 de nave în jurul planetei: ${draws[2].toFixed(2)} ms pe cadru`)

    // Pauza și reluarea. Blocul de mai sus lasă pagina în testul de viteză, deci se pornește dintr-o pagină reîncărcată.
    const clockNow = () => page.locator('#clock').innerText()
    const secsOf = (t) => { const [m, s] = t.split(':').map(Number); return m * 60 + s }
    const saveRaw = () => page.evaluate(() => localStorage.getItem('wg.v1.save'))
    const visible = (sel) => page.locator(sel).isVisible()
    // Pagina ascunsă și apoi din nou la vedere, cum ar face telefonul când jucătorul iese din aplicație.
    const setVisibility = (state) => page.evaluate((v) => {
      Object.defineProperty(document, 'visibilityState', { value: v, configurable: true })
      Object.defineProperty(document, 'hidden', { value: v === 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }, state)

    // 10. butonul de pauză și cartonașul de pauză
    await load()
    await page.click('#start')
    await page.waitForTimeout(1000)
    const pauseShown = await visible('#pause')
    if (pauseShown) await page.click('#pause')
    await page.waitForTimeout(200)
    await shot('06-pauza.png')
    const pauseCard = (await visible('#pauseVeil')) && (await page.locator('#resume').innerText().catch(() => '')) === 'Continuă' && (await page.locator('#fresh').innerText().catch(() => '')) === 'Partidă nouă'
    const phase10 = await page.evaluate(() => window.__wg.phase?.())
    const c10a = await clockNow()
    await page.waitForTimeout(700)
    const c10b = await clockNow()
    check(10, 'butonul de pauză se vede în joc; apăsat, arată cartonașul de pauză, faza „paused”, iar ceasul stă', pauseShown && pauseCard && phase10 === 'paused' && c10a === c10b, `buton ${pauseShown}, cartonaș ${pauseCard}, fază ${phase10}, ceas ${c10a} → ${c10b}`)
    failFast(10)

    // 11. „Continuă” reia partida
    await page.click('#resume')
    await page.waitForTimeout(1200)
    const c11 = await clockNow()
    const veil11 = await visible('#pauseVeil')
    check(11, '„Continuă” ascunde cartonașul de pauză, iar ceasul înaintează', !veil11 && secsOf(c11) > secsOf(c10b), `cartonaș ${veil11}, ceas ${c10b} → ${c11}`)
    failFast(11)

    // 12. pagina ascunsă în timpul jocului pune pauză și salvează
    await page.evaluate(() => { window.__wg.state().crystal = 37; window.__wg.state().metal = 12 })   // stoc ușor de recunoscut după reluare
    await setVisibility('hidden')
    await page.waitForTimeout(100)
    await setVisibility('visible')
    await page.waitForTimeout(300)
    const veil12 = await visible('#pauseVeil')
    const saved12 = await saveRaw()
    check(12, 'pagina ascunsă în joc: la revenire, cartonașul de pauză e pe ecran și partida e salvată', veil12 && saved12 !== null, `cartonaș ${veil12}, salvare ${saved12 === null ? 'lipsă' : `${saved12.length} caractere`}`)
    failFast(12)

    // 13. după reîncărcare, „Continuă partida” reia partida salvată
    const before = JSON.parse(saved12).state
    const savedClock = `${Math.floor(Math.floor(before.t) / 60)}:${String(Math.floor(before.t) % 60).padStart(2, '0')}`
    await load()
    await shot('07-reluare.png')
    const contText = await page.locator('#continue').innerText().catch(() => '')
    const contShown = await visible('#continue')
    const startText = await page.locator('#start').innerText().catch(() => '')
    // Apăsat și citit în același pas, înaintea oricărui cadru: starea e exact cea reluată.
    const after = await page.evaluate(() => {
      document.getElementById('continue').click()
      const s = window.__wg.state()
      return { t: s.t, crystal: s.crystal, metal: s.metal, phase: window.__wg.phase() }
    })
    await page.waitForTimeout(300)
    const c13 = await clockNow()
    check(13, '„Continuă partida · m:ss” pe cartonașul de start, „Partidă nouă” pe buton; reluarea pornește de la timpul și stocul salvat',
      contShown && contText === `Continuă partida · ${savedClock}` && startText === 'Partidă nouă' && after.phase === 'playing' &&
      after.t === before.t && after.crystal === 37 && after.metal === 12 && secsOf(c13) >= secsOf(savedClock) && secsOf(c13) <= secsOf(savedClock) + 1,
      `„${contText}” (${contShown}), start „${startText}”, salvat t ${before.t.toFixed(2)}, reluat t ${after.t.toFixed(2)}, cristale ${after.crystal}, metal ${after.metal}, fază ${after.phase}, ceas ${c13}`)
    failFast(13)

    // 14. „Partidă nouă” din pauză
    await page.click('#pause')
    await page.waitForTimeout(200)
    await page.click('#fresh')
    await page.waitForTimeout(400)
    const c14 = await clockNow()
    const saved14 = await saveRaw()
    check(14, '„Partidă nouă” din pauză pornește o partidă cu ceasul sub 0:02 și șterge salvarea', !(await visible('#pauseVeil')) && secsOf(c14) < 2 && saved14 === null, `ceas ${c14}, salvare ${saved14 === null ? 'lipsă' : 'există'}`)
    failFast(14)

    // 15. sfârșitul partidei șterge salvarea
    await page.click('#pause')
    await page.waitForTimeout(200)
    const saved15a = await saveRaw()
    await page.click('#resume')
    await page.evaluate(() => window.__wg.run(200))
    await page.waitForSelector('#overVeil:not([hidden])', { timeout: 3000 }).catch(() => {})
    const over15 = await visible('#overVeil')
    const saved15 = await saveRaw()
    await load()
    const cont15 = await visible('#continue')
    const start15 = await page.locator('#start').innerText().catch(() => '')
    check(15, 'după final salvarea dispare, iar la reîncărcare cartonașul de start are doar „Începe”', saved15a !== null && over15 && saved15 === null && !cont15 && start15 === 'Începe', `salvare la pauză ${saved15a !== null}, final ${over15}, salvare după final ${saved15 === null ? 'lipsă' : 'există'}, „Continuă partida” ${cont15}, start „${start15}”`)
    failFast(15)

    // 16. testul de viteză pus pe pauză nu salvează
    await page.click('#stress')
    await page.waitForTimeout(500)
    await page.click('#pause')
    await page.waitForTimeout(200)
    const phase16 = await page.evaluate(() => window.__wg.phase())
    const saved16 = await saveRaw()
    check(16, 'testul de viteză pus pe pauză nu lasă nicio salvare', phase16 === 'paused' && saved16 === null, `fază ${phase16}, salvare ${saved16 === null ? 'lipsă' : 'există'}`)

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
