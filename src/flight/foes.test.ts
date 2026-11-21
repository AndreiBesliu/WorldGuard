import { describe, expect, it } from 'vitest'
import { FLIGHT } from '../data/flight'
import { createFlight, eliteOf, type FlightState } from './state'
import { stepFlight } from './step'
import { shipBounds } from './ship'
import { STILL, addFoe, flyFor, quietFlight, shipAt, shotAt, untouchable } from './testkit'

const { w, h } = FLIGHT.field

/** Zborul la clipa `t`, fără nimic pe câmp (viața dușmanilor crește cu timpul). */
function quietAt(t: number, sector = 1): FlightState {
  const f = quietFlight(1, sector)
  f.tick = Math.round(t * 60)
  f.t = f.tick / 60
  return f
}

describe('dușmanii', () => {
  it('viața din spec la pornire: dronă 14, șerpuitoare 20, grea 70, elită 1400', () => {
    const f = quietFlight()
    expect(['drone', 'weaver', 'gunship', 'elite'].map((k) => addFoe(f, k as 'drone', 100, 100).hp)).toEqual([14, 20, 70, 1400])
  })
  it('viața crește pe parcursul sectorului, până la ×1,8; a elitei nu', () => {
    const f = quietAt(FLIGHT.sectorSecs)
    expect(addFoe(f, 'drone', 100, 100).hp).toBe(Math.round(14 * 1.8))
    expect(addFoe(f, 'gunship', 100, 100).hp).toBe(Math.round(70 * 1.8))
    expect(addFoe(f, 'elite', 100, 100).hp).toBe(1400)
    expect(addFoe(quietAt(FLIGHT.sectorSecs * 2), 'drone', 100, 100).hp).toBe(Math.round(14 * 1.8))
  })
  it('în sectorul 3 o dronă are mai multă viață decât în sectorul 1, iar elita la fel', () => {
    const one = quietFlight(1, 1), three = quietFlight(1, 3)
    expect(addFoe(three, 'drone', 100, 100).hp).toBeGreaterThan(addFoe(one, 'drone', 100, 100).hp)
    expect(addFoe(three, 'drone', 100, 100).hp).toBe(21)
    expect(addFoe(three, 'elite', 100, 100).hp).toBe(Math.round(1400 * 1.7))
  })
  it('dronele apar de la secunda 1,2, șerpuitoarele după 24, navele grele după 50', () => {
    const f = createFlight(3, 1)
    untouchable(f)
    const first: Record<string, number> = {}
    let seen = 0
    while (f.t < 60) {
      stepFlight(f, STILL)
      for (const foe of f.foes) if (foe.id >= seen) { first[foe.kind] ??= f.t; seen = foe.id + 1 }
    }
    expect(first.drone).toBeCloseTo(1.2, 1)
    expect(first.weaver).toBeGreaterThanOrEqual(24)
    expect(first.gunship).toBeGreaterThanOrEqual(50)
    expect(first.cargo).toBeCloseTo(5, 1)                    // primul transport
  })
  it('la jumătatea sectorului vin câteva secunde fără dușmani noi', () => {
    const f = createFlight(4, 1)
    untouchable(f)
    const half = FLIGHT.sectorSecs / 2
    flyFor(f, half - FLIGHT.calm.before + 0.05)
    const ids = new Set(f.foes.map((foe) => foe.id)), next = f.nextId
    flyFor(f, FLIGHT.calm.before + FLIGHT.calm.after - 0.1)
    expect(f.nextId).toBe(next)
    expect(f.foes.every((foe) => ids.has(foe.id))).toBe(true)
    flyFor(f, 0.2)
    expect(f.nextId).toBeGreaterThan(next)
  })
  it('dronele coboară drept și ies pe jos', () => {
    const f = quietFlight()
    shipAt(f, 30, 600)
    const foe = addFoe(f, 'drone', 300, 100, { fireT: 99 })
    stepFlight(f, STILL)
    expect(foe.x).toBe(300)
    expect(foe.y).toBeCloseTo(100 + FLIGHT.foes.drone.vy / 60, 9)
    flyFor(f, 10)
    expect(f.foes).toEqual([])
    expect(f.kills).toBe(0)
  })
  it('nava grea se oprește la 20% din înălțime, se plimbă, apoi pleacă după 9 s', () => {
    const f = quietFlight()
    shipAt(f, 30, 646)
    const foe = addFoe(f, 'gunship', 200, -20, { fireT: 99, hp: 1e6 })   // tunul navei n-o doboară cât se plimbă
    flyFor(f, 4)
    expect(foe.y).toBeGreaterThanOrEqual(h * 0.2)
    expect(foe.y).toBeLessThan(h * 0.2 + 1.01)
    const x = foe.x
    flyFor(f, 1)
    expect(Math.abs(foe.x - x)).toBeCloseTo(32, 0)
    flyFor(f, 9)
    expect(foe.y).toBeGreaterThan(h * 0.2 + 100)
  })
  it('drona și șerpuitoarea nu trag la mai puțin de 110 unități deasupra navei; niciun dușman nu trage sub 62% din înălțime', () => {
    const fire = (kind: 'drone' | 'weaver' | 'gunship', shipY: number, foeY: number): number => {
      const f = quietFlight()
      shipAt(f, 30, shipY)
      addFoe(f, kind, 300, foeY, { fireT: 0, ph: 0 })
      flyFor(f, 0.5)
      return f.shots.length
    }
    for (const kind of ['drone', 'weaver'] as const) {
      expect(fire(kind, 646, 300)).toBe(1)                  // departe, sus: trage
      expect(fire(kind, 400, 300)).toBe(0)                  // la 100 deasupra navei
      expect(fire(kind, 400, 400)).toBe(0)                  // în dreptul ei, apoi trecută de ea
    }
    for (const kind of ['drone', 'weaver', 'gunship'] as const) expect(fire(kind, 646, h * 0.62 + 5)).toBe(0)
  })
  it('nava grea oprită sus și nava de elită trag și când nava e lipită de marginea de sus', () => {
    const top = shipBounds().y0
    const g = quietFlight()
    shipAt(g, 195, top)
    addFoe(g, 'gunship', 195, h * FLIGHT.foes.gunship.stopAt, { fireT: 0 })
    untouchable(g)
    stepFlight(g, STILL)
    expect(g.shots).toHaveLength(3)
    const e = quietFlight()
    shipAt(e, 195, top)
    untouchable(e)
    const elite = addFoe(e, 'elite', w / 2, h * FLIGHT.foes.elite.stopAt, { fireT: 0 })
    e.eliteId = elite.id
    stepFlight(e, STILL)
    expect(e.shots).toHaveLength(FLIGHT.foes.elite.ring)
    expect(e.ship.y - elite.y).toBeLessThan(FLIGHT.foe.fireGap)
  })
  it('focul: drona trage drept în jos cu 185, șerpuitoarea spre navă cu 170, nava grea trei în evantai cu 160', () => {
    const shots = (kind: 'drone' | 'weaver' | 'gunship') => {
      const f = quietFlight()
      shipAt(f, 100, 646)
      addFoe(f, kind, 200, 200, { fireT: 0, ph: 0 })
      stepFlight(f, STILL)
      return f.shots
    }
    const [d] = shots('drone')
    expect([d!.vx, d!.vy]).toEqual([expect.closeTo(0, 9), expect.closeTo(185, 9)])
    const [a] = shots('weaver')
    expect(Math.hypot(a!.vx, a!.vy)).toBeCloseTo(170, 9)
    expect(a!.vx).toBeLessThan(0)
    const fan = shots('gunship')
    expect(fan).toHaveLength(3)
    for (const s of fan) expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(160, 9)
  })
  it('elita alternează un cerc de 14 cu două salve de câte 5; sub jumătate din viață, cercul are 18', () => {
    const f = quietFlight()
    shipAt(f, 195, 646)
    untouchable(f)
    const elite = addFoe(f, 'elite', w / 2, 150, { fireT: 0 })
    f.eliteId = elite.id
    const volleys: number[] = []
    for (let i = 0; i < 60 * 6 && volleys.length < 4; i++) {
      const old = new Set(f.shots)
      stepFlight(f, STILL)
      const fresh = f.shots.filter((s) => !old.has(s))      // cele plecate în pasul ăsta
      if (fresh.length > 0) volleys.push(fresh.length)
    }
    expect(volleys).toEqual([14, 5, 5, 14])
    const angry = quietFlight()
    shipAt(angry, 195, 646)
    const e2 = addFoe(angry, 'elite', w / 2, 150, { fireT: 0 })
    e2.hp = e2.maxHp / 2 - 1
    angry.eliteId = e2.id
    stepFlight(angry, STILL)
    expect(angry.shots).toHaveLength(18)
  })
})

