import { beforeAll, describe, expect, it, vi } from 'vitest'
import { FLIGHT_MOD_KIND, FLIGHT_MODS, type FlightModId } from '../../data/flight'
import { createFlight, type FlightFx, type FlightState } from '../../flight/state'
import { richFlight } from '../../flight/testkit'
import { FLIGHT_LOOK } from './things'

// Fiecare culoare a paletei e alta: '--hero' → '#000001', '--shield' → '#000002' …, ca testele să poată spune ce culoare s-a folosit.
const NAMES: string[] = []
const colorOf = (name: string): string => {
  let i = NAMES.indexOf(name)
  if (i < 0) { NAMES.push(name); i = NAMES.length - 1 }
  return '#' + (i + 1).toString(16).padStart(6, '0')
}
beforeAll(() => {
  vi.stubGlobal('document', { documentElement: {} })
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (n: string) => colorOf(n.slice(2)) }))
})

interface Log { ops: string[]; fills: string[]; strokes: string[] }

/** Un context care notează căile (cu coordonatele), umplerile și liniile, cu culoarea din clipa aceea. */
function logCtx(): { ctx: CanvasRenderingContext2D; log: Log } {
  const log: Log = { ops: [], fills: [], strokes: [] }
  const st: Record<string, unknown> = { fillStyle: '', strokeStyle: '', globalAlpha: 1 }
  const ctx = new Proxy(st, {
    get: (t, k) => {
      if (typeof k !== 'string') return undefined
      if (k in t) return t[k]
      return (...a: unknown[]) => {
        if (k === 'fill' || k === 'fillRect') log.fills.push(String(t.fillStyle))
        if (k === 'stroke') log.strokes.push(String(t.strokeStyle))
        const args = k === 'stroke' ? [t.lineWidth] : a                  // la o linie, și grosimea ei
        log.ops.push(`${k}(${args.map((v) => (typeof v === 'number' ? v.toFixed(2) : String(v))).join(',')})`)
      }
    },
    set: (t, k, v) => { if (typeof k === 'string') t[k] = v; return true },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, log }
}
const C = (name: string): string => colorOf(name)
const painted = (log: Log): number => log.fills.length + log.strokes.length
const fxOf = <K extends FlightFx['kind']>(f: FlightState, kind: K): Extract<FlightFx, { kind: K }> =>
  f.fx.find((e) => e.kind === kind) as Extract<FlightFx, { kind: K }>

describe('fiecare formă desenează ceva', () => {
  const f = richFlight()
  const cases: [string, (ctx: CanvasRenderingContext2D) => void][] = [
    ['nava ta', (c) => FLIGHT_LOOK.ship(c, f)],
    ['inelul Scutului', (c) => FLIGHT_LOOK.shield(c, f)],
    ...f.foes.map((foe): [string, (ctx: CanvasRenderingContext2D) => void] => [`dușmanul ${foe.kind}`, (c) => FLIGHT_LOOK.foe(c, f, foe)]),
    ['asteroidul', (c) => FLIGHT_LOOK.asteroid(c, f, f.asteroids[0]!)],
    ...f.drops.map((d): [string, (ctx: CanvasRenderingContext2D) => void] => [`resursa ${d.kind}`, (c) => FLIGHT_LOOK.drop(c, f, d)]),
    ...f.picks.map((p): [string, (ctx: CanvasRenderingContext2D) => void] => [`de cules: ${p.kind}`, (c) => FLIGHT_LOOK.pick(c, f, p)]),
    ['proiectilele Tunului', (c) => FLIGHT_LOOK.bolts(c, f)],
    ['focul dușman', (c) => FLIGHT_LOOK.shots(c, f)],
    ['racheta', (c) => FLIGHT_LOOK.missile(c, f.missiles[0]!)],
    ['raza Laserului', (c) => FLIGHT_LOOK.beam(c, fxOf(f, 'beam'), 0.05)],
    ['explozia', (c) => FLIGHT_LOOK.blast(c, fxOf(f, 'blast'), 0.1)],
    ['norul unei căderi', (c) => FLIGHT_LOOK.puff(c, fxOf(f, 'puff'), 0.1)],
    ['lovitura oprită de Scut', (c) => FLIGHT_LOOK.block(c, f, fxOf(f, 'block'), 0.1)],
    ['nava lovită', (c) => FLIGHT_LOOK.flash(c, fxOf(f, 'hurt'), 0.1, { l: 0, t: 0, r: 390, b: 680 })],
    ['nava căzută', (c) => FLIGHT_LOOK.flash(c, fxOf(f, 'down'), 0.1, { l: 0, t: 0, r: 390, b: 680 })],
  ]
  it.each(cases)('%s', (_name, draw) => {
    const { ctx, log } = logCtx()
    draw(ctx)
    expect(painted(log)).toBeGreaterThan(0)
  })
  it('fiecare fel de dușman are forma lui', () => {
    const shapes = f.foes.map((foe) => {
      const { ctx, log } = logCtx()
      FLIGHT_LOOK.foe(ctx, f, { ...foe, x: 0, y: 0, hp: foe.maxHp, hitT: -9 })
      return log.ops.join(';')
    })
    expect(new Set(shapes).size).toBe(f.foes.length)
  })
  it('lucrurile de cules: fiecare cu pictograma lui', () => {
    const glyphs = f.picks.map((p) => {
      const { ctx, log } = logCtx()
      FLIGHT_LOOK.pick(ctx, f, { ...p, x: 0, y: 0 })
      return log.ops.join(';')
    })
    expect(new Set(glyphs).size).toBe(f.picks.length)
  })
})

describe('nu încurci ce te ajută cu ce te lovește', () => {
  const f = richFlight()
  it('focul dușman e portocaliu, cu miez deschis', () => {
    const { ctx, log } = logCtx()
    FLIGHT_LOOK.shots(ctx, f)
    expect(log.fills).toEqual([C('foe-jet'), C('ink')])
    expect(log.ops.filter((o) => o.startsWith('arc(')).length).toBe(2 * f.shots.length)
  })
  it('un modul de cules are chenarul în culoarea felului (armă, corp, utilitar), ca la apărare; reparația, deschisă', () => {
    const tone: Record<string, string> = { weapon: C('hero'), body: C('shield'), utility: C('metal') }
    for (const p of f.picks) {
      const { ctx, log } = logCtx()
      FLIGHT_LOOK.pick(ctx, f, p)
      const want = p.kind === 'repair' ? C('ink') : tone[FLIGHT_MOD_KIND[p.kind as FlightModId]]!
      expect(log.strokes).toContain(want)
    }
  })
  it('nici modulele de cules, nici resursele nu folosesc portocaliul focului dușman', () => {
    for (const p of f.picks) {
      const { ctx, log } = logCtx()
      FLIGHT_LOOK.pick(ctx, f, p)
      expect([...log.fills, ...log.strokes]).not.toContain(C('foe-jet'))
    }
    for (const d of f.drops) {
      const { ctx, log } = logCtx()
      FLIGHT_LOOK.drop(ctx, f, d)
      expect([...log.fills, ...log.strokes]).not.toContain(C('foe-jet'))
      expect(log.fills).toContain(d.kind === 'crystal' ? C('crystal') : C('metal'))
    }
  })
})

describe('nava ta, cu modulele pe ea', () => {
  const draw = (f: FlightState): Log => { const { ctx, log } = logCtx(); FLIGHT_LOOK.ship(ctx, f); return log }
  it('fiecare modul se vede: luat singur, la treapta 1, schimbă desenul navei', () => {
    const base = createFlight(1, 1)
    for (const id of ['gun', 'laser', 'missile', 'magnet'] as const) {
      const f = createFlight(1, 1)
      if (id === 'gun') f.ship.mods.gun = 2; else f.ship.mods[id] = 1
      expect(draw(f).ops, id).not.toEqual(draw(base).ops)
    }
  })
  it('treapta se vede: 1 și 3 dau desene diferite, pentru fiecare modul de pe corp', () => {
    for (const id of ['gun', 'laser', 'missile', 'magnet'] as const) {
      const a = createFlight(1, 1), b = createFlight(1, 1)
      a.ship.mods[id] = 1; b.ship.mods[id] = 3
      expect(draw(b).ops, id).not.toEqual(draw(a).ops)
    }
  })
  it('Scutul: inelul plin cât e încărcat, altul cât se reîncarcă, mai gros la treapta 3', () => {
    const ring = (f: FlightState): Log => { const { ctx, log } = logCtx(); FLIGHT_LOOK.shield(ctx, f); return log }
    const up1 = createFlight(1, 1); up1.ship.mods.shield = 1; up1.ship.shieldUp = true
    const up3 = createFlight(1, 1); up3.ship.mods.shield = 3; up3.ship.shieldUp = true
    const charging = createFlight(1, 1); charging.ship.mods.shield = 1; charging.ship.shieldUp = false; charging.ship.shieldT = 3
    expect(ring(up1).strokes).toContain(C('shield'))
    expect(ring(up3).ops).not.toEqual(ring(up1).ops)
    expect(ring(charging).ops).not.toEqual(ring(up1).ops)
    expect(painted(ring(charging))).toBeGreaterThan(0)
  })
  it('punctul care contează la lovituri se vede, în mijlocul navei', () => {
    const f = createFlight(1, 1)
    expect(draw(f).ops).toContain('arc(0.00,0.00,2.60,0.00,6.28)')
  })
  it('cu toate cinci modulele la treapta 3 desenul are mai multe forme decât nava de la pornire', () => {
    const f = createFlight(1, 1)
    for (const id of FLIGHT_MODS) f.ship.mods[id] = 3
    expect(painted(draw(f))).toBeGreaterThan(painted(draw(createFlight(1, 1))) + 4)
  })
})

describe('o navă dușmană lovită', () => {
  it('își aprinde conturul, dar își păstrează culoarea (Tunul lovește des: plină, ar fi albă mai tot timpul)', () => {
    const f = richFlight()
    for (const foe of f.foes) {
      const calm = logCtx(), hit = logCtx()
      FLIGHT_LOOK.foe(calm.ctx, f, { ...foe, hitT: -9 })
      FLIGHT_LOOK.foe(hit.ctx, f, { ...foe, hitT: f.t - 0.01 })
      expect(hit.log.fills, foe.kind).toEqual(calm.log.fills)
      expect(hit.log.strokes, foe.kind).toContain(C('ink'))
      expect(calm.log.strokes, foe.kind).not.toContain(C('ink'))
    }
  })
})
