// Dușmanii zborului și asteroizii: aparițiile, mersul, focul, loviturile primite și ce lasă în urmă.
// Hazardul vine din fluxuri cu nume, câte unul pe întâmplare (o apariție, un dușman, un foc, o pradă), cu numărul ei din stare.
import { FLIGHT, sectorScale, type FlightFoeKind } from '../data/flight'
import { createRng, type Rng } from '../sim/rng'
import { boltDmg, hurtShip } from './ship'
import { DT, EPS, NEVER, type FlightAsteroid, type FlightFoe, type FlightState, type SpawnKind } from './state'

const TAU = 2 * Math.PI
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)

/** Cât din drumul sectorului a trecut, 0…1: de el depind ritmul aparițiilor și viața dușmanilor. */
const along = (f: FlightState): number => Math.min(1, f.t / FLIGHT.sectorSecs)

/** Fluxul pentru a `n`-a apariție de felul dat. */
function spawnRng(f: FlightState, kind: SpawnKind): Rng {
  return createRng(f.seed, `zbor-aparitie-${kind}-${f.spawned[kind]++}`)
}

/** Un dușman nou, intrat de deasupra câmpului în dreptul lui `x`. */
export function makeFoe(f: FlightState, kind: FlightFoeKind, x: number): FlightFoe {
  const d = FLIGHT.foes[kind], scale = sectorScale(f.sector)
  const hp = kind === 'elite' ? Math.round(d.hp * scale.elite)
    : kind === 'cargo' ? d.hp
    : Math.round(d.hp * (1 + FLIGHT.foe.hpGrow * along(f)) * scale.hp)
  const id = f.nextId++
  const rng = createRng(f.seed, `zbor-dusman-${id}`)
  const foe: FlightFoe = {
    id, kind, x, y: -d.r - FLIGHT.spawn.y, r: d.r, hp, maxHp: hp, hitT: NEVER,
    x0: x, ph: rng.next() * TAU, age: 0,
    dir: rng.next() < 0.5 ? -1 : 1, stay: 0, leaving: false,
    sway: 0, pat: 0, spin: 0,
    fireT: FLIGHT.foe.firstFire + rng.next() * FLIGHT.foe.firstFireJitter, fired: 0,
  }
  f.foes.push(foe)
  return foe
}

function addAsteroid(f: FlightState, rng: Rng): void {
  const a = FLIGHT.asteroid, { w } = FLIGHT.field
  const r = a.r + rng.next() * a.rSpan
  const shape: number[] = []
  for (let i = 0; i < a.shape; i++) shape.push(a.shapeMin + rng.next() * a.shapeSpan)
  f.asteroids.push({
    x: a.margin + rng.next() * (w - 2 * a.margin), y: -r - a.y,
    vx: (rng.next() - 0.5) * a.vx, vy: a.vy + rng.next() * a.vySpan,
    r, rot: rng.next() * TAU, vr: (rng.next() - 0.5) * a.vr, hp: r * a.hpPerR, hitT: NEVER, shape,
  })
}

