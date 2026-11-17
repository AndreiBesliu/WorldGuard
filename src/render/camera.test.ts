import { describe, expect, it } from 'vitest'
import { advance } from '../app/loop'
import { DT } from '../sim/state'
import { step } from '../sim/step'
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
  it('înainte de primul resize (vedere 0 × 0) camera rămâne un număr finit', () => {
    const s = quietGame(); const cam = { x: 0, y: 0 }; const v = view(0, 0)
    for (let i = 0; i < 10; i++) followCamera(cam, s, v, 1 / 60)
    expect(Number.isFinite(cam.x)).toBe(true); expect(Number.isFinite(cam.y)).toBe(true)
  })
  it('la mers cu viteză maximă, poziția eroului pe ecran nu tremură la 60, 90, 120 și 144 Hz', () => {
    for (const hz of [60, 90, 120, 144]) {
      const s = quietGame(); heroAt(s, 250, 1200)
      const cam = { x: 250, y: 1200 + 50 }; const v = view(412, 915)
      const onScreen = (): number => (s.hero.x - cam.x) * v.scale
      let acc = 0, prev = onScreen(), skipped = 0
      for (let i = 0, n = 2 * hz; i < n; i++) {
        const r = advance(acc, 1 / hz); acc = r.acc
        for (let k = 0; k < r.steps; k++) step(s, { x: 1, y: 0 })
        followCamera(cam, s, v, r.steps * DT)        // ca în main.ts: camera se mișcă doar când simularea a făcut pași
        const now = onScreen()
        if (r.steps === 0) { expect(now).toBe(prev); skipped++ }
        expect(now).toBeGreaterThanOrEqual(prev - 1e-9)   // niciodată înapoi
        prev = now
      }
      if (hz > 60) expect(skipped).toBeGreaterThan(0)
    }
  })
})
