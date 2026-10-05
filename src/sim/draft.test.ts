import { describe, expect, it } from 'vitest'
import { CARD_IDS, CARDS, cardTower, DRAFT, type CardEffect, type CardId } from '../data/draft'
import { WAVES } from '../data/enemies'
import { TOWERS, TOWER_TYPES } from '../data/towers'
import {
  applyDecision,
  checkStartWave,
  combinedContacts,
  detourLimit,
  draftOffer,
  fingerprint,
  newGame,
  step,
  towerCost,
  towerDamage,
  towerReload,
  type Enemy,
  type GameState,
} from './game'
import { firstDetour, must, runWave, startWave } from './testkit'

const reason = (r: ReturnType<typeof applyDecision>): string => (r.ok ? 'ok' : r.reason)

/** O pregătire cu oferta dată și fără ocol obligatoriu. */
const withOffer = (oferta: CardId[], s: GameState = newGame(3)): GameState => ({ ...s, oferta, ocoluriPeVal: 0 })

describe('draftul: oferta', () => {
  it('nicio ofertă la începutul partidei; după un val, 3 cărți diferite; după ultimul val, nimic', () => {
    const s0 = newGame(5)
    expect(s0.oferta).toEqual([])
    const after = runWave(startWave(s0))
    expect(after.faza).toBe('pregatire')
    expect(after.oferta).toHaveLength(DRAFT.marime)
    expect(new Set(after.oferta).size).toBe(DRAFT.marime)
    for (const id of after.oferta) expect(CARD_IDS).toContain(id)
    // Ultimul val, încheiat: partida e câștigată, fără ofertă.
    const end = step({ ...s0, faza: 'val', val: WAVES.length - 1, inamici: [], deGenerat: [] })
    expect(end.faza).toBe('castigat')
    expect(end.oferta).toEqual([])
  })

  it('e deterministă, iar o carte vine mereu din afara stilului (tipuri de turn pe care nu le ai)', () => {
    const towers = (...tipuri: (keyof typeof TOWERS)[]): GameState['turnuri'] =>
      tipuri.map((tip, i) => ({ id: i + 1, tip, hex: `${i},-1`, tintire: 'primul', reincarcare: 0, combinat: false }))
    for (let seed = 0; seed < 60; seed++) {
      for (const val of [1, 4, 9]) {
        const turnuri = towers('fizic', 'fizic', 'frig')
        const offer = draftOffer({ seed, val, turnuri, carti: [] })
        expect(draftOffer({ seed, val, turnuri, carti: [] })).toEqual(offer)
        const outside = offer.filter((id) => {
          const t = cardTower(id)
          return t !== undefined && t !== 'fizic' && t !== 'frig'
        })
        expect(outside).toHaveLength(DRAFT.dinAfara)
        // …și e ultima: întâi cele din stil.
        expect(offer.at(-1)).toBe(outside[0])
      }
    }
    // Fără turnuri, nimic nu e „din afară”: oferta vine din toate cărțile.
    expect(draftOffer({ seed: 1, val: 1, turnuri: [], carti: [] })).toHaveLength(DRAFT.marime)
    // Seed-uri sau valuri diferite dau oferte diferite (măcar o dată din 20).
    const offers = new Set(Array.from({ length: 20 }, (_, i) => draftOffer({ seed: i, val: 1, turnuri: [], carti: [] }).join()))
    expect(offers.size).toBeGreaterThan(1)
  })

  it('o relicvă luată nu mai apare', () => {
    for (let seed = 0; seed < 200; seed++) {
      const offer = draftOffer({ seed, val: 2, turnuri: [], carti: ['cartograful', 'bastionul'] })
      expect(offer).not.toContain('cartograful')
      expect(offer).not.toContain('bastionul')
    }
  })

  it('datele: fiecare carte are un efect cu sens', () => {
    for (const id of CARD_IDS) {
      const e: CardEffect = CARDS[id].efect
      if (e.tip === 'turn' || e.tip === 'imbunatatire') expect(TOWERS[e.turn]).toBeDefined()
      if (e.tip === 'imbunatatire') expect((e.dauna ?? 0) + (e.reincarcare ?? 0)).toBeGreaterThan(0)
      if (e.tip === 'relicva') expect((e.ocoluriPeVal ?? 0) + (e.vieti ?? 0)).toBeGreaterThan(0)
      if (e.tip === 'traseu') expect(e.ocoluri).toBeGreaterThan(0)
    }
    // Fiecare tip de turn are o carte de turn și cel puțin o îmbunătățire.
    for (const t of TOWER_TYPES) expect(CARD_IDS.filter((id) => cardTower(id) === t).length).toBeGreaterThanOrEqual(2)
  })
})