/** Aparițiile: dușmanii obișnuiți și asteroizii până la `sectorSecs` (fără liniștea de la jumătate), apoi nava de elită și escorta ei. */
export function spawnFlight(f: FlightState): void {
  const t = f.t + EPS, k = along(f), nx = f.next, sp = FLIGHT.spawn, { w } = FLIGHT.field
  const pace = sectorScale(f.sector).pace
  if (f.t < FLIGHT.sectorSecs) {
    const half = FLIGHT.sectorSecs / 2
    if (f.t > half - FLIGHT.calm.before && f.t < half + FLIGHT.calm.after) return
    if (t >= nx.drone) {
      const rng = spawnRng(f, 'drone'), c = sp.drone
      nx.drone = f.t + lerp(c.every[0], c.every[1], k) * (c.jitter + c.jitterSpan * rng.next()) * pace
      const x = c.margin + rng.next() * (w - 2 * c.margin)
      makeFoe(f, 'drone', x)
      if (k > c.pairAfter && rng.next() < c.pair) makeFoe(f, 'drone', w - x)
    }
    if (t >= nx.asteroid) {
      const rng = spawnRng(f, 'asteroid'), c = sp.asteroid
      nx.asteroid = f.t + lerp(c.every[0], c.every[1], k) * (c.jitter + c.jitterSpan * rng.next())
      addAsteroid(f, rng)
    }
    if (t >= nx.weaver) {
      const rng = spawnRng(f, 'weaver'), c = sp.weaver
      nx.weaver = f.t + lerp(c.every[0], c.every[1], k) * (c.jitter + c.jitterSpan * rng.next()) * pace
      makeFoe(f, 'weaver', c.margin + rng.next() * (w - 2 * c.margin))
    }
    if (t >= nx.gunship) {
      const c = sp.gunship
      const alive = f.foes.filter((foe) => foe.kind === 'gunship').length
      if (alive < (k > c.lateAfter ? c.mostLate : c.most)) {
        const rng = spawnRng(f, 'gunship')
        nx.gunship = f.t + lerp(c.every[0], c.every[1], k) * pace
        makeFoe(f, 'gunship', c.margin + rng.next() * (w - 2 * c.margin))
      } else nx.gunship = f.t + c.retry
    }
    return
  }
  if (f.eliteId < 0) {
    if (t >= FLIGHT.sectorSecs + FLIGHT.eliteDelay) {
      f.eliteId = makeFoe(f, 'elite', w / 2).id
      nx.escort = f.t + sp.escort.first
    }
    return
  }
  const elite = f.foes.find((foe) => foe.id === f.eliteId)
  if (elite && t >= nx.escort) {
    const rng = spawnRng(f, 'escort'), c = sp.escort
    nx.escort = f.t + c.every * pace
    const x = c.x + rng.next() * c.xSpan
    makeFoe(f, 'drone', x)
    makeFoe(f, 'drone', w - x)
  }
}

/** Ce rămâne în urmă: `base` bucăți × prada sectorului; partea cu virgulă e o șansă, ca media să fie exactă. */
function scatter(f: FlightState, kind: 'crystal' | 'metal', x: number, y: number, base: number, spread: number): Rng {
  const rng = createRng(f.seed, `zbor-prada-${f.lootN++}`)
  const want = base * sectorScale(f.sector).loot, whole = Math.floor(want + EPS)
  const n = whole + (rng.next() < want - whole - EPS ? 1 : 0)
  for (let i = 0; i < n; i++) f.drops.push({ kind, x: x + (rng.next() - 0.5) * spread, y: y + (rng.next() - 0.5) * spread })
  return rng
}

function killFoe(f: FlightState, foe: FlightFoe): void {
  const d = FLIGHT.foes[foe.kind], fx = FLIGHT.fx
  f.kills += 1
  f.fx.push({ kind: 'puff', what: 'foe', r: foe.r * fx.foePuff, x: foe.x, y: foe.y, t0: f.t })
  if (foe.kind !== 'elite') {
    scatter(f, 'crystal', foe.x, foe.y, d.drop, d.drop > 1 ? FLIGHT.drops.spread.many : FLIGHT.drops.spread.one)
    return
  }
  const rng = scatter(f, 'crystal', foe.x, foe.y, d.drop, FLIGHT.drops.spread.elite)
  for (let i = 0; i < fx.elitePuffs; i++) {
    f.fx.push({
      kind: 'puff', what: 'elite', r: fx.elitePuffR + rng.next() * fx.elitePuffSpan,
      x: foe.x + (rng.next() - 0.5) * fx.eliteSpreadX, y: foe.y + (rng.next() - 0.5) * fx.eliteSpreadY, t0: f.t,
    })
  }
  for (const s of f.shots) f.fx.push({ kind: 'puff', what: 'shot', r: fx.shotPuff, x: s.x, y: s.y, t0: f.t })
  f.shots = []
  f.exploreAt = f.t + FLIGHT.lootSecs
}

