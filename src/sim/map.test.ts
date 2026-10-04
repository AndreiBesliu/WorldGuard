import { describe, expect, it } from 'vitest'
import { MAP_GEN } from '../data/terrain'
import { newGame, fingerprint } from './game'
import { key } from './hex'
import { generateMap } from './map'
import { isValidPath } from './path'

describe('generarea hărții', () => {
  it('e deterministă: același seed dă aceeași hartă', () => {
    expect(fingerprint(newGame(1234))).toBe(fingerprint(newGame(1234)))
  })

  it('seed-uri diferite dau hărți diferite', () => {
    expect(fingerprint(newGame(1))).not.toBe(fingerprint(newGame(2)))
  })

  it('acoperă exact hexagoanele din rază', () => {
    const { map } = generateMap(5)
    const r = MAP_GEN.raza
    expect(map.terrain.size).toBe(1 + 3 * r * (r + 1))
  })

  it('traseul inițial e valid și leagă intrarea de bază, pe 50 de seed-uri', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { map, path } = generateMap(seed)
      expect(isValidPath(map, path)).toEqual({ ok: true, value: true })
      expect(key(path[0]!)).toBe(key(map.spawn))
      expect(key(path[path.length - 1]!)).toBe(key(map.base))
    }
  })

  it('are toate tipurile de teren pe hărțile obișnuite (verificare de bun-simț pe 20 de seed-uri)', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 20; seed++) for (const t of generateMap(seed).map.terrain.values()) seen.add(t)
    expect([...seen].sort()).toEqual(['apa', 'campie', 'deal', 'filon', 'padure'])
  })
})
