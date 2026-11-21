// Un pas de zbor, de 1/60 s, în ordinea: ceasul, nava (condusul, Tunul), aparițiile, dușmanii, asteroizii,
// proiectilele Tunului, proiectilele dușmane, resursele, efectele, sfârșitul.
// După ce zborul s-a încheiat (`down` sau `explored`), pasul nu mai schimbă nimic.
import { FLIGHT } from '../data/flight'
import { spawnFlight, updateAsteroids, updateBolts, updateFoes, updateShots } from './foes'
import { driveShip, fireGun, updateDrops } from './ship'
import { DT, EPS, type FlightFx, type FlightInput, type FlightState } from './state'

/** Cât trăiește un efect, secunde. */
export function flightFxLife(e: FlightFx): number {
  switch (e.kind) {
    case 'puff': return FLIGHT.fx.puffLife
    case 'hurt': return FLIGHT.fx.hurtLife
    case 'down': return FLIGHT.fx.downLife
  }
}

export function stepFlight(f: FlightState, input: FlightInput): void {
  if (f.mode !== 'flying') return
  f.tick += 1
  f.t = f.tick * DT
  if (f.ship.inv > 0) f.ship.inv = Math.max(0, f.ship.inv - DT)
  driveShip(f, input)
  if (f.exploreAt < 0) fireGun(f)                     // după ce a căzut nava de elită, nava doar strânge
  spawnFlight(f)
  updateFoes(f)
  updateAsteroids(f)
  updateBolts(f)
  updateShots(f)
  updateDrops(f)
  f.fx = f.fx.filter((e) => f.t - e.t0 <= flightFxLife(e))   // efectele bătrâne dispar
  if (f.mode === 'flying' && f.exploreAt >= 0 && f.t + EPS >= f.exploreAt) f.mode = 'explored'
}
