import { describe, expect, it } from 'vitest'
import { keysVector, newStick, stickDown, stickMove, stickUp, stickVector } from './joystick'

const drag = (dx: number, dy = 0) => { const j = newStick(); stickDown(j, 1, 100, 100); stickMove(j, 1, 100 + dx, 100 + dy); return j }

describe('joystick', () => {
  it('sub 14% din cursă eroul stă; la 70% are viteza maximă', () => {
    expect(stickVector(drag(6))).toEqual({ x: 0, y: 0 })
    expect(stickVector(drag(16.8)).x).toBeCloseTo(0.5, 6)
    expect(stickVector(drag(33.6)).x).toBeCloseTo(1, 6)
    const v = stickVector(drag(30, 40)); expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 6); expect(v.y / v.x).toBeCloseTo(4 / 3, 6)
  })
  it('baza urmează degetul la o tragere lungă', () => {
    const j = drag(80); expect([j.bx, j.by]).toEqual([132, 100]); expect(stickVector(j)).toEqual({ x: 1, y: 0 })
  })
  it('al doilea deget nu fură și nu oprește joystickul', () => {
    const j = drag(40)
    stickDown(j, 2, 300, 300); stickMove(j, 2, 0, 0); stickUp(j, 2)
    expect([j.on, j.id]).toEqual([true, 1]); expect(stickVector(j).x).toBeCloseTo(1, 6)
    stickUp(j, 1); expect(stickVector(j)).toEqual({ x: 0, y: 0 })
  })
  it('tastele dau o direcție de lungime cel mult 1', () => {
    expect(keysVector(new Set(['KeyD']))).toEqual({ x: 1, y: 0 })
    const v = keysVector(new Set(['KeyW', 'ArrowRight'])); expect(v.x).toBeCloseTo(Math.SQRT1_2, 9); expect(v.y).toBeCloseTo(-Math.SQRT1_2, 9)
    expect(keysVector(new Set(['KeyA', 'KeyD']))).toEqual({ x: 0, y: 0 })
  })
})
