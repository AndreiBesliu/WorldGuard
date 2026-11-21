import { describe, expect, it } from 'vitest'
import { createGame } from '../sim/state'
import { step } from '../sim/step'
import { buyStep } from '../workshopMode'
import { createFlightSession } from './flightSession'
import { bank, emptyProfile, markExplored, packProfile } from './profile'
import { PROFILE_KEY, RECORD_KEY, SAVE_KEY, clearGame, loadGame, loadProfile, readRecord, saveGame, saveIfRecord, saveProfile } from './storage'

const mem = (init: Record<string, string> = {}) => { const m = { ...init }; return { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => { m[k] = v }, removeItem: (k: string) => { delete m[k] } } }
const broken = { getItem: () => { throw new Error('refuzat') }, setItem: () => { throw new Error('plin') }, removeItem: () => { throw new Error('refuzat') } }

it('fără stocare, cu stocare care aruncă sau cu gunoi, recordul e 0 și jocul merge', () => {
  expect(readRecord(null)).toBe(0); expect(readRecord(broken)).toBe(0)
  for (const junk of ['', 'abc', '-5', 'NaN', '{}', '1e999']) expect(readRecord(mem({ [RECORD_KEY]: junk }))).toBe(0)
  expect(saveIfRecord(90, broken)).toEqual({ record: 90, isNew: true })
  expect(saveIfRecord(90, null)).toEqual({ record: 90, isNew: true })
})
it('ține doar recordul mai bun', () => {
  const s = mem()
  expect(saveIfRecord(120, s)).toEqual({ record: 120, isNew: true })
  expect(saveIfRecord(80, s)).toEqual({ record: 120, isNew: false })
  expect(readRecord(s)).toBe(120)
})
it('fără argument, stocarea globală lipsă sau care aruncă nu strică nimic', () => {
  const g = globalThis as { localStorage?: unknown }
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocat') } })
    expect(readRecord()).toBe(0)
    expect(saveIfRecord(50)).toEqual({ record: 50, isNew: true })
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: mem(), writable: true })
    expect(saveIfRecord(70)).toEqual({ record: 70, isNew: true })
    expect(readRecord()).toBe(70)
  } finally {
    if (had) Object.defineProperty(globalThis, 'localStorage', had); else delete g.localStorage
  }
})

it('partida salvată se citește la fel', () => {
  const st = mem(); const s = createGame(3); for (let i = 0; i < 600; i++) step(s, { x: 1, y: 0 })
  saveGame(s, st)
  expect(loadGame(st)).toEqual(s)
})
it('citirea lasă pe loc o salvare bună: citită de două ori, dă aceeași partidă', () => {
  const st = mem(); const s = createGame(3); for (let i = 0; i < 600; i++) step(s, { x: 1, y: 0 })
  saveGame(s, st); const raw = st.getItem(SAVE_KEY)
  expect([loadGame(st), loadGame(st)]).toEqual([s, s])
  expect(st.getItem(SAVE_KEY)).toBe(raw)
})
it('fără salvare, fără stocare sau cu stocare care aruncă: nicio partidă și nicio eroare', () => {
  const s = createGame(3)
  expect(loadGame(mem())).toBeNull(); expect(loadGame(null)).toBeNull(); expect(loadGame(broken)).toBeNull()
  expect(() => { saveGame(s, broken); saveGame(s, null); clearGame(broken); clearGame(null) }).not.toThrow()
})
it('o salvare stricată sau de la altă versiune e aruncată și ștearsă', () => {
  for (const junk of ['abc', '{}', JSON.stringify({ v: 999, state: {} })]) {
    const st = mem({ [SAVE_KEY]: junk })
    expect(loadGame(st)).toBeNull()
    expect(st.getItem(SAVE_KEY)).toBeNull()
  }
})
it('ștergerea scoate salvarea și lasă recordul', () => {
  const st = mem(); saveIfRecord(120, st); saveGame(createGame(3), st)
  clearGame(st)
  expect([loadGame(st), readRecord(st)]).toEqual([null, 120])
})
it('un timp care nu e număr nu devine record', () => {
  const st = mem(); saveIfRecord(120, st)
  expect(saveIfRecord(NaN, st)).toEqual({ record: 120, isNew: false })
  expect(saveIfRecord(Infinity, st)).toEqual({ record: 120, isNew: false })
  expect(readRecord(st)).toBe(120)
})

it('profilul: lipsă, stricat sau stocare care aruncă dă profil gol, fără să arunce', () => {
  expect(loadProfile(mem())).toEqual(emptyProfile())
  expect(loadProfile(mem({ [PROFILE_KEY]: '{nu e json' }))).toEqual(emptyProfile())
  expect(loadProfile(broken)).toEqual(emptyProfile())
  expect(loadProfile(null)).toEqual(emptyProfile())
  expect(() => saveProfile(emptyProfile(), broken)).not.toThrow()
  expect(() => saveProfile(emptyProfile(), null)).not.toThrow()
})
it('profilul salvat se citește la fel; unul stricat nu se șterge, următoarea salvare îl înlocuiește', () => {
  const st = mem(); const p = { crystal: 40, metal: 5, sector: 3, ups: { hull: 2, arms: 0, reach: 1, core: 0, kit: 3 } }
  saveProfile(p, st)
  expect(loadProfile(st)).toEqual(p)
  const bad = mem({ [PROFILE_KEY]: 'gunoi' })
  expect(loadProfile(bad)).toEqual(emptyProfile())
  expect(bad.getItem(PROFILE_KEY)).toBe('gunoi')
  saveProfile(p, bad)
  expect(loadProfile(bad)).toEqual(p)
  expect(PROFILE_KEY).toBe('wg.v1.profile')
})

