// Coordonate axiale pe o grilă de hexagoane „pointy-top”.
// Referința folosită peste tot: https://www.redblobgames.com/grids/hexagons/

export interface Hex {
  readonly q: number
  readonly r: number
}

export const hex = (q: number, r: number): Hex => ({ q, r })

/** Cheie stabilă, folosită în Map/Set și în jurnalul de decizii. */
export const key = (h: Hex): string => `${h.q},${h.r}`

export function fromKey(k: string): Hex {
  const [q, r] = k.split(',').map(Number)
  if (q === undefined || r === undefined || Number.isNaN(q) || Number.isNaN(r)) {
    throw new Error(`cheie de hexagon invalidă: ${k}`)
  }
  return { q, r }
}

export const equals = (a: Hex, b: Hex): boolean => a.q === b.q && a.r === b.r

/** Cele 6 direcții, într-o ordine fixă — ordinea contează pentru determinism. */
export const DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export const add = (a: Hex, b: Hex): Hex => ({ q: a.q + b.q, r: a.r + b.r })

export const neighbors = (h: Hex): Hex[] => DIRECTIONS.map((d) => add(h, d))

export function distance(a: Hex, b: Hex): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

export const areNeighbors = (a: Hex, b: Hex): boolean => distance(a, b) === 1

/** Toate hexagoanele la distanță ≤ radius de centru, în ordine fixă (q crescător, apoi r). */
export function hexesInRadius(radius: number): Hex[] {
  const out: Hex[] = []
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius)
    const rMax = Math.min(radius, -q + radius)
    for (let r = rMin; r <= rMax; r++) out.push({ q, r })
  }
  return out
}

function roundCube(x: number, y: number, z: number): Hex {
  let rx = Math.round(x)
  let ry = Math.round(y)
  let rz = Math.round(z)
  const dx = Math.abs(rx - x)
  const dy = Math.abs(ry - y)
  const dz = Math.abs(rz - z)
  if (dx > dy && dx > dz) rx = -ry - rz
  else if (dy > dz) ry = -rx - rz
  else rz = -rx - ry
  // −0 → 0, ca cheile să fie identice („0,0” și nu „-0,0”).
  return { q: rx + 0, r: rz + 0 }
}

/** Linia de hexagoane între a și b, inclusiv capetele; fiecare pas e un vecin. */
export function lineBetween(a: Hex, b: Hex): Hex[] {
  const n = distance(a, b)
  if (n === 0) return [a]
  // Deplasare minusculă, ca rotunjirea să nu cadă exact pe muchii (rezultat stabil).
  const ax = a.q + 1e-6
  const az = a.r + 1e-6
  const ay = -ax - az
  const bx = b.q + 1e-6
  const bz = b.r + 1e-6
  const by = -bx - bz
  const out: Hex[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    out.push(roundCube(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t))
  }
  return out
}
