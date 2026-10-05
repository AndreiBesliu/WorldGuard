import { describe, expect, it } from 'vitest'
import { INSERARE, MAP_GEN } from '../data/terrain'
import { newGame, fingerprint, pathContacts } from './game'
import { distance, fromKey, key, neighbors, type Hex } from './hex'
import { generateMap } from './map'
import { detourOptions, isValidPath } from './path'

/** Câte bălți (grupuri de hexagoane de ulei legate între ele) sunt. */
function oilPools(oil: readonly Hex[]): number {
  const left = new Set(oil.map(key))
  let pools = 0
  for (const h of oil) {
    if (!left.delete(key(h))) continue
    pools++
    const stack = [h]
    for (let c = stack.pop(); c; c = stack.pop()) for (const n of neighbors(c)) if (left.delete(key(n))) stack.push(n)
  }
  return pools
}

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
    expect([...seen].sort()).toEqual(['apa', 'campie', 'deal', 'filon', 'padure', 'ulei'])
  })

  it('uleiul: bălți mici, departe de drumul inițial, la un ocol distanță (decis de owner: uleiul se găsește pe hartă)', () => {
    let reachable = 0
    let separate = 0
    for (let seed = 0; seed < 200; seed++) {
      const s = newGame(seed)
      const oil = [...s.map.terrain].filter(([, t]) => t === 'ulei').map(([k]) => fromKey(k))
      expect(oil.length).toBeGreaterThanOrEqual(1)
      expect(oil.length).toBeLessThanOrEqual(MAP_GEN.balti * MAP_GEN.marimeBalta)
      for (const h of oil) expect(Math.min(...s.path.map((p) => distance(h, p)))).toBeGreaterThanOrEqual(MAP_GEN.departareBalta)
      // La început nimic nu e uns…
      expect(pathContacts(s).every((c) => c.every((x) => x.element !== 'ulei'))).toBe(true)
      // …dar un singur ocol poate duce drumul lângă ulei.
      let ok = false
      for (let span = 1; span <= INSERARE.portiuneMaxima && !ok; span++)
        for (let start = 0; start + span + 1 <= s.path.length - 1 && !ok; start++)
          for (let extra = INSERARE.minim; extra <= INSERARE.maxim && !ok; extra++)
            ok = detourOptions(s.map, s.path, start, span, extra).some((o) => o.some((h) => oil.some((x) => distance(x, h) === 1)))
      if (ok) reachable++
      if (oilPools(oil) === MAP_GEN.balti) separate++
    }
    // Bălțile stau departe una de alta (`intreBalti`), deci rămân separate. Măsurat (05.10.2026): 199 din 200.
    expect(separate).toBeGreaterThanOrEqual(195)
    // Măsurat (05.10.2026): 196 din 200.
    expect(reachable).toBeGreaterThanOrEqual(190)
  })
})