describe('ce lasă în urmă', () => {
  it('o dronă doborâtă lasă un cristal; nava grea 4; un asteroid spart, metal', () => {
    const f = quietFlight()
    const d = addFoe(f, 'drone', 100, 100, { fireT: 99 })
    const g = addFoe(f, 'gunship', 300, 100, { fireT: 99 })
    d.hp = 0.1; g.hp = 0.1
    f.bolts.push({ x: 100, y: 100, vx: 0 }, { x: 300, y: 100, vx: 0 })
    f.asteroids.push({ x: 200, y: 300, vx: 0, vy: 0, r: 15, rot: 0, vr: 0, hp: 0.1, hitT: -9, shape: [1, 1, 1, 1, 1, 1, 1, 1] })
    f.bolts.push({ x: 200, y: 300, vx: 0 })
    stepFlight(f, STILL)
    expect(f.kills).toBe(2)
    expect(f.foes).toEqual([])
    expect(f.asteroids).toEqual([])
    expect(f.drops.filter((d) => d.kind === 'crystal')).toHaveLength(5)
    expect(f.drops.filter((d) => d.kind === 'metal')).toHaveLength(1)
  })
  it('în sectoare mai departe lasă mai mult: nava grea, în medie, ×1,4 în sectorul 3', () => {
    let n = 0
    for (let i = 0; i < 40; i++) {
      const f = quietFlight(i + 1, 3)
      const g = addFoe(f, 'gunship', 300, 100, { fireT: 99, hp: 0.1 })
      f.bolts.push({ x: g.x, y: g.y, vx: 0 })
      stepFlight(f, STILL)
      n += f.drops.length
    }
    expect(n / 40).toBeGreaterThan(5.2)
    expect(n / 40).toBeLessThan(6)
  })
  it('un asteroid mare spart lasă 2 de metal', () => {
    const f = quietFlight()
    f.asteroids.push({ x: 200, y: 300, vx: 0, vy: 0, r: FLIGHT.asteroid.big + 1, rot: 0, vr: 0, hp: 0.1, hitT: -9, shape: [1, 1, 1, 1, 1, 1, 1, 1] })
    f.bolts.push({ x: 200, y: 300, vx: 0 })
    stepFlight(f, STILL)
    expect(f.drops.filter((d) => d.kind === 'metal')).toHaveLength(2)
  })
  it('un asteroid ieșit din câmp, pe jos sau în lături, e scos din stare', () => {
    const f = quietFlight()
    const asteroid = (x: number, y: number, vx: number, vy: number) =>
      ({ x, y, vx, vy, r: 15, rot: 0, vr: 0, hp: 22, hitT: -9, shape: [1, 1, 1, 1, 1, 1, 1, 1] })
    const out = FLIGHT.asteroid.gone
    f.asteroids.push(asteroid(30, h + out - 0.5, 0, 60), asteroid(-out + 0.5, 100, -60, 0), asteroid(w + out - 0.5, 100, 60, 0), asteroid(100, 100, 0, 0))
    stepFlight(f, STILL)
    expect(f.asteroids).toHaveLength(1)
    expect([f.asteroids[0]!.x, f.asteroids[0]!.y]).toEqual([100, 100])
    expect(f.drops).toEqual([])
  })
  it('un asteroid care atinge nava o lovește și dispare fără să lase metal', () => {
    const f = quietFlight()
    f.asteroids.push({ x: f.ship.x, y: f.ship.y - 10, vx: 0, vy: 0, r: 15, rot: 0, vr: 0, hp: 22, hitT: -9, shape: [1, 1, 1, 1, 1, 1, 1, 1] })
    stepFlight(f, STILL)
    expect(f.ship.hp).toBe(4)
    expect(f.asteroids).toEqual([])
    expect(f.drops).toEqual([])
  })
})

