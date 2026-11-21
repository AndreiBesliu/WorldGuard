// Ce se desenează în coordonate de ecran: indicatorul spre planetă și joystickul.
import { CORE } from '../data/layout'
import { coreMaxHp } from '../sim/boost'
import type { GameState } from '../sim/state'
import { STICK_R, type Stick } from '../input/joystick'
import type { Cam, View } from './camera'
import { disc, TAU } from './draw'
import { alpha, palette } from './palette'
import type { Skin } from './skin'

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)

export function drawOverlay(ctx: CanvasRenderingContext2D, s: GameState, cam: Cam, view: View, stick: Stick | null, skin: Skin): void {
  const C = palette()
  const { w, h: hgt, scale: sc } = view
  const left = cam.x - w / sc / 2, top = cam.y - hgt / sc / 2
  const sx = (CORE.x - left) * sc, sy = (CORE.y - top) * sc, topEdge = view.hudBottom + 30, m = 30
  if (sx < 0 || sx > w || sy < view.hudBottom || sy > hgt) {
    const px = clamp(sx, m, w - m), py = clamp(sy, topEdge, hgt - m), ang = Math.atan2(sy - py, sx - px)
    const hit = s.t - s.core.hitT < 1.2, tone = hit ? C.foe : C.ink
    const pulse = hit ? 1 + Math.sin(s.t * 14) * 0.12 : 1
    disc(ctx, px, py, 18 * pulse, alpha(C.night, 0.88))
    ctx.beginPath(); ctx.arc(px, py, 15 * pulse, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.001, s.core.hp / coreMaxHp(s)))
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = tone; ctx.stroke()
    skin.coreIcon(ctx, px, py, tone)
    ctx.fillStyle = tone
    ctx.beginPath(); ctx.moveTo(px + Math.cos(ang) * 29, py + Math.sin(ang) * 29)
    ctx.lineTo(px + Math.cos(ang + 0.42) * 21, py + Math.sin(ang + 0.42) * 21)
    ctx.lineTo(px + Math.cos(ang - 0.42) * 21, py + Math.sin(ang - 0.42) * 21); ctx.closePath(); ctx.fill()
  }
  if (stick && stick.on) {
    disc(ctx, stick.bx, stick.by, STICK_R, alpha(C.ink, 0.1))
    ctx.lineWidth = 2; ctx.strokeStyle = alpha(C.ink, 0.4); ctx.stroke()
    const dx = stick.x - stick.bx, dy = stick.y - stick.by, d = Math.hypot(dx, dy) || 1, k = Math.min(1, STICK_R / d)
    disc(ctx, stick.bx + dx * k, stick.by + dy * k, 20, alpha(C.ink, 0.55))
  }
}
