import { describe, expect, it } from 'vitest'
import { FLIGHT } from '../data/flight'
import { NO_UPS } from '../data/workshop'
import { fireArsenal } from './arsenal'
import { take } from './pickups'
import { pullReach } from './ship'
import { createFlight, EPS } from './state'
import { stepFlight } from './step'
import { STILL, addFoe, flyFor, quietFlight, shipAt, shotAt, untouchable } from './testkit'

const HP = { hp: 1000, maxHp: 1000, fireT: 99 }

describe('Tunul pe trepte', () => {
  it('2, 3 și 5 proiectile pe salvă; de la treapta 2, în evantai', () => {
    for (const [tier, n] of [[1, 2], [2, 3], [3, 5]] as const) {
      const f = quietFlight()
      f.ship.mods.gun = tier
      while (f.bolts.length === 0) stepFlight(f, STILL)
      expect(f.bolts).toHaveLength(n)
      const vx = f.bolts.map((b) => b.vx)
      if (tier === 1) expect(vx).toEqual([0, 0])
      else {
        expect(vx.filter((v) => v < 0)).toHaveLength((n - 1) / 2)
        expect(vx.filter((v) => v > 0)).toHaveLength((n - 1) / 2)
        expect(vx.filter((v) => v === 0)).toHaveLength(1)
      }
    }
  })
})

describe('Laserul', () => {
  it('lovește cel mai apropiat dușman din 300 de unități cu 14 / 22 / 32 și lasă o rază', () => {
    for (const [tier, dmg] of [[1, 14], [2, 22], [3, 32]] as const) {
      const f = quietFlight()
      untouchable(f)
      shipAt(f, 195, 600)
      f.ship.mods.laser = tier
      const near = addFoe(f, 'drone', 120, 450, HP)        // la 168
      const far = addFoe(f, 'drone', 300, 400, HP)         // la 226
      stepFlight(f, STILL)
      expect(near.hp).toBeCloseTo(1000 - dmg, 9)
      expect(far.hp).toBe(1000)
      const beams = f.fx.filter((e) => e.kind === 'beam')
      expect(beams).toHaveLength(1)
      expect(beams[0]).toMatchObject({ x2: 120, y2: 450 })
    }
  })
  it('nu lovește nimic dincolo de 300 de unități', () => {
    const f = quietFlight()
    shipAt(f, 195, 600)
    f.ship.mods.laser = 1
    const foe = addFoe(f, 'drone', 100, 300, HP)            // la 314,7
    stepFlight(f, STILL)
    expect(foe.hp).toBe(1000)
    expect(f.fx.filter((e) => e.kind === 'beam')).toEqual([])
  })
  it('trage la 0,9 s cât are țintă', () => {
    const f = quietFlight()
    untouchable(f)
    shipAt(f, 195, 600)
    f.ship.mods.laser = 1
    const foe = addFoe(f, 'gunship', 120, 450, { ...HP, hp: 1e6, maxHp: 1e6 })
    let beams = 0
    for (let i = 0; i < 60 * 2; i++) {                      // 2 s: la 0, 0,9 și 1,8
      stepFlight(f, STILL)
      beams += f.fx.filter((e) => e.kind === 'beam' && e.t0 === f.t).length
      foe.y = 450                                           // stă pe loc
    }
    expect(beams).toBe(3)
  })
  it('cu Armamentul la treapta 5 lovește cu 14 × 1,2', () => {
    const f = quietFlight(1, 1, { ...NO_UPS, arms: 5 })
    shipAt(f, 195, 600)
    f.ship.mods.laser = 1
    const foe = addFoe(f, 'drone', 120, 450, HP)
    stepFlight(f, STILL)
    expect(1000 - foe.hp).toBeCloseTo(16.8, 9)
  })
  it('țintește și un transport intrat în câmp', () => {
    const f = quietFlight()
    shipAt(f, 195, 600)
    f.ship.mods.laser = 1
    const cargo = addFoe(f, 'cargo', 120, 450)
    stepFlight(f, STILL)
    expect(cargo.hp).toBeCloseTo(FLIGHT.foes.cargo.hp - 14, 9)
  })
})

