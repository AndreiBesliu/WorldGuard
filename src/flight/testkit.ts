// Ajutoare pentru testele zborului.
import type { FlightFoeKind } from '../data/flight'
import type { Ups } from '../data/workshop'
import { makeFoe } from './foes'
import { createFlight, type FlightFoe, type FlightInput, type FlightState } from './state'
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
