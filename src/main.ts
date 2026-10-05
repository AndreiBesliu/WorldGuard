// Prototipul 1, felia 2: turnurile de bază și țintirea, peste valurile din felia 1.
//
// Mouse-ul face lucruri diferite după ce e sub el:
//   - un hexagon de drum (în pregătire) = ocol: 1/2/3 = cu cât se lungește drumul, Tab = următoarea variantă,
//     Click = aplici ocolul. Un ocol pe val; un turn aflat în calea lui se ridică și își dă aurul înapoi;
//   - un hexagon liber = turn: 4/5/6/7 = alegi turnul, Click = îl construiești (doar în pregătire);
//   - un turn = îi vezi raza și ținta, Click = schimbi ținta (și în timpul valului).
// Z = anulezi ultima decizie din pregătirea curentă (timpul care a trecut nu se dă înapoi).
// Spațiu = pornește valul. F = viteză 1×/2×/4×, P = pauză. R = aceeași hartă de la capăt. N = hartă nouă.
// Seed-ul se poate da în URL: ?seed=123
//
// Bucla: requestAnimationFrame adună timp real și rulează câte tick-uri fixe (TICK_MS) încap. Viteza din UI
// doar înmulțește timpul adunat — simularea nu știe de ea, deci un replay iese identic la orice viteză.

import { WAVES, describeWave } from './data/enemies'
import { TICK_MS, VIETI_BAZA, VITEZE_UI } from './data/joc'
import { TARGET_MODES, TARGET_NAMES, TOWERS, TOWER_TYPES, type TowerType } from './data/towers'
import { draw, fitLayout, pixelToHex, type Layout, type Overlay } from './render/canvas'
import {
  applyDecision,
  checkBuild,
  checkDetourAllowed,
  fingerprint,
  newGame,
  replay,
  step,
  towerRefund,
  towersOnHexes,
  type GameState,
  type Tower,
} from './sim/game'
import { fromKey, key, type Hex } from './sim/hex'
import { optionsAround, type DetourOption } from './sim/path'

const TOP_RESERVE = 140

const canvas = document.getElementById('joc') as HTMLCanvasElement
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

const params = new URLSearchParams(location.search)
let seed = Number(params.get('seed') ?? '2026') || 2026
let state: GameState = newGame(seed)
let extra = 2
let optionIndex = 0
let turnAles: TowerType = 'fizic'
/** Hexagonul de sub mouse (oricare), și — dacă e un hexagon de drum care se poate înlocui — indicele lui. */
let hoverHex: Hex | undefined
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

/**
 * Recalculează ce e sub mouse după orice schimbare (mișcare, decizie, Z, hartă nouă) și variantele de ocol.
 * Ecranul trebuie să arate mereu exact ce ar face un clic acolo — inclusiv turnurile pe care le-ar ridica.
 * Întoarce `true` dacă s-a schimbat hexagonul de drum de sub mouse.
 */
function syncHover(): boolean {
  const idx = hoverHex === undefined ? -1 : state.path.findIndex((p) => key(p) === key(hoverHex as Hex))
  // Hexagonul de sub mouse face parte din porțiunea înlocuită; capetele fixe nu se pot înlocui.
  const next = idx > 0 && idx < state.path.length - 1 ? idx : undefined
  const changed = next !== hovered
  if (changed) optionIndex = 0
  hovered = next
  refreshOptions()
  return changed
}

const towerAt = (h: Hex | undefined): Tower | undefined =>
  h === undefined ? undefined : state.turnuri.find((t) => t.hex === key(h))

const seconds = (ticks: number): string => `${((ticks * TICK_MS) / 1000).toFixed(1).replace('.', ',')} s`

