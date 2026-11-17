// Lumea: cercurile, nodurile, castelul, clădirile, dușmanii, eroul, săgețile și efectele.
// Citește starea; nu scrie nimic în ea.
import { BALANCE } from '../data/balance'
import { CASTLE, HOME, LOW_FRAC, PAD_R } from '../data/layout'
import { heroMaxHp } from '../sim/hero'
import { levelOf, nextCost } from '../sim/pads'
import type { Foe, Fx, GameState, Input, Pad, PadKind, ResNode, Res } from '../sim/state'
import { STR } from '../ui/strings'
import { alpha, FONT_UI, palette } from './palette'

/** Dreptunghiul de lume care se vede, în coordonate de lume. */
export interface Visible { l: number; t: number; r: number; b: number }
const CULL_MARGIN = 160      // cât din afara ecranului se desenează încă: etichete, umbre, săgeți, text care se ridică (prezentare)
const seen = (v: Visible, x: number, y: number): boolean =>
  x >= v.l - CULL_MARGIN && x <= v.r + CULL_MARGIN && y >= v.t - CULL_MARGIN && y <= v.b + CULL_MARGIN

const TAU = Math.PI * 2
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill()
}
function shade(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath(); ctx.ellipse(x, y, r * 1.05, r * 0.6, 0, 0, TAU); ctx.fillStyle = alpha(palette().night, 0.28); ctx.fill()
}
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, color: string): void {
  ctx.fillStyle = alpha(palette().night, 0.78); rr(ctx, x - 1, y - 1, w + 2, h + 2, (h + 2) / 2); ctx.fill()
  if (frac > 0) { ctx.fillStyle = color; rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); ctx.fill() }
}
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center'): void {
  ctx.font = `700 ${size}px ${FONT_UI}`; ctx.textAlign = align; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = alpha(palette().night, 0.72)
  ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y)
}
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, radii: readonly number[], R: number, rot: number, fill: string): void {
  ctx.beginPath()
  for (let i = 0; i < radii.length; i++) {
    const a = rot + (i / radii.length) * TAU
    const px = x + Math.cos(a) * (radii[i] ?? 1) * R
    const py = y + Math.sin(a) * (radii[i] ?? 1) * R * 0.86
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py)
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill()
}

function drawNode(ctx: CanvasRenderingContext2D, s: GameState, n: ResNode): void {
  const C = palette()
  const spec = BALANCE.node[n.type]
  const full = n.left / spec.amount
  const wob = s.t - n.shakeT < 0.18 ? Math.sin((s.t - n.shakeT) * 70) * 2 : 0
  if (n.type === 'wood') {
    if (n.left <= 0) {
      const grown = clamp(1 - (n.regrowAt - s.t) / spec.regrow, 0, 1)
      disc(ctx, n.x, n.y, 6, C.trunk); disc(ctx, n.x, n.y, 3.2, C.wood)
      if (grown > 0.45) disc(ctx, n.x, n.y - 4, (9 * (grown - 0.45)) / 0.55, C.pineLift)
      return
    }
    const R = 11 + 7 * full
    shade(ctx, n.x + 3, n.y + 7, R)
    disc(ctx, n.x + wob, n.y - 4, R, C.pine)
    disc(ctx, n.x + wob - R * 0.22, n.y - 4 - R * 0.26, R * 0.6, C.pineLift)
  } else {
    if (n.left <= 0) {
      disc(ctx, n.x - 5, n.y + 2, 3.5, C.rockShade); disc(ctx, n.x + 4, n.y + 4, 2.8, C.rockShade); disc(ctx, n.x + 1, n.y - 3, 2.4, C.rockShade)
      return
    }
    const R = 10 + 8 * full
    shade(ctx, n.x + 2, n.y + 6, R)
    blob(ctx, n.x + wob, n.y, n.shape, R, n.tilt, C.rockShade)
    blob(ctx, n.x + wob - 1.5, n.y - 2.5, n.shape, R * 0.72, n.tilt, C.rock)
  }
}

