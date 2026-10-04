import { describe, expect, it } from 'vitest'
import { TERRAIN } from '../data/terrain'
import { areNeighbors, equals, key, type Hex } from './hex'
import { generateMap, type GameMap } from './map'
import { detourOptions, insertDetour, isValidPath, optionsAround } from './path'
import { createRng } from './rng'

/** O hartă mică, toată câmpie, cu drumul drept pe rândul din mijloc — teren controlat pentru teste. */
function flatMap(radius = 5): { map: GameMap; path: Hex[] } {
  const { map, path } = generateMap(1, radius)
  const terrain = new Map([...map.terrain.keys()].map((k) => [k, 'campie' as const]))
  return { map: { ...map, terrain }, path: [...path] }
}

describe('ocolurile', () => {
  it('pe un drum drept există ocoluri de +1, +2 și +3, iar fiecare lungește drumul exact cu atât', () => {
    const { map, path } = flatMap()
    const middle = Math.floor(path.length / 2)
    for (const extra of [1, 2, 3]) {
      const opts = optionsAround(map, path, middle, extra)
      expect(opts.length, `+${extra}`).toBeGreaterThan(0)
      for (const o of opts) {
        const r = insertDetour(map, path, o.start, o.span, o.hexes)
        expect(r.ok).toBe(true)
        if (r.ok) {
          expect(r.value).toHaveLength(path.length + extra)
          expect(isValidPath(map, r.value)).toEqual({ ok: true, value: true })
        }
      }
    }
  })

  it('măsurătoarea din spatele lui portiuneMaxima: pe drum drept, un ocol de +k cere o porțiune de cel puțin k', () => {
    const { map, path } = flatMap()
    for (const span of [1, 2, 3]) {
      for (const extra of [1, 2, 3]) {
        const n = detourOptions(map, path, 3, span, extra).length
        if (extra <= span) expect(n, `porțiune ${span}, +${extra}`).toBeGreaterThan(0)
        else expect(n, `porțiune ${span}, +${extra}`).toBe(0)
      }
    }
  })

  it('după 60 de ocoluri alese la întâmplare, pe 10 hărți: capetele stau fixe și drumul nu se atinge singur', () => {
    const perSeed: number[] = []
    for (let seed = 0; seed < 10; seed++) {
      const gen = generateMap(seed)
      const map = gen.map
      let path = [...gen.path]
      const pick = createRng(seed, 'test/ocoluri')
      let applied = 0
      for (let step = 0; step < 60; step++) {
        const index = 1 + pick.int(path.length - 2)
        const opts = optionsAround(map, path, index, 1 + pick.int(3))
        if (opts.length === 0) continue
        const o = pick.pick(opts)
        const r = insertDetour(map, path, o.start, o.span, o.hexes)
        expect(r.ok).toBe(true)
        if (!r.ok) continue
        path = r.value
        applied++
        expect(equals(path[0]!, map.spawn)).toBe(true)
        expect(equals(path[path.length - 1]!, map.base)).toBe(true)
        expect(isValidPath(map, path)).toEqual({ ok: true, value: true })
      }
      // Măsurat 04.10.2026 pe 40 de seed-uri: din 60 de încercări reușesc min 5, mediana 24, max 35.
      // Dacă un seed coboară sub 3, mecanica a devenit prea strânsă ca să fie joc.
      expect(applied, `seed ${seed}`).toBeGreaterThanOrEqual(3)
      perSeed.push(applied)
    }
    perSeed.sort((x, y) => x - y)
    expect(perSeed[Math.floor(perSeed.length / 2)], 'mediana pe 10 hărți').toBeGreaterThanOrEqual(15)
  })

  it('nicio variantă propusă nu pune drum pe apă sau pe filon', () => {
    const { map, path } = generateMap(7)
    for (let index = 1; index < path.length - 1; index++) {
      for (const extra of [1, 2, 3]) {
        for (const o of optionsAround(map, path, index, extra)) {
          for (const h of o.hexes) expect(TERRAIN[map.terrain.get(key(h))!].permiteTraseu).toBe(true)
          expect(areNeighbors(path[o.start]!, o.hexes[0]!)).toBe(true)
          expect(areNeighbors(o.hexes[o.hexes.length - 1]!, path[o.start + o.span + 1]!)).toBe(true)
          expect(o.hexes).toHaveLength(o.span + extra)
        }
      }
    }
  })

  it('refuză, cu motiv, un ocol pe apă', () => {
    const { map, path } = flatMap()
    const opt = detourOptions(map, path, 2, 3, 1)[0]!
    const wet: GameMap = { ...map, terrain: new Map(map.terrain).set(key(opt[0]!), 'apa') }
    expect(insertDetour(wet, path, 2, 3, opt)).toEqual({ ok: false, reason: 'pe apă nu se poate construi drum' })
  })

  it('refuză un ocol care atinge drumul de lângă el', () => {
    const { map, path } = flatMap()
    // Hexagonul de dedesubtul lui path[1]: vecin cu path[0], care rămâne pe drum.
    const bad: Hex = { q: path[1]!.q, r: 1 }
    const r = insertDetour(map, path, 2, 1, [bad, { q: path[3]!.q - 1, r: 1 }])
    expect(r.ok).toBe(false)
  })

  it('refuză un ocol care nu lungește drumul sau îl lungește prea mult', () => {
    const { map, path } = flatMap()
    expect(insertDetour(map, path, 2, 1, [path[3]!]).ok).toBe(false)
    const opt = detourOptions(map, path, 2, 3, 3)[0]!
    expect(opt).toHaveLength(6)
    expect(insertDetour(map, path, 2, 2, opt).ok).toBe(false)
  })

  it('proba negativă: isValidPath chiar prinde un drum care se atinge singur', () => {
    const { map } = flatMap()
    // Un U strâns: (-5,0) → (-4,0) → (-4,-1) → (-5,-1)… (-5,-1) e vecin cu (-5,0), care nu-i e consecutiv.
    const touching: Hex[] = [map.spawn, { q: -4, r: 0 }, { q: -3, r: -1 }, { q: -4, r: -1 }]
    const r = isValidPath({ ...map, base: touching[touching.length - 1]! }, touching)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/se atinge singur/)
  })
})
