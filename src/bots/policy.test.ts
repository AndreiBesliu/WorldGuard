import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { CORE } from '../data/layout'
import { createGame, type GameState, type Pad } from '../sim/state'
import { addFoe, padOf } from '../sim/testkit'
import { bought, chooseGoal, GUARD, nextPad, POLICIES, type BotName, type Policy } from './policy'

const pol = (name: BotName): Policy => POLICIES.find((p) => p.name === name)!

/** Toate turelele la maxim, nava la `heroLvl`. */
function turretsMaxed(s: GameState, heroLvl: number): void {
  for (const p of s.pads) if (p.kind === 'turret') p.lvl = BALANCE.turret.maxLevel
  s.hero.lvl = heroLvl
}

/** Nava pe centrul cercului, cu plata care curge (`dwell` la prag). */
function onPad(s: GameState, p: Pad): Pad {
  s.hero.x = p.x; s.hero.y = p.y
  p.dwell = BALANCE.pay.dwell
  return p
}

describe('purtările', () => {
  it('sunt cele cinci din design, în ordinea tabelului, plus „Fără turele”, doar tipărit', () => {
    expect(POLICIES.map((p) => [p.name, p.label, p.still, p.buy])).toEqual([
      ['nimic', 'Nimic', true, []],
      ['amestec', 'Amestec', false, ['turret', 'economy', 'hero']],
      ['doar-nava', 'Doar navă', false, ['hero']],
      ['fara-nava', 'Fără navă', false, ['turret', 'economy']],
      ['fara-economie', 'Fără economie', false, ['turret', 'hero']],
      ['fara-turele', 'Fără turele', false, ['economy', 'hero']],
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
    s.hero.xp = 6
    expect(nextPad(s, buy)).toBe(padOf(s, 'hero'))
    s.hero.lvl = 2; s.hero.xp = 0
    expect(nextPad(s, buy)).toBe(padOf(s, 'turret', 1))
  })
  it('„Amestec” sare peste cercul navei sub pragul de experiență și îl alege când pragul e atins', () => {
    const s = createGame(1), buy = pol('amestec').buy
    padOf(s, 'turret', 0).lvl = 1
    padOf(s, 'collector').lvl = 1   // rândul navei
    s.hero.xp = 5
    expect(nextPad(s, buy)).toBe(padOf(s, 'turret', 1))
    s.hero.xp = 6
    expect(nextPad(s, buy)).toBe(padOf(s, 'hero'))
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
  it('plata care curge se termină: nava devine gata la mijlocul plății unei turele, ținta rămâne turela (R7)', () => {
    const s = createGame(1), buy = pol('amestec').buy, t = onPad(s, padOf(s, 'turret', 0))
    s.crystal = 30; s.metal = 30
    t.paid = { crystal: 5, metal: 0 }
    expect(nextPad(s, buy)).toBe(t)
    s.hero.xp = 6                                   // gata și plătibilă: fără plata care curge, ținta ar fi nava
    expect(nextPad(s, buy)).toBe(t)
    expect(chooseGoal(s, pol('amestec'))).toEqual({ kind: 'pay', pad: t })
    t.lvl = 1; t.paid = { crystal: 0, metal: 0 }; t.dwell = -BALANCE.pay.restAfterLevel   // nivelul turelei s-a încheiat, ca în `finishLevel`
    expect(nextPad(s, buy)).toBe(padOf(s, 'hero'))
  })
  it('plata care curge se oprește când stocul nu mai poate plăti nimic din ce a rămas (R7)', () => {
    const s = createGame(1), buy = pol('amestec').buy, t = onPad(s, padOf(s, 'turret', 0))
    t.paid = { crystal: 5, metal: 0 }; s.hero.xp = 6
    s.crystal = 25; s.metal = 10
    expect(nextPad(s, buy)).toBe(t)
    t.lvl = 1; t.paid = { crystal: 0, metal: 15 }; s.crystal = 0   // nivelul 2: rămân 35 de cristale, stocul n-are niciunul
    expect(nextPad(s, buy)).toBe(padOf(s, 'collector'))             // fără plata ținută: rândul, adică economia
  })
  it('plata care curge nu se mută nici când nava trece pragul fără să fie plătibilă (R7)', () => {
    const s = createGame(1), buy = pol('amestec').buy
    padOf(s, 'turret', 0).lvl = 1; padOf(s, 'collector').lvl = 1   // rândul navei, nava nu e gata: turela a doua
    const t = onPad(s, padOf(s, 'turret', 1)); t.paid = { crystal: 3, metal: 0 }; s.crystal = 10; s.metal = 0
    expect(nextPad(s, buy)).toBe(t)
    s.hero.xp = 6                                    // gata, dar stocul nu acoperă nivelul: rândul ar trece la navă
    expect(nextPad(s, buy)).toBe(t)
    t.dwell = 0                                      // a ieșit din cerc
    expect(nextPad(s, buy)).toBe(padOf(s, 'hero'))
  })
  it('ținută la o turelă, plata cedează în fața luptei; ținută la cercul navei gata, nu (R7)', () => {
    const s = createGame(1), t = onPad(s, padOf(s, 'turret', 0)); s.crystal = 30; s.metal = 30
    const f = addFoe(s, CORE.x + 100, CORE.y)
    expect(chooseGoal(s, pol('amestec'))).toEqual({ kind: 'fight', foe: f })
    t.dwell = 0
    const h = onPad(s, padOf(s, 'hero')); s.hero.xp = 6
    expect(chooseGoal(s, pol('amestec'))).toEqual({ kind: 'pay', pad: h })
  })
  it('nava doar trece peste cerc (`dwell` sub prag): plata nu e ținută', () => {
    const s = createGame(1), buy = pol('amestec').buy, t = onPad(s, padOf(s, 'turret', 0))
    t.dwell = BALANCE.pay.dwell - 1 / 60; s.crystal = 30; s.metal = 30; s.hero.xp = 6
    expect(nextPad(s, buy)).toBe(padOf(s, 'hero'))
  })
  it('un cerc din afara categoriilor purtării nu e ținut; fără nimic de cumpărat, null (R8)', () => {
    const s = createGame(1); s.crystal = 30; s.metal = 30; s.hero.xp = 6
    onPad(s, padOf(s, 'hero')); padOf(s, 'hero').paid = { crystal: 3, metal: 0 }
    expect(nextPad(s, pol('amestec').buy)).toBe(padOf(s, 'hero'))
    expect(nextPad(s, ['turret', 'economy'])).toBe(padOf(s, 'turret', 0))
    expect(nextPad(s, [])).toBeNull()
  })
  it('cercul de reparat nu e ținut niciodată', () => {
    const s = createGame(1), buy = pol('amestec').buy
    onPad(s, padOf(s, 'repair')); s.metal = 30; s.core.hp = 100
    expect(nextPad(s, buy)).toBe(padOf(s, 'turret', 0))
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
    const s = createGame(1), p = pol('doar-nava')   // nivelul 4 al navei: 25 cristale și 10 metal; în stoc 20 de cristale
    s.hero.lvl = 3; s.hero.xp = 11
    s.nodes.filter((n) => n.type === 'metal').slice(0, 2).forEach((n) => { n.left = 0; n.regrowAt = 50 })
    const live = s.nodes.filter((n) => n.type === 'metal' && n.left > 0)
    const d = (n: { x: number; y: number }) => Math.hypot(n.x - s.hero.x, n.y - s.hero.y)
    const best = live.reduce((a, b) => (d(b) < d(a) ? b : a))
    expect(chooseGoal(s, p)).toEqual({ kind: 'gather', node: best, pad: padOf(s, 'hero') })
  })
  it('lipsă 10 cristale și 5 metal: strânge cristal (lipsa mai mare câștigă, nu orice lipsă de metal)', () => {
    const s = createGame(1), p = pol('doar-nava')   // nivelul 4 al navei: 25 cristale și 10 metal; în stoc 15 și 5
    s.hero.lvl = 3; s.hero.xp = 11; s.crystal = 15; s.metal = 5
    const g = chooseGoal(s, p)
    expect(g.kind === 'gather' && g.node.type).toBe('crystal')
  })
  it('la egalitate, cristalul', () => {
    const s = createGame(1); s.crystal = 0
    const g = chooseGoal(s, pol('amestec'))   // prima turelă: 20 de cristale, lipsesc 20 și 0
    expect(g.kind === 'gather' && g.node.type).toBe('crystal')
  })
  it('cu toți asteroizii goi, cel cu regrowAt cel mai mic (Review Focus 3)', () => {
    const s = createGame(1), metal = s.nodes.filter((n) => n.type === 'metal')
    s.hero.lvl = 2; s.hero.xp = 9                    // nivelul 3: 20 cristale și 5 metal; în stoc 20 cristale, lipsește metalul
    metal.forEach((n, i) => { n.left = 0; n.regrowAt = 100 + ((i * 7) % metal.length) })
    const first = metal.reduce((a, b) => (b.regrowAt < a.regrowAt ? b : a))
    expect(first.regrowAt).toBe(100)
    expect(chooseGoal(s, pol('doar-nava'))).toEqual({ kind: 'gather', node: first, pad: padOf(s, 'hero') })
  })
  it('stoc suficient: plătește la cercul lui nextPad', () => {
    const s = createGame(1)
    expect(chooseGoal(s, pol('amestec'))).toEqual({ kind: 'pay', pad: padOf(s, 'turret', 0) })
    const h = createGame(1); h.crystal = 15; h.metal = 0; h.hero.xp = 6
    padOf(h, 'hero').paid = { crystal: 10, metal: 10 }   // a rămas de plătit: 15 cristale
    expect(chooseGoal(h, pol('doar-nava'))).toEqual({ kind: 'pay', pad: padOf(h, 'hero') })
  })
  it('nava gata și plătibilă: plata la cercul navei trece înaintea luptei (R4)', () => {
    const s = createGame(1); s.crystal = 999; s.metal = 999; s.hero.xp = 6
    addFoe(s, CORE.x + 100, CORE.y)
    expect(chooseGoal(s, pol('amestec'))).toEqual({ kind: 'pay', pad: padOf(s, 'hero') })
    expect(chooseGoal(s, pol('doar-nava'))).toEqual({ kind: 'pay', pad: padOf(s, 'hero') })
  })
  it('nava gata fără stoc destul, sau stoc destul sub prag: luptă', () => {
    const poor = createGame(1); poor.crystal = 0; poor.metal = 0; poor.hero.xp = 6
    const f = addFoe(poor, CORE.x + 100, CORE.y)
    expect(chooseGoal(poor, pol('amestec'))).toEqual({ kind: 'fight', foe: f })
    const early = createGame(1); early.crystal = 999; early.metal = 999; early.hero.xp = 5
    const g = addFoe(early, CORE.x + 100, CORE.y)
    expect(chooseGoal(early, pol('amestec'))).toEqual({ kind: 'fight', foe: g })
  })
  it('nextPad: cercul navei când e gata și plătibilă, chiar dacă rândul e al turelelor; „Fără navă” neschimbat', () => {
    const s = createGame(1), buy = pol('amestec').buy; s.crystal = 999; s.metal = 999
    expect(bought(s) % buy.length).toBe(0)   // rândul turelelor
    expect(nextPad(s, buy)).toBe(padOf(s, 'turret', 0))
    s.hero.xp = 6
    expect(nextPad(s, buy)).toBe(padOf(s, 'hero'))
    expect(nextPad(s, pol('fara-nava').buy)).toBe(padOf(s, 'turret', 0))
    addFoe(s, CORE.x + 100, CORE.y)
    expect(chooseGoal(s, pol('fara-nava')).kind).toBe('fight')
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
