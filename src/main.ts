// Prototipul 1, felia 1: valurile și inamicii pe drum, pe tick fix.
//
// Între valuri (pregătire) timpul stă pe loc și drumul se modelează:
//   mouse peste un hexagon de drum = alegi locul; ocolul înlocuiește o porțiune de 1–3 hexagoane din jurul lui;
//   1/2/3 = cu câte hexagoane se lungește drumul; Tab = următoarea variantă; Click = aplici ocolul;
//   Z = anulezi ultimul ocol (doar dacă e luat în pregătirea asta — timpul care a trecut nu se dă înapoi).
// Spațiu = pornește valul. În timpul valului: F = viteză 1×/2×/4×, P = pauză.
// R = aceeași hartă de la capăt. N = hartă nouă. Seed-ul se poate da în URL: ?seed=123
//
// Bucla: requestAnimationFrame adună timp real și rulează câte tick-uri fixe (TICK_MS) încap. Viteza din UI
// doar înmulțește timpul adunat — simularea nu știe de ea, deci un replay iese identic la orice viteză.

import { WAVES, describeWave } from './data/enemies'
import { TICK_MS, VIETI_BAZA, VITEZE_UI } from './data/joc'
import { draw, fitLayout, pixelToHex, type Layout } from './render/canvas'
import { applyDecision, fingerprint, newGame, replay, step, type GameState } from './sim/game'
import { key } from './sim/hex'
import { optionsAround, type DetourOption } from './sim/path'

const TOP_RESERVE = 110

const canvas = document.getElementById('joc') as HTMLCanvasElement
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

const params = new URLSearchParams(location.search)
let seed = Number(params.get('seed') ?? '2026') || 2026
let state: GameState = newGame(seed)
let extra = 2
let optionIndex = 0
let hovered: number | undefined
let options: DetourOption[] = []
let message: string | undefined
let layout: Layout = fitLayout(state.map.radius, innerWidth, innerHeight, TOP_RESERVE)

let vitezaIndex = 0
let paused = false
let acumulat = 0
let last = performance.now()

function resize(): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.floor(innerWidth * dpr)
  canvas.height = Math.floor(innerHeight * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  layout = fitLayout(state.map.radius, innerWidth, innerHeight, TOP_RESERVE)
  render()
}

function refreshOptions(): void {
  options = hovered === undefined ? [] : optionsAround(state.map, state.path, hovered, extra)
  if (optionIndex >= options.length) optionIndex = 0
}

function phaseLine(): string {
  const next = WAVES[state.val]
  switch (state.faza) {
    case 'pregatire':
      return `Urmează valul ${state.val + 1}: ${next ? describeWave(next) : '—'} · Spațiu = pornește valul · drumul se modelează acum: +${extra} (1/2/3) · ${options.length} variante (Tab) · Click · Z`
    case 'val':
      return `Valul ${state.val + 1} e pe drum: ${state.inamici.length} pe hartă, ${state.deGenerat.length} mai vin · F = viteză · P = pauză`
    case 'castigat':
      return `Ai apărat lumea: toate cele ${WAVES.length} valuri. R = din nou · N = hartă nouă`
    case 'pierdut':
      return `Baza a căzut în valul ${state.val + 1}. Turnurile vin în felia 2 — până atunci, drumul doar întârzie inamicii. R = din nou · N = hartă nouă`
  }
}

function render(): void {
  const chosen = state.faza === 'pregatire' ? options[optionIndex] : undefined
  const speed = VITEZE_UI[vitezaIndex] ?? 1
  draw(ctx, state, layout, {
    start: chosen?.start,
    span: chosen?.span,
    preview: chosen?.hexes,
    alpha: state.faza === 'val' && !paused ? Math.min(1, acumulat / TICK_MS) : 0,
    lines: [
      `World Guard — prototip · Val ${Math.min(state.val + 1, WAVES.length)}/${WAVES.length} · Vieți ${state.vieti}/${VIETI_BAZA} · drum ${state.path.length} hexagoane · ${speed}×${paused ? ' · PAUZĂ' : ''}`,
      phaseLine(),
      `seed ${seed} · tick ${state.tick} · ${state.jurnal.length} decizii · amprentă ${fingerprint(state)} · I = intrarea · B = baza · R = de la capăt · N = hartă nouă`,
    ],
    message,
  })
}

