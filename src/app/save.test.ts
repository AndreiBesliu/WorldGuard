import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { OFFERS } from '../data/modules'
import { MAX_UPS, NO_UPS, WORKSHOP } from '../data/workshop'
import { heroMaxHp } from '../sim/hero'
import { slotsAt, xpNeed } from '../sim/mods'
import { createRng } from '../sim/rng'
import { createGame, type Fx, type GameState, type Input, type Offer, type Shot } from '../sim/state'
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

// Forma stării pentru SAVE_VERSION 3.
const SHAPE_V3 = `
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
fx[beam].kind: string
fx[beam].t0: number
fx[beam].tx: number
fx[beam].ty: number
fx[beam].x: number
fx[beam].y: number
fx[beam]: object
fx[blast].kind: string
fx[blast].r: number
fx[blast].t0: number
fx[blast].x: number
fx[blast].y: number
fx[blast]: object
fx[block].kind: string
fx[block].t0: number
fx[block].x: number
fx[block].y: number
fx[block]: object
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
hero.mods: array
hero.mods[].id: string
hero.mods[].t: number
hero.mods[].tier: number
hero.mods[]: object
hero.moved: boolean
hero.respawnT: number
hero.strikeT: number
hero.waveA: number
hero.waveT: number
hero.x: number
hero.xp: number
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
offer: array
offer[].id: string
offer[].tier: number
offer[]: object
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
shots[].blast: number
shots[].dmg: number
shots[].kind: string
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
ups.arms: number
ups.core: number
ups.hull: number
ups.kit: number
ups.reach: number
ups: object
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
    const shot: Shot = { x: 1, y: 2, tx: 3, ty: 4, a: 0, targetId: 0, dmg: 5, kind: 'missile', blast: 50 }
    const fx: Fx[] = [
      { kind: 'gain', res: 'crystal', x: 1, y: 2, t0: 0 },
      { kind: 'level', what: 'turret', lvl: 1, x: 1, y: 2, t0: 0 },
      { kind: 'heroDown', x: 1, y: 2, t0: 0 },
      { kind: 'puff', r: 3, x: 1, y: 2, t0: 0 },
      { kind: 'beam', x: 1, y: 2, tx: 3, ty: 4, t0: 0 },
      { kind: 'blast', r: 50, x: 1, y: 2, t0: 0 },
      { kind: 'block', x: 1, y: 2, t0: 0 },
    ]
    const offer: Offer[] = [{ id: 'laser', tier: 1 }]   // o ofertă deschisă, ca felul elementelor să intre în amprentă
    s.shots.push(shot); s.fx.push(...fx); s.offer = offer
    expect(SAVE_VERSION).toBe(3)
    expect(shapeOf(s)).toBe(SHAPE_V3)
  })
  it('o salvare cu versiunea 2 (fără întăriri) e primită și capătă întăririle zero', () => {
    const a = busy(5)
    const { ups, ...old } = a
    expect(ups).toEqual(NO_UPS)
    const r = unpackSave(JSON.stringify({ v: 2, state: old }))
    expect(r).toEqual({ ok: true, value: a })
  })
  it('întăririle se salvează și se citesc la fel', () => {
    const a = createGame(11, MAX_UPS)
    for (const i of script(5 * 60)) step(a, i)
    const r = unpackSave(packSave(a))
    expect(r).toEqual({ ok: true, value: a })
    expect(r.ok && r.value.ups).toEqual(MAX_UPS)
  })
  it('întăririle cu altă formă sunt respinse', () => {
    const good = packSave(busy(5))
    const tweak = (f: (o: any) => void): string => { const o = JSON.parse(good); f(o); return JSON.stringify(o) }
    const why = (t: string): string => { const r = unpackSave(t); return r.ok ? 'ok' : r.reason }
    expect(why(good)).toBe('ok')
    expect(why(tweak((o) => { o.state.ups.arms = WORKSHOP.arms.max + 1 }))).toBe('altă formă')   // peste plafon
    expect(why(tweak((o) => { o.state.ups.core = -1 }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.ups.reach = 1.5 }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.ups.hull = '1' }))).toBe('altă formă')
    expect(why(tweak((o) => { delete o.state.ups.kit }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.ups.extra = 1 }))).toBe('altă formă')
    expect(why(tweak((o) => { delete o.state.ups }))).toBe('altă formă')                           // la versiunea 3 câmpul e cerut
    expect(why(tweak((o) => { o.state.ups = [0, 0, 0, 0, 0] }))).toBe('altă formă')
  })
  it('o salvare cu versiunea 1 e respinsă', () => {
    const r = unpackSave(JSON.stringify({ v: 1, state: busy(5) }))
    expect(r.ok ? 'ok' : r.reason).toBe('altă versiune')
  })
  it('oferta: null sau deschisă se salvează și se citește la fel', () => {
    const a = busy(5)
    expect(a.offer).toBeNull()
    const r = unpackSave(packSave(a))
    expect(r.ok && r.value).toEqual(a)
    a.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }, { id: 'armor', tier: 1 }]
    const o = unpackSave(packSave(a))
    expect(o.ok && o.value.offer).toEqual(a.offer)
  })
  it('oferta cu altă formă e respinsă; un null în afara ofertei rămâne respins', () => {
    const s = busy(5); s.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }]
    const good = packSave(s)
    const tweak = (f: (o: any) => void): string => { const o = JSON.parse(good); f(o); return JSON.stringify(o) }
    const why = (t: string): string => { const r = unpackSave(t); return r.ok ? 'ok' : r.reason }
    expect(why(good)).toBe('ok')
    expect(why(tweak((o) => { delete o.state.offer[0].tier }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.offer[0].id = 'cannon' }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.offer[1].extra = 1 }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.offer[0].tier = 4 }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.offer[0].tier = 1.5 }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.offer = [] }))).toBe('altă formă')      // o ofertă goală ar opri partida pentru totdeauna
    expect(why(tweak((o) => { o.state.offer = { id: 'laser', tier: 1 } }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.offer[0] = null }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.x = null }))).toBe('altă formă')
  })
  it('o ofertă care nu se potrivește cu nava e respinsă: altfel partida ar sta pe loc pentru totdeauna', () => {
    const s = busy(5); s.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }]   // nava: nivelul 1, 2 locuri, doar Unda
    const good = packSave(s)
    const tweak = (f: (o: any) => void): string => { const o = JSON.parse(good); f(o); return JSON.stringify(o) }
    const why = (t: string): string => { const r = unpackSave(t); return r.ok ? 'ok' : r.reason }
    expect(why(good)).toBe('ok')
    expect(why(tweak((o) => { o.state.offer[0] = { id: 'wave', tier: 1 } }))).toBe('altă formă')    // un modul „nou” deja avut
    expect(why(tweak((o) => { o.state.offer[1] = { id: 'wave', tier: 3 } }))).toBe('altă formă')    // întărire cu două trepte peste
    expect(why(tweak((o) => { o.state.offer[1] = { id: 'armor', tier: 2 } }))).toBe('altă formă')   // întărirea unui modul pe care nava nu-l are
    expect(why(tweak((o) => { o.state.hero.mods.push({ id: 'magnet', tier: 1, t: 0 }) }))).toBe('altă formă')   // Laser nou, fără loc liber
  })
  it('modulele navei: o listă bună trece, orice altă formă e respinsă', () => {
    const s = busy(5); s.hero.mods = [{ id: 'wave', tier: 2, t: 0 }, { id: 'laser', tier: 3, t: 0.4 }]
    const good = packSave(s)
    const tweak = (f: (o: any) => void): string => { const o = JSON.parse(good); f(o); return JSON.stringify(o) }
    const why = (t: string): string => { const r = unpackSave(t); return r.ok ? 'ok' : r.reason }
    expect(why(good)).toBe('ok')
    expect(why(tweak((o) => { o.state.hero.mods = { id: 'wave', tier: 1, t: 0 } }))).toBe('altă formă')   // nu e listă
    expect(why(tweak((o) => { o.state.hero.mods[1].id = 'cannon' }))).toBe('altă formă')
    expect(why(tweak((o) => { delete o.state.hero.mods[1].t }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.mods[1].extra = 1 }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.mods[1].tier = 0 }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.mods[1].tier = 4 }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.mods[1].tier = 2.5 }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.mods[1].t = '0' }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.mods[1].t = null }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.mods[1] = 'laser' }))).toBe('altă formă')
    expect(why(tweak((o) => { o.state.hero.mods[1].id = 'wave' }))).toBe('altă formă')   // același modul de două ori
    expect(why(tweak((o) => { o.state.hero.mods.shift() }))).toBe('altă formă')           // fără Undă
    expect(why(tweak((o) => { o.state.hero.mods = [] }))).toBe('altă formă')
  })
  describe('nivelul, experiența, locurile și lungimea ofertei', () => {
    const good = packSave(busy(5))                    // nava: nivelul 1, 2 locuri, doar Unda
    const tweak = (f: (o: any) => void): string => { const o = JSON.parse(good); f(o); return JSON.stringify(o) }
    const why = (t: string): string => { const r = unpackSave(t); return r.ok ? 'ok' : r.reason }
    it('nivelul navei în afara 1…nivelul maxim sau neîntreg e respins', () => {
      expect(why(good)).toBe('ok')
      expect(why(tweak((o) => { o.state.hero.lvl = 0 }))).toBe('altă formă')
      expect(why(tweak((o) => { o.state.hero.lvl = BALANCE.hero.maxLevel + 1 }))).toBe('altă formă')
      expect(why(tweak((o) => { o.state.hero.lvl = 1.5 }))).toBe('altă formă')
      expect(why(tweak((o) => { o.state.hero.lvl = '1' }))).toBe('altă formă')
    })
    it('experiența negativă sau care nu e număr finit e respinsă', () => {
      expect(why(tweak((o) => { o.state.hero.xp = -1 }))).toBe('altă formă')
      expect(why(tweak((o) => { o.state.hero.xp = '3' }))).toBe('altă formă')
      expect(why(tweak((o) => { o.state.hero.xp = 'XP' }).replace('"XP"', '1e999'))).toBe('altă formă')   // JSON.parse dă Infinity
    })
    it('mai multe module decât locurile nivelului e respins', () => {
      expect(why(tweak((o) => { o.state.hero.mods.push({ id: 'laser', tier: 1, t: 0 }, { id: 'armor', tier: 1, t: 0 }) }))).toBe('altă formă')
    })
    it('o ofertă cu mai multe elemente decât se oferă e respinsă', () => {
      const four = [{ id: 'laser', tier: 1 }, { id: 'armor', tier: 1 }, { id: 'magnet', tier: 1 }, { id: 'wave', tier: 2 }]
      expect(why(tweak((o) => { o.state.offer = four.slice(0, OFFERS) }))).toBe('ok')
      expect(why(tweak((o) => { o.state.offer = four }))).toBe('altă formă')
    })
    it('o partidă adevărată cu experiență peste prag, sau la nivelul maxim, e primită în continuare', () => {
      const over = busy(5); over.hero.lvl = 2; over.hero.xp = (xpNeed(2) ?? 0) + 5   // surplusul se păstrează până la plată
      expect(unpackSave(packSave(over))).toEqual({ ok: true, value: over })
      const top = busy(5); top.hero.lvl = BALANCE.hero.maxLevel; top.hero.xp = 6
      top.hero.mods = (['wave', 'laser', 'missile', 'armor', 'shield', 'mender'] as const).map((id) => ({ id, tier: 3, t: 0 }))
      top.hero.hp = heroMaxHp(top)
      expect(top.hero.mods.length).toBe(slotsAt(top.hero.lvl))
      expect(unpackSave(packSave(top))).toEqual({ ok: true, value: top })
    })
  })
  it('o salvare cu 150 de dușmani rămâne mică', () => {
    const s = quietGame(); s.tick = 12000; s.t = 200
    for (let i = 0; i < 150; i++) spawnFoe(s)
    expect(packSave(s).length).toBeLessThan(100_000)
  })
})
