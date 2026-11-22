import { beforeAll, describe, expect, it, vi } from 'vitest'
import { FLIGHT_MODS } from '../../data/flight'
import { createFlight, type FlightState } from '../../flight/state'
import { downFlight, richFlight } from '../../flight/testkit'
import { drawFlight, stars, type Area } from './scene'
import type { FlightLook } from './things'

beforeAll(() => {
  vi.stubGlobal('document', { documentElement: {} })
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#123456' }))
})

/** Un context care înghite orice apel. */
function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({}, {
    get: (_t, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => undefined),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D
}

const AREA: Area = { l: -20, t: -150, r: 410, b: 680 }

/** Un aspect care doar notează ce i se cere: numele și, pentru dușmani, resurse, lucruri de cules și efecte, felul. */
function recorder(): { look: FlightLook; calls: string[] } {
  const calls: string[] = []
  const look: FlightLook = {
    ship: () => { calls.push('ship') },
    shield: () => { calls.push('shield') },
    foe: (_c, _f, foe) => { calls.push(`foe:${foe.kind}`) },
    asteroid: () => { calls.push('asteroid') },
    drop: (_c, _f, d) => { calls.push(`drop:${d.kind}`) },
    pick: (_c, _f, p) => { calls.push(`pick:${p.kind}`) },
    bolts: () => { calls.push('bolts') },
    shots: () => { calls.push('shots') },
    missile: () => { calls.push('missile') },
    beam: () => { calls.push('beam') },
    blast: () => { calls.push('blast') },
    puff: (_c, e) => { calls.push(`puff:${e.what}`) },
    block: () => { calls.push('block') },
    flash: (_c, e) => { calls.push(`flash:${e.kind}`) },
  }
  return { look, calls }
}

const unchanged = (f: FlightState, draw: () => void): void => {
  const before = JSON.stringify(f)
  expect(draw).not.toThrow()
  expect(JSON.stringify(f)).toBe(before)
}

describe('desenul zborului doar citește starea', () => {
  it('peste o stare bogată (toți dușmanii, toate modulele la treapta 3, rachete, raze, explozii, lucruri de cules): nu aruncă și nu schimbă starea', () => {
    const f = richFlight()
    unchanged(f, () => drawFlight(fakeCtx(), f, AREA))
  })
  it('la fel peste zborul de la pornire și peste unul cu nava doborâtă', () => {
    const start = createFlight(1, 1)
    unchanged(start, () => drawFlight(fakeCtx(), start, AREA))
    const down = downFlight()
    expect(down.mode).toBe('down')
    unchanged(down, () => drawFlight(fakeCtx(), down, AREA))
  })
  it('la fel cu Scutul care se reîncarcă și după sfârșitul zborului (efectele rămân în stare, înghețate)', () => {
    const f = richFlight()
    f.ship.shieldUp = false; f.ship.shieldT = 1.5
    unchanged(f, () => drawFlight(fakeCtx(), f, AREA))
    f.mode = 'explored'
    unchanged(f, () => drawFlight(fakeCtx(), f, AREA))
  })
})

describe('ce se desenează', () => {
  it('fiecare fel de lucru din stare ajunge la aspect: fiecare dușman, focul, Tunul, racheta, raza, explozia, asteroidul, resursele, modulele de cules, nava și Scutul', () => {
    const f = richFlight()
    const { look, calls } = recorder()
    drawFlight(fakeCtx(), f, AREA, look)
    const n = (c: string): number => calls.filter((x) => x === c).length
    for (const kind of ['drone', 'weaver', 'gunship', 'cargo', 'elite']) expect(n(`foe:${kind}`)).toBe(1)
    for (const kind of [...FLIGHT_MODS, 'repair']) expect(n(`pick:${kind}`)).toBe(1)
    expect([n('drop:crystal'), n('drop:metal'), n('asteroid')]).toEqual([1, 1, 1])
    expect([n('shots'), n('bolts'), n('missile'), n('beam'), n('blast'), n('block')]).toEqual([1, 1, 1, 1, 1, 1])
    expect([n('ship'), n('shield')]).toEqual([1, 1])
    for (const what of ['foe', 'elite', 'asteroid', 'shot']) expect(n(`puff:${what}`)).toBe(1)
    expect([n('flash:hurt'), n('flash:down')]).toEqual([1, 1])
    expect(calls.some((c) => c.includes('took'))).toBe(false)       // „ai cules” e al benzii de sus, nu al canvasului
  })
  it('ordinea: resursele și asteroizii sub nave; focul dușman peste nava ta; efectele de lovitură deasupra tuturor', () => {
    const f = richFlight()
    const { look, calls } = recorder()
    drawFlight(fakeCtx(), f, AREA, look)
    const at = (c: string): number => calls.findIndex((x) => x.startsWith(c))
    const last = (c: string): number => calls.length - 1 - [...calls].reverse().findIndex((x) => x.startsWith(c))
    expect(last('drop')).toBeLessThan(at('foe'))
    expect(last('asteroid')).toBeLessThan(at('foe'))
    expect(last('foe')).toBeLessThan(at('pick'))
    expect(at('blast')).toBeLessThan(at('ship'))
    expect(at('bolts')).toBeLessThan(at('ship'))
    expect(at('ship')).toBeLessThan(at('shield'))
    expect(at('shield')).toBeLessThan(at('shots'))
    expect(at('shots')).toBeLessThan(at('puff'))
    expect(last('puff')).toBeLessThan(at('flash'))
  })
  it('cu nava doborâtă nu se mai desenează nici nava, nici Scutul; căderea, da', () => {
    const f = downFlight()
    f.ship.mods.shield = 2
    const { look, calls } = recorder()
    drawFlight(fakeCtx(), f, AREA, look)
    expect(calls).not.toContain('ship')
    expect(calls).not.toContain('shield')
    expect(calls).toContain('flash:down')
  })
  it('fără Scut pe navă, inelul lui nu se cere', () => {
    const f = createFlight(1, 1)
    const { look, calls } = recorder()
    drawFlight(fakeCtx(), f, AREA, look)
    expect(calls).toEqual(['ship'])
  })
  it('un efect bătrân nu se mai desenează', () => {
    const f = richFlight()
    for (const e of f.fx) e.t0 = f.t - 5
    const { look, calls } = recorder()
    drawFlight(fakeCtx(), f, AREA, look)
    for (const c of ['beam', 'blast', 'block', 'puff', 'flash']) expect(calls.some((x) => x.startsWith(c))).toBe(false)
  })
})

describe('stelele care curg', () => {
  /** Dreptunghiurile pline desenate, ca text. */
  const rects = (f: FlightState): string[] => {
    const out: string[] = []
    const ctx = new Proxy({}, {
      get: (_t, k) => (k === 'fillRect' ? (...a: number[]) => { out.push(a.map((v) => v.toFixed(3)).join(' ')) } : () => undefined),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D
    stars(ctx, f, AREA)
    return out
  }
  it('sunt forme pline, în vedere, după timpul zborului: la același timp, același cer; mai târziu, mai jos', () => {
    const f = createFlight(1, 1)
    const a = rects(f)
    expect(a.length).toBeGreaterThanOrEqual(60)
    expect(rects(f)).toEqual(a)
    for (const r of a) {
      const [x, y] = r.split(' ').map(Number) as [number, number]
      expect(x).toBeGreaterThanOrEqual(AREA.l); expect(x).toBeLessThanOrEqual(AREA.r)
      expect(y).toBeGreaterThanOrEqual(AREA.t - 4); expect(y).toBeLessThanOrEqual(AREA.b + 4)
    }
    f.t = 0.5; f.tick = 30
    const b = rects(f)
    expect(b).not.toEqual(a)
    const yOf = (r: string): number => Number(r.split(' ')[1])
    const moved = a.filter((r, i) => yOf(b[i] as string) > yOf(r)).length
    expect(moved).toBeGreaterThan(a.length * 0.9)                    // aproape toate au coborât (câteva au trecut de jos și au luat-o de sus)
  })
})
