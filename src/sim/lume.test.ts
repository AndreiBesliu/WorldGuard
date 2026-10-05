import { describe, expect, it } from 'vitest'
import { EVOLUTIE, LUME } from '../data/lume'
import { checkTerraform, fingerprint, isOldRoad, newGame, replay, step, type GameState } from './game'
import { key } from './hex'
import {
  commitRun,
  decodeWorld,
  encodeWorld,
  evolvedTerrain,
  newWorld,
  planetRegions,
  planetSaved,
  regionAccess,
  regionOf,
  regionTerrain,
  savedRing,
  startRun,
  type Lume,
} from './lume'
import { must, startWave } from './testkit'

const START = key(LUME.start)

/** O partidă jucată pe regiune: terraformările date, apoi încheiată cu faza dată, după `tickuri`. */
function played(l: Lume, cheie: string, teren: { actiune: 'canal' | 'deal' | 'arde'; hex: string }[], faza: GameState['faza'], tickuri = 1000): GameState {
  const r = startRun(l, cheie)
  if (!r.ok) throw new Error(r.reason)
  let s: GameState = { ...r.value.state, pamant: 100 }
  for (const t of teren) s = must(s, { tip: 'teren', ...t })
  return { ...s, faza, tick: tickuri }
}

/** Un hexagon liber de pe harta regiunii (nu pe drumul vechi), cu terenul cerut. */
function freeHex(l: Lume, cheie: string, teren: string): string {
  const r = startRun(l, cheie)
  if (!r.ok) throw new Error(r.reason)
  const s = r.value.state
  const k = [...s.map.terrain].find(([h, t]) => t === teren && !isOldRoad(s.map, h) && !s.path.some((p) => key(p) === h))?.[0]
  if (!k) throw new Error(`nu e ${teren} pe harta regiunii ${cheie}`)
  return k
}

/** Salvează regiunea (o partidă câștigată, fără terraformări). */
const win = (l: Lume, cheie: string): Lume => commitRun(l, cheie, played(l, cheie, [], 'castigat'))

describe('planeta', () => {
  it('7 regiuni: inima în centru, 6 în jur, fiecare cu seed-ul ei; aceeași planetă din același seed', () => {
    const r = planetRegions(42)
    expect(r).toHaveLength(7)
    expect(r.filter((x) => x.inima).map((x) => x.cheie)).toEqual(['0,0'])
    expect(new Set(r.map((x) => x.seed)).size).toBe(7)
    expect(planetRegions(42)).toEqual(r)
    expect(planetRegions(43).map((x) => x.seed)).not.toEqual(r.map((x) => x.seed))
    expect(r.every((x) => x.nume.length > 0)).toBe(true)
  })

  it('accesul: întâi doar vestul; o regiune salvată deschide vecinele; inima, după 5 regiuni salvate', () => {
    let l = newWorld(42)
    const acces = (): Record<string, string> => Object.fromEntries(planetRegions(42).map((r) => [r.cheie, regionAccess(l, r.cheie)]))
    expect(Object.entries(acces()).filter(([, a]) => a === 'accesibila').map(([k]) => k)).toEqual([START])
    expect(startRun(l, '1,0')).toEqual({ ok: false, reason: 'regiunea se deschide după ce salvezi o vecină' })
    // O partidă pierdută nu salvează regiunea și nu deschide nimic.
    l = commitRun(l, START, played(l, START, [], 'pierdut'))
    expect(regionAccess(l, START)).toBe('accesibila')
    l = win(l, START)
    // O partidă pierdută după aceea nu o mai pierde: rămâne salvată.
    expect(regionAccess(commitRun(l, START, played(l, START, [], 'pierdut')), START)).toBe('salvata')
    expect(acces()).toMatchObject({ [START]: 'salvata', '0,-1': 'accesibila', '-1,1': 'accesibila', '1,0': 'blocata', '0,0': 'blocata' })
    // Inelul, pe rând, de la vest spre est pe sus: inima se deschide la a cincea.
    for (const k of ['0,-1', '1,-1', '1,0']) l = win(l, k)
    expect(savedRing(l)).toBe(4)
    expect(regionAccess(l, '0,0')).toBe('blocata')
    expect(startRun(l, '0,0')).toEqual({ ok: false, reason: `inima se deschide după ${LUME.pentruInima} regiuni salvate` })
    l = win(l, '0,1')
    expect(regionAccess(l, '0,0')).toBe('accesibila')
    expect(planetSaved(l)).toBe(false)
    l = win(l, '0,0')
    expect(planetSaved(l)).toBe(true)
  })
})

