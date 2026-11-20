// Proba în browser: pornește `vite preview` pe build-ul existent și deschide pagina în Chromium (Playwright).
// Verifică: (1) nicio eroare în consolă sau excepție, (2) nicio cerere în afara localhost, (3) canvasul e desenat,
// apoi jocul: (4) cartonașul de start, (5) tragerea cu degetul, (6) eroul stă, (7) cartonașul de final,
// (8) „Încă o partidă”, (9) testul de viteză, apoi pauza și reluarea: (10) butonul și cartonașul de pauză, (11) „Continuă”,
// (12) pauza la pagina ascunsă, (13) „Continuă partida” după reîncărcare, (14) „Partidă nouă” din pauză,
// (15) finalul șterge salvarea, (16) testul de viteză nu salvează, apoi instalarea și jocul fără internet: (17) manifestul și pictogramele,
// (18) service worker-ul și cache-ul, (19) pornirea fără rețea, apoi (20) pauza și „Continuă” atinse cu al doilea deget, cât primul ține joystickul,
// și panoul de alegere: (21) apare după plata nivelului și jocul stă, iar o atingere imediat după deschidere, Enter și Spațiu nu aleg, (22) un rând atins alege, (23) pauza și reîncărcarea îl păstrează,
// (24) tasta 1 alege, iar o atingere începută în afara unui rând nu alege nimic.
// Fiecare rulare pornește un browser cu un context nou, deci fără cache sau service worker rămase de la o rulare anterioară.
// Nu face parte din `npm run check`: are nevoie de un Playwright instalat pe mașină.
// Merge doar pe Linux și macOS: oprește serverul prin grupul lui de procese (`process.kill(-pid)`), pe care Windows nu îl are.
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
const dist = path.join(root, 'dist')
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
    // Câte culori are proba de 64 × 64 din mijlocul canvasului.
    const canvasColors = () => page.evaluate(() => {
      const c = document.getElementById('field')
      const ctx = c.getContext('2d')
      const d = ctx.getImageData(Math.floor(c.width / 2) - 32, Math.floor(c.height / 2) - 32, 64, 64).data
      const seen = new Set()
      for (let i = 0; i < d.length; i += 4) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])
      return seen.size
    })
    const colors = await canvasColors()
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

    // 17. manifestul și pictogramele lui, cerute din pagină, cum le cere telefonul la instalare
    const m17 = await page.evaluate(async () => {
      const href = document.querySelector('link[rel="manifest"]')?.href
      if (!href) return { name: null, icons: [] }
      const m = await (await fetch(href)).json()
      const icons = []
      for (const i of m.icons ?? []) {
        const r = await fetch(new URL(i.src, href))
        icons.push(`${i.src} ${r.status} ${r.headers.get('content-type')}`)
      }
      return { name: m.name, icons }
    })
    check(17, 'manifestul se încarcă, iar cele trei pictograme răspund cu image/png', m17.name === 'World Guard' && m17.icons.length === 3 && m17.icons.every((t) => / 200 image\/png$/.test(t)), `nume ${m17.name}, pictograme: ${m17.icons.join('; ') || 'niciuna'}`)

    // 18. service worker-ul e activ, controlează pagina, iar cache-ul are fiecare fișier din `dist` (fără `sw.js`)
    const listFiles = (dir) => fs.readdirSync(dir).flatMap((n) => { const p = path.join(dir, n); return fs.statSync(p).isDirectory() ? listFiles(p) : [path.relative(dist, p).split(path.sep).join('/')] })
    const expected = listFiles(dist).filter((f) => f !== 'sw.js').map((f) => (f === 'index.html' ? '/' : `/${f}`)).sort()
    const sw18 = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      for (let i = 0; i < 50 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100))
      const names = (await caches.keys()).filter((k) => k.startsWith('wg-'))
      const paths = names.length === 1 ? (await (await caches.open(names[0])).keys()).map((r) => new URL(r.url).pathname).sort() : []
      return { state: reg.active?.state ?? null, controlled: navigator.serviceWorker.controller !== null, names, paths }
    })
    const missing = expected.filter((p) => !sw18.paths.includes(p))
    const extra = sw18.paths.filter((p) => !expected.includes(p))
    check(18, 'service worker-ul e activ și controlează pagina, iar cache-ul wg-… are fiecare fișier din dist în afară de sw.js',
      sw18.state === 'activated' && sw18.controlled && sw18.names.length === 1 && missing.length === 0 && extra.length === 0,
      `stare ${sw18.state}, controlează ${sw18.controlled}, cache-uri ${sw18.names.join(', ') || 'niciunul'}, ${sw18.paths.length} din ${expected.length} fișiere, lipsă: ${missing.join(', ') || 'nimic'}, în plus: ${extra.join(', ') || 'nimic'}`)

    // 19. fără rețea: reîncărcarea arată cartonașul de start, iar după „Începe” canvasul e desenat, tot din cache
    const answered = []
    const onResponse = (r) => answered.push(r)
    await context.setOffline(true)
    try {
      page.on('response', onResponse)
      await load()
      const start19 = await visible('#startVeil')
      if (start19) await page.click('#start')
      await page.waitForTimeout(700)
      await shot('08-fara-retea.png')
      const colors19 = await canvasColors()
      const phase19 = await page.evaluate(() => window.__wg?.phase() ?? null)   // fără JavaScript încărcat, __wg lipsește
      const fromNet = answered.filter((r) => !r.fromServiceWorker()).map((r) => r.url())
      check(19, 'fără rețea, după reîncărcare se vede cartonașul de start, iar după „Începe” canvasul e desenat (tot din service worker)',
        start19 && phase19 === 'playing' && colors19 >= 20 && answered.length > 0 && fromNet.length === 0,
        `cartonaș ${start19}, fază ${phase19}, culori ${colors19}, răspunsuri ${answered.length}, din rețea: ${fromNet.join(', ') || 'niciunul'}`)
    } finally {
      page.off('response', onResponse)
      await context.setOffline(false)
    }

    // 20. al doilea deget: cât primul ține joystickul pe canvas, al doilea atinge pauza, apoi „Continuă” (browserul nu dă `click` pentru el)
    await page.evaluate(() => { if (window.__wg.phase() !== 'playing') document.getElementById('start').click() })
    await page.waitForTimeout(200)
    const fingers = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts })
    const middle = async (sel) => { const b = await page.locator(sel).boundingBox(); return b ? { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } : { x: 0, y: 0 } }
    const stick = { x: 140, y: 600, id: 1 }
    await fingers('touchStart', [{ ...stick, x: 200 }])
    await fingers('touchMove', [stick])
    const x20a = await heroX()
    await sleep(300)
    const x20b = await heroX()
    const p20 = await middle('#pause')
    await fingers('touchStart', [stick, { ...p20, id: 2 }])
    await sleep(60)
    await fingers('touchEnd', [{ ...p20, id: 2 }])   // se ridică doar al doilea deget
    await page.waitForTimeout(300)
    const phase20a = await page.evaluate(() => window.__wg.phase())
    const card20 = await visible('#pauseVeil')
    const r20 = await middle('#resume')
    await fingers('touchStart', [stick, { ...r20, id: 3 }])
    await sleep(60)
    await fingers('touchEnd', [{ ...r20, id: 3 }])
    await page.waitForTimeout(300)
    const phase20b = await page.evaluate(() => window.__wg.phase())
    await fingers('touchEnd', [])
    check(20, 'cât un deget ține joystickul, al doilea atinge pauza (faza „paused”, cartonașul pe ecran), apoi „Continuă” (faza „playing”)',
      x20a - x20b > 5 && phase20a === 'paused' && card20 && phase20b === 'playing',
      `nava ${x20a.toFixed(1)} → ${x20b.toFixed(1)}, după pauză: fază ${phase20a}, cartonaș ${card20}; după „Continuă”: fază ${phase20b}`)

    // Panoul de alegere. Nivelul se pregătește prin starea jocului: nava vie pe cercul ei, experiență și resurse destule.
    // Cât oferta e deschisă, starea stă pe loc, deci experiența pusă la 0 atunci nu schimbă nimic: doar oprește nivelul următor.
    const tNow = () => page.evaluate(() => window.__wg.state().t)
    const prepLevel = () => page.evaluate(() => {
      const s = window.__wg.state(), p = s.pads.find((q) => q.kind === 'hero')
      s.hero.dead = false; s.hero.x = p.x; s.hero.y = p.y
      s.hero.xp = 1000; s.crystal = 500; s.metal = 500
      p.dwell = 1                                   // plata pornește imediat
    })
    // Panoul nu primește alegeri în primele 400 ms (CHOICE_GRACE_MS); de aceea, după deschidere, se așteaptă 600 ms înainte de orice alegere.
    const GRACE_WAIT = 600
    const waitOffer = async (settle = true) => {
      await page.waitForFunction(() => window.__wg.state().offer !== null, null, { timeout: 5000 })
      await page.evaluate(() => { window.__wg.state().hero.xp = 0 })
      await page.waitForSelector('#choiceVeil:not([hidden])', { timeout: 2000 }).catch(() => {})
      if (settle) await page.waitForTimeout(GRACE_WAIT)
    }
    const rowNames = () => page.locator('#choiceOffers .offer-name').allInnerTexts()
    const offerNow = () => page.evaluate(() => JSON.stringify(window.__wg.state().offer))

    // 21. după plata nivelului: panoul cu trei rânduri, butonul de pauză ascuns, timpul partidei pe loc;
    // o atingere pe un rând imediat după deschidere nu alege; focusul nu e pe un rând, deci Enter și Spațiu nu aleg
    await prepLevel()
    await waitOffer(false)
    const seen21 = Date.now()
    const offer21 = await page.evaluate(() => window.__wg.state().offer)
    const early = await middle('#choiceOffers button:nth-child(1)')
    await fingers('touchStart', [{ ...early, id: 7 }])
    await sleep(40)
    await fingers('touchEnd', [])
    const early21 = Date.now() - seen21               // cât după ce s-a văzut panoul s-a ridicat degetul
    const focus21 = await page.evaluate(() => ({ id: document.activeElement?.id ?? '', onRow: document.activeElement?.closest('.offer') !== null }))
    await page.waitForTimeout(GRACE_WAIT)
    await shot('08-alegere.png')
    const keep21a = await offerNow()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)
    const keep21b = await offerNow()
    const panel21 = await visible('#choiceVeil')
    const rows21 = await page.locator('#choiceOffers button').count()
    const pause21 = await visible('#pause')
    const t21a = await tNow()
    await page.waitForTimeout(1000)
    const t21b = await tNow()
    check(21, 'după plata nivelului apare panoul cu trei rânduri, butonul de pauză nu se vede, timpul partidei stă o secundă; o atingere imediat după deschidere, Enter și Spațiu nu aleg nimic',
      panel21 && rows21 === 3 && !pause21 && t21a === t21b && early21 < 300 && keep21a === JSON.stringify(offer21) &&
        focus21.id === 'choiceCard' && !focus21.onRow && keep21b === keep21a,
      `panou ${panel21}, rânduri ${rows21}, pauză ${pause21}, t ${t21a.toFixed(3)} → ${t21b.toFixed(3)}, atingerea timpurie la ${early21} ms, ` +
        `oferta după ea ${keep21a === JSON.stringify(offer21) ? 'aceeași' : 'schimbată'}, focus pe #${focus21.id} (pe rând: ${focus21.onRow}), după Enter și Spațiu ${keep21b === keep21a ? 'aceeași' : 'schimbată'}`)
    failFast(21)

    // 22. atingerea celui de-al doilea rând: panoul se închide, partida merge, nava are modulul ales
    const row2 = await middle('#choiceOffers button:nth-child(2)')
    await fingers('touchStart', [{ ...row2, id: 4 }])
    await sleep(60)
    await fingers('touchEnd', [])
    await page.waitForTimeout(300)
    const panel22 = await visible('#choiceVeil')
    const t22a = await tNow()
    await page.waitForTimeout(500)
    const t22b = await tNow()
    const s22 = await page.evaluate(() => { const s = window.__wg.state(); return { offer: s.offer, mods: s.hero.mods.map((m) => [m.id, m.tier]) } })
    const want22 = offer21?.[1]
    const has22 = want22 !== undefined && s22.mods.some(([id, tier]) => id === want22.id && tier === want22.tier)
    check(22, 'atingerea celui de-al doilea rând închide panoul, timpul partidei crește din nou, iar nava are modulul ales',
      !panel22 && s22.offer === null && t22b > t22a && has22,
      `panou ${panel22}, ofertă ${JSON.stringify(s22.offer)}, t ${t22a.toFixed(3)} → ${t22b.toFixed(3)}, ales ${JSON.stringify(want22)}, module ${JSON.stringify(s22.mods)}`)
    failFast(22)

    // 23. cu panoul deschis: pagina ascunsă duce la pauză, „Continuă” la panou; după reîncărcare, „Continuă partida” arată aceleași trei nume
    await prepLevel()
    await waitOffer()
    const names23 = await rowNames()
    await setVisibility('hidden')
    await page.waitForTimeout(100)
    await setVisibility('visible')
    await page.waitForTimeout(300)
    const paused23 = (await visible('#pauseVeil')) && !(await visible('#choiceVeil'))
    const saved23 = JSON.parse((await saveRaw()) ?? 'null')
    await page.click('#resume')
    await page.waitForTimeout(300)
    const back23 = (await visible('#choiceVeil')) && !(await visible('#pause')) && (await page.evaluate(() => window.__wg.phase())) === 'playing'
    await load()
    const cont23 = await visible('#continue')
    if (cont23) await page.click('#continue')
    await page.waitForTimeout(GRACE_WAIT)            // și fereastra de început, ca tasta 1 din verificarea 24 să poată alege
    const names23b = await rowNames()
    const panel23 = await visible('#choiceVeil')
    check(23, 'pagina ascunsă cu panoul deschis: pauză și salvare cu oferta; „Continuă” și, după reîncărcare, „Continuă partida” arată panoul cu aceleași trei nume',
      paused23 && saved23?.state?.offer?.length === 3 && back23 && cont23 && panel23 && names23.length === 3 && names23.join() === names23b.join(),
      `pauză ${paused23}, oferta salvată ${JSON.stringify(saved23?.state?.offer)}, după „Continuă” ${back23}, „Continuă partida” ${cont23}, panou ${panel23}, nume ${names23.join('/')} → ${names23b.join('/')}`)
    failFast(23)

    // 24. degetul pus pe canvas înainte de panou și ridicat deasupra unui rând nu alege nimic.
    // Ce dovedește și ce nu: degetul de pe canvas are captura pe canvas (atingerea, plus `setPointerCapture` din bind.ts), deci rândul nu
    // primește nici `pointerdown`, nici `pointerup`; proba ar trece și cu un rând legat naiv, la `pointerup`. Garda din `onTap` („alege doar
    // degetul care a apăsat pe rând”) o dovedește testul din src/ui/choice.test.ts. Degetul se ridică după fereastra de început (`waitOffer`
    // așteaptă), deci nici fereastra nu e ce oprește alegerea aici.
    const row1 = await middle('#choiceOffers button:nth-child(1)')
    const r24 = await middle('#choiceOffers button:nth-child(2)')
    await page.keyboard.press('1')                 // tasta 1 alege prima ofertă și închide panoul
    await page.waitForTimeout(300)
    const keyClosed = !(await visible('#choiceVeil')) && (await page.evaluate(() => window.__wg.state().offer)) === null
    await fingers('touchStart', [{ ...row1, id: 5 }])   // pe canvas: joystickul pornește, fără mișcare
    await prepLevel()
    await waitOffer()
    const before24 = await page.evaluate(() => { const s = window.__wg.state(); return JSON.stringify([s.offer, s.hero.mods]) })
    const panel24a = await visible('#choiceVeil')
    await fingers('touchEnd', [])                  // ridicat pe loc: deasupra primului rând
    await page.waitForTimeout(300)
    const head24 = await middle('#choiceTitle')     // și unul care pornește pe panou, în afara rândurilor, și se ridică pe al doilea
    await fingers('touchStart', [{ ...head24, id: 6 }])
    await sleep(60)
    await fingers('touchMove', [{ ...r24, id: 6 }])
    await sleep(60)
    await fingers('touchEnd', [])
    await page.waitForTimeout(300)
    const after24 = await page.evaluate(() => { const s = window.__wg.state(); return JSON.stringify([s.offer, s.hero.mods]) })
    const panel24 = await visible('#choiceVeil')
    check(24, 'tasta 1 alege; apoi degetul pus pe canvas și ridicat deasupra unui rând după ce a apărut panoul nu alege nimic, nici cel tras de pe titlu pe un rând',
      keyClosed && panel24a && panel24 && after24 === before24,
      `tasta 1 ${keyClosed}, panou ${panel24a} → ${panel24}, oferta și modulele ${after24 === before24 ? 'neschimbate' : `schimbate: ${before24} → ${after24}`}`)

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