/** O lovitură într-un dușman viu; la viață zero e doborât (o singură dată). */
export function hitFoe(f: FlightState, foe: FlightFoe, dmg: number): void {
  if (foe.hp <= EPS) return
  foe.hp -= dmg
  foe.hitT = f.t
  if (foe.hp <= EPS) killFoe(f, foe)
}

export function hitAsteroid(f: FlightState, a: FlightAsteroid, dmg: number): void {
  if (a.hp <= EPS) return
  a.hp -= dmg
  a.hitT = f.t
  if (a.hp > EPS) return
  f.fx.push({ kind: 'puff', what: 'asteroid', r: a.r * FLIGHT.fx.asteroidPuff, x: a.x, y: a.y, t0: f.t })
  const metal = FLIGHT.asteroid.metal
  scatter(f, 'metal', a.x, a.y, a.r > FLIGHT.asteroid.big ? metal.big : metal.small, FLIGHT.drops.spread.asteroid)
}

function shoot(f: FlightState, x: number, y: number, ang: number, speed: number): void {
  f.shots.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed })
}

/** Un foc, după felul dușmanului; pune și pauza până la următorul. */
function fire(f: FlightState, foe: FlightFoe): void {
  const s = f.ship, sh = FLIGHT.shot, toShip = Math.atan2(s.y - foe.y, s.x - foe.x)
  if (foe.kind === 'elite') {
    const e = FLIGHT.foes.elite, angry = foe.hp < foe.maxHp / 2, pause = e.fire * (angry ? e.angry : 1)
    const now = e.pattern[foe.pat % e.pattern.length], then = e.pattern[(foe.pat + 1) % e.pattern.length]
    if (now === 'ring') {
      const n = angry ? e.ringAngry : e.ring
      foe.spin += e.spin
      for (let i = 0; i < n; i++) shoot(f, foe.x, foe.y, foe.spin + (i / n) * TAU, sh.ring)
    } else {
      for (const a of sh.burstSpread) shoot(f, foe.x, foe.y + foe.r * sh.burstFrom, toShip + a, sh.burst)
    }
    foe.fireT = now === 'burst' && then === 'burst' ? e.burstGap : pause
    foe.pat += 1
    return
  }
  const rng = createRng(f.seed, `zbor-foc-${foe.id}-${foe.fired++}`)
  const jitter = FLIGHT.foe.jitter + rng.next() * FLIGHT.foe.jitterSpan
  if (foe.kind === 'drone') shoot(f, foe.x, foe.y + foe.r, Math.PI / 2, sh.down)
  else if (foe.kind === 'weaver') shoot(f, foe.x, foe.y + foe.r, toShip, sh.aim)
  else for (const a of sh.fanSpread) shoot(f, foe.x, foe.y + foe.r, toShip + a, sh.fan)
  foe.fireT = FLIGHT.foes[foe.kind].fire * jitter
}

function move(foe: FlightFoe): void {
  const { w, h } = FLIGHT.field
  foe.age += DT
  switch (foe.kind) {
    case 'drone':
    case 'cargo':
      foe.y += FLIGHT.foes[foe.kind].vy * DT
      return
    case 'weaver': {
      const d = FLIGHT.foes.weaver
      foe.y += d.vy * DT
      foe.x = clamp(foe.x0 + Math.sin(foe.age * d.freq + foe.ph) * d.amp, d.edge, w - d.edge)
      return
    }
    case 'gunship': {
      const d = FLIGHT.foes.gunship
      if (foe.leaving) { foe.y += d.leave * DT; return }
      if (foe.y < h * d.stopAt) { foe.y += d.vy * DT; return }
      foe.x += foe.dir * d.roam * DT
      if (foe.x < d.roamEdge) foe.dir = 1
      else if (foe.x > w - d.roamEdge) foe.dir = -1
      foe.stay += DT
      if (foe.stay > d.stay) foe.leaving = true
      return
    }
    case 'elite': {
      const d = FLIGHT.foes.elite
      if (foe.y < h * d.stopAt) { foe.y += d.vy * DT; return }
      foe.sway += DT
      foe.x = w / 2 + Math.sin(foe.sway * d.swayFreq) * d.swayAmp
    }
  }
}

