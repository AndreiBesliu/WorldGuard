// Cât aduce un zbor: o navă condusă de un script simplu, care se plimbă dintr-o parte în alta a câmpului, la înălțimea de
// pornire, nu poate fi lovită și culege ce întâlnește. Nu e un jucător automat și nu păzește nimic: dă cifra de pornire
// pentru prețurile atelierului. „Nu poate fi lovită” se face de aici (clipirea navei ținută sus la fiecare pas), nu prin
// vreo regulă din `src/flight/`.
import { FLIGHT } from '../data/flight'
import { shipBounds } from '../flight/ship'
import { createFlight, type FlightState } from '../flight/state'
import { stepFlight } from '../flight/step'

export const YIELD_SECTOR = 1
export const YIELD_SEEDS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Scriptul navei. Dacă se schimbă vreuna dintre cifrele de mai jos, se schimbă și cifra măsurată, tipărită de `npm run balance`.
const SWEEP = 7          // secunde pentru un drum dintr-o margine în cealaltă
const CAP = 600          // secunde: un zbor care nu s-a încheiat până atunci se oprește aici
const SAFE = 1e9         // clipirea navei, ținută sus

/** Un zbor întreg cu nava condusă de script, până se încheie (sau până la `CAP`). */
export function flyScripted(seed: number, sector: number): FlightState {
  const f = createFlight(seed, sector)
  const b = shipBounds(), mid = (b.x0 + b.x1) / 2, half = (b.x1 - b.x0) / 2
  while (f.mode === 'flying' && f.t < CAP) {
    f.ship.inv = SAFE
    const phase = (f.t / SWEEP) % 2                          // 0…2: dus și întors
    const want = mid + half * (phase < 1 ? 2 * phase - 1 : 3 - 2 * phase)
    stepFlight(f, { dx: (want - f.ship.x - f.ship.rx) / FLIGHT.drive.gain, dy: 0 })
  }
  return f
}

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/** Medianele cristalelor și metalului aduse de zborul condus de script, pe semințele date. */
export function flightYield(sector: number, seeds: readonly number[]): { crystal: number; metal: number } {
  const runs = seeds.map((seed) => flyScripted(seed, sector))
  return { crystal: median(runs.map((f) => f.crystal)), metal: median(runs.map((f) => f.metal)) }
}
