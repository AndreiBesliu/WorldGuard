// Intrarea: leagă pagina, sesiunea, comenzile și desenul. Stările (start, joc, pauză, final) le ține sesiunea; aici se arată.
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
import { advance } from './app/loop'
import { createSession, type OverInfo, type Phase } from './app/session'
import { registerServiceWorker } from './app/sw'
import { clearGame, loadGame, saveGame, saveIfRecord } from './app/storage'
import { createWake, type WakeNav } from './app/wake'
import { bindInput } from './input/bind'
import { createRenderer } from './render/canvas'
import { DT, type GameState } from './sim/state'
import { step } from './sim/step'
import { createCards } from './ui/cards'
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

declare global {
  interface Window { __wg?: { state(): GameState; phase(): Phase; run(seconds: number): void; drawMs(frames: number): number } }
}

const canvas = document.getElementById('field') as HTMLCanvasElement
const stage = document.getElementById('stage') as HTMLElement
const renderer = createRenderer(canvas)
const hud = createHud(document)
const flags = parseFlags(location.search)
const session = createSession({ saveGame, clearGame, saveIfRecord }, flags.seed ?? Date.now() >>> 0)
const wake = createWake(navigator as WakeNav)
// Jocul fără internet, doar în build-ul publicat (`__WG_SW__ && PROD`). Sub `if`, pagina într-un singur fișier
// (`__WG_SW__` fals) pierde la build apelul cu totul, cu adresa lui `./sw.js` cu tot.
if (__WG_SW__) registerServiceWorker(navigator, import.meta.env.PROD)
const input = bindInput(canvas, () => session.phase === 'playing')
const still = { x: 0, y: 0 }
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
}
function stopped(): void {
  input.release()
  wake.off()
  redraw()
}

function begin(seed: number, stress: boolean): void {
  session.start(seed, stress)
  saved = null                                  // o partidă nouă o înlocuiește pe cea salvată (sesiunea o șterge și din stocare)
  fps = null; fpsFrames = 0; fpsTime = 0
  playing()
}
function pause(): void {
  if (!session.pause()) return
  stopped()
  cards.showPause(Math.floor(session.s.t))
}
function unpause(): void { if (session.unpause()) playing() }
function ended(r: OverInfo): void {
  stopped()
  cards.showOver(r)
}

const cards = createCards(document, {
  start: () => begin(session.s.seed, false),    // prima partidă folosește sămânța deja așezată în zona de joc
  continue() {
    if (saved === null) return
    session.resume(saved)
    saved = null
    playing()
  },
  stress: () => begin(session.s.seed, true),
  again: () => begin(Date.now() >>> 0, false),
  pause,
  resume: unpause,
  fresh: () => begin(Date.now() >>> 0, false),
})
cards.showStart(saved === null ? null : { secs: Math.floor(saved.t) })

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' || e.repeat) return
  if (session.phase === 'playing') pause()
  else if (session.phase === 'paused') unpause()
})
// Pauza automată: jucătorul a ieșit din pagină (alt program, ecran stins, pagină închisă). Pauza salvează partida.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { pause(); return }
  renderer.refresh()                            // la revenire: cerul se pictează din nou, iar primul cadru nu sare
  last = performance.now(); acc = 0
  redraw()
})
window.addEventListener('pagehide', pause)
canvas.addEventListener('contextrestored', redraw)

function resize(): void { renderer.resize(hud.bottom()); redraw() }
const sizes = new ResizeObserver(resize)
sizes.observe(stage)
sizes.observe(document.getElementById('banner') as HTMLElement)   // banda crește când apare textul fps sau se schimbă un font
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
  }
}

function frame(now: number): void {
  requestAnimationFrame(frame)                  // întâi cadrul următor: o excepție într-un cadru nu oprește bucla
  const frameDt = Math.min(0.1, Math.max(0, (now - last) / 1000))
  last = now
  let camDt = frameDt                           // cât timp „a trecut” pentru cameră
  if (session.phase === 'playing') {
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
  } else if (now > drawUntil) {
    return                                      // nimic nu se mișcă: fără desen, până la următoarea schimbare
  }
  const live = session.phase === 'playing'
  renderer.frame(session.s, live ? input.read() : still, live ? input.stick : null, camDt)
  hud.sync(session.s, { hint: live && !session.s.hero.moved, fps })
}
requestAnimationFrame(frame)
