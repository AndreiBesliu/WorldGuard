import { expect, it } from 'vitest'
import { createGame } from '../sim/state'
import { step } from '../sim/step'
import { RECORD_KEY, SAVE_KEY, clearGame, loadGame, readRecord, saveGame, saveIfRecord } from './storage'

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
