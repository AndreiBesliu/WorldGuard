import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { createGame, type GameState } from '../sim/state'
import { shipRow } from './hud'

const withHero = (lvl: number, xp: number, mods: GameState['hero']['mods'] = []): GameState => {
  const s = createGame(4)
  s.hero.lvl = lvl; s.hero.xp = xp; s.hero.mods = mods
  return s
}

describe('shipRow: rândul de nivel din bandă', () => {
  it('la început: nivelul 1, inelul gol, două locuri libere, „experiență 0/6” și lacătul', () => {
    const s = createGame(4)
    const r = shipRow(s)
    expect(r.level).toBe(1)
    expect(r.frac).toBe(0)
    expect(r.ready).toBe(false)
    expect(r.max).toBe(false)
    expect(r.text).toBe(`experiență 0/${BALANCE.hero.xpToLevel[0]}`)
    expect(r.slots.map((v) => v.kind)).toEqual(['weapon', 'free', 'locked'])
  })
  it('fracția inelului e experiența împărțită la prag, între 0 și 1', () => {
    expect(shipRow(withHero(4, 0)).frac).toBe(0)
    expect(shipRow(withHero(4, 5)).frac).toBeCloseTo(5 / BALANCE.hero.xpToLevel[3]!, 9)
    expect(shipRow(withHero(4, 1000)).frac).toBe(1)
  })
  it('pragul atins: inelul plin și „Nivel 5 gata”', () => {
    const need = BALANCE.hero.xpToLevel[3]!
    const r = shipRow(withHero(4, need))
    expect(r.ready).toBe(true)
    expect(r.frac).toBe(1)
    expect(r.text).toBe('Nivel 5 gata')
    expect(shipRow(withHero(4, need - 1)).ready).toBe(false)
  })
  it('nivelul maxim: inelul plin, „Nivel maxim”, fără „gata”', () => {
    const r = shipRow(withHero(BALANCE.hero.maxLevel, 0, [{ id: 'wave', tier: 1, t: 0 }]))
    expect(r.max).toBe(true)
    expect(r.ready).toBe(false)
    expect(r.frac).toBe(1)
    expect(r.text).toBe('Nivel maxim')
    expect(r.slots.map((v) => v.kind)).toEqual(['weapon', 'free', 'free', 'free', 'free', 'free'])
  })
  it('locurile sunt aceleași ca în panoul de alegere: pictograma felului în cele ocupate', () => {
    const r = shipRow(withHero(3, 0, [{ id: 'wave', tier: 1, t: 0 }, { id: 'armor', tier: 1, t: 0 }]))
    expect(r.slots).toEqual([{ kind: 'weapon', id: 'wave' }, { kind: 'body', id: 'armor' }, { kind: 'free' }, { kind: 'locked' }])
  })
  it('nu scrie nimic în stare', () => {
    const s = withHero(2, 5), before = JSON.stringify(s)
    shipRow(s)
    expect(JSON.stringify(s)).toBe(before)
  })
})