function drawCastle(ctx: CanvasRenderingContext2D, s: GameState): void {
  const C = palette()
  const { x: CX, y: CY, r: R } = CASTLE
  shade(ctx, CX + 5, CY + 12, R + 6)
  disc(ctx, CX, CY, R, C.stoneShade)
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU + 0.17; disc(ctx, CX + Math.cos(a) * (R - 6), CY + Math.sin(a) * (R - 6), 5.6, C.stone) }
  disc(ctx, CX, CY, R - 13, C.dirt)
  ctx.fillStyle = C.night; rr(ctx, CX - 9, CY + R - 17, 18, 18, 4); ctx.fill()
  disc(ctx, CX, CY - 1, 20, C.stoneShade); disc(ctx, CX, CY - 3, 15, C.stone)
  ctx.strokeStyle = C.night; ctx.lineWidth = 2; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(CX, CY - 3); ctx.lineTo(CX, CY - 36); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(CX, CY - 36); ctx.lineTo(CX + 17, CY - 30.5 + Math.sin(s.t * 4) * 1.4); ctx.lineTo(CX, CY - 25)
  ctx.closePath(); ctx.fillStyle = C.hero; ctx.fill()
  if (s.t - s.castle.hitT < 0.12) disc(ctx, CX, CY, R, alpha(C.ink, 0.35))
  const frac = s.castle.hp / BALANCE.castle.hp
  bar(ctx, CX - 40, CY - R - 18, 80, 7, frac, frac < LOW_FRAC ? C.foe : C.ink)
}

