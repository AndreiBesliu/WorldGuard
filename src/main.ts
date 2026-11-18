// Intrarea: leagă pagina, simularea, comenzile și desenul. Trei stări: ready, playing, over.
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
import { saveIfRecord } from './app/storage'
import { BALANCE } from './data/balance'
import { bindInput } from './input/bind'
import { createRenderer } from './render/canvas'
import { spawnFoe } from './sim/foes'
import { heroMaxHp } from './sim/hero'
import { createGame, DT, type GameState } from './sim/state'
import { step } from './sim/step'
import { createCards } from './ui/cards'
import { createHud } from './ui/hud'
import { STR } from './ui/strings'

const STRESS_FOES = 150      // cât de plină e zona de joc în testul de viteză: număr de măsurat, nu de joc
const FPS_WINDOW = 0.5       // secunde: fereastra pe care se numără cadrele afișate

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
  interface Window { __wg?: { state(): GameState; run(seconds: number): void; drawMs(frames: number): number } }
}

const canvas = document.getElementById('field') as HTMLCanvasElement
const stage = document.getElementById('stage') as HTMLElement
const renderer = createRenderer(canvas)
const hud = createHud(document)
const flags = parseFlags(location.search)

type Phase = 'ready' | 'playing' | 'over'
let phase: Phase = 'ready'
let stress = false
let fps: { now: number; min: number } | null = null
let fpsFrames = 0, fpsTime = 0
let s: GameState = createGame(flags.seed ?? Date.now() >>> 0)
const input = bindInput(canvas, () => phase === 'playing')
const still = { x: 0, y: 0 }
let acc = 0
let last = performance.now()

function begin(seed: number, isStress: boolean): void {
  s = createGame(seed)
  stress = isStress
  if (stress) s.spawnT = 1e9                    // în testul de viteză nu apar dușmani de la sine: numărul rămâne exact STRESS_FOES
  fps = null; fpsFrames = 0; fpsTime = 0
  acc = 0; last = performance.now()
  input.release()
  phase = 'playing'
  cards.hide()
}
const cards = createCards(document, {
  start: () => begin(s.seed, false),            // prima partidă folosește sămânța deja așezată în zona de joc
  stress: () => begin(s.seed, true),
  again: () => begin(Date.now() >>> 0, false),
})
cards.showStart()

function resize(): void { renderer.resize(hud.bottom()) }
const sizes = new ResizeObserver(resize)
sizes.observe(stage)
sizes.observe(document.getElementById('banner') as HTMLElement)   // banda crește când apare textul fps sau se schimbă un font
resize()

if (flags.debug) {
  window.__wg = {
    state: () => s,
    run(seconds) { for (let i = 0, n = Math.round(seconds / DT); i < n; i++) step(s, still) },
    // Media, în ms pe cadru, a `frames` cadre desenate unul după altul din starea de acum.
    drawMs(frames) {
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const t0 = performance.now()
      for (let i = 0; i < frames; i++) {
        renderer.frame(s, still, null, 0)
        ctx.getImageData(0, 0, 1, 1)            // citirea unui pixel obligă desenul să fie dus la capăt
      }
      return (performance.now() - t0) / frames
    },
  }
}
// După ce pagina a stat ascunsă, primul cadru nu trebuie să sară.
document.addEventListener('visibilitychange', () => { last = performance.now(); acc = 0 })

function frame(now: number): void {
  requestAnimationFrame(frame)                  // întâi cadrul următor: o excepție într-un cadru nu oprește bucla
  const frameDt = Math.min(0.1, Math.max(0, (now - last) / 1000))
  last = now
  let camDt = frameDt                           // cât timp „a trecut” pentru cameră
  if (phase === 'playing') {
    const r = advance(acc, frameDt)
    acc = r.acc
    for (let i = 0; i < r.steps; i++) step(s, input.read())
    camDt = r.steps * DT                        // camera se mișcă doar cu pașii simulării: eroul nu tremură pe ecrane de 120 Hz
    if (stress) {
      while (s.foes.length < STRESS_FOES) spawnFoe(s)   // zona de joc rămâne plină, nucleul și eroul nu cad
      s.core.hp = BALANCE.core.hp
      s.hero.dead = false; s.hero.hp = heroMaxHp(s)
      fpsFrames++; fpsTime += frameDt
      if (fpsTime >= FPS_WINDOW) {
        const now = Math.round(fpsFrames / fpsTime)
        fps = { now, min: fps === null ? now : Math.min(fps.min, now) }
        fpsFrames = 0; fpsTime = 0
      }
    }
  }
  if (phase === 'playing' && s.mode === 'over') {
    phase = 'over'
    input.release()
    const secs = Math.floor(s.t)
    cards.showOver({ secs, ...(stress ? { record: secs, isNew: false } : saveIfRecord(secs)), kills: s.kills })   // testul de viteză nu atinge recordul
  }
  renderer.frame(s, phase === 'playing' ? input.read() : still, phase === 'playing' ? input.stick : null, camDt)
  hud.sync(s, { hint: phase === 'playing' && !s.hero.moved, fps })
}
requestAnimationFrame(frame)
