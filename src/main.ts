// Prototipul 1, felia 2: turnurile de bază și țintirea, peste valurile din felia 1.
//
// Mouse-ul face lucruri diferite după ce e sub el:
//   - un hexagon de drum (în pregătire) = ocol: 1/2/3 = cu cât se lungește drumul, Tab = următoarea variantă,
//     Click = aplici ocolul. Un ocol pe val, obligatoriu înainte de val; nu poate trece peste un turn;
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
import { REACTION_RULES, REACTIONS, STATES, TAG_NAMES, type ReactionType } from './data/reactions'
import { TERRAIN } from './data/terrain'
import { TARGET_MODES, TARGET_NAMES, TOWERS, TOWER_TYPES, type TowerType } from './data/towers'
import { draw, fitLayout, pixelToHex, type Layout, type Overlay } from './render/canvas'
import {
  applyDecision,
  checkBuild,
  checkDetourAllowed,
  checkStartWave,
  detourPossible,
  fingerprint,
  newGame,
  replay,
  step,
  towerCost,
  towerKeys,
  towerRange,
  type GameState,
  type Tower,
} from './sim/game'
import { key, type Hex } from './sim/hex'
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

// Reacțiile de pe hartă (doar desen): textele care urcă și se sting, și anunțul primei descoperiri, cu un scurt
// freeze-frame (GDD §6). Timpul de aici e al ecranului, nu al simulării — simularea nu știe de ele.
const POPUP_MS = 900
const BANNER_MS = 3200
const FREEZE_MS = 600
let popups: { text: string; culoare: string; progres: number; la: number }[] = []
let banner: { text: string; pana: number } | undefined
let freezeUntil = 0

function resize(): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.floor(innerWidth * dpr)
  canvas.height = Math.floor(innerHeight * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  layout = fitLayout(state.map.radius, innerWidth, innerHeight, TOP_RESERVE)
  render()
}

function refreshOptions(): void {
  // Turnurile blochează ocolurile, deci variantele care ar trece peste ele nici nu apar.
  options = hovered === undefined ? [] : optionsAround(state.map, state.path, hovered, extra, towerKeys(state))
  if (optionIndex >= options.length) optionIndex = 0
}

/**
 * Recalculează ce e sub mouse după orice schimbare (mișcare, decizie, Z, hartă nouă) și variantele de ocol.
 * Ecranul trebuie să arate mereu exact ce ar face un clic acolo.
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
      const done = `${state.ocoluriFolosite}/${state.ocoluriPeVal}`
      const ocol = !checkDetourAllowed(state).ok
        ? `ocolul acestui val e pus (${done})`
        : detourPossible(state)
          ? `ocol obligatoriu ${done}: +${extra} (1/2/3) · ${options.length} variante aici (Tab)`
          : 'niciun ocol nu mai încape pe hartă'
      const go = checkStartWave(state).ok ? 'Spațiu = pornește valul' : 'valul pornește după ocol'
      return `Urmează valul ${state.val + 1}: ${next ? describeWave(next) : '—'} · ${go} · ${ocol} · Z = anulează`
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
    const raza = towerRange(state, t.tip, t.hex)
    const tinta = info.zona ? 'lovește toți inamicii din rază' : `țintește: ${TARGET_NAMES[t.tintire]} · Click = schimbă ținta`
    return {
      text: `${info.nume} #${t.id} · daună ${info.dauna} · rază ${raza} · o lovitură la ${seconds(info.reincarcare)} · ${tinta} · ${reactionsOf(t.tip)}`,
      overlay: { range: { hex: hoverHex as Hex, raza, culoare: info.culoare } },
    }
  }
  if (hovered !== undefined) {
    // Pe drum: previzualizarea ocolului se desenează pe hartă; aici doar spunem când nu încape niciunul.
    const empty = checkDetourAllowed(state).ok && options.length === 0
    return {
      text: empty ? `Aici nu încape un ocol de +${extra}: apă, filon, un turn în cale, marginea hărții sau drumul s-ar atinge singur` : '',
      overlay: {},
    }
  }
  if (hoverHex === undefined || !state.map.terrain.has(key(hoverHex))) return { text: '', overlay: {} }
  if (state.path.some((h) => key(h) === key(hoverHex as Hex))) return { text: '', overlay: {} }
  const info = TOWERS[turnAles]
  const hex = key(hoverHex)
  const r = checkBuild(state, turnAles, hex)
  const raza = towerRange(state, turnAles, hex)
  const teren = state.map.terrain.get(hex)
  const deal = teren !== undefined && TERRAIN[teren].bonusRaza ? ` · pe ${TERRAIN[teren].nume.toLowerCase()}: rază +${TERRAIN[teren].bonusRaza}, +${TERRAIN[teren].costTurn ?? 0} aur` : ''
  return {
    text: r.ok
      ? `${info.nume} (${towerCost(state, turnAles, hex)} aur${deal}): ${info.descriere} · daună ${info.dauna}, rază ${raza}, o lovitură la ${seconds(info.reincarcare)} · ${reactionsOf(turnAles)} · Click = construiește`
      : `${info.nume} aici: nu se poate — ${r.reason}`,
    overlay: {
      ghost: { hex: hoverHex, tip: turnAles, ok: r.ok },
      range: r.ok ? { hex: hoverHex, raza, culoare: info.culoare } : undefined,
    },
  }
}

/** Ce lasă turnul pe inamic și în ce reacții intră — din date, ca să nu existe cifre ascunse. */
function reactionsOf(tip: TowerType): string {
  const info = TOWERS[tip]
  const seen = new Set<string>()
  const parts: string[] = []
  for (const r of REACTION_RULES) {
    const k = `${r.tip}/${r.eticheta}`
    if (r.element !== info.element || seen.has(k)) continue
    seen.add(k)
    parts.push(`${REACTIONS[r.tip].nume} pe ${TAG_NAMES[r.eticheta]}`)
  }
  const lasa = info.aplica ? `lasă: ${STATES[info.aplica].nume.toLowerCase()} ${seconds(STATES[info.aplica].durata)}` : ''
  return [lasa, parts.length ? `reacții: ${parts.join(', ')}` : ''].filter(Boolean).join(' · ')
}

