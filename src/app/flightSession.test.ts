import { describe, expect, it } from 'vitest'
import { NO_UPS, type Cost } from '../data/workshop'
import { createFlightSession } from './flightSession'

const still = { dx: 0, dy: 0 }
const make = () => {
  const banked: Cost[] = []; const explored: number[] = []
  const s = createFlightSession({ ups: () => NO_UPS, bank: (h) => { banked.push(h) }, explored: (n) => { explored.push(n) } })
  return { s, banked, explored }
}
const sum = (hs: Cost[]): Cost => hs.reduce((a, h) => ({ crystal: a.crystal + h.crystal, metal: a.metal + h.metal }), { crystal: 0, metal: 0 })

describe('sesiunea zborului', () => {
  it('pornește pe un zbor proaspăt care nu se joacă', () => {
    const { s, banked } = make()
    expect(s.phase).toBe('ready'); expect(s.f.tick).toBe(0)
    expect(s.advance(10, still)).toBeNull(); expect(s.f.tick).toBe(0); expect(banked).toEqual([])
  })
  it('un zbor terminat fără pauză cheamă bank o dată, cu tot', () => {
    const { s, banked } = make(); s.start(1, 1)
    s.f.crystal = 7; s.f.metal = 3; s.f.kills = 4; s.f.t = 91.8; s.f.mode = 'down'
    const over = s.advance(1, still)
    expect(banked).toEqual([{ crystal: 7, metal: 3 }])
    expect(over).toEqual({ explored: false, sector: 1, crystal: 7, metal: 3, kills: 4, secs: 91, mods: s.f.ship.mods })
    expect(s.phase).toBe('over')
  })
  it('pauză la jumătate, apoi sfârșit: două chemări a căror sumă e totalul', () => {
    const { s, banked } = make(); s.start(1, 1)
    s.f.crystal = 5; s.f.metal = 2
    expect(s.pause()).toBe(true); expect(banked).toEqual([{ crystal: 5, metal: 2 }])
    expect(s.unpause()).toBe(true)
    s.f.crystal = 9; s.f.metal = 2; s.f.mode = 'down'
    s.advance(1, still)
    expect(banked).toHaveLength(2); expect(banked[1]).toEqual({ crystal: 4, metal: 0 })
    expect(sum(banked)).toEqual({ crystal: 9, metal: 2 })
  })
  it('două pauze la rând fără nimic strâns între ele: a doua nu cheamă bank', () => {
    const { s, banked } = make(); s.start(1, 1)
    s.f.crystal = 5
    s.pause(); s.unpause(); s.pause()
    expect(banked).toHaveLength(1)
  })
  it('pauza fără nimic strâns nu cheamă bank deloc', () => {
    const { s, banked } = make(); s.start(1, 1); s.pause()
    expect(banked).toEqual([])
  })
  it('pauză și niciun sfârșit: rezerva are ce s-a strâns până la pauză', () => {
    const { s, banked } = make(); s.start(1, 1)
    s.f.crystal = 6; s.f.metal = 1; s.pause()
    s.f.crystal = 99                                    // ce vine după pauză nu mai ajunge nicăieri
    expect(sum(banked)).toEqual({ crystal: 6, metal: 1 })
  })
  it('explored cheamă deps.explored cu sectorul, down nu', () => {
    const a = make(); a.s.start(1, 3); a.s.f.crystal = 2; a.s.f.mode = 'explored'
    const over = a.s.advance(1, still)
    expect(over?.explored).toBe(true); expect(over?.sector).toBe(3)
    expect(a.explored).toEqual([3]); expect(a.banked).toEqual([{ crystal: 2, metal: 0 }])
    const b = make(); b.s.start(1, 3); b.s.f.mode = 'down'; b.s.advance(1, still)
    expect(b.explored).toEqual([]); expect(b.banked).toEqual([])
    const c = make(); c.s.start(1, 3); c.s.f.crystal = 4; c.s.f.metal = 1; c.s.f.mode = 'down'; c.s.advance(1, still)
    expect(c.explored).toEqual([]); expect(c.banked).toEqual([{ crystal: 4, metal: 1 }])
  })
  it('start pornește socoteala de la zero și întăririle vin din deps', () => {
    const { s, banked } = make(); s.start(1, 1); s.f.crystal = 4; s.pause()
    s.start(2, 1); s.f.crystal = 1; s.f.mode = 'down'; s.advance(1, still)
    expect(banked).toEqual([{ crystal: 4, metal: 0 }, { crystal: 1, metal: 0 }])
  })
  it('după over, advance întoarce null și nu mai face pași', () => {
    const { s } = make(); s.start(1, 1); s.f.mode = 'down'; s.advance(1, still)
    const t = s.f.tick
    expect(s.advance(5, still)).toBeNull(); expect(s.f.tick).toBe(t)
  })
  it('advance cu 3 pași dă mișcarea doar primului', () => {
    const a = make(); a.s.start(1, 1)
    const b = make(); b.s.start(1, 1)
    a.s.advance(3, { dx: 30, dy: 0 })
    b.s.advance(1, { dx: 30, dy: 0 }); b.s.advance(2, still)
    expect(a.s.f.ship.x).toBe(b.s.f.ship.x); expect(a.s.f.ship.x).toBeGreaterThan(195)
    expect(a.s.f.tick).toBe(3)
  })
  it('advance cu 0 pași nu face nimic', () => {
    const { s } = make(); s.start(1, 1); s.advance(0, { dx: 30, dy: 0 })
    expect(s.f.tick).toBe(0); expect(s.f.ship.rx).toBe(0)
  })
  it('advance pe pauză nu face niciun pas', () => {
    const { s } = make(); s.start(1, 1); s.advance(2, still); s.pause()
    expect(s.advance(5, still)).toBeNull(); expect(s.f.tick).toBe(2)
  })
  it('pause și unpause refuză în fazele greșite', () => {
    const { s } = make()
    expect([s.pause(), s.unpause()]).toEqual([false, false])
    s.start(1, 1); expect(s.unpause()).toBe(false)
    s.pause(); expect(s.pause()).toBe(false)
  })
  it('quit din pauză încheie zborul fără sector explorat și fără bank nou', () => {
    const { s, banked, explored } = make(); s.start(1, 2)
    s.f.crystal = 5; s.pause()
    expect(s.quit()).toBe(true)
    expect(s.phase).toBe('ready'); expect(banked).toHaveLength(1); expect(explored).toEqual([])
  })
  it('quit în orice altă fază întoarce false și nu schimbă nimic', () => {
    const { s, banked } = make()
    expect(s.quit()).toBe(false); expect(s.phase).toBe('ready')
    s.start(1, 1); expect(s.quit()).toBe(false); expect(s.phase).toBe('playing')
    s.f.mode = 'down'; s.advance(1, still); expect(s.quit()).toBe(false); expect(s.phase).toBe('over')
    expect(banked).toEqual([])
  })
  it('start peste un zbor în curs trece întâi în rezervă ce s-a strâns', () => {
    const { s, banked } = make(); s.start(1, 1)
    s.f.crystal = 5; s.f.metal = 2
    s.start(2, 1)
    expect(banked).toEqual([{ crystal: 5, metal: 2 }]); expect(s.f.crystal).toBe(0)
    s.f.crystal = 3; s.f.mode = 'down'; s.advance(1, still)
    expect(sum(banked)).toEqual({ crystal: 8, metal: 2 })
  })
})
