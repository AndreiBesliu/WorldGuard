import { describe, expect, it } from 'vitest'
import { FLIGHT } from '../data/flight'
import { flightKeys, pickIndex, type PickKey } from './bind'

const key = (code: string, over: Partial<PickKey> = {}): PickKey => ({ code, repeat: false, ctrlKey: false, altKey: false, metaKey: false, ...over })

describe('tastele care aleg din panou', () => {
  it('1, 2, 3, de pe rândul cu cifre și de pe tastatura numerică, înseamnă ofertele 0, 1, 2', () => {
    expect(['Digit1', 'Digit2', 'Digit3'].map((c) => pickIndex(key(c)))).toEqual([0, 1, 2])
    expect(['Numpad1', 'Numpad2', 'Numpad3'].map((c) => pickIndex(key(c)))).toEqual([0, 1, 2])
  })
  it('celelalte taste nu aleg nimic', () => {
    expect(['Digit0', 'Digit4', 'Numpad4', 'KeyA', 'ArrowUp', 'Enter', 'Space', 'toString'].map((c) => pickIndex(key(c)))).toEqual([null, null, null, null, null, null, null, null])
  })
  it('tasta ținută apăsată (repeat) nu alege', () => {
    expect(pickIndex(key('Digit1', { repeat: true }))).toBeNull()
  })
  it('cu Ctrl, Alt sau Meta nu alege: sunt scurtăturile browserului', () => {
    expect(pickIndex(key('Digit1', { ctrlKey: true }))).toBeNull()
    expect(pickIndex(key('Digit2', { altKey: true }))).toBeNull()
    expect(pickIndex(key('Digit3', { metaKey: true }))).toBeNull()
  })
})

describe('tastele în zbor', () => {
  it('o secundă de săgeată la dreapta mută nava cu 255 de unități, după înmulțirea regulilor cu 1,2', () => {
    const m = flightKeys({ x: 1, y: 0 }, 1)
    expect(m.dx * FLIGHT.drive.gain).toBeCloseTo(255, 9)
    expect(m.dy).toBe(0)
    expect(FLIGHT.drive.keys).toBe(255)
  })
  it('se împarte pe pași: trei pași de 1/60 s dau de trei ori cât unul; pe diagonală, direcția normalizată păstrează viteza', () => {
    expect(flightKeys({ x: 0, y: -1 }, 3 / 60).dy).toBeCloseTo(3 * flightKeys({ x: 0, y: -1 }, 1 / 60).dy, 12)
    const d = flightKeys({ x: Math.SQRT1_2, y: Math.SQRT1_2 }, 1)
    expect(Math.hypot(d.dx, d.dy) * FLIGHT.drive.gain).toBeCloseTo(255, 9)
  })
  it('fără taste, nicio mișcare (și fără −0)', () => {
    expect(Object.is(flightKeys({ x: 0, y: 0 }, 1).dx, 0)).toBe(true)
    expect(Object.is(flightKeys({ x: -0, y: 0 }, 1).dx, 0)).toBe(true)
  })
})
