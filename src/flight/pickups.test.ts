import { describe, expect, it } from 'vitest'
import { FLIGHT, FLIGHT_MODS } from '../data/flight'
import { take } from './pickups'
import { createFlight, type FlightState } from './state'
import { stepFlight } from './step'
import { STILL, addFoe, quietFlight, untouchable } from './testkit'

const tookFx = (f: FlightState) => f.fx.filter((e) => e.kind === 'took')

describe('take', () => {
  for (const id of FLIGHT_MODS) {
    it(`${id}: fiecare culegere urcă o treaptă până la 3, apoi dă 5 cristale și treapta rămâne 3`, () => {
      const f = quietFlight()
      const from = f.ship.mods[id]
      for (let tier = from + 1; tier <= 3; tier++) {
        take(f, id)
        expect(f.ship.mods[id]).toBe(tier)
        expect(tookFx(f).at(-1)).toMatchObject({ what: id, tier, t0: f.t })
      }
      expect(f.crystal).toBe(0)
      take(f, id)
      expect(f.ship.mods[id]).toBe(3)
      expect(f.crystal).toBe(5)
      expect(tookFx(f).at(-1)).toMatchObject({ what: 'maxed', tier: 3 })
      take(f, id)
      expect(f.crystal).toBe(10)
    })
  }
  it('Scutul nou e încărcat din prima clipă', () => {
    const f = quietFlight()
    take(f, 'shield')
    expect(f.ship.shieldUp).toBe(true)
  })
  it('reparația dă o viață, fără să treacă de maxim', () => {
    const f = quietFlight()
    f.ship.hp = 3
    take(f, 'repair')
    expect(f.ship.hp).toBe(4)
    expect(tookFx(f).at(-1)).toMatchObject({ what: 'repair' })
    take(f, 'repair')
    expect(f.ship.hp).toBe(5)
  })
  it('reparația la viață plină nu schimbă nimic', () => {
    const f = quietFlight()
    const before = JSON.stringify(f)
    take(f, 'repair')
    expect(JSON.stringify(f)).toBe(before)
  })
})

describe('nava de transport', () => {
  /** Un transport doborât de un proiectil al Tunului, cu nava în starea dată. */
  const downCargo = (seed: number, set: (f: FlightState) => void = () => {}): FlightState => {
    const f = quietFlight(seed)
    set(f)
    addFoe(f, 'cargo', 100, 200, { hp: 0.1 })
    f.bolts.push({ x: 100, y: 200, vx: 0 })
    stepFlight(f, STILL)
    return f
  }
  it('doborât, lasă exact un lucru de cules, și nimic altceva', () => {
    const states: ((f: FlightState) => void)[] = [
      () => {},
      (f) => { f.ship.hp = 1 },
      (f) => { for (const id of FLIGHT_MODS) f.ship.mods[id] = 3 },
      (f) => { for (const id of FLIGHT_MODS) f.ship.mods[id] = 3; f.ship.hp = 2 },
    ]
    for (const set of states) {
      for (let seed = 1; seed <= 20; seed++) {
        const f = downCargo(seed, set)
        expect(f.foes).toEqual([])
        expect(f.picks).toHaveLength(1)
        expect(f.picks[0]!.x).toBe(100)
        expect(f.drops).toEqual([])
      }
    }
  })
  it('de cele mai multe ori lasă un modul pe care nava nu îl are; reparație doar când nava e lovită', () => {
    let fresh = 0, repairs = 0
    for (let seed = 1; seed <= 200; seed++) {
      const kind = downCargo(seed).picks[0]!.kind
      if (kind === 'repair') repairs++
      else if (kind !== 'gun') fresh++
    }
    expect(repairs).toBe(0)
    expect(fresh).toBeGreaterThan(130)
    let hurtRepairs = 0
    for (let seed = 1; seed <= 200; seed++) if (downCargo(seed, (f) => { f.ship.hp = 2 }).picks[0]!.kind === 'repair') hurtRepairs++
    expect(hurtRepairs).toBeGreaterThan(60)
    expect(hurtRepairs).toBeLessThan(140)
  })
  it('nu trage', () => {
    expect(FLIGHT.foes.cargo.fire).toBe(0)
    const f = quietFlight()
    untouchable(f)
    addFoe(f, 'cargo', 195, 100, { fireT: 0, hp: 1e6 })
    for (let i = 0; i < 300; i++) { stepFlight(f, STILL); expect(f.shots).toEqual([]) }
  })
  it('primul vine la secunda 5, apoi la 14–18 s', () => {
    const f = createFlight(2, 1)
    untouchable(f)
    const at: number[] = []
    let seen = 0
    while (f.t < 80) {
      stepFlight(f, STILL)
      for (const foe of f.foes) if (foe.id >= seen) { if (foe.kind === 'cargo') at.push(f.t); seen = foe.id + 1 }
    }
    expect(at[0]).toBeCloseTo(5, 1)
    expect(at.length).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < at.length; i++) {
      expect(at[i]! - at[i - 1]!).toBeGreaterThanOrEqual(14)
      expect(at[i]! - at[i - 1]!).toBeLessThanOrEqual(18 + 1 / 30)
    }
  })
})
