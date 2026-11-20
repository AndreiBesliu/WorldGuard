import { describe, expect, it } from 'vitest'
import { MAX_TIER, MOD_IDS, type ModId } from '../data/modules'
import { createRng } from './rng'
import { createGame, type GameState, type Input } from './state'
import { choose, heroReady, makeOffer, slotsAt, tierOf, xpNeed } from './mods'
import { step } from './step'
import { stepFor } from './testkit'

/** O navă de nivelul dat, cu modulele date (treapta 1 dacă nu se spune altfel). */
function ship(seed: number, lvl: number, mods: [ModId, number][] = [['wave', 1]]): GameState {
  const s = createGame(seed)
  s.hero.lvl = lvl
  s.hero.mods = mods.map(([id, tier]) => ({ id, tier, t: 0 }))
  return s
}
const isNew = (s: GameState, o: { id: ModId }) => tierOf(s, o.id) === 0

describe('experiența, pragurile și locurile', () => {
  it('slotsAt pentru nivelurile 1–9', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(slotsAt)).toEqual([2, 2, 3, 3, 4, 4, 5, 5, 6])
  })
  it('xpNeed: 6 la nivelul 1, 34 la nivelul 8, null la nivelul 9 (maxim)', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(xpNeed)).toEqual([6, 10, 13, 16, 20, 24, 28, 34])
    expect(xpNeed(9)).toBeNull()
  })
  it('heroReady: fals la 5 experiență, adevărat la 6', () => {
    const s = createGame(1)
    s.hero.xp = 5; expect(heroReady(s)).toBe(false)
    s.hero.xp = 6; expect(heroReady(s)).toBe(true)
  })
  it('tierOf pe o partidă nouă: Unda 1, Laserul 0', () => {
    const s = createGame(1)
    expect([tierOf(s, 'wave'), tierOf(s, 'laser')]).toEqual([1, 0])
    expect([s.hero.xp, s.hero.mods, s.offer]).toEqual([0, [{ id: 'wave', tier: 1, t: 0 }], null])
  })
})

describe('ofertele', () => {
  it('nivelul 2, doar cu Unda: trei diferite, cel puțin una nouă, cel puțin o întărire a Undei', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = ship(seed, 2), o = makeOffer(s, MOD_IDS)!
      expect(o).toHaveLength(3)
      expect(new Set(o.map((x) => x.id)).size).toBe(3)
      expect(o.some((x) => isNew(s, x) && x.tier === 1)).toBe(true)
      expect(o.some((x) => x.id === 'wave' && x.tier === 2)).toBe(true)
    }
  })
  it('aceeași stare dă de două ori aceleași oferte', () => {
    const s = ship(7, 2)
    expect(makeOffer(s, MOD_IDS)).toEqual(makeOffer(s, MOD_IDS))
  })
  it('altă sămânță sau alt nivel dă, pe 20 de semințe, cel puțin două rezultate diferite', () => {
    const bySeed = new Set<string>(), byLvl = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) bySeed.add(JSON.stringify(makeOffer(ship(seed, 2), MOD_IDS)))
    for (let seed = 1; seed <= 20; seed++) byLvl.add(JSON.stringify(makeOffer(ship(3, 2 + (seed % 3)), MOD_IDS)))
    expect(bySeed.size).toBeGreaterThanOrEqual(2)
    expect(byLvl.size).toBeGreaterThanOrEqual(2)
  })
  it('cu locurile pline: nicio ofertă nouă', () => {
    const s = ship(3, 2, [['wave', 1], ['laser', 2]])   // nivelul 2: două locuri
    const o = makeOffer(s, MOD_IDS)!
    expect(o.map((x) => x.id).sort()).toEqual(['laser', 'wave'])
    expect(o.every((x) => !isNew(s, x) && x.tier === tierOf(s, x.id) + 1)).toBe(true)
  })
  it('cu locurile pline și toate modulele la treapta 3: null (Review Focus 3)', () => {
    const s = ship(3, 2, [['wave', MAX_TIER], ['laser', MAX_TIER]])
    expect(makeOffer(s, MOD_IDS)).toBeNull()
  })
  it('cu un singur candidat: o singură ofertă; cu lista goală: null', () => {
    const s = ship(3, 2)
    expect(makeOffer(s, ['laser'])).toEqual([{ id: 'laser', tier: 1 }])
    expect(makeOffer(s, [])).toBeNull()
  })
  it('Unda se întărește doar dacă e în listă', () => {
    const s = ship(3, 2)
    expect(makeOffer(s, ['laser', 'armor'])!.some((x) => x.id === 'wave')).toBe(false)
  })
  it('implicit, lista din BALANCE: toate cele nouă module', () => {
    for (let seed = 1; seed <= 20; seed++) expect(makeOffer(ship(seed, 2))).toEqual(makeOffer(ship(seed, 2), MOD_IDS))
  })
})

