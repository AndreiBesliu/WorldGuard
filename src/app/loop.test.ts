import { describe, expect, it } from 'vitest'
import { advance } from './loop'

describe('bucla cu pas fix', () => {
  it('un cadru de 1/60 s dă un pas; restul rămâne în acumulator', () => {
    expect(advance(0, 1 / 60).steps).toBe(1)
    const a = advance(0, 0.008); expect(a).toEqual({ steps: 0, acc: 0.008 })
    expect(advance(a.acc, 0.009).steps).toBe(1)
  })
  it('cel mult 5 pași pe cadru, iar restul se aruncă: și după o secundă, și după zece minute', () => {
    expect(advance(0, 1)).toEqual({ steps: 5, acc: 0 })
    expect(advance(0, 600)).toEqual({ steps: 5, acc: 0 })
    expect(advance(0, -1)).toEqual({ steps: 0, acc: 0 })
    expect(advance(0, NaN)).toEqual({ steps: 0, acc: 0 })
  })
  it('zece secunde înseamnă 600 de pași la orice număr de cadre', () => {
    for (const fps of [30, 60, 90, 120, 144]) {
      let acc = 0, steps = 0
      for (let i = 0; i < fps * 10; i++) { const r = advance(acc, 1 / fps); acc = r.acc; steps += r.steps }
      expect(Math.abs(steps - 600)).toBeLessThanOrEqual(1)
    }
  })
})
