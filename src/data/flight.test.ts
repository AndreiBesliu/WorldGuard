import { describe, expect, it } from 'vitest'
import { FLIGHT, sectorScale } from './flight'

describe('cifrele zborului', () => {
  it('câmpul, sectorul, nava de elită și prada', () => {
    expect(FLIGHT.field).toEqual({ w: 390, h: 680 })
    expect([FLIGHT.sectorSecs, FLIGHT.eliteDelay, FLIGHT.lootSecs]).toEqual([170, 2.5, 3.4])
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
