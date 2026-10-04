// Desenarea pe Canvas 2D. Citește starea, nu o modifică.

import { ENEMIES } from '../data/enemies'
import { MILI_HEX } from '../data/joc'
import { TERRAIN } from '../data/terrain'
import { type Hex } from '../sim/hex'
import type { GameState } from '../sim/game'

const SQRT3 = Math.sqrt(3)

export interface Layout {
  /** Raza unui hexagon, în pixeli CSS. */
  readonly size: number
  readonly originX: number
  readonly originY: number
}

/** Hexagoanele „pointy-top” încap pe ecran, centrate. */
export function fitLayout(radius: number, width: number, height: number, topReserve: number): Layout {
  const usableH = height - topReserve
  const sizeByW = width / (SQRT3 * (2 * radius + 1) + 2)
  const sizeByH = usableH / (1.5 * (2 * radius) + 2 + 1)
  const size = Math.max(6, Math.min(sizeByW, sizeByH))
  return { size, originX: width / 2, originY: topReserve + usableH / 2 }
}

export function hexToPixel(h: Hex, l: Layout): { x: number; y: number } {
  return {
    x: l.originX + l.size * SQRT3 * (h.q + h.r / 2),
    y: l.originY + l.size * 1.5 * h.r,
  }
}

export function pixelToHex(x: number, y: number, l: Layout): Hex {
  const px = (x - l.originX) / l.size
  const py = (y - l.originY) / l.size
  const qf = (SQRT3 / 3) * px - (1 / 3) * py
  const rf = (2 / 3) * py
  // rotunjire în coordonate cubice
  const sf = -qf - rf
  let q = Math.round(qf)
  let r = Math.round(rf)
  const s = Math.round(sf)
  const dq = Math.abs(q - qf)
  const dr = Math.abs(r - rf)
  const ds = Math.abs(s - sf)
  if (dq > dr && dq > ds) q = -r - s
  else if (dr > ds) r = -q - s
  return { q: q + 0, r: r + 0 }
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    const x = cx + size * Math.cos(a)
    const y = cy + size * Math.sin(a)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

export interface Overlay {
  /** Porțiunea de drum aleasă: ocolul pornește din path[start] și înlocuiește `span` hexagoane. */
  readonly start?: number
  readonly span?: number
  /** Ocolul propus, desenat ca fantomă. */
  readonly preview?: readonly Hex[]
  readonly lines: readonly string[]
  readonly message?: string
  /**
   * Cât din tick-ul următor a trecut deja (0..1). Doar desenul îl folosește, ca mișcarea să fie lină între
   * două tick-uri; simularea rămâne pe pas fix.
   */
  readonly alpha?: number
}

export function draw(ctx: CanvasRenderingContext2D, s: GameState, l: Layout, o: Overlay): void {
  const { width, height } = ctx.canvas.getBoundingClientRect()
  ctx.fillStyle = '#12161c'
  ctx.fillRect(0, 0, width, height)

  // Terenul
  for (const [k, t] of s.map.terrain) {
    const [q, r] = k.split(',').map(Number) as [number, number]
    const { x, y } = hexToPixel({ q, r }, l)
    hexPath(ctx, x, y, l.size * 0.97)
    ctx.fillStyle = TERRAIN[t].culoare
    ctx.fill()
  }

  // Traseul: hexagoane deschise la culoare + linia prin centre, ca să se vadă ordinea.
  for (const h of s.path) {
    const { x, y } = hexToPixel(h, l)
    hexPath(ctx, x, y, l.size * 0.97)
    ctx.fillStyle = '#d9c7a0'
    ctx.fill()
  }
  if (o.start !== undefined && o.span !== undefined) {
    // Capetele ocolului: conturul galben. Porțiunea care dispare: hașurată.
    for (const i of [o.start, o.start + o.span + 1]) {
      const h = s.path[i]
      if (!h) continue
      const { x, y } = hexToPixel(h, l)
      hexPath(ctx, x, y, l.size * 0.97)
      ctx.strokeStyle = '#f5d76e'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    for (let i = o.start + 1; i <= o.start + o.span; i++) {
      const h = s.path[i]
      if (!h || !o.preview) continue
      const { x, y } = hexToPixel(h, l)
      hexPath(ctx, x, y, l.size * 0.97)
      ctx.fillStyle = 'rgba(18, 22, 28, 0.55)'
      ctx.fill()
    }
  }
  ctx.beginPath()
  s.path.forEach((h, i) => {
    const { x, y } = hexToPixel(h, l)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = '#6b5232'
  ctx.lineWidth = Math.max(2, l.size * 0.18)
  ctx.lineJoin = 'round'
  ctx.stroke()

  // Ocolul propus
  if (o.preview && o.preview.length > 0 && o.start !== undefined && o.span !== undefined) {
    const a = s.path[o.start]
    const b = s.path[o.start + o.span + 1]
    for (const h of o.preview) {
      const { x, y } = hexToPixel(h, l)
      hexPath(ctx, x, y, l.size * 0.97)
      ctx.fillStyle = 'rgba(245, 215, 110, 0.55)'
      ctx.fill()
    }
    if (a && b) {
      ctx.beginPath()
      ;[a, ...o.preview, b].forEach((h, i) => {
        const { x, y } = hexToPixel(h, l)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.setLineDash([6, 5])
      ctx.strokeStyle = '#f5d76e'
      ctx.lineWidth = Math.max(2, l.size * 0.12)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // Inamicii: poziția se interpolează între centrele hexagoanelor de drum.
  const lastProgress = (s.path.length - 1) * MILI_HEX
  for (const e of s.inamici) {
    const progres = Math.min(lastProgress, e.progres + ENEMIES[e.tip].viteza * (o.alpha ?? 0))
    const idx = Math.floor(progres / MILI_HEX)
    const frac = (progres % MILI_HEX) / MILI_HEX
    const from = s.path[idx]
    const to = s.path[idx + 1] ?? from
    if (!from || !to) continue
    const p0 = hexToPixel(from, l)
    const p1 = hexToPixel(to, l)
    const x = p0.x + (p1.x - p0.x) * frac
    const y = p0.y + (p1.y - p0.y) * frac
    const info = ENEMIES[e.tip]
    ctx.beginPath()
    ctx.arc(x, y, Math.max(3, l.size * info.marime), 0, Math.PI * 2)
    ctx.fillStyle = info.culoare
    ctx.fill()
    ctx.strokeStyle = e.tip === 'boss' ? '#ffffff' : 'rgba(0, 0, 0, 0.55)'
    ctx.lineWidth = e.tip === 'boss' ? 2 : 1
    ctx.stroke()
  }

  // Capetele fixe
  const mark = (h: Hex, color: string, label: string): void => {
    const { x, y } = hexToPixel(h, l)
    ctx.beginPath()
    ctx.arc(x, y, l.size * 0.55, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.max(10, l.size * 0.55)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x, y)
  }
  mark(s.map.spawn, '#b03a2e', 'I')
  mark(s.map.base, '#2e6fb0', 'B')

  // Textul de sus
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = '15px system-ui, sans-serif'
  o.lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? '#ffffff' : '#c9c5bf'
    ctx.fillText(line, 16, 12 + i * 20)
  })
  if (o.message) {
    ctx.fillStyle = '#f0a35e'
    ctx.fillText(o.message, 16, 12 + o.lines.length * 20 + 4)
  }
}
