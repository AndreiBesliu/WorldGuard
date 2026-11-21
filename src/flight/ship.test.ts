import { describe, expect, it } from 'vitest'
import { FLIGHT } from '../data/flight'
import { NO_UPS } from '../data/workshop'
import { shipBounds } from './ship'
import { stepFlight } from './step'
import { STILL, addFoe, flyFor, quietFlight, shipAt, shotAt } from './testkit'

const { w, h } = FLIGHT.field

describe('condusul', () => {
  it('marginile: 18 în lături, 30% din înălțime sus, 34 jos', () => {
    expect(shipBounds()).toEqual({ x0: 18, x1: w - 18, y0: h * 0.3, y1: h - 34 })
  })
  it('nava nu iese din margini oricât i se cere', () => {
    const f = quietFlight()
    const b = shipBounds()
    const pushes = [[1e4, 0], [-1e4, 0], [0, 1e4], [0, -1e4], [1e4, 1e4], [-1e4, -1e4], [1e4, -1e4], [-1e4, 1e4]] as const
    for (const [dx, dy] of pushes) {
      for (let i = 0; i < 40; i++) {
        stepFlight(f, i % 3 === 0 ? { dx, dy } : STILL)
        expect(f.ship.x).toBeGreaterThanOrEqual(b.x0)
        expect(f.ship.x).toBeLessThanOrEqual(b.x1)
        expect(f.ship.y).toBeGreaterThanOrEqual(b.y0)
        expect(f.ship.y).toBeLessThanOrEqual(b.y1)
      }
    }
    expect([f.ship.x, f.ship.y]).toEqual([b.x0, b.y1])     // ultima împingere a dus-o în colțul din stânga jos
  })
  it('o mișcare de 100 cerută într-un pas se face în mai mulți pași, cu 1,2 × 100 în total', () => {
    const f = quietFlight()
    const x0 = f.ship.x, y0 = f.ship.y
    stepFlight(f, { dx: 100, dy: 0 })
    expect(f.ship.x - x0).toBeCloseTo(1100 / 60, 9)        // cel mult 1100 de unități pe secundă
    let steps = 1
    while (f.ship.x - x0 < 120 - 1e-9 && steps < 100) { stepFlight(f, STILL); steps++ }
    expect(steps).toBe(7)
    flyFor(f, 1)
    expect(f.ship.x - x0).toBeCloseTo(120, 9)
    expect(f.ship.y).toBe(y0)
  })
  it('după oprirea la margine, o mișcare înapoi mișcă nava în același pas', () => {
    const f = quietFlight()
    stepFlight(f, { dx: 1000, dy: 0 })
    flyFor(f, 1)
    expect(f.ship.x).toBeCloseTo(shipBounds().x1, 9)
    stepFlight(f, { dx: -10, dy: 0 })
    expect(f.ship.x).toBeCloseTo(shipBounds().x1 - 12, 9)
  })
})

describe('viața navei', () => {
  it('5 lovituri, fără Carenă; cu Carena la treapta 4, 7', () => {
    expect(quietFlight().ship).toMatchObject({ hp: 5, maxHp: 5 })
    expect(quietFlight(1, 1, { ...NO_UPS, hull: 4 }).ship).toMatchObject({ hp: 7, maxHp: 7 })
  })
  it('un proiectil dușman pe punctul navei ia o viață; al doilea, în 1,2 s, nu ia nimic', () => {
    const f = quietFlight()
    shotAt(f, f.ship.x, f.ship.y)
    stepFlight(f, STILL)
    expect(f.ship.hp).toBe(4)
    expect(f.shots).toEqual([])
    expect(f.fx.some((e) => e.kind === 'hurt')).toBe(true)
    flyFor(f, 1.1)
    shotAt(f, f.ship.x, f.ship.y)
    stepFlight(f, STILL)
    expect(f.ship.hp).toBe(4)
    expect(f.shots).toEqual([])                               // proiectilul se oprește și în nava care clipește
    flyFor(f, 0.2)
    shotAt(f, f.ship.x, f.ship.y)
    stepFlight(f, STILL)
    expect(f.ship.hp).toBe(3)
  })
  it('contează doar punctul din mijloc: raza 6, plus raza proiectilului', () => {
    const f = quietFlight()
    shotAt(f, f.ship.x + FLIGHT.ship.hitR + FLIGHT.shot.r + 0.5, f.ship.y)
    stepFlight(f, STILL)
    expect(f.ship.hp).toBe(5)
    shotAt(f, f.ship.x + FLIGHT.ship.hitR + FLIGHT.shot.r - 0.5, f.ship.y)
    stepFlight(f, STILL)
    expect(f.ship.hp).toBe(4)
  })
  it('a cincea lovitură dă `down` în același pas, iar după ea pasul nu mai schimbă nimic', () => {
    const f = quietFlight()
    for (let i = 1; i <= 5; i++) {
      expect(f.mode).toBe('flying')
      shotAt(f, f.ship.x, f.ship.y)
      stepFlight(f, STILL)
      expect(f.ship.hp).toBe(5 - i)
      if (i < 5) flyFor(f, 1.3)
    }
    expect(f.mode).toBe('down')
    expect(f.fx.some((e) => e.kind === 'down')).toBe(true)
    const frozen = JSON.stringify(f)
    flyFor(f, 2, { dx: 50, dy: -50 })
    expect(JSON.stringify(f)).toBe(frozen)
  })
  it('o navă dușmană care o atinge o lovește, și primește și ea o lovitură', () => {
    const f = quietFlight()
    const foe = addFoe(f, 'gunship', f.ship.x, f.ship.y - 10, { fireT: 99 })
    stepFlight(f, STILL)
    expect(f.ship.hp).toBe(4)
    expect(foe.hp).toBe(foe.maxHp - FLIGHT.foe.bump)
  })
})

