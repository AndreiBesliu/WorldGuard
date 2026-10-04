import { describe, expect, it } from 'vitest'
import { createRng } from './rng'

const take = (seed: number, stream: string, n: number): number[] => {
  const r = createRng(seed, stream)
  return Array.from({ length: n }, () => r.next())
}

describe('rng', () => {
  it('același seed și același flux dau aceeași secvență', () => {
    expect(take(42, 'valuri', 50)).toEqual(take(42, 'valuri', 50))
  })

  it('fluxuri diferite dau secvențe diferite', () => {
    expect(take(42, 'valuri', 20)).not.toEqual(take(42, 'draft', 20))
  })

  it('seed-uri diferite dau secvențe diferite', () => {
    expect(take(1, 'harta', 20)).not.toEqual(take(2, 'harta', 20))
  })

  it('valorile sunt în [0, 1), iar int(n) în [0, n)', () => {
    const r = createRng(7, 'test')
    for (let i = 0; i < 10_000; i++) {
      const v = r.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      const k = r.int(6)
      expect(Number.isInteger(k) && k >= 0 && k < 6).toBe(true)
    }
  })
})
