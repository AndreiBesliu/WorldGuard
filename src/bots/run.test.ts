import { describe, expect, it } from 'vitest'
import { DT } from '../sim/state'
import { POLICIES, type BotName, type Policy } from './policy'
import { measure, median, playOne, RUN_CAP, SEEDS } from './run'

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
})
