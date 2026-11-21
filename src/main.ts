// Intrarea: leagă pagina, sesiunile (apărarea și zborul), comenzile și desenul. Stările (start, joc, pauză, final) le țin sesiunile;
// aici se arată. Un singur ciclu de cadre, cu modul de joc ales (`mode`).
import '@fontsource/exo-2/latin-800.css'
import '@fontsource/exo-2/latin-ext-800.css'
import '@fontsource/rubik/latin-400.css'
import '@fontsource/rubik/latin-ext-400.css'
import '@fontsource/rubik/latin-500.css'
import '@fontsource/rubik/latin-ext-500.css'
import '@fontsource/rubik/latin-700.css'
import '@fontsource/rubik/latin-ext-700.css'
import './ui/ui.css'
import { parseFlags } from './app/flags'
import type { FlightOver } from './app/flightSession'
import { advance } from './app/loop'
import { createSession, type OverInfo, type Phase } from './app/session'
import { registerServiceWorker } from './app/sw'
import { clearGame, loadGame, loadProfile, saveGame, saveIfRecord } from './app/storage'
import { createWake, type WakeNav } from './app/wake'
import { FLIGHT } from './data/flight'
import type { FlightInput, FlightState } from './flight/state'
import { stepFlight } from './flight/step'
import { createFlightMode } from './flightMode'
import { createWorkshop } from './workshopMode'
import { bindInput } from './input/bind'
import { createRenderer } from './render/canvas'
import { createFlightRenderer } from './render/flight/canvas'
import { DT, type GameState } from './sim/state'
import { step } from './sim/step'
import { createCards } from './ui/cards'
import { choiceView, createChoice } from './ui/choice'
import { createHud } from './ui/hud'
import { STR } from './ui/strings'

const FPS_WINDOW = 0.5       // secunde: fereastra pe care se numără cadrele afișate
const SETTLE_MS = 1000       // cât se mai desenează după o schimbare, când partida nu e în curs (camera ajunge din urmă nava)

// Textele din pagină vin din STR: data-str = text, data-str-aria = eticheta de accesibilitate.
// O cheie care lipsește e o greșeală de scris, nu ceva de sărit.
function text(key: string | undefined): string {
  const v = key === undefined ? undefined : (STR as unknown as Record<string, unknown>)[key]
  if (typeof v !== 'string') throw new Error(`textul „${key}” lipsește din STR`)
  return v
}
for (const el of document.querySelectorAll<HTMLElement>('[data-str]')) el.textContent = text(el.dataset.str)
for (const el of document.querySelectorAll<HTMLElement>('[data-str-aria]')) el.setAttribute('aria-label', text(el.dataset.strAria))

type Mode = 'defense' | 'flight'
declare global {
  interface Window {
    __wg?: {
      state(): GameState; phase(): Phase; run(seconds: number): void; drawMs(frames: number): number
      mode(): Mode; flight(): FlightState; runFlight(seconds: number): void; flightDrawMs(frames: number): number
      flightField(): { x: number; y: number; w: number; h: number; scale: number }   // câmpul zborului pe ecran, px de la colțul canvasului
    }
  }
}

const canvas = document.getElementById('field') as HTMLCanvasElement
const stage = document.getElementById('stage') as HTMLElement
const renderer = createRenderer(canvas)
const flightView = createFlightRenderer(canvas, renderer.sky)   // cerul se pictează o dată, de desenatorul apărării, și se împarte
const hud = createHud(document)
const flags = parseFlags(location.search)
/** Sămânța unei partide sau a unui zbor nou: `?seed=` dacă e dat, altfel din ceas. */
const freshSeed = (): number => flags.seed ?? Date.now() >>> 0
// Întăririle se citesc din profil la fiecare partidă nouă, deci cele cumpărate în atelier intră la următoarea pornire.
const session = createSession({ saveGame, clearGame, saveIfRecord, ups: () => loadProfile().ups }, freshSeed())
let mode: Mode = 'defense'
/** Faza modului de joc de acum. */
const phaseNow = (): Phase => (mode === 'flight' ? fm.session.phase : session.phase)
const wake = createWake(navigator as WakeNav)
// Jocul fără internet, doar în build-ul publicat (`__WG_SW__ && PROD`). Sub `if`, pagina într-un singur fișier
// (`__WG_SW__` fals) pierde la build apelul cu totul, cu adresa lui `./sw.js` cu tot.
if (__WG_SW__) registerServiceWorker(navigator, import.meta.env.PROD)
// Joystickul merge doar în joc și doar cât panoul de alegere nu e pe ecran; tastele 1–3 aleg din panou, prin poarta lui (`choice.key`).
// În zbor, degetul conduce nava (în unități de câmp), doar cât se zboară; joystickul nu merge.
const input = bindInput(canvas, () => phaseNow() === 'playing' && (mode === 'flight' || !choice.open), (i) => choice.key(i),
  { on: () => mode === 'flight', scale: () => flightView.scale() })