describe('terenul care ține minte', () => {
  it('ce ai făcut terenului rămâne pentru partida următoare pe regiune; ceasul lumii înaintează cu timpul jucat', () => {
    let l = newWorld(42)
    const apa = freeHex(l, START, 'campie')
    const deal = freeHex(l, START, 'padure')
    const s = played(l, START, [
      { actiune: 'canal', hex: apa },
      { actiune: 'deal', hex: deal },
    ], 'pierdut', 5000)
    l = commitRun(l, START, s)
    expect(l.ceas).toBe(5000)
    expect(l.regiuni[START]).toMatchObject({ salvata: false, partide: 1 })
    expect(l.regiuni[START]!.editari.map((e) => [e.hex, e.actiune])).toEqual([
      [apa, 'canal'],
      [deal, 'deal'],
    ])
    const next = startRun(l, START)
    expect(next.ok && next.value.state.map.terrain.get(apa)).toBe('apa')
    expect(next.ok && next.value.state.map.terrain.get(deal)).toBe('deal')
    // Celelalte regiuni nu știu nimic de asta.
    expect(regionTerrain(l, '0,-1').size).toBe(0)
  })

  it('o partidă părăsită înainte de primul val tot înaintează ceasul: pădurea arsă e cenușă la partida următoare', () => {
    let l = newWorld(42)
    const hex = freeHex(l, START, 'padure')
    l = commitRun(l, START, played(l, START, [{ actiune: 'arde', hex }], 'pregatire', 0))
    expect(l.ceas).toBe(1)
    expect(regionTerrain(l, START).get(hex)).toBe('cenusa')
  })

  it('o editare poartă ora lumii de când s-a făcut: ceasul de la începutul partidei plus tick-ul deciziei', () => {
    const l = { ...newWorld(42), ceas: 100 }
    const r = startRun(l, START)
    if (!r.ok) throw new Error(r.reason)
    const hex = freeHex(l, START, 'padure')
    // Pădurea arsă în pregătirea de după câteva valuri (tick 3000), partida terminată la tick-ul 5000.
    const s = must({ ...r.value.state, tick: 3000, pamant: 10 }, { tip: 'teren', actiune: 'arde', hex })
    const dupa = commitRun(l, START, { ...s, faza: 'pierdut', tick: 5000 })
    expect(dupa.regiuni[START]!.editari).toEqual([{ hex, actiune: 'arde', la: 3100 }])
    expect(dupa.ceas).toBe(5100)
    // Puieții cresc socotind de la ora arderii, nu de la începutul partidei.
    const puiet = EVOLUTIE.arde[2]!.dupa
    expect(regionTerrain({ ...dupa, ceas: 3100 + puiet - 1 }, START).get(hex)).toBe('cenusa')
    expect(regionTerrain({ ...dupa, ceas: 3100 + puiet }, START).get(hex)).toBe('puiet')
  })

  it('o decizie anulată (Z) nu rămâne: editările vin din jurnal', () => {
    const l = newWorld(42)
    const r = startRun(l, START)
    if (!r.ok) throw new Error(r.reason)
    const hex = freeHex(l, START, 'campie')
    const s = must({ ...r.value.state, pamant: 10 }, { tip: 'teren', actiune: 'canal', hex })
    const anulat = replay(s.seed, s.jurnal.slice(0, -1), s.tick, r.value.teren)
    expect(commitRun(l, START, { ...anulat, faza: 'pierdut' }).regiuni[START]!.editari).toEqual([])
  })

  it('pădurea arsă: jar tot restul partidei, apoi cenușă, puieți, pădure — după ceasul lumii', () => {
    const e = { hex: '1,-3', actiune: 'arde' as const, la: 100 }
    const [, cenusa, puiet, padure] = EVOLUTIE.arde
    expect(evolvedTerrain(e, 100)).toBe('jar')
    expect(evolvedTerrain(e, 101)).toBe('cenusa')
    expect(evolvedTerrain(e, 100 + puiet!.dupa - 1)).toBe(cenusa!.teren)
    expect(evolvedTerrain(e, 100 + puiet!.dupa)).toBe('puiet')
    expect(evolvedTerrain(e, 100 + padure!.dupa)).toBe('padure')
    const canal = { hex: '1,-3', actiune: 'canal' as const, la: 0 }
    expect(evolvedTerrain(canal, EVOLUTIE.canal[1]!.dupa - 1)).toBe('apa')
    expect(evolvedTerrain(canal, EVOLUTIE.canal[1]!.dupa)).toBe('campie')
    expect(evolvedTerrain({ hex: '1,-3', actiune: 'deal', la: 0 }, 10 ** 9)).toBe('deal')
  })

  it('pe hartă: pădurea arsă e cenușă la partida următoare; cenușa nu mai arde; ultima editare a unui hexagon câștigă', () => {
    let l = newWorld(42)
    const hex = freeHex(l, START, 'padure')
    l = commitRun(l, START, played(l, START, [{ actiune: 'arde', hex }], 'pierdut'))
    const r = startRun(l, START)
    if (!r.ok) throw new Error(r.reason)
    expect(r.value.state.map.terrain.get(hex)).toBe('cenusa')
    expect(checkTerraform({ ...r.value.state, pamant: 10 }, 'arde', hex)).toEqual({
      ok: false,
      reason: 'aprinzi pădurea se poate doar pe pădure, nu pe cenușă',
    })
    // Un canal pe cenușă: hexagonul e apă de acum încolo, nu mai trece prin puieți.
    l = commitRun(l, START, played(l, START, [{ actiune: 'canal', hex }], 'pierdut'))
    l = { ...l, ceas: l.ceas + EVOLUTIE.arde[2]!.dupa }
    expect(regionTerrain(l, START).get(hex)).toBe('apa')
  })

  it('drumul vechi nu se terraformează: drumul se reface pe el la fiecare partidă', () => {
    const r = startRun(newWorld(42), START)
    if (!r.ok) throw new Error(r.reason)
    const s = r.value.state
    // Un hexagon al drumului vechi, liber pentru că un ocol l-ar fi ocolit: îl simulăm cu un drum mutat.
    const vechi = key(s.path[4]!)
    const mutat = { ...s, path: s.path.filter((h) => key(h) !== vechi), pamant: 10, map: { ...s.map, terrain: new Map(s.map.terrain).set(vechi, 'campie') } }
    expect(checkTerraform(mutat, 'canal', vechi)).toEqual({ ok: false, reason: 'pe drumul vechi nu se poate: drumul se reface pe aici la fiecare partidă' })
    expect(isOldRoad(s.map, key(s.map.spawn))).toBe(true)
    expect(isOldRoad(s.map, '0,-1')).toBe(false)
  })

  it('o partidă pe o regiune modificată se rejoacă identic din (seed, teren, jurnal)', () => {
    let l = newWorld(42)
    const hex = freeHex(l, START, 'padure')
    l = commitRun(l, START, played(l, START, [{ actiune: 'arde', hex }], 'pierdut'))
    const r = startRun(l, START)
    if (!r.ok) throw new Error(r.reason)
    let s = startWave(r.value.state)
    for (let i = 0; i < 300; i++) s = step(s)
    const again = replay(s.seed, s.jurnal, s.tick, r.value.teren)
    expect(fingerprint(again)).toBe(fingerprint(s))
    // Fără terenul regiunii, rejucarea dă altă hartă.
    expect(fingerprint(replay(s.seed, s.jurnal, s.tick))).not.toBe(fingerprint(s))
  })
})