describe('draftul: alegerea', () => {
  it('valul nu pornește fără alegere; alegerea intră în jurnal și golește oferta; refuzurile spun de ce', () => {
    const s = withOffer(['turn-fizic', 'fizic-dauna', 'bastionul'])
    expect(checkStartWave(s)).toEqual({ ok: false, reason: 'alege întâi o carte din draft (1 din 3)' })
    expect(reason(applyDecision(s, { tip: 'alege', carte: 'foc-dauna' }))).toBe('cartea nu e în oferta de acum')
    const a = must(s, { tip: 'alege', carte: 'bastionul' })
    expect(a.oferta).toEqual([])
    expect(a.carti).toEqual(['bastionul'])
    expect(a.jurnal.at(-1)!.d).toEqual({ tip: 'alege', carte: 'bastionul' })
    expect(checkStartWave(a).ok).toBe(true)
    expect(reason(applyDecision(a, { tip: 'alege', carte: 'turn-fizic' }))).toMatch(/nu e nicio carte de ales/)
    expect(reason(applyDecision({ ...s, faza: 'val' }, { tip: 'alege', carte: 'bastionul' }))).toBe('cărțile se aleg doar între valuri')
  })

  it('turn gratuit: următorul turn de tipul ăla nu costă nimic (nici pe deal), apoi prețul revine', () => {
    const s = must(withOffer(['turn-fizic', 'fizic-dauna', 'bastionul']), { tip: 'alege', carte: 'turn-fizic' })
    const deal = [...s.map.terrain].find(([k, t]) => t === 'deal' && !s.path.some((h) => `${h.q},${h.r}` === k))![0]
    expect(towerCost(s, 'fizic', deal)).toBe(0)
    expect(towerCost(s, 'foc', deal)).toBeGreaterThan(0)
    const built = must(s, { tip: 'turn', turn: 'fizic', hex: deal })
    expect(built.aur).toBe(s.aur)
    expect(built.gratuite.fizic).toBe(0)
    expect(towerCost(built, 'fizic', deal)).toBe(TOWERS.fizic.cost + 20)
  })

  it('îmbunătățirile se adună și schimbă lovitura, singur și combinat', () => {
    let s = must(withOffer(['fizic-dauna']), { tip: 'alege', carte: 'fizic-dauna' })
    expect(towerDamage(s, 'fizic')).toBe(50)
    s = must({ ...s, oferta: ['fizic-dauna'] }, { tip: 'alege', carte: 'fizic-dauna' })
    expect(towerDamage(s, 'fizic')).toBe(60)
    s = must({ ...s, oferta: ['fizic-ritm'] }, { tip: 'alege', carte: 'fizic-ritm' })
    // Trage cu 20% mai des: 30 × 100/120 = 25.
    expect(towerReload(s, 'fizic')).toBe(25)
    expect(towerReload(s, 'foc')).toBe(TOWERS.foc.reincarcare)
    // Cinci cărți de ritm: cadența se dublează, reîncărcarea nu ajunge la zero.
    expect(towerReload({ imbunatatiri: { fizic: { dauna: 0, reincarcare: 100 } } }, 'fizic')).toBe(15)
    expect(towerReload({ imbunatatiri: { foc: { dauna: 0, reincarcare: 1000 } } }, 'foc')).toBe(1)
    // Combinat: Fizic (60 la 25 de tick-uri) e acum tot cel mai lent, deci grupul trage la 25 și Fizic dă 60, +15%.
    const impact = combinedContacts(['fizic', 'fulger'], s.imbunatatiri).find((c) => c.element === 'impact')!
    expect(impact.dauna).toBe(Math.floor((60 * 115) / 100))
  })

  it('o îmbunătățire chiar schimbă cât lovește turnul în val', () => {
    const arena = (s: GameState): GameState => {
      const terrain = new Map([...s.map.terrain].map(([k]) => [k, 'campie' as const]))
      return { ...s, map: { ...s.map, terrain }, aur: 1000, ocoluriPeVal: 0 }
    }
    const foe: Enemy = { id: 1, tip: 'normal', viata: 5000, progres: 9000, stari: {} }
    const shot = (s: GameState): GameState => step({ ...s, faza: 'val', inamici: [foe], deGenerat: [{ tick: 1e6, tip: 'normal' }] })
    const play = (s: GameState): GameState => shot(must(s, { tip: 'turn', turn: 'fizic', hex: '0,-1' }))
    const pick = (carte: CardId): GameState => must(withOffer([carte], arena(newGame(7))), { tip: 'alege', carte })
    const lost = (w: GameState): number => 5000 - w.inamici[0]!.viata
    expect(lost(play(arena(newGame(7))))).toBe(40)
    expect(lost(play(pick('fizic-dauna')))).toBe(50)
    // Ritmul: după lovitură, turnul se reîncarcă 25 de tick-uri, nu 30.
    expect(play(pick('fizic-ritm')).turnuri[0]!.reincarcare).toBe(25)
    // Și un grup combinat folosește cifrele îmbunătățite.
    const grup = (s: GameState): GameState => {
      const two = must(must(s, { tip: 'turn', turn: 'fizic', hex: '0,-1' }), { tip: 'turn', turn: 'fulger', hex: '1,-1' })
      return shot(must(two, { tip: 'combina', turn: 1, activ: true }))
    }
    const withCard = pick('fizic-dauna')
    expect(lost(grup(withCard))).toBe(combinedContacts(['fizic', 'fulger'], withCard.imbunatatiri).reduce((n, c) => n + c.dauna, 0))
    expect(lost(grup(withCard))).toBeGreaterThan(lost(grup(arena(newGame(7)))))
  })

  it('Cartograful: +1 ocol în fiecare pregătire; Ocol în plus: doar în pregătirea asta; Bastionul: +5 vieți', () => {
    const s0 = { ...newGame(3), oferta: ['cartograful', 'ocol-in-plus', 'bastionul'] as CardId[] }
    const carto = must(s0, { tip: 'alege', carte: 'cartograful' })
    expect(detourLimit(carto)).toBe(2)
    // Amândouă ocolurile sunt obligatorii.
    const one = must(carto, firstDetour(carto)!)
    expect(checkStartWave(one).ok).toBe(false)
    const two = must(one, firstDetour(one)!)
    expect(checkStartWave(two).ok).toBe(true)
    const inWave = must(two, { tip: 'pornesteVal' })
    expect(detourLimit(inWave)).toBe(2)

    const plus = must(s0, { tip: 'alege', carte: 'ocol-in-plus' })
    expect(detourLimit(plus)).toBe(2)
    const plusWave = must(must(must(plus, firstDetour(plus)!), firstDetour(must(plus, firstDetour(plus)!))!), { tip: 'pornesteVal' })
    expect(detourLimit(plusWave)).toBe(1)

    expect(must(s0, { tip: 'alege', carte: 'bastionul' }).vieti).toBe(s0.vieti + 5)
  })

  it('oferta, cărțile, turnurile gratuite, îmbunătățirile și ocolurile în plus intră în amprentă', () => {
    const s = newGame(3)
    const base = fingerprint(s)
    expect(fingerprint({ ...s, oferta: ['bastionul'] })).not.toBe(base)
    expect(fingerprint({ ...s, carti: ['bastionul'] })).not.toBe(base)
    expect(fingerprint({ ...s, gratuite: { foc: 1 } })).not.toBe(base)
    expect(fingerprint({ ...s, imbunatatiri: { frig: { dauna: 0, reincarcare: 20 } } })).not.toBe(base)
    expect(fingerprint({ ...s, ocoluriBonus: 1 })).not.toBe(base)
  })
})
