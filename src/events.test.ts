import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ENEMIES, WAVES } from './data/enemies'
import type { TowerType } from './data/towers'
import { stepEvents, type StepEvent } from './events'
import { newGame, pathLength, step, type Enemy, type GameState } from './sim/game'
import { must, startWave } from './sim/testkit'

// Arena: drumul drept de la (-9,0) la (9,0) (indicele i e hexagonul (i − 9, 0)), câmpie peste tot, aur cât trebuie,
// fără ocol obligatoriu.
function arena(): GameState {
  const s = newGame(7)
  const terrain = new Map([...s.map.terrain].map(([k]) => [k, 'campie' as const]))
  return { ...s, map: { ...s.map, terrain }, aur: 10_000, ocoluriPeVal: 0 }
}

const build = (s: GameState, ...towers: [TowerType, string][]): GameState =>
  towers.reduce((cur, [tip, hex]) => must(cur, { tip: 'turn', turn: tip, hex }), s)

/** Un val „oprit”: inamicii dați, și unul programat departe, ca valul să nu se încheie. */
const inWave = (s: GameState, inamici: Enemy[], extra: Partial<GameState> = {}): GameState => ({
  ...s,
  faza: 'val',
  inamici,
  deGenerat: [{ tick: 1_000_000, tip: 'normal' }],
  urmatorulId: 100,
  ...extra,
})

const foe = (id: number, i: number, viata = 5000): Enemy => ({ id, tip: 'normal', viata, progres: i * 1000, stari: {} })

const of = <T extends StepEvent['tip']>(evs: StepEvent[], tip: T): Extract<StepEvent, { tip: T }>[] =>
  evs.filter((e): e is Extract<StepEvent, { tip: T }> => e.tip === tip)

describe('evenimentele unui pas', () => {
  it('un turn care trage: lovitura lui și inamicul lovit (rămas în viață)', () => {
    // Inamicul 2 e departe, la intrare: nu e lovit, deci nu apare.
    const s = inWave(build(arena(), ['fizic', '0,-1']), [foe(1, 9), foe(2, 0)])
    const evs = stepEvents(s, step(s))
    expect(of(evs, 'lovitura')).toEqual([{ tip: 'lovitura', turnuri: ['fizic'], hex: '0,-1', combinat: false }])
    expect(of(evs, 'lovit')).toEqual([{ tip: 'lovit', inamic: 1 }])
    expect(of(evs, 'ucis')).toEqual([])
    // Pasul următor: turnul se reîncarcă, deci nu mai trage.
    const s2 = step(s)
    expect(of(stepEvents(s2, step(s2)), 'lovitura')).toEqual([])
  })

  it('un grup combinat trage o singură dată, cu toate tipurile lui, de la lider', () => {
    let s = build(arena(), ['fizic', '0,-1'], ['foc', '1,-1'])
    s = must(s, { tip: 'combina', turn: 2, activ: true })
    s = inWave(s, [foe(1, 9)])
    expect(of(stepEvents(s, step(s)), 'lovitura')).toEqual([{ tip: 'lovitura', turnuri: ['fizic', 'foc'], hex: '0,-1', combinat: true }])
  })

  it('ucis sau scăpat la bază: cine dispare din listă, după unde era', () => {
    const s = build(arena(), ['fizic', '0,-1'])
    const end = pathLength(s)
    const w = inWave(s, [foe(1, 9, 1), { ...foe(2, 0), progres: end - 1 }])
    const after = step(w)
    const evs = stepEvents(w, after)
    expect(of(evs, 'ucis').map((e) => e.inamic.id)).toEqual([1])
    expect(of(evs, 'scapat').map((e) => e.inamic.id)).toEqual([2])
    expect(after.vieti).toBe(w.vieti - ENEMIES.normal.dauna)
  })

  it('cei apăruți — și unul lovit mortal chiar la apariție, refăcut din programare', () => {
    // Un Fulger cu o daună uriașă, lângă intrare: inamicul apărut moare în același tick.
    const s = build(arena(), ['fulger', '-8,-1'])
    const w = inWave({ ...s, imbunatatiri: { fulger: { dauna: 1_000_000, reincarcare: 0 } } }, [], {
      deGenerat: [
        { tick: s.tick + 1, tip: 'normal' },
        { tick: 1_000_000, tip: 'normal' },
      ],
    })
    const after = step(w)
    expect(after.inamici).toEqual([])
    const evs = stepEvents(w, after)
    expect(of(evs, 'aparut').map((e) => e.inamic.id)).toEqual([100])
    expect(of(evs, 'ucis').map((e) => [e.inamic.id, e.inamic.tip, e.inamic.progres])).toEqual([[100, 'normal', 0]])
  })

  it('reacțiile trec mai departe; sfârșitul valului și al partidei se văd', () => {
    const s = inWave(arena(), [])
    expect(stepEvents(s, { ...s, tick: s.tick + 1, evenimente: [{ tip: 'explozie', inamic: 3, progres: 4000 }] })).toEqual([
      { tip: 'reactie', reactie: 'explozie', inamic: 3, progres: 4000 },
    ])
    const last = inWave(build(arena(), ['fizic', '0,-1']), [foe(1, 9, 1)], { deGenerat: [] })
    expect(of(stepEvents(last, step(last)), 'sfarsit')).toEqual([{ tip: 'sfarsit', faza: 'pregatire' }])
    const lost = inWave(arena(), [{ ...foe(1, 0), progres: pathLength(arena()) - 1 }], { vieti: 1 })
    expect(of(stepEvents(lost, step(lost)), 'sfarsit')).toEqual([{ tip: 'sfarsit', faza: 'pierdut' }])
  })

  it('fără pas (același tick), nimic', () => {
    const s = inWave(build(arena(), ['fizic', '0,-1']), [foe(1, 9)])
    const after = step(s)
    expect(stepEvents(after, after)).toEqual([])
  })

  it('pe un val întreg, evenimentele se potrivesc cu socotelile simulării: aurul, viețile, aparițiile', () => {
    // Un singur turn: unii inamici mor, alții ajung la bază.
    const start = startWave(build(arena(), ['fizic', '-2,-1']))
    let s = start
    const evs: StepEvent[] = []
    while (s.faza === 'val') {
      const next = step(s)
      evs.push(...stepEvents(s, next))
      s = next
    }
    const ucisi = of(evs, 'ucis')
    const scapati = of(evs, 'scapat')
    expect(ucisi.length).toBeGreaterThan(0)
    expect(scapati.length).toBeGreaterThan(0)
    expect(ucisi.reduce((a, e) => a + ENEMIES[e.inamic.tip].aur, 0)).toBe(s.aur - start.aur - (s.venit?.aur ?? 0))
    expect(scapati.reduce((a, e) => a + ENEMIES[e.inamic.tip].dauna, 0)).toBe(start.vieti - s.vieti)
    const programati = (WAVES[0]?.grupuri ?? []).reduce((a, g) => a + g.numar, 0)
    expect(of(evs, 'aparut')).toHaveLength(programati)
    expect(ucisi.length + scapati.length).toBe(programati)
    expect(of(evs, 'sfarsit')).toEqual([{ tip: 'sfarsit', faza: s.faza }])
  })

  it('e pur: fără ceas și fără aleator (la fel ca nucleul)', () => {
    const code = readFileSync(new URL('./events.ts', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/Math\.random|Date\.now|new Date|performance\.now/)
  })
})
