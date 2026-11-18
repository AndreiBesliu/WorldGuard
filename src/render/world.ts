// Lumea: ordinea straturilor și ce e la fel în orice aspect (cercurile cu titlu și cost, barele, punctele de nivel,
// reapariția, textele plutitoare, norișorii). Formele le dă aspectul. Citește starea; nu scrie nimic în ea.
import { BALANCE } from '../data/balance'
import { CORE, HOME, PAD_R } from '../data/layout'
import { heroMaxHp } from '../sim/hero'
import { levelOf, nextCost } from '../sim/pads'
import type { Fx, GameState, Input, Pad, Res } from '../sim/state'
import { STR } from '../ui/strings'
import { rr, TAU } from './draw'
import { alpha, FONT_UI, palette } from './palette'
import type { Skin } from './skin'

/** Dreptunghiul de lume care se vede, în coordonate de lume. */
export interface Visible { l: number; t: number; r: number; b: number }
const CULL_MARGIN = 160      // cât din afara ecranului se desenează încă: etichete, aura planetei, raze, text care se ridică (prezentare)
const seen = (v: Visible, x: number, y: number): boolean =>
  x >= v.l - CULL_MARGIN && x <= v.r + CULL_MARGIN && y >= v.t - CULL_MARGIN && y <= v.b + CULL_MARGIN

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, color: string): void {
  ctx.fillStyle = alpha(palette().night, 0.78); rr(ctx, x - 1, y - 1, w + 2, h + 2, (h + 2) / 2); ctx.fill()
  if (frac > 0) { ctx.fillStyle = color; rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); ctx.fill() }
}
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center'): void {
  ctx.font = `700 ${size}px ${FONT_UI}`; ctx.textAlign = align; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = alpha(palette().night, 0.72)
  ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y)
}

interface Part { res: Res; text: string; ok: boolean; w: number }

function chipLine(ctx: CanvasRenderingContext2D, skin: Skin, parts: Part[], cx: number, y: number): void {
  const C = palette()
  const size = 14.5, gap = 12
  ctx.font = `700 ${size}px ${FONT_UI}`
  let total = (parts.length - 1) * gap
  for (const q of parts) { q.w = 16 + ctx.measureText(q.text).width; total += q.w }
  let x = cx - total / 2
  for (const q of parts) {
    skin.chip(ctx, q.res, x, y)
    label(ctx, q.text, x + 16, y + 0.5, size, q.ok ? C.ink : C.inkSoft, 'left')
    x += q.w + gap
  }
}

function drawPad(ctx: CanvasRenderingContext2D, s: GameState, p: Pad, skin: Skin): void {
  const C = palette()
  const h = s.hero, cost = nextCost(s, p), repair = p.kind === 'repair', maxed = !repair && !cost
  const on = !h.dead && Math.hypot(h.x - p.x, h.y - p.y) < PAD_R
  ctx.globalAlpha = maxed ? 0.4 : 1
  ctx.beginPath(); ctx.arc(p.x, p.y, PAD_R, 0, TAU)
  ctx.fillStyle = alpha(C.ink, on ? 0.2 : 0.08); ctx.fill()
  ctx.setLineDash([7, 6]); ctx.lineDashOffset = on ? -s.t * 28 : 0
  ctx.lineWidth = 2; ctx.lineCap = 'butt'; ctx.strokeStyle = alpha(C.ink, 0.8); ctx.stroke(); ctx.setLineDash([])
  if (cost) {
    const paid = p.paid.crystal + p.paid.metal
    if (paid > 0) {
      ctx.beginPath(); ctx.arc(p.x, p.y, PAD_R - 5, -Math.PI / 2, -Math.PI / 2 + (TAU * paid) / (cost.crystal + cost.metal))
      ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = C.hero; ctx.stroke()
    }
  }
  skin.glyph(ctx, p.kind, p.x, p.y)
  if (on && p.kind === 'turret') {
    ctx.beginPath(); ctx.arc(p.bx, p.by, BALANCE.turret.range, 0, TAU)
    ctx.setLineDash([4, 8]); ctx.lineWidth = 1.5; ctx.strokeStyle = alpha(C.ink, 0.3); ctx.stroke(); ctx.setLineDash([])
  }
  const lvl = levelOf(s, p), name = STR.pad[p.kind]
  const title = repair ? name : maxed ? STR.padMax(name) : lvl === 0 ? name : STR.padLevel(name, lvl + 1)
  label(ctx, title, p.x, p.y + PAD_R + 14, 13.5, C.ink)
  if (repair) chipLine(ctx, skin, [{ res: 'metal', text: STR.repairCost(BALANCE.repair.heal), ok: s.metal > 0, w: 0 }], p.x, p.y + PAD_R + 33)
  else if (cost) {
    const parts: Part[] = []
    for (const res of ['crystal', 'metal'] as const) {
      if (cost[res] > 0) { const left = cost[res] - p.paid[res]; parts.push({ res, text: String(left), ok: s[res] >= left, w: 0 }) }
    }
    chipLine(ctx, skin, parts, p.x, p.y + PAD_R + 33)
  }
  ctx.globalAlpha = 1
}

