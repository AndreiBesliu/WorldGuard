import { describe, expect, it } from 'vitest'
import { createGame } from './state'
import { createRng } from './rng'
import { spawnFoe } from './foes'
import { choose } from './mods'
import { step } from './step'
import { heroAt, padOf, quietGame } from './testkit'

describe('partida întreagă', () => {
  it('aceeași sămânță cu aceleași comenzi și aceleași alegeri dă aceeași stare', () => {
    const play = () => {
      const s = createGame(11); const r = createRng(99, 'comenzi-test'); const pick = createRng(99, 'alegeri-test')
      let dir = { x: 0, y: 0 }, chosen = 0
      const pad = padOf(s, 'hero')
      heroAt(s, pad.x, pad.y); s.hero.xp = 16; s.crystal = 999; s.metal = 999   // nava urcă două niveluri pe cercul ei
      while (s.tick < 7200 && s.mode === 'playing') {
        if (s.offer !== null) { expect(choose(s, pick.int(s.offer.length)).ok).toBe(true); chosen++; continue }
        const i = s.tick
        if (i < 360) dir = { x: 0, y: 0 }
        else if (i % 120 === 0) { const a = r.next() * Math.PI * 2; dir = { x: Math.cos(a), y: Math.sin(a) } }
        step(s, dir)
      }
      expect(s.hero.lvl).toBeGreaterThanOrEqual(3)
      expect(chosen).toBe(s.hero.lvl - 1)
      return JSON.stringify(s)
    }
    expect(play()).toBe(play())
  })
  it('un pas cu 150 de dușmani durează în medie sub 1 ms', () => {
    const s = quietGame(); s.tick = 200 * 60; s.t = 200
    for (let i = 0; i < 150; i++) spawnFoe(s)
    s.core.hp = 1e9
    const t0 = performance.now(); for (let i = 0; i < 600; i++) step(s, { x: 1, y: 0 })
    expect((performance.now() - t0) / 600).toBeLessThan(1)
  })
  it('la fel cu nava purtând cele trei arme la treapta 3', () => {
    const s = quietGame(); s.tick = 200 * 60; s.t = 200
    s.hero.lvl = 9
    s.hero.mods = [{ id: 'wave', tier: 3, t: 0 }, { id: 'laser', tier: 3, t: 0 }, { id: 'missile', tier: 3, t: 0 }]
    for (let i = 0; i < 150; i++) spawnFoe(s)
    s.core.hp = 1e9
    const t0 = performance.now(); for (let i = 0; i < 600; i++) step(s, { x: 1, y: 0 })
    expect(s.hero.mods.every((m) => m.tier === 3)).toBe(true)
    expect((performance.now() - t0) / 600).toBeLessThan(1)
  })
})
