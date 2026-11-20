import { describe, expect, it } from 'vitest'
import { BALANCE, cost, foeHp, spawnEvery, turretDamage } from './balance'

describe('balans', () => {
  it('costurile din spec', () => {
    expect(cost('turret', 1)).toEqual({ crystal: 20, metal: 0 })
    expect(cost('turret', 3)).toEqual({ crystal: 50, metal: 30 })
    expect(cost('turret', 5)).toEqual({ crystal: 80, metal: 60 })
    expect([1, 2, 3].map((l) => cost('collector', l))).toEqual([{ crystal: 25, metal: 0 }, { crystal: 40, metal: 15 }, { crystal: 60, metal: 35 }])
    expect([1, 2, 3].map((l) => cost('mine', l))).toEqual([{ crystal: 35, metal: 0 }, { crystal: 45, metal: 20 }, { crystal: 60, metal: 40 }])
    expect(cost('hero', 2)).toEqual({ crystal: 25, metal: 10 })
    expect(cost('hero', 5)).toEqual({ crystal: 70, metal: 55 })
  })
  it('nava: un prag de experiență pentru fiecare nivel de după primul, un număr de locuri pentru fiecare nivel', () => {
    expect(BALANCE.hero.maxLevel).toBe(9)
    expect(BALANCE.hero.xpToLevel.length).toBe(BALANCE.hero.maxLevel - 1)
    expect(BALANCE.hero.slots.length).toBe(BALANCE.hero.maxLevel)
  })
  it('curbele din spec', () => {
    expect([turretDamage(1), turretDamage(5)]).toEqual([6, 26])
    expect([spawnEvery(0), spawnEvery(90), spawnEvery(1e6)]).toEqual([5, 2.5, 0.6])
    expect([foeHp(0), foeHp(45)]).toEqual([14, 28])
  })
  it('costurile: numere întregi, cel puțin 0, cu suma mai mare ca 0, pe fiecare nivel', () => {
    const levels: [Parameters<typeof cost>[0], number, number][] = [
      ['turret', 1, BALANCE.turret.maxLevel], ['collector', 1, BALANCE.collector.maxLevel],
      ['mine', 1, BALANCE.mine.maxLevel], ['hero', 2, BALANCE.hero.maxLevel],
    ]
    const bad: string[] = []
    for (const [kind, from, to] of levels) {
      for (let lvl = from; lvl <= to; lvl++) {
        const c = cost(kind, lvl), all = [c.crystal, c.metal]
        if (!all.every((x) => Number.isInteger(x) && x >= 0) || c.crystal + c.metal <= 0) bad.push(`${kind} ${lvl}: ${JSON.stringify(c)}`)
      }
    }
    expect(bad).toEqual([])
  })
  it('curbele: ritmul pozitiv și fără să crească, viața pozitivă și fără să scadă, de la 0 la 600 s', () => {
    for (let t = 0; t <= 600; t += 30) {
      expect(spawnEvery(t)).toBeGreaterThan(0)
      expect(foeHp(t)).toBeGreaterThan(0)
      if (t > 0) {
        expect(spawnEvery(t)).toBeLessThanOrEqual(spawnEvery(t - 30))
        expect(foeHp(t)).toBeGreaterThanOrEqual(foeHp(t - 30))
      }
    }
  })
})
