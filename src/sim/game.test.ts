import { describe, expect, it } from 'vitest'
import { applyDecision, fingerprint, newGame, replay, type Decision, type GameState } from './game'
import { key } from './hex'
import { optionsAround } from './path'
import { createRng } from './rng'

/** Joacă `steps` ocoluri alese pseudo-aleator (determinist) și întoarce starea. */
function playRandom(seed: number, steps: number): GameState {
  const pick = createRng(seed, 'test/jucator')
  let s = newGame(seed)
  for (let i = 0; i < steps; i++) {
    const index = 1 + pick.int(s.path.length - 2)
    const opts = optionsAround(s.map, s.path, index, 1 + pick.int(3))
    if (opts.length === 0) continue
    const o = pick.pick(opts)
    const d: Decision = { tip: 'ocol', start: o.start, span: o.span, hexuri: o.hexes.map(key) }
    const r = applyDecision(s, d)
    expect(r.ok).toBe(true)
    if (r.ok) s = r.value
  }
  return s
}

describe('jurnalul deciziilor', () => {
  it('replay(seed, jurnal) reconstruiește exact aceeași stare', () => {
    for (const seed of [1, 7, 2026]) {
      const s = playRandom(seed, 40)
      expect(s.jurnal.length).toBeGreaterThan(10)
      const again = replay(seed, s.jurnal)
      expect(fingerprint(again)).toBe(fingerprint(s))
      expect(again.path.map(key)).toEqual(s.path.map(key))
    }
  })

  it('jurnalul trece prin JSON fără pierderi (se poate salva și trimite)', () => {
    const s = playRandom(5, 25)
    const roundTrip = JSON.parse(JSON.stringify(s.jurnal)) as Decision[]
    expect(fingerprint(replay(5, roundTrip))).toBe(fingerprint(s))
  })

  it('o decizie invalidă e refuzată, cu motiv, și NU intră în jurnal', () => {
    const s = newGame(3)
    const r = applyDecision(s, { tip: 'ocol', start: 0, span: 1, hexuri: ['99,99', '98,99'] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/în afara hărții/)
    expect(s.jurnal).toHaveLength(0)
  })

  it('replay aruncă o eroare clară dacă jurnalul nu se potrivește cu seed-ul', () => {
    const s = playRandom(11, 30)
    expect(() => replay(12, s.jurnal)).toThrow(/nu se mai poate aplica/)
  })
})
