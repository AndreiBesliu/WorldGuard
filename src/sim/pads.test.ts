import { describe, expect, it } from 'vitest'
import { heroAt, padOf, quietGame, stepFor } from './testkit'
import { heroDamage, hurtHero } from './hero'
import { nextCost } from './pads'
import { step } from './step'
import type { GameState, Pad } from './state'

const on = (s: GameState, p: Pad) => heroAt(s, p.x, p.y)

describe('cercurile', () => {
  it('plata începe abia după 0,35 s și construiește turnul din 20 de lemne', () => {
    const s = quietGame(); const p = padOf(s, 'tower'); on(s, p)
    stepFor(s, 0.3); expect([s.wood, p.paid.wood]).toEqual([20, 0])
    stepFor(s, 1); expect([s.wood, p.lvl, p.paid.wood]).toEqual([0, 1, 0])
    expect(s.fx.some((f) => f.kind === 'level' && f.what === 'tower' && f.lvl === 1)).toBe(true)
  })
  it('trecutul în fugă prin mijlocul cercului nu costă nimic, oricum ar cădea pașii', () => {
    for (let off = 0; off < 2.75; off += 0.25) {
      const s = quietGame(); const p = padOf(s, 'tower'); heroAt(s, p.x - 40 - off, p.y)
      stepFor(s, 0.6, { x: 1, y: 0 })
      expect([s.wood, p.paid.wood]).toEqual([20, 0])
    }
  })
  it('plata parțială rămâne în cerc', () => {
    const s = quietGame(); s.wood = 5; const p = padOf(s, 'tower'); on(s, p)
    stepFor(s, 1); expect([s.wood, p.paid.wood, p.lvl]).toEqual([0, 5, 0])
    heroAt(s, 700, 1200); stepFor(s, 1); expect(p.paid.wood).toBe(5)
  })
  it('fără resurse nu se întâmplă nimic și nimic nu scade sub zero', () => {
    const s = quietGame(); s.wood = 0; const p = padOf(s, 'tower'); on(s, p)
    stepFor(s, 2); expect([s.wood, s.stone, p.paid]).toEqual([0, 0, { wood: 0, stone: 0 }])
  })
  it('după un nivel urmează o pauză de aproximativ o secundă', () => {
    const s = quietGame(); s.wood = 500; s.stone = 500; const p = padOf(s, 'tower'); on(s, p)
    while (p.lvl === 0) step(s, { x: 0, y: 0 })
    stepFor(s, 0.9); expect(p.paid).toEqual({ wood: 0, stone: 0 })
    stepFor(s, 0.4); expect(p.paid.wood + p.paid.stone).toBeGreaterThan(0)
  })
  it('nivelul 2 de turn ia exact 35 de lemne și 15 pietre', () => {
    const s = quietGame(); s.wood = 500; s.stone = 500; const p = padOf(s, 'tower'); p.lvl = 1; on(s, p)
    while (p.lvl === 1) step(s, { x: 0, y: 0 })
    expect([s.wood, s.stone]).toEqual([465, 485])
  })
  it('la nivel maxim nu se mai cheltuie', () => {
    const s = quietGame(); s.wood = 500; s.stone = 500; const p = padOf(s, 'tower'); p.lvl = 5; on(s, p)
    stepFor(s, 2); expect([s.wood, s.stone, nextCost(s, p)]).toEqual([500, 500, null])
  })
  it('nivelul eroului dă viață și lovitură', () => {
    const s = quietGame(); s.wood = 25; s.stone = 10; s.hero.hp = 12; on(s, padOf(s, 'hero'))
    stepFor(s, 2); expect([s.hero.lvl, s.hero.hp, heroDamage(s)]).toEqual([2, 80, 16])
  })
  it('tabăra și cariera produc singure', () => {
    const s = quietGame(); heroAt(s, 700, 1200)
    const c = padOf(s, 'camp'); c.lvl = 1; c.prodT = 1.6       // ca imediat după construire
    const q = padOf(s, 'quarry'); q.lvl = 2; q.prodT = 1.5
    stepFor(s, 16.2); expect([s.wood, s.stone]).toEqual([30, 10])   // 10 lemne la 1,6 s; 10 pietre la 1,5 s
  })
  it('reparatul schimbă o piatră pe 5 viață și se oprește la plin', () => {
    const s = quietGame(); s.stone = 10; s.castle.hp = 380; on(s, padOf(s, 'repair'))
    stepFor(s, 1.5); expect([s.castle.hp, s.stone]).toEqual([400, 6])
  })
  it('un erou doborât nu plătește', () => {
    const s = quietGame(); const p = padOf(s, 'tower'); on(s, p); hurtHero(s, 999)
    stepFor(s, 2); expect(s.wood).toBe(20)
  })
})
