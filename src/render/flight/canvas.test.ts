import { describe, expect, it } from 'vitest'
import { FLIGHT } from '../../data/flight'
import { fitField } from './canvas'

const { w: FW, h: FH } = FLIGHT.field

describe('câmpul pe ecran', () => {
  const inside = (w: number, h: number, band: number): void => {
    const k = fitField(w, h, band)
    expect(k.x).toBeGreaterThanOrEqual(-1e-9)
    expect(k.x + FW * k.scale).toBeLessThanOrEqual(w + 1e-9)
    expect(k.y).toBeGreaterThanOrEqual(band - 1e-9)                    // sub bandă
    expect(k.y + FH * k.scale).toBeCloseTo(h, 9)                       // lipit de marginea de jos
    // Scara cea mai mare la care încape: lipit de lături sau de bandă.
    expect(Math.min(k.x, k.y - band)).toBeCloseTo(0, 9)
  }
  it('încape întreg, sub bandă și lipit de jos, la 360 × 640, 390 × 780, 412 × 915 și pe un ecran culcat', () => {
    for (const [w, h] of [[360, 640], [390, 780], [412, 915], [900, 500]] as const) inside(w, h, 110)
  })
  it('pe un ecran înalt: lat cât ecranul, cu cer în plus deasupra', () => {
    const k = fitField(412, 915, 110)
    expect(k.scale).toBeCloseTo(412 / FW, 9)
    expect(k.x).toBeCloseTo(0, 9)
    expect(k.y).toBeGreaterThan(110)
  })
  it('pe un ecran scund: înalt cât e loc sub bandă, cu fâșii de cer în lături', () => {
    const k = fitField(360, 640, 110)
    expect(k.scale).toBeCloseTo(530 / FH, 9)
    expect(k.y).toBeCloseTo(110, 9)
    expect(k.x).toBeGreaterThan(0)
  })
  it('o mărime care nu e bună (zero, NaN, banda peste tot ecranul) dă scara 1', () => {
    for (const [w, h, b] of [[0, 0, 0], [NaN, 700, 100], [390, 100, 200]] as const) expect(fitField(w, h, b).scale).toBe(1)
    const k = fitField(390, 100, 200)
    expect([Number.isFinite(k.x), Number.isFinite(k.y)]).toEqual([true, true])
  })
})
