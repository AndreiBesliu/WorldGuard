// „Orbită”: cerul, planeta și inelul-scut. Singurul fișier al desenului cu gradient și decupaj:
// cerul se pictează o dată, iar planeta e una singură.
import { BALANCE } from '../../data/balance'
import { CORE, LAYOUT_SEED, LOW_FRAC, WORLD } from '../../data/layout'
import { createRng } from '../../sim/rng'
import type { GameState } from '../../sim/state'
import { shieldSpan } from '../derive'
import { blob, disc, TAU } from '../draw'
import { alpha, palette } from '../palette'

const SHIELD_GAP = 10        // cât de departe de marginea planetei stă inelul, px de lume (inelul e la CORE.r + 10)
const AURA = 34              // cât se întinde aura dincolo de marginea planetei, px
const HIT_FLASH = 0.12       // cât clipesc planeta și inelul după o lovitură, s

/** Continentele: pete cu formă neregulată, așezate față de centrul planetei. Fluxul lor e separat de al cerului. */
const LANDS = (() => {
  const rng = createRng(LAYOUT_SEED, 'continente')
  return ([[-22, -14, 24], [34, 20, 17], [-78, 24, 20], [84, -22, 22]] as const).map(([x, y, R]) => ({
    x, y, R, rot: rng.next() * TAU, shape: Array.from({ length: 8 }, () => 0.7 + rng.next() * 0.5),
  }))
})()

/** Cerul pe toată harta: gradient, nebuloase, stele, câteva sclipiri și marginea care se întunecă. */
export function paintSky(): HTMLCanvasElement {
  const C = palette()
  const { w: W, h: H } = WORLD
  const g = document.createElement('canvas')
  g.width = W; g.height = H
  const c = g.getContext('2d')
  if (!c) throw new Error('canvas 2D indisponibil')
  const rng = createRng(LAYOUT_SEED, 'cer')
  const r = (): number => rng.next()
  const sky = c.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, C.sky); sky.addColorStop(1, C.skyDeep)
  c.fillStyle = sky; c.fillRect(0, 0, W, H)
  const nebulae = [C.nebulaA, C.nebulaB, C.nebulaC, C.nebulaD]
  for (let i = 0; i < 12; i++) {
    const x = r() * W, y = r() * H, R = 180 + r() * 120, col = nebulae[i % 4] as string, a = 0.2 + r() * 0.22
    const ng = c.createRadialGradient(x, y, 0, x, y, R)
    ng.addColorStop(0, alpha(col, a)); ng.addColorStop(1, alpha(col, 0))
    c.fillStyle = ng; c.fillRect(x - R, y - R, 2 * R, 2 * R)
  }
  const stars = [C.star, C.starCool, C.starWarm]
  for (let i = 0; i < 1060; i++) {
    const x = r() * W, y = r() * H, size = 0.4 + r() * r() * 1.5
    c.globalAlpha = 0.25 + r() * 0.7
    disc(c, x, y, size, stars[i % 3] as string)
  }
  c.globalAlpha = 0.9; c.strokeStyle = C.star; c.lineWidth = 1; c.lineCap = 'round'
  for (let i = 0; i < 32; i++) {
    const x = r() * W, y = r() * H, size = 3 + r() * 3
    c.beginPath(); c.moveTo(x - size, y); c.lineTo(x + size, y); c.moveTo(x, y - size); c.lineTo(x, y + size); c.stroke()
    disc(c, x, y, 1.3, C.star)
  }
  c.globalAlpha = 1
  // marginea lumii, de unde vin navele: o bandă care se stinge în culoarea marginii
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

/** Planeta fără inel: aura, oceanul, continentele care alunecă, calota, norii, umbra, dunga de lumină și satelitul. */
export function core(ctx: CanvasRenderingContext2D, s: GameState): void {
  const C = palette()
  const { x, y, r } = CORE, t = s.t
  const aura = ctx.createRadialGradient(x, y, r - 4, x, y, r + AURA)
  aura.addColorStop(0, alpha(C.air, 0.5)); aura.addColorStop(1, alpha(C.air, 0))
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x, y, r + AURA, 0, TAU); ctx.fill()

  ctx.save()
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip()
  ctx.fillStyle = C.ocean; ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
  const W = 4 * r, d = (t * 2) % W
  for (const o of [d, d - W]) {
    for (const L of LANDS) {
      blob(ctx, x + L.x + o, y + L.y, L.shape, L.R, L.rot); ctx.fillStyle = C.land; ctx.fill()
      blob(ctx, x + L.x + o + 2, y + L.y + 3, L.shape, L.R * 0.62, L.rot); ctx.fillStyle = C.landShade; ctx.fill()
    }
  }
  ctx.fillStyle = alpha(C.ink, 0.85)
  ctx.beginPath(); ctx.ellipse(x, y - r + 2, 30, 9, 0, 0, TAU); ctx.fill()
  ctx.fillStyle = alpha(C.ink, 0.5)
  for (let i = 0; i < 3; i++) {
    const cx = x + ((t * 5 + i * 74) % W) - W / 2
    ctx.beginPath(); ctx.ellipse(cx, y + ([-26, 6, 30][i] as number), 22, 5, 0, 0, TAU); ctx.fill()
  }
  const dark = ctx.createLinearGradient(x - r * 0.6, y - r * 0.6, x + r * 0.8, y + r * 0.8)
  dark.addColorStop(0, alpha(C.night, 0)); dark.addColorStop(1, alpha(C.night, 0.6))
  ctx.fillStyle = dark; ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
  if (t - s.core.hitT < HIT_FLASH) { ctx.fillStyle = alpha(C.ink, 0.3); ctx.fillRect(x - r, y - r, 2 * r, 2 * r) }
  ctx.restore()

  ctx.beginPath(); ctx.arc(x, y, r - 1.5, Math.PI * 1.05, Math.PI * 1.6)
  ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
  const sa = t * 0.45
  disc(ctx, x + Math.cos(sa) * 73, y + Math.sin(sa) * 68, 3, C.hull)
}

/** Inelul-scut: un inel stins întreg și, peste el, partea aprinsă cât viața rămasă, pornind de sus. */
export function shield(ctx: CanvasRenderingContext2D, s: GameState): void {
  const C = palette()
  const { x, y, r } = CORE, R = r + SHIELD_GAP
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU)
  ctx.strokeStyle = alpha(C.shield, 0.18); ctx.lineWidth = 3; ctx.stroke()
  const span = shieldSpan(s.core.hp, BALANCE.core.hp)
  if (span <= 0) return
  ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + span)
  ctx.lineWidth = 3.4; ctx.lineCap = 'round'
  ctx.strokeStyle = s.core.hp / BALANCE.core.hp < LOW_FRAC ? C.foe : C.shield
  ctx.globalAlpha = 0.78 + 0.18 * Math.sin(s.t * 3); ctx.stroke(); ctx.globalAlpha = 1
  if (s.t - s.core.hitT < HIT_FLASH) { ctx.strokeStyle = alpha(C.ink, 0.6); ctx.stroke() }
}

/** Planeta în mic, pentru indicator: disc în culoarea dată, cu o dungă de lumină. */
export function coreIcon(ctx: CanvasRenderingContext2D, x: number, y: number, tone: string): void {
  disc(ctx, x, y, 7, tone)
  ctx.beginPath(); ctx.arc(x, y, 4.6, Math.PI * 1.05, Math.PI * 1.6)
  ctx.strokeStyle = alpha(palette().star, 0.8); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke()
}
