import { describe, expect, it } from 'vitest'
import { MAX_UPS, NO_UPS, type Ups } from '../data/workshop'
import { armsFactor, coreMaxHp, reachFactor } from './boost'
import { heroDamage, heroMaxHp } from './hero'
import { createGame, type GameState } from './state'
import { addFoe, addNode, heroAt, padOf, quietGame, stepFor } from './testkit'

const dummy = (s: GameState, x: number, y: number) => addFoe(s, x, y, { hp: 1000, maxHp: 1000, speed: 0, dmg: 0 })
const withUps = (over: Partial<Ups>): GameState => { const s = quietGame(); s.ups = { ...NO_UPS, ...over }; return s }

describe('întăririle, ca cifre', () => {
  it('createGame le ține în stare; fără ele, NO_UPS', () => {
    expect(createGame(1).ups).toEqual(NO_UPS)
    expect(createGame(1, MAX_UPS).ups).toEqual(MAX_UPS)
  })
  it('la plafon: planeta 480, lovitura × 1,2, strânsul × 1,3, nava 84 la nivelul 1', () => {
    const s = createGame(1, MAX_UPS)
    expect([coreMaxHp(s), armsFactor(s), reachFactor(s), heroMaxHp(s)]).toEqual([480, 1.2, 1.3, 84])
    expect(s.core.hp).toBe(480)
  })
  it('viața planetei e întreagă la fiecare treaptă: 400, 420, 440, 460, 480', () => {
    const hp = [0, 1, 2, 3, 4].map((core) => coreMaxHp(withUps({ core })))
    expect(hp).toEqual([400, 420, 440, 460, 480])
    expect(hp.every(Number.isInteger)).toBe(true)
    expect(createGame(1, { ...NO_UPS, core: 2 }).core.hp).toBe(440)
  })
  it('fără întăriri: planeta 400, factorii 1, nava 60 la nivelul 1', () => {
    const s = createGame(1)
    expect([coreMaxHp(s), armsFactor(s), reachFactor(s), heroMaxHp(s)]).toEqual([400, 1, 1, 60])
    expect(s.core.hp).toBe(400)
  })
})

describe('întăririle, în joc', () => {
  it('Armamentul 5: Unda de treapta 1 lovește cu 12', () => {
    const s = withUps({ arms: 5 }); heroAt(s, 300, 300)
    const f = dummy(s, 340, 300)
    expect(heroDamage(s)).toBe(12)
    stepFor(s, 1 / 60)
    expect(f.hp).toBe(988)
  })
  it('Armamentul 5 înmulțește și Laserul și Rachetele', () => {
    const s = withUps({ arms: 5 }); heroAt(s, 300, 300)
    s.hero.mods = [{ id: 'wave', tier: 1, t: 0 }, { id: 'laser', tier: 1, t: 0 }]
    const near = dummy(s, 460, 300)                                  // în raza Laserului, dincolo de a Undei
    stepFor(s, 1 / 60)
    expect(near.hp).toBeCloseTo(1000 - 14 * 1.2, 9)
    const m = withUps({ arms: 5 }); heroAt(m, 300, 300)
    m.hero.mods = [{ id: 'wave', tier: 1, t: 0 }, { id: 'missile', tier: 1, t: 0 }]
    dummy(m, 450, 300)
    stepFor(m, 1 / 60)
    expect(m.shots[0]!.dmg).toBeCloseTo(12 * 1.2, 9)
  })
  it('Armamentul nu atinge turelele', () => {
    const s = withUps({ arms: 5 }); heroAt(s, 100, 100)
    const p = padOf(s, 'turret'); p.lvl = 1
    const f = dummy(s, p.bx + 100, p.by)
    stepFor(s, 4.5 + 1 / 60)
    expect(f.hp).toBe(1000 - 6 * 6)
  })
  it('planeta reparată nu trece de coreMaxHp', () => {
    const s = withUps({ core: 4 }); s.metal = 50; s.core.hp = 460
    const p = padOf(s, 'repair'); heroAt(s, p.x, p.y)
    stepFor(s, 3)
    expect(s.core.hp).toBe(480)
    expect(s.metal).toBe(46)
  })
  it('reparatul cu Planeta 3 se oprește exact la 460', () => {
    const s = withUps({ core: 3 }); s.metal = 50; s.core.hp = 440
    const p = padOf(s, 'repair'); heroAt(s, p.x, p.y)
    stepFor(s, 3)
    expect(s.core.hp).toBe(460)
    expect(s.metal).toBe(46)
  })
  it('nava strânge un cristal aflat la 1,25 × distanța de azi doar cu Colectare 3', () => {
    for (const reach of [0, 1, 2, 3]) {
      const s = withUps({ reach }); addNode(s, 'crystal', 300, 300)
      heroAt(s, 300 - 9 - 13 - 16 * 1.25, 300)                       // marginile la 1,25 × 16
      stepFor(s, 1 / 60)
      expect([reach, s.crystal]).toEqual([reach, reach === 3 ? 21 : 20])
    }
  })
  it('Colectarea înmulțește și raza Magnetului', () => {
    for (const reach of [0, 3]) {
      const s = withUps({ reach }); addNode(s, 'crystal', 300, 300)
      s.hero.mods = [{ id: 'wave', tier: 1, t: 0 }, { id: 'magnet', tier: 1, t: 0 }]
      heroAt(s, 300 - 9 - 13 - 40 * 1.25, 300)                       // Magnetul 1 strânge de la 40
      stepFor(s, 1 / 60)
      expect([reach, s.crystal]).toEqual([reach, reach === 3 ? 21 : 20])
    }
  })
  it('Carena dă 6 viață pe treaptă', () => {
    expect([0, 1, 2, 3, 4].map((hull) => heroMaxHp(withUps({ hull })))).toEqual([60, 66, 72, 78, 84])
  })
})