// Zborul: sesiunea, banda, profilul și sectorul ales (`flightMode.ts`); aici doar se alege modul și se arată cartonașele.
const fm = createFlightMode(document, input)
const still = { x: 0, y: 0 }
const STILL_FLIGHT: FlightInput = { dx: 0, dy: 0 }
let saved = loadGame()
let fps: { now: number; min: number } | null = null
let fpsFrames = 0, fpsTime = 0
let acc = 0
let last = performance.now()
let drawUntil = 0

/** Cere desenul încă o secundă: după o schimbare de stare, o redimensionare sau un cer de pictat din nou. */
function redraw(): void { drawUntil = performance.now() + SETTLE_MS }

// Fiecare intrare în joc cere ecranul aprins, fiecare ieșire îl lasă (și la pagina ascunsă: sistemul ia singur blocarea).
function playing(): void {
  input.release()
  acc = 0; last = performance.now()
  cards.hide()
  wake.on()
  redraw()
  offerUp()                                     // o partidă reluată sau scoasă din pauză cu oferta deschisă duce direct la panou
}
function stopped(): void {
  input.release()
  choice.hide()                                 // pe pauză se vede cartonașul; panoul revine la „Continuă”, oferta e în stare
  wake.off()
  redraw()
}

/** Simularea așteaptă o alegere: panoul pe ecran, o singură dată, cu joystickul lăsat și fără butonul de pauză. */
function offerUp(): void {
  if (session.phase !== 'playing' || choice.open) return
  const v = choiceView(session.s)
  if (v === null) return
  input.release()
  cards.hold()
  choice.show(v)
  redraw()
}
/** Oferta aleasă din panou (atingere, clic sau tastele 1–3), după poarta panoului. Dacă simularea o refuză, panoul rămâne. */
function pick(i: number): void {
  if (!choice.open || !session.choose(i)) return
  choice.hide()
  playing()
}

/** S-a jucat deja o partidă în pagina asta: atunci „Apără planeta” pornește cu sămânță nouă (cu `?seed=`, tot aceea), nu a doua oară aceeași. */
let played = false
/** Rândul fps din bandă se golește: la o pornire nouă, la întoarcerea la start și la „Continuă partida”. */
function clearFps(): void { fps = null; fpsFrames = 0; fpsTime = 0 }
function begin(seed: number, stress: boolean): void {
  mode = 'defense'
  played = true
  session.start(seed, stress)
  saved = null                                  // „Continuă partida” nu mai e de oferit; din stocare sesiunea o șterge doar la o partidă obișnuită, nu și în testul de viteză
  clearFps()
  playing()
}
function pause(): void {
  if (mode === 'flight') {                      // în zbor, pauza (butonul, Escape, pagina ascunsă) lucrează doar pe zbor
    if (!fm.session.pause()) return             // pauza trece în rezervă ce s-a strâns
    stopped()
    cards.showFlightPause(fm.session.f)
    return
  }
  if (!session.pause()) return
  stopped()
  cards.showPause(Math.floor(session.s.t))
}
function unpause(): void { if (mode === 'flight' ? fm.session.unpause() : session.unpause()) playing() }

/**
 * Un zbor în sectorul dat. Pornește doar de pe un cartonaș (de start sau de sfârșit al zborului) ori cu `?debug=1&zbor=N`, deci
 * fără o partidă de apărare în curs; dacă totuși ar fi una (în joc sau pe pauză), zborul nu pornește: altfel ar rămâne în curs
 * în spatele lui. Nu atinge partida de apărare salvată și nici recordul.
 */
