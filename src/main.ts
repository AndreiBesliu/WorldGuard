// Intrarea: pornește jocul și îl desenează. Intrarea de la utilizator, cartonașele și stocarea vin în Task 8.
import '@fontsource/alfa-slab-one/latin-400.css'
import '@fontsource/alfa-slab-one/latin-ext-400.css'
import '@fontsource/rubik/latin-400.css'
import '@fontsource/rubik/latin-ext-400.css'
import '@fontsource/rubik/latin-500.css'
import '@fontsource/rubik/latin-ext-500.css'
import '@fontsource/rubik/latin-700.css'
import '@fontsource/rubik/latin-ext-700.css'
import './ui/ui.css'
import { advance } from './app/loop'
import { createRenderer } from './render/canvas'
import { createGame } from './sim/state'
import { step } from './sim/step'
import { STR } from './ui/strings'

// Textele din pagină vin din STR: data-str = text, data-str-aria = eticheta de accesibilitate.
for (const el of document.querySelectorAll<HTMLElement>('[data-str]')) {
  const v = STR[el.dataset.str as keyof typeof STR]
  if (typeof v === 'string') el.textContent = v
}
for (const el of document.querySelectorAll<HTMLElement>('[data-str-aria]')) {
  const v = STR[el.dataset.strAria as keyof typeof STR]
  if (typeof v === 'string') el.setAttribute('aria-label', v)
}

const canvas = document.getElementById('field') as HTMLCanvasElement
const stage = document.getElementById('stage') as HTMLElement
const banner = document.getElementById('banner') as HTMLElement
const renderer = createRenderer(canvas)

function resize(): void {
  renderer.resize(banner.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top)
}
new ResizeObserver(resize).observe(stage)
resize()

const state = createGame(Date.now() >>> 0)
const still = { x: 0, y: 0 }
let acc = 0
let last = performance.now()

function frame(now: number): void {
  const frameDt = Math.min(0.1, Math.max(0, (now - last) / 1000))
  last = now
  const r = advance(acc, frameDt)
  acc = r.acc
  for (let i = 0; i < r.steps; i++) step(state, still)
  renderer.frame(state, still, null, frameDt)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
