import { describe, expect, it } from 'vitest'
import { addNode, heroAt, quietGame, stepFor } from './testkit'
import { hurtHero } from './hero'

const still = { x: 0, y: 0 }

describe('erou', () => {
  it('merge cu 165 pe secundă, proporțional cu comanda', () => {
    const s = quietGame(); heroAt(s, 700, 1200)
    stepFor(s, 1, { x: 1, y: 0 })
    expect(s.hero.x).toBeCloseTo(865, 6); expect(s.hero.y).toBeCloseTo(1200, 6)
    stepFor(s, 1, { x: 0, y: -0.5 })
    expect(s.hero.y).toBeCloseTo(1117.5, 6)
  })
  it('rămâne în hartă și în afara castelului', () => {
    const s = quietGame(); heroAt(s, 1090, 1200)
    stepFor(s, 1, { x: 1, y: 0 }); expect(s.hero.x).toBe(1080)
    heroAt(s, 550, 650); stepFor(s, 2, { x: 0, y: 1 })
    expect(Math.hypot(s.hero.x - 550, s.hero.y - 750)).toBeGreaterThanOrEqual(67 - 1e-6)
    expect(s.hero.y).toBeLessThan(750)
  })
  it('pus exact pe centrul unui obstacol, iese fără NaN', () => {
    const s = quietGame(); const n = addNode(s, 'stone', 300, 300)
    for (const [x, y] of [[550, 750], [n.x, n.y]] as const) {
      heroAt(s, x, y); stepFor(s, 0.1)
      expect(Number.isFinite(s.hero.x) && Number.isFinite(s.hero.y)).toBe(true)
    }
    expect(Math.hypot(s.hero.x - 300, s.hero.y - 300)).toBeGreaterThanOrEqual(27 - 1e-6)
  })
  it('strânge lemn bucată cu bucată, iar copacul crește la loc', () => {
    const s = quietGame(); const n = addNode(s, 'wood', 300, 300); heroAt(s, 268, 300)   // 10 unități de margine
    stepFor(s, 1 / 60); expect([s.wood, n.left]).toEqual([21, 7])
    stepFor(s, 2.6); expect([s.wood, n.left]).toEqual([28, 0])
    expect(s.fx.some((f) => f.kind === 'gain' && f.res === 'wood')).toBe(true)
    heroAt(s, 700, 1200)                                     // pleacă, altfel îl taie din nou când crește
    stepFor(s, 17); expect(n.left).toBe(0)
    stepFor(s, 1.5); expect(n.left).toBe(8)
  })
  it('piatra vine la 0,42 s, iar de la 17 unități nu vine nimic', () => {
    const s = quietGame(); addNode(s, 'stone', 300, 300); heroAt(s, 300 - 14 - 13 - 10, 300)
    stepFor(s, 1); expect(s.stone).toBe(3)
    const far = quietGame(); addNode(far, 'wood', 300, 300); heroAt(far, 300 - 9 - 13 - 17, 300)
    stepFor(far, 2); expect(far.wood).toBe(20)
  })
  it('doborât, nu se mișcă și nu strânge; reapare lângă castel, întreg', () => {
    const s = quietGame(); addNode(s, 'wood', 300, 300); heroAt(s, 268, 300)
    hurtHero(s, 999)
    expect(s.hero).toMatchObject({ dead: true, respawnT: 5 })
    expect(s.fx.some((f) => f.kind === 'heroDown')).toBe(true)
    stepFor(s, 4.9, { x: 1, y: 0 }); expect([s.hero.x, s.wood]).toEqual([268, 20])
    stepFor(s, 0.3); expect(s.hero).toMatchObject({ dead: false, x: 464, y: 756, hp: 60 })
  })
  it('își reface 4 viață pe secundă după 3 s fără lovituri', () => {
    const s = quietGame(); heroAt(s, 700, 1200); hurtHero(s, 30)
    stepFor(s, 2.9); expect(s.hero.hp).toBe(30)
    stepFor(s, 2.1); expect(s.hero.hp).toBeCloseTo(38, 0)
  })
  it('stă pe loc fără comandă și nu se socotește mișcat', () => {
    const s = quietGame(); heroAt(s, 700, 1200); stepFor(s, 0.5, still)
    expect(s.hero).toMatchObject({ x: 700, y: 1200, moved: false, walk: 0 })
  })
})
