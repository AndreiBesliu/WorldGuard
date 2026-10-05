// Traseul cu capete fixe, care se lungește prin OCOLURI.
//
// Între intrare și bază există mereu un drum continuu. O bucată nu se lipește la capăt: înlocuiește o
// porțiune scurtă de drum (de la `a` la `b`) cu un ocol mai lung, ca și cum ai trage de o sfoară.
// Drumul se lungește, capetele nu se mișcă, iar puzzle-ul devine „cât drum încape între două puncte
// fixe, și pe unde”.
//
//   înainte:  … a  m  b …            (porțiunea scoasă = hexagoanele dintre a și b, aici una: m)
//   după:     … a  h1 h2 h3  b …      (ocolul are cu `extra` hexagoane mai mult decât porțiunea scoasă)
//
// De ce înlocuire și nu inserare pură între doi vecini: pe un drum drept, orice ocol de 2+ hexagoane
// inserat între doi vecini ar atinge inevitabil drumul de lângă el. Scoțând porțiunea din mijloc,
// ocolul are loc să se ducă în lateral — și regula de mai jos se poate păstra strictă.
//
// Regula de lizibilitate: drumul NU are voie să se atingă singur. Două hexagoane de drum care nu sunt
// consecutive nu pot fi vecine — altfel, pe ecran, arată ca o scurtătură pe care inamicii nu o iau.

import { INSERARE, TERRAIN } from '../data/terrain'
import { areNeighbors, equals, key, neighbors, type Hex } from './hex'
import type { GameMap } from './map'
import { fail, ok, type Result } from './result'

export function isValidPath(map: GameMap, path: readonly Hex[]): Result<true> {
  const first = path[0]
  const last = path[path.length - 1]
  if (!first || !last) return fail('traseul e gol')
  if (!equals(first, map.spawn)) return fail('traseul nu pornește din intrare')
  if (!equals(last, map.base)) return fail('traseul nu se termină în bază')
  const index = new Map<string, number>()
  for (let i = 0; i < path.length; i++) {
    const h = path[i] as Hex
    const t = map.terrain.get(key(h))
    if (t === undefined) return fail(`hexagonul ${key(h)} e în afara hărții`)
    if (!TERRAIN[t].permiteTraseu) return fail(`pe ${TERRAIN[t].nume.toLowerCase()} nu se poate construi drum (${key(h)})`)
    if (index.has(key(h))) return fail(`traseul trece de două ori prin ${key(h)}`)
    index.set(key(h), i)
    const next = path[i + 1]
    if (next && !areNeighbors(h, next)) return fail(`${key(h)} și ${key(next)} nu sunt vecine`)
  }
  for (let i = 0; i < path.length; i++) {
    for (const n of neighbors(path[i] as Hex)) {
      const j = index.get(key(n))
      if (j !== undefined && Math.abs(i - j) > 1) return fail(`drumul se atinge singur între ${key(path[i] as Hex)} și ${key(n)}`)
    }
  }
  return ok(true)
}

/** Porțiunea [start, start + span + 1] trebuie să existe: a = path[start], b = path[start + span + 1]. */
function ends(path: readonly Hex[], start: number, span: number): { a: Hex; b: Hex } | undefined {
  const a = path[start]
  const b = path[start + span + 1]
  if (!a || !b || span < 0) return undefined
  return { a, b }
}

/** Drumul care rămâne după ce scoatem porțiunea dintre a și b (fără capete). */
function remainingKeys(path: readonly Hex[], start: number, span: number): Set<string> {
  const out = new Set<string>()
  path.forEach((h, i) => {
    if (i <= start || i > start + span) out.add(key(h))
  })
  return out
}

/** De ce nu poate intra hexagonul în ocolul dintre a și b? `undefined` = poate. */
function whyNotHost(map: GameMap, h: Hex, kept: ReadonlySet<string>, a: Hex, b: Hex): string | undefined {
  const t = map.terrain.get(key(h))
  if (t === undefined) return `${key(h)} e în afara hărții`
  if (!TERRAIN[t].permiteTraseu) return `pe ${TERRAIN[t].nume.toLowerCase()} nu se poate construi drum`
  if (kept.has(key(h))) return `${key(h)} e deja pe traseu`
  for (const n of neighbors(h)) {
    if (kept.has(key(n)) && !equals(n, a) && !equals(n, b)) return `drumul s-ar atinge singur lângă ${key(n)}`
  }
  return undefined
}

