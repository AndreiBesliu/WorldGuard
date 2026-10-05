import { describe, expect, it } from 'vitest'
import { COMBINARE, TOWERS, TOWER_TYPES, type TowerType } from '../data/towers'
import {
  applyDecision,
  checkCombine,
  combinedContacts,
  fingerprint,
  groupOf,
  groupReload,
  isCombined,
  newGame,
  step,
  towerGroups,
  type Enemy,
  type GameState,
} from './game'
import { must } from './testkit'

// Arena: drumul drept de la (-9,0) la (9,0) (indicele i e hexagonul (i − 9, 0)), câmpie peste tot, aur cât trebuie,
// fără ocol obligatoriu. Hexagoanele de pe rândul r = −1 sunt lângă drum și vecine între ele.
function arena(): GameState {
  const s = newGame(7)
  const terrain = new Map([...s.map.terrain].map(([k]) => [k, 'campie' as const]))
  return { ...s, map: { ...s.map, terrain }, aur: 10_000, ocoluriPeVal: 0 }
}

const build = (s: GameState, ...towers: [TowerType, string][]): GameState =>
  towers.reduce((cur, [tip, hex]) => must(cur, { tip: 'turn', turn: tip, hex }), s)

/** Un val „oprit”: inamicii dați, și unul programat departe, ca valul să nu se încheie. */
const inWave = (s: GameState, inamici: Enemy[]): GameState => ({ ...s, faza: 'val', inamici, deGenerat: [{ tick: 1_000_000, tip: 'normal' }], urmatorulId: 100 })

/** Un inamic normal (fără armură) pe hexagonul de drum `i`, cu multă viață ca să nu moară. */
const foe = (id: number, i: number, viata = 5000): Enemy => ({ id, tip: 'normal', viata, progres: i * 1000, stari: {} })

const reason = (r: ReturnType<typeof applyDecision>): string => (r.ok ? 'ok' : r.reason)

describe('grupurile de turnuri', () => {
  it('un grup = turnurile vecine, de orice tip, legate din aproape în aproape; în ordinea id-urilor', () => {
    // (0,-1)–(1,-1)–(2,-1) e un lanț: capetele nu sunt vecine, dar sunt în același grup. (5,-1) e singur.
    const s = build(arena(), ['fulger', '2,-1'], ['fizic', '0,-1'], ['foc', '5,-1'], ['frig', '1,-1'])
    expect(towerGroups(s.turnuri).map((g) => g.map((t) => t.id))).toEqual([[1, 2, 4], [3]])
    expect(groupOf(s.turnuri, 4).map((t) => t.id)).toEqual([1, 2, 4])
    expect(groupOf(s.turnuri, 99)).toEqual([])
  })

  it('un turn nou pornește individual; comutarea pune tot grupul pe combinat și intră în jurnal', () => {
    let s = build(arena(), ['fizic', '0,-1'], ['fulger', '1,-1'])
    expect(s.turnuri.map((t) => t.combinat)).toEqual([false, false])
    s = must(s, { tip: 'tintire', turn: 2, mod: 'slab' })
    s = must(s, { tip: 'combina', turn: 2, activ: true })
    expect(s.jurnal.at(-1)!.d).toEqual({ tip: 'combina', turn: 2, activ: true })
    expect(s.turnuri.map((t) => t.combinat)).toEqual([true, true])
    // Ținta grupului e a liderului (cel mai mic id), nu a turnului pe care s-a apăsat.
    expect(s.turnuri.map((t) => t.tintire)).toEqual(['primul', 'primul'])
    s = must(s, { tip: 'combina', turn: 1, activ: false })
    expect(s.turnuri.map((t) => t.combinat)).toEqual([false, false])
  })

  it('refuzurile spun de ce', () => {
    const s = build(arena(), ['fizic', '0,-1'], ['fulger', '1,-1'], ['foc', '5,-1'])
    expect(reason(applyDecision(s, { tip: 'combina', turn: 3, activ: true }))).toMatch(/n-are vecini/)
    expect(reason(applyDecision(s, { tip: 'combina', turn: 9, activ: true }))).toBe('nu există turnul 9')
    expect(reason(applyDecision(s, { tip: 'combina', turn: 1, activ: false }))).toMatch(/trag deja fiecare singur/)
    const c = must(s, { tip: 'combina', turn: 1, activ: true })
    expect(reason(applyDecision(c, { tip: 'combina', turn: 2, activ: true }))).toBe('grupul e deja combinat')
    expect(reason(applyDecision({ ...c, faza: 'pierdut' }, { tip: 'combina', turn: 1, activ: false }))).toBe('partida s-a încheiat')
    // Un refuz nu intră în jurnal.
    expect(applyDecision(s, { tip: 'combina', turn: 3, activ: true }).ok).toBe(false)
    expect(s.jurnal.filter((l) => l.d.tip === 'combina')).toHaveLength(0)
  })

  it('focul și frigul sunt incompatibile: un grup cu amândouă nu se poate combina (decis de owner)', () => {
    const s = build(arena(), ['foc', '0,-1'], ['fizic', '1,-1'], ['frig', '2,-1'])
    expect(checkCombine(s, 2, true)).toEqual({ ok: false, reason: 'Foc și Frig sunt incompatibile — un grup cu amândouă nu se poate combina' })
    // Fără Frig, același grup se combină.
    const fara = build(arena(), ['foc', '0,-1'], ['fizic', '1,-1'])
    expect(checkCombine(fara, 2, true).ok).toBe(true)
  })

  it('un turn nou lângă un grup combinat intră în grup și îi ia ținta', () => {
    let s = build(arena(), ['fizic', '0,-1'], ['fulger', '1,-1'])
    s = must(s, { tip: 'combina', turn: 1, activ: true })
    s = must(s, { tip: 'tintire', turn: 1, mod: 'puternic' })
    s = build(s, ['foc', '2,-1'])
    expect(s.turnuri.map((t) => [t.id, t.combinat, t.tintire])).toEqual([
      [1, true, 'puternic'],
      [2, true, 'puternic'],
      [3, true, 'puternic'],
    ])
  })

  it('…dar dacă aduce o pereche incompatibilă sau leagă grupul de turnuri individuale, grupul unit trage individual', () => {
    let s = build(arena(), ['fizic', '0,-1'], ['foc', '1,-1'])
    s = must(s, { tip: 'combina', turn: 1, activ: true })
    // Frig lângă un grup combinat cu Foc: nu intră, iar grupul unit trece pe individual (nu rămâne combinat pe ascuns).
    const incompat = build(s, ['frig', '-1,-1'])
    expect(incompat.turnuri.map((t) => t.combinat)).toEqual([false, false, false])
    // Un turn care leagă grupul combinat de un turn singur (individual): tot grupul unit e individual.
    const punte = build(build(s, ['fulger', '3,-1']), ['fulger', '2,-1'])
    expect(towerGroups(punte.turnuri)).toHaveLength(1)
    expect(punte.turnuri.map((t) => t.combinat)).toEqual([false, false, false, false])
    // Un turn lângă turnuri individuale rămâne individual.
    const lang = build(build(arena(), ['fizic', '0,-1']), ['foc', '1,-1'])
    expect(lang.turnuri.map((t) => t.combinat)).toEqual([false, false])
  })
})

