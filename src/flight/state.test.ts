import { describe, expect, it } from 'vitest'
import { FLIGHT } from '../data/flight'
import { NO_UPS } from '../data/workshop'
import { createFlight, eliteOf, sectorProgress } from './state'
import { addFoe, quietFlight } from './testkit'

describe('starea zborului', () => {
  it('starea de pornire', () => {
    const f = createFlight(9, 2)
    expect(f).toMatchObject({ seed: 9, sector: 2, mode: 'flying', tick: 0, t: 0, crystal: 0, metal: 0, kills: 0, eliteId: -1 })
    expect(f.ups).toEqual(NO_UPS)
    expect(f.ship).toMatchObject({ x: FLIGHT.field.w / 2, y: FLIGHT.field.h * 0.8, hp: 5, maxHp: 5, inv: 0 })
    expect(f.ship.mods).toEqual({ gun: 1, laser: 0, missile: 0, shield: 0, magnet: 0 })
    expect([f.foes, f.shots, f.bolts, f.asteroids, f.drops, f.fx]).toEqual([[], [], [], [], [], []])
  })
  it('întăririle se țin în stare, ca o copie', () => {
    const ups = { ...NO_UPS, arms: 2 }
    const f = createFlight(1, 1, ups)
    expect(f.ups).toEqual(ups)
    expect(f.ups).not.toBe(ups)
  })
  it('drumul până la nava de elită: 0 la pornire, 1 când apare', () => {
    const f = createFlight(1, 1)
    expect(sectorProgress(f)).toBe(0)
    f.tick = 86.25 * 60; f.t = 86.25
    expect(sectorProgress(f)).toBeCloseTo(0.5, 9)
    f.tick = 300 * 60; f.t = 300
    expect(sectorProgress(f)).toBe(1)
  })
  it('nava de elită se găsește prin `eliteId`, nu printr-o referință', () => {
    const f = quietFlight()
    expect(eliteOf(f)).toBeNull()
    addFoe(f, 'drone', 50, 50)
    const elite = addFoe(f, 'elite', 195, 50)
    f.eliteId = elite.id
    expect(eliteOf(f)).toBe(elite)
    const copy = JSON.parse(JSON.stringify(f)) as typeof f
    expect(eliteOf(copy)).toEqual(elite)
    f.foes = f.foes.filter((foe) => foe !== elite)
    expect(eliteOf(f)).toBeNull()
  })
})
