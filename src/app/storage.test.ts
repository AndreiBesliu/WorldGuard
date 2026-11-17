import { expect, it } from 'vitest'
import { RECORD_KEY, readRecord, saveIfRecord } from './storage'

const mem = (init: Record<string, string> = {}) => { const m = { ...init }; return { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => { m[k] = v } } }
const broken = { getItem: () => { throw new Error('refuzat') }, setItem: () => { throw new Error('plin') } }

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
