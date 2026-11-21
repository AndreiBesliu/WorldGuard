import { describe, expect, it } from 'vitest'
import { MAX_UPS, NO_UPS } from '../data/workshop'
import { createGame, DT } from '../sim/state'
import { createBot } from './bot'
import { POLICIES, type BotName, type Policy } from './policy'
import { measure, median, playOne, playStep, playTimed, RUN_CAP, SEEDS } from './run'

const pol = (name: BotName): Policy => POLICIES.find((p) => p.name === name)!

describe('rularea', () => {
  it('aceeași sămânță dă aceeași partidă', () => {
    expect(JSON.stringify(playOne(pol('amestec'), 5))).toBe(JSON.stringify(playOne(pol('amestec'), 5)))
  })
  it('se oprește la margine, cu partida încă în joc (Review Focus 4)', () => {
    for (const p of POLICIES) {
      const s = playOne(p, 1, 30)
      expect([p.name, s.mode]).toEqual([p.name, 'playing'])
      expect(s.t).toBeGreaterThanOrEqual(30)
      expect(s.t).toBeLessThan(30 + DT)
    }
    expect(RUN_CAP).toBe(900)
  })
  it('playTimed pornește partida cu întăririle date; fără ele, cu niciuna', () => {
    expect(playTimed(pol('amestec'), 1, 5).s.ups).toEqual(NO_UPS)
    const g = playTimed(pol('amestec'), 1, 5, undefined, MAX_UPS)
    expect([g.s.ups, g.s.core.hp]).toEqual([MAX_UPS, 480])
  })
  it('mediana', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
  it('20 de semințe diferite; „Nimic” are 20 de timpi', () => {
    expect(SEEDS).toHaveLength(20)
    expect(new Set(SEEDS).size).toBe(20)
    const row = measure(pol('nimic'))
    expect(row.name).toBe('nimic')
    expect(row.label).toBe('Nimic')
    expect(row.times).toHaveLength(20)
    expect(row.times[0]).toBe(playOne(pol('nimic'), SEEDS[0]!).t)
    expect(row.min).toBeLessThanOrEqual(row.median)
    expect(row.median).toBeLessThanOrEqual(row.max)
  })
  it('`measure` întoarce mediana nivelului navei la sfârșit și a secundelor la care a atins nivelurile 2 și 5', () => {
    // „Nimic” nu cumpără nimic: nava rămâne la nivelul 1, iar nivelurile neatinse se scriu ca marginea testului.
    const still = measure(pol('nimic'))
    expect([still.level, still.lvl2At, still.lvl5At]).toEqual([1, RUN_CAP, RUN_CAP])
    // „Doar navă”: nivelul de la sfârșit și secunda nivelului 2, pe fiecare sămânță, din partida însăși.
    const row = measure(pol('doar-nava'))
    const games = SEEDS.map((seed) => playOne(pol('doar-nava'), seed))
    expect(row.level).toBe(median(games.map((s) => s.hero.lvl)))
    expect(row.level).toBeGreaterThanOrEqual(2)
    expect(row.lvl2At).toBeGreaterThan(0)
    expect(row.lvl2At).toBeLessThan(RUN_CAP)
    expect(row.lvl2At).toBeLessThanOrEqual(row.lvl5At)
    const reached = games.filter((s) => s.hero.lvl >= 2).length
    expect(reached).toBeGreaterThanOrEqual(10)   // altfel mediana secundei nivelului 2 ar fi marginea testului
  }, 60_000)
  it('secunda nivelului 2 e chiar pasul în care nava a urcat', () => {
    const p = pol('doar-nava')
    const s = createGame(SEEDS[0]!), bot = createBot(p)
    let at = RUN_CAP
    while (s.mode === 'playing' && s.t < RUN_CAP && at === RUN_CAP) { playStep(s, p, bot); if (s.hero.lvl >= 2) at = s.t }
    expect(playTimed(p, SEEDS[0]!).lvl2At).toBe(at)
  })
})
