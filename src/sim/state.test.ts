import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { CLUSTERS, HOME, PAD_R } from '../data/layout'
import { createGame } from './state'
import { step } from './step'

describe('starea de pornire', () => {
  it('starea de pornire', () => {
    const s = createGame(1)
    expect(s).toMatchObject({ mode: 'playing', tick: 0, t: 0, wood: 20, stone: 0, kills: 0, spawnT: 10, spawnN: 0 })
    expect(s.castle.hp).toBe(400)
    expect(s.hero).toMatchObject({ x: 464, y: 756, hp: 60, lvl: 1, dead: false })
    expect([s.foes, s.shots, s.fx]).toEqual([[], [], []])
  })
  it('resursele: 35 de copaci și 20 de stânci, pline, în grupurile lor', () => {
    const s = createGame(1)
    for (const c of CLUSTERS) {
      const inside = s.nodes.filter((n) => n.type === c.type && Math.hypot(n.x - c.x, n.y - c.y) <= c.rad + 1e-6)
      expect(inside.length).toBe(c.n)
    }
    expect(s.nodes.filter((n) => n.type === 'wood').every((n) => n.left === 8)).toBe(true)
    expect(s.nodes.filter((n) => n.type === 'stone').every((n) => n.left === 6)).toBe(true)
    for (const a of s.nodes) for (const b of s.nodes) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(36)
  })
  it('harta e aceeași la orice sămânță', () => {
    expect(createGame(1).nodes).toEqual(createGame(2).nodes)
  })
  it('cercurile din spec', () => {
    const at = createGame(1).pads.map((p) => [p.kind, p.x, p.y, p.bx, p.by])
    expect(at).toEqual([
      ['tower', 425, 669, 425, 625], ['tower', 675, 669, 675, 625], ['tower', 425, 919, 425, 875], ['tower', 675, 919, 675, 875],
      ['camp', 300, 776, 300, 730], ['quarry', 650, 438, 650, 392], ['hero', 550, 600, 550, 600], ['repair', 550, 850, 550, 850],
    ])
  })
  it('geometrie: cercurile nu se ating, nu acoperă resurse, iar reapariția nu cade pe un cerc', () => {
    const s = createGame(1)
    for (const a of s.pads) {
      for (const b of s.pads) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(2 * PAD_R)
      for (const n of s.nodes) expect(Math.hypot(a.x - n.x, a.y - n.y)).toBeGreaterThan(PAD_R + BALANCE.node[n.type].r)
      expect(Math.hypot(a.x - HOME.x, a.y - HOME.y)).toBeGreaterThan(PAD_R + BALANCE.hero.r)
    }
  })
  it('un pas înseamnă 1/60 s, iar o partidă terminată nu mai avansează', () => {
    const s = createGame(1)
    step(s, { x: 0, y: 0 })
    expect([s.tick, s.t]).toEqual([1, 1 / 60])
    s.mode = 'over'
    step(s, { x: 0, y: 0 })
    expect(s.tick).toBe(1)
  })
})
