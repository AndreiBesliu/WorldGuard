// Așezarea lumii: dimensiuni, nucleu, grupuri de resurse, cercuri de investit.
import type { PadKind } from '../sim/state'

export const WORLD = { w: 1100, h: 1500 }       // dimensiunile lumii, px
export const VIEW_H = 880                        // înălțimea vederii de referință, px de lume: scara ecranului = max(înălțime / VIEW_H, lățime / WORLD.w)
export const LOW_FRAC = 0.35                     // sub atâta din viața nucleului, bara și inelul planetei se fac roșii (prezentare, într-un singur loc)
export const CORE = { x: 550, y: 750, r: 54 }   // centrul și raza nucleului, px
export const HOME = { x: 464, y: 756 }          // unde stă eroul la început și unde reapare
export const PAD_R = 28                          // raza unui cerc de investit, px
export const LAYOUT_SEED = 7                     // sămânța hărții: aceeași la orice partidă
export const NODE_GAP = 36                       // distanța minimă între două resurse, px

// Grupuri de resurse: tip, centru, număr de noduri, raza grupului (px).
export const CLUSTERS = [
  { type: 'crystal', x: 300, y: 640, n: 6, rad: 62 }, { type: 'crystal', x: 810, y: 900, n: 6, rad: 62 },
  { type: 'crystal', x: 180, y: 230, n: 8, rad: 78 }, { type: 'crystal', x: 420, y: 1300, n: 8, rad: 78 },
  { type: 'crystal', x: 900, y: 330, n: 7, rad: 72 }, { type: 'metal', x: 560, y: 400, n: 4, rad: 50 },
  { type: 'metal', x: 980, y: 640, n: 5, rad: 56 }, { type: 'metal', x: 150, y: 1050, n: 6, rad: 62 },
  { type: 'metal', x: 900, y: 1330, n: 5, rad: 56 },
] as const

// Cercurile de investit: felul, centrul (x, y) și punctul de bază (bx, by) unde se desenează construcția.
export const PADS: readonly { kind: PadKind; x: number; y: number; bx: number; by: number }[] = [
  { kind: 'turret', x: 425, y: 669, bx: 425, by: 625 }, { kind: 'turret', x: 675, y: 669, bx: 675, by: 625 },
  { kind: 'turret', x: 425, y: 919, bx: 425, by: 875 }, { kind: 'turret', x: 675, y: 919, bx: 675, by: 875 },
  { kind: 'collector', x: 300, y: 776, bx: 300, by: 730 }, { kind: 'mine', x: 650, y: 438, bx: 650, by: 392 },
  { kind: 'hero', x: 550, y: 600, bx: 550, by: 600 }, { kind: 'repair', x: 550, y: 850, bx: 550, by: 850 },
]
