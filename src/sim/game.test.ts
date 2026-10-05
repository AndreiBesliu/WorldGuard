import { describe, expect, it } from 'vitest'
import { TARGET_MODES, TOWER_TYPES, TOWERS } from '../data/towers'
import {
  applyDecision,
  checkBuild,
  checkCombine,
  checkStartWave,
  coverage,
  detourLimit,
  detourPossible,
  fingerprint,
  groupOf,
  incompatiblePair,
  isCombined,
  newGame,
  replay,
  step,
  towerGroups,
  towerKeys,
  type Decision,
  type GameState,
  type LoggedDecision,
} from './game'
import { distance, fromKey, key } from './hex'
import { optionsAround } from './path'
import { createRng } from './rng'
import { firstDetour, must } from './testkit'

/**
 * Joacă o partidă întreagă cu decizii alese pseudo-aleator (determinist): în fiecare pregătire ocolul
 * obligatoriu și turnuri pe hexagoane libere care acoperă drumul (des lângă altele, ca să facă grupuri), câte o
 * comutare de grup, iar în fiecare val o schimbare de țintă și o comutare de grup la tick-uri oarecare.
 * Turnurile stau lângă drum, deci blochează uneori variante de ocol — `blocked` numără de câte ori le-a lipsit
 * jucătorului o variantă din cauza lor.
 */
function playRandom(seed: number): { s: GameState; blocked: number } {
  const pick = createRng(seed, 'test/jucator')
  const apply = (s: GameState, d: Decision): GameState => {
    const r = applyDecision(s, d)
    expect(r.ok).toBe(true)
    return r.ok ? r.value : s
  }
  /** Comută un grup ales la întâmplare, dacă se poate (combinat ↔ individual). */
  const toggleSome = (s: GameState): GameState => {
    const grupuri = towerGroups(s.turnuri).filter((g) => g.length >= 2)
    if (grupuri.length === 0) return s
    const g = pick.pick(grupuri)
    const id = (g[0] as { id: number }).id
    const activ = !isCombined(g)
    return checkCombine(s, id, activ).ok ? apply(s, { tip: 'combina', turn: id, activ }) : s
  }
  let s = newGame(seed)
  let blocked = 0
  while (s.faza === 'pregatire') {
    // Draftul (după fiecare val): o carte la întâmplare din ofertă.
    if (s.oferta.length > 0) s = apply(s, { tip: 'alege', carte: pick.pick(s.oferta) })
    const index = 1 + pick.int(s.path.length - 2)
    const extra = 1 + pick.int(3)
    const opts = optionsAround(s.map, s.path, index, extra, towerKeys(s))
    blocked += optionsAround(s.map, s.path, index, extra).length - opts.length
    // Ocolul e obligatoriu: dacă la locul ales nu încape, se ia primul care încape pe drum (dacă există).
    const o = opts.length > 0 ? pick.pick(opts) : undefined
    const d: Decision | undefined = o ? { tip: 'ocol', start: o.start, span: o.span, hexuri: o.hexes.map(key) } : firstDetour(s)
    if (d) s = apply(s, d)
    for (let tries = 0; tries < 10; tries++) {
      const tip = pick.pick(TOWER_TYPES)
      if (s.aur < TOWERS[tip].cost) break
      const good = [...s.map.terrain.keys()].filter(
        (k) => checkBuild(s, tip, k).ok && coverage(s.path, k, TOWERS[tip].raza).filter(Boolean).length >= 3,
      )
      if (good.length === 0) break
      const lipite = good.filter((k) => s.turnuri.some((t) => distance(fromKey(t.hex), fromKey(k)) === 1))
      s = apply(s, { tip: 'turn', turn: tip, hex: pick.pick(lipite.length > 0 && pick.int(2) === 0 ? lipite : good) })
    }
    // Cărțile „Ocol în plus” și „Cartograful” cer mai multe ocoluri: restul, primele care încap.
    while (!checkStartWave(s).ok && s.ocoluriFolosite < detourLimit(s)) {
      const more = firstDetour(s)
      if (!more) break
      s = apply(s, more)
    }
    s = toggleSome(s)
    s = apply(s, { tip: 'pornesteVal' })
    const switchAt = s.tick + 1 + pick.int(150)
    const toggleAt = s.tick + 1 + pick.int(150)
    while (s.faza === 'val') {
      s = step(s)
      const t = s.turnuri.find((x) => !TOWERS[x.tip].zona || isCombined(groupOf(s.turnuri, x.id)))
      if (t && s.tick === switchAt) s = apply(s, { tip: 'tintire', turn: t.id, mod: pick.pick(TARGET_MODES.filter((m) => m !== t.tintire)) })
      if (s.tick === toggleAt) s = toggleSome(s)
    }
  }
  return { s, blocked }
}

