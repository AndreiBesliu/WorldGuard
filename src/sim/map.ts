// Generarea hărții: o funcție pură de (seed, rază). Același seed dă mereu aceeași hartă.
//
// Terenul e separat de traseu, intenționat: în design, terenul unei regiuni PERSISTĂ între partide
// (cicatrici, canale, păduri arse), iar traseul și turnurile se reiau de la zero la fiecare partidă.

import { MAP_GEN, TERRAIN, type Terrain } from '../data/terrain'
import { distance, hexesInRadius, key, lineBetween, neighbors, type Hex } from './hex'
import { createRng } from './rng'

export interface GameMap {
  readonly seed: number
  readonly radius: number
  /** Terenul fiecărui hexagon. Ordinea de inserare e cea din hexesInRadius — fixă. */
  readonly terrain: ReadonlyMap<string, Terrain>
  /** Intrarea inamicilor — fixă. */
  readonly spawn: Hex
  /** Baza apărată — fixă. */
  readonly base: Hex
}

export function terrainAt(map: GameMap, h: Hex): Terrain | undefined {
  return map.terrain.get(key(h))
}

/** Zgomot valoric netezit și normalizat la [0, 1]: pete coerente, nu pixeli aleatori. */
function smoothField(cells: readonly Hex[], seed: number, stream: string, passes: number): Map<string, number> {
  const rng = createRng(seed, stream)
  let field = new Map<string, number>()
  for (const h of cells) field.set(key(h), rng.next())
  for (let p = 0; p < passes; p++) {
    const next = new Map<string, number>()
    for (const h of cells) {
      let sum = field.get(key(h)) ?? 0
      let count = 1
      for (const n of neighbors(h)) {
        const v = field.get(key(n))
        if (v !== undefined) {
          sum += v
          count++
        }
      }
      next.set(key(h), sum / count)
    }
    field = next
  }
  let min = Infinity
  let max = -Infinity
  for (const v of field.values()) {
    min = Math.min(min, v)
    max = Math.max(max, v)
  }
  const span = max - min || 1
  for (const [k, v] of field) field.set(k, (v - min) / span)
  return field
}

export interface GeneratedMap {
  readonly map: GameMap
  /** Traseul inițial: drumul drept dintre intrare și bază. */
  readonly path: readonly Hex[]
}

/**
 * Bălțile de ulei (decis de owner, 05.10.2026: uleiul se găsește pe hartă). Fiecare baltă pornește dintr-un
 * hexagon de câmpie sau pădure aflat la exact `departareBalta` de drumul inițial și crește în vecini, la cel
 * puțin aceeași distanță — deci la început nimic nu e uns, iar un ocol spre baltă o aduce lângă drum.
 * Fluxul aleator e al lor („harta/ulei”), deci restul hărții rămâne același cu sau fără ele.
 */
function placeOil(cells: readonly Hex[], terrain: Map<string, Terrain>, path: readonly Hex[], seed: number): void {
  const rng = createRng(seed, 'harta/ulei')
  const fromPath = (h: Hex): number => Math.min(...path.map((p) => distance(h, p)))
  const free = (h: Hex): boolean => {
    const t = terrain.get(key(h))
    return (t === 'campie' || t === 'padure') && fromPath(h) >= MAP_GEN.departareBalta
  }
  let centers = cells.filter((h) => free(h) && fromPath(h) === MAP_GEN.departareBalta)
  for (let b = 0; b < MAP_GEN.balti && centers.length > 0; b++) {
    const center = rng.pick(centers)
    const pool = [center]
    terrain.set(key(center), 'ulei')
    while (pool.length < MAP_GEN.marimeBalta) {
      // Vecinii liberi ai bălții, fiecare o dată, în ordinea fixă a hexagoanelor din baltă și a vecinilor lor.
      const seen = new Set<string>()
      const edge: Hex[] = []
      for (const h of pool) {
        for (const n of neighbors(h)) {
          const k = key(n)
          if (!seen.has(k) && free(n)) {
            seen.add(k)
            edge.push(n)
          }
        }
      }
      if (edge.length === 0) break
      const next = rng.pick(edge)
      pool.push(next)
      terrain.set(key(next), 'ulei')
    }
    centers = centers.filter((h) => distance(h, center) >= MAP_GEN.intreBalti && free(h))
  }
}

export function generateMap(seed: number, radius: number = MAP_GEN.raza): GeneratedMap {
  const cells = hexesInRadius(radius)
  const umiditate = smoothField(cells, seed, 'harta/umiditate', MAP_GEN.netezire)
  const inaltime = smoothField(cells, seed, 'harta/inaltime', MAP_GEN.netezire)
  const filoane = createRng(seed, 'harta/filoane')

  const terrain = new Map<string, Terrain>()
  for (const h of cells) {
    const k = key(h)
    const u = umiditate.get(k) ?? 0
    const i = inaltime.get(k) ?? 0
    let t: Terrain = 'campie'
    if (u > MAP_GEN.pragApa) t = 'apa'
    else if (i > MAP_GEN.pragDeal) t = 'deal'
    else if (u > MAP_GEN.pragPadure) t = 'padure'
    // Tragerea se face pentru FIECARE hexagon, indiferent de teren, ca fluxul să nu depindă de praguri.
    if (filoane.next() < MAP_GEN.sansaFilon && (t === 'campie' || t === 'deal')) t = 'filon'
    terrain.set(k, t)
  }

  // Capetele sunt fixe: cel mai din stânga și cel mai din dreapta hexagon de pe rândul din mijloc.
  const spawn: Hex = { q: -radius, r: 0 }
  const base: Hex = { q: radius, r: 0 }
  const path = lineBetween(spawn, base)
  // Drumul inițial trebuie să fie legal: hexagoanele lui devin câmpie dacă terenul nu permite traseu.
  for (const h of path) {
    const t = terrain.get(key(h))
    if (t === undefined || !TERRAIN[t].permiteTraseu) terrain.set(key(h), 'campie')
  }

  placeOil(cells, terrain, path, seed)

  return { map: { seed, radius, terrain, spawn, base }, path }
}
