import { describe, expect, it } from 'vitest'
import { TARGET_MODES, TOWER_TYPES, TOWERS } from '../data/towers'
import {
  applyDecision,
  checkBuild,
  coverage,
  fingerprint,
  newGame,
  replay,
  step,
  type Decision,
  type GameState,
  type LoggedDecision,
} from './game'
import { key } from './hex'
import { optionsAround } from './path'
import { createRng } from './rng'

/**
 * Joacă o partidă întreagă cu decizii alese pseudo-aleator (determinist): în fiecare pregătire un ocol (cât
 * permite limita) și turnuri pe hexagoane libere care acoperă drumul, iar în fiecare val o schimbare de țintă
 * la un tick oarecare. Turnurile stau lângă drum, deci ocolurile de mai târziu trec uneori peste ele și le
 * ridică — `lifted` numără de câte ori.
 */
function playRandom(seed: number): { s: GameState; lifted: number } {
  const pick = createRng(seed, 'test/jucator')
  const apply = (s: GameState, d: Decision): GameState => {
    const r = applyDecision(s, d)
    expect(r.ok).toBe(true)
    return r.ok ? r.value : s
  }
  let s = newGame(seed)
  let lifted = 0
  while (s.faza === 'pregatire') {
    const index = 1 + pick.int(s.path.length - 2)
    const opts = optionsAround(s.map, s.path, index, 1 + pick.int(3))
    if (opts.length > 0) {
      const o = pick.pick(opts)
      const before = s.turnuri.length
      s = apply(s, { tip: 'ocol', start: o.start, span: o.span, hexuri: o.hexes.map(key) })
      lifted += before - s.turnuri.length
    }
    for (let tries = 0; tries < 10; tries++) {
      const tip = pick.pick(TOWER_TYPES)
      if (s.aur < TOWERS[tip].cost) break
      const good = [...s.map.terrain.keys()].filter(
        (k) => checkBuild(s, tip, k).ok && coverage(s.path, k, TOWERS[tip].raza).filter(Boolean).length >= 3,
      )
      if (good.length === 0) break
      s = apply(s, { tip: 'turn', turn: tip, hex: pick.pick(good) })
    }
    s = apply(s, { tip: 'pornesteVal' })
    const switchAt = s.tick + 1 + pick.int(150)
    while (s.faza === 'val') {
      s = step(s)
      const t = s.turnuri.find((x) => !TOWERS[x.tip].zona)
      if (t && s.tick === switchAt) s = apply(s, { tip: 'tintire', turn: t.id, mod: pick.pick(TARGET_MODES.filter((m) => m !== t.tintire)) })
    }
  }
  return { s, lifted }
}

