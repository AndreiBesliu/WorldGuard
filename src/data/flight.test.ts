import { describe, expect, it } from 'vitest'
import { FLIGHT, FLIGHT_MODS, sectorScale } from './flight'

describe('cifrele zborului', () => {
  it('câmpul, sectorul, nava de elită și prada', () => {
    expect(FLIGHT.field).toEqual({ w: 390, h: 680 })
    expect([FLIGHT.sectorSecs, FLIGHT.eliteDelay, FLIGHT.lootSecs]).toEqual([170, 2.5, 3.4])
  })
  it('tiparul elitei, metalul asteroizilor și cine ține seama de distanța până la navă stau în date', () => {
    expect(FLIGHT.foes.elite.pattern).toEqual(['ring', 'burst', 'burst'])
    expect(FLIGHT.asteroid.metal).toEqual({ small: 1, big: 2 })
    const keeps = (['drone', 'weaver', 'gunship', 'cargo', 'elite'] as const).map((k) => FLIGHT.foes[k].keepsAway)
    expect(keeps).toEqual([true, true, false, false, false])
  })
  it('modulele din zbor: tabelul din spec, cu cele trei trepte', () => {
    const m = FLIGHT.mods
    expect(FLIGHT_MODS).toEqual(['gun', 'laser', 'missile', 'shield', 'magnet'])
    expect([m.tiers, m.maxed]).toEqual([3, 5])
    expect(FLIGHT.gun.volley.map((v) => (v.length === 0 ? 2 : v.length))).toEqual([2, 3, 5])
    expect([m.laser.every, m.laser.range, m.laser.dmg]).toEqual([0.9, 300, [14, 22, 32]])
    expect([m.missile.every, m.missile.blast, m.missile.dmg]).toEqual([2.4, 50, [12, 18, 26]])
    expect(m.shield.recharge).toEqual([6, 4.5, 3])
    expect([FLIGHT.drops.reach, m.magnet.reach]).toEqual([85, [45, 90, 135]])
    expect([FLIGHT.picks.fall, FLIGHT.picks.take]).toEqual([62, 27])
    expect([FLIGHT.spawn.cargo.first, FLIGHT.spawn.cargo.every, FLIGHT.spawn.cargo.every + FLIGHT.spawn.cargo.span]).toEqual([5, 14, 18])
  })
  it('sectorul 1 e cel din prototip: totul ×1', () => {
    expect(sectorScale(1)).toEqual({ hp: 1, pace: 1, elite: 1, loot: 1 })
  })
  it('sectoarele următoare: mai multă viață, mai des, elita mai tare, mai multă pradă', () => {
    const s3 = sectorScale(3)
    expect(s3.hp).toBeCloseTo(1.5, 9)
    expect(s3.pace).toBeCloseTo(0.94 ** 2, 9)
    expect(s3.elite).toBeCloseTo(1.7, 9)
    expect(s3.loot).toBeCloseTo(1.4, 9)
  })
  it('ritmul nu scade sub 0,6', () => {
    expect(sectorScale(9).pace).toBeCloseTo(0.94 ** 8, 9)
    expect(sectorScale(10).pace).toBe(0.6)
    expect(sectorScale(40).pace).toBe(0.6)
  })
})
