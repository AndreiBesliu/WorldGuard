// Lucrurile de cules: ce lasă un transport doborât (un modul sau o reparație), cum coboară și cum se pun pe navă.
// Nu vin spre navă, nici cu Magnetul: nava trebuie să zboare peste ele.
import { FLIGHT, FLIGHT_MODS, type FlightModId } from '../data/flight'
import { createRng } from '../sim/rng'
import { DT, type FlightFoe, type FlightState } from './state'

/**
 * Pune pe navă ce s-a cules. Un modul nou intră la treapta 1 (Scutul, încărcat), unul pe care nava îl are urcă o treaptă,
 * iar unul deja la treapta 3 dă cristale. Reparația dă o viață, fără să treacă de maxim; la viață plină nu schimbă nimic.
 */
export function take(f: FlightState, kind: FlightModId | 'repair'): void {
  const s = f.ship
  if (kind === 'repair') {
    if (s.hp >= s.maxHp) return
    s.hp += 1
    f.fx.push({ kind: 'took', what: 'repair', tier: 0, maxed: false, t0: f.t })
    return
  }
  if (s.mods[kind] >= FLIGHT.mods.tiers) {
    f.crystal += FLIGHT.mods.maxed
    f.fx.push({ kind: 'took', what: kind, tier: FLIGHT.mods.tiers, maxed: true, t0: f.t })
    return
  }
  const tier = ++s.mods[kind]
  if (kind === 'shield' && tier === 1) { s.shieldUp = true; s.shieldT = 0 }
  f.fx.push({ kind: 'took', what: kind, tier, maxed: false, t0: f.t })
}

/**
 * Ce lasă transportul doborât: cu nava lovită, uneori o reparație; altfel un modul, de cele mai multe ori unul pe care nava
 * nu îl are. Cu toate modulele la treapta 3, oricare dintre ele (cules, dă cristale). Hazardul vine din fluxul transportului.
 */
function pickKind(f: FlightState, foe: FlightFoe): FlightModId | 'repair' {
  const s = f.ship, p = FLIGHT.picks, rng = createRng(f.seed, `zbor-modul-${foe.id}`)
  if (s.hp < s.maxHp && rng.next() < (s.hp <= p.low ? p.repairLow : p.repair)) return 'repair'
  const open = FLIGHT_MODS.filter((id) => s.mods[id] < FLIGHT.mods.tiers)
  const fresh = open.filter((id) => s.mods[id] === 0)
  const from = fresh.length > 0 && rng.next() < p.fresh ? fresh : open.length > 0 ? open : FLIGHT_MODS
  return from[Math.floor(rng.next() * from.length)]!
}

/** Transportul doborât lasă exact un lucru de cules, în locul lui. */
export function dropPick(f: FlightState, foe: FlightFoe): void {
  f.picks.push({ kind: pickKind(f, foe), x: foe.x, y: foe.y })
}

/** Lucrurile de cules coboară; unul atins de navă se pune pe ea, unul ieșit pe jos se pierde. */
export function updatePicks(f: FlightState): void {
  if (f.picks.length === 0) return
  const s = f.ship, p = FLIGHT.picks, live = f.mode === 'flying', bottom = FLIGHT.field.h + p.gone
  f.picks = f.picks.filter((k) => {
    k.y += p.fall * DT
    if (live && Math.hypot(k.x - s.x, k.y - s.y) < p.take) { take(f, k.kind); return false }
    return k.y <= bottom
  })
}