function fly(sector: number): void {
  if (session.phase === 'playing' || session.phase === 'paused') return
  mode = 'flight'
  fm.begin(freshSeed(), sector)
  playing()                                     // `playing` lasă degetul (și mișcarea strânsă) și cere ecranul aprins
}
/**
 * Înapoi la cartonașul de start, cu rezerva citită acum și sectorul propus: din zbor („Renunță la zbor”, „Înapoi la start”) și din
 * apărare („Înapoi la start” din pauză sau de la final). Apărarea nu mai e în pauză (deci zborul și atelierul pornesc), iar partida
 * salvată (de pauză) se citește din nou din stocare, pentru „Continuă partida”.
 */
function home(): void {
  if (mode === 'flight') fm.end()
  mode = 'defense'
  session.leave()
  saved = loadGame()
  clearFps()                                    // rândul fps e doar al testului de viteză: nu rămâne pe start
  stopped()
  cards.showStart({ saved: saved === null ? null : { secs: Math.floor(saved.t) }, ...fm.startCard() })
}
/** Atelierul, de unde s-a deschis: cartonașul de start sau cel de sfârșit al zborului (cu ce a adus zborul). Închis: nimic. */
let shopFrom: 'start' | 'over' | null = null
let flightOver: FlightOver | null = null
const veilUp = (id: string): boolean => document.getElementById(id)?.hidden === false
/** Doar de pe unul din cele două cartonașe, cu nicio partidă, niciun zbor și nicio pauză în curs; altfel nu face nimic. */
function openShop(): void {
  if (shopFrom !== null || choice.open || phaseNow() === 'playing' || phaseNow() === 'paused') return
  const from = mode === 'defense' && veilUp('startVeil') ? 'start' : mode === 'flight' && flightOver !== null && veilUp('flightOverVeil') ? 'over' : null
  if (from === null) return
  shopFrom = from
  cards.hold()                                  // cartonașul se ascunde cât panoul e pe ecran; nici butonul de pauză
  workshop.show()
  redraw()
}
/** „Înapoi”: același cartonaș, cu rezerva de după cumpărături și cu sectorul pe care îl alesese jucătorul. */
function closeShop(): void {
  const from = shopFrom
  if (from === null) return
  shopFrom = null
  workshop.hide()
  if (from === 'start') cards.showStart({ saved: saved === null ? null : { secs: Math.floor(saved.t) }, profile: loadProfile(), sector: fm.sector() })
  else if (flightOver !== null) cards.showFlightOver(flightOver, loadProfile())
  redraw()
}
function ended(r: OverInfo): void {
  stopped()
  cards.showOver(r)
}

const cards = createCards(document, {
  defend: () => begin(played ? freshSeed() : session.s.seed, false),   // prima partidă folosește sămânța deja așezată în zona de joc
  continue() {
    if (saved === null) return
    session.resume(saved)
    saved = null
    played = true
    clearFps()                                  // plasă: partida reluată nu e test de viteză
    playing()
  },
  stress: () => begin(played ? freshSeed() : session.s.seed, true),
  again: () => begin(Date.now() >>> 0, false),
  pause,
  resume: unpause,
  fresh: () => begin(Date.now() >>> 0, false),
  explore: () => fly(fm.sector()),
  sector(delta) { const c = fm.pick(delta); cards.showSector(c.sector, c.farthest) },
  next: () => fly(fm.nextSector()),
  home,
  workshop: openShop,
})
const choice = createChoice(document, pick)
const workshop = createWorkshop(document, closeShop)
home()

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' || e.repeat || choice.open) return   // panoul de alegere nu se închide cu Escape
  if (phaseNow() === 'playing') pause()
  else if (phaseNow() === 'paused') unpause()
})
// Pauza automată: jucătorul a ieșit din pagină (alt program, ecran stins, pagină închisă). Pauza salvează partida.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { pause(); return }
  renderer.refresh()                            // la revenire: cerul (al amândurora) se pictează din nou, iar primul cadru nu sare
  last = performance.now(); acc = 0
  redraw()
})
window.addEventListener('pagehide', pause)
canvas.addEventListener('contextrestored', redraw)