/** Bara de viață a navei tale și punctele ei de nivel, deasupra ei. */
function heroMarks(ctx: CanvasRenderingContext2D, s: GameState): void {
  const C = palette(), h = s.hero, R = BALANCE.hero.r
  bar(ctx, h.x - 16, h.y - R - 13, 32, 4, h.hp / heroMaxHp(s), C.hero)
  for (let i = 1; i < h.lvl; i++) {
    ctx.beginPath(); ctx.arc(h.x - (h.lvl - 2) * 3 + (i - 1) * 6, h.y - R - 20, 1.9, 0, TAU); ctx.fillStyle = C.hero; ctx.fill()
  }
}

/** Cât se ridică textul peste punctul-ancoră al efectului (prezentare; simularea pune efectul chiar pe ancoră). */
function gainLift(s: GameState, fx: Extract<Fx, { kind: 'gain' }>): number {
  const atBuilding = s.pads.some((p) => (p.kind === 'collector' || p.kind === 'mine') && p.bx === fx.x && p.by === fx.y)
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
    if (f.kind === 'gain') label(ctx, STR.gain, f.x, f.y - gainLift(s, f) - rise, 14, f.res === 'crystal' ? C.crystal : C.metal)
    else if (f.kind === 'level') label(ctx, STR.padLevel(STR.pad[f.what], f.lvl), f.x, f.y - (f.what === 'hero' ? 40 : 34) - rise, 14, C.hero)
    else label(ctx, STR.heroDown, f.x, f.y - 24 - rise, 14, C.foe)
  }
  ctx.globalAlpha = 1
}

/**
 * Tot ce e în coordonate de lume, în straturi: cercurile; nucleul; resursele, clădirile și navele, sortate după y,
 * fiecare cu bara ei; inelul-scut, peste nave; apoi reapariția, razele și textele plutitoare.
 */
export function drawWorld(ctx: CanvasRenderingContext2D, s: GameState, input: Input, v: Visible, skin: Skin): void {
  const C = palette()
  for (const p of s.pads) if (seen(v, p.x, p.y)) drawPad(ctx, s, p, skin)

  const coreSeen = seen(v, CORE.x, CORE.y)
  if (coreSeen) skin.core(ctx, s)

  const h = s.hero
  const items: { y: number; f: () => void }[] = []
  for (const n of s.nodes) if (seen(v, n.x, n.y)) items.push({ y: n.y, f: () => skin.node(ctx, s, n) })
  for (const p of s.pads) if (p.lvl > 0 && p.kind !== 'hero' && seen(v, p.bx, p.by)) items.push({ y: p.by, f: () => skin.building(ctx, s, p) })
  for (const f of s.foes) {
    if (!seen(v, f.x, f.y)) continue
    items.push({
      y: f.y,
      f: () => {
        skin.foe(ctx, s, f)
        if (f.hp < f.maxHp) bar(ctx, f.x - f.r, f.y - f.r - 9, f.r * 2, 3, f.hp / f.maxHp, C.foe)
      },
    })
  }
  if (!h.dead) items.push({ y: h.y, f: () => { skin.hero(ctx, s, input); heroMarks(ctx, s) } })
  items.sort((a, b) => a.y - b.y)
  for (const it of items) it.f()

  if (coreSeen) skin.shield(ctx, s)

  if (h.dead) {
    ctx.beginPath(); ctx.arc(HOME.x, HOME.y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - h.respawnT / BALANCE.hero.respawn))
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = C.hero; ctx.stroke()
    label(ctx, String(Math.ceil(h.respawnT)), HOME.x, HOME.y + 0.5, 15, C.hero)
  }
  for (const sh of s.shots) if (seen(v, sh.x, sh.y)) skin.shot(ctx, sh)
  drawFx(ctx, s, v)
}
