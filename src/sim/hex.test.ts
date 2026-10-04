import { describe, expect, it } from 'vitest'
import { areNeighbors, distance, hex, hexesInRadius, key, lineBetween, neighbors } from './hex'

describe('hex', () => {
  it('are 6 vecini, toți la distanța 1, toți diferiți', () => {
    const n = neighbors(hex(2, -1))
    expect(n).toHaveLength(6)
    expect(new Set(n.map(key)).size).toBe(6)
    for (const h of n) expect(distance(h, hex(2, -1))).toBe(1)
  })

  it('numără corect hexagoanele dintr-o rază (1 + 3r(r+1))', () => {
    for (const r of [0, 1, 2, 5, 9]) expect(hexesInRadius(r)).toHaveLength(1 + 3 * r * (r + 1))
  })

  it('linia dintre două hexagoane are capetele corecte și pași de câte un vecin', () => {
    const a = hex(-4, 1)
    const b = hex(3, -2)
    const line = lineBetween(a, b)
    expect(line).toHaveLength(distance(a, b) + 1)
    expect(key(line[0]!)).toBe(key(a))
    expect(key(line[line.length - 1]!)).toBe(key(b))
    for (let i = 0; i + 1 < line.length; i++) expect(areNeighbors(line[i]!, line[i + 1]!)).toBe(true)
  })

  it('nu produce chei „-0”', () => {
    for (const h of lineBetween(hex(-3, 0), hex(3, 0))) expect(key(h)).not.toMatch(/-0(,|$)/)
  })
})
