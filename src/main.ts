// Prototipul 1, pasul 0: harta pe hexagoane și traseul cu capete fixe, lungit prin ocoluri.
//
// Mouse peste un hexagon de drum = alegi locul; ocolul înlocuiește o porțiune de 1–3 hexagoane din jurul lui.
// Tastele 1/2/3 = cu câte hexagoane se lungește drumul. Tab = următoarea variantă de ocol.
// Click = aplici ocolul. Z = anulezi ultima decizie (prin replay din jurnal). N = hartă nouă.
// Seed-ul se poate da în URL: ?seed=123

import { draw, fitLayout, pixelToHex, type Layout } from './render/canvas'
import { applyDecision, fingerprint, newGame, replay, type GameState } from './sim/game'
import { key } from './sim/hex'
import { optionsAround, type DetourOption } from './sim/path'

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
let layout: Layout = fitLayout(state.map.radius, innerWidth, innerHeight, 90)

function resize(): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.floor(innerWidth * dpr)
  canvas.height = Math.floor(innerHeight * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  layout = fitLayout(state.map.radius, innerWidth, innerHeight, 90)
  render()
}

function refreshOptions(): void {
  options = hovered === undefined ? [] : optionsAround(state.map, state.path, hovered, extra)
  if (optionIndex >= options.length) optionIndex = 0
}

function render(): void {
  const chosen = options[optionIndex]
  draw(ctx, state, layout, {
    start: chosen?.start,
    span: chosen?.span,
    preview: chosen?.hexes,
    lines: [
      `World Guard — prototip · seed ${seed} · drum ${state.path.length} hexagoane · ${state.jurnal.length} decizii · amprentă ${fingerprint(state)}`,
      `Bucată: +${extra} (tastele 1/2/3) · variante aici: ${options.length} (Tab) · Click = aplică · Z = anulează · N = hartă nouă`,
      'I = intrarea inamicilor · B = baza · capetele nu se mută; drumul se lungește prin ocoluri și nu are voie să se atingă singur',
    ],
    message,
  })
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
  if (e.key === '1' || e.key === '2' || e.key === '3') {
    extra = Number(e.key)
    optionIndex = 0
    refreshOptions()
  } else if (e.key === 'Tab') {
    e.preventDefault()
    if (options.length > 0) optionIndex = (optionIndex + 1) % options.length
  } else if (e.key === 'z' || e.key === 'Z') {
    state = replay(seed, state.jurnal.slice(0, -1))
    hovered = undefined
    refreshOptions()
  } else if (e.key === 'n' || e.key === 'N') {
    seed += 1
    state = newGame(seed)
    hovered = undefined
    refreshOptions()
  } else {
    return
  }
  message = undefined
  render()
})

window.addEventListener('resize', resize)
resize()
