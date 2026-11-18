// Jucătorii automați în partide întregi (Review Focus 2).
import { describe, expect, it } from 'vitest'
import { createGame, type GameState } from '../sim/state'
import { step } from '../sim/step'
import { padOf } from '../sim/testkit'
import { createBot } from './bot'
import { bought, POLICIES, type BotName, type Policy } from './policy'
import { playOne } from './run'

const pol = (name: BotName): Policy => POLICIES.find((p) => p.name === name)!
const lvls = (s: GameState, kind: 'turret' | 'collector' | 'mine') => s.pads.filter((p) => p.kind === kind).map((p) => p.lvl)

describe('ce cumpără fiecare, într-o partidă întreagă', () => {
  for (const seed of [1, 2, 3]) {
    it(`sămânța ${seed}`, () => {
      expect(playOne(pol('fara-nava'), seed).hero.lvl).toBe(1)
      const d = playOne(pol('doar-nava'), seed)
      expect([...lvls(d, 'turret'), ...lvls(d, 'collector'), ...lvls(d, 'mine')]).toEqual([0, 0, 0, 0, 0, 0])
      expect(d.hero.lvl).toBeGreaterThan(1)
      const e = playOne(pol('fara-economie'), seed)
      expect([...lvls(e, 'collector'), ...lvls(e, 'mine')]).toEqual([0, 0])
      expect(playOne(pol('nimic'), seed).hero.moved).toBe(false)
    })
  }

  it('niciunul nu repară planeta (sămânța 1)', () => {
    for (const p of POLICIES) {
      const s = createGame(1), bot = createBot(p)
      let ups = 0, hp = s.core.hp
      while (s.mode === 'playing' && s.t < 900) {
        step(s, bot(s))
        if (s.core.hp > hp) ups++
        hp = s.core.hp
      }
      expect([p.name, ups]).toEqual([p.name, 0])
    }
  })
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
