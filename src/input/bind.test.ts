import { describe, expect, it } from 'vitest'
import { pickIndex, type PickKey } from './bind'

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