describe('jurnalul deciziilor', () => {
  it('replay(seed, jurnal) reconstruiește exact aceeași stare — ocoluri, turnuri, grupuri, cărți, ținte schimbate în val, reacții', () => {
    let blocked = 0
    let combined = 0
    const reactions = new Set<string>()
    for (const seed of [1, 5, 2026]) {
      const game = playRandom(seed)
      const s = game.s
      blocked += game.blocked
      combined += s.jurnal.filter((l) => l.d.tip === 'combina' && l.d.activ).length
      for (const [r, n] of Object.entries(s.reactii)) if ((n ?? 0) > 0) reactions.add(r)
      expect([...new Set(s.jurnal.map((l) => l.d.tip))].sort()).toEqual(['alege', 'combina', 'ocol', 'pornesteVal', 'tintire', 'turn'])
      // Regula grupurilor ține pe tot parcursul: un grup are un singur mod, un turn singur nu e combinat, iar un
      // grup combinat nu are o pereche incompatibilă.
      for (const g of towerGroups(s.turnuri)) {
        expect(new Set(g.map((t) => t.combinat)).size).toBe(1)
        if (g.length === 1) expect(g[0]!.combinat).toBe(false)
        if (isCombined(g)) expect(incompatiblePair(g.map((t) => t.tip))).toBeUndefined()
      }
      expect(s.jurnal.length).toBeGreaterThan(10)
      const again = replay(seed, s.jurnal, s.tick)
      expect(fingerprint(again)).toBe(fingerprint(s))
      expect(again.path.map(key)).toEqual(s.path.map(key))
    }
    // Turnurile chiar au blocat variante de ocol pe parcurs, deci replay-ul a exersat și regula asta…
    expect(blocked).toBeGreaterThan(0)
    // …s-au combinat grupuri (și au tras combinat, în val)…
    expect(combined).toBeGreaterThan(0)
    // …iar partidele au avut reacții de mai multe feluri (stări, lanțuri, teren), reproduse identic.
    expect(reactions.size).toBeGreaterThanOrEqual(3)
    // Trei partide întregi, plus replay-ul lor: ~1–2,5 s pe mașina asta, mai mult pe un runner încărcat. Limita
    // implicită de 5 s a picat o dată sub încărcare (05.10.2026), deci testul are limita lui.
  }, 30_000)

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

describe('ocolul pe val: unul, obligatoriu (decis de owner, 05.10.2026)', () => {
  const detour = (s: GameState): Decision => {
    const d = firstDetour(s)
    if (!d) throw new Error('niciun ocol pe hartă')
    return d
  }

  it('valul nu pornește fără ocol — refuz cu motiv —, iar după ocol pornește', () => {
    const s = newGame(4)
    expect(applyDecision(s, { tip: 'pornesteVal' })).toEqual({ ok: false, reason: 'pune întâi ocolul acestui val — e obligatoriu' })
    expect(applyDecision(must(s, detour(s)), { tip: 'pornesteVal' }).ok).toBe(true)
  })

  it('dacă pe hartă nu mai încape niciun ocol, valul pornește fără el (altfel partida s-ar bloca)', () => {
    const s0 = newGame(4)
    const onPath = new Set(s0.path.map(key))
    // Toată harta, în afară de drum, devine apă: niciun ocol nu mai încape.
    const terrain = new Map([...s0.map.terrain].map(([k, t]) => [k, onPath.has(k) ? t : ('apa' as const)]))
    const s: GameState = { ...s0, map: { ...s0.map, terrain } }
    expect(detourPossible(s)).toBe(false)
    expect(detourPossible(s0)).toBe(true)
    expect(applyDecision(s, { tip: 'pornesteVal' }).ok).toBe(true)
  })

  it('și când turnurile blochează toate ocolurile rămase, valul pornește fără ocol', () => {
    const s0 = newGame(4)
    let index = 1
    while (optionsAround(s0.map, s0.path, index, 2).length === 0) index++
    const o = optionsAround(s0.map, s0.path, index, 2)[0]!
    // Harta: apă peste tot în afară de drum și de hexagoanele unui singur ocol.
    const keep = new Set([...s0.path.map(key), ...o.hexes.map(key)])
    const terrain = new Map([...s0.map.terrain].map(([k, t]) => [k, keep.has(k) ? t : ('apa' as const)]))
    let s: GameState = { ...s0, map: { ...s0.map, terrain }, aur: 1000 }
    expect(detourPossible(s)).toBe(true)
    expect(applyDecision(s, { tip: 'pornesteVal' }).ok).toBe(false)
    // Turnuri pe hexagoanele acelui ocol: nu mai încape niciunul.
    for (const h of o.hexes) s = must(s, { tip: 'turn', turn: 'fizic', hex: key(h) })
    expect(detourPossible(s)).toBe(false)
    expect(applyDecision(s, { tip: 'pornesteVal' }).ok).toBe(true)
  })

  it('cu limita crescută de un upgrade, toate ocolurile pregătirii sunt obligatorii (propunere)', () => {
    let s: GameState = { ...newGame(4), ocoluriPeVal: 2 }
    expect(applyDecision(s, { tip: 'pornesteVal' })).toEqual({ ok: false, reason: 'mai ai de pus 2 ocoluri în pregătirea asta — sunt obligatorii' })
    s = must(s, detour(s))
    expect(applyDecision(s, { tip: 'pornesteVal' })).toEqual({ ok: false, reason: 'mai ai de pus un ocol în pregătirea asta — e obligatoriu' })
    s = must(s, detour(s))
    expect(applyDecision(s, { tip: 'pornesteVal' }).ok).toBe(true)
  })

  it('al doilea ocol din aceeași pregătire e refuzat, cu motiv, și nu intră în jurnal', () => {
    const one = must(newGame(4), detour(newGame(4)))
    expect(one.ocoluriFolosite).toBe(1)
    expect(applyDecision(one, detour(one))).toEqual({ ok: false, reason: 'ocolul acestui val e deja pus — următorul vine după val' })
    expect(one.jurnal).toHaveLength(1)
  })

  it('după val, dreptul la ocol revine; în timpul valului motivul rămâne „doar între valuri”', () => {
    const one = must(newGame(4), detour(newGame(4)))
    let cur = must(one, { tip: 'pornesteVal' })
    expect(cur.ocoluriFolosite).toBe(0)
    expect(applyDecision(cur, detour(one))).toEqual({ ok: false, reason: 'drumul se modelează doar între valuri' })
    while (cur.faza === 'val') cur = step(cur)
    expect(cur.faza).toBe('pregatire')
    expect(applyDecision(cur, detour(cur)).ok).toBe(true)
  })

  it('anularea ocolului (replay fără el, ca Z în UI) redă dreptul la ocol', () => {
    const one = must(newGame(4), detour(newGame(4)))
    const undone = replay(4, one.jurnal.slice(0, -1), one.tick)
    expect(undone.ocoluriFolosite).toBe(0)
    expect(applyDecision(undone, detour(undone)).ok).toBe(true)
  })

  it('limita stă în stare (`ocoluriPeVal`), ca un upgrade de mai târziu să o poată crește — și rămâne după val', () => {
    let s: GameState = { ...newGame(4), ocoluriPeVal: 2 }
    s = must(s, detour(s))
    s = must(s, detour(s))
    expect(applyDecision(s, detour(s))).toEqual({
      ok: false,
      reason: 'ai pus deja cele 2 ocoluri ale acestui val — următoarele vin după val',
    })
    // Valul nu resetează limita crescută, ci doar ocolurile folosite.
    s = must(s, { tip: 'pornesteVal' })
    while (s.faza === 'val') s = step(s)
    expect(s.faza).toBe('pregatire')
    expect(s.ocoluriPeVal).toBe(2)
    s = must(s, detour(s))
    s = must(s, detour(s))
    expect(s.ocoluriFolosite).toBe(2)
  })
})
