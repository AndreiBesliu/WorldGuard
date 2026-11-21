// Armele navei în zbor: Tunul pe trepte, Laserul, Rachetele (lansarea și zborul lor), reîncărcarea Scutului.
// Lovitura Laserului și a Rachetelor se înmulțește cu Armamentul, ca a Tunului. O rachetă își ține ținta prin `id`.
import { FLIGHT } from '../data/flight'
import { hitAsteroid, hitFoe } from './foes'
import { armsFactor } from './ship'
import { DT, EPS, type FlightFoe, type FlightMissile, type FlightState } from './state'

/**
 * Cel mai apropiat dușman viu de punctul (`x`, `y`), mai aproape de `range`, pe care îl pot ținti Laserul și Rachetele:
 * intrat în câmp (transportul, ceva mai jos), și nu cu mult sub punctul din care se caută.
 */
export function nearestTarget(f: FlightState, x: number, y: number, range: number): FlightFoe | null {
  const a = FLIGHT.aim
  let best: FlightFoe | null = null, bd = range
  for (const foe of f.foes) {
    if (foe.hp <= EPS || foe.y < (foe.kind === 'cargo' ? a.cargoTop : a.top) || foe.y > y + a.below) continue
    const d = Math.hypot(foe.x - x, foe.y - y)
    if (d < bd) { bd = d; best = foe }
  }
  return best
}

/** Tunul trage singur, drept înainte: la treapta 1, două proiectile paralele; de la treapta 2, în evantai. */
export function fireGun(f: FlightState): void {
  const s = f.ship, g = FLIGHT.gun
  s.fireT -= DT
  if (s.fireT > EPS) return
  s.fireT += g.every
  const fan = g.volley[s.mods.gun - 1] ?? []
  if (fan.length === 0) {
    f.bolts.push({ x: s.x - g.spread, y: s.y - g.lift, vx: 0 }, { x: s.x + g.spread, y: s.y - g.lift, vx: 0 })
    return
  }
  for (const a of fan) f.bolts.push({ x: s.x + a * g.fanX, y: s.y - g.lift, vx: Math.sin(a) * g.speed })
}

function fireLaser(f: FlightState): void {
  const s = f.ship, l = FLIGHT.mods.laser
  s.laserT -= DT
  if (s.laserT > EPS) return
  const foe = nearestTarget(f, s.x, s.y, l.range)
  if (!foe) { s.laserT = l.retry; return }
  s.laserT = l.every
  f.fx.push({ kind: 'beam', x1: s.x, y1: s.y - l.from, x2: foe.x, y2: foe.y, t0: f.t })
  hitFoe(f, foe, l.dmg[s.mods.laser - 1]! * armsFactor(f))
}

function launchMissile(f: FlightState): void {
  const s = f.ship, m = FLIGHT.mods.missile
  s.missileT -= DT
  if (s.missileT > EPS) return
  const foe = nearestTarget(f, s.x, s.y, m.range)
  if (!foe) { s.missileT = m.retry; return }
  s.missileT = m.every
  f.missiles.push({ x: s.x, y: s.y - m.from, vx: 0, vy: -m.launch, targetId: foe.id })
}

/** Armele trag și Scutul se reîncarcă. Nu se cheamă după ce a căzut nava de elită. */
export function fireArsenal(f: FlightState): void {
  if (f.exploreAt >= 0) return
  const s = f.ship, m = s.mods
  fireGun(f)
  if (m.laser > 0) fireLaser(f)
  if (m.missile > 0) launchMissile(f)
  if (m.shield > 0 && !s.shieldUp) {
    s.shieldT -= DT
    if (s.shieldT <= EPS) { s.shieldT = 0; s.shieldUp = true }
  }
}

/** Explozia unei rachete: lovește tot ce prinde, dușmani și asteroizi. */
function blast(f: FlightState, x: number, y: number): void {
  const m = FLIGHT.mods.missile, dmg = m.dmg[f.ship.mods.missile - 1]! * armsFactor(f)
  f.fx.push({ kind: 'blast', x, y, r: m.blast, t0: f.t })
  for (const foe of f.foes) if (foe.hp > EPS && Math.hypot(foe.x - x, foe.y - y) < m.blast + foe.r * m.blastPad) hitFoe(f, foe, dmg)
  for (const a of f.asteroids) if (a.hp > EPS && Math.hypot(a.x - x, a.y - y) < m.blast + a.r * m.blastPad) hitAsteroid(f, a, dmg)
}

/** O rachetă în zbor: se întoarce spre țintă (sau își caută alta), înaintează, explodează în primul dușman atins. */
function flyMissile(f: FlightState, mi: FlightMissile): boolean {
  const m = FLIGHT.mods.missile, { w, h } = FLIGHT.field
  let target = f.foes.find((foe) => foe.id === mi.targetId && foe.hp > EPS) ?? null
  if (!target) {
    target = nearestTarget(f, mi.x, mi.y + m.seekAhead, m.seek)
    mi.targetId = target ? target.id : -1
  }
  if (target) {
    const dx = target.x - mi.x, dy = target.y - mi.y, d = Math.hypot(dx, dy) || 1, steer = Math.min(1, m.steer * DT)
    mi.vx += ((dx / d) * m.speed - mi.vx) * steer
    mi.vy += ((dy / d) * m.speed - mi.vy) * steer
  }
  mi.x += mi.vx * DT; mi.y += mi.vy * DT
  if (mi.y < -m.gone || mi.y > h + m.gone || mi.x < -m.gone || mi.x > w + m.gone) return false
  // Un transport o oprește doar dacă e chiar ținta ei: altfel racheta trece pe lângă el.
  const hit = f.foes.find((foe) => foe.hp > EPS && (foe.kind !== 'cargo' || foe.id === mi.targetId)
    && Math.hypot(foe.x - mi.x, foe.y - mi.y) < foe.r + m.hit)
  if (!hit) return true
  blast(f, mi.x, mi.y)
  return false
}

/** Rachetele în zbor; la sfârșit scoate din stare ce au doborât. */
export function updateMissiles(f: FlightState): void {
  if (f.missiles.length === 0) return
  f.missiles = f.missiles.filter((mi) => flyMissile(f, mi))
  f.foes = f.foes.filter((foe) => foe.hp > EPS)
  f.asteroids = f.asteroids.filter((a) => a.hp > EPS)
}
