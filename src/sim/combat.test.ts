import { describe, expect, it } from 'vitest'
import type { GameState } from './state'
import { hurtHero } from './hero'
import { addFoe, heroAt, padOf, quietGame, stepFor } from './testkit'

const turret = (s: GameState, lvl = 1) => { const p = padOf(s, 'turret'); p.lvl = lvl; return p }
const dummy = (s: GameState, x: number, y: number) => addFoe(s, x, y, { hp: 1000, maxHp: 1000, speed: 0, dmg: 0 })

describe('lupta', () => {
  it('tureta trage la 0,8 s, cu 6 pe rază', () => {
    const s = quietGame(); heroAt(s, 100, 100); const p = turret(s); const f = dummy(s, p.bx + 100, p.by)
    stepFor(s, 1 / 60); expect(s.shots).toHaveLength(1)
    stepFor(s, 4.5); expect(f.hp).toBe(1000 - 6 * 6)
  })
  it('nivelul 3 lovește cu 16; la 191 de unități nu trage', () => {
    const s = quietGame(); heroAt(s, 100, 100); const p = turret(s, 3); const f = dummy(s, p.bx + 100, p.by)
    stepFor(s, 0.5); expect(f.hp).toBe(984)
    const far = quietGame(); heroAt(far, 100, 100); const q = turret(far); dummy(far, q.bx - 191, q.by)
    stepFor(far, 2); expect(far.shots).toEqual([])
  })
  it('alege cel mai apropiat dușman, iar raza rămasă fără țintă dispare', () => {
    const s = quietGame(); heroAt(s, 100, 100); const p = turret(s)
    const near = dummy(s, p.bx + 50, p.by); const other = dummy(s, p.bx + 120, p.by)
    stepFor(s, 1 / 60); expect(s.shots[0]!.targetId).toBe(near.id)
    near.hp = 0; stepFor(s, 1.2)             // a doua rază pleacă la 0,8 s, spre celălalt
    expect(s.shots.every((x) => x.targetId !== near.id)).toBe(true)
    expect(other.hp).toBe(1000 - 6)        // prima rază, rămasă fără țintă, nu l-a atins
  })
  it('eroul trimite singur unda la 0,45 s și împinge', () => {
    const s = quietGame(); heroAt(s, 300, 300); const f = dummy(s, 340, 300)
    stepFor(s, 1 / 60); expect(f.hp).toBe(990)
    stepFor(s, 0.1); expect(f.x).toBeGreaterThan(341)
    stepFor(s, 0.4); expect(f.hp).toBe(980)
  })
  it('lovește doar în arcul din jurul celui mai apropiat', () => {
    const s = quietGame(); heroAt(s, 300, 300)
    const front = dummy(s, 340, 300); const side = dummy(s, 335, 320); const back = dummy(s, 255, 300)
    stepFor(s, 1 / 60)
    expect([front.hp, side.hp, back.hp]).toEqual([990, 990, 1000])
  })
  it('dincolo de raza undei nu lovește; doborât, nu lovește', () => {
    const s = quietGame(); heroAt(s, 300, 300); const f = dummy(s, 300 + 58 + 10 + 1, 300)
    stepFor(s, 1); expect(f.hp).toBe(1000)
    const d = quietGame(); heroAt(d, 300, 300); const g = dummy(d, 340, 300); hurtHero(d, 999)
    stepFor(d, 1); expect(g.hp).toBe(1000)
  })
})