function drawBuilding(ctx: CanvasRenderingContext2D, s: GameState, p: Pad): void {
  const C = palette()
  const age = s.t - p.popT
  const grow = age < 0.25 ? 1 + Math.sin((age / 0.25) * Math.PI) * 0.22 : 1
  ctx.save(); ctx.translate(p.bx, p.by); ctx.scale(grow, grow)
  if (p.kind === 'tower') {
    shade(ctx, 3, 9, 15)
    disc(ctx, 0, 0, BALANCE.tower.r, C.stoneShade)
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; disc(ctx, Math.cos(a) * 11.5, Math.sin(a) * 11.5, 3.6, C.stone) }
    disc(ctx, 0, 0, 8.5, C.stone)
    ctx.font = `700 11px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.night; ctx.fillText(String(p.lvl), 0, 0.5)
  } else {
    const body = p.kind === 'camp' ? C.wood : C.stoneShade
    const trim = p.kind === 'camp' ? C.trunk : C.rockShade
    shade(ctx, 3, 12, 20)
    ctx.fillStyle = body; rr(ctx, -17, -13, 34, 26, 4); ctx.fill()
    ctx.fillStyle = trim; ctx.fillRect(-17, -3, 34, 6)
    if (p.kind === 'camp') { disc(ctx, 23, 8, 5, C.trunk); disc(ctx, 23, 8, 2.6, C.wood); disc(ctx, 29, 12, 4, C.trunk); disc(ctx, 29, 12, 2, C.wood) }
    else { disc(ctx, 23, 9, 5, C.rock); disc(ctx, 28, 13, 3.4, C.rockShade) }
    for (let i = 0; i < p.lvl; i++) disc(ctx, -7 + i * 7, -21, 2.4, C.ink)
  }
  ctx.restore()
}

function glyph(ctx: CanvasRenderingContext2D, kind: PadKind, x: number, y: number): void {
  ctx.strokeStyle = alpha(palette().ink, 0.85); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath()
  if (kind === 'tower') { ctx.arc(x, y, 7, 0, TAU); ctx.moveTo(x + 2, y); ctx.arc(x, y, 2, 0, TAU) }
  else if (kind === 'camp') { for (const dy of [-6, 0, 6]) { ctx.moveTo(x - 8, y + dy); ctx.lineTo(x + 8, y + dy) } }
  else if (kind === 'quarry') { ctx.moveTo(x, y - 8); ctx.lineTo(x + 9, y + 6); ctx.lineTo(x - 9, y + 6); ctx.closePath() }
  else if (kind === 'hero') { ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 9); ctx.moveTo(x - 6, y + 3); ctx.lineTo(x + 6, y + 3) }
  else { ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y) }
  ctx.stroke()
}

interface Part { res: Res; text: string; ok: boolean; w: number }

function chipLine(ctx: CanvasRenderingContext2D, parts: Part[], cx: number, y: number): void {
  const C = palette()
  const size = 14.5, gap = 12
  ctx.font = `700 ${size}px ${FONT_UI}`
  let total = (parts.length - 1) * gap
  for (const q of parts) { q.w = 15 + ctx.measureText(q.text).width; total += q.w }
  let x = cx - total / 2
  for (const q of parts) {
    ctx.fillStyle = q.res === 'wood' ? C.wood : C.rock; rr(ctx, x, y - 5, 10, 10, 2.5); ctx.fill()
    label(ctx, q.text, x + 15, y + 0.5, size, q.ok ? C.ink : C.inkSoft, 'left')
    x += q.w + gap
  }
}

function drawPad(ctx: CanvasRenderingContext2D, s: GameState, p: Pad): void {
  const C = palette()
  const h = s.hero, cost = nextCost(s, p), repair = p.kind === 'repair', maxed = !repair && !cost
  const on = !h.dead && Math.hypot(h.x - p.x, h.y - p.y) < PAD_R
  ctx.globalAlpha = maxed ? 0.4 : 1
  ctx.beginPath(); ctx.arc(p.x, p.y, PAD_R, 0, TAU)
  ctx.fillStyle = alpha(C.ink, on ? 0.2 : 0.08); ctx.fill()
  ctx.setLineDash([7, 6]); ctx.lineDashOffset = on ? -s.t * 28 : 0
  ctx.lineWidth = 2; ctx.strokeStyle = alpha(C.ink, 0.8); ctx.stroke(); ctx.setLineDash([])
  if (cost) {
    const paid = p.paid.wood + p.paid.stone
    if (paid > 0) {
      ctx.beginPath(); ctx.arc(p.x, p.y, PAD_R - 5, -Math.PI / 2, -Math.PI / 2 + (TAU * paid) / (cost.wood + cost.stone))
      ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = C.hero; ctx.stroke()
    }
  }
  glyph(ctx, p.kind, p.x, p.y)
  if (on && p.kind === 'tower') {
    ctx.beginPath(); ctx.arc(p.bx, p.by, BALANCE.tower.range, 0, TAU)
    ctx.setLineDash([4, 8]); ctx.lineWidth = 1.5; ctx.strokeStyle = alpha(C.ink, 0.3); ctx.stroke(); ctx.setLineDash([])
  }
  const lvl = levelOf(s, p), name = STR.pad[p.kind]
  const title = repair ? name : maxed ? STR.padMax(name) : lvl === 0 ? name : STR.padLevel(name, lvl + 1)
  label(ctx, title, p.x, p.y + PAD_R + 14, 13.5, C.ink)
  if (repair) chipLine(ctx, [{ res: 'stone', text: STR.repairCost(BALANCE.repair.heal), ok: s.stone > 0, w: 0 }], p.x, p.y + PAD_R + 33)
  else if (cost) {
    const parts: Part[] = []
    for (const res of ['wood', 'stone'] as const) {
      if (cost[res] > 0) { const left = cost[res] - p.paid[res]; parts.push({ res, text: String(left), ok: s[res] >= left, w: 0 }) }
    }
    chipLine(ctx, parts, p.x, p.y + PAD_R + 33)
  }
  ctx.globalAlpha = 1
}

function drawFoe(ctx: CanvasRenderingContext2D, s: GameState, f: Foe): void {
  const C = palette()
  shade(ctx, f.x + 2, f.y + 5, f.r)
  ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a)
  if (s.t - f.lungeT < 0.12) ctx.translate(4, 0)
  ctx.beginPath(); ctx.moveTo(f.r * 1.25, 0); ctx.lineTo(-f.r * 0.8, f.r * 0.95); ctx.lineTo(-f.r * 0.4, 0); ctx.lineTo(-f.r * 0.8, -f.r * 0.95); ctx.closePath()
  ctx.fillStyle = s.t - f.hitT < 0.08 ? C.ink : f.brute ? C.foeShade : C.foe; ctx.fill()
  if (f.brute) { ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = C.foe; ctx.stroke() }
  ctx.restore()
  if (f.hp < f.maxHp) bar(ctx, f.x - f.r, f.y - f.r - 9, f.r * 2, 3, f.hp / f.maxHp, C.foe)
}

function drawHero(ctx: CanvasRenderingContext2D, s: GameState, input: Input): void {
  const C = palette()
  const h = s.hero, R = BALANCE.hero.r
  const moving = Math.hypot(input.x, input.y) > BALANCE.hero.deadzone
  const bob = moving ? Math.abs(Math.sin(h.walk * 13)) * 2 : 0
  shade(ctx, h.x + 2, h.y + 7, R)
  const a = h.face, blade = R + 10 + 2 * (h.lvl - 1)
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.6; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(h.x + Math.cos(a) * R * 0.5, h.y - bob + Math.sin(a) * R * 0.5)
  ctx.lineTo(h.x + Math.cos(a) * blade, h.y - bob + Math.sin(a) * blade); ctx.stroke()
  disc(ctx, h.x, h.y - bob, R, s.t - h.hurtT < 0.1 ? C.ink : C.hero)
  ctx.lineWidth = 2.5; ctx.strokeStyle = C.heroShade; ctx.stroke()
  for (const sg of [-0.55, 0.55]) disc(ctx, h.x + Math.cos(a + sg) * 7, h.y - bob + Math.sin(a + sg) * 7, 2, C.night)
  const sa = s.t - h.slashT
  if (sa < 0.16) {
    ctx.globalAlpha = 1 - sa / 0.16
    ctx.beginPath(); ctx.arc(h.x, h.y, BALANCE.hero.reach * 0.8, h.slashA - BALANCE.hero.arc + sa * 5, h.slashA + BALANCE.hero.arc)
    ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.globalAlpha = 1
  }
  bar(ctx, h.x - 16, h.y - R - 13, 32, 4, h.hp / heroMaxHp(s), C.hero)
  for (let i = 1; i < h.lvl; i++) disc(ctx, h.x - (h.lvl - 2) * 3 + (i - 1) * 6, h.y - R - 20, 1.9, C.hero)
}

/** Cât se ridică textul peste punctul-ancoră al efectului (prezentare; simularea pune efectul chiar pe ancoră). */
function gainLift(s: GameState, fx: Extract<Fx, { kind: 'gain' }>): number {
  const atBuilding = s.pads.some((p) => (p.kind === 'camp' || p.kind === 'quarry') && p.bx === fx.x && p.by === fx.y)
  return atBuilding ? 28 : 20
}

function drawFx(ctx: CanvasRenderingContext2D, s: GameState, v: Visible): void {
  const C = palette()
  for (const f of s.fx) {
    if (!seen(v, f.x, f.y)) continue
    const age = s.t - f.t0
    if (f.kind === 'puff') {
      ctx.globalAlpha = 1 - age / BALANCE.fx.puffLife
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + age / BALANCE.fx.puffLife), 0, TAU)
      ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.stroke()
      continue
    }
    ctx.globalAlpha = clamp(1.6 - (age / BALANCE.fx.textLife) * 1.6, 0, 1)
    const rise = age * 30
    if (f.kind === 'gain') label(ctx, STR.gain, f.x, f.y - gainLift(s, f) - rise, 14, f.res === 'wood' ? C.wood : C.stone)
    else if (f.kind === 'level') label(ctx, STR.padLevel(STR.pad[f.what], f.lvl), f.x, f.y - (f.what === 'hero' ? 40 : 34) - rise, 14, C.hero)
    else label(ctx, STR.heroDown, f.x, f.y - 24 - rise, 14, C.foe)
  }
  ctx.globalAlpha = 1
}

/** Tot ce e în coordonate de lume, în ordinea prototipului: cercuri, apoi obiecte sortate după y, apoi săgeți și efecte. */
export function drawWorld(ctx: CanvasRenderingContext2D, s: GameState, input: Input, v: Visible): void {
  const C = palette()
  for (const p of s.pads) if (seen(v, p.x, p.y)) drawPad(ctx, s, p)

  const h = s.hero
  const items: { y: number; f: () => void }[] = [{ y: CASTLE.y + 20, f: () => drawCastle(ctx, s) }]
  for (const n of s.nodes) if (seen(v, n.x, n.y)) items.push({ y: n.y, f: () => drawNode(ctx, s, n) })
  for (const p of s.pads) if (p.lvl > 0 && p.kind !== 'hero' && seen(v, p.bx, p.by)) items.push({ y: p.by, f: () => drawBuilding(ctx, s, p) })
  for (const f of s.foes) if (seen(v, f.x, f.y)) items.push({ y: f.y, f: () => drawFoe(ctx, s, f) })
  if (!h.dead) items.push({ y: h.y, f: () => drawHero(ctx, s, input) })
  items.sort((a, b) => a.y - b.y)
  for (const it of items) it.f()

  if (h.dead) {
    ctx.beginPath(); ctx.arc(HOME.x, HOME.y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - h.respawnT / BALANCE.hero.respawn))
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = C.hero; ctx.stroke()
    label(ctx, String(Math.ceil(h.respawnT)), HOME.x, HOME.y + 0.5, 15, C.hero)
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
  for (const sh of s.shots) { if (!seen(v, sh.x, sh.y)) continue; ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - Math.cos(sh.a) * 11, sh.y - Math.sin(sh.a) * 11); ctx.stroke() }
  drawFx(ctx, s, v)
}