describe('salvarea', () => {
  it('lumea se salvează și se reface identic', () => {
    let l = newWorld(7)
    const hex = freeHex(l, START, 'campie')
    l = commitRun(l, START, played(l, START, [{ actiune: 'canal', hex }], 'castigat'))
    const back = decodeWorld(encodeWorld(l))
    expect(back).toEqual({ ok: true, value: l })
  })

  it('o salvare stricată se refuză, cu motiv', () => {
    const bun = newWorld(7)
    const rau = (x: unknown): string => {
      const r = decodeWorld(typeof x === 'string' ? x : JSON.stringify(x))
      return r.ok ? 'ok' : r.reason
    }
    expect(rau('{')).toBe('salvarea nu e JSON')
    expect(rau({ ...bun, schema: 2 })).toBe('schema necunoscută: 2')
    expect(rau({ ...bun, planeta: { seed: 7, versiune: 99 } })).toBe('planeta e dintr-o versiune mai nouă a generatorului (99)')
    expect(rau({ ...bun, ceas: -1 })).toBe('ceasul lumii e stricat')
    expect(rau({ ...bun, regiuni: { '5,5': { salvata: true, partide: 1, editari: [] } } })).toBe('regiune necunoscută: 5,5')
    expect(rau({ ...bun, ceas: 10, regiuni: { [START]: { salvata: false, partide: 1, editari: [{ hex: '99,99', actiune: 'canal', la: 1 }] } } })).toBe(
      `o editare din regiunea ${START} e stricată`,
    )
    expect(rau({ ...bun, ceas: 10, regiuni: { [START]: { salvata: false, partide: 1, editari: [{ hex: '0,-1', actiune: 'canal', la: 11 }] } } })).toBe(
      `o editare din regiunea ${START} e stricată`,
    )
    expect(rau(bun)).toBe('ok')
  })

  it('regiunile au hărți diferite, iar o regiune neatinsă are harta generatorului', () => {
    const l = newWorld(42)
    const a = startRun(l, START)
    const b = regionOf(l, '0,-1')!
    expect(a.ok && a.value.state.map.terrain).toEqual(newGame(regionOf(l, START)!.seed).map.terrain)
    expect(newGame(b.seed).map.terrain).not.toEqual(a.ok && a.value.state.map.terrain)
  })
})