describe('profilul cu stocarea refuzată: ținut în memorie cât e pagina deschisă', () => {
  // Legarea din `flightMode.ts` și `workshopMode.ts`, cu o stocare dată: zborul trece în rezervă, atelierul cumpără din ce e acum.
  const loop = (st: Parameters<typeof loadProfile>[0]) => {
    const fs = createFlightSession({
      ups: () => loadProfile(st).ups,
      bank: (haul) => saveProfile(bank(loadProfile(st), haul), st),
      explored: (sector) => saveProfile(markExplored(loadProfile(st), sector), st),
    })
    fs.start(3, 1)
    fs.f.crystal = 60; fs.f.metal = 12
    fs.pause()                                   // pauza trece în rezervă ce s-a strâns
    const afterFlight = loadProfile(st)
    const afterBuy = buyStep(() => loadProfile(st), (p) => saveProfile(p, st), 'hull')
    return { afterFlight, afterBuy, shown: loadProfile(st) }
  }
  const check = (r: ReturnType<typeof loop>): void => {
    expect([r.afterFlight.crystal, r.afterFlight.metal]).toEqual([60, 12])
    expect([r.afterBuy.ups.hull, r.afterBuy.crystal, r.afterBuy.metal]).toEqual([1, 10, 2])
    expect(r.shown).toEqual(r.afterBuy)          // ce arată cartonașul și atelierul după cumpărătură
  }
  it('stocare care aruncă la citire (și la scriere): rezerva de după zbor e cea adevărată, iar cumpărătura se vede', () => {
    const st = { getItem: () => { throw new Error('refuzat') }, setItem: () => { throw new Error('refuzat') }, removeItem: () => {} }
    check(loop(st))
  })
  it('stocare care aruncă doar la citire: ce s-a scris e cel din memorie', () => {
    const m = mem()
    const st = { getItem: () => { throw new Error('refuzat') }, setItem: m.setItem, removeItem: m.removeItem }
    check(loop(st))
  })
  it('stocare care aruncă la scriere (plină): rezerva nu rămâne cea veche din stocare', () => {
    const old = mem({ [PROFILE_KEY]: packProfile({ crystal: 5, metal: 1, sector: 0, ups: { hull: 0, arms: 0, reach: 0, core: 0, kit: 0 } }) })
    const st = { getItem: old.getItem, setItem: () => { throw new Error('plin') }, removeItem: old.removeItem }
    const r = loop(st)
    expect([r.afterFlight.crystal, r.afterFlight.metal]).toEqual([65, 13])
    expect([r.afterBuy.ups.hull, r.afterBuy.crystal, r.afterBuy.metal, r.shown]).toEqual([1, 15, 3, r.afterBuy])
  })
  it('fără stocare deloc (accesul aruncă): bucla merge cât e pagina deschisă', () => {
    const g = globalThis as { localStorage?: unknown }
    const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    try {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocat') } })
      check(loop(undefined))
    } finally {
      if (had) Object.defineProperty(globalThis, 'localStorage', had); else delete g.localStorage
    }
  })
  it('cu stocarea bună, stocarea e adevărul: o scriere din altă filă se vede, memoria nu o ascunde', () => {
    const st = mem()
    const p = { crystal: 40, metal: 5, sector: 1, ups: { hull: 0, arms: 0, reach: 0, core: 0, kit: 0 } }
    saveProfile(p, st)
    st.setItem(PROFILE_KEY, packProfile({ ...p, crystal: 90 }))   // cealaltă filă
    expect(loadProfile(st).crystal).toBe(90)
  })
  it('după o scriere refuzată urmată de una reușită, stocarea redevine adevărul', () => {
    const m = mem(); let full = true
    const st = { getItem: m.getItem, setItem: (k: string, v: string) => { if (full) throw new Error('plin'); m.setItem(k, v) }, removeItem: m.removeItem }
    const p = { crystal: 40, metal: 5, sector: 1, ups: { hull: 0, arms: 0, reach: 0, core: 0, kit: 0 } }
    saveProfile(p, st)
    expect(loadProfile(st)).toEqual(p)
    full = false
    saveProfile({ ...p, crystal: 41 }, st)
    m.setItem(PROFILE_KEY, packProfile({ ...p, crystal: 70 }))   // cealaltă filă
    expect(loadProfile(st).crystal).toBe(70)
  })
  it('profilul întors nu e cel ținut în memorie: schimbat de cine îl primește, nu strică memoria', () => {
    const st = { getItem: () => { throw new Error('refuzat') }, setItem: () => { throw new Error('refuzat') }, removeItem: () => {} }
    const p = { crystal: 40, metal: 5, sector: 1, ups: { hull: 0, arms: 0, reach: 0, core: 0, kit: 0 } }
    saveProfile(p, st)
    p.crystal = 0; p.ups.hull = 4
    const a = loadProfile(st); a.crystal = 1; (a.ups as Record<string, number>).arms = 3
    expect(loadProfile(st)).toEqual({ crystal: 40, metal: 5, sector: 1, ups: { hull: 0, arms: 0, reach: 0, core: 0, kit: 0 } })
  })
})
