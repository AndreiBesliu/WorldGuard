import { expect, it } from 'vitest'
import { MAX_UPS, NO_UPS, UP_IDS, WORKSHOP, upPrice } from './workshop'

it('prima treaptă a Carenei costă 50 de cristale și 10 de metal', () => {
  expect(upPrice('hull', 1)).toEqual({ crystal: 50, metal: 10 })
})
it('prețul crește cu treapta și e multiplu de 5', () => {
  for (const id of UP_IDS) {
    for (let l = 1; l <= WORKSHOP[id].max; l++) {
      const p = upPrice(id, l)
      expect(p.crystal % 5).toBe(0); expect(p.metal % 5).toBe(0)
      if (l > 1) expect(p.crystal).toBeGreaterThan(upPrice(id, l - 1).crystal)
    }
  }
})
it('MAX_UPS e plafonul fiecărei întăriri, NO_UPS e zero peste tot', () => {
  for (const id of UP_IDS) { expect(MAX_UPS[id]).toBe(WORKSHOP[id].max); expect(NO_UPS[id]).toBe(0) }
  expect(MAX_UPS).toEqual({ hull: 4, arms: 5, reach: 3, core: 4, kit: 3 })
})
it('listele pe trepte au o valoare pentru fiecare treaptă, de la 0 la plafon', () => {
  expect(WORKSHOP.hull.hits).toHaveLength(WORKSHOP.hull.max + 1)
  expect(WORKSHOP.kit.mods).toHaveLength(WORKSHOP.kit.max + 1)
})