describe('choose', () => {
  it('pune modulul nou cu treapta 1 și închide oferta', () => {
    const s = ship(3, 2); s.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }]
    const r = choose(s, 0)
    expect(r).toEqual({ ok: true, value: { id: 'laser', tier: 1 } })
    expect([s.hero.mods, s.offer]).toEqual([[{ id: 'wave', tier: 1, t: 0 }, { id: 'laser', tier: 1, t: 0 }], null])
  })
  it('urcă treapta la întărire', () => {
    const s = ship(3, 2); s.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }]
    expect(choose(s, 1).ok).toBe(true)
    expect([tierOf(s, 'wave'), s.hero.mods.length, s.offer]).toEqual([2, 1, null])
  })
  it('fără ofertă sau cu index în afara ei: motivul, și starea neatinsă', () => {
    const s = ship(3, 2), before = JSON.stringify(s)
    expect(choose(s, 0)).toEqual({ ok: false, reason: 'nicio ofertă deschisă' })
    expect(JSON.stringify(s)).toBe(before)
    s.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }, { id: 'armor', tier: 1 }]
    const open = JSON.stringify(s)
    expect(choose(s, 3)).toEqual({ ok: false, reason: 'ofertă inexistentă' })
    expect(choose(s, -1)).toEqual({ ok: false, reason: 'ofertă inexistentă' })
    expect(JSON.stringify(s)).toBe(open)
  })
})

describe('choose refuză o ofertă care nu se potrivește cu nava', () => {
  const why = (s: GameState, offer: { id: ModId; tier: number }[]): string => {
    s.offer = offer
    const before = JSON.stringify(s), r = choose(s, 0)
    if (!r.ok) expect(JSON.stringify(s)).toBe(before)   // refuzul nu atinge starea
    return r.ok ? 'ok' : r.reason
  }
  it('un modul nou pe care nava îl are deja', () => {
    expect(why(ship(3, 3), [{ id: 'wave', tier: 1 }])).toBe('modul deja pe navă')
  })
  it('un modul nou fără loc liber', () => {
    expect(why(ship(3, 2, [['wave', 1], ['laser', 1]]), [{ id: 'armor', tier: 1 }])).toBe('niciun loc liber')
  })
  it('o întărire care nu e treapta de acum plus unu', () => {
    expect(why(ship(3, 3), [{ id: 'wave', tier: 3 }])).toBe('treaptă nepotrivită')
    expect(why(ship(3, 3, [['wave', 2]]), [{ id: 'wave', tier: 2 }])).toBe('treaptă nepotrivită')
    expect(why(ship(3, 3), [{ id: 'laser', tier: 2 }])).toBe('treaptă nepotrivită')
  })
  it('ofertele făcute de makeOffer trec mereu, oricare ar fi alegerea', () => {
    const bad: string[] = []
    for (let seed = 1; seed <= 20; seed++) {
      for (let lvl = 2; lvl <= 9; lvl++) {
        const mods: [ModId, number][] = MOD_IDS.slice(0, slotsAt(lvl) - (seed % 2)).map((id, i) => [id, 1 + ((i + seed) % MAX_TIER)])
        const s = ship(seed, lvl, mods), o = makeOffer(s)
        if (o === null) continue
        for (let i = 0; i < o.length; i++) {
          const c: GameState = JSON.parse(JSON.stringify(s)); c.offer = o
          const r = choose(c, i)
          if (!r.ok) bad.push(`s${seed} n${lvl} #${i}: ${r.reason}`)
        }
      }
    }
    expect(bad).toEqual([])
  })
  it('Blindajul ales: viața de acum crește cu diferența (30, apoi încă 30)', () => {
    const s = ship(3, 3); s.hero.hp = 40
    s.offer = [{ id: 'armor', tier: 1 }]; choose(s, 0)
    expect(s.hero.hp).toBe(70)
    s.offer = [{ id: 'armor', tier: 2 }]; choose(s, 0)
    expect(s.hero.hp).toBe(100)
  })
})

describe('pasul cu oferta deschisă', () => {
  it('120 de pași nu schimbă nimic; după choose, următorul pas urcă tick', () => {
    const s = createGame(4); stepFor(s, 20)
    s.offer = [{ id: 'laser', tier: 1 }]
    const before = JSON.stringify(s)
    for (let i = 0; i < 120; i++) step(s, { x: 1, y: 0 })
    expect(JSON.stringify(s)).toBe(before)
    const tick = s.tick
    choose(s, 0); step(s, { x: 1, y: 0 })
    expect(s.tick).toBe(tick + 1)
  })
  it('reluarea cu oferta deschisă dă aceeași partidă (Review Focus 1)', () => {
    const r = createRng(5, 'comenzi-test'); const script: Input[] = []; let d: Input = { x: 0, y: 0 }
    for (let i = 0; i < 600; i++) {
      if (i % 120 === 0) { const a = r.next() * Math.PI * 2; d = { x: Math.cos(a), y: Math.sin(a) } }
      script.push(d)
    }
    const a = createGame(9); stepFor(a, 30)
    a.offer = makeOffer(ship(9, 2), MOD_IDS)
    const b: GameState = JSON.parse(JSON.stringify(a))
    expect(choose(a, 1).ok).toBe(true)
    expect(choose(b, 1).ok).toBe(true)
    for (const i of script) { step(a, i); step(b, i) }
    expect(b).toEqual(a)
    expect(a.hero.mods.length + tierOf(a, 'wave')).toBeGreaterThan(2)   // alegerea chiar a schimbat nava
  })
})
