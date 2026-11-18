// Jucătorii automați în partide întregi (Review Focus 2).
import { describe, expect, it } from 'vitest'
import { createGame, type GameState, type Pad } from '../sim/state'
import { step } from '../sim/step'
import { padOf } from '../sim/testkit'
import { createBot } from './bot'
import { bought, nextPad, POLICIES, type BotName, type Policy } from './policy'
import { RUN_CAP, SEEDS } from './run'

const pol = (name: BotName): Policy => POLICIES.find((p) => p.name === name)!
const lvls = (s: GameState, kind: 'turret' | 'collector' | 'mine') => s.pads.filter((p) => p.kind === kind).map((p) => p.lvl)

/** Ce s-a plătit la cerc, plus nivelul lui (la cercul navei, nivelul navei). */
const paidAt = (s: GameState, q: Pad) => q.paid.crystal + q.paid.metal + (q.kind === 'hero' ? s.hero.lvl : q.lvl) * 1e6

/** Ce trebuie să fie adevărat la sfârșitul partidei, după purtare. */
function ending(p: Policy, s: GameState): string[] {
  const all = [...lvls(s, 'turret'), ...lvls(s, 'collector'), ...lvls(s, 'mine')]
  const bad: string[] = []
  if (p.name === 'fara-nava' && s.hero.lvl !== 1) bad.push(`nava la nivelul ${s.hero.lvl}`)
  if (p.name === 'doar-nava' && (all.some((l) => l > 0) || s.hero.lvl < 2)) bad.push(`nava ${s.hero.lvl}, cercuri ${all.join('')}`)
  if (p.name === 'fara-economie' && [...lvls(s, 'collector'), ...lvls(s, 'mine')].some((l) => l > 0)) bad.push('economie cumpărată')
  if (p.name === 'nimic' && s.hero.moved) bad.push('nava s-a mișcat')
  return bad
}

// Un singur parcurs al celor 100 de partide pentru toate regulile de partidă întreagă.
describe('pe toate semințele: ce cumpără, unde plătește, dacă repară', () => {
  for (const p of POLICIES) {
    it(p.label, () => {
      const bad: string[] = []
      for (const seed of SEEDS) {
        const s = createGame(seed), bot = createBot(p), before = s.pads.map(() => 0)
        while (s.mode === 'playing' && s.t < RUN_CAP && bad.length < 5) {
          const target = nextPad(s, p.buy), hp = s.core.hp
          for (let i = 0; i < s.pads.length; i++) before[i] = paidAt(s, s.pads[i]!)
          step(s, bot(s))
          if (s.core.hp > hp) bad.push(`s${seed} ${s.t.toFixed(2)} s: viața planetei a crescut`)
          for (let i = 0; i < s.pads.length; i++) {
            const q = s.pads[i]!
            if (q !== target && paidAt(s, q) > before[i]!) bad.push(`s${seed} ${s.t.toFixed(2)} s: plată la ${q.kind} (${q.x}, ${q.y})`)
          }
        }
        for (const why of ending(p, s)) bad.push(`s${seed} la sfârșit: ${why}`)
      }
      expect(bad).toEqual([])
    }, 60_000)
  }
})

describe('„Amestec”, sămânța 1', () => {
  it('prima turelă înainte de secunda 8; la secunda 120, cel puțin 4 cumpărături', () => {
    const s = createGame(1), bot = createBot(pol('amestec'))
    let firstAt = Infinity
    while (s.mode === 'playing' && s.t < 120) {
      step(s, bot(s))
      if (firstAt === Infinity && padOf(s, 'turret', 0).lvl >= 1) firstAt = s.t
    }
    expect(firstAt).toBeLessThan(8)
    expect(s.mode).toBe('playing')
    expect(bought(s)).toBeGreaterThanOrEqual(4)
  })
})

describe('un jucător automat doar citește', () => {
  it('JSON.stringify(s) e același înainte și după bot(s)', () => {
    for (const p of POLICIES) {
      const s = createGame(2), bot = createBot(p)
      while (s.mode === 'playing' && s.t < 200) {
        const before = s.tick % 97 === 0 ? JSON.stringify(s) : ''
        const input = bot(s)
        if (before) expect(JSON.stringify(s)).toBe(before)
        step(s, input)
      }
    }
  })
})
