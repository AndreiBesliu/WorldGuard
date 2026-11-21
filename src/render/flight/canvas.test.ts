import { describe, expect, it } from 'vitest'
import { FLIGHT } from '../../data/flight'
import { fitField } from './canvas'

const { w: FW, h: FH } = FLIGHT.field

describe('câmpul pe ecran', () => {
  const inside = (w: number, h: number, band: number): void => {
    const k = fitField(w, h, band)
    expect(k.x).toBeGreaterThanOrEqual(-1e-9)
    expect(k.x + FW * k.scale).toBeLessThanOrEqual(w + 1e-9)
    expect(k.y).toBeCloseTo(band, 9)                                   // lipit de bandă: dușmanii ies de sub ea
    expect(k.y + FH * k.scale).toBeLessThanOrEqual(h + 1e-9)           // întreg pe ecran
    // Scara cea mai mare la care încape: lipit de lături sau de marginea de jos.
    expect(Math.min(k.x, h - (k.y + FH * k.scale))).toBeCloseTo(0, 9)
  }
  it('încape întreg, lipit de bandă, la 360 × 640, 390 × 780, 412 × 892, 412 × 915 și pe un ecran culcat', () => {
    for (const [w, h] of [[360, 640], [390, 780], [412, 892], [412, 915], [900, 500]] as const) inside(w, h, 110)
  })
  it('pe un ecran înalt: lat cât ecranul, lipit de bandă, cu cer în plus dedesubt', () => {
    const k = fitField(412, 915, 110)
    expect(k.scale).toBeCloseTo(412 / FW, 9)
    expect(k.x).toBeCloseTo(0, 9)
    expect(k.y).toBeCloseTo(110, 9)
    expect(k.y + FH * k.scale).toBeLessThan(915 - 1)
  })
  it('pe un ecran scund: înalt cât e loc sub bandă, cu fâșii de cer în lături', () => {
    const k = fitField(360, 640, 110)
    expect(k.scale).toBeCloseTo(530 / FH, 9)
    expect(k.y).toBeCloseTo(110, 9)
    expect(k.y + FH * k.scale).toBeCloseTo(640, 9)
    expect(k.x).toBeGreaterThan(0)
  })
  it('o mărime care nu e bună (zero, NaN, banda peste tot ecranul) dă scara 1 și o așezare cu numere', () => {
    for (const [w, h, b] of [[0, 0, 0], [NaN, 700, 100], [390, 100, 200], [390, 700, NaN]] as const) {
      const k = fitField(w, h, b)
      expect(k.scale).toBe(1)
    }
    for (const [w, h, b] of [[390, 100, 200], [390, 700, NaN]] as const) {
      const k = fitField(w, h, b)
      expect([Number.isFinite(k.x), Number.isFinite(k.y)]).toEqual([true, true])
    }
  })
})