/** Rezumatul reacțiilor din partida asta: „Îngheț 12 · Spargere 3”. */
function reactionSummary(): string {
  const parts = (Object.keys(REACTIONS) as ReactionType[]).filter((r) => (state.reactii[r] ?? 0) > 0).map((r) => `${REACTIONS[r].nume} ${state.reactii[r]}`)
  return parts.length ? ` · reacții: ${parts.join(' · ')}` : ''
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
    popups: popups.map((p) => ({ text: p.text, culoare: p.culoare, progres: p.progres, varsta: (performance.now() - p.la) / POPUP_MS })),
    banner: banner && performance.now() < banner.pana ? banner.text : undefined,
    lines: [
      `World Guard — prototip · Val ${Math.min(state.val + 1, WAVES.length)}/${WAVES.length} · Vieți ${state.vieti}/${VIETI_BAZA} · Aur ${state.aur} · drum ${state.path.length} hexagoane · ${speed}×${paused ? ' · PAUZĂ' : ''}`,
      phaseLine(),
      towerLine(),
      `seed ${seed} · tick ${state.tick} · ${state.jurnal.length} decizii · amprentă ${fingerprint(state)} · I/B = intrarea/baza${reactionSummary()}`,
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
  popups = []
  banner = undefined
  syncHover()
}

/** După un pas: reacțiile lui devin texte pe hartă, iar o reacție văzută prima dată în partidă — anunț + pauză scurtă. */
function noteReactions(before: GameState, now: number): void {
  for (const ev of state.evenimente) {
    popups.push({ text: REACTIONS[ev.tip].nume, culoare: REACTIONS[ev.tip].culoare, progres: ev.progres, la: now })
  }
  if (popups.length > 60) popups = popups.slice(-60)
  for (const r of Object.keys(REACTIONS) as ReactionType[]) {
    if ((before.reactii[r] ?? 0) === 0 && (state.reactii[r] ?? 0) > 0) {
      const rule = REACTION_RULES.find((x) => x.tip === r)
      const reteta = rule ? ` (${rule.element === 'apa' ? 'apă' : rule.element} pe ${TAG_NAMES[rule.eticheta]})` : ''
      banner = { text: `Reacție nouă: ${REACTIONS[r].nume}${reteta} — ${REACTIONS[r].efect}`, pana: now + BANNER_MS }
      freezeUntil = now + FREEZE_MS
    }
  }
}

function frame(now: number): void {
  const dt = Math.min(250, now - last)
  last = now
  popups = popups.filter((p) => now - p.la < POPUP_MS)
  if (state.faza === 'val' && !paused && now >= freezeUntil) {
    acumulat += dt * (VITEZE_UI[vitezaIndex] ?? 1)
    while (acumulat >= TICK_MS && state.faza === 'val' && now >= freezeUntil) {
      const before = state
      state = step(state)
      acumulat -= TICK_MS
      noteReactions(before, now)
    }
    if (state.faza !== 'val') {
      // Valul s-a terminat (sau partida): timpul se oprește, drumul se poate modela din nou.
      // Un mesaj rămas din timpul valului nu mai e adevărat în faza nouă.
      acumulat = 0
      message = undefined
      syncHover()
    }
    render()
  } else if (popups.length > 0 || (banner && now < banner.pana + 50)) {
    render() // freeze-frame, pauză sau pregătire: textele și anunțul se sting mai departe
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
      message = `Nu există ocol de +${extra} aici (apă, filon, un turn în cale, marginea hărții, sau drumul s-ar atinge singur). Încearcă alt număr sau alt loc.`
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
