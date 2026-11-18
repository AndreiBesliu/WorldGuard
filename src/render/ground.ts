// Terenul, pictat o singură dată într-un canvas ascuns. Aleatoriul vine din fluxul 'iarba'.
import { CORE, LAYOUT_SEED, WORLD } from '../data/layout'
import { createRng } from '../sim/rng'
import { alpha, palette } from './palette'

const TAU = Math.PI * 2

export function makeGround(): HTMLCanvasElement {
  const C = palette()
  const { w: W, h: H } = WORLD
  const g = document.createElement('canvas')
  g.width = W; g.height = H
  const c = g.getContext('2d')
  if (!c) throw new Error('canvas 2D indisponibil')
  const rng = createRng(LAYOUT_SEED, 'iarba')
  const r = (): number => rng.next()
  c.fillStyle = C.ground; c.fillRect(0, 0, W, H)
  for (let i = 0; i < 240; i++) {
    c.globalAlpha = 0.3 + r() * 0.3
    c.fillStyle = r() < 0.5 ? C.groundLift : C.groundSink
    c.beginPath(); c.ellipse(r() * W, r() * H, 18 + r() * 46, 10 + r() * 26, r() * Math.PI, 0, TAU); c.fill()
  }
  c.globalAlpha = 1
  const worn = c.createRadialGradient(CORE.x, CORE.y, CORE.r, CORE.x, CORE.y, 200)
  worn.addColorStop(0, alpha(C.dirt, 0.8)); worn.addColorStop(1, alpha(C.dirt, 0))
  c.fillStyle = worn; c.beginPath(); c.arc(CORE.x, CORE.y, 200, 0, TAU); c.fill()
  c.strokeStyle = C.groundLift; c.lineWidth = 1.6; c.lineCap = 'round'; c.globalAlpha = 0.8
  for (let i = 0; i < 420; i++) {
    const x = r() * W, y = r() * H
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y - 6); c.moveTo(x + 3, y); c.lineTo(x + 4, y - 5); c.stroke()
  }
  c.globalAlpha = 1
  // linia de copaci întunecați din care ies dușmanii
  const band = 90
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [
    [0, 0, band, 0, 0, 0, band, H], [W, 0, W - band, 0, W - band, 0, band, H],
    [0, 0, 0, band, 0, 0, W, band], [0, H, 0, H - band, 0, H - band, W, band]] as const) {
    const gr = c.createLinearGradient(x0, y0, x1, y1)
    gr.addColorStop(0, alpha(C.edge, 0.95)); gr.addColorStop(1, alpha(C.edge, 0))
    c.fillStyle = gr; c.fillRect(rx, ry, rw, rh)
  }
  return g
}
