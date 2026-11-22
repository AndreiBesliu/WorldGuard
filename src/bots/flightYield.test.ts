import { describe, expect, it } from 'vitest'
import { flightYield, flyScripted } from './flightYield'

// Nava condusă de script nu păzește nimic: dă cifra de pornire pentru prețuri, tipărită de `npm run balance`. Aici se cere doar
// ca măsurătoarea să fie de încredere (aceeași de fiecare dată, iar zborul ajunge la capăt); ținta de preț se judecă la reglaj, din tabel.
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
