import { describe, expect, it } from 'vitest'
import { alpha, hex6 } from './palette'

describe('culorile citite din CSS', () => {
  it('forma scurtă, lăsată de micșorarea CSS-ului, e adusă la șase cifre', () => {
    expect(hex6('#fff')).toBe('#ffffff')
    expect(hex6('#0af')).toBe('#00aaff')
    expect(hex6('#0c1236')).toBe('#0c1236')
  })
  it('alpha dă aceeași culoare pentru forma scurtă și pentru cea lungă', () => {
    expect(alpha('#fff', 0.5)).toBe('rgba(255,255,255,0.5)')
    expect(alpha('#ffffff', 0.5)).toBe('rgba(255,255,255,0.5)')
    expect(alpha('#ffcf4a', 1)).toBe('rgba(255,207,74,1)')
  })
})
