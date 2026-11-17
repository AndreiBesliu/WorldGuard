// Așezarea lumii: dimensiuni, castel, grupuri de resurse, cercuri de investit.
import type { PadKind } from '../sim/state'

export const WORLD = { w: 1100, h: 1500 }       // dimensiunile lumii, px
export const CASTLE = { x: 550, y: 750, r: 54 } // centrul și raza castelului, px
export const HOME = { x: 464, y: 756 }          // unde stă eroul la început și unde reapare
export const PAD_R = 28                          // raza unui cerc de investit, px
export const LAYOUT_SEED = 7                     // sămânța hărții: aceeași la orice partidă
export const NODE_GAP = 36                       // distanța minimă între două resurse, px

// Grupuri de resurse: tip, centru, număr de noduri, raza grupului (px).
export const CLUSTERS = [
  { type: 'wood', x: 300, y: 640, n: 6, rad: 62 }, { type: 'wood', x: 810, y: 900, n: 6, rad: 62 },
  { type: 'wood', x: 180, y: 230, n: 8, rad: 78 }, { type: 'wood', x: 420, y: 1300, n: 8, rad: 78 },
  { type: 'wood', x: 900, y: 330, n: 7, rad: 72 }, { type: 'stone', x: 560, y: 400, n: 4, rad: 50 },
  { type: 'stone', x: 980, y: 640, n: 5, rad: 56 }, { type: 'stone', x: 150, y: 1050, n: 6, rad: 62 },
  { type: 'stone', x: 900, y: 1330, n: 5, rad: 56 },
] as const

// Cercurile de investit: felul, centrul (x, y) și punctul de bază (bx, by) unde se desenează construcția.
export const PADS: readonly { kind: PadKind; x: number; y: number; bx: number; by: number }[] = [
  { kind: 'tower', x: 425, y: 669, bx: 425, by: 625 }, { kind: 'tower', x: 675, y: 669, bx: 675, by: 625 },
  { kind: 'tower', x: 425, y: 919, bx: 425, by: 875 }, { kind: 'tower', x: 675, y: 919, bx: 675, by: 875 },
  { kind: 'camp', x: 300, y: 776, bx: 300, by: 730 }, { kind: 'quarry', x: 650, y: 438, bx: 650, by: 392 },
  { kind: 'hero', x: 550, y: 600, bx: 550, by: 600 }, { kind: 'repair', x: 550, y: 850, bx: 550, by: 850 },
]
