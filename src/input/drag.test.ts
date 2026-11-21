import { describe, expect, it } from 'vitest'
import { dragDown, dragMove, dragReset, dragTake, dragUp, newDrag } from './drag'

describe('condusul cu degetul', () => {
  it('degetul pus nu mișcă nimic', () => {
    const d = newDrag(); dragDown(d, 1, 100, 100)
    expect(dragTake(d)).toEqual({ dx: 0, dy: 0 })
  })
  it('mișcarea se dă o dată, apoi zero', () => {
    const d = newDrag(); dragDown(d, 1, 100, 100); dragMove(d, 1, 130, 90)
    expect(dragTake(d)).toEqual({ dx: 30, dy: -10 })
    expect(dragTake(d)).toEqual({ dx: 0, dy: 0 })
  })
  it('mișcarea din mai multe cadre fără citire se adună', () => {
    const d = newDrag(); dragDown(d, 1, 0, 0); dragMove(d, 1, 10, 5); dragMove(d, 1, 25, -5)
    expect(dragTake(d)).toEqual({ dx: 25, dy: -5 })
  })
  it('ridicat și pus în alt loc nu dă nicio mișcare', () => {
    const d = newDrag(); dragDown(d, 1, 0, 0); dragMove(d, 1, 10, 0); dragTake(d); dragUp(d, 1)
    dragDown(d, 2, 300, 400)
    expect(dragTake(d)).toEqual({ dx: 0, dy: 0 })
    dragMove(d, 2, 305, 400); expect(dragTake(d)).toEqual({ dx: 5, dy: 0 })
  })
  it('mișcarea nestrânsă a unui deget nu trece în degetul următor', () => {
    const d = newDrag(); dragDown(d, 1, 0, 0); dragMove(d, 1, 10, 0); dragUp(d, 1); dragDown(d, 2, 50, 50)
    expect(dragTake(d)).toEqual({ dx: 0, dy: 0 })
  })
  it('al doilea deget e ignorat la apăsare, la mișcare și la ridicare', () => {
    const d = newDrag(); dragDown(d, 1, 0, 0)
    dragDown(d, 2, 200, 200); dragMove(d, 2, 250, 250); dragUp(d, 2)
    expect([d.on, d.id]).toEqual([true, 1])
    expect(dragTake(d)).toEqual({ dx: 0, dy: 0 })
    dragMove(d, 1, 4, 6); expect(dragTake(d)).toEqual({ dx: 4, dy: 6 })
  })
  it('mișcarea fără deget pus nu face nimic', () => {
    const d = newDrag(); dragMove(d, 1, 50, 50)
    expect(dragTake(d)).toEqual({ dx: 0, dy: 0 })
  })
  it('o poziție care nu e număr finit e ignorată', () => {
    const d = newDrag(); dragDown(d, 1, NaN, 5); expect(d.on).toBe(false)
    dragDown(d, 1, 10, 10); dragMove(d, 1, Infinity, 20); dragMove(d, 1, 5, NaN)
    dragMove(d, 1, 14, 13)
    expect(dragTake(d)).toEqual({ dx: 4, dy: 3 })
  })
  it('dragReset lasă degetul și golește mișcarea; un deget nou conduce de la zero', () => {
    const d = newDrag(); dragDown(d, 1, 0, 0); dragMove(d, 1, 30, 30); dragReset(d)
    expect([d.on, d.id]).toEqual([false, -1]); expect(dragTake(d)).toEqual({ dx: 0, dy: 0 })
    dragMove(d, 1, 99, 99); expect(dragTake(d)).toEqual({ dx: 0, dy: 0 })
    dragDown(d, 3, 10, 10); dragMove(d, 3, 12, 10); expect(dragTake(d)).toEqual({ dx: 2, dy: 0 })
  })
})