describe('lovitura combinată', () => {
  it('datele: fiecare element de turn are un loc în ordine, iar perechile incompatibile sunt tipuri care există', () => {
    for (const tip of TOWER_TYPES) expect(COMBINARE.ordine).toContain(TOWERS[tip].element)
    for (const [a, b] of COMBINARE.incompatibile) {
      expect(TOWERS[a]).toBeDefined()
      expect(TOWERS[b]).toBeDefined()
    }
  })

  it('fiecare turn dă ce ar fi dat singur într-o reîncărcare a grupului, plus bonusul pe elemente; în ordinea fixă', () => {
    // Fizic 40 la 30 de tick-uri, Fulger 36 la 24: grupul trage la 30; Fulger ar fi dat 36 × 30/24 = 45.
    // Două elemente diferite: +15%. Fulgerul lovește întâi.
    expect(groupReload(['fizic', 'fulger'])).toBe(30)
    expect(combinedContacts(['fizic', 'fulger'])).toEqual([
      { element: 'fulger', dauna: Math.floor((45 * 115) / 100), aplica: undefined },
      { element: 'impact', dauna: Math.floor((40 * 115) / 100), aplica: undefined },
    ])
    // Același element de două ori se adună, fără bonus; Foc lasă arsura.
    expect(combinedContacts(['foc', 'foc'])).toEqual([{ element: 'foc', dauna: 18, aplica: 'arde' }])
    // Trei elemente: +30%; Foc cu reîncărcare 5 contribuie 9 × 30/5 = 54.
    expect(combinedContacts(['foc', 'fizic', 'fulger']).map((c) => [c.element, c.dauna])).toEqual([
      ['fulger', Math.floor((45 * 130) / 100)],
      ['impact', Math.floor((40 * 130) / 100)],
      ['foc', Math.floor((54 * 130) / 100)],
    ])
  })

  it('grupul combinat lovește o singură țintă, cu toate elementele, apoi se reîncarcă cât cel mai lent turn', () => {
    const base = build(arena(), ['fizic', '0,-1'], ['fulger', '1,-1'])
    const two = [foe(1, 9), foe(2, 8)]
    const ind = step(inWave(base, two))
    // Individual: fiecare turn își lovește ținta lui (amândouă „primul”, deci același inamic aici).
    expect(5000 - ind.inamici[0]!.viata).toBe(TOWERS.fizic.dauna + TOWERS.fulger.dauna)
    const comb = step(inWave(must(base, { tip: 'combina', turn: 1, activ: true }), two))
    const total = combinedContacts(['fizic', 'fulger']).reduce((n, c) => n + c.dauna, 0)
    expect(5000 - comb.inamici[0]!.viata).toBe(total)
    expect(comb.inamici[1]!.viata).toBe(5000)
    expect(comb.turnuri.map((t) => [t.reincarcare, t.lovitura?.tinte])).toEqual([
      [30, [1]],
      [30, [1]],
    ])
    // Următoarea lovitură vine abia după 30 de tick-uri, pentru amândouă.
    let s = comb
    for (let i = 0; i < 29; i++) s = step(s)
    expect(s.inamici[0]!.viata).toBe(comb.inamici[0]!.viata)
    s = step(s)
    expect(comb.inamici[0]!.viata - s.inamici[0]!.viata).toBe(total)
  })

  it('cadența e a celui mai lent turn, chiar dacă liderul e mai rapid', () => {
    // Liderul (id 1) e Fulger, 24 de tick-uri; Fizic, 30, e mai lent.
    const base = build(arena(), ['fulger', '0,-1'], ['fizic', '1,-1'])
    const s = step(inWave(must(base, { tip: 'combina', turn: 1, activ: true }), [foe(1, 9)]))
    expect(s.turnuri.map((t) => t.reincarcare)).toEqual([30, 30])
  })

  it('un grup e combinat doar dacă are cel puțin două turnuri și toate sunt combinate', () => {
    expect(isCombined([{ combinat: true }, { combinat: true }])).toBe(true)
    expect(isCombined([{ combinat: true }, { combinat: false }])).toBe(false)
    expect(isCombined([{ combinat: true }])).toBe(false)
  })

  it('raza grupului e reuniunea razelor: ținta poate fi văzută doar de un turn care nu e liderul', () => {
    // (3,0) e indicele 12: la 3 de Fulger (1,-1), la 4 de Fizic (0,-1) — doar Fulgerul îl vede.
    const base = build(arena(), ['fizic', '0,-1'], ['fulger', '1,-1'])
    const ind = step(inWave(base, [foe(1, 12)]))
    expect(5000 - ind.inamici[0]!.viata).toBe(TOWERS.fulger.dauna)
    const comb = step(inWave(must(base, { tip: 'combina', turn: 1, activ: true }), [foe(1, 12)]))
    expect(5000 - comb.inamici[0]!.viata).toBe(combinedContacts(['fizic', 'fulger']).reduce((n, c) => n + c.dauna, 0))
  })

  it('un Frig combinat nu mai lovește în zonă: grupul are o țintă, iar ținta se poate schimba pentru tot grupul', () => {
    const base = build(arena(), ['frig', '0,-1'], ['fizic', '1,-1'])
    expect(reason(applyDecision(base, { tip: 'tintire', turn: 1, mod: 'ultimul' }))).toMatch(/nu are țintă de ales/)
    const comb = must(must(base, { tip: 'combina', turn: 1, activ: true }), { tip: 'tintire', turn: 1, mod: 'ultimul' })
    expect(comb.turnuri.map((t) => t.tintire)).toEqual(['ultimul', 'ultimul'])
    // Doi inamici lângă Frig: ținta e „ultimul” (cel mai departe de bază), celălalt nu e atins.
    const s = step(inWave(comb, [foe(1, 9), foe(2, 8)]))
    expect(s.inamici[0]!.viata).toBe(5000)
    expect(s.inamici[1]!.viata).toBeLessThan(5000)
    expect(s.inamici[1]!.stari.racit).toBeDefined()
  })

  it('combinarea în timpul valului nu dă o lovitură gratuită: grupul ia cea mai lungă reîncărcare', () => {
    const base = build(arena(), ['fizic', '0,-1'], ['fulger', '1,-1'])
    const fired = step(inWave(base, [foe(1, 9)]))
    expect(fired.turnuri.map((t) => t.reincarcare)).toEqual([30, 24])
    const comb = must(fired, { tip: 'combina', turn: 2, activ: true })
    expect(comb.turnuri.map((t) => t.reincarcare)).toEqual([30, 30])
    expect(comb.jurnal.at(-1)!.la).toBe(fired.tick)
  })

  it('modul grupului intră în amprentă', () => {
    const base = build(arena(), ['fizic', '0,-1'], ['fulger', '1,-1'])
    const comb = must(base, { tip: 'combina', turn: 1, activ: true })
    expect(fingerprint({ ...comb, jurnal: base.jurnal })).not.toBe(fingerprint(base))
    expect(isCombined(comb.turnuri)).toBe(true)
  })
})