describe('Rachetele', () => {
  it('racheta lovește tot pe o rază de 50 cu 12 / 18 / 26 (și cu Armamentul)', () => {
    for (const [tier, arms, dmg] of [[1, 0, 12], [2, 0, 18], [3, 0, 26], [1, 5, 14.4]] as const) {
      const f = quietFlight(1, 1, { ...NO_UPS, arms })
      untouchable(f)
      shipAt(f, 195, 600)
      f.ship.mods.missile = tier
      const a = addFoe(f, 'drone', 100, 300, HP)
      const b = addFoe(f, 'drone', 130, 300, HP)            // cea mai apropiată de navă: ținta
      const c = addFoe(f, 'drone', 300, 300, HP)            // la 170 de ținta: în afara exploziei
      let guard = 0
      while (!f.fx.some((e) => e.kind === 'blast') && guard++ < 180) stepFlight(f, STILL)
      expect(f.fx.filter((e) => e.kind === 'blast')).toHaveLength(1)
      expect(1000 - a.hp).toBeCloseTo(dmg, 9)
      expect(1000 - b.hp).toBeCloseTo(dmg, 9)
      expect(c.hp).toBe(1000)
      expect(f.missiles).toEqual([])
    }
  })
  it('își ține ținta prin `id`; dacă ținta dispare, ia cel mai apropiat dușman', () => {
    const f = quietFlight()
    shipAt(f, 195, 600)
    f.ship.mods.missile = 1
    const first = addFoe(f, 'drone', 100, 300, HP)
    const other = addFoe(f, 'drone', 300, 250, HP)
    stepFlight(f, STILL)
    expect(f.missiles).toHaveLength(1)
    expect(f.missiles[0]!.targetId).toBe(first.id)
    f.foes = f.foes.filter((foe) => foe !== first)
    stepFlight(f, STILL)
    expect(f.missiles[0]!.targetId).toBe(other.id)
    const copy = JSON.parse(JSON.stringify(f)) as typeof f
    flyFor(f, 1.5); flyFor(copy, 1.5)
    expect(JSON.stringify(copy)).toBe(JSON.stringify(f))
    expect(other.hp).toBeLessThan(1000)
  })
  it('pleacă la 2,4 s cât are țintă', () => {
    const f = quietFlight()
    untouchable(f)
    shipAt(f, 195, 600)
    f.ship.mods.missile = 1
    const foe = addFoe(f, 'gunship', 120, 250, { ...HP, hp: 1e6, maxHp: 1e6 })
    let launched = 0, before = 0
    for (let i = 0; i < 60 * 5; i++) {                      // 5 s: la 0, 2,4 și 4,8
      stepFlight(f, STILL)
      if (f.missiles.length > before) launched++
      before = f.missiles.length
      foe.y = 250
    }
    expect(launched).toBe(3)
  })
})

describe('Scutul', () => {
  for (const [tier, recharge] of [[1, 6], [2, 4.5], [3, 3]] as const) {
    it(`treapta ${tier}: oprește o lovitură, nu și pe a doua venită înainte de ${recharge} s, o oprește pe cea de după`, () => {
      const start = () => {
        const f = quietFlight()
        for (let i = 0; i < tier; i++) take(f, 'shield')
        shotAt(f, f.ship.x, f.ship.y)
        stepFlight(f, STILL)
        expect(f.ship.hp).toBe(5)
        expect(f.fx.filter((e) => e.kind === 'block')).toHaveLength(1)
        expect(f.shots).toEqual([])
        return f
      }
      const early = start()
      flyFor(early, recharge - 0.1)
      shotAt(early, early.ship.x, early.ship.y)
      stepFlight(early, STILL)
      expect(early.ship.hp).toBe(4)
      const late = start()
      flyFor(late, recharge + 0.1)
      shotAt(late, late.ship.x, late.ship.y)
      stepFlight(late, STILL)
      expect(late.ship.hp).toBe(5)
      expect(late.fx.filter((e) => e.kind === 'block')).toHaveLength(1)   // cel vechi a îmbătrânit, ăsta e nou
    })
  }
})

describe('după ce cade nava de elită', () => {
  it('Laserul și Rachetele nu mai trag, iar Scutul nu se mai reîncarcă', () => {
    const f = quietFlight()
    untouchable(f)
    shipAt(f, 195, 600)
    take(f, 'laser'); take(f, 'missile'); take(f, 'shield')
    f.ship.shieldUp = false
    f.ship.shieldT = 0.01
    const foe = addFoe(f, 'drone', 120, 450, HP)
    f.exploreAt = f.t + FLIGHT.lootSecs
    fireArsenal(f)
    stepFlight(f, STILL)
    expect(foe.hp).toBe(1000)
    expect(f.missiles).toEqual([])
    expect(f.ship.shieldUp).toBe(false)
  })
})

