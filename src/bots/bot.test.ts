// Jucătorii automați în partide întregi (Review Focus 2).
import { describe, expect, it } from 'vitest'
import { createGame, type GameState, type Pad } from '../sim/state'
import { step } from '../sim/step'
import { padOf } from '../sim/testkit'
import { choose } from '../sim/mods'
import { createBot } from './bot'
import { bought, nextPad, pickOffer, POLICIES, type BotName, type Policy } from './policy'
import { playStep, RUN_CAP, SEEDS } from './run'

describe('alegerea ofertei', () => {
  const PREFER = ['laser', 'armor', 'relay', 'wave', 'missile', 'shield', 'mender', 'engine', 'magnet']
  it('aceeași listă pentru toate purtările', () => {
    for (const p of POLICIES) expect(p.prefer).toEqual(PREFER)
  })
  it('pickOffer alege prima ofertă al cărei modul e cel mai sus pe listă', () => {
    const s = createGame(1), p = pol('amestec')
    s.offer = [{ id: 'magnet', tier: 1 }, { id: 'wave', tier: 2 }, { id: 'armor', tier: 1 }]
    expect(pickOffer(s, p)).toBe(2)
    s.offer = [{ id: 'magnet', tier: 1 }, { id: 'engine', tier: 1 }, { id: 'wave', tier: 2 }]
    expect(pickOffer(s, p)).toBe(2)
    s.offer = [{ id: 'magnet', tier: 1 }, { id: 'engine', tier: 1 }]
    expect(pickOffer(s, p)).toBe(1)
  })
  it('fără ofertă, sau cu niciun modul pe listă: 0', () => {
    const s = createGame(1), p = { ...pol('amestec'), prefer: ['laser'] as const }
    expect(pickOffer(s, p)).toBe(0)
    s.offer = [{ id: 'magnet', tier: 1 }, { id: 'engine', tier: 1 }]
    expect(pickOffer(s, p)).toBe(0)
  })
})

const pol = (name: BotName): Policy => POLICIES.find((p) => p.name === name)!
const lvls = (s: GameState, kind: 'turret' | 'collector' | 'mine') => s.pads.filter((p) => p.kind === kind).map((p) => p.lvl)

/** Ce s-a plătit la cerc, plus nivelul lui (la cercul navei, nivelul navei). */
const paidAt = (s: GameState, q: Pad) => q.paid.crystal + q.paid.metal + (q.kind === 'hero' ? s.hero.lvl : q.lvl) * 1e6

/** Ce trebuie să fie adevărat la sfârșitul partidei, după purtare. */
function ending(p: Policy, s: GameState): string[] {
  const all = [...lvls(s, 'turret'), ...lvls(s, 'collector'), ...lvls(s, 'mine')]
  const bad: string[] = []
  if (p.name === 'fara-nava' && s.hero.lvl !== 1) bad.push(`nava la nivelul ${s.hero.lvl}`)
  if (p.name === 'fara-nava' && JSON.stringify(s.hero.mods.map((m) => [m.id, m.tier])) !== '[["wave",1]]') bad.push('nava are alte module decât Unda')
  if (p.name === 'doar-nava' && (all.some((l) => l > 0) || s.hero.lvl < 2)) bad.push(`nava ${s.hero.lvl}, cercuri ${all.join('')}`)
  if (p.name === 'fara-economie' && [...lvls(s, 'collector'), ...lvls(s, 'mine')].some((l) => l > 0)) bad.push('economie cumpărată')
  if (p.name === 'fara-turele' && lvls(s, 'turret').some((l) => l > 0)) bad.push(`turele cumpărate: ${lvls(s, 'turret').join('')}`)
  if (p.name === 'nimic' && s.hero.moved) bad.push('nava s-a mișcat')
  return bad
}

// Cel mai lung șir de pași la rând pe un cerc străin care numără (`dwell > 0`). Plata pornește după
// `BALANCE.pay.dwell` (21 de pași), deci rămân 11 pași de rezervă.
const FOREIGN_STEPS = 10

// Un singur parcurs al celor 120 de partide pentru toate regulile de partidă întreagă.
describe('pe toate semințele: ce cumpără, unde plătește, dacă repară', () => {
  for (const p of POLICIES) {
    it(p.label, () => {
      const bad: string[] = []
      for (const seed of SEEDS) {
        const s = createGame(seed), bot = createBot(p), before = s.pads.map(() => 0), on = s.pads.map(() => 0)
        while (s.mode === 'playing' && s.t < RUN_CAP && bad.length < 5) {
          if (s.offer !== null) { playStep(s, p, bot); continue }   // alegerea, ca în playOne; nu e un pas
          const target = nextPad(s, p.buy), hp = s.core.hp
          for (let i = 0; i < s.pads.length; i++) before[i] = paidAt(s, s.pads[i]!)
          step(s, bot(s))
          if (s.core.hp > hp) bad.push(`s${seed} ${s.t.toFixed(2)} s: viața planetei a crescut`)
          for (let i = 0; i < s.pads.length; i++) {
            const q = s.pads[i]!
            if (q !== target && paidAt(s, q) > before[i]!) bad.push(`s${seed} ${s.t.toFixed(2)} s: plată la ${q.kind} (${q.x}, ${q.y})`)
            on[i] = q !== target && q.dwell > 0 ? on[i]! + 1 : 0
            if (on[i] === FOREIGN_STEPS + 1) bad.push(`s${seed} ${s.t.toFixed(2)} s: peste ${FOREIGN_STEPS} pași pe ${q.kind} (${q.x}, ${q.y})`)
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
      playStep(s, pol('amestec'), bot)
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
        if (s.offer !== null) {                       // pickOffer citește și el doar
          const before = JSON.stringify(s)
          const i = pickOffer(s, p)
          expect(JSON.stringify(s)).toBe(before)
          choose(s, i)
          continue
        }
        const before = s.tick % 97 === 0 ? JSON.stringify(s) : ''
        const input = bot(s)
        if (before) expect(JSON.stringify(s)).toBe(before)
        step(s, input)
      }
    }
  })
})
