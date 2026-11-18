// SCHELĂ pentru tema de spațiu: aceeași partidă, înainte și după redenumire. Se șterge la sfârșitul lucrării.
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { createGame, type GameState, type Input, type PadKind, type Res } from './state'
import { hurtHero } from './hero'
import { step } from './step'
import { padOf } from './testkit'

const STILL: Input = { x: 0, y: 0 }
const MARK_EVERY = 1200          // pași: un semn la fiecare 20 s de joc
const r6 = (v: number): number => Math.round(v * 1e6) / 1e6

interface Tour { s: GameState; marks: number[][]; seen: { shot: boolean; down: boolean; brute: boolean; gathered: number; repaired: boolean } }

/** Cifrele unui moment al partidei, în ordine fixă și fără niciun nume al temei. */
function mark(s: GameState): number[] {
  const h = s.hero
  return [
    s.tick, s.castle.hp, s.wood, s.stone, s.kills,
    h.x, h.y, h.hp, h.lvl, h.dead ? 1 : 0,
    ...s.pads.map((p) => p.lvl),
    s.foes.length, s.foes.reduce((a, f) => a + f.hp, 0), s.foes.reduce((a, f) => a + f.x + f.y, 0),
    s.shots.length, s.spawnN, s.nextId, s.nodes.reduce((a, n) => a + n.left, 0),
  ].map(r6)
}

function tick(t: Tour, input: Input): void {
  step(t.s, input)
  if (t.s.shots.length > 0) t.seen.shot = true
  if (t.s.hero.dead) t.seen.down = true
  if (t.s.foes.some((f) => f.brute)) t.seen.brute = true
  if (t.s.tick % MARK_EVERY === 0) t.marks.push(mark(t.s))
}

/** Merge spre (x, y) până ajunge la sub `near` px sau trec `max` secunde. */
function go(t: Tour, x: number, y: number, near = 3, max = 15): void {
  for (let i = 0; i < max * 60; i++) {
    const dx = x - t.s.hero.x, dy = y - t.s.hero.y, d = Math.hypot(dx, dy)
    if (d < near) return
    tick(t, { x: dx / d, y: dy / d })
  }
}

function stay(t: Tour, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) tick(t, STILL)
}

function stayUntil(t: Tour, done: () => boolean, max: number): void {
  for (let i = 0; i < max * 60 && !done(); i++) tick(t, STILL)
}

/** Stă pe al i-lea cerc de felul dat până ajunge la nivelul cerut. */
function build(t: Tour, kind: PadKind, i: number, lvl: number): void {
  const p = padOf(t.s, kind, i)
  go(t, p.x, p.y)
  stayUntil(t, () => (kind === 'hero' ? t.s.hero.lvl : p.lvl) >= lvl, 15)
}

/** Merge la cea mai apropiată resursă plină de felul dat și strânge două secunde. */
function gather(t: Tour, type: Res): void {
  const h = t.s.hero
  const n = t.s.nodes.filter((q) => q.type === type && q.left > 0)
    .sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0]!
  go(t, n.x, n.y, BALANCE.node[type].r + BALANCE.hero.r + 4)
  stay(t, 2)
  if (n.left < BALANCE.node[type].amount) t.seen.gathered += 1
}

function tour(): Tour {
  const t: Tour = { s: createGame(7), marks: [], seen: { shot: false, down: false, brute: false, gathered: 0, repaired: false } }
  const s = t.s
  s.wood = 600; s.stone = 600
  stay(t, 40)                                    // fără apărare, primii dușmani ajung la castel și îl lovesc
  for (let i = 0; i < 4; i++) build(t, 'tower', i, 2)
  build(t, 'camp', 0, 1)
  build(t, 'quarry', 0, 1)
  build(t, 'hero', 0, 2)
  gather(t, 'wood')
  gather(t, 'stone')
  go(t, 470, 800)
  stayUntil(t, () => s.t >= 130, 200)
  hurtHero(s, 1e9)                               // doborât pe loc, ca să treacă și prin reapariție
  stayUntil(t, () => !s.hero.dead, 10)
  const repair = padOf(s, 'repair'), hurt = s.castle.hp
  go(t, repair.x, repair.y)
  stay(t, 2)
  t.seen.repaired = s.castle.hp > hurt
  stayUntil(t, () => s.t >= 200, 200)
  return t
}

// Măsurate pe 2026-11-18 pe codul dinaintea redenumirii (commit 62f8080, regulile de pe main c2bfc36).
// Rândurile nu se ating: după redenumire trebuie să iasă aceleași cifre.
const MARKS: number[][] = [
  [1200, 400, 600, 600, 0, 464, 756, 60, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 49.580417, 4129.328906, 0, 3, 3, 400],
  [2400, 385, 600, 600, 3, 464, 756, 60, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 96.824583, 5673.647233, 0, 8, 8, 400],
  [3600, 343, 392, 540, 11, 674.162962, 918.99608, 60, 1, 0, 2, 2, 2, 1, 0, 0, 0, 0, 3, 59.764167, 2776.039751, 0, 14, 14, 400],
  [4800, 343, 313, 539, 19, 470.213976, 797.454804, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 2, 54.839167, 2430.225618, 0, 21, 21, 387],
  [6000, 343, 325, 548, 26, 470.213976, 797.454804, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 3, 92.376667, 4728.506866, 0, 29, 29, 395],
  [7200, 343, 338, 556, 34, 470.213976, 797.454804, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 4, 136.925833, 4547.5139, 0, 38, 38, 395],
  [8400, 400, 350, 552, 43, 549.389203, 849.332385, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 5, 296.744583, 8492.211044, 0, 48, 48, 395],
  [9600, 400, 363, 559, 51, 549.389203, 849.332385, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 7, 375.5375, 9340.04661, 1, 58, 58, 395],
  [10800, 400, 375, 567, 63, 549.389203, 849.332385, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 7, 566.173333, 8721.949231, 1, 70, 70, 395],
  [12000, 400, 388, 571, 73, 549.389203, 849.332385, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 9, 640.235833, 12752.549271, 1, 82, 82, 395],
]

describe('aceeași partidă, înainte și după redenumire', () => {
  it('turul trece prin tot ce au regulile', () => {
    const { s, seen } = tour()
    for (let i = 0; i < 4; i++) expect(padOf(s, 'tower', i).lvl).toBe(2)
    expect(padOf(s, 'camp').lvl).toBe(1)
    expect(padOf(s, 'quarry').lvl).toBe(1)
    expect(s.hero.lvl).toBe(2)
    expect(seen).toEqual({ shot: true, down: true, brute: true, gathered: 2, repaired: true })
    expect(s.hero.slashT).toBeGreaterThan(0)
    expect(s.kills).toBeGreaterThan(20)
    expect(s.mode).toBe('playing')
  })
  it('cifrele partidei sunt cele măsurate înainte de redenumire', () => {
    expect(tour().marks).toEqual(MARKS)
  })
})