describe('nava de elită și sfârșitul', () => {
  it('fără lovituri primite, nava de elită apare la 172,5 s', () => {
    const f = createFlight(2, 1)
    untouchable(f)
    for (let i = 0; i < 172.5 * 60 - 1; i++) stepFlight(f, STILL)
    expect(f.eliteId).toBe(-1)
    expect(eliteOf(f)).toBeNull()
    stepFlight(f, STILL)
    const elite = eliteOf(f)
    expect(elite).toMatchObject({ kind: 'elite', maxHp: 1400, x: w / 2 })
    expect(f.mode).toBe('flying')
  })
  it('după 170 s nu mai apar dușmani obișnuiți, doar câte două drone de escortă cât trăiește elita', () => {
    const f = createFlight(2, 1)
    untouchable(f)
    flyFor(f, FLIGHT.sectorSecs + 0.05)
    const late = f.nextId
    flyFor(f, FLIGHT.eliteDelay + 6.5)
    const fresh = f.foes.filter((foe) => foe.id >= late).map((foe) => foe.kind)
    expect(fresh).toEqual(['elite'])
    flyFor(f, 1)
    expect(f.foes.filter((foe) => foe.id >= late).map((foe) => foe.kind)).toEqual(['elite', 'drone', 'drone'])
  })
  it('cu nava de elită doborâtă, `mode` devine `explored` după 3,4 s, nu înainte', () => {
    const f = quietFlight()
    shipAt(f, w / 2, 600)
    const elite = addFoe(f, 'elite', w / 2, 200, { fireT: 99 })
    f.eliteId = elite.id
    elite.hp = 1
    let guard = 0
    while (eliteOf(f) !== null && guard++ < 120) stepFlight(f, STILL)
    expect(eliteOf(f)).toBeNull()
    expect(f.kills).toBe(1)
    expect(f.drops.filter((d) => d.kind === 'crystal')).toHaveLength(24)
    for (let i = 0; i < 3.4 * 60 - 1; i++) stepFlight(f, STILL)
    expect(f.mode).toBe('flying')
    stepFlight(f, STILL)
    expect(f.mode).toBe('explored')
    const frozen = JSON.stringify(f)
    flyFor(f, 1, { dx: 30, dy: 30 })
    expect(JSON.stringify(f)).toBe(frozen)
  })
  describe('a cincea lovitură în pasul în care cade nava de elită', () => {
    /** Nava cu o singură viață, elita pe moarte, cu un proiectil al Tunului în ea: cade în pasul următor. */
    const setup = (): FlightState => {
      const f = quietFlight()
      shipAt(f, w / 2, 600)
      f.ship.hp = 1
      const elite = addFoe(f, 'elite', w / 2, 200, { fireT: 99, hp: 0.1 })
      f.eliteId = elite.id
      f.bolts.push({ x: w / 2, y: 200, vx: 0 })
      return f
    }
    it('din atingerea unei nave dușmane: câștigă căderea navei tale (`down`)', () => {
      const f = setup()
      addFoe(f, 'drone', w / 2, 590, { fireT: 99 })
      stepFlight(f, STILL)
      expect(eliteOf(f)).toBeNull()
      expect(f.mode).toBe('down')
    })
    it('de la un asteroid: tot `down`', () => {
      const f = setup()
      f.asteroids.push({ x: w / 2, y: 595, vx: 0, vy: 0, r: 15, rot: 0, vr: 0, hp: 22, hitT: -9, shape: [1, 1, 1, 1, 1, 1, 1, 1] })
      stepFlight(f, STILL)
      expect(eliteOf(f)).toBeNull()
      expect(f.mode).toBe('down')
    })
    it('de la un proiectil dușman: câștigă elita doborâtă (proiectilul dispare odată cu ea), apoi `explored`', () => {
      const f = setup()
      shotAt(f, f.ship.x, f.ship.y)
      stepFlight(f, STILL)
      expect(eliteOf(f)).toBeNull()
      expect([f.mode, f.ship.hp]).toEqual(['flying', 1])
      flyFor(f, FLIGHT.lootSecs + 0.1)
      expect(f.mode).toBe('explored')
    })
  })
  it('când cade elita, proiectilele dușmane dispar, iar nava nu mai poate fi lovită cât strânge', () => {
    const f = quietFlight()
    shipAt(f, w / 2, 600)
    const elite = addFoe(f, 'elite', w / 2, 200, { fireT: 99, hp: 1 })
    f.eliteId = elite.id
    f.shots.push({ x: 20, y: 20, vx: 0, vy: 1 })
    while (eliteOf(f) !== null) stepFlight(f, STILL)
    expect(f.shots).toEqual([])
    f.shots.push({ x: f.ship.x, y: f.ship.y, vx: 0, vy: 0 })
    flyFor(f, 2)
    expect(f.ship.hp).toBe(5)
  })
})