describe('Magnetul și Colectarea', () => {
  it('fără Magnet, de la 85; cu Magnet 1 / 2 / 3, de la 130 / 175 / 220; Colectarea înmulțește tot', () => {
    const f = quietFlight()
    expect(pullReach(f)).toBe(85)
    for (const reach of [130, 175, 220]) { take(f, 'magnet'); expect(pullReach(f)).toBeCloseTo(reach, 9) }
    const g = quietFlight(1, 1, { ...NO_UPS, reach: 3 })
    g.ship.mods.magnet = 3
    expect(pullReach(g)).toBeCloseTo(220 * 1.3, 9)
  })
  it('cu Magnet 3 o resursă vine de la 220 de unități, nu de la 222', () => {
    for (const [dist, pulled] of [[218, true], [222, false]] as const) {
      const f = quietFlight()
      f.ship.mods.magnet = 3
      f.drops.push({ kind: 'crystal', x: f.ship.x - dist, y: f.ship.y })
      stepFlight(f, STILL)
      expect(f.drops[0]!.x > f.ship.x - dist + EPS).toBe(pulled)
    }
  })
})

describe('modulele de cules', () => {
  it('un modul nu vine spre navă nici cu Magnet 3: coboară cu 62 pe secundă', () => {
    const f = quietFlight()
    f.ship.mods.magnet = 3
    f.picks.push({ kind: 'laser', x: f.ship.x - 60, y: f.ship.y - 60 })
    stepFlight(f, STILL)
    expect(f.picks[0]!.x).toBe(f.ship.x - 60)
    expect(f.picks[0]!.y).toBeCloseTo(f.ship.y - 60 + 62 / 60, 9)
    expect(f.ship.mods.laser).toBe(0)
  })
  it('se culege la 27 de unități de mijlocul navei', () => {
    for (const [dx, got] of [[26, 1], [28, 0]] as const) {
      const f = quietFlight()
      f.picks.push({ kind: 'laser', x: f.ship.x + dx, y: f.ship.y - 62 / 60 })
      stepFlight(f, STILL)
      expect(f.ship.mods.laser).toBe(got)
      expect(f.picks).toHaveLength(1 - got)
    }
  })
  it('un modul care trece de navă iese pe jos', () => {
    const f = quietFlight()
    f.picks.push({ kind: 'magnet', x: 20, y: 600 })
    flyFor(f, 3)
    expect(f.picks).toEqual([])
    expect(f.ship.mods.magnet).toBe(0)
  })
  it('zborul pornește doar cu Tunul; cu `ups.kit` = 3, și cu Laser, Rachete și Scut la treapta 1 (Scutul încărcat)', () => {
    const plain = createFlight(1, 1)
    expect(plain.ship.mods).toEqual({ gun: 1, laser: 0, missile: 0, shield: 0, magnet: 0 })
    expect(plain.ship.shieldUp).toBe(false)
    expect(createFlight(1, 1, { ...NO_UPS, kit: 1 }).ship.mods).toEqual({ gun: 1, laser: 1, missile: 0, shield: 0, magnet: 0 })
    const kit = createFlight(1, 1, { ...NO_UPS, kit: 3 })
    expect(kit.ship.mods).toEqual({ gun: 1, laser: 1, missile: 1, shield: 1, magnet: 0 })
    expect(kit.ship.shieldUp).toBe(true)
  })
  it('efectele noi îmbătrânesc și ies din stare', () => {
    const f = quietFlight()
    untouchable(f)
    shipAt(f, 195, 600)
    take(f, 'laser'); take(f, 'missile')
    addFoe(f, 'drone', 120, 450, HP)
    const seen = new Set(f.fx.map((e) => e.kind))
    for (let i = 0; i < 90; i++) { stepFlight(f, STILL); for (const e of f.fx) seen.add(e.kind) }
    expect(seen).toEqual(new Set(['took', 'beam', 'blast']))
    f.foes = []
    flyFor(f, 3)
    expect(f.missiles).toEqual([])
    expect(f.fx).toEqual([])
  })
})