/**
 * Toate ocolurile posibile care înlocuiesc cele `span` hexagoane de după path[start] cu
 * `span + extra` hexagoane noi. Ordinea rezultatelor e deterministă.
 */
export function detourOptions(
  map: GameMap,
  path: readonly Hex[],
  start: number,
  span: number,
  extra: number,
): Hex[][] {
  const e = ends(path, start, span)
  if (!e || extra < INSERARE.minim || extra > INSERARE.maxim) return []
  const { a, b } = e
  const kept = remainingKeys(path, start, span)
  const length = span + extra
  const options: Hex[][] = []
  const current: Hex[] = []
  const used = new Set<string>()

  const walk = (from: Hex): void => {
    if (current.length === length) {
      if (areNeighbors(from, b)) options.push([...current])
      return
    }
    for (const n of neighbors(from)) {
      if (used.has(key(n))) continue
      if (whyNotHost(map, n, kept, a, b) !== undefined) continue
      // Un hexagon din mijlocul ocolului nu poate fi vecin cu b (ar scurtcircuita ocolul).
      if (current.length + 1 < length && areNeighbors(n, b)) continue
      // …nici un hexagon de după primul nu poate fi vecin cu a…
      if (current.length > 0 && areNeighbors(n, a)) continue
      // …și nici cu hexagoanele anterioare ale ocolului, în afară de cel dinainte.
      if (current.slice(0, -1).some((c) => areNeighbors(c, n))) continue
      used.add(key(n))
      current.push(n)
      walk(n)
      current.pop()
      used.delete(key(n))
    }
  }
  walk(a)
  return options
}

/** Înlocuiește porțiunea dintre path[start] și path[start + span + 1] cu ocolul `hexes`. */
export function insertDetour(
  map: GameMap,
  path: readonly Hex[],
  start: number,
  span: number,
  hexes: readonly Hex[],
): Result<Hex[]> {
  const e = ends(path, start, span)
  if (!e) return fail(`porțiunea care începe la ${start} cu ${span} hexagoane nu există`)
  const { a, b } = e
  const extra = hexes.length - span
  if (extra < INSERARE.minim || extra > INSERARE.maxim) {
    return fail(`o bucată lungește drumul cu ${INSERARE.minim}–${INSERARE.maxim} hexagoane, nu cu ${extra}`)
  }
  const kept = remainingKeys(path, start, span)
  const fresh = new Set<string>()
  let prev = a
  for (const [i, h] of hexes.entries()) {
    const why = whyNotHost(map, h, kept, a, b)
    if (why) return fail(why)
    if (fresh.has(key(h))) return fail(`ocolul trece de două ori prin ${key(h)}`)
    if (!areNeighbors(prev, h)) return fail(`${key(prev)} și ${key(h)} nu sunt vecine`)
    if (i < hexes.length - 1 && areNeighbors(h, b)) return fail(`ocolul se atinge singur lângă ${key(b)}`)
    if (i > 0 && areNeighbors(h, a)) return fail(`ocolul se atinge singur lângă ${key(a)}`)
    if (hexes.slice(0, Math.max(0, i - 1)).some((c) => areNeighbors(c, h))) return fail(`ocolul se atinge singur la ${key(h)}`)
    fresh.add(key(h))
    prev = h
  }
  if (!areNeighbors(prev, b)) return fail(`ocolul nu se întoarce în drum la ${key(b)}`)
  return ok([...path.slice(0, start + 1), ...hexes, ...path.slice(start + span + 1)])
}

export interface DetourOption {
  readonly start: number
  readonly span: number
  readonly hexes: readonly Hex[]
}

/**
 * Toate ocolurile de +`extra` care înlocuiesc o porțiune ce conține hexagonul path[index].
 * Porțiunile încearcă lungimi de la 1 la INSERARE.portiuneMaxima; capetele fixe nu se înlocuiesc.
 * Ordinea e deterministă: porțiune mai scurtă întâi, apoi start crescător, apoi ordinea căutării.
 */
export function optionsAround(map: GameMap, path: readonly Hex[], index: number, extra: number): DetourOption[] {
  const out: DetourOption[] = []
  if (index <= 0 || index >= path.length - 1) return out
  for (let span = 1; span <= INSERARE.portiuneMaxima; span++) {
    for (let start = index - span; start <= index - 1; start++) {
      if (start < 0 || start + span + 1 > path.length - 1) continue
      for (const hexes of detourOptions(map, path, start, span, extra)) out.push({ start, span, hexes })
    }
  }
  return out
}
