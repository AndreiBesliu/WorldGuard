// Aleatoriu determinist, pe FLUXURI NUMITE.
//
// De ce fluxuri: dacă generarea hărții și valurile ar trage din același generator, o tragere în plus
// într-un loc ar muta tot ce urmează în celălalt — iar un replay vechi nu s-ar mai reproduce.
// Fiecare sistem își cere fluxul lui: rng(seed, 'harta'), rng(seed, 'valuri'), rng(seed, 'draft').

export interface Rng {
  /** Număr în [0, 1). */
  next(): number
  /** Întreg în [0, n). */
  int(n: number): number
  /** Un element din listă (lista nu poate fi goală). */
  pick<T>(items: readonly T[]): T
}

/** FNV-1a pe 32 de biți — transformă numele fluxului într-un număr. */
function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function createRng(seed: number, stream: string): Rng {
  // mulberry32: mic, rapid, suficient pentru joc (nu pentru criptografie).
  let state = (Math.imul(seed >>> 0, 0x9e3779b1) ^ hashString(stream)) >>> 0
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (items) => {
      if (items.length === 0) throw new Error('pick() pe o listă goală')
      return items[Math.floor(next() * items.length)] as (typeof items)[number]
    },
  }
}
