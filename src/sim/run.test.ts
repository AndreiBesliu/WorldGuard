import { describe, expect, it } from 'vitest'
import { createGame } from './state'
import { createRng } from './rng'
import { spawnFoe } from './foes'
import { step } from './step'
import { quietGame } from './testkit'

describe('partida întreagă', () => {
  it('fără niciun gest, castelul cade între 60 și 130 s', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = createGame(seed)
      while (s.mode === 'playing' && s.t < 200) step(s, { x: 0, y: 0 })
      expect(s.t).toBeGreaterThan(60); expect(s.t).toBeLessThan(130)
    }
  })
  it('aceeași sămânță cu aceleași comenzi dă aceeași stare', () => {
    const play = () => {
      const s = createGame(11); const r = createRng(99, 'comenzi-test'); let dir = { x: 0, y: 0 }
      for (let i = 0; i < 7200 && s.mode === 'playing'; i++) {
        if (i % 120 === 0) { const a = r.next() * Math.PI * 2; dir = { x: Math.cos(a), y: Math.sin(a) } }
        step(s, dir)
      }
      return JSON.stringify(s)
    }
    expect(play()).toBe(play())
  })
  it('un pas cu 150 de dușmani durează în medie sub 1 ms', () => {
    const s = quietGame(); s.tick = 200 * 60; s.t = 200
    for (let i = 0; i < 150; i++) spawnFoe(s)
    s.castle.hp = 1e9
    const t0 = performance.now(); for (let i = 0; i < 600; i++) step(s, { x: 1, y: 0 })
    expect((performance.now() - t0) / 600).toBeLessThan(1)
  })
})
