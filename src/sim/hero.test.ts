import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import type { ModId } from '../data/modules'
import { NEVER, type GameState, type Mod } from './state'
import { addNode, heroAt, quietGame, stepFor } from './testkit'
import { heroMaxHp, hurtHero } from './hero'

const still = { x: 0, y: 0 }

describe('erou', () => {
  it('merge cu 165 pe secundă, proporțional cu comanda', () => {
    const s = quietGame(); heroAt(s, 700, 1200)
    stepFor(s, 1, { x: 1, y: 0 })
    expect(s.hero.x).toBeCloseTo(865, 6); expect(s.hero.y).toBeCloseTo(1200, 6)
    stepFor(s, 1, { x: 0, y: -0.5 })
    expect(s.hero.y).toBeCloseTo(1117.5, 6)
  })
  it('o comandă mai lungă decât 1 nu îl face mai rapid: 165 pe secundă, nu mai mult', () => {
    const s = quietGame(); heroAt(s, 700, 1200)
    stepFor(s, 1, { x: 3, y: 4 })
    expect(Math.hypot(s.hero.x - 700, s.hero.y - 1200)).toBeLessThanOrEqual(165 + 1e-6)
    expect(Math.hypot(s.hero.x - 700, s.hero.y - 1200)).toBeGreaterThan(165 - 1e-6)
  })
  it('rămâne în hartă și în afara nucleului', () => {
    const s = quietGame(); heroAt(s, 1090, 1200)
    stepFor(s, 1, { x: 1, y: 0 }); expect(s.hero.x).toBe(1080)
    heroAt(s, 550, 650); stepFor(s, 2, { x: 0, y: 1 })
    expect(Math.hypot(s.hero.x - 550, s.hero.y - 750)).toBeGreaterThanOrEqual(67 - 1e-6)
    expect(s.hero.y).toBeLessThan(750)
  })
  it('pus exact pe centrul unui obstacol, iese fără NaN', () => {
    const s = quietGame(); const n = addNode(s, 'metal', 300, 300)
    for (const [x, y] of [[550, 750], [n.x, n.y]] as const) {
      heroAt(s, x, y); stepFor(s, 0.1)
      expect(Number.isFinite(s.hero.x) && Number.isFinite(s.hero.y)).toBe(true)
    }
    expect(Math.hypot(s.hero.x - 300, s.hero.y - 300)).toBeGreaterThanOrEqual(27 - 1e-6)
  })
  it('strânge cristal bucată cu bucată, iar zăcământul crește la loc', () => {
    const s = quietGame(); const n = addNode(s, 'crystal', 300, 300); heroAt(s, 268, 300)   // 10 unități de margine
    stepFor(s, 1 / 60); expect([s.crystal, n.left]).toEqual([21, 7])
    stepFor(s, 2.6); expect([s.crystal, n.left]).toEqual([28, 0])
    expect(s.fx.some((f) => f.kind === 'gain' && f.res === 'crystal')).toBe(true)
    heroAt(s, 700, 1200)                                     // pleacă, altfel îl strânge din nou când crește
    stepFor(s, 17); expect(n.left).toBe(0)
    stepFor(s, 1.5); expect(n.left).toBe(8)
  })
  it('metalul vine la 0,42 s, iar de la 17 unități nu vine nimic', () => {
    const s = quietGame(); addNode(s, 'metal', 300, 300); heroAt(s, 300 - 14 - 13 - 10, 300)
    stepFor(s, 1); expect(s.metal).toBe(3)
    const far = quietGame(); addNode(far, 'crystal', 300, 300); heroAt(far, 300 - 9 - 13 - 17, 300)
    stepFor(far, 2); expect(far.crystal).toBe(20)
  })
  it('doborât, nu se mișcă și nu strânge; reapare lângă nucleu, întreg', () => {
    const s = quietGame(); addNode(s, 'crystal', 300, 300); heroAt(s, 268, 300)
    hurtHero(s, 999)
    expect(s.hero).toMatchObject({ dead: true, respawnT: 5 })
    expect(s.fx.some((f) => f.kind === 'heroDown')).toBe(true)
    stepFor(s, 4.9, { x: 1, y: 0 }); expect([s.hero.x, s.crystal]).toEqual([268, 20])
    stepFor(s, 0.3); expect(s.hero).toMatchObject({ dead: false, x: 464, y: 756, hp: 60 })
  })
  it('își reface 4 viață pe secundă după 3 s fără lovituri', () => {
    const s = quietGame(); heroAt(s, 700, 1200); hurtHero(s, 30)
    stepFor(s, 2.9); expect(s.hero.hp).toBe(30)
    stepFor(s, 2.1); expect(s.hero.hp).toBeCloseTo(38, 0)
  })
  it('stă pe loc fără comandă și nu se socotește mișcat', () => {
    const s = quietGame(); heroAt(s, 700, 1200); stepFor(s, 0.5, still)
    expect(s.hero).toMatchObject({ x: 700, y: 1200, moved: false })
  })
})

