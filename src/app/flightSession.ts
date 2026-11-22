// Sesiunea unui zbor (pornire, pauză, sfârșit) și trecerea în rezervă a ce s-a strâns, exact o dată.
// Fără DOM și fără stocare: rezerva și sectorul explorat se scriu prin `FlightDeps`.
import type { FlightModId } from '../data/flight'
import type { Cost, Ups } from '../data/workshop'
import { createFlight, type FlightInput, type FlightState } from '../flight/state'
import { stepFlight } from '../flight/step'

export interface FlightDeps {
  ups(): Ups
  bank(haul: Cost): void
  explored(sector: number): void
}
export interface FlightOver {
  explored: boolean; sector: number; crystal: number; metal: number; kills: number; secs: number
  mods: Record<FlightModId, number>
}
export type FlightPhase = 'ready' | 'playing' | 'paused' | 'over'
export interface FlightSession {
  readonly phase: FlightPhase
  readonly f: FlightState
  start(seed: number, sector: number): void
  /** Trece în rezervă ce s-a strâns până acum; false dacă nu se zboară. */
  pause(): boolean
  unpause(): boolean
  /** Încheie din pauză zborul fără sector explorat (strânsul a trecut deja în rezervă); false în orice altă fază. */
  quit(): boolean
  /** Mișcarea merge întreagă la primul pas, ceilalți primesc (0, 0). */
  advance(steps: number, input: FlightInput): FlightOver | null
}

export function createFlightSession(deps: FlightDeps): FlightSession {
  let phase: FlightPhase = 'ready'
  let f: FlightState = createFlight(0, 1)       // până la primul `start`, un zbor care nu se joacă
  let bankedCrystal = 0, bankedMetal = 0        // cât din zborul curent a trecut deja în rezervă

  // Dă mai departe doar diferența; fără nimic nou nu cheamă `bank`.
  function flush(): void {
    const crystal = f.crystal - bankedCrystal, metal = f.metal - bankedMetal
    if (crystal === 0 && metal === 0) return
    bankedCrystal = f.crystal; bankedMetal = f.metal
    deps.bank({ crystal, metal })
  }

  return {
    get phase() { return phase },
    get f() { return f },
    start(seed, sector) {
      if (phase === 'playing') flush()          // un zbor în curs își trece întâi strânsul în rezervă
      f = createFlight(seed, sector, deps.ups())
      bankedCrystal = 0; bankedMetal = 0
      phase = 'playing'
    },
    pause() {
      if (phase !== 'playing') return false
      phase = 'paused'
      flush()
      return true
    },
    unpause() {
      if (phase !== 'paused') return false
      phase = 'playing'
      return true
    },
    quit() {
      if (phase !== 'paused') return false
      phase = 'ready'
      return true
    },
    advance(steps, input) {
      if (phase !== 'playing') return null
      for (let i = 0; i < steps && f.mode === 'flying'; i++) {
        stepFlight(f, i === 0 ? input : { dx: 0, dy: 0 })
      }
      if (f.mode === 'flying') return null
      phase = 'over'
      flush()
      const explored = f.mode === 'explored'
      if (explored) deps.explored(f.sector)
      return { explored, sector: f.sector, crystal: f.crystal, metal: f.metal, kills: f.kills, secs: Math.floor(f.t), mods: { ...f.ship.mods } }
    },
  }
}