// Cu scara câmpului schimbată (ecranul rotit, fereastra mărită), degetul ținut pe ecran e lăsat: poziția lui veche e la scara veche,
// iar următoarea mișcare ar arunca nava.
function resize(): void {
  const b = hud.bottom(), was = flightView.scale()
  renderer.resize(b); flightView.resize(b)
  if (flightView.scale() !== was) input.release()
  redraw()
}
const sizes = new ResizeObserver(resize)
sizes.observe(stage)
sizes.observe(document.getElementById('hud') as HTMLElement)      // banda crește când apare textul fps, se schimbă un font sau vine banda zborului
resize()

if (flags.debug) {
  window.__wg = {
    state: () => session.s,
    phase: () => session.phase,
    run(seconds) { for (let i = 0, n = Math.round(seconds / DT); i < n; i++) step(session.s, still) },
    // Media, în ms pe cadru, a `frames` cadre desenate unul după altul din starea de acum.
    drawMs(frames) {
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const t0 = performance.now()
      for (let i = 0; i < frames; i++) {
        renderer.frame(session.s, still, null, 0)
        ctx.getImageData(0, 0, 1, 1)            // citirea unui pixel obligă desenul să fie dus la capăt
      }
      return (performance.now() - t0) / frames
    },
    mode: () => mode,
    flight: () => fm.session.f,
    runFlight(seconds) { for (let i = 0, n = Math.round(seconds / DT); i < n; i++) stepFlight(fm.session.f, STILL_FLIGHT) },
    flightDrawMs(frames) {
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const t0 = performance.now()
      for (let i = 0; i < frames; i++) {
        flightView.frame(fm.session.f, 0)
        ctx.getImageData(0, 0, 1, 1)
      }
      return (performance.now() - t0) / frames
    },
    flightField() {
      const k = flightView.fit()
      return { x: k.x, y: k.y, w: FLIGHT.field.w * k.scale, h: FLIGHT.field.h * k.scale, scale: k.scale }
    },
  }
}
if (flags.zbor !== null) fly(flags.zbor)        // doar cu ?debug=1: zborul pornește direct, fără cartonașul de start

function frame(now: number): void {
  requestAnimationFrame(frame)                  // întâi cadrul următor: o excepție într-un cadru nu oprește bucla
  const frameDt = Math.min(0.1, Math.max(0, (now - last) / 1000))
  last = now
  if (mode === 'flight') {
    if (fm.session.phase === 'playing') {
      const r = advance(acc, frameDt)
      acc = r.acc
      const end = fm.advance(r.steps)
      if (end !== null) { flightOver = end; stopped(); cards.showFlightOver(end, loadProfile()) }   // imediat, peste cadrul înghețat; profilul, după ce s-a trecut în rezervă
    } else if (now > drawUntil) {
      return
    }
    flightView.frame(fm.session.f, frameDt)
    fm.sync()
    return
  }
  let camDt = frameDt                           // cât timp „a trecut” pentru cameră
  if (session.phase === 'playing' && !choice.open) {   // cu panoul deschis simularea stă: nici pași, nici desen după ce camera s-a așezat
    const r = advance(acc, frameDt)
    acc = r.acc
    const end = session.advance(r.steps, input.read())
    camDt = r.steps * DT                        // camera se mișcă doar cu pașii simulării: nava nu tremură pe ecrane de 120 Hz
    if (session.stress) {
      fpsFrames++; fpsTime += frameDt
      if (fpsTime >= FPS_WINDOW) {
        const n = Math.round(fpsFrames / fpsTime)
        fps = { now: n, min: fps === null ? n : Math.min(fps.min, n) }
        fpsFrames = 0; fpsTime = 0
      }
    }
    if (end !== null) ended(end)
    else offerUp()
  } else if (now > drawUntil) {
    return                                      // nimic nu se mișcă: fără desen, până la următoarea schimbare
  }
  const live = session.phase === 'playing' && !choice.open
  renderer.frame(session.s, live ? input.read() : still, live ? input.stick : null, camDt)
  hud.sync(session.s, { hint: live && !session.s.hero.moved, fps })
}
requestAnimationFrame(frame)