/** Dușmanii: merg, trag (doar din partea de sus, departe deasupra navei), lovesc nava dacă o ating, ies pe jos. */
export function updateFoes(f: FlightState): void {
  const s = f.ship, c = FLIGHT.foe, { h } = FLIGHT.field
  for (const foe of f.foes) {
    if (foe.hp <= EPS) continue
    move(foe)
    const canFire = foe.kind !== 'cargo' && f.mode === 'flying' && f.exploreAt < 0
      && foe.y > c.fireTop && foe.y < h * c.fireLow && (!FLIGHT.foes[foe.kind].keepsAway || s.y - foe.y > c.fireGap)
    if (canFire) {
      foe.fireT -= DT
      if (foe.fireT <= EPS) fire(f, foe)
    }
    if (f.mode === 'flying' && Math.hypot(foe.x - s.x, foe.y - s.y) < foe.r * c.touch + FLIGHT.ship.hitR) {
      hurtShip(f)
      if (foe.kind !== 'elite') hitFoe(f, foe, c.bump)
    }
  }
  f.foes = f.foes.filter((foe) => foe.hp > EPS && foe.y <= h + c.gone)
}

/** Asteroizii: coboară și se rotesc; unul care atinge nava o lovește și se sparge fără să lase metal. */
export function updateAsteroids(f: FlightState): void {
  const s = f.ship, a = FLIGHT.asteroid, { w, h } = FLIGHT.field
  f.asteroids = f.asteroids.filter((r) => {
    r.x += r.vx * DT; r.y += r.vy * DT; r.rot += r.vr * DT
    if (r.y > h + a.gone || r.x < -a.gone || r.x > w + a.gone) return false
    if (f.mode === 'flying' && Math.hypot(r.x - s.x, r.y - s.y) < r.r * a.touch + FLIGHT.ship.hitR) {
      f.fx.push({ kind: 'puff', what: 'asteroid', r: r.r * FLIGHT.fx.crashPuff, x: r.x, y: r.y, t0: f.t })
      hurtShip(f)
      return false
    }
    return true
  })
}

/** Proiectilele Tunului urcă; fiecare lovește primul dușman sau, altfel, primul asteroid pe care îl prinde. */
export function updateBolts(f: FlightState): void {
  const g = FLIGHT.gun, { w } = FLIGHT.field, dmg = boltDmg(f)
  f.bolts = f.bolts.filter((b) => {
    b.y -= g.speed * DT
    b.x += b.vx * DT
    if (b.y < -g.goneTop || b.x < -g.goneSide || b.x > w + g.goneSide) return false
    const foe = f.foes.find((o) => o.hp > EPS && Math.abs(b.x - o.x) <= o.r + g.foeHit.x && Math.abs(b.y - o.y) <= o.r + g.foeHit.y)
    if (foe) { hitFoe(f, foe, dmg); return false }
    const a = f.asteroids.find((o) => o.hp > EPS && Math.abs(b.x - o.x) <= o.r + g.asteroidHit.x && Math.abs(b.y - o.y) <= o.r + g.asteroidHit.y)
    if (a) { hitAsteroid(f, a, dmg); return false }
    return true
  })
  f.foes = f.foes.filter((foe) => foe.hp > EPS)
  f.asteroids = f.asteroids.filter((a) => a.hp > EPS)
}

/** Proiectilele dușmane zboară drept; unul care atinge punctul navei se oprește în ea, chiar dacă nava clipește. */
export function updateShots(f: FlightState): void {
  const s = f.ship, sh = FLIGHT.shot, { w, h } = FLIGHT.field, near = sh.r + FLIGHT.ship.hitR
  f.shots = f.shots.filter((p) => {
    p.x += p.vx * DT; p.y += p.vy * DT
    if (p.y > h + sh.gone || p.y < -sh.goneTop || p.x < -sh.gone || p.x > w + sh.gone) return false
    if (f.mode === 'flying' && Math.hypot(p.x - s.x, p.y - s.y) < near) { hurtShip(f); return false }
    return true
  })
}
