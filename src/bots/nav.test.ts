// Mersul pe harta adevărată, fără nave dușmane (Review Focus 1).
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { CLUSTERS, HOME, PAD_R } from '../data/layout'
import { createGame, type GameState } from '../sim/state'
import { step } from '../sim/step'
import { heroAt, padOf } from '../sim/testkit'
import { createNav, offForeignPad, type Nav } from './nav'

function calm(): GameState {
  const s = createGame(1)
  s.spawnT = 1e9
  return s
}

/** Conduce nava cu `toward` până ajunge; întoarce secundele, sau Infinity dacă n-a ajuns în `limit`. */
function drive(s: GameState, nav: Nav, x: number, y: number, stop: number, limit: number): number {
  const t0 = s.t
  while (s.t - t0 < limit) {
    const input = nav.toward(s, x, y, stop)
    if (input.x === 0 && input.y === 0) return s.t - t0
    step(s, input)
  }
  return Infinity
}

const margin = (d: number) => (d / BALANCE.hero.speed) * 1.6 + 2

describe('mersul', () => {
  const pads = calm().pads
  for (let i = 0; i < pads.length; i++) {
    it(`din HOME ajunge la cercul #${i} (${pads[i]!.kind})`, () => {
      const s = calm(), p = s.pads[i]!, limit = margin(Math.hypot(p.x - HOME.x, p.y - HOME.y))
      const t = drive(s, createNav(), p.x, p.y, PAD_R * 0.4, limit + 1)
      expect(t).toBeLessThanOrEqual(limit)
      expect(Math.hypot(s.hero.x - p.x, s.hero.y - p.y)).toBeLessThanOrEqual(PAD_R * 0.4)
    })
  }

  let first = 0
  for (let c = 0; c < CLUSTERS.length; c++) {
    const at = first
    first += CLUSTERS[c]!.n
    it(`din HOME ajunge la primul nod din grupul #${c} (${CLUSTERS[c]!.type})`, () => {
      const s = calm()
      expect(s.nodes.length).toBe(CLUSTERS.reduce((a, k) => a + k.n, 0))
      const n = s.nodes[at]!, stop = BALANCE.node[n.type].r + BALANCE.hero.r + BALANCE.node.reach - 4
      const limit = margin(Math.hypot(n.x - HOME.x, n.y - HOME.y))
      const t = drive(s, createNav(), n.x, n.y, stop, limit + 1)
      expect(t).toBeLessThanOrEqual(limit)
    })
  }

  it('de la (550, 900) la (550, 600), cu planeta pe drum', () => {
    const s = calm(); heroAt(s, 550, 900)
    const t = drive(s, createNav(), 550, 600, 6, margin(300) + 1)
    expect(t).toBeLessThanOrEqual(margin(300))
  })

  it('o țintă nouă după una atinsă: primul pas e vectorul unitate spre ea', () => {
    const s = calm(); heroAt(s, 550, 900)
    const nav = createNav()
    expect(drive(s, nav, 550, 600, 6, 20)).toBeLessThan(Infinity)   // drumul cu planeta pe el, deci cu ocolire
    const tx = 180, ty = 230, d = Math.hypot(tx - s.hero.x, ty - s.hero.y)
    const input = nav.toward(s, tx, ty, 6)
    expect(input.x).toBeCloseTo((tx - s.hero.x) / d, 12)
    expect(input.y).toBeCloseTo((ty - s.hero.y) / d, 12)
  })

  it('o țintă nouă în mijlocul ocolirii o șterge', () => {
    const s = calm(); heroAt(s, 550, 900)
    const nav = createNav()
    for (let i = 0; i < 40; i++) step(s, nav.toward(s, 550, 600, 6))   // blocat de planetă: a început ocolirea
    const tx = 1000, ty = 1400, d = Math.hypot(tx - s.hero.x, ty - s.hero.y)
    const input = nav.toward(s, tx, ty, 6)
    expect(input.x).toBeCloseTo((tx - s.hero.x) / d, 12)
    expect(input.y).toBeCloseTo((ty - s.hero.y) / d, 12)
  })

  it('pe drum liber, direcția e vectorul unitate spre țintă', () => {
    const s = calm(), nav = createNav()
    const input = nav.toward(s, HOME.x - 30, HOME.y + 40, 6)
    expect(input.x).toBeCloseTo(-0.6, 12)
    expect(input.y).toBeCloseTo(0.8, 12)
  })
})

describe('ieșitul de pe cercurile străine', () => {
  it('în centrul cercului navei, cu altă țintă: o direcție nenulă', () => {
    const s = calm(), p = padOf(s, 'hero'); heroAt(s, p.x, p.y)
    const out = offForeignPad(s, padOf(s, 'turret'))
    expect(out).not.toBeNull()
    expect(Math.hypot(out!.x, out!.y)).toBeCloseTo(1, 12)
  })
  it('la 10 px de centru, dinspre centru', () => {
    const s = calm(), p = padOf(s, 'hero'); heroAt(s, p.x - 6, p.y + 8)
    const out = offForeignPad(s, null)!
    expect(out.x).toBeCloseTo(-0.6, 12)
    expect(out.y).toBeCloseTo(0.8, 12)
  })
  it('și de pe cercul de reparat', () => {
    const s = calm(), p = padOf(s, 'repair'); heroAt(s, p.x + PAD_R + 3, p.y)
    expect(offForeignPad(s, null)).toEqual({ x: 1, y: 0 })
  })
  it('pe ținta lui: null', () => {
    const s = calm(), p = padOf(s, 'hero'); heroAt(s, p.x - 6, p.y + 8)
    expect(offForeignPad(s, p)).toBeNull()
  })
  it('în afara oricărui cerc: null', () => {
    const s = calm()
    expect(offForeignPad(s, null)).toBeNull()
    heroAt(s, padOf(s, 'hero').x + PAD_R + 4, padOf(s, 'hero').y)
    expect(offForeignPad(s, null)).toBeNull()
  })
})
