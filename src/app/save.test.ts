import { describe, expect, it } from 'vitest'
import { createRng } from '../sim/rng'
import { createGame, type Fx, type GameState, type Input, type Shot } from '../sim/state'
import { step } from '../sim/step'
import { makeFoe, spawnFoe } from '../sim/foes'
import { quietGame } from '../sim/testkit'
import { SAVE_VERSION, packSave, unpackSave } from './save'

/**
 * Amprenta formei: fiecare drum de chei cu felul valorii, sortate, un drum pe rând.
 * O listă se strânge la un singur element (`[]`); dacă elementele ei au chei diferite, fiecare fel apare o dată, după `kind` (`fx[gain]`).
 */
function shapeOf(root: unknown): string {
  const out = new Set<string>()
  const visit = (v: unknown, path: string): void => {
    if (Array.isArray(v)) {
      out.add(path + ': array')
      const sig = (e: unknown): string => (e !== null && typeof e === 'object' ? Object.keys(e).sort().join() : typeof e)
      const mixed = new Set(v.map(sig)).size > 1
      for (const e of v) visit(e, path + (mixed ? `[${(e as { kind: string }).kind}]` : '[]'))
    } else if (v !== null && typeof v === 'object') {
      if (path !== '') out.add(path + ': object')
      for (const [k, x] of Object.entries(v)) visit(x, path === '' ? k : path + '.' + k)
    } else out.add(path + ': ' + (v === null ? 'null' : typeof v))
  }
  visit(root, '')
  return [...out].sort().join('\n')
}

// Forma stării pentru SAVE_VERSION 1.
const SHAPE_V1 = `
core.hitT: number
core.hp: number
core: object
crystal: number
foes: array
foes[].a: number
foes[].atkT: number
foes[].brute: boolean
foes[].dmg: number
foes[].hitT: number
foes[].hp: number
foes[].id: number
foes[].kx: number
foes[].ky: number
foes[].lungeT: number
foes[].maxHp: number
foes[].r: number
foes[].speed: number
foes[].x: number
foes[].y: number
foes[]: object
fx: array
fx[gain].kind: string
fx[gain].res: string
fx[gain].t0: number
fx[gain].x: number
fx[gain].y: number
fx[gain]: object
fx[heroDown].kind: string
fx[heroDown].t0: number
fx[heroDown].x: number
fx[heroDown].y: number
fx[heroDown]: object
fx[level].kind: string
fx[level].lvl: number
fx[level].t0: number
fx[level].what: string
fx[level].x: number
fx[level].y: number
fx[level]: object
fx[puff].kind: string
fx[puff].r: number
fx[puff].t0: number
fx[puff].x: number
fx[puff].y: number
fx[puff]: object
hero.dead: boolean
hero.face: number
hero.gatherT: number
hero.hp: number
hero.hurtT: number
hero.lvl: number
hero.moved: boolean
hero.respawnT: number
hero.strikeT: number
hero.waveA: number
hero.waveT: number
hero.x: number
hero.y: number
hero: object
kills: number
metal: number
mode: string
nextId: number
nodes: array
nodes[].left: number
nodes[].regrowAt: number
nodes[].shakeT: number
nodes[].shape: array
nodes[].shape[]: number
nodes[].type: string
nodes[].x: number
nodes[].y: number
nodes[]: object
pads: array
pads[].bx: number
pads[].by: number
pads[].cool: number
pads[].dwell: number
pads[].flip: boolean
pads[].kind: string
pads[].lvl: number
pads[].paid.crystal: number
pads[].paid.metal: number
pads[].paid: object
pads[].payT: number
pads[].popT: number
pads[].prodT: number
pads[].x: number
pads[].y: number
pads[]: object
seed: number
shots: array
shots[].a: number
shots[].dmg: number
shots[].targetId: number
shots[].tx: number
shots[].ty: number
shots[].x: number
shots[].y: number
shots[]: object
spawnN: number
spawnT: number
t: number
tick: number
`.trim()

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
  it('respinge o schimbare de formă dinăuntrul stării', () => {
    const good = packSave(busy(5))
    const tweak = (f: (o: any) => void): string => { const o = JSON.parse(good); f(o); return JSON.stringify(o) }
    const why = (t: string): string => { const r = unpackSave(t); return r.ok ? 'ok' : r.reason }
    expect(why(tweak((o) => { delete o.state.hero.hp }))).toBe('altă formă')
    expect(why(tweak((o) => { delete o.state.core.hp }))).toBe('altă formă')
    expect(why(tweak((o) => { delete o.state.pads[0].paid }))).toBe('altă formă')
    expect(why(tweak((o) => { delete o.state.pads[0].paid.metal }))).toBe('altă formă')
    expect(why(tweak((o) => { delete o.state.nodes[0].left }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.extra = 1 }))).toBe('altă formă')
  })
  it('forma stării s-a schimbat: urcă SAVE_VERSION și adu amprenta la zi', () => {
    // O stare cu câte ceva din fiecare fel. Valorile au tipurile din state.ts, ca TypeScript să ceară fiecare câmp.
    const s = createGame(0)
    makeFoe(s, 10, 20, false)
    const shot: Shot = { x: 1, y: 2, tx: 3, ty: 4, a: 0, targetId: 0, dmg: 5 }
    const fx: Fx[] = [
      { kind: 'gain', res: 'crystal', x: 1, y: 2, t0: 0 },
      { kind: 'level', what: 'turret', lvl: 1, x: 1, y: 2, t0: 0 },
      { kind: 'heroDown', x: 1, y: 2, t0: 0 },
      { kind: 'puff', r: 3, x: 1, y: 2, t0: 0 },
    ]
    s.shots.push(shot); s.fx.push(...fx)
    expect(SAVE_VERSION).toBe(1)
    expect(shapeOf(s)).toBe(SHAPE_V1)
  })
  it('o salvare cu 150 de dușmani rămâne mică', () => {
    const s = quietGame(); s.tick = 12000; s.t = 200
    for (let i = 0; i < 150; i++) spawnFoe(s)
    expect(packSave(s).length).toBeLessThan(100_000)
  })
})
