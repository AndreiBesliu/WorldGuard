import { describe, expect, it } from 'vitest'
import { createRng } from '../sim/rng'
import { createGame, type GameState, type Input } from '../sim/state'
import { step } from '../sim/step'
import { spawnFoe } from '../sim/foes'
import { quietGame } from '../sim/testkit'
import { SAVE_VERSION, packSave, unpackSave } from './save'

describe('salvarea', () => {
  const script = (steps: number): Input[] => {
    const r = createRng(99, 'comenzi-test'); const out: Input[] = []; let d: Input = { x: 0, y: 0 }
    for (let i = 0; i < steps; i++) {
      if (i % 120 === 0) { const a = r.next() * Math.PI * 2; d = { x: Math.cos(a), y: Math.sin(a) } }
      out.push(d)
    }
    return out
  }
  const busy = (secs: number): GameState => {          // o partidă plină: turele care trag, erou care umblă, nucleu care nu cade
    const s = createGame(11)
    for (const p of s.pads) if (p.kind === 'turret') p.lvl = 2
    s.core.hp = 1e9
    for (const i of script(secs * 60)) step(s, i)
    return s
  }
  const negZero = (v: unknown): boolean =>
    typeof v === 'number' ? Object.is(v, -0) : v !== null && typeof v === 'object' && Object.values(v).some(negZero)

  it.each([30, 90, 150, 240])('salvată la %i s și reluată, partida continuă identic', (at) => {
    const a = busy(at); const r = unpackSave(packSave(a))
    expect(r.ok).toBe(true); if (!r.ok) return
    const b = r.value
    for (const i of script((at + 30) * 60).slice(at * 60)) { step(a, i); step(b, i) }
    expect(b).toEqual(a)
  })
  it('starea nu conține zero negativ', () => {
    for (const at of [30, 150, 240]) expect(negZero(busy(at))).toBe(false)
  })
  it('respinge ce nu e o salvare bună și spune de ce', () => {
    const good = packSave(busy(5))
    const tweak = (f: (o: any) => void): string => { const o = JSON.parse(good); f(o); return JSON.stringify(o) }
    const why = (t: string | null): string => { const r = unpackSave(t); return r.ok ? 'ok' : r.reason }
    expect(why(good)).toBe('ok')
    expect([why(null), why('')]).toEqual(['lipsă', 'lipsă'])
    expect([why('abc'), why('{}'), why('[]'), why('null')]).toEqual(['stricată', 'stricată', 'stricată', 'stricată'])
    expect(why(tweak((o) => { o.v = SAVE_VERSION + 1 }))).toBe('altă versiune')
    expect(why(tweak((o) => { o.state.mode = 'over' }))).toBe('partidă terminată')
    expect(why(tweak((o) => { o.state.pads.pop() }))).toBe('altă formă')
    expect(why(tweak((o) => { delete o.state.hero }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.x = null }))).toBe('altă formă')
  })
  it('o salvare cu 150 de dușmani rămâne mică', () => {
    const s = quietGame(); s.tick = 12000; s.t = 200
    for (let i = 0; i < 150; i++) spawnFoe(s)
    expect(packSave(s).length).toBeLessThan(100_000)
  })
})
