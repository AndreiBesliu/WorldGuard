// Partida de apărare de azi, fixată: fără nicio întărire, aceleași semințe trebuie să dea exact aceleași cifre.
// Valorile sunt luate dintr-o rulare pe codul de dinaintea întăririlor (5922493). Nu se schimbă: dacă testul pică,
// s-a schimbat purtarea de azi.
import { describe, expect, it } from 'vitest'
import { POLICIES } from './policy'
import { playOne } from './run'

const GOLDEN = [
  { seed: 1, t: 350.4166666666667, kills: 185, crystal: 67, metal: 11, lvl: 8, hp: 112.53333333333262, core: 0,
    mods: [['wave', 3], ['laser', 3], ['armor', 2]] },
  { seed: 2, t: 315.8833333333333, kills: 153, crystal: 97, metal: 21, lvl: 7, hp: 40.19999999999851, core: 0,
    mods: [['wave', 3], ['missile', 2], ['laser', 1], ['relay', 1]] },
  { seed: 3, t: 261.55, kills: 110, crystal: 52, metal: 9, lvl: 7, hp: 160.1999999999993, core: 0,
    mods: [['wave', 3], ['armor', 3], ['laser', 1]] },
]

describe('partida de apărare, fixată', () => {
  const mix = POLICIES.find((p) => p.name === 'amestec')!
  for (const g of GOLDEN) {
    it(`„Amestec”, sămânța ${g.seed}`, () => {
      const s = playOne(mix, g.seed)
      expect({
        seed: g.seed, t: s.t, kills: s.kills, crystal: s.crystal, metal: s.metal, lvl: s.hero.lvl, hp: s.hero.hp, core: s.core.hp,
        mods: s.hero.mods.map((m) => [m.id, m.tier]),
      }).toEqual(g)
    })
  }
})
