import { describe, expect, it } from 'vitest'
import { quietGame, heroAt } from '../sim/testkit'
import { followCamera, viewScale, type View } from './camera'

const view = (w: number, h: number): View => ({ w, h, scale: viewScale(w, h), dpr: 1, hudBottom: 0 })

describe('camera', () => {
  it('scara din spec, finită și pozitivă la orice mărime', () => {
    expect(viewScale(390, 780)).toBeCloseTo(780 / 880, 9)
    expect(viewScale(1400, 800)).toBeCloseTo(1400 / 1100, 9)
    for (const [w, h] of [[0, 0], [0, 780], [390, 0], [NaN, NaN]] as const) {
      expect(viewScale(w, h)).toBeGreaterThan(0); expect(Number.isFinite(viewScale(w, h))).toBe(true)
    }
  })
  it('camera urmărește eroul, ținut puțin deasupra mijlocului, și nu iese din hartă', () => {
    const s = quietGame(); const cam = { x: 0, y: 0 }; const v = view(390, 780)
    heroAt(s, 550, 750); for (let i = 0; i < 300; i++) followCamera(cam, s, v, 1 / 60)
    expect(cam.x).toBeCloseTo(550, 0); expect(cam.y).toBeCloseTo(800, 0)
    heroAt(s, 20, 20); for (let i = 0; i < 300; i++) followCamera(cam, s, v, 1 / 60)
    expect(cam.x).toBeCloseTo(v.w / v.scale / 2 - 30, 0); expect(cam.y).toBeCloseTo(v.h / v.scale / 2 - 30, 0)
  })
  it('pe un ecran lat, unde harta încape toată pe lățime, camera rămâne lângă mijlocul ei', () => {
    const s = quietGame(); const cam = { x: 0, y: 0 }; const v = view(1400, 800); heroAt(s, 100, 750)
    for (let i = 0; i < 300; i++) followCamera(cam, s, v, 1 / 60)
    expect(cam.x).toBeGreaterThanOrEqual(519.9); expect(cam.x).toBeLessThanOrEqual(580.1)
    expect(cam.y).toBeCloseTo(800, 0)
  })
})
