import { describe, expect, it } from 'vitest'
import { cost, foeHp, spawnEvery, turretDamage } from './balance'

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
  it('curbele din spec', () => {
    expect([turretDamage(1), turretDamage(5)]).toEqual([6, 26])
    expect([spawnEvery(0), spawnEvery(90), spawnEvery(1e6)]).toEqual([5, 2.5, 0.6])
    expect([foeHp(0), foeHp(80)]).toEqual([14, 28])
  })
})
