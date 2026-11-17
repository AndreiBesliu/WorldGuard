/** Semnele din adresă: ?seed=N fixează sămânța primei partide, ?debug=1 pune `window.__wg`. */
export function parseFlags(search: string): { seed: number | null; debug: boolean } {
  const q = new URLSearchParams(search)
  const raw = q.get('seed')
  const n = raw !== null && /^\d+$/.test(raw) ? Number(raw) : NaN
  return { seed: Number.isSafeInteger(n) ? n >>> 0 : null, debug: q.get('debug') === '1' }
}