function phaseLine(): string {
  const next = WAVES[state.val]
  switch (state.faza) {
    case 'pregatire': {
      const ocol = checkDetourAllowed(state).ok
        ? `ocol ${state.ocoluriFolosite}/${state.ocoluriPeVal}: +${extra} (1/2/3) · ${options.length} variante (Tab)`
        : `ocolul acestui val e pus (${state.ocoluriFolosite}/${state.ocoluriPeVal})`
      return `Urmează valul ${state.val + 1}: ${next ? describeWave(next) : '—'} · Spațiu = pornește valul · ${ocol} · Z = anulează`
    }
    case 'val':
      return `Valul ${state.val + 1} e pe drum: ${state.inamici.length} pe hartă, ${state.deGenerat.length} mai vin · F = viteză · P = pauză · Click pe turn = schimbă ținta`
    case 'castigat':
      return `Ai apărat lumea: toate cele ${WAVES.length} valuri, cu ${state.vieti} vieți rămase. R = din nou · N = hartă nouă`
    case 'pierdut':
      return `Baza a căzut în valul ${state.val + 1}. R = din nou · N = hartă nouă`
  }
}

function towerLine(): string {
  return `Turn: ${TOWER_TYPES.map((t, i) => `${t === turnAles ? '▶' : ''}[${i + 4}] ${TOWERS[t].nume} ${TOWERS[t].cost}`).join(' · ')}`
}

/** Rândul despre ce e sub mouse — ce face un clic acolo, sau de ce nu se poate. */
function hoverLine(): { text: string; overlay: Partial<Overlay> } {
  const t = towerAt(hoverHex)
  if (t) {
    const info = TOWERS[t.tip]
    const tinta = info.zona ? 'lovește toți inamicii din rază' : `țintește: ${TARGET_NAMES[t.tintire]} · Click = schimbă ținta`
    return {
      text: `${info.nume} #${t.id} · daună ${info.dauna} · rază ${info.raza} · o lovitură la ${seconds(info.reincarcare)} · ${tinta}`,
      overlay: { range: { hex: hoverHex as Hex, raza: info.raza, culoare: info.culoare } },
    }
  }
  if (hovered !== undefined) {
    // Pe drum: ce turnuri ar ridica ocolul ales (turnurile nu blochează drumul).
    const chosen = shownDetour()
    const lifted = chosen ? towersOnHexes(state, chosen.hexes) : []
    return {
      text: lifted.length
        ? `Ocolul ridică ${lifted.map((t) => `${TOWERS[t.tip].nume} #${t.id}`).join(', ')} și îți dă înapoi ${lifted.reduce((n, t) => n + towerRefund(t.tip), 0)} aur`
        : '',
      overlay: { removes: lifted.map((t) => fromKey(t.hex)) },
    }
  }
  if (hoverHex === undefined || !state.map.terrain.has(key(hoverHex))) return { text: '', overlay: {} }
  if (state.path.some((h) => key(h) === key(hoverHex as Hex))) return { text: '', overlay: {} }
  const info = TOWERS[turnAles]
  const r = checkBuild(state, turnAles, key(hoverHex))
  return {
    text: r.ok
      ? `${info.nume} (${info.cost} aur): ${info.descriere} · daună ${info.dauna}, rază ${info.raza}, o lovitură la ${seconds(info.reincarcare)} · Click = construiește`
      : `${info.nume} aici: nu se poate — ${r.reason}`,
    overlay: {
      ghost: { hex: hoverHex, tip: turnAles, ok: r.ok },
      range: r.ok ? { hex: hoverHex, raza: info.raza, culoare: info.culoare } : undefined,
    },
  }
}

/** Ocolul previzualizat: doar când se poate pune unul acum (în pregătire, sub limita pe val). */
const shownDetour = (): DetourOption | undefined => (checkDetourAllowed(state).ok ? options[optionIndex] : undefined)

function render(): void {
  const chosen = shownDetour()
  const speed = VITEZE_UI[vitezaIndex] ?? 1
  const hover = hoverLine()
  draw(ctx, state, layout, {
    start: chosen?.start,
    span: chosen?.span,
    preview: chosen?.hexes,
    alpha: state.faza === 'val' && !paused ? Math.min(1, acumulat / TICK_MS) : 0,
    ...hover.overlay,
    lines: [
      `World Guard — prototip · Val ${Math.min(state.val + 1, WAVES.length)}/${WAVES.length} · Vieți ${state.vieti}/${VIETI_BAZA} · Aur ${state.aur} · drum ${state.path.length} hexagoane · ${speed}×${paused ? ' · PAUZĂ' : ''}`,
      phaseLine(),
      towerLine(),
      `seed ${seed} · tick ${state.tick} · ${state.jurnal.length} decizii · amprentă ${fingerprint(state)} · I = intrarea · B = baza · R = de la capăt · N = hartă nouă`,
      hover.text,
    ],
    message,
  })
}

