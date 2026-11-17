import { describe, expect, it } from 'vitest'
import { cost, foeHp, spawnEvery, towerDamage } from './balance'

describe('balans', () => {
  it('costurile din spec', () => {
    expect(cost('tower', 1)).toEqual({ wood: 20, stone: 0 })
    expect(cost('tower', 3)).toEqual({ wood: 50, stone: 30 })
    expect(cost('tower', 5)).toEqual({ wood: 80, stone: 60 })
    expect([1, 2, 3].map((l) => cost('camp', l))).toEqual([{ wood: 25, stone: 0 }, { wood: 40, stone: 15 }, { wood: 60, stone: 35 }])
    expect([1, 2, 3].map((l) => cost('quarry', l))).toEqual([{ wood: 35, stone: 0 }, { wood: 45, stone: 20 }, { wood: 60, stone: 40 }])
    expect(cost('hero', 2)).toEqual({ wood: 25, stone: 10 })
    expect(cost('hero', 5)).toEqual({ wood: 70, stone: 55 })
  })
  it('curbele din spec', () => {
    expect([towerDamage(1), towerDamage(5)]).toEqual([6, 26])
    expect([spawnEvery(0), spawnEvery(90), spawnEvery(1e6)]).toEqual([5, 2.5, 0.6])
    expect([foeHp(0), foeHp(80)]).toEqual([14, 28])
  })
})
