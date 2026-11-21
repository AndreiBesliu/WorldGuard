// Proba în browser: pornește `vite preview` pe build-ul existent și deschide pagina în Chromium (Playwright).
// Verifică: (1) nicio eroare în consolă sau excepție, (2) nicio cerere în afara localhost, (3) canvasul e desenat,
// apoi jocul: (4) cartonașul de start, (5) tragerea cu degetul, (6) eroul stă, (7) cartonașul de final,
// (8) „Încă o partidă”, (9) testul de viteză, apoi pauza și reluarea: (10) butonul și cartonașul de pauză, (11) „Continuă”,
// (12) pauza la pagina ascunsă, (13) „Continuă partida” după reîncărcare, (14) „Partidă nouă” din pauză,
// (15) finalul șterge salvarea, (16) testul de viteză nu salvează, apoi instalarea și jocul fără internet: (17) manifestul și pictogramele,
// (18) service worker-ul și cache-ul, (19) pornirea fără rețea, apoi (20) pauza și „Continuă” atinse cu al doilea deget, cât primul ține joystickul,
// și panoul de alegere: (21) apare după plata nivelului și jocul stă, iar o atingere imediat după deschidere, Enter și Spațiu nu aleg, (22) un rând atins alege, (23) pauza și reîncărcarea îl păstrează,
// (24) tasta 1 alege, iar o atingere începută în afara unui rând nu alege nimic, (25, 26) banda, apoi zborul, pornit cu ?debug=1&zbor=1:
// (27) nava face mișcarea degetului × 1,2, (28) câmpul se vede întreg, lipit de bandă, la 360 × 640, 390 × 780 și 412 × 892, (29) pauza la pagina ascunsă,
// apoi drumul întreg, de pe cartonașe: (30) cartonașul de start cu cele două moduri, rezerva și sectorul, (31) zborul pornit de pe el, banda lui
// și condusul (al doilea deget, degetul pus din nou, pointercancel), (32) zborul dus la capăt și rezerva, (33) ce s-a strâns ajunge în rezervă
// exact o dată (reîncărcare, „Renunță la zbor”), (34) partida de apărare salvată rămâne după zboruri, apoi atelierul: (35) se deschide de pe
// cartonașul de start, o apăsare cumpără o treaptă, două apăsări repezi cumpără una sau două după rezervă, (36) întăririle cumpărate ajung la partida de
// apărare și la zborul de pe start și de după sfârșitul unui zbor, (37) un profil stricat de mână dă start cu rezerva 0, fără erori; capturile `20-atelier` (390 și 360);
// apoi drumul înapoi la start din apărare: (38) de la final, apoi un zbor, (39) din pauză, la 360 × 640, apoi „Continuă partida” reia aceeași partidă,
// (40) din pauză, apoi atelierul, (41) fără ?seed=, partida de după întoarcere are altă sămânță; (42) banda zborului la 360 cu 7 vieți și cifre de joc,
// (43) ecranul rotit cu degetul pe el nu aruncă nava, (44) stocarea refuzată: rezerva și atelierul tot merg (capturile 22, 23, 24 și 15-zbor-412).
// În afara verificărilor: rândurile `SMOKE INFO` (timpul de desen cu 150 de nave, fără module și cu toate cele nouă trăgând; al zborului
// în clipa cea mai plină) și capturile modulelor pe navă (10, mărită; 12, la scara jocului), a tragerilor (11), a pictogramei
// Rachetelor (13, 14), ale zborului (15 și 15-zbor-360, 16 cu nava de elită) și ale cartonașelor și benzii lui (17, 18, 19, la 390 și la 360).
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
const FLIGHT_PAGE = `${PAGE}&zbor=1`
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

    // Informativ, nu o verificare: cât durează desenul cu 150 de nave în vedere (mediana a cinci serii de 200 de cadre),
    // de două ori în aceeași rulare: cu nava testului de viteză (Unda, Laserul și Rachetele la treapta 3, `STRESS_SHIP`)
    // și cu toate cele nouă module la treapta 3, trăgând.
    // La 1,5 s navele sunt încă la marginea hărții, în afara vederii, iar desenul le sare; de aceea sunt aduse,
    // la fel de fiecare dată, în jurul planetei: nava i la unghiul i × 2,399963 rad și la raza 70 + (i % 5) × 28.
    // Așezarea și cele cinci serii stau într-un singur `evaluate`: bucla jocului nu face niciun pas între ele, deci
    // razele și exploziile, care trăiesc zecimi de secundă, sunt aceleași în toate cadrele măsurate.
    const drawInfo = (armed) => page.evaluate((armed) => {
      const s = window.__wg.state()
      const ring = (k = 1) => s.foes.forEach((f, i) => {
        const a = i * 2.399963, r = (70 + (i % 5) * 28) * k
        f.x = 550 + Math.cos(a) * r; f.y = 750 + Math.sin(a) * r
      })
      ring()
      let fired = null
      if (armed) {
        // Nouă module pe navă e o stare forțată (încap cel mult șase). Navele dușmane primesc viață multă, ca armele
        // să nu doboare niciuna, iar la sfârșit viața plină, ca barele lor să nu se deseneze doar în a doua măsurătoare.
        for (const f of s.foes) { f.maxHp = 1e9; f.hp = 1e9 }
        s.hero.mods = ['wave', 'laser', 'missile', 'armor', 'shield', 'mender', 'engine', 'magnet', 'relay'].map((id) => ({ id, tier: 3, t: 0 }))
        // Armele trag singure, din simulare: pași până ajunge prima rachetă (explozia), apoi ceasul Laserului și al
        // Rachetelor pus la zero și încă un pas: în cadru sunt o explozie, o rază de laser și o rachetă în zbor.
        // Cât trag, inelul e mai larg (× 1,5): lângă planetă cea mai apropiată navă e lipită de a ta, iar racheta ar
        // ajunge chiar în pasul în care pleacă; după ultimul pas, navele se întorc pe inelul obișnuit.
        ring(1.5)
        const has = (k) => s.fx.some((f) => f.kind === k)
        for (let i = 0; i < 180 && !has('blast'); i++) window.__wg.run(1 / 60)
        for (const m of s.hero.mods) if (m.id === 'laser' || m.id === 'missile') m.t = 0
        window.__wg.run(1 / 60)
        ring()
        for (const f of s.foes) f.hp = f.maxHp
        const count = (k) => s.fx.filter((f) => f.kind === k).length
        fired = { beam: count('beam'), blast: count('blast'), missile: s.shots.filter((q) => q.kind === 'missile').length, dead: s.hero.dead, foes: s.foes.length }
      }
      const draws = []
      for (let i = 0; i < 5; i++) draws.push(window.__wg.drawMs(200))
      draws.sort((a, b) => a - b)
      return { ms: draws[2], fired }
    }, armed)
    const plainDraw = await drawInfo(false)
    await shot('05-test.png')
    const armedDraw = await drawInfo(true)
    const f05 = armedDraw.fired
    console.log(`SMOKE INFO: desen cu 150 de nave în jurul planetei, nava testului de viteză (Undă, Laser, Rachete la treapta 3): ${plainDraw.ms.toFixed(2)} ms pe cadru`)
    console.log(`SMOKE INFO: desen cu 150 de nave în jurul planetei, nava cu toate cele nouă module la treapta 3, trăgând: ${armedDraw.ms.toFixed(2)} ms pe cadru` +
      ` (în cadru: ${f05.beam} raze de laser, ${f05.missile} rachete în zbor, ${f05.blast} explozii; ${f05.foes} nave dușmane; nava ${f05.dead ? 'doborâtă' : 'vie'})`)

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
    const startText = await page.locator('#start strong').innerText().catch(() => '')
    // Cu salvare, „Continuă partida” e principalul (galben), iar „Apără planeta” e secundar și spune că salvarea se pierde.
    const look13 = await page.evaluate(() => ({ line: document.getElementById('defendLine').textContent, alt: document.getElementById('start').classList.contains('alt'), main: !document.getElementById('continue').classList.contains('line') }))
    // Apăsat și citit în același pas, înaintea oricărui cadru: starea e exact cea reluată.
    const after = await page.evaluate(() => {
      document.getElementById('continue').click()
      const s = window.__wg.state()
      return { t: s.t, crystal: s.crystal, metal: s.metal, phase: window.__wg.phase() }
    })
    await page.waitForTimeout(300)
    const c13 = await clockNow()
    check(13, '„Continuă partida · m:ss” pe cartonașul de start, ca buton principal, lângă „Apără planeta” secundar, cu rândul „Partidă nouă: cea salvată se pierde.”; reluarea pornește de la timpul și stocul salvat',
      contShown && contText === `Continuă partida · ${savedClock}` && startText === 'Apără planeta' && look13.line === 'Partidă nouă: cea salvată se pierde.' && look13.alt && look13.main && after.phase === 'playing' &&
      after.t === before.t && after.crystal === 37 && after.metal === 12 && secsOf(c13) >= secsOf(savedClock) && secsOf(c13) <= secsOf(savedClock) + 1,
      `„${contText}” (${contShown}, principal ${look13.main}), start „${startText}” (secundar ${look13.alt}, rândul „${look13.line}”), salvat t ${before.t.toFixed(2)}, reluat t ${after.t.toFixed(2)}, cristale ${after.crystal}, metal ${after.metal}, fază ${after.phase}, ceas ${c13}`)
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
    const start15 = await page.locator('#start strong').innerText().catch(() => '')
    check(15, 'după final salvarea dispare, iar la reîncărcare cartonașul de start are doar „Apără planeta”', saved15a !== null && over15 && saved15 === null && !cont15 && start15 === 'Apără planeta', `salvare la pauză ${saved15a !== null}, final ${over15}, salvare după final ${saved15 === null ? 'lipsă' : 'există'}, „Continuă partida” ${cont15}, start „${start15}”`)
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

    // 19. fără rețea: reîncărcarea arată cartonașul de start, iar după „Apără planeta” canvasul e desenat, tot din cache
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
      check(19, 'fără rețea, după reîncărcare se vede cartonașul de start, iar după „Apără planeta” canvasul e desenat (tot din service worker)',
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

    // 25. rândul navei din bandă: nivelul 1, două locuri (unul ocupat, unul liber) plus lacătul, „experiență 0/…”; peste prag, „Nivel 2 gata”
    await load()
    await page.click('#start')
    await page.waitForTimeout(400)
    const row25 = () => page.evaluate(() => ({
      level: document.getElementById('level').textContent,
      text: document.getElementById('xpText').textContent,
      ready: document.getElementById('ship').classList.contains('ready'),
      slots: [...document.querySelectorAll('#shipSlots .slot')].map((e) => e.className.replace('slot ', '') + (e.querySelector('use') ? ':' + e.querySelector('use').getAttribute('href') : '')),
    }))
    const a25 = await row25()
    await page.evaluate(() => { window.__wg.state().hero.xp = 1000 })
    await page.waitForTimeout(300)
    const b25 = await row25()
    await shot('09-banda-gata.png')
    await page.evaluate(() => { window.__wg.state().hero.xp = 0 })
    check(25, 'banda arată nivelul 1, locurile (unul ocupat cu pictograma Undei, unul liber) și lacătul, „experiență 0/…”; cu experiența peste prag, „Nivel 2 gata”',
      a25.level === '1' && /^experiență 0\/\d+$/.test(a25.text) && !a25.ready && a25.slots.join() === 'slot-weapon:#i-wave,slot-free,slot-locked:#i-lock' && b25.text === 'Nivel 2 gata' && b25.ready,
      `nivel ${a25.level}, text „${a25.text}”, locuri ${a25.slots.join(' ')}; peste prag: „${b25.text}”, gata ${b25.ready}`)

    // 26. banda are aceeași înălțime (în pixeli) pe cartonașul de start, în joc, în pauză, cu panoul deschis și la final;
    // în testul de viteză e mai înaltă, și nu cu mai mult decât rândul fps plus distanța dintre rânduri (măsurate în pagină).
    // Lângă fiecare înălțime se cere faza în care s-a măsurat, ca o așteptare eșuată să nu fie măsurată tăcut în altă fază.
    const bannerH = () => page.evaluate(() => document.getElementById('banner').getBoundingClientRect().height)
    const heights = {}, wrong = []
    const measure = async (name, phase, sel) => {
      const got = await page.evaluate(() => window.__wg.phase())
      const shown = sel ? await visible(sel) : true
      if (got !== phase || !shown) wrong.push(`${name}: fază ${got} (cerută ${phase}), ${sel ?? 'fără cartonaș'} ${shown ? 'vizibil' : 'ascuns'}`)
      heights[name] = await bannerH()
    }
    await load()
    await measure('start', 'ready', '#startVeil')
    await page.click('#start')
    await page.waitForTimeout(500)
    await measure('joc', 'playing', '#pause')
    await page.click('#pause')
    await page.waitForTimeout(200)
    await measure('pauză', 'paused', '#pauseVeil')
    await page.click('#resume')
    await page.waitForTimeout(200)
    await prepLevel()
    await waitOffer()
    await measure('panou', 'playing', '#choiceVeil')
    await page.keyboard.press('1')
    await page.waitForTimeout(300)
    await page.evaluate(() => window.__wg.run(200))
    await page.waitForSelector('#overVeil:not([hidden])', { timeout: 3000 })
    await page.waitForTimeout(200)
    await measure('final', 'over', '#overVeil')
    await load()
    await page.click('#stress')
    await page.waitForTimeout(1500)
    await measure('test', 'playing', '#fps')
    const fpsRow = await page.evaluate(() => document.getElementById('fps').getBoundingClientRect().height + parseFloat(getComputedStyle(document.querySelector('.time')).rowGap))
    const xp26 = await page.locator('#xpText').innerText()
    const plain = ['start', 'joc', 'pauză', 'panou', 'final'].map((k) => heights[k])
    const spread26 = Math.max(...plain) - Math.min(...plain), more26 = heights.test - Math.max(...plain)
    check(26, 'banda are aceeași înălțime în start, joc, pauză, panou și final; în testul de viteză e mai înaltă, cel mult cu rândul fps plus distanța dintre rânduri; rândul navei arată „experiență 0/…”',
      wrong.length === 0 && spread26 < 0.5 && more26 > 0.5 && more26 <= fpsRow + 0.5 && /^experiență 0\/\d+$/.test(xp26),
      `${Object.entries(heights).map(([k, v]) => `${k} ${v.toFixed(1)} px`).join(', ')}; diferența testului ${more26.toFixed(1)} px din cel mult ${fpsRow.toFixed(1)} (rând fps + distanță); rândul navei „${xp26}”${wrong.length ? `; faze greșite: ${wrong.join(' | ')}` : ''}`)

    // Capturi, nu verificări: modulele pe navă, tragerile și pictogramele Rachetelor în bandă și în panou.
    await load()
    await page.click('#start')
    await page.evaluate(() => { const h = window.__wg.state().hero; h.x = 330; h.y = 1000; h.face = -0.35 })   // un loc gol, unde camera nu e oprită de marginea hărții
    await page.waitForTimeout(1500)                                                                          // camera ajunge nava
    await page.evaluate(() => { window.__wg.state().hero.mods = [{ id: 'wave', tier: 1, t: 0 }, { id: 'missile', tier: 1, t: 0 }] })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(outDir, '13-banda-rachete.png'), clip: await page.locator('#banner').boundingBox() })
    await page.evaluate(() => { window.__wg.state().offer = [{ id: 'missile', tier: 2 }, { id: 'laser', tier: 1 }, { id: 'relay', tier: 1 }] })
    await page.waitForSelector('#choiceVeil:not([hidden])', { timeout: 3000 })
    await page.waitForTimeout(300)
    await shot('14-panou-rachete.png')
    await page.waitForTimeout(300)                                         // trece fereastra de început a panoului
    await page.keyboard.press('1')
    await page.waitForTimeout(500)
    await page.click('#pause')
    await page.waitForTimeout(200)
    // Pe pauză bucla nu face pași; vălul și indiciul se ascund doar pentru capturi, iar cadrul îl desenează `drawMs(1)`, cu camera pe loc.
    await page.addStyleTag({ content: '.veil, #hint { display: none !important }' })
    const ships = [
      ['nava legitimă, treapta 1', [['wave', 1], ['laser', 1], ['missile', 1], ['armor', 1], ['engine', 1], ['magnet', 1]]],
      ['nava legitimă, treapta 3', [['wave', 3], ['laser', 3], ['missile', 3], ['armor', 3], ['engine', 3], ['magnet', 3]]],
      ['celelalte trei, treapta 1', [['wave', 1], ['shield', 1], ['mender', 1], ['relay', 1]]],
      ['celelalte trei, treapta 3', [['wave', 3], ['shield', 3], ['mender', 3], ['relay', 3]]],
    ]
    const shipCrop = async (mods, half) => {
      const at = await page.evaluate((mods) => {
        const s = window.__wg.state()
        s.hero.lvl = 9; s.hero.face = -0.35; s.fx = []; s.shots = []
        s.hero.mods = mods.map(([id, tier]) => ({ id, tier, t: 0 }))
        window.__wg.drawMs(1)
        const c = document.getElementById('field').getBoundingClientRect()
        const k = Math.max(c.height / 880, c.width / 1100)                 // scara ecranului (`viewScale`); camera ține nava cu 50 de unități deasupra mijlocului
        return { x: c.left + c.width / 2, y: c.top + c.height / 2 - 50 * k }
      }, mods)
      return page.screenshot({ clip: { x: at.x - half, y: at.y - half, width: 2 * half, height: 2 * half } })
    }
    const sheet = async (name, crops, width) => {                        // lipește decupajele într-o singură imagine, cu titlu sub fiecare
      const p = await context.newPage()
      await p.setViewportSize({ width, height: 100 })
      await p.setContent(`<meta name="viewport" content="width=device-width"><body style="margin:0;background:#05071a;color:#9fa9c9;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:6px;padding:6px">${
        crops.map(([label, png]) => `<figure style="margin:0;text-align:center"><img src="data:image/png;base64,${png.toString('base64')}" style="display:block;width:${png.readUInt32BE(16) / 2}px"><figcaption>${label}</figcaption></figure>`).join('')}</body>`)
      await p.screenshot({ path: path.join(outDir, name), fullPage: true })
      await p.close()
    }
    const atScale = []
    for (const [label, mods] of [ships[1], ships[3]]) atScale.push([label, await shipCrop(mods, 40)])
    await sheet('12-nava-la-scara.png', atScale, 190)
    await page.setViewportSize({ width: 390, height: 3200 })                // vedere înaltă: aceeași navă, mărită de vreo patru ori
    await page.waitForTimeout(300)
    const zoomed = []
    for (const [label, mods] of ships) zoomed.push([label, await shipCrop(mods, 110)])
    await sheet('10-nava-module.png', zoomed, 470)
    await page.setViewportSize({ width: 390, height: 780 })
    await page.waitForTimeout(300)
    // O explozie de rachetă și raza laserului, trase de simulare: patru nave dușmane (cu viață multă) în bătaia armelor.
    // Nava are o încărcătură legitimă de șase module; navele dușmane stau pe loc și nu lovesc, ca în cadru să rămână doar tragerile.
    const fired11 = await page.evaluate(() => {
      const s = window.__wg.state(), h = s.hero
      h.lvl = 9; h.face = -0.35
      h.mods = [['wave', 3], ['laser', 3], ['missile', 3], ['armor', 2], ['shield', 2], ['engine', 1]].map(([id, tier]) => ({ id, tier, t: 0 }))
      s.fx = []; s.shots = []
      s.foes = [[400, 1085], [420, 1104], [392, 1114], [300, 1125]].map(([x, y], i) => ({
        id: 9000 + i, x, y, r: 10, hp: 1e9, maxHp: 1e9, speed: 0, dmg: 0, brute: false, atkT: 1e9, kx: 0, ky: 0, a: -2.3, hitT: -1, lungeT: -1,
      }))
      // Pași până la prima explozie; apoi Rachetele din nou gata și zece pași (a doua rachetă se vede în zbor, departe de navă),
      // apoi Laserul din nou gata și încă un pas. Explozia are atunci 11 pași, mai puțin decât trăiește.
      const has = (k) => s.fx.some((f) => f.kind === k)
      for (let i = 0; i < 180 && !has('blast'); i++) window.__wg.run(1 / 60)
      for (const m of h.mods) if (m.id === 'missile') m.t = 0
      window.__wg.run(10 / 60)
      for (const m of h.mods) if (m.id === 'laser') m.t = 0
      window.__wg.run(1 / 60)
      window.__wg.drawMs(1)
      return { beam: s.fx.filter((f) => f.kind === 'beam').length, blast: s.fx.filter((f) => f.kind === 'blast').length, missile: s.shots.filter((q) => q.kind === 'missile').length }
    })
    await shot('11-explozie.png')
    console.log(`SMOKE INFO: captura 11-explozie.png are ${fired11.beam} raze de laser, ${fired11.blast} explozii și ${fired11.missile} rachete în zbor`)

    // Zborul: pornit direct cu ?debug=1&zbor=1 (cartonașele lui vin mai târziu).
    const loadFlight = async () => { await page.goto(FLIGHT_PAGE); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500) }
    const fingerAt = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] })

    // 27. în zbor, nava face mișcarea degetului × 1,2 (în unități de câmp: pixelii împărțiți la scara câmpului)
    await page.setViewportSize({ width: 390, height: 780 })
    await loadFlight()
    const ship27 = () => page.evaluate(() => { const f = window.__wg.flight(); return { mode: window.__wg.mode(), fm: f.mode, x: f.ship.x, y: f.ship.y, k: window.__wg.flightField().scale } })
    const a27 = await ship27()
    await fingerAt('touchStart', 200, 600)
    await fingerAt('touchMove', 140, 560)                                  // 60 px la stânga, 40 px în sus
    await sleep(400)
    const b27 = await ship27()
    await fingerAt('touchEnd', 0, 0)
    const want27 = { dx: (-60 / a27.k) * 1.2, dy: (-40 / a27.k) * 1.2 }
    const got27 = { dx: b27.x - a27.x, dy: b27.y - a27.y }
    check(27, 'cu ?debug=1&zbor=1 pagina e în zbor, iar nava face mișcarea degetului de 1,2 ori (± 0,5 unități)',
      a27.mode === 'flight' && b27.fm === 'flying' && Math.abs(got27.dx - want27.dx) < 0.5 && Math.abs(got27.dy - want27.dy) < 0.5,
      `mod ${a27.mode}/${b27.fm}, scara ${a27.k.toFixed(4)} px pe unitate, nava (${got27.dx.toFixed(2)}, ${got27.dy.toFixed(2)}), așteptat (${want27.dx.toFixed(2)}, ${want27.dy.toFixed(2)})`)

    // 28. câmpul întreg sub bandă, măsurat în pixeli: banda și canvasul din pagină, câmpul din desenator, iar punctul din mijlocul
    // navei, citit de pe canvas, e acolo unde câmpul spune că e nava. Câmpul e lipit de bandă (cel mult 1 px), deci dușmanii ies de
    // sub ea; pe ecranul înalt (412 × 892) cerul în plus rămâne sub câmp.
    const fit28 = []
    for (const [w, h] of [[360, 640], [390, 780], [412, 892]]) {
      await page.setViewportSize({ width: w, height: h })
      await loadFlight()
      const m = await page.evaluate(() => {
        window.__wg.flightDrawMs(1)
        const c = document.getElementById('field'), r = c.getBoundingClientRect()
        const band = document.getElementById('flightBanner').getBoundingClientRect().bottom - r.top   // în zbor, banda lui
        const k = window.__wg.flightField(), s = window.__wg.flight().ship
        const dpr = c.width / r.width, px = c.getContext('2d').getImageData(Math.round((k.x + s.x * k.scale) * dpr), Math.round((k.y + s.y * k.scale) * dpr), 1, 1).data
        return { cw: r.width, ch: r.height, band, k, dot: [px[0], px[1], px[2]] }
      })
      const { k } = m, e = 0.5
      const inside = k.x >= -e && k.x + k.w <= m.cw + e && k.y >= m.band - e && k.y + k.h <= m.ch + e
      const glued = Math.abs(k.y - m.band) <= 1
      const largest = Math.abs(k.x) <= e || Math.abs(k.y + k.h - m.ch) <= e
      const dot = Math.abs(m.dot[0] - 241) < 30 && Math.abs(m.dot[1] - 244) < 30 && Math.abs(m.dot[2] - 255) < 30   // `--ink`, punctul de lovit
      fit28.push({ ok: inside && glued && largest && dot, text: `${w}×${h}: banda până la ${m.band.toFixed(1)} px, câmpul (${k.x.toFixed(1)}, ${k.y.toFixed(1)}) ${k.w.toFixed(1)} × ${k.h.toFixed(1)} px, scara ${k.scale.toFixed(4)}, punctul navei rgb(${m.dot.join(',')})` })
      if (w === 360) await shot('15-zbor-360.png')
      if (w === 412) {                                                     // captura: câteva secunde de zbor, cu dușmanii ieșind de sub bandă
        await page.evaluate(() => { window.__wg.flight().ship.inv = 1e9; window.__wg.runFlight(6) })
        await page.waitForTimeout(200)
        await shot('15-zbor-412.png')
      }
    }
    check(28, 'câmpul se vede întreg sub bandă, lipit de ea (cel mult 1 px), la scara cea mai mare, la 360 × 640, 390 × 780 și 412 × 892; nava e pe canvas unde o pune câmpul',
      fit28.every((r) => r.ok), fit28.map((r) => r.text).join('; '))
    await page.setViewportSize({ width: 390, height: 780 })

    // 29. pagina ascunsă pune zborul pe pauză (cartonașul de pauză, timpul zborului stă) și nicio eroare nu a apărut în consolă
    await loadFlight()
    await page.waitForTimeout(300)
    await setVisibility('hidden')
    const t29a = await page.evaluate(() => window.__wg.flight().t)
    await setVisibility('visible')
    await page.waitForTimeout(600)
    const t29b = await page.evaluate(() => window.__wg.flight().t)
    const veil29 = (await visible('#flightPauseVeil')) && !(await visible('#pauseVeil'))   // cartonașul de pauză al zborului
    await page.click('#flightResume')
    await page.waitForTimeout(300)
    const t29c = await page.evaluate(() => window.__wg.flight().t)
    check(29, 'pagina ascunsă pune zborul pe pauză (cartonașul de pauză, timpul zborului stă), „Continuă” îl reia, iar în consolă nu e nicio eroare',
      t29a > 0 && t29a === t29b && veil29 && t29c > t29b && errors.length === 0, `timp ${t29a} → ${t29b} → ${t29c}, cartonaș ${veil29}, erori ${errors.length}`)

    // Capturi și timpul de desen al zborului; nu sunt verificări. Lucrurile de cules și resursele din 15-zbor.png sunt puse de mână,
    // lângă navă, ca focul dușman, modulele de cules și resursele să se vadă în același cadru.
    await loadFlight()
    await page.evaluate(() => {
      const f = window.__wg.flight()
      Object.assign(f.ship.mods, { gun: 2, laser: 1, missile: 1, shield: 1 }); f.ship.shieldUp = true
      f.ship.inv = 1e9
      window.__wg.runFlight(40)
    })
    await page.click('#flightPause')
    await page.addStyleTag({ content: '.veil, #hint { display: none !important }' })
    await page.evaluate(() => {
      const f = window.__wg.flight()
      f.ship.inv = 0
      f.picks.push({ kind: 'missile', x: 120, y: 420 }, { kind: 'magnet', x: 300, y: 380 })
      f.drops.push({ kind: 'crystal', x: 160, y: 470 }, { kind: 'metal', x: 250, y: 450 }, { kind: 'crystal', x: 270, y: 480 })
      window.__wg.flightDrawMs(1)
    })
    await shot('15-zbor.png')

    // Clipa cea mai plină: toate modulele la treapta 3, nava de neatins. O navă cu toate armele la treapta 3 doboară aproape tot
    // ce intră în câmp (măsurat: la secunda 172,5 rămânea o singură navă dușmană), deci de la secunda 150 dușmanii și asteroizii
    // primesc viață multă: armele trag în ei, iar cadrul are tot ce vine spre navă, nu doar ce scapă. Pas cu pas până la
    // secunda 178 (nava de elită coboară), pasul cu cei mai mulți dușmani și proiectile dușmane; starea lui se pune la loc (e date
    // simple), armele sunt aduse să tragă (mai jos), iar cadrul se desenează de cinci ori câte 200 de cadre (mediana), într-un singur
    // `evaluate`: bucla jocului nu face niciun pas între ele.
    await loadFlight()
    const full = await page.evaluate(() => {
      const f = window.__wg.flight()
      for (const id of ['gun', 'laser', 'missile', 'shield', 'magnet']) f.ship.mods[id] = 3
      f.ship.shieldUp = true; f.ship.inv = 1e9
      window.__wg.runFlight(150)
      let best = null, most = -1
      while (f.t < 178 && f.mode === 'flying') {
        for (const x of f.foes) if (x.maxHp < 1e8) { x.maxHp = 1e9; x.hp = 1e9 }
        for (const a of f.asteroids) a.hp = 1e9
        window.__wg.runFlight(1 / 60)
        const n = f.foes.length + f.shots.length
        if (n > most) { most = n; best = JSON.stringify(f) }
      }
      Object.assign(f, JSON.parse(best))
      // O rachetă abia pleacă după ce explozia celei dinainte s-a stins, iar raza Laserului trăiește 0,12 s: pe niciun pas nu sunt
      // toate trei. Ca la apărare: pași până la o explozie, apoi Rachetele din nou gata și câțiva pași (racheta nouă e în zbor),
      // apoi Laserul din nou gata și încă un pas.
      const has = (k) => f.fx.some((e) => e.kind === k)
      for (let i = 0; i < 180 && !has('blast'); i++) window.__wg.runFlight(1 / 60)
      f.ship.missileT = 0
      window.__wg.runFlight(3 / 60)
      f.ship.laserT = 0
      window.__wg.runFlight(1 / 60)
      // Ce nu iese singur în pasul cel mai plin, pus de mână după ultimul pas (cadrul se desenează fără pași, deci rămân toate):
      // lucruri de cules (un modul de fiecare fel și o reparație), resurse lângă navă, norul unei căderi și o lovitură oprită de Scut.
      for (const [i, kind] of ['gun', 'laser', 'missile', 'shield', 'magnet', 'repair'].entries()) f.picks.push({ kind, x: 60 + i * 55, y: 330 + (i % 2) * 40 })
      for (let i = 0; i < 6; i++) f.drops.push({ kind: i % 2 ? 'metal' : 'crystal', x: 150 + i * 18, y: 470 + (i % 3) * 12 })
      f.fx.push({ kind: 'puff', what: 'foe', r: 25, x: 120, y: 250, t0: f.t - 0.1 }, { kind: 'block', x: f.ship.x, y: f.ship.y, t0: f.t - 0.1 })
      const count = (k) => f.fx.filter((e) => e.kind === k).length
      const what = { t: f.t, foes: f.foes.length, shots: f.shots.length, bolts: f.bolts.length, missiles: f.missiles.length, asteroids: f.asteroids.length,
        beams: count('beam'), blasts: count('blast'), drops: f.drops.length, picks: f.picks.length, puffs: count('puff'), blocks: count('block'), mode: f.mode }
      const draws = []
      for (let i = 0; i < 5; i++) draws.push(window.__wg.flightDrawMs(200))
      draws.sort((a, b) => a - b)
      return { ms: draws[2], what }
    })
    const w30 = full.what
    console.log(`SMOKE INFO: desen al zborului în clipa cea mai plină (toate modulele la treapta 3, secunda ${w30.t.toFixed(2)}): ${full.ms.toFixed(2)} ms pe cadru` +
      ` (în cadru: ${w30.foes} nave dușmane, ${w30.shots} proiectile dușmane, ${w30.bolts} ale Tunului, ${w30.missiles} rachete, ${w30.beams} raze de Laser, ${w30.blasts} explozii, ${w30.asteroids} asteroizi, ${w30.drops} resurse, ${w30.picks} lucruri de cules, ${w30.puffs} nori, ${w30.blocks} lovituri oprite de Scut; zborul ${w30.mode})`)

    // 16-zbor-elita.png: aceeași navă, într-un zbor nou, fără viață în plus la dușmani, cu nava de elită coborâtă la locul ei
    await loadFlight()
    const elite16 = await page.evaluate(() => {
      const f = window.__wg.flight(), elite = () => f.foes.find((x) => x.id === f.eliteId)
      for (const id of ['gun', 'laser', 'missile', 'shield', 'magnet']) f.ship.mods[id] = 3
      f.ship.shieldUp = true; f.ship.inv = 1e9
      window.__wg.runFlight(172)
      for (let i = 0; i < 600 && f.mode === 'flying' && !(elite() && elite().y >= 110); i++) window.__wg.runFlight(1 / 60)
      const e = elite()
      return e ? { y: e.y, hp: e.hp, max: e.maxHp, foes: f.foes.length, shots: f.shots.length } : null
    })
    await page.click('#flightPause')
    await page.addStyleTag({ content: '.veil, #hint { display: none !important }' })
    await page.evaluate(() => { window.__wg.flight().ship.inv = 0; window.__wg.flightDrawMs(1) })
    await shot('16-zbor-elita.png')
    console.log(`SMOKE INFO: captura 16-zbor-elita.png ${elite16 ? `are nava de elită la y ${elite16.y.toFixed(0)}, cu viața ${Math.round(elite16.hp)}/${elite16.max}, ${elite16.foes} nave dușmane și ${elite16.shots} proiectile dușmane` : 'nu are nava de elită'}`)

    // Drumul întreg al zborului, de pe cartonașe, ca pe telefon: atingeri pe butoane, nu `?zbor=`.
    const txt = (sel) => page.locator(sel).textContent().then((t) => t ?? '').catch(() => '')   // textul din pagină, nu cel afișat (etichetele sunt cu majuscule din CSS)
    const profileNow = () => page.evaluate(() => JSON.parse(localStorage.getItem('wg.v1.profile') ?? 'null'))
    const startReserve = () => page.evaluate(() => ({ crystal: Number(document.getElementById('startCrystal').textContent), metal: Number(document.getElementById('startMetal').textContent) }))
    const tap = async (sel) => { const m = await middle(sel); await fingers('touchStart', [{ ...m, id: 40 }]); await sleep(30); await fingers('touchEnd', []) }
    const flightBandH = () => page.evaluate(() => document.getElementById('flightBanner').getBoundingClientRect().height)
    const got = () => page.evaluate(() => { const f = window.__wg.flight(); return { crystal: f.crystal, metal: f.metal } })
    const plus = (a, b) => ({ crystal: a.crystal + b.crystal, metal: a.metal + b.metal })
    const same = (a, b) => a !== null && b !== null && a.crystal === b.crystal && a.metal === b.metal
    const show = (r) => (r === null ? 'lipsă' : `${r.crystal} cristale, ${r.metal} metal`)

    // 30. cartonașul de start: cele două moduri, rezerva 0, sectorul 1, iar + (oricât de repede) nu trece de 1. Înainte, o partidă de
    // apărare pusă pe pauză (deci salvată), pentru verificarea 34.
    await page.setViewportSize({ width: 390, height: 780 })
    await page.evaluate(() => localStorage.clear())
    await load()
    await page.click('#start')
    await page.waitForTimeout(600)
    await page.click('#pause')
    await page.waitForTimeout(200)
    const save34 = await saveRaw()
    const record34 = await page.evaluate(() => localStorage.getItem('wg.v1.record'))
    await load()
    const s30 = {
      defend: await txt('#start strong'), explore: await txt('#explore strong'), lines: [await txt('#start span'), await txt('#explore span')],
      reserve: await startReserve(), sector: await txt('#sectorN'), cont: await txt('#continue'), rules: await page.locator('#startVeil .rules').count(),
      atelier: await visible('#startWorkshop'),   // aprins de atelier (verificările 35–37)
    }
    for (let i = 0; i < 4; i++) { await tap('#sectorUp'); await sleep(20) }
    const up30 = await txt('#sectorN')
    await tap('#sectorDown')
    const down30 = await txt('#sectorN')
    await shot('17-start.png')
    check(30, 'cartonașul de start: „Apără planeta” și „Explorează galaxia”, fiecare cu rândul lui, rezerva 0 și 0, „Sectorul 1”; + apăsat repede de patru ori și − îl lasă la 1; fără regulile vechi, butonul „Atelier” la vedere',
      s30.defend === 'Apără planeta' && s30.explore === 'Explorează galaxia' && s30.lines.every((l) => l.length > 0) && same(s30.reserve, { crystal: 0, metal: 0 }) &&
        s30.sector === 'Sectorul 1' && up30 === 'Sectorul 1' && down30 === 'Sectorul 1' && s30.rules === 0 && s30.atelier && s30.cont.startsWith('Continuă partida') && save34 !== null,
      `„${s30.defend}”, „${s30.explore}”, rânduri ${s30.lines.map((l) => `„${l}”`).join(' / ')}, rezerva ${show(s30.reserve)}, ${s30.sector} → după + ${up30} → după − ${down30}, reguli ${s30.rules}, atelier ${s30.atelier}, „${s30.cont}”`)
    failFast(30)

    // 31. „Explorează galaxia” pornește zborul: banda lui (în locul celei a apărării) arată 5 vieți și Tunul la treapta 1; Laserul
    // dat prin `window.__wg` apare cu treapta 2. Apoi condusul, cu evenimente de pointer: al doilea deget nu mută nava, degetul care
    // conduce, ridicat și pus din nou în alt loc, nu o face să sară (apoi conduce iar de acolo), iar după `pointercancel` nu mai conduce.
    await tap('#explore')
    await page.waitForTimeout(300)
    const a31 = await page.evaluate(() => { const f = window.__wg.flight(); f.ship.inv = 1e9; return { mode: window.__wg.mode(), fm: f.mode, sector: f.sector } })
    const band31 = () => page.evaluate(() => ({
      swapped: !document.getElementById('flightBanner').hidden && document.getElementById('banner').hidden,
      hits: document.querySelectorAll('#flHits i.on').length, pips: document.querySelectorAll('#flHits i').length,
      mods: [...document.querySelectorAll('#flMods .fslot')].map((e) => `${e.querySelector('use').getAttribute('href').slice(3)}:${e.querySelectorAll('.fdots i.on').length}`),
      toast: document.getElementById('flToast').hidden ? '' : document.getElementById('flToast').textContent,
    }))
    const b31a = await band31()
    await page.evaluate(() => { const f = window.__wg.flight(); f.ship.mods.laser = 2; f.fx.push({ kind: 'took', what: 'laser', tier: 2, maxed: false, t0: f.t }) })
    await page.waitForTimeout(250)
    const b31b = await band31()
    const h31 = await flightBandH()
    await shot('18-banda-zbor.png')
    const ptr = (type, id, x, y) => page.evaluate(([type, id, x, y]) => {
      document.getElementById('field').dispatchEvent(new PointerEvent(type, {
        pointerId: id, pointerType: 'touch', clientX: x, clientY: y, button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerdown' || type === 'pointermove' ? 1 : 0, bubbles: true, cancelable: true,
      }))
    }, [type, id, x, y])
    const shipPos = () => page.evaluate(() => { const s = window.__wg.flight().ship; return { x: s.x, y: s.y } })
    const k31 = await page.evaluate(() => window.__wg.flightField().scale)
    await ptr('pointerdown', 21, 200, 600)
    await sleep(150)
    const p0 = await shipPos()
    await ptr('pointerdown', 22, 100, 500); await ptr('pointermove', 22, 40, 420); await ptr('pointerup', 22, 40, 420)
    await sleep(200)
    const p1 = await shipPos()
    await ptr('pointerup', 21, 200, 600); await ptr('pointerdown', 21, 300, 680)
    await sleep(200)
    const p2 = await shipPos()
    await ptr('pointermove', 21, 270, 680)
    await sleep(200)
    const p3 = await shipPos()
    await ptr('pointercancel', 21, 270, 680); await ptr('pointermove', 21, 200, 600)
    await sleep(200)
    const p4 = await shipPos()
    const still31 = (a, b) => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9
    const want31 = (-30 / k31) * 1.2
    const at = (p) => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`
    check(31, '„Explorează galaxia” pornește zborul în sectorul 1; banda zborului ia locul celei a apărării, cu 5 vieți din 5 și Tunul la treapta 1, apoi Laserul la treapta 2 și rândul „ai cules”; al doilea deget, degetul pus din nou în alt loc și pointercancel nu mută nava',
      a31.mode === 'flight' && a31.fm === 'flying' && a31.sector === 1 && b31a.swapped && b31a.hits === 5 && b31a.pips === 5 && b31a.mods.join() === 'gun:1' &&
        b31b.mods.join() === 'gun:1,laser:2' && b31b.toast === 'Laser · treapta 2' &&
        still31(p0, p1) && still31(p1, p2) && Math.abs(p3.x - p2.x - want31) < 0.5 && Math.abs(p3.y - p2.y) < 1e-9 && still31(p3, p4),
      `mod ${a31.mode}/${a31.fm}, sector ${a31.sector}, benzi schimbate ${b31a.swapped}, vieți ${b31a.hits}/${b31a.pips}, module ${b31a.mods.join(' ')} → ${b31b.mods.join(' ')}, rând „${b31b.toast}”; ` +
        `nava ${at(p0)}, după al doilea deget ${at(p1)}, după degetul pus din nou ${at(p2)}, după 30 px la stânga ${at(p3)} (așteptat Δx ${want31.toFixed(2)}), după pointercancel ${at(p4)}`)
    failFast(31)

    // 32. zborul dus la capăt (nava de neatins, nava de elită cu viața 1 cât e pe ecran): „Sector explorat” cu ce s-a adus, rezerva cât
    // a adus (zborul a trecut și printr-o pauză, care a trecut o parte în rezervă), apoi pe cartonașul de start rezerva crescută cu exact
    // atât și sectorul propus 2. Banda zborului are aceeași înălțime în zbor, în pauza lui și pe cartonașul lui de sfârșit.
    const r32a = await profileNow() ?? { crystal: 0, metal: 0 }
    await page.click('#flightPause')
    await page.waitForTimeout(200)
    const h32p = await flightBandH()
    const pause32 = (await visible('#flightPauseVeil')) && !(await visible('#pauseVeil')) && !(await visible('#fresh')) && (await txt('#flightPauseVeil h1')) === 'Zbor în pauză'
    await page.click('#flightResume')
    await page.waitForTimeout(200)
    const end32 = await page.evaluate(() => {
      const f = window.__wg.flight(), elite = () => f.foes.find((x) => x.id === f.eliteId)
      f.ship.inv = 1e9
      window.__wg.runFlight(Math.max(0, 172 - f.t))
      for (let i = 0; i < 3600 && f.mode === 'flying'; i++) { const e = elite(); if (e) e.hp = Math.min(e.hp, 1); window.__wg.runFlight(1 / 60) }
      return { mode: f.mode, crystal: f.crystal, metal: f.metal }
    })
    await page.waitForSelector('#flightOverVeil:not([hidden])', { timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(200)
    const h32o = await flightBandH()
    const o32 = {
      title: await txt('#flightOverTitle'), label: await txt('#flightOverLabel'), next: await txt('#flightNext'),
      haul: { crystal: Number((await txt('#overCrystal')).replace('+', '')), metal: Number((await txt('#overMetal')).replace('+', '')) },
      reserve: await page.evaluate(() => ({ crystal: Number(document.getElementById('flightOverCrystal').textContent), metal: Number(document.getElementById('flightOverMetal').textContent) })),
      profile: await profileNow(), phase: await page.evaluate(() => window.__wg.mode()),
    }
    await shot('19-sfarsit-zbor.png')
    // Escape pe cartonașul de sfârșit nu schimbă nimic; „Sectorul următor” pornește un zbor în sectorul 2. Din el, pauză (care trece
    // în rezervă ce s-a strâns în cele câteva clipe) și „Renunță la zbor”, înapoi la start.
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const esc32 = (await visible('#flightOverVeil')) && !(await visible('#flightPauseVeil')) && (await page.evaluate(() => [window.__wg.mode(), window.__wg.flight().mode].join())) === 'flight,explored'
    await tap('#flightNext')
    await page.waitForTimeout(300)
    const next32 = await page.evaluate(() => { const f = window.__wg.flight(); return { mode: window.__wg.mode(), fm: f.mode, sector: f.sector, t: f.t } })
    const nextOk32 = next32.mode === 'flight' && next32.fm === 'flying' && next32.sector === 2 && next32.t < 1 && !(await visible('#flightOverVeil'))
    await page.click('#flightPause')
    await page.waitForTimeout(200)
    const g32 = await got()
    await tap('#quitFlight')
    await page.waitForTimeout(300)
    const r32b = await startReserve()
    const sector32 = await txt('#sectorN')
    const home32 = (await visible('#startVeil')) && (await page.evaluate(() => window.__wg.mode())) === 'defense' && !(await visible('#flightBanner')) && (await visible('#banner'))
    check(32, 'zborul dus la capăt: „Sector explorat”, „Ai adus acasă” cu ce a strâns zborul, rezerva cu exact atât în plus; Escape nu schimbă nimic, „Sectorul următor” pornește sectorul 2; după pauză și renunțare, startul arată rezerva crescută cu exact cât s-a strâns și „Sectorul 2”; pe drumul cu nava doborâtă, „Încă un zbor” reia același sector de la zero, fără să schimbe rezerva, iar „Înapoi la start” duce la start; banda zborului, aceeași înălțime în zbor, în pauza lui (cartonașul „Zbor în pauză”, fără „Partidă nouă”) și la sfârșit',
      end32.mode === 'explored' && end32.crystal > 0 && o32.title === 'Sector explorat' && o32.label === 'Ai adus acasă' && o32.next === 'Sectorul următor' &&
        same(o32.haul, end32) && same(o32.reserve, plus(r32a, end32)) && same(o32.profile, o32.reserve) && same(r32b, plus(o32.reserve, g32)) && sector32 === 'Sectorul 2' && home32 && esc32 && nextOk32 &&
        pause32 && Math.abs(h31 - h32p) < 0.5 && Math.abs(h31 - h32o) < 0.5,
      `zbor ${end32.mode}, adus ${show(end32)}; cartonaș „${o32.title}” / „${o32.label}” / „${o32.next}”, arătat ${show(o32.haul)}, rezerva ${show(r32a)} → ${show(o32.reserve)} (în profil ${show(o32.profile)}); ` +
        `Escape: cartonașul rămâne ${esc32}; „Sectorul următor”: ${JSON.stringify(next32)}, apoi strâns ${show(g32)}; pe start ${show(r32b)}, ${sector32}, start ${home32}; pauza zborului ${pause32}; banda ${h31.toFixed(1)} / ${h32p.toFixed(1)} / ${h32o.toFixed(1)} px`)
    failFast(32)

    // 33. ce s-a strâns ajunge în rezervă exact o dată: pagina reîncărcată după o pauză în zbor; „Renunță la zbor” (din pauză) nu mai
    // adaugă nimic; pagina reîncărcată în mijlocul zborului, fără pauză (pauza o face `pagehide`). Ce strânge zborul se pune prin `window.__wg`.
    const r33a = await startReserve()
    await tap('#explore')
    await page.waitForTimeout(300)
    await page.evaluate(() => { const f = window.__wg.flight(); f.crystal += 17; f.metal += 5 })
    await page.click('#flightPause')
    await page.waitForTimeout(200)
    const g33a = await got()
    const shown33 = [await txt('#pauseCrystal'), await txt('#pauseMetal')].join(' ')
    await load()
    const r33b = await startReserve()
    await tap('#explore')
    await page.waitForTimeout(300)
    await page.evaluate(() => { const f = window.__wg.flight(); f.crystal += 9; f.metal += 3 })
    await page.click('#flightPause')
    await page.waitForTimeout(200)
    const g33b = await got()
    const p33 = await profileNow()
    await tap('#quitFlight')
    await page.waitForTimeout(300)
    const q33 = await profileNow()
    const r33c = await startReserve()
    const home33 = (await visible('#startVeil')) && (await page.evaluate(() => window.__wg.mode())) === 'defense'
    await tap('#explore')
    await page.waitForTimeout(300)
    await page.evaluate(() => { const f = window.__wg.flight(); f.crystal += 4; f.metal += 2 })
    const g33c = await got()
    await load()
    const r33d = await startReserve()
    check(33, 'rezerva primește ce s-a strâns exact o dată: după pauză și reîncărcare, după „Renunță la zbor” (care duce la start și nu schimbă rezerva) și după o reîncărcare în mijlocul zborului',
      g33a.crystal >= 17 && same(r33b, plus(r33a, g33a)) && shown33 === `+${g33a.crystal} +${g33a.metal}` &&
        same(p33, plus(r33b, g33b)) && same(q33, p33) && same(r33c, p33) && home33 && same(r33d, plus(r33c, g33c)),
      `start ${show(r33a)}; strâns ${show(g33a)} (pe pauză „${shown33}”), după reîncărcare ${show(r33b)}; strâns ${show(g33b)}, după pauză ${show(p33)}, după „Renunță la zbor” ${show(q33)}, pe start ${show(r33c)} (start ${home33}); ` +
        `strâns ${show(g33c)} fără pauză, după reîncărcare ${show(r33d)}`)

    // 34. partida de apărare salvată înainte de zboruri e neatinsă: „Continuă partida” e tot pe cartonașul de start, salvarea și recordul
    // sunt aceleași, iar apăsat reia partida de unde era.
    const cont34 = await txt('#continue')
    const save34b = await saveRaw()
    const record34b = await page.evaluate(() => localStorage.getItem('wg.v1.record'))
    const t34 = JSON.parse(save34).state.t
    const after34 = await page.evaluate(() => { document.getElementById('continue').click(); return { phase: window.__wg.phase(), t: window.__wg.state().t, mode: window.__wg.mode() } })
    check(34, '„Continuă partida” de la apărare e tot acolo după zboruri; salvarea și recordul sunt neschimbate, iar partida se reia de unde era',
      (await visible('#startVeil')) === false && cont34 === s30.cont && save34b === save34 && record34b === record34 && after34.phase === 'playing' && after34.mode === 'defense' && after34.t === t34,
      `„${cont34}” (înainte „${s30.cont}”), salvarea ${save34b === save34 ? 'aceeași' : 'schimbată'}, recordul ${record34b === record34 ? 'același' : `${record34} → ${record34b}`}, după „Continuă partida”: fază ${after34.phase}, mod ${after34.mode}, t ${after34.t} (salvat ${t34})`)

    // Capturile 17–19 și la 360 × 640 (nu sunt verificări).
    await page.setViewportSize({ width: 360, height: 640 })
    await load()
    await shot('17-start-360.png')
    await tap('#explore')
    await page.waitForTimeout(300)
    await page.evaluate(() => {
      const f = window.__wg.flight()
      Object.assign(f.ship.mods, { gun: 2, laser: 1, missile: 3, shield: 1, magnet: 1 }); f.ship.inv = 1e9; f.ship.hp = 4
      f.fx.push({ kind: 'took', what: 'missile', tier: 3, maxed: true, t0: f.t })
    })
    await page.waitForTimeout(250)
    await shot('18-banda-zbor-360.png')
    // Nava doborâtă: o viață, fără Scut (s-ar reîncărca în același pas), și un proiectil dușman chiar pe ea.
    await page.evaluate(() => { const f = window.__wg.flight(); f.ship.inv = 0; f.ship.hp = 1; f.ship.mods.shield = 0; f.ship.shieldUp = false; f.shots.push({ x: f.ship.x, y: f.ship.y, vx: 0, vy: 0 }) })
    await page.waitForSelector('#flightOverVeil:not([hidden])', { timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(200)
    await shot('19-sfarsit-zbor-360.png')
    console.log(`SMOKE INFO: 19-sfarsit-zbor-360.png arată „${await txt('#flightOverTitle')}” / „${await txt('#flightNext')}”`)
    // Tot verificarea 32, pe drumul cu nava doborâtă: „Încă un zbor” pornește din nou același sector, cu banda la 5 vieți și strânsul
    // zborului la 0, iar rezerva nu se schimbă la apăsare; doborâtă din nou, „Înapoi la start” duce la cartonașul de start.
    const down32 = await page.evaluate(() => ({ title: document.getElementById('flightOverTitle').textContent, sector: window.__wg.flight().sector }))
    const p32a = await profileNow()
    await tap('#flightNext')
    await page.waitForTimeout(300)
    const again32 = await page.evaluate(() => {
      const f = window.__wg.flight()
      return { fm: f.mode, sector: f.sector, t: f.t, crystal: f.crystal, metal: f.metal, hits: document.querySelectorAll('#flHits i.on').length,
        band: [document.getElementById('flCrystal').textContent, document.getElementById('flMetal').textContent].join(' ') }
    })
    const p32b = await profileNow()
    await page.evaluate(() => { const f = window.__wg.flight(); f.ship.inv = 0; f.ship.hp = 1; f.ship.mods.shield = 0; f.ship.shieldUp = false; f.shots.push({ x: f.ship.x, y: f.ship.y, vx: 0, vy: 0 }) })
    await page.waitForSelector('#flightOverVeil:not([hidden])', { timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(200)
    await tap('#flightHome')
    await page.waitForTimeout(300)
    const back32 = (await visible('#startVeil')) && (await page.evaluate(() => window.__wg.mode())) === 'defense'
    const ok32 = down32.title === 'Nava a fost doborâtă' && again32.fm === 'flying' && again32.sector === down32.sector && again32.t < 1 &&
      again32.crystal === 0 && again32.metal === 0 && again32.hits === 5 && again32.band === '0 0' && same(p32a, p32b) && back32
    const r32 = results.find((r) => r.n === 32)
    r32.ok = r32.ok && ok32
    r32.detail += `; nava doborâtă în sectorul ${down32.sector} („${down32.title}”), „Încă un zbor”: ${JSON.stringify(again32)}, rezerva ${show(p32a)} → ${show(p32b)}; „Înapoi la start” ${back32}`
    await page.setViewportSize({ width: 390, height: 780 })

    // Atelierul (35–37). Profilul se pune în stocare și pagina se încarcă din nou; atingerile sunt cu degetul, ca pe telefon.
    const putProfile = (p) => page.evaluate((v) => localStorage.setItem('wg.v1.profile', v), typeof p === 'string' ? p : JSON.stringify({ v: 1, sector: 0, ...p, ups: { hull: 0, arms: 0, reach: 0, core: 0, kit: 0, ...(p.ups ?? {}) } }))
    const shopState = () => page.evaluate(() => ({
      open: !document.getElementById('shopVeil').hidden, start: !document.getElementById('startVeil').hidden, over: !document.getElementById('flightOverVeil').hidden,
      rows: document.querySelectorAll('#shopRows .up').length, reserve: [document.getElementById('shopCrystal').textContent, document.getElementById('shopMetal').textContent].join('/'),
      dots: [...document.querySelectorAll('#shopRows .up')].map((r) => r.querySelectorAll('.up-dots i.on').length),
      buys: [...document.querySelectorAll('#shopRows .buy')].map((b) => (b.classList.contains('max') ? 'max' : b.classList.contains('poor') ? 'poor' : 'buy')),
      pause: !document.getElementById('pause').classList.contains('off'),
    }))
    const upsNow = async () => (await profileNow()).ups
    const buyBtn = (id) => `#shopRows .buy[data-up="${id}"]`
    const noErr = errors.length
    // Ce se vede și ce e în stocare, ca să se poată cere „nimic nu s-a schimbat”: panoul, fazele celor două moduri, cartonașele de pauză, profilul și salvarea.
    const snap = () => page.evaluate(() => ({
      shop: !document.getElementById('shopVeil').hidden, phase: window.__wg.phase(), mode: window.__wg.mode(), fmode: window.__wg.flight().mode,
      pauseVeils: [!document.getElementById('pauseVeil').hidden, !document.getElementById('flightPauseVeil').hidden],
      profile: localStorage.getItem('wg.v1.profile'), save: localStorage.getItem('wg.v1.save'),
    }))
    // Cu atelierul deschis: Escape, pagina ascunsă și readusă, `pagehide`; după fiecare, totul trebuie să fie ca înainte.
    const inert = async () => {
      const a = await snap(), out = []
      await page.keyboard.press('Escape'); await page.waitForTimeout(100); out.push(await snap())
      await setVisibility('hidden'); await page.waitForTimeout(100); await setVisibility('visible'); await page.waitForTimeout(200); out.push(await snap())
      await page.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await page.waitForTimeout(100); out.push(await snap())
      return { a, same: out.every((s) => JSON.stringify(s) === JSON.stringify(a)) }
    }
    // Garda: ambele butoane „Atelier” (și cel ascuns) chemate din cod, cât o partidă sau un zbor e în joc ori pe pauză, nu deschid nimic. Așteptarea de
    // o secundă scoate clicul din fereastra „același gest” a lui `onTap`, ca proba să nu treacă în gol.
    const guard = async () => {
      await page.waitForTimeout(1100)
      const a = await snap()
      await page.evaluate(() => { document.getElementById('startWorkshop').click(); document.getElementById('overWorkshop').click() })
      await page.waitForTimeout(150)
      const b = await snap()
      return { ok: !b.shop && JSON.stringify(a) === JSON.stringify(b), phase: `${a.mode}/${a.phase}/${a.fmode}` }
    }

    // 35. atelierul se deschide de pe cartonașul de start, cu cinci rânduri; deschis cu degetul, nu cumpără nimic (rezerva rămâne 200 / 60: un
    // `click` după atingere nu ajunge pe un buton de cumpărat); cu panoul deschis, Escape, pagina ascunsă și `pagehide` nu schimbă nimic; „Înapoi”
    // păstrează sectorul ales (3, nu cel propus, 4) și pornește zborul în el; o apăsare pe Carenă scade rezerva cu prețul și aprinde un punct; două apăsări repezi: o treaptă dacă rezerva nu ajunge pentru amândouă
    // (după prima: 150 / 50, iar treptele 2 și 3 costă 85 + 145), două dacă ajunge (400 / 100: 50 + 85)
    await putProfile({ crystal: 200, metal: 60 })
    await load()
    await tap('#startWorkshop')
    await page.waitForTimeout(200)
    const o35 = await shopState()
    await shot('20-atelier.png')
    const i35 = await inert()
    await tap(buyBtn('hull'))
    await page.waitForTimeout(100)
    const b35 = await shopState(), p35 = await profileNow()
    await tap(buyBtn('hull')); await tap(buyBtn('hull'))
    await page.waitForTimeout(100)
    const q35 = await profileNow()
    await tap('#shopBack')
    await page.waitForTimeout(200)
    const back35 = { start: await visible('#startVeil'), shop: await visible('#shopVeil'), reserve: await startReserve() }
    // „Înapoi” și sectorul: profil cu sectorul 3 explorat (propus: 4), ales 3 cu −, atelierul cu o cumpărătură, „Înapoi”, același sector, apoi zborul în el
    await putProfile({ crystal: 200, metal: 60, sector: 3 })
    await load()
    const sec35a = await txt('#sectorN')
    await tap('#sectorDown')
    const sec35b = await txt('#sectorN')
    await tap('#startWorkshop'); await page.waitForTimeout(200)
    await tap(buyBtn('reach')); await page.waitForTimeout(100)
    await tap('#shopBack'); await page.waitForTimeout(200)
    const sec35c = await txt('#sectorN'), res35c = await startReserve()
    await tap('#explore'); await page.waitForTimeout(300)
    const fsec35 = await page.evaluate(() => window.__wg.flight().sector)
    await page.click('#flightPause'); await page.waitForTimeout(200)
    await tap('#quitFlight'); await page.waitForTimeout(200)
    await putProfile({ crystal: 400, metal: 100 })
    await load()
    await tap('#startWorkshop'); await page.waitForTimeout(200)
    await tap(buyBtn('hull')); await tap(buyBtn('hull'))
    await page.waitForTimeout(100)
    const r35 = await profileNow()
    check(35, 'atelierul se deschide de pe cartonașul de start (cartonașul se ascunde, fără buton de pauză) cu cinci rânduri și rezerva 200 / 60, iar deschiderea nu cumpără nimic; Carena: o apăsare scade 50 / 10 și aprinde un punct; două apăsări repezi cu rezerva 150 / 50 cumpără o singură treaptă (85 / 15), iar cu 400 / 100 două (50 + 85); „Înapoi” arată startul cu rezerva nouă',
      o35.open && !o35.start && o35.rows === 5 && o35.reserve === '200/60' && o35.dots.every((d) => d === 0) && !o35.pause &&
        b35.reserve === '150/50' && b35.dots[0] === 1 && p35.crystal === 150 && p35.metal === 50 && p35.ups.hull === 1 &&
        q35.ups.hull === 2 && q35.crystal === 65 && q35.metal === 35 &&
        back35.start && !back35.shop && same(back35.reserve, { crystal: 65, metal: 35 }) &&
        r35.ups.hull === 2 && r35.crystal === 265 && r35.metal === 75 &&
        i35.same && i35.a.shop && i35.a.phase === 'ready' && i35.a.mode === 'defense' &&
        sec35a === 'Sectorul 4' && sec35b === 'Sectorul 3' && sec35c === 'Sectorul 3' && same(res35c, { crystal: 160, metal: 60 }) && fsec35 === 3,
      `Escape, pagină ascunsă, pagehide: ${i35.same ? 'nimic schimbat' : 'schimbat'} (${JSON.stringify({ ...i35.a, profile: undefined, save: undefined })}); sectorul ${sec35a} → ${sec35b} → după „Înapoi” ${sec35c}, rezerva ${show(res35c)}, zborul în sectorul ${fsec35}; deschis ${JSON.stringify(o35)}; după Carenă ${JSON.stringify(b35)}, profil ${JSON.stringify(p35)}; după două apăsări repezi ${JSON.stringify(q35)}; „Înapoi” ${JSON.stringify(back35)}; cu 400 / 100 după două apăsări: ${JSON.stringify(r35)}`)
    failFast(35)

    // 36. întăririle cumpărate: partida de apărare de pe start pornește cu nava la 66 de viață (Carena 1), zborul de pe start cu Laserul
    // (Arsenalul 1); după un zbor, atelierul de la sfârșit cumpără Arsenalul 2, „Înapoi” arată cartonașul de sfârșit cu rezerva nouă, iar
    // „Încă un zbor” pornește cu Rachetele
    await putProfile({ crystal: 1000, metal: 300 })
    await load()
    await tap('#startWorkshop'); await page.waitForTimeout(200)
    await tap(buyBtn('hull')); await tap(buyBtn('kit'))
    await page.waitForTimeout(100)
    const u36 = await upsNow()
    await tap('#shopBack'); await page.waitForTimeout(200)
    await tap('#start'); await page.waitForTimeout(400)
    const d36 = await page.evaluate(() => ({ hp: window.__wg.state().hero.hp, mode: window.__wg.mode() }))
    const gd1 = await guard()                                    // partida de apărare în joc
    await page.click('#pause'); await page.waitForTimeout(200)
    const gd2 = await guard()                                    // partida de apărare pe pauză
    await load()
    await tap('#explore'); await page.waitForTimeout(400)
    const f36 = await page.evaluate(() => { const f = window.__wg.flight(); return { laser: f.ship.mods.laser, missile: f.ship.mods.missile, hp: f.ship.hp } })
    const gf1 = await guard()                                    // zborul în joc
    await page.click('#flightPause'); await page.waitForTimeout(200)
    const gf2 = await guard()                                    // zborul pe pauză
    await tap('#flightResume'); await page.waitForTimeout(300)
    await page.evaluate(() => { const f = window.__wg.flight(); f.ship.inv = 0; f.ship.hp = 1; f.ship.mods.shield = 0; f.ship.shieldUp = false; f.shots.push({ x: f.ship.x, y: f.ship.y, vx: 0, vy: 0 }) })
    await page.waitForSelector('#flightOverVeil:not([hidden])', { timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(200)
    const over36a = await page.evaluate(() => ({ sector: document.getElementById('flightOverSector').textContent, title: document.getElementById('flightOverTitle').textContent,
      label: document.getElementById('flightOverLabel').textContent, haul: [document.getElementById('overCrystal').textContent, document.getElementById('overMetal').textContent].join('/'),
      next: document.getElementById('flightNext').textContent, fmode: window.__wg.flight().mode }))
    await tap('#overWorkshop'); await page.waitForTimeout(200)
    const o36 = await shopState()
    const i36 = await inert()                                    // Escape, pagina ascunsă, `pagehide` cu atelierul de la sfârșitul zborului: nimic în plus în rezervă
    await tap(buyBtn('kit')); await page.waitForTimeout(100)
    const k36 = await upsNow(), pr36 = await profileNow()
    await tap('#shopBack'); await page.waitForTimeout(200)
    const back36 = await page.evaluate(() => ({ over: !document.getElementById('flightOverVeil').hidden, shop: !document.getElementById('shopVeil').hidden,
      reserve: { crystal: Number(document.getElementById('flightOverCrystal').textContent), metal: Number(document.getElementById('flightOverMetal').textContent) },
      sector: document.getElementById('flightOverSector').textContent, title: document.getElementById('flightOverTitle').textContent,
      label: document.getElementById('flightOverLabel').textContent, haul: [document.getElementById('overCrystal').textContent, document.getElementById('overMetal').textContent].join('/'),
      next: document.getElementById('flightNext').textContent }))
    await tap('#flightNext'); await page.waitForTimeout(400)
    const g36 = await page.evaluate(() => { const f = window.__wg.flight(); return { mode: f.mode, laser: f.ship.mods.laser, missile: f.ship.mods.missile } })
    await shot('21-dupa-atelier.png')
    check(36, 'după cumpărături: partida de apărare pornește cu nava la 66 de viață; zborul de pe start cu Laserul (și fără Rachete); atelierul de la sfârșitul zborului se deschide peste cartonașul de sfârșit, cumpără Arsenalul 2, „Înapoi” arată cartonașul cu rezerva nouă, iar „Încă un zbor” pornește cu Laserul și Rachetele',
      u36.hull === 1 && u36.kit === 1 && d36.mode === 'defense' && d36.hp === 66 && f36.laser > 0 && !(f36.missile > 0) &&
        o36.open && !o36.over && k36.kit === 2 && back36.over && !back36.shop && same(back36.reserve, pr36) && g36.mode === 'flying' && g36.laser > 0 && g36.missile > 0 &&
        [gd1, gd2, gf1, gf2].every((g) => g.ok) && gd1.phase === 'defense/playing/flying' && gd2.phase === 'defense/paused/flying' && gf1.phase.startsWith('flight/') && gf1.phase.endsWith('/flying') && gf2.phase.endsWith('/flying') &&
        over36a.fmode === 'down' && over36a.title === 'Nava a fost doborâtă' && over36a.next === 'Încă un zbor' &&
        back36.title === over36a.title && back36.sector === over36a.sector && back36.label === over36a.label && back36.haul === over36a.haul && back36.next === over36a.next &&
        i36.same && i36.a.shop && i36.a.fmode === 'down',
      `garda (apărare în joc / pe pauză, zbor în joc / pe pauză): ${[gd1, gd2, gf1, gf2].map((g) => `${g.phase} ${g.ok ? 'refuzat' : 'DESCHIS'}`).join(', ')}; ` +
        `Escape, pagină ascunsă, pagehide la sfârșitul zborului: ${i36.same ? 'nimic schimbat' : 'schimbat'}; cartonașul de sfârșit înainte ${JSON.stringify(over36a)}, după „Înapoi” ${JSON.stringify({ ...back36, reserve: undefined })}; ups ${JSON.stringify(u36)}; apărare ${JSON.stringify(d36)}; zbor de pe start ${JSON.stringify(f36)}; atelier de la sfârșit ${JSON.stringify(o36)}, ups ${JSON.stringify(k36)}; „Înapoi” ${JSON.stringify(back36)} față de profil ${show(pr36)}; „Încă un zbor” ${JSON.stringify(g36)}`)

    // 37. profilul stricat de mână: pe start rezerva 0 și 0, iar atelierul are cinci rânduri stinse, fără nicio eroare nouă în consolă
    await putProfile('{"v":1,"crystal":"mult"')
    await load()
    const s37 = await startReserve()
    await tap('#startWorkshop'); await page.waitForTimeout(200)
    const o37 = await shopState()
    await tap('#shopBack'); await page.waitForTimeout(200)
    await putProfile('{"v":1,"crystal":-5,"metal":1e99,"sector":2,"ups":{"hull":99}}')
    await load()
    const s37b = await startReserve()
    check(37, 'profilul stricat de mână în stocare (JSON tăiat, apoi valori peste margini) dă cartonașul de start cu rezerva 0 și 0; atelierul se deschide cu cinci rânduri stinse; nicio eroare în consolă și nicio excepție',
      same(s37, { crystal: 0, metal: 0 }) && same(s37b, { crystal: 0, metal: 0 }) && o37.open && o37.rows === 5 && o37.buys.every((b) => b === 'poor') && errors.length === noErr,
      `rezerva ${show(s37)} și ${show(s37b)}, atelier ${JSON.stringify(o37)}, erori noi ${errors.length - noErr}`)
    await page.evaluate(() => localStorage.removeItem('wg.v1.profile'))
    await page.setViewportSize({ width: 360, height: 640 })
    await putProfile({ crystal: 240, metal: 55, ups: { hull: 2, arms: 1, reach: 3, kit: 1 } })
    await load()
    await tap('#startWorkshop'); await page.waitForTimeout(200)
    await shot('20-atelier-360.png')
    const fit37 = await page.evaluate(() => { const c = document.getElementById('shopCard').getBoundingClientRect(); return { top: c.top, bottom: c.bottom, h: window.innerHeight, scroll: document.getElementById('shopVeil').scrollHeight > document.getElementById('shopVeil').clientHeight } })
    console.log(`SMOKE INFO: 20-atelier-360.png: cartonașul atelierului de la ${fit37.top.toFixed(0)} la ${fit37.bottom.toFixed(0)} din ${fit37.h}, derulare ${fit37.scroll}`)
    await page.evaluate(() => localStorage.removeItem('wg.v1.profile'))

    // Drumul înapoi la start din apărare (38–41). Cartonașele se apasă cu degetul, ca pe telefon.
    const defenseNow = () => page.evaluate(() => { const s = window.__wg.state(); return { t: s.t, crystal: s.crystal, metal: s.metal, seed: s.seed, phase: window.__wg.phase(), mode: window.__wg.mode() } })

    // 38. de la sfârșitul apărării: „Înapoi la start” (sub „Încă o partidă”) duce la cartonașul de start, iar de acolo „Explorează galaxia” pornește un zbor
    await page.setViewportSize({ width: 390, height: 780 })
    await page.evaluate(() => localStorage.clear())
    await load()
    await tap('#start')
    await page.waitForTimeout(300)
    await page.evaluate(() => window.__wg.run(200))
    await page.waitForSelector('#overVeil:not([hidden])', { timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(200)
    const over38 = { shown: await visible('#overVeil'), again: await txt('#again'), home: await txt('#overHome'),
      below: await page.evaluate(() => document.getElementById('overHome').getBoundingClientRect().top >= document.getElementById('again').getBoundingClientRect().bottom) }
    await shot('22-final-aparare.png')
    await tap('#overHome')
    await page.waitForTimeout(300)
    const start38 = { start: await visible('#startVeil'), over: await visible('#overVeil'), phase: await page.evaluate(() => window.__wg.phase()), cont: await visible('#continue'), save: await saveRaw() }
    await tap('#explore')
    await page.waitForTimeout(400)
    const fly38 = await page.evaluate(() => ({ mode: window.__wg.mode(), fm: window.__wg.flight().mode, t: window.__wg.flight().t, veil: !document.getElementById('startVeil').hidden }))
    check(38, 'de la sfârșitul apărării, „Înapoi la start” (sub „Încă o partidă”) duce la cartonașul de start, fără „Continuă partida” și fără salvare, iar „Explorează galaxia” pornește un zbor',
      over38.shown && over38.again === 'Încă o partidă' && over38.home === 'Înapoi la start' && over38.below && start38.start && !start38.over && start38.phase === 'ready' && !start38.cont && start38.save === null &&
        fly38.mode === 'flight' && fly38.fm === 'flying' && fly38.t > 0 && !fly38.veil,
      `final ${JSON.stringify(over38)}, start ${JSON.stringify(start38)}, zbor ${JSON.stringify(fly38)}`)

    // 39. din pauza apărării, la 360 × 640: trei butoane care încap; „Înapoi la start” duce la start cu „Continuă partida · m:ss”, sesiunea nu mai e
    // în pauză, iar „Continuă partida” reia aceeași partidă (timpul și resursele)
    await page.setViewportSize({ width: 360, height: 640 })
    await page.evaluate(() => localStorage.clear())
    await load()
    await tap('#start')
    await page.waitForTimeout(300)
    await page.evaluate(() => window.__wg.run(20))
    await tap('#pause')
    await page.waitForTimeout(300)
    const p39 = await defenseNow()
    const card39 = await page.evaluate(() => {
      const ids = ['resume', 'fresh', 'pauseHome'], r = (id) => document.getElementById(id).getBoundingClientRect()
      const c = document.querySelector('#pauseVeil .card').getBoundingClientRect()
      return { texts: ids.map((id) => document.getElementById(id).textContent), inside: ids.every((id) => r(id).top >= 0 && r(id).bottom <= window.innerHeight && r(id).left >= 0 && r(id).right <= window.innerWidth),
        card: [Math.round(c.top), Math.round(c.bottom)], h: window.innerHeight, scroll: document.getElementById('pauseVeil').scrollHeight > document.getElementById('pauseVeil').clientHeight }
    })
    await shot('23-pauza-aparare-360.png')
    const saved39 = await saveRaw()
    await tap('#pauseHome')
    await page.waitForTimeout(300)
    const start39 = { start: await visible('#startVeil'), pause: await visible('#pauseVeil'), phase: await page.evaluate(() => window.__wg.phase()), cont: await txt('#continue'), contShown: await visible('#continue'), save: await saveRaw() }
    const clock39 = `${Math.floor(Math.floor(p39.t) / 60)}:${String(Math.floor(p39.t) % 60).padStart(2, '0')}`
    // Apăsat și citit în același pas, înaintea oricărui cadru: starea e exact cea reluată (ca la verificarea 13).
    const after39 = await page.evaluate(() => {
      document.getElementById('continue').click()
      const s = window.__wg.state()
      return { t: s.t, crystal: s.crystal, metal: s.metal, phase: window.__wg.phase() }
    })
    check(39, 'din pauza apărării, la 360 × 640: cele trei butoane („Continuă”, „Partidă nouă”, „Înapoi la start”) încap; „Înapoi la start” duce la start, cu sesiunea scoasă din pauză și partida salvată, iar „Continuă partida · m:ss” reia aceeași partidă (timpul și resursele)',
      card39.texts.join('|') === 'Continuă|Partidă nouă|Înapoi la start' && card39.inside && p39.phase === 'paused' && saved39 !== null &&
        start39.start && !start39.pause && start39.phase === 'ready' && start39.contShown && start39.cont === `Continuă partida · ${clock39}` && start39.save === saved39 &&
        after39 !== null && after39.phase === 'playing' && after39.t === p39.t && after39.crystal === p39.crystal && after39.metal === p39.metal,
      `pauză ${JSON.stringify(p39)}, cartonaș ${JSON.stringify(card39)}, start ${JSON.stringify({ ...start39, save: start39.save === saved39 ? 'aceeași' : 'alta' })}, reluat ${JSON.stringify(after39)}`)
    await page.setViewportSize({ width: 390, height: 780 })

    // 40. din pauza apărării la start, apoi atelierul se deschide (fără „în pauză” rămas în spate), iar „Înapoi” arată din nou startul cu „Continuă partida”
    await load()
    await page.evaluate(() => { if (window.__wg.phase() !== 'playing') document.getElementById('continue').click() })
    await page.waitForTimeout(300)
    await tap('#pause')
    await page.waitForTimeout(300)
    const ph40 = await page.evaluate(() => window.__wg.phase())
    await tap('#pauseHome')
    await page.waitForTimeout(300)
    await tap('#startWorkshop')
    await page.waitForTimeout(300)
    const shop40 = await shopState()
    await tap('#shopBack')
    await page.waitForTimeout(300)
    const back40 = { start: await visible('#startVeil'), cont: await visible('#continue') }
    check(40, 'din pauza apărării, „Înapoi la start” și apoi „Atelier”: atelierul se deschide peste start, cu cinci rânduri; „Înapoi” arată startul cu „Continuă partida”',
      ph40 === 'paused' && shop40.open && !shop40.start && shop40.rows === 5 && back40.start && back40.cont,
      `fază la pauză ${ph40}, atelier ${JSON.stringify(shop40)}, înapoi ${JSON.stringify(back40)}`)

    // 41. fără `?seed=`: după o partidă încheiată și întoarcerea la start, „Apără planeta” pornește cu altă sămânță, nu a doua oară aceeași
    await page.evaluate(() => localStorage.clear())
    await page.goto(`${URL_}?debug=1`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500)
    await tap('#start')
    await page.waitForTimeout(300)
    const a41 = await defenseNow()
    await page.evaluate(() => window.__wg.run(200))
    await page.waitForSelector('#overVeil:not([hidden])', { timeout: 3000 }).catch(() => {})
    await sleep(20)
    await tap('#overHome')
    await page.waitForTimeout(300)
    await tap('#start')
    await page.waitForTimeout(300)
    const b41 = await defenseNow()
    check(41, 'fără ?seed=, după o partidă de apărare încheiată și „Înapoi la start”, „Apără planeta” pornește o partidă nouă cu altă sămânță, cu ceasul de la zero',
      a41.phase === 'playing' && b41.phase === 'playing' && b41.seed !== a41.seed && b41.t < 2, `sămânța ${a41.seed} → ${b41.seed}, timp ${b41.t.toFixed(2)} s`)

    // 42. banda zborului la 360 lățime, cu cifre de joc: 151 cristale, 52 metal, Carena la plafon (7 vieți) și cinci module. Fiecare cerc de viață e
    // întreg în bandă și pe ecran; după o lovitură se vede un cerc gol
    await page.setViewportSize({ width: 360, height: 640 })
    await putProfile({ crystal: 0, metal: 0, ups: { hull: 4 } })
    await loadFlight()
    const hits42 = () => page.evaluate(() => {
      const band = document.getElementById('flightBanner').getBoundingClientRect(), w = window.innerWidth
      const dots = [...document.querySelectorAll('#flHits i')].map((i) => ({ on: i.classList.contains('on'), r: i.getBoundingClientRect() }))
      return { n: dots.length, on: dots.filter((d) => d.on).length, inBand: dots.every((d) => d.r.left >= band.left - 0.5 && d.r.right <= band.right + 0.5),
        onScreen: dots.every((d) => d.r.left >= 0 && d.r.right <= w), hollowSeen: dots.some((d) => !d.on && d.r.left >= 0 && d.r.right <= w),
        right: Math.round(Math.max(...dots.map((d) => d.r.right))), band: [Math.round(band.left), Math.round(band.right)], w,
        text: [document.getElementById('flCrystal').textContent, document.getElementById('flMetal').textContent].join(' '), mods: document.querySelectorAll('#flMods .fslot').length }
    })
    await page.evaluate(() => {
      const f = window.__wg.flight()
      f.crystal = 151; f.metal = 52; f.ship.inv = 1e9
      Object.assign(f.ship.mods, { gun: 3, laser: 2, missile: 2, shield: 1, magnet: 1 }); f.ship.shieldUp = false; f.ship.shieldT = 1e9
    })
    await page.waitForTimeout(300)
    const a42 = await hits42()
    await shot('24-banda-zbor-360-7-vieti.png')
    await page.evaluate(() => { const f = window.__wg.flight(); f.ship.inv = 0; f.shots.push({ x: f.ship.x, y: f.ship.y, vx: 0, vy: 0 }) })
    await page.waitForTimeout(300)
    const b42 = await hits42()
    check(42, 'banda zborului la 360 × 640, cu 151 cristale, 52 metal, 7 vieți și cinci module: fiecare cerc de viață e întreg în bandă și pe ecran; după o lovitură, 6 din 7 și cercul gol se vede',
      a42.text === '151 52' && a42.mods === 5 && a42.n === 7 && a42.on === 7 && a42.inBand && a42.onScreen && b42.n === 7 && b42.on === 6 && b42.inBand && b42.onScreen && b42.hollowSeen,
      `înainte ${JSON.stringify(a42)}, după lovitură ${JSON.stringify(b42)}`)
    await page.evaluate(() => localStorage.removeItem('wg.v1.profile'))

    // 43. ecranul rotit cu degetul pe el: degetul e lăsat la schimbarea scării câmpului, deci o mișcare de 1 px după rotire nu aruncă nava
    await page.setViewportSize({ width: 360, height: 640 })
    await loadFlight()
    await page.evaluate(() => { window.__wg.flight().ship.inv = 1e9 })
    await fingerAt('touchStart', 180, 500)
    await fingerAt('touchMove', 170, 500)
    await sleep(300)
    const a43 = await page.evaluate(() => ({ x: window.__wg.flight().ship.x, k: window.__wg.flightField().scale }))
    await page.setViewportSize({ width: 640, height: 360 })
    await page.waitForTimeout(400)
    await fingerAt('touchMove', 171, 300)
    await sleep(300)
    const b43 = await page.evaluate(() => ({ x: window.__wg.flight().ship.x, k: window.__wg.flightField().scale, fm: window.__wg.flight().mode }))
    await fingerAt('touchEnd', 0, 0)
    check(43, 'zborul cu degetul pe ecran, iar ecranul trece din 360 × 640 în 640 × 360: scara se schimbă, iar următoarea mișcare a degetului nu mută nava (cel mult 1 unitate)',
      a43.k !== b43.k && b43.fm === 'flying' && Math.abs(b43.x - a43.x) <= 1, `scara ${a43.k.toFixed(4)} → ${b43.k.toFixed(4)}, nava x ${a43.x.toFixed(2)} → ${b43.x.toFixed(2)}`)
    await page.setViewportSize({ width: 390, height: 780 })

    // 44. stocarea refuzată (o dată accesul la localStorage aruncă, o dată scrierea): după un zbor, cartonașul de sfârșit arată rezerva cu ce s-a adus,
    // atelierul cumpără o treaptă (rezerva scade, punctul se aprinde), iar „Înapoi” arată rezerva de după cumpărătură; nicio eroare în pagină
    const refused44 = []
    for (const [name, init] of [
      ['accesul aruncă', () => {
        const no = { configurable: true, get() { throw new DOMException('refuzat', 'SecurityError') } }
        try { Object.defineProperty(window, 'localStorage', no) } catch { Object.defineProperty(Window.prototype, 'localStorage', no) }
      }],
      ['scrierea aruncă', () => { Storage.prototype.setItem = function () { throw new DOMException('plin', 'QuotaExceededError') } }],
    ]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, serviceWorkers: 'block' })
      await ctx.addInitScript(init)
      const p = await ctx.newPage()
      const errs = []
      p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
      p.on('pageerror', (e) => errs.push(e.message))
      await p.goto(FLIGHT_PAGE); await p.waitForTimeout(500)
      await p.evaluate(() => { const f = window.__wg.flight(); f.crystal = 60; f.metal = 12; f.ship.inv = 0; f.ship.hp = 1; f.ship.mods.shield = 0; f.ship.shieldUp = false; f.shots.push({ x: f.ship.x, y: f.ship.y, vx: 0, vy: 0 }) })
      await p.waitForSelector('#flightOverVeil:not([hidden])', { timeout: 3000 }).catch(() => {})
      await p.waitForTimeout(200)
      const read = (ids) => p.evaluate((ids) => ids.map((id) => document.getElementById(id).textContent).join('/'), ids)
      const over = { haul: await read(['overCrystal', 'overMetal']), reserve: await read(['flightOverCrystal', 'flightOverMetal']) }
      // Apăsat din cod, nu cu `p.click`: un buton stins (rezervă prea mică) nu trebuie să oprească proba, ci să-i pice verificarea.
      const press = (sel) => p.evaluate((sel) => document.querySelector(sel)?.click(), sel)
      await press('#overWorkshop'); await p.waitForTimeout(200)
      const shop = await read(['shopCrystal', 'shopMetal'])
      await p.waitForTimeout(500)
      await press('#shopRows .buy[data-up="hull"]'); await p.waitForTimeout(500)
      const bought = { reserve: await read(['shopCrystal', 'shopMetal']), dots: await p.evaluate(() => document.querySelector('#shopRows .buy[data-up="hull"]')?.closest('.up')?.querySelectorAll('.up-dots i.on').length ?? -1) }
      await press('#shopBack'); await p.waitForTimeout(200)
      const back = await read(['flightOverCrystal', 'flightOverMetal'])
      refused44.push({ name, ok: over.haul === '+60/+12' && over.reserve === '60/12' && shop === '60/12' && bought.reserve === '10/2' && bought.dots === 1 && back === '10/2' && errs.length === 0,
        text: `${name}: sfârșit ${over.haul}, rezerva ${over.reserve}; atelier ${shop} → după Carenă ${bought.reserve}, puncte ${bought.dots}; „Înapoi” ${back}; erori ${errs.length}${errs.length ? ` (${errs[0]})` : ''}` })
      await ctx.close()
    }
    check(44, 'cu stocarea refuzată (accesul aruncă; scrierea aruncă): după un zbor, rezerva de pe cartonașul de sfârșit e cea adusă (60 / 12), atelierul cumpără Carena (10 / 2, un punct aprins), iar „Înapoi” arată rezerva nouă; nicio eroare',
      refused44.every((r) => r.ok), refused44.map((r) => r.text).join('; '))

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
