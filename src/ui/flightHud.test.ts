import { describe, expect, it } from 'vitest'
import { FLIGHT } from '../data/flight'
import { take } from '../flight/pickups'
import { DT, sectorProgress } from '../flight/state'
import { addFoe, flyFor, quietFlight, untouchable } from '../flight/testkit'
import { flightRow } from './flightHud'

describe('flightRow: banda din zbor', () => {
  it('la pornire: Tunul la treapta 1, 5 vieți din 5, drumul 0, nimic strâns, fără rând de cules', () => {
    const r = flightRow(quietFlight(1, 3))
    expect(r.mods).toEqual([{ id: 'gun', tier: 1 }])
    expect([r.hits, r.maxHits]).toEqual([5, 5])
    expect(r.frac).toBe(0)
    expect(r.elite).toBe(false)
    expect(r.label).toBe('Sectorul 3')
    expect([r.crystal, r.metal]).toEqual([0, 0])
    expect(r.toast).toBe('')
  })
  it('ce a strâns zborul, viețile și drumul prin sector', () => {
    const f = quietFlight()
    untouchable(f)
    flyFor(f, 30)
    f.crystal = 41; f.metal = 7; f.ship.hp = 3
    const r = flightRow(f)
    expect([r.crystal, r.metal, r.hits, r.maxHits]).toEqual([41, 7, 3, 5])
    expect(r.frac).toBeCloseTo(sectorProgress(f), 12)
    expect(r.frac).toBeGreaterThan(0.1)
  })
  it('modulele, în ordinea lor, doar cele pe care nava le are, cu treapta lor', () => {
    const f = quietFlight()
    Object.assign(f.ship.mods, { gun: 2, missile: 3, magnet: 1 })
    expect(flightRow(f).mods).toEqual([{ id: 'gun', tier: 2 }, { id: 'missile', tier: 3 }, { id: 'magnet', tier: 1 }])
  })
  it('cu nava de elită pe ecran, drumul devine viața ei', () => {
    const f = quietFlight()
    f.eliteId = addFoe(f, 'elite', 195, 80, { hp: 350, maxHp: 1400 }).id
    const r = flightRow(f)
    expect(r.elite).toBe(true)
    expect(r.frac).toBeCloseTo(0.25, 12)
    expect(r.label).toBe('Elită')
  })
  it('după ce cade nava de elită, drumul e plin și eticheta e din nou a sectorului', () => {
    const f = quietFlight(1, 2)
    f.eliteId = 99                        // a fost, nu mai e printre dușmani
    const r = flightRow(f)
    expect([r.elite, r.frac, r.label]).toEqual([false, 1, 'Sectorul 2'])
  })
  it('rândul „ai cules” arată ultimul lucru cules cât e proaspăt, apoi nimic', () => {
    const f = quietFlight()
    untouchable(f)
    take(f, 'laser')
    expect(flightRow(f).toast).toBe('Laser · nou')
    flyFor(f, 0.5)
    take(f, 'gun')
    expect(flightRow(f).toast).toBe('Tun · treapta 2')
    const t0 = f.t
    while (f.t - t0 < FLIGHT.fx.tookLife - DT / 2) flyFor(f, DT)
    expect(flightRow(f).toast).toBe('Tun · treapta 2')   // încă în viața lui (1,6 s, după timpul zborului)
    flyFor(f, 2 * DT)
    expect(flightRow(f).toast).toBe('')
  })
  it('modulul la maxim dă cristale, iar reparația o viață: fiecare cu rândul lui', () => {
    const f = quietFlight()
    f.ship.mods.shield = 3
    take(f, 'shield')
    expect(flightRow(f).toast).toBe(`Scut e la maxim · +${FLIGHT.mods.maxed} cristale`)
    f.ship.hp = 2
    take(f, 'repair')
    expect(flightRow(f).toast).toBe('Reparație · +1 viață')
    take(f, 'missile'); take(f, 'magnet')
    expect(flightRow(f).toast).toBe('Magnet · nou')
  })
  it('rândul „ai cules” nu rămâne înghețat: e gol când zborul nu e în curs (pauză, sfârșit)', () => {
    const f = quietFlight()
    untouchable(f)
    take(f, 'laser')
    expect(flightRow(f, true).toast).toBe('Laser · nou')
    expect(flightRow(f, false).toast).toBe('')          // pauza: timpul zborului stă, rândul s-ar fi văzut oricât
    f.mode = 'explored'
    expect(flightRow(f, true).toast).toBe('')
    f.mode = 'down'
    expect(flightRow(f).toast).toBe('')
  })
  it('nu scrie nimic în stare', () => {
    const f = quietFlight()
    take(f, 'laser')
    const before = JSON.stringify(f)
    flightRow(f)
    expect(JSON.stringify(f)).toBe(before)
  })
})