function restart(newSeed: number): void {
  seed = newSeed
  state = newGame(seed)
  hovered = undefined
  acumulat = 0
  paused = false
  refreshOptions()
}

function frame(now: number): void {
  const dt = Math.min(250, now - last)
  last = now
  if (state.faza === 'val' && !paused) {
    acumulat += dt * (VITEZE_UI[vitezaIndex] ?? 1)
    while (acumulat >= TICK_MS && state.faza === 'val') {
      state = step(state)
      acumulat -= TICK_MS
    }
    if (state.faza !== 'val') {
      // Valul s-a terminat (sau partida): timpul se oprește, drumul se poate modela din nou.
      // Un mesaj rămas din timpul valului nu mai e adevărat în faza nouă.
      acumulat = 0
      message = undefined
      refreshOptions()
    }
    render()
  }
  requestAnimationFrame(frame)
}

canvas.addEventListener('mousemove', (e) => {
  const h = pixelToHex(e.clientX, e.clientY, layout)
  const idx = state.path.findIndex((p) => key(p) === key(h))
  // Hexagonul de sub mouse face parte din porțiunea înlocuită; capetele fixe nu se pot înlocui.
  const next = idx > 0 && idx < state.path.length - 1 ? idx : undefined
  if (next !== hovered) {
    hovered = next
    optionIndex = 0
    refreshOptions()
    render()
  }
})

canvas.addEventListener('click', () => {
  if (hovered === undefined) return
  const chosen = options[optionIndex]
  if (!chosen) {
    message = `Nu există ocol de +${extra} aici (apă, filon, marginea hărții, sau drumul s-ar atinge singur). Încearcă alt număr sau alt loc.`
    render()
    return
  }
  // Refuzul (de ex. „doar între valuri”) vine din simulare, nu din UI: motivul e unul singur.
  const r = applyDecision(state, { tip: 'ocol', start: chosen.start, span: chosen.span, hexuri: chosen.hexes.map(key) })
  if (r.ok) {
    state = r.value
    message = undefined
  } else {
    message = `Nu se poate: ${r.reason}`
  }
  hovered = undefined
  refreshOptions()
  render()
})

window.addEventListener('keydown', (e) => {
  message = undefined
  if (e.key === ' ') {
    e.preventDefault()
    const r = applyDecision(state, { tip: 'pornesteVal' })
    if (r.ok) {
      state = r.value
      hovered = undefined
      acumulat = 0
      refreshOptions()
    } else {
      message = `Nu se poate: ${r.reason}`
    }
  } else if (e.key === 'f' || e.key === 'F') {
    vitezaIndex = (vitezaIndex + 1) % VITEZE_UI.length
  } else if (e.key === 'p' || e.key === 'P') {
    paused = !paused
  } else if (e.key === '1' || e.key === '2' || e.key === '3') {
    extra = Number(e.key)
    optionIndex = 0
    refreshOptions()
  } else if (e.key === 'Tab') {
    e.preventDefault()
    if (options.length > 0) optionIndex = (optionIndex + 1) % options.length
  } else if (e.key === 'z' || e.key === 'Z') {
    const lastDecision = state.jurnal.at(-1)
    if (state.faza === 'pregatire' && lastDecision?.d.tip === 'ocol' && lastDecision.la === state.tick) {
      state = replay(seed, state.jurnal.slice(0, -1), state.tick)
      hovered = undefined
      refreshOptions()
    } else {
      message = 'Nu e nimic de anulat: se anulează doar ocolurile din pregătirea curentă — un val jucat nu se dă înapoi.'
    }
  } else if (e.key === 'r' || e.key === 'R') {
    restart(seed)
  } else if (e.key === 'n' || e.key === 'N') {
    restart(seed + 1)
  } else {
    return
  }
  render()
})

window.addEventListener('resize', resize)
resize()
requestAnimationFrame(frame)
