import { beforeAll, describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../data/balance'
import { MOD_IDS } from '../data/modules'
import type { GameState } from '../sim/state'
import { addFoe, addNode, padOf, quietGame } from '../sim/testkit'
import { ORBIT } from './orbit'
import type { Skin } from './skin'
import { drawWorld } from './world'

beforeAll(() => {
  vi.stubGlobal('document', { documentElement: {} })
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#123456' }))
})

/** Un context care înghite orice apel; measureText dă o lățime fixă. */
function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({}, {
    get: (_t, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => undefined),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D
}

/** Ca fakeCtx, dar gradientul întors are addColorStop: îl folosește aspectul adevărat. */
function fakeCtxWithGradients(): CanvasRenderingContext2D {
  const gradient = { addColorStop: (): void => undefined }
  return new Proxy({}, {
    get: (_t, k) => {
      if (k === 'measureText') return () => ({ width: 10 })
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => gradient
      return () => undefined
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D
}

/** O stare cu din toate: resurse pline și golite, fiecare fel de clădire, nave obișnuite și grele, raze, texte. */
function richGame(): GameState {
  const s = quietGame()
  s.t = 60; s.tick = 3600
  s.core.hp = BALANCE.core.hp * 0.2; s.core.hitT = s.t - 0.05
  addNode(s, 'crystal', 400, 600).shakeT = s.t - 0.05
  const emptyCrystal = addNode(s, 'crystal', 440, 640); emptyCrystal.left = 0; emptyCrystal.regrowAt = s.t + 4
  addNode(s, 'metal', 640, 600).shape = [0.9, 1, 0.8, 1.05, 0.95, 0.85, 1]
  const emptyMetal = addNode(s, 'metal', 680, 640); emptyMetal.left = 0; emptyMetal.regrowAt = s.t + 10; emptyMetal.shape = [1, 1, 1, 1, 1, 1, 1]
  padOf(s, 'turret', 0).lvl = 3
  padOf(s, 'turret', 1).paid.crystal = 7
  padOf(s, 'collector').lvl = 2
  padOf(s, 'mine').lvl = 1
  padOf(s, 'mine').prodT = s.t - 0.1
  const grunt = addFoe(s, 560, 690, { hp: 5, hitT: s.t - 0.02, lungeT: s.t - 0.1 })
  addFoe(s, 540, 820, { brute: true, r: BALANCE.foe.brute.r, hp: 30, maxHp: 60 })
  s.shots.push({ x: 500, y: 700, tx: 560, ty: 690, a: 0.4, targetId: grunt.id, dmg: 6, kind: 'bolt', blast: 0 })
  s.shots.push({ x: 520, y: 720, tx: 600, ty: 700, a: -0.2, targetId: -1, dmg: 6, kind: 'bolt', blast: 0 })
  s.fx.push(
    { kind: 'gain', res: 'crystal', x: 400, y: 600, t0: s.t - 0.2 },
    { kind: 'gain', res: 'metal', x: 640, y: 600, t0: s.t - 0.3 },
    { kind: 'level', what: 'turret', lvl: 3, x: 500, y: 650, t0: s.t - 0.1 },
    { kind: 'heroDown', x: 470, y: 760, t0: s.t - 0.4 },
    { kind: 'puff', r: 20, x: 560, y: 690, t0: s.t - 0.1 },
  )
  s.hero.lvl = 3; s.hero.waveT = s.t - 0.05; s.hero.waveA = 1; s.hero.hurtT = s.t - 0.03; s.hero.face = 0.7
  return s
}

function recorder(): { skin: Skin; calls: string[] } {
  const calls: string[] = []
  const note = (name: string) => (): void => { calls.push(name) }
  const skin: Skin = {
    paintSky: () => { throw new Error('cerul nu se pictează din drawWorld') },
    core: note('core'), shield: note('shield'), node: note('node'), building: note('building'), foe: note('foe'),
    hero: note('hero'), shot: note('shot'), glyph: note('glyph'), chip: note('chip'), coreIcon: note('coreIcon'),
    beam: note('beam'), blast: note('blast'),
  }
  return { skin, calls }
}

/** Nava cu toate cele nouă module la treapta 3 (o stare forțată: pe navă încap cel mult șase), cu Scutul încărcat,
 *  o rachetă în zbor, o rază de turelă și câte un efect din fiecare fel al armelor. */
function armedGame(): GameState {
  const s = quietGame()
  s.t = 60; s.tick = 3600
  s.hero.lvl = 9; s.hero.face = -0.6
  s.hero.mods = MOD_IDS.map((id) => ({ id, tier: 3, t: 0 }))
  const f = addFoe(s, 560, 690)
  s.shots.push({ x: 500, y: 700, tx: 560, ty: 690, a: 0.4, targetId: f.id, dmg: 26, kind: 'missile', blast: 50 })
  s.shots.push({ x: 520, y: 720, tx: 560, ty: 690, a: -0.2, targetId: f.id, dmg: 6, kind: 'bolt', blast: 0 })
  s.fx.push(
    { kind: 'beam', x: s.hero.x, y: s.hero.y, tx: 560, ty: 690, t0: s.t - 0.05 },
    { kind: 'blast', r: 50, x: 600, y: 700, t0: s.t - 0.1 },
    { kind: 'block', x: s.hero.x, y: s.hero.y, t0: s.t - 0.1 },
  )
  return s
}

describe('modulele și tragerile navei', () => {
  const all = { l: 0, t: 0, r: 1100, b: 1500 }
  it('cu toate cele nouă module, o rachetă în zbor și câte un efect din fiecare fel: „Orbită” nu aruncă și nu schimbă starea', () => {
    for (const input of [{ x: 0, y: 0 }, { x: 0.7, y: 0.4 }]) {
      const s = armedGame(), before = JSON.stringify(s)
      expect(() => drawWorld(fakeCtxWithGradients(), s, input, all, ORBIT)).not.toThrow()
      expect(JSON.stringify(s)).toBe(before)
    }
  })
  it('la fel cu Scutul care se reface și cu nava doborâtă', () => {
    const s = armedGame()
    s.hero.mods.find((m) => m.id === 'shield')!.t = 2
    let before = JSON.stringify(s)
    expect(() => drawWorld(fakeCtxWithGradients(), s, { x: 0, y: 0 }, all, ORBIT)).not.toThrow()
    expect(JSON.stringify(s)).toBe(before)
    s.hero.dead = true; s.hero.hp = 0; s.hero.respawnT = 2
    before = JSON.stringify(s)
    expect(() => drawWorld(fakeCtxWithGradients(), s, { x: 0, y: 0 }, all, ORBIT)).not.toThrow()
    expect(JSON.stringify(s)).toBe(before)
  })
  it('raza laserului și explozia se desenează câte o dată, în stratul razelor: peste inelul planetei, lângă rachete', () => {
    const s = armedGame()
    const { skin, calls } = recorder()
    drawWorld(fakeCtx(), s, { x: 0, y: 0 }, all, skin)
    expect(calls.filter((c) => c === 'beam')).toHaveLength(1)
    expect(calls.filter((c) => c === 'blast')).toHaveLength(1)
    expect(calls.filter((c) => c === 'shot')).toHaveLength(2)
    const at = (n: string): number => calls.indexOf(n)
    for (const n of ['beam', 'blast', 'shot']) expect(at('shield')).toBeLessThan(at(n))
    expect(at('blast')).toBeLessThan(at('beam'))                // explozii, apoi raza laserului, apoi rachetele și razele turelelor
    expect(calls.lastIndexOf('beam')).toBeLessThan(at('shot'))
    expect(at('hero')).toBeLessThan(at('shield'))
  })
  it('nava fără module, în mers, are jetul de dinainte de module: aceleași puncte, apoi corpul', () => {
    const pts: string[] = []
    const ctx = new Proxy({}, {
      get: (_t, k) => (k === 'moveTo' || k === 'lineTo' ? (x: number, y: number) => { pts.push(`${k} ${x.toFixed(4)} ${y.toFixed(4)}`) } : () => undefined),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D
    const s = quietGame(); s.t = 1.3
    const fl = 0.6 + 0.4 * Math.sin(s.t * 34)
    ORBIT.hero(ctx, s, { x: 1, y: 0 })
    const p = (k: string, x: number, y: number): string => `${k} ${x.toFixed(4)} ${y.toFixed(4)}`
    expect(pts.slice(0, 7)).toEqual([
      p('moveTo', -8, -4.5), p('lineTo', -13 - 9 * fl, 0), p('lineTo', -8, 4.5),
      p('moveTo', -8, -2.2), p('lineTo', -9 - 5 * fl, 0), p('lineTo', -8, 2.2),
      p('moveTo', 18, 0),                               // corpul navei, `SHIP`
    ])
  })
  it('o rază sau o explozie din afara vederii nu se desenează', () => {
    const s = armedGame()
    s.fx = [
      { kind: 'beam', x: 1000, y: 1400, tx: 1010, ty: 1410, t0: s.t - 0.05 },
      { kind: 'blast', r: 50, x: 1000, y: 1400, t0: s.t - 0.1 },
    ]
    const { skin, calls } = recorder()
    drawWorld(fakeCtx(), s, { x: 0, y: 0 }, { l: 300, t: 500, r: 700, b: 1000 }, skin)
    expect(calls).not.toContain('beam')
    expect(calls).not.toContain('blast')
  })
})

describe('ordinea straturilor', () => {
  it('nucleul sub obiecte, inelul peste nave, razele peste inel', () => {
    const s = quietGame()
    addNode(s, 'crystal', 500, 700)
    padOf(s, 'turret', 0).lvl = 1
    addFoe(s, 560, 690); addFoe(s, 540, 820)          // una deasupra nucleului pe ecran, una dedesubt
    s.shots.push({ x: 500, y: 700, tx: 560, ty: 690, a: 0, targetId: -1, dmg: 1, kind: 'bolt', blast: 0 })
    const { skin, calls } = recorder()
    drawWorld(fakeCtx(), s, { x: 0, y: 0 }, { l: 0, t: 0, r: 1100, b: 1500 }, skin)
    const first = (n: string): number => calls.indexOf(n), last = (n: string): number => calls.lastIndexOf(n)
    expect(calls.filter((c) => c === 'core')).toHaveLength(1)
    expect(calls.filter((c) => c === 'shield')).toHaveLength(1)
    expect(calls.filter((c) => c === 'foe')).toHaveLength(2)
    for (const n of ['node', 'building', 'foe', 'hero']) {
      expect(first('core')).toBeLessThan(first(n))
      expect(last(n)).toBeLessThan(first('shield'))
    }
    expect(first('shield')).toBeLessThan(first('shot'))
    expect(calls).toContain('glyph')
    expect(last('glyph')).toBeLessThan(first('core'))           // cercurile, sub nucleu
  })
  it('ce nu se vede nu se desenează', () => {
    const s = quietGame()
    addFoe(s, 1000, 1400)
    const { skin, calls } = recorder()
    drawWorld(fakeCtx(), s, { x: 0, y: 0 }, { l: 300, t: 500, r: 700, b: 1000 }, skin)
    expect(calls).not.toContain('foe')
    expect(calls).toContain('core')
  })
})

describe('desenul doar citește starea', () => {
  const all = { l: 0, t: 0, r: 1100, b: 1500 }
  it('cu aspectul „Orbită”, peste o stare bogată, cu nava ta vie: nu aruncă și nu schimbă starea', () => {
    const s = richGame(), before = JSON.stringify(s)
    expect(() => drawWorld(fakeCtxWithGradients(), s, { x: 0.6, y: -0.3 }, all, ORBIT)).not.toThrow()
    expect(JSON.stringify(s)).toBe(before)
  })
  it('efectele și razele noi (rază de lumină, explozie, scut, rachetă) nu aruncă și nu scriu niciun text în plus', () => {
    const texts = (s: GameState): unknown[] => {
      const out: unknown[] = []
      const ctx = new Proxy({}, {
        get: (_t, k) => {
          if (k === 'measureText') return () => ({ width: 10 })
          if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop: (): void => undefined })
          if (k === 'fillText') return (t: unknown) => { out.push(t) }
          return () => undefined
        },
        set: () => true,
      }) as unknown as CanvasRenderingContext2D
      const before = JSON.stringify(s)
      expect(() => drawWorld(ctx, s, { x: 0, y: 0 }, all, ORBIT)).not.toThrow()
      expect(JSON.stringify(s)).toBe(before)
      return out
    }
    const s = quietGame(); s.t = 60; s.tick = 3600
    const plain = texts(s)
    s.shots.push({ x: 500, y: 700, tx: 560, ty: 690, a: 0, targetId: -1, dmg: 12, kind: 'missile', blast: 50 })
    s.fx.push(
      { kind: 'beam', x: 500, y: 700, tx: 560, ty: 690, t0: s.t - 0.05 },
      { kind: 'blast', r: 50, x: 560, y: 690, t0: s.t - 0.1 },
      { kind: 'block', x: 500, y: 700, t0: s.t - 0.1 },
    )
    expect(texts(s)).toEqual(plain)
  })
  it('cercul navei: experiența sub nume cât nu e gata; gata, prețul; la nivelul maxim, „nivel maxim”; starea nu se schimbă', () => {
    const texts = (s: GameState): string[] => {
      const out: string[] = []
      const ctx = new Proxy({}, {
        get: (_t, k) => {
          if (k === 'measureText') return () => ({ width: 10 })
          if (k === 'fillText') return (t: unknown) => { out.push(String(t)) }
          return () => undefined
        },
        set: () => true,
      }) as unknown as CanvasRenderingContext2D
      const before = JSON.stringify(s)
      drawWorld(ctx, s, { x: 0, y: 0 }, all, recorder().skin)
      expect(JSON.stringify(s)).toBe(before)
      return out
    }
    const s = quietGame(), need = BALANCE.hero.xpToLevel[0]!
    s.hero.xp = 3
    const wait = texts(s)
    expect(wait).toContain(`experiență 3/${need}`)
    expect(wait).toContain('Navă nivel 2')
    expect(wait.join('|')).not.toContain('nivel maxim')
    s.hero.xp = need
    const ready = texts(s)
    expect(ready.join('|')).not.toContain('experiență')
    expect(ready).toContain('Navă nivel 2')
    s.hero.lvl = BALANCE.hero.maxLevel
    expect(texts(s)).toContain('Navă · nivel maxim')
  })
  it('la fel cu nava ta doborâtă, cât așteaptă să reapară', () => {
    const s = richGame()
    s.hero.dead = true; s.hero.respawnT = 2.4; s.hero.hp = 0
    const before = JSON.stringify(s)
    expect(() => drawWorld(fakeCtxWithGradients(), s, { x: 0, y: 0 }, all, ORBIT)).not.toThrow()
    expect(JSON.stringify(s)).toBe(before)
  })
})
