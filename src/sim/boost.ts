// Întăririle din atelier la apărarea planetei. Le citesc doar din stare (`s.ups`, puse la `createGame`); fără ele, totul e ca azi.
import { BALANCE } from '../data/balance'
import { WORKSHOP } from '../data/workshop'
import type { GameState } from './state'

/**
 * Viața planetei, plină: cu Planeta, `BALANCE.core.hp` × (1 + `WORKSHOP.core.hp` × treapta), rotunjită la întreg
 * (altfel 400 × 1,1 dă 440,00000000000006, iar banda ar arăta 441). Pe treapta 0, exact `BALANCE.core.hp`.
 */
export function coreMaxHp(s: GameState): number {
  return Math.round(BALANCE.core.hp * (1 + WORKSHOP.core.hp * s.ups.core))
}

/** Cât se înmulțește lovitura navei (Unda, Laserul, Rachetele; nu și turelele), cu Armamentul. */
export function armsFactor(s: GameState): number {
  return 1 + WORKSHOP.arms.dmg * s.ups.arms
}

/** Cât se înmulțește distanța de la care nava strânge (cu și fără Magnet), cu Colectarea. */
export function reachFactor(s: GameState): number {
  return 1 + WORKSHOP.reach.reach * s.ups.reach
}

/** Viața în plus a navei, cu Carena. */
export function hullHp(s: GameState): number {
  return WORKSHOP.hull.hp * s.ups.hull
}
