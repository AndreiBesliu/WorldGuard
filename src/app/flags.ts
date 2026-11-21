/** Semnele din adresă: ?seed=N fixează sămânța primei partide, ?debug=1 pune `window.__wg`, iar ?zbor=N (doar cu ?debug=1)
 *  pornește direct un zbor în sectorul N. */
export function parseFlags(search: string): { seed: number | null; debug: boolean; zbor: number | null } {
  const q = new URLSearchParams(search)
  const whole = (raw: string | null): number | null => {
    const n = raw !== null && /^\d+$/.test(raw) ? Number(raw) : NaN
    return Number.isSafeInteger(n) ? n : null
  }
  const seed = whole(q.get('seed')), debug = q.get('debug') === '1', zbor = whole(q.get('zbor'))
  return { seed: seed === null ? null : seed >>> 0, debug, zbor: debug && zbor !== null && zbor >= 1 ? zbor : null }
}
