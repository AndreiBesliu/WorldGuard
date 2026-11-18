import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { CORE } from '../data/layout'
import { createGame, type GameState } from '../sim/state'
import { addFoe, padOf } from '../sim/testkit'
import { bought, chooseGoal, GUARD, nextPad, POLICIES, type BotName, type Policy } from './policy'

const pol = (name: BotName): Policy => POLICIES.find((p) => p.name === name)!

/** Toate turelele la maxim, nava la `heroLvl`. */
function turretsMaxed(s: GameState, heroLvl: number): void {
  for (const p of s.pads) if (p.kind === 'turret') p.lvl = BALANCE.turret.maxLevel
  s.hero.lvl = heroLvl
}

describe('purtările', () => {
  it('sunt cele cinci din design, în ordinea tabelului', () => {
    expect(POLICIES.map((p) => [p.name, p.label, p.still, p.buy])).toEqual([
      ['nimic', 'Nimic', true, []],
      ['amestec', 'Amestec', false, ['turret', 'economy', 'hero']],
      ['doar-nava', 'Doar navă', false, ['hero']],
      ['fara-nava', 'Fără navă', false, ['turret', 'economy']],
      ['fara-economie', 'Fără economie', false, ['turret', 'hero']],
    ])
  })
})

describe('ce cumpără, pe rând', () => {
  it('„Amestec”: prima turelă, colectorul, cercul navei, apoi a doua turelă', () => {
    const s = createGame(1), buy = pol('amestec').buy
    expect(nextPad(s, buy)).toBe(padOf(s, 'turret', 0))
    padOf(s, 'turret', 0).lvl = 1
    expect(nextPad(s, buy)).toBe(padOf(s, 'collector'))
    padOf(s, 'collector').lvl = 1
    expect(nextPad(s, buy)).toBe(padOf(s, 'hero'))
    s.hero.lvl = 2
    expect(nextPad(s, buy)).toBe(padOf(s, 'turret', 1))
  })
  it('la economie, mina când colectorul e mai sus; la egalitate, colectorul', () => {
    const s = createGame(1), buy = ['economy'] as const
    expect(nextPad(s, buy)).toBe(padOf(s, 'collector'))
    padOf(s, 'collector').lvl = 1
    expect(nextPad(s, buy)).toBe(padOf(s, 'mine'))
  })
  it('o categorie fără nimic de cumpărat e sărită; cu totul la maxim, null', () => {
    const s = createGame(1), buy = pol('amestec').buy
    turretsMaxed(s, 2)   // 20 + 1 = 21 cumpărături: rândul turelelor, care nu mai au nimic
    expect(bought(s) % buy.length).toBe(0)
    expect(nextPad(s, buy)).toBe(padOf(s, 'collector'))
    s.hero.lvl = BALANCE.hero.maxLevel
    padOf(s, 'collector').lvl = BALANCE.collector.maxLevel
    padOf(s, 'mine').lvl = BALANCE.mine.maxLevel
    expect(nextPad(s, buy)).toBeNull()
    expect(nextPad(s, [])).toBeNull()
  })
  it('bought: nava 3, turele 2-1-0-0, colector 1, mină 0 fac 6', () => {
    const s = createGame(1)
    s.hero.lvl = 3
    padOf(s, 'turret', 0).lvl = 2
    padOf(s, 'turret', 1).lvl = 1
    padOf(s, 'collector').lvl = 1
    expect(bought(s)).toBe(6)
  })
})

describe('ce face la fiecare pas', () => {
  it('o navă dușmană la 100 de centru: luptă, chiar dacă plata e acoperită', () => {
    const s = createGame(1); s.crystal = 999; s.metal = 999
    const f = addFoe(s, CORE.x + 100, CORE.y)
    expect(chooseGoal(s, pol('amestec'))).toEqual({ kind: 'fight', foe: f })
  })
  it('la GUARD + 50 nu luptă', () => {
    const s = createGame(1); s.crystal = 999; s.metal = 999
    addFoe(s, CORE.x, CORE.y + GUARD + 50)
    expect(chooseGoal(s, pol('amestec')).kind).toBe('pay')
  })
  it('dintre două, cea mai apropiată de centru', () => {
    const s = createGame(1)
    addFoe(s, CORE.x + 110, CORE.y)
    const near = addFoe(s, CORE.x - 80, CORE.y)
    expect(chooseGoal(s, pol('fara-nava'))).toEqual({ kind: 'fight', foe: near })
  })
  it('raza de apărare se poate da', () => {
    const s = createGame(1)
    addFoe(s, CORE.x + 100, CORE.y)
    expect(chooseGoal(s, pol('amestec'), 80).kind).not.toBe('fight')
  })
  it('lipsă 5 cristale și 10 metal: strânge metal, de la cel mai apropiat asteroid nevid', () => {
    const s = createGame(1), p = pol('doar-nava')   // nivelul 2 al navei: 25 cristale și 10 metal; în stoc 20 de cristale
    s.nodes.filter((n) => n.type === 'metal').slice(0, 2).forEach((n) => { n.left = 0; n.regrowAt = 50 })
    const live = s.nodes.filter((n) => n.type === 'metal' && n.left > 0)
    const d = (n: { x: number; y: number }) => Math.hypot(n.x - s.hero.x, n.y - s.hero.y)
    const best = live.reduce((a, b) => (d(b) < d(a) ? b : a))
    expect(chooseGoal(s, p)).toEqual({ kind: 'gather', node: best, pad: padOf(s, 'hero') })
  })
  it('la egalitate, cristalul', () => {
    const s = createGame(1); s.crystal = 0
    const g = chooseGoal(s, pol('amestec'))   // prima turelă: 20 de cristale, lipsesc 20 și 0
    expect(g.kind === 'gather' && g.node.type).toBe('crystal')
  })
  it('cu toți asteroizii goi, cel cu regrowAt cel mai mic (Review Focus 3)', () => {
    const s = createGame(1), metal = s.nodes.filter((n) => n.type === 'metal')
    metal.forEach((n, i) => { n.left = 0; n.regrowAt = 100 + ((i * 7) % metal.length) })
    const first = metal.reduce((a, b) => (b.regrowAt < a.regrowAt ? b : a))
    expect(first.regrowAt).toBe(100)
    expect(chooseGoal(s, pol('doar-nava'))).toEqual({ kind: 'gather', node: first, pad: padOf(s, 'hero') })
  })
  it('stoc suficient: plătește la cercul lui nextPad', () => {
    const s = createGame(1)
    expect(chooseGoal(s, pol('amestec'))).toEqual({ kind: 'pay', pad: padOf(s, 'turret', 0) })
    const h = createGame(1); h.crystal = 15; h.metal = 0
    padOf(h, 'hero').paid = { crystal: 10, metal: 10 }   // a rămas de plătit: 15 cristale
    expect(chooseGoal(h, pol('doar-nava'))).toEqual({ kind: 'pay', pad: padOf(h, 'hero') })
  })
  it('„Nimic” și nava doborâtă: nimic', () => {
    const s = createGame(1)
    addFoe(s, CORE.x + 100, CORE.y)
    expect(chooseGoal(s, pol('nimic'))).toEqual({ kind: 'none' })
    s.hero.dead = true
    expect(chooseGoal(s, pol('amestec'))).toEqual({ kind: 'none' })
  })
  it('„Doar navă” cu nava la nivelul maxim: acasă', () => {
    const s = createGame(1); s.hero.lvl = BALANCE.hero.maxLevel
    expect(chooseGoal(s, pol('doar-nava'))).toEqual({ kind: 'home' })
  })
})
