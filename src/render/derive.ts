// Ce citește desenul din stare: mărimi calculate pentru aspect, fără DOM și fără să scrie în stare.
import { BALANCE } from '../data/balance'
import { CORE } from '../data/layout'
import { nearestFoeWithin } from '../sim/combat'
import { modOf } from '../sim/mods'
import { EPS, type GameState, type Pad, type ResNode } from '../sim/state'

const TAU = Math.PI * 2
const BLAST_START = 0.3      // cât din zonă are explozia în primul ei cadru (prezentare)

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

/** Cât mai e dintr-un efect care se stinge: 1 la vârsta 0, 0 la capătul vieții și după. */
export function fade(age: number, life: number): number {
  const k = 1 - age / life
  return k < 0 ? 0 : k > 1 ? 1 : k
}

/** Scutul se vede încărcat: modulul e pe navă, ceasul lui a ajuns la zero și nava e vie. */
export function shieldReady(s: GameState): boolean {
  const m = modOf(s, 'shield')
  return !!m && m.t <= EPS && !s.hero.dead
}

/** Cât de tare clipește inelul scutului după cea mai nouă lovitură oprită: 1 chiar atunci, 0 la capătul duratei sau fără ea. */
export function blockGlow(s: GameState): number {
  let t0 = -Infinity
  for (const f of s.fx) if (f.kind === 'block' && f.t0 > t0) t0 = f.t0
  return t0 === -Infinity ? 0 : fade(s.t - t0, BALANCE.fx.blockLife)
}

/** Raza cercului exploziei la vârsta dată: pornește de la o treime din zonă și ajunge, încetinind, la zona întreagă. */
export function blastReach(r: number, age: number): number {
  const k = 1 - fade(age, BALANCE.fx.blastLife)
  return r * (BLAST_START + (1 - BLAST_START) * (1 - (1 - k) * (1 - k)))
}

/** Cât a crescut la loc o resursă golită, de la 0 la 1; 1 pentru una care nu e golită. */
export function regrown(n: ResNode, t: number): number {
  if (n.left > 0) return 1
  const g = 1 - (n.regrowAt - t) / BALANCE.node[n.type].regrow
  return g < 0 ? 0 : g > 1 ? 1 : g
}
