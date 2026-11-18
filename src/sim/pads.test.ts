import { describe, expect, it } from 'vitest'
import { heroAt, padOf, quietGame, stepFor } from './testkit'
import { heroDamage, hurtHero } from './hero'
import { nextCost } from './pads'
import { step } from './step'
import type { GameState, Pad } from './state'

const on = (s: GameState, p: Pad) => heroAt(s, p.x, p.y)

describe('cercurile', () => {
  it('plata începe abia după 0,35 s și construiește turela din 20 de cristale', () => {
    const s = quietGame(); const p = padOf(s, 'turret'); on(s, p)
    stepFor(s, 0.3); expect([s.crystal, p.paid.crystal]).toEqual([20, 0])
    stepFor(s, 1); expect([s.crystal, p.lvl, p.paid.crystal]).toEqual([0, 1, 0])
    expect(s.fx.some((f) => f.kind === 'level' && f.what === 'turret' && f.lvl === 1)).toBe(true)
  })
  it('trecutul în fugă prin mijlocul cercului nu costă nimic, oricum ar cădea pașii', () => {
    for (let off = 0; off < 2.75; off += 0.25) {
      const s = quietGame(); const p = padOf(s, 'turret'); heroAt(s, p.x - 40 - off, p.y)
      stepFor(s, 0.6, { x: 1, y: 0 })
      expect([s.crystal, p.paid.crystal]).toEqual([20, 0])
    }
  })
  it('plata parțială rămâne în cerc', () => {
    const s = quietGame(); s.crystal = 5; const p = padOf(s, 'turret'); on(s, p)
    stepFor(s, 1); expect([s.crystal, p.paid.crystal, p.lvl]).toEqual([0, 5, 0])
    heroAt(s, 700, 1200); stepFor(s, 1); expect(p.paid.crystal).toBe(5)
  })
  it('fără resurse nu se întâmplă nimic și nimic nu scade sub zero', () => {
    const s = quietGame(); s.crystal = 0; const p = padOf(s, 'turret'); on(s, p)
    stepFor(s, 2); expect([s.crystal, s.metal, p.paid]).toEqual([0, 0, { crystal: 0, metal: 0 }])
  })
  it('după un nivel urmează o pauză de aproximativ o secundă', () => {
    const s = quietGame(); s.crystal = 500; s.metal = 500; const p = padOf(s, 'turret'); on(s, p)
    while (p.lvl === 0) step(s, { x: 0, y: 0 })
    stepFor(s, 0.9); expect(p.paid).toEqual({ crystal: 0, metal: 0 })
    stepFor(s, 0.4); expect(p.paid.crystal + p.paid.metal).toBeGreaterThan(0)
  })
  it('nivelul 2 de turelă ia exact 35 de cristale și 15 de metal', () => {
    const s = quietGame(); s.crystal = 500; s.metal = 500; const p = padOf(s, 'turret'); p.lvl = 1; on(s, p)
    while (p.lvl === 1) step(s, { x: 0, y: 0 })
    expect([s.crystal, s.metal]).toEqual([465, 485])
  })
  it('la nivel maxim nu se mai cheltuie', () => {
    const s = quietGame(); s.crystal = 500; s.metal = 500; const p = padOf(s, 'turret'); p.lvl = 5; on(s, p)
    stepFor(s, 2); expect([s.crystal, s.metal, nextCost(s, p)]).toEqual([500, 500, null])
  })
  it('nivelul eroului dă viață și undă mai tare', () => {
    const s = quietGame(); s.crystal = 25; s.metal = 10; s.hero.hp = 12; on(s, padOf(s, 'hero'))
    stepFor(s, 2); expect([s.hero.lvl, s.hero.hp, heroDamage(s)]).toEqual([2, 80, 16])
  })
  it('colectorul și mina produc singure', () => {
    const s = quietGame(); heroAt(s, 700, 1200)
    const c = padOf(s, 'collector'); c.lvl = 1; c.prodT = 1.6       // ca imediat după construire
    const q = padOf(s, 'mine'); q.lvl = 2; q.prodT = 1.5
    stepFor(s, 16.2); expect([s.crystal, s.metal]).toEqual([30, 10])   // 10 cristale la 1,6 s; 10 de metal la 1,5 s
  })
  it('reparatul schimbă o unitate de metal pe 5 viață și se oprește la plin', () => {
    const s = quietGame(); s.metal = 10; s.core.hp = 380; on(s, padOf(s, 'repair'))
    stepFor(s, 1.5); expect([s.core.hp, s.metal]).toEqual([400, 6])
  })
  it('un erou doborât nu plătește', () => {
    const s = quietGame(); const p = padOf(s, 'turret'); on(s, p); hurtHero(s, 999)
    stepFor(s, 2); expect(s.crystal).toBe(20)
  })
})