describe('jurnalul deciziilor', () => {
  it('replay(seed, jurnal) reconstruiește exact aceeași stare — ocoluri, turnuri ridicate, ținte schimbate în val', () => {
    let lifted = 0
    for (const seed of [1, 5, 2026]) {
      const game = playRandom(seed)
      const s = game.s
      lifted += game.lifted
      expect([...new Set(s.jurnal.map((l) => l.d.tip))].sort()).toEqual(['ocol', 'pornesteVal', 'tintire', 'turn'])
      expect(s.jurnal.length).toBeGreaterThan(10)
      const again = replay(seed, s.jurnal, s.tick)
      expect(fingerprint(again)).toBe(fingerprint(s))
      expect(again.path.map(key)).toEqual(s.path.map(key))
    }
    // Măcar un ocol a trecut peste un turn, deci replay-ul a exersat și ridicarea cu aur înapoi.
    expect(lifted).toBeGreaterThan(0)
  })

  it('jurnalul trece prin JSON fără pierderi (se poate salva și trimite)', () => {
    const { s } = playRandom(5)
    const roundTrip = JSON.parse(JSON.stringify(s.jurnal)) as LoggedDecision[]
    expect(fingerprint(replay(5, roundTrip, s.tick))).toBe(fingerprint(s))
  })

  it('o decizie invalidă e refuzată, cu motiv, și NU intră în jurnal', () => {
    const s = newGame(3)
    const r = applyDecision(s, { tip: 'ocol', start: 0, span: 1, hexuri: ['99,99', '98,99'] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/în afara hărții/)
    expect(s.jurnal).toHaveLength(0)
  })

  it('replay aruncă o eroare clară dacă jurnalul nu se potrivește cu seed-ul', () => {
    // Un ocol valid pe harta 11 care trece printr-un hexagon cu apă pe harta 12.
    const a = newGame(11)
    const b = newGame(12)
    let d: Decision | undefined
    for (let i = 1; i < a.path.length - 1 && !d; i++) {
      for (const extra of [1, 2, 3]) {
        const o = optionsAround(a.map, a.path, i, extra).find((x) => x.hexes.some((h) => b.map.terrain.get(key(h)) === 'apa'))
        if (o) {
          d = { tip: 'ocol', start: o.start, span: o.span, hexuri: o.hexes.map(key) }
          break
        }
      }
    }
    expect(d).toBeDefined()
    const jurnal: LoggedDecision[] = [{ la: 0, d: d! }]
    expect(applyDecision(a, d!).ok).toBe(true) // pe harta lui, decizia e validă
    expect(() => replay(12, jurnal)).toThrow('decizia 0 nu se mai poate aplica: pe apă nu se poate construi drum')
  })
})

describe('un ocol pe val (decis de owner, 05.10.2026)', () => {
  const firstDetour = (s: GameState): Decision => {
    for (let i = 1; i < s.path.length - 1; i++) {
      const o = optionsAround(s.map, s.path, i, 2)[0]
      if (o) return { tip: 'ocol', start: o.start, span: o.span, hexuri: o.hexes.map(key) }
    }
    throw new Error('niciun ocol pe hartă')
  }
  const must = (s: GameState, d: Decision): GameState => {
    const r = applyDecision(s, d)
    if (!r.ok) throw new Error(r.reason)
    return r.value
  }

  it('al doilea ocol din aceeași pregătire e refuzat, cu motiv, și nu intră în jurnal', () => {
    const one = must(newGame(4), firstDetour(newGame(4)))
    expect(one.ocoluriFolosite).toBe(1)
    expect(applyDecision(one, firstDetour(one))).toEqual({ ok: false, reason: 'ocolul acestui val e deja pus — următorul vine după val' })
    expect(one.jurnal).toHaveLength(1)
  })

  it('după val, dreptul la ocol revine; în timpul valului motivul rămâne „doar între valuri”', () => {
    const one = must(newGame(4), firstDetour(newGame(4)))
    let cur = must(one, { tip: 'pornesteVal' })
    expect(cur.ocoluriFolosite).toBe(0)
    expect(applyDecision(cur, firstDetour(one))).toEqual({ ok: false, reason: 'drumul se modelează doar între valuri' })
    while (cur.faza === 'val') cur = step(cur)
    expect(cur.faza).toBe('pregatire')
    expect(applyDecision(cur, firstDetour(cur)).ok).toBe(true)
  })

  it('anularea ocolului (replay fără el, ca Z în UI) redă dreptul la ocol', () => {
    const one = must(newGame(4), firstDetour(newGame(4)))
    const undone = replay(4, one.jurnal.slice(0, -1), one.tick)
    expect(undone.ocoluriFolosite).toBe(0)
    expect(applyDecision(undone, firstDetour(undone)).ok).toBe(true)
  })

  it('limita stă în stare (`ocoluriPeVal`), ca un upgrade de mai târziu să o poată crește — și rămâne după val', () => {
    let s: GameState = { ...newGame(4), ocoluriPeVal: 2 }
    s = must(s, firstDetour(s))
    s = must(s, firstDetour(s))
    expect(applyDecision(s, firstDetour(s))).toEqual({
      ok: false,
      reason: 'ai pus deja cele 2 ocoluri ale acestui val — următoarele vin după val',
    })
    // Valul nu resetează limita crescută, ci doar ocolurile folosite.
    s = must(s, { tip: 'pornesteVal' })
    while (s.faza === 'val') s = step(s)
    expect(s.faza).toBe('pregatire')
    expect(s.ocoluriPeVal).toBe(2)
    s = must(s, firstDetour(s))
    s = must(s, firstDetour(s))
    expect(s.ocoluriFolosite).toBe(2)
  })
})