describe('tunul', () => {
  it('două proiectile drept înainte, la 0,11 s, prima salvă la 0,3 s', () => {
    const f = quietFlight()
    const ticks: number[] = []
    for (let i = 0; i < 87; i++) {                          // 1,45 s: salvele de la 0,3, 0,41, …, 1,4
      stepFlight(f, STILL)
      const fresh = f.bolts.filter((b) => b.y > f.ship.y - FLIGHT.gun.lift - 14)   // plecate în pasul ăsta
      if (fresh.length === 0) continue
      ticks.push(f.tick)
      expect(fresh.map((b) => b.vx)).toEqual([0, 0])
      expect(fresh.map((b) => b.x - f.ship.x).sort((a, b) => a - b)).toEqual([-FLIGHT.gun.spread, FLIGHT.gun.spread])
    }
    expect(ticks).toHaveLength(11)
    expect(ticks[0]).toBeGreaterThanOrEqual(18)
    expect(ticks[0]).toBeLessThanOrEqual(19)
    expect(ticks[10]! - ticks[0]!).toBeGreaterThanOrEqual(65)
    expect(ticks[10]! - ticks[0]!).toBeLessThanOrEqual(67)
  })
  it('un proiectil merge cu 780 în sus și lovește cu 4; cu Armamentul la treapta 5, cu 4,8', () => {
    for (const [arms, dmg] of [[0, 4], [5, 4.8]] as const) {
      const f = quietFlight(1, 1, { ...NO_UPS, arms })
      shipAt(f, 195, 600)
      const foe = addFoe(f, 'drone', 195 - FLIGHT.gun.spread - 10, 300, { fireT: 99 })   // doar proiectilul din stânga o atinge
      const hp = foe.hp
      while (f.bolts.length === 0) stepFlight(f, STILL)
      const y0 = f.bolts[0]!.y
      stepFlight(f, STILL)
      expect(y0 - f.bolts[0]!.y).toBeCloseTo(780 / 60, 9)
      while (foe.hp === hp) stepFlight(f, STILL)
      expect(hp - foe.hp).toBeCloseTo(dmg, 9)
    }
  })
})

describe('resursele', () => {
  it('vin spre navă de la 85 de unități (cu Colectarea la treapta 1, de la 93,5) și se culeg la 22', () => {
    for (const [reach, pulled] of [[0, false], [1, true]] as const) {
      const f = quietFlight(1, 1, { ...NO_UPS, reach })
      f.drops.push({ kind: 'crystal', x: f.ship.x - 90, y: f.ship.y })
      stepFlight(f, STILL)
      expect(f.drops[0]!.x > f.ship.x - 90).toBe(pulled)
    }
    const f = quietFlight()
    f.drops.push({ kind: 'metal', x: f.ship.x - 60, y: f.ship.y })
    flyFor(f, 1)
    expect(f.drops).toEqual([])
    expect([f.crystal, f.metal]).toEqual([0, 1])
  })
  it('cele departe coboară cu 75 pe secundă și dispar sub câmp', () => {
    const f = quietFlight()
    f.drops.push({ kind: 'crystal', x: 30, y: 100 })
    stepFlight(f, STILL)
    expect(f.drops[0]!.y).toBeCloseTo(100 + 75 / 60, 9)
    flyFor(f, 10)
    expect(f.drops).toEqual([])
    expect(f.crystal).toBe(0)
  })
})
