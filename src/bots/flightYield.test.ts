import { describe, expect, it } from 'vitest'
import { UP_IDS, WORKSHOP, upPrice } from '../data/workshop'
import { flightYield, flyScripted, MEASURED, YIELD_SECTOR, YIELD_SEEDS } from './flightYield'

describe('zborul condus de script', () => {
  it('e determinist și aduce și cristale, și metal', () => {
    const a = flightYield(1, [3]), b = flightYield(1, [3])
    expect(a).toEqual(b)
    expect(a.crystal).toBeGreaterThan(0)
    expect(a.metal).toBeGreaterThan(0)
  })
  it('nava nu e lovită, ajunge la capătul sectorului și culege module', () => {
    const f = flyScripted(4, 1)
    expect(f.mode).toBe('explored')
    expect(f.ship.hp).toBe(f.ship.maxHp)
    const mods = f.ship.mods
    expect(mods.laser + mods.missile + mods.shield + mods.magnet + mods.gun).toBeGreaterThan(1)
  })
})

describe('țintele de preț ale atelierului, față de zborul măsurat acum', () => {
  // Măsurătoarea rulează aici, pe sectorul 1 și semințele 1…10 (cam 0,6 s): țintele nu stau pe o cifră scrisă de mână.
  const got = flightYield(YIELD_SECTOR, YIELD_SEEDS)
  const all = UP_IDS.flatMap((id) => Array.from({ length: WORKSHOP[id].max }, (_, i) => upPrice(id, i + 1)))
  it('sectorul 1, semințele 1…10', () => {
    expect(YIELD_SECTOR).toBe(1)
    expect(YIELD_SEEDS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
  it('măsurătoarea e exact `MEASURED` (cifra citată de `npm run balance` și de documente)', () => {
    expect(got).toEqual(MEASURED)
  })
  it('cea mai ieftină întărire costă cel mult cât aduce un zbor, și la cristale, și la metal', () => {
    const fits = UP_IDS.map((id) => upPrice(id, 1)).filter((p) => p.crystal <= got.crystal && p.metal <= got.metal)
    expect(fits.length).toBeGreaterThan(0)
  })
  it('toate la plafon costă cât 25–35 de zboruri, pe resursa care cere mai multe', () => {
    const sum = all.reduce((s, p) => ({ crystal: s.crystal + p.crystal, metal: s.metal + p.metal }), { crystal: 0, metal: 0 })
    const flights = Math.max(sum.crystal / got.crystal, sum.metal / got.metal)
    expect(flights).toBeGreaterThanOrEqual(25)
    expect(flights).toBeLessThanOrEqual(35)
  })
})
