// Desenarea pe Canvas 2D. Citește starea, nu o modifică.

import { ENEMIES, WAVES } from '../data/enemies'
import { MILI_HEX } from '../data/joc'
import { TERRAIN } from '../data/terrain'
import { TOWERS, type TowerInfo, type TowerType } from '../data/towers'
import { distance, fromKey, type Hex } from '../sim/hex'
import type { Enemy, GameState } from '../sim/game'

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
  /** Raza unui turn (cel de sub mouse sau cel care urmează să fie construit). */
  readonly range?: { readonly hex: Hex; readonly raza: number; readonly culoare: string }
  /** Turnul care s-ar construi aici, ca fantomă; `ok: false` = nu se poate (motivul e în text). */
  readonly ghost?: { readonly hex: Hex; readonly tip: TowerType; readonly ok: boolean }
  /** Turnurile pe care le-ar ridica ocolul previzualizat. */
  readonly removes?: readonly Hex[]
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath()
  ctx.moveTo(x - size * 0.4, y - size * 0.4)
  ctx.lineTo(x + size * 0.4, y + size * 0.4)
  ctx.moveTo(x + size * 0.4, y - size * 0.4)
  ctx.lineTo(x - size * 0.4, y + size * 0.4)
  ctx.strokeStyle = '#f0a35e'
  ctx.lineWidth = 3
  ctx.stroke()
}

function drawTower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, info: TowerInfo, alpha = 1): void {
  const r = size * 0.62
  ctx.globalAlpha = alpha
  ctx.beginPath()
  switch (info.forma) {
    case 'patrat':
      ctx.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6)
      break
    case 'triunghi':
      ctx.moveTo(x, y - r)
      ctx.lineTo(x + r * 0.9, y + r * 0.7)
      ctx.lineTo(x - r * 0.9, y + r * 0.7)
      ctx.closePath()
      break
    case 'cerc':
      ctx.arc(x, y, r * 0.85, 0, Math.PI * 2)
      break
    case 'romb':
      ctx.moveTo(x, y - r)
      ctx.lineTo(x + r * 0.8, y)
      ctx.lineTo(x, y + r)
      ctx.lineTo(x - r * 0.8, y)
      ctx.closePath()
      break
  }
  ctx.fillStyle = info.culoare
  ctx.fill()
  ctx.strokeStyle = '#12161c'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.globalAlpha = 1
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

  // Raza turnului de sub mouse (sau a celui de construit): hexagoanele acoperite, ușor luminate.
  if (o.range) {
    for (const k of s.map.terrain.keys()) {
      const h = fromKey(k)
      if (distance(h, o.range.hex) > o.range.raza) continue
      const { x, y } = hexToPixel(h, l)
      hexPath(ctx, x, y, l.size * 0.97)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)'
      ctx.fill()
      ctx.strokeStyle = o.range.culoare
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  // Turnurile
  for (const t of s.turnuri) {
    const { x, y } = hexToPixel(fromKey(t.hex), l)
    drawTower(ctx, x, y, l.size, TOWERS[t.tip])
  }
  if (o.ghost) {
    const { x, y } = hexToPixel(o.ghost.hex, l)
    drawTower(ctx, x, y, l.size, TOWERS[o.ghost.tip], o.ghost.ok ? 0.8 : 0.3)
    if (!o.ghost.ok) drawCross(ctx, x, y, l.size)
  }
  for (const h of o.removes ?? []) {
    const { x, y } = hexToPixel(h, l)
    drawCross(ctx, x, y, l.size)
  }

  // Inamicii: poziția se interpolează între centrele hexagoanelor de drum.
  const lastProgress = (s.path.length - 1) * MILI_HEX
  const pos = new Map<number, { x: number; y: number }>()
  const enemyPos = (e: Enemy): { x: number; y: number } | undefined => {
    const progres = Math.min(lastProgress, e.progres + ENEMIES[e.tip].viteza * (o.alpha ?? 0))
    const idx = Math.floor(progres / MILI_HEX)
    const frac = (progres % MILI_HEX) / MILI_HEX
    const from = s.path[idx]
    const to = s.path[idx + 1] ?? from
    if (!from || !to) return undefined
    const p0 = hexToPixel(from, l)
    const p1 = hexToPixel(to, l)
    return { x: p0.x + (p1.x - p0.x) * frac, y: p0.y + (p1.y - p0.y) * frac }
  }
  const waveHp = WAVES[s.val]?.viata ?? 1
  for (const e of s.inamici) {
    const p = enemyPos(e)
    if (!p) continue
    pos.set(e.id, p)
    const info = ENEMIES[e.tip]
    const radius = Math.max(3, l.size * info.marime)
    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = info.culoare
    ctx.fill()
    ctx.strokeStyle = e.tip === 'boss' ? '#ffffff' : 'rgba(0, 0, 0, 0.55)'
    ctx.lineWidth = e.tip === 'boss' ? 2 : 1
    ctx.stroke()
    // Bara de viață, doar după prima lovitură.
    const max = Math.round(info.viata * waveHp)
    if (e.viata < max) {
      const w = Math.max(14, radius * 2.2)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(p.x - w / 2, p.y - radius - 6, w, 3)
      ctx.fillStyle = '#7bd389'
      ctx.fillRect(p.x - w / 2, p.y - radius - 6, (w * Math.max(0, e.viata)) / max, 3)
    }
  }

  // Loviturile din ultimele două tick-uri: o linie spre țintă, sau un inel pentru turnul de zonă.
  for (const t of s.turnuri) {
    if (s.faza !== 'val' || !t.lovitura || s.tick - t.lovitura.tick > 1) continue
    const info = TOWERS[t.tip]
    const from = hexToPixel(fromKey(t.hex), l)
    ctx.strokeStyle = info.culoare
    if (info.zona) {
      ctx.beginPath()
      ctx.arc(from.x, from.y, l.size * (0.9 + info.raza * 1.2), 0, Math.PI * 2)
      ctx.lineWidth = 2
      ctx.stroke()
      continue
    }
    for (const id of t.lovitura.tinte) {
      const to = pos.get(id)
      if (!to) continue
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.lineWidth = 2
      ctx.stroke()
    }
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
