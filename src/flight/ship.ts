// Nava ta în zbor: condusul, Tunul, loviturile primite, strânsul resurselor.
import { FLIGHT } from '../data/flight'
import { WORKSHOP } from '../data/workshop'
import { DT, EPS, type FlightInput, type FlightState } from './state'

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)

/** Dreptunghiul în care poate sta mijlocul navei. */
export function shipBounds(): { x0: number; x1: number; y0: number; y1: number } {
  const { w, h } = FLIGHT.field, s = FLIGHT.ship
  return { x0: s.side, x1: w - s.side, y0: h * s.top, y1: h - s.bottom }
}

/**
 * Mișcarea cerută, × `gain`, se adaugă la restul încă nefăcut; nava îl face cu cel mult `max` unități pe secundă.
 * Pe o axă unde restul ar duce-o dincolo de margine, restul se taie la margine: întoarcerea se simte din primul pas.
 */
export function driveShip(f: FlightState, input: FlightInput): void {
  const s = f.ship, b = shipBounds(), d = FLIGHT.drive
  s.rx = clamp(s.x + s.rx + input.dx * d.gain, b.x0, b.x1) - s.x
  s.ry = clamp(s.y + s.ry + input.dy * d.gain, b.y0, b.y1) - s.y
  const dist = Math.hypot(s.rx, s.ry), max = d.max * DT
  if (dist <= max) {
    s.x += s.rx; s.y += s.ry; s.rx = 0; s.ry = 0
  } else {
    const mx = (s.rx / dist) * max, my = (s.ry / dist) * max
    s.x += mx; s.y += my; s.rx -= mx; s.ry -= my
  }
  s.x = clamp(s.x, b.x0, b.x1)
  s.y = clamp(s.y, b.y0, b.y1)
}

/** Lovitura unui proiectil al Tunului, cu Armamentul (fără rotunjire). */
export function boltDmg(f: FlightState): number {
  return FLIGHT.gun.dmg * (1 + WORKSHOP.arms.dmg * f.ups.arms)
}

/** Tunul trage singur, drept înainte: la treapta 1, două proiectile la ±`spread` de mijlocul navei. */
export function fireGun(f: FlightState): void {
  const s = f.ship, g = FLIGHT.gun
  s.fireT -= DT
  if (s.fireT > EPS) return
  s.fireT += g.every
  f.bolts.push({ x: s.x - g.spread, y: s.y - g.lift, vx: 0 }, { x: s.x + g.spread, y: s.y - g.lift, vx: 0 })
}

/** Nava primește o lovitură, dacă poate fi lovită: nu cât clipește și nu după ce a căzut nava de elită. */
export function hurtShip(f: FlightState): void {
  const s = f.ship
  if (f.mode !== 'flying' || s.inv > EPS || f.exploreAt >= 0) return
  s.hp -= 1
  s.inv = FLIGHT.ship.inv
  if (s.hp > 0) { f.fx.push({ kind: 'hurt', x: s.x, y: s.y, t0: f.t }); return }
  s.hp = 0
  f.mode = 'down'
  f.fx.push({ kind: 'down', x: s.x, y: s.y, t0: f.t })
}

/** De la cât vin resursele spre navă: baza (Magnetul se va adăuga la ea) × Colectarea. */
export function pullReach(f: FlightState): number {
  const base = FLIGHT.drops.reach
  return base * (1 + WORKSHOP.reach.reach * f.ups.reach)
}

/** Resursele: cele de aproape vin spre navă și se culeg, celelalte coboară și ies pe jos. */
export function updateDrops(f: FlightState): void {
  const s = f.ship, d = FLIGHT.drops, reach = pullReach(f), live = f.mode === 'flying'
  const bottom = FLIGHT.field.h + d.gone
  f.drops = f.drops.filter((p) => {
    const dx = s.x - p.x, dy = s.y - p.y, dist = Math.hypot(dx, dy)
    if (live && dist < d.collect) {
      if (p.kind === 'crystal') f.crystal += 1; else f.metal += 1
      return false
    }
    if (live && dist < reach) { p.x += (dx / dist) * d.pull * DT; p.y += (dy / dist) * d.pull * DT }
    else p.y += d.fall * DT
    return p.y <= bottom
  })
}
