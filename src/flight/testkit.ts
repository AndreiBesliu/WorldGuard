// Ajutoare pentru testele zborului.
import { FLIGHT_MODS, type FlightFoeKind } from '../data/flight'
import type { Ups } from '../data/workshop'
import { makeFoe } from './foes'
import { hurtShip } from './ship'
import { createFlight, NEVER, type FlightFoe, type FlightInput, type FlightState } from './state'
import { stepFlight } from './step'

export const STILL: FlightInput = { dx: 0, dy: 0 }
const LATER = 1e9   // „niciodată” care trece prin JSON (Infinity n-ar trece)

/** Un zbor fără dușmani obișnuiți și fără asteroizi (nava de elită vine tot la 172,5 s; testele scurte nu ajung la ea). */
export function quietFlight(seed = 1, sector = 1, ups?: Ups): FlightState {
  const f = createFlight(seed, sector, ups)
  for (const k of Object.keys(f.next) as (keyof FlightState['next'])[]) f.next[k] = LATER
  return f
}

/** Pași de 1/60 s, cu aceeași comandă. */
export function flyFor(f: FlightState, seconds: number, input: FlightInput = STILL): void {
  const n = Math.round(seconds * 60)
  for (let i = 0; i < n; i++) stepFlight(f, input)
}

/** Nava nu mai poate fi lovită (cât ține testul). */
export function untouchable(f: FlightState): void {
  f.ship.inv = LATER
}

export function shipAt(f: FlightState, x: number, y: number): void {
  f.ship.x = x
  f.ship.y = y
}

/** Un dușman de felul dat în punctul dat; `over` îi schimbă câmpurile. */
export function addFoe(f: FlightState, kind: FlightFoeKind, x: number, y: number, over: Partial<FlightFoe> = {}): FlightFoe {
  const foe = makeFoe(f, kind, x)
  foe.y = y
  return Object.assign(foe, over)
}

/** Un proiectil dușman pe loc, în punctul dat. */
export function shotAt(f: FlightState, x: number, y: number): void {
  f.shots.push({ x, y, vx: 0, vy: 0 })
}

/**
 * Un zbor cu din toate, pentru desen: fiecare fel de dușman (cu nava de elită), toate modulele la treapta 3 cu Scutul încărcat,
 * proiectile dușmane și ale Tunului, o rachetă, asteroizi, cristale și metal, un lucru de cules de fiecare fel și câte un efect
 * de fiecare fel. Zborul nu se joacă așa: e o stare forțată, pentru desen.
 */
export function richFlight(): FlightState {
  const f = quietFlight(3)
  f.tick = 6000; f.t = 100
  for (const id of FLIGHT_MODS) f.ship.mods[id] = 3
  f.ship.shieldUp = true
  addFoe(f, 'drone', 60, 140)
  addFoe(f, 'weaver', 140, 170)
  addFoe(f, 'gunship', 250, 130, { hp: 30, hitT: f.t - 0.02 })
  addFoe(f, 'cargo', 330, 200)
  f.eliteId = addFoe(f, 'elite', 195, 80, { hp: 300 }).id
  shotAt(f, 120, 300); shotAt(f, 200, 320); shotAt(f, 280, 340)
  f.bolts.push({ x: 190, y: 400, vx: 0 }, { x: 200, y: 400, vx: 60 })
  f.missiles.push({ x: 220, y: 300, vx: 40, vy: -300, targetId: -1, dmg: 26 })
  f.asteroids.push({ x: 60, y: 380, vx: 5, vy: 60, r: 22, rot: 0.4, vr: 0.5, hp: 30, hitT: NEVER, shape: [1, 0.9, 1.05, 0.85, 1, 0.95, 0.8, 1.1] })
  f.drops.push({ kind: 'crystal', x: 100, y: 450 }, { kind: 'metal', x: 130, y: 460 })
  for (const [i, kind] of [...FLIGHT_MODS, 'repair' as const].entries()) f.picks.push({ kind, x: 40 + i * 60, y: 250 })
  const { x, y } = f.ship
  f.fx.push(
    { kind: 'puff', what: 'foe', r: 25, x: 80, y: 200, t0: f.t - 0.1 },
    { kind: 'puff', what: 'elite', r: 50, x: 195, y: 80, t0: f.t - 0.1 },
    { kind: 'puff', what: 'asteroid', r: 30, x: 60, y: 380, t0: f.t - 0.1 },
    { kind: 'puff', what: 'shot', r: 9, x: 200, y: 330, t0: f.t - 0.1 },
    { kind: 'hurt', x, y, t0: f.t - 0.1 },
    { kind: 'down', x, y, t0: f.t - 0.1 },
    { kind: 'beam', x1: x, y1: y - 14, x2: 140, y2: 170, t0: f.t - 0.05 },
    { kind: 'blast', x: 250, y: 130, r: 50, t0: f.t - 0.1 },
    { kind: 'block', x, y, t0: f.t - 0.1 },
    { kind: 'took', what: 'laser', tier: 3, maxed: false, t0: f.t - 0.1 },
  )
  return f
}

/** Un zbor încheiat cu nava doborâtă de cinci lovituri, fără Scut. */
export function downFlight(): FlightState {
  const f = quietFlight(4)
  flyFor(f, 1)
  for (let i = 0; i < 5; i++) { f.ship.inv = 0; hurtShip(f) }
  return f
}