function restart(newSeed: number): void {
  seed = newSeed
  state = newGame(seed)
  acumulat = 0
  paused = false
  syncHover()
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
      syncHover()
    }
    render()
  }
  requestAnimationFrame(frame)
}

/** Aplică decizia; refuzul (cu motivul lui, venit din simulare) ajunge în mesaj. */
function decide(d: Parameters<typeof applyDecision>[1]): boolean {
  const r = applyDecision(state, d)
  if (r.ok) {
    state = r.value
    message = undefined
  } else {
    message = `Nu se poate: ${r.reason}`
  }
  return r.ok
}

canvas.addEventListener('mousemove', (e) => {
  const h = pixelToHex(e.clientX, e.clientY, layout)
  const moved = hoverHex === undefined || key(hoverHex) !== key(h)
  hoverHex = h
  if (moved) {
    syncHover()
    render()
  }
})

canvas.addEventListener('click', () => {
  const t = towerAt(hoverHex)
  if (t) {
    const i = TARGET_MODES.indexOf(t.tintire)
    decide({ tip: 'tintire', turn: t.id, mod: TARGET_MODES[(i + 1) % TARGET_MODES.length] ?? 'primul' })
  } else if (hovered !== undefined) {
    const allowed = checkDetourAllowed(state)
    const chosen = options[optionIndex]
    if (!allowed.ok) {
      message = `Nu se poate: ${allowed.reason}`
    } else if (!chosen) {
      message = `Nu există ocol de +${extra} aici (apă, filon, marginea hărții, sau drumul s-ar atinge singur). Încearcă alt număr sau alt loc.`
    } else {
      decide({ tip: 'ocol', start: chosen.start, span: chosen.span, hexuri: chosen.hexes.map(key) })
    }
  } else if (hoverHex !== undefined && state.map.terrain.has(key(hoverHex))) {
    decide({ tip: 'turn', turn: turnAles, hex: key(hoverHex) })
  }
  syncHover()
  render()
})

window.addEventListener('keydown', (e) => {
  message = undefined
  const towerKey = ['4', '5', '6', '7'].indexOf(e.key)
  if (e.key === ' ') {
    e.preventDefault()
    if (decide({ tip: 'pornesteVal' })) acumulat = 0
  } else if (e.key === 'f' || e.key === 'F') {
    vitezaIndex = (vitezaIndex + 1) % VITEZE_UI.length
  } else if (e.key === 'p' || e.key === 'P') {
    paused = !paused
  } else if (e.key === '1' || e.key === '2' || e.key === '3') {
    extra = Number(e.key)
    optionIndex = 0
  } else if (towerKey >= 0) {
    turnAles = TOWER_TYPES[towerKey] ?? turnAles
  } else if (e.key === 'Tab') {
    e.preventDefault()
    if (options.length > 0) optionIndex = (optionIndex + 1) % options.length
  } else if (e.key === 'z' || e.key === 'Z') {
    // Se anulează doar ce s-a hotărât în pregătirea curentă: o decizie luată la tick-ul de acum.
    const lastDecision = state.jurnal.at(-1)
    if (state.faza === 'pregatire' && lastDecision !== undefined && lastDecision.la === state.tick) {
      state = replay(seed, state.jurnal.slice(0, -1), state.tick)
    } else {
      message = 'Nu e nimic de anulat: se anulează doar deciziile din pregătirea curentă — un val jucat nu se dă înapoi.'
    }
  } else if (e.key === 'r' || e.key === 'R') {
    restart(seed)
  } else if (e.key === 'n' || e.key === 'N') {
    restart(seed + 1)
  } else {
    return
  }
  // După orice tastă (Z, Spațiu, R, N, 1/2/3), ce e sub mouse se recalculează pe starea nouă.
  syncHover()
  render()
})

// Doar în `npm run dev`: starea, citibilă din consolă sau din scripturile de verificare în browser.
// Vite scoate blocul din build-ul de producție.
if (import.meta.env.DEV) Object.assign(window, { wg: { get state(): GameState { return state } } })

window.addEventListener('resize', resize)
resize()
requestAnimationFrame(frame)