/** Nava cu Unda la treapta 1 și modulul dat. */
function fit(s: GameState, id: ModId, tier: number): Mod {
  const m: Mod = { id, tier, t: 0 }
  s.hero.mods = [{ id: 'wave', tier: 1, t: 0 }, m]
  return m
}
const TIERS = [1, 2, 3] as const

describe('modulele de corp', () => {
  it('Blindajul: +30 / +60 / +100 viață maximă; un nivel dă 10', () => {
    const s = quietGame()
    expect(heroMaxHp(s)).toBe(60)
    s.hero.lvl = 2; expect(heroMaxHp(s)).toBe(70)
    s.hero.lvl = 9; expect(heroMaxHp(s)).toBe(140)
    s.hero.lvl = 1
    expect(TIERS.map((t) => { fit(s, 'armor', t); return heroMaxHp(s) })).toEqual([90, 120, 160])
  })
  it('Scutul încărcat oprește o lovitură cu totul, apoi se reface în 6 / 4,5 / 3 s', () => {
    const every = [6, 4.5, 3]
    for (const tier of TIERS) {
      const s = quietGame(); heroAt(s, 700, 1200); const m = fit(s, 'shield', tier)
      hurtHero(s, 10)
      expect([s.hero.hp, s.hero.hurtT, m.t]).toEqual([60, NEVER, every[tier - 1]])
      expect(s.fx).toContainEqual({ kind: 'block', x: 700, y: 1200, t0: s.t })
      stepFor(s, every[tier - 1]! - 0.1)
      hurtHero(s, 10); expect(s.hero.hp).toBe(50)            // încă se reface: lovitura intră
      stepFor(s, 0.1)
      const hurtT = s.hero.hurtT
      hurtHero(s, 10); expect([s.hero.hp, s.hero.hurtT]).toEqual([50, hurtT])   // refăcut: oprită din nou
    }
  })
  it('semnul scutului dispare din efecte după durata lui', () => {
    const s = quietGame(); heroAt(s, 700, 1200); fit(s, 'shield', 1)
    hurtHero(s, 10)
    const blocks = () => s.fx.filter((f) => f.kind === 'block').length
    expect(blocks()).toBe(1)
    stepFor(s, BALANCE.fx.blockLife - 1 / 60); expect(blocks()).toBe(1)
    stepFor(s, 2 / 60); expect(blocks()).toBe(0)
  })
  it('două lovituri în același pas cu scutul încărcat: prima oprită, a doua primită (Review Focus 5)', () => {
    const s = quietGame(); heroAt(s, 700, 1200); fit(s, 'shield', 3)
    hurtHero(s, 10); hurtHero(s, 7)
    expect([s.hero.hp, s.hero.hurtT]).toEqual([53, 0])
    expect(s.fx.filter((f) => f.kind === 'block')).toHaveLength(1)
  })
  it('Reparatorul: refacerea pornește după 2 / 1,5 / 1 s, cu 6 / 9 / 12 viață pe secundă', () => {
    const wait = [2, 1.5, 1], rate = [6, 9, 12]
    for (const tier of TIERS) {
      const s = quietGame(); heroAt(s, 700, 1200); fit(s, 'mender', tier); hurtHero(s, 30)
      stepFor(s, wait[tier - 1]!); expect(s.hero.hp).toBe(30)
      stepFor(s, 1); expect(s.hero.hp).toBeCloseTo(30 + rate[tier - 1]!, 9)
    }
  })
})

describe('modulele utilitare', () => {
  it('Motorul: viteza × 1,12 / 1,22 / 1,30 (distanța într-o secundă)', () => {
    const times = [1.12, 1.22, 1.3]
    for (const tier of TIERS) {
      const s = quietGame(); heroAt(s, 700, 1200); fit(s, 'engine', tier)
      stepFor(s, 1, { x: 1, y: 0 })
      expect(s.hero.x - 700).toBeCloseTo(165 * times[tier - 1]!, 6)
    }
  })
  it('Magnetul: strânge de la 50 / 75 / 100 și nu de la un pixel mai departe', () => {
    const reach = [50, 75, 100]
    for (const tier of TIERS) {
      for (const extra of [0, 1]) {
        const s = quietGame(); addNode(s, 'crystal', 300, 300); fit(s, 'magnet', tier)
        heroAt(s, 300 - 9 - 13 - reach[tier - 1]! - extra, 300)
        stepFor(s, 1 / 60)
        expect(s.crystal).toBe(extra === 0 ? 21 : 20)
      }
    }
  })
  it('Magnetul: timpul între bucăți × 0,8 / 0,65 / 0,5 (fără el, 18 pași la cristal)', () => {
    const gap = (tier: number): number => {
      const s = quietGame(); addNode(s, 'crystal', 300, 300); if (tier > 0) fit(s, 'magnet', tier)
      heroAt(s, 268, 300)
      stepFor(s, 1 / 60)
      let n = 0
      while (s.crystal === 21) { stepFor(s, 1 / 60); n++ }
      return n
    }
    expect([0, 1, 2, 3].map(gap)).toEqual([18, 15, 12, 9])   // 0,3 s; 0,24 s; 0,195 s; 0,15 s, în pași de 1/60 s
  })
})
