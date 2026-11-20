// Ce citește desenul din stare: mărimi calculate pentru aspect, fără DOM și fără să scrie în stare.
import { BALANCE } from '../data/balance'
import { CORE } from '../data/layout'
import { nearestFoeWithin } from '../sim/combat'
import type { GameState, Pad, ResNode } from '../sim/state'

const TAU = Math.PI * 2

/** Unghiul țevii: spre cea mai apropiată navă vie aflată mai aproape decât bătaia turelei; fără țintă, dinspre nucleu în afară. */
export function turretAim(s: GameState, p: Pad): number {
  const f = nearestFoeWithin(s, p.bx, p.by, BALANCE.turret.range)
  return f ? Math.atan2(f.y - p.by, f.x - p.bx) : Math.atan2(p.by - CORE.y, p.bx - CORE.x)
}

/** Cât din inel e aprins, în radiani: 0 la viață zero sau sub, 2π la viață plină sau peste. */
export function shieldSpan(hp: number, max: number): number {
  if (hp <= 0) return 0
  return TAU * Math.min(1, hp / max)
}

/** Cât a crescut la loc o resursă golită, de la 0 la 1; 1 pentru una care nu e golită. */
export function regrown(n: ResNode, t: number): number {
  if (n.left > 0) return 1
  const g = 1 - (n.regrowAt - t) / BALANCE.node[n.type].regrow
  return g < 0 ? 0 : g > 1 ? 1 : g
}
