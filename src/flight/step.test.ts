import { describe, expect, it } from 'vitest'
import { FLIGHT } from '../data/flight'
import { NO_UPS } from '../data/workshop'
import { createFlight, eliteOf, type FlightInput, type FlightState } from './state'
import { stepFlight } from './step'
import { STILL, untouchable } from './testkit'

/** O comandă care depinde doar de numărul pasului: nava se leagănă și urcă și coboară. */
const zigzag = (tick: number): FlightInput => ({ dx: Math.sin(tick / 23) * 7, dy: Math.cos(tick / 41) * 4 })

function fly(f: FlightState, steps: number, every = 0): FlightState {
  let g = f
  for (let i = 0; i < steps; i++) {
    if (every > 0 && i > 0 && i % every === 0) g = JSON.parse(JSON.stringify(g)) as FlightState
    stepFlight(g, zigzag(i))
  }
  return g
}

describe('pasul', () => {
  it('un pas înseamnă 1/60 s', () => {
    const f = createFlight(1, 1)
    stepFlight(f, STILL)
    expect([f.tick, f.t]).toEqual([1, 1 / 60])
  })
})

describe('determinismul', () => {
  /** Nava de neatins zboară toți cei 3000 de pași; cea obișnuită cade pe drum, deci prinde și loviturile și căderea. */
  const kinds = [['de neatins', true], ['obișnuită', false]] as const
  const start = (seed: number, safe: boolean): FlightState => { const f = createFlight(seed, 1); if (safe) untouchable(f); return f }

  for (const [name, safe] of kinds) {
    it(`aceeași sămânță și aceleași comenzi dau aceeași stare după 3000 de pași (nava ${name})`, () => {
      const a = fly(start(7, safe), 3000), b = fly(start(7, safe), 3000)
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
      expect(a.kills).toBeGreaterThan(0)
      if (safe) expect(a.tick).toBe(3000)
      else expect([a.mode, a.ship.hp]).toEqual(['down', 0])
      expect(JSON.stringify(fly(start(8, safe), 3000))).not.toBe(JSON.stringify(a))
    })
    it(`starea trecută prin JSON la fiecare 50 de pași continuă identic (nava ${name})`, () => {
      const direct = fly(start(7, safe), 3000), relay = fly(start(7, safe), 3000, 50)
      expect(JSON.stringify(relay)).toBe(JSON.stringify(direct))
    })
  }
  it('și în sectorul 3, cu întăriri, în lupta cu nava de elită', () => {
    const start = (): FlightState => {
      const f = createFlight(5, 3, { ...NO_UPS, hull: 4, arms: 5, reach: 3 })
      untouchable(f)
      return fly(f, 175 * 60)
    }
    const a = start()
    expect(eliteOf(a)).not.toBeNull()
    const direct = fly(a, 900), relay = fly(JSON.parse(JSON.stringify(start())) as FlightState, 900, 50)
    expect(JSON.stringify(relay)).toBe(JSON.stringify(direct))
  })
})

describe('un zbor întreg', () => {
  it('o navă care nu poate fi lovită și stă sub nava de elită explorează sectorul', () => {
    const f = createFlight(1, 1)
    untouchable(f)
    let elitePeak = 0
    while (f.mode === 'flying' && f.t < 400) {
      const e = eliteOf(f)
      if (e) elitePeak = Math.max(elitePeak, e.hp)
      const dx = e ? (e.x - f.ship.x) / 1.2 : Math.sin(f.tick / 50) * 6
      stepFlight(f, { dx, dy: 0 })
    }
    expect(f.mode).toBe('explored')
    expect(elitePeak).toBe(1400)
    expect(f.t).toBeGreaterThan(FLIGHT.sectorSecs + FLIGHT.eliteDelay + FLIGHT.lootSecs)
    expect(f.crystal).toBeGreaterThan(0)
    expect(f.fx.every((e) => f.t - e.t0 <= 1)).toBe(true)  // efectele îmbătrânite au ieșit din stare
  })
})
