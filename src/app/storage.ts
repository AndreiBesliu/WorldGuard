// Recordul (secunde) în localStorage. Orice lipsă sau eroare de stocare înseamnă „fără record”, nu o oprire a jocului.
export const RECORD_KEY = 'wg.v1.record'

type Store = Pick<Storage, 'getItem' | 'setItem'>

/** Stocarea paginii; doar atingerea ei poate arunca (cookie-uri blocate), de aceea stă într-un try. */
function pageStore(): Store | null {
  try { return globalThis.localStorage ?? null } catch { return null }
}

/** Secundele recordului; 0 dacă lipsește, e stricat sau stocarea aruncă. `null` = fără stocare. */
export function readRecord(store?: Store | null): number {
  try {
    const s = store === undefined ? pageStore() : store
    const raw = s?.getItem(RECORD_KEY)
    if (!raw || !/^\d+(\.\d+)?$/.test(raw)) return 0
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch { return 0 }
}

/** Păstrează secundele dacă bat recordul. `isNew` e adevărat și când nu se poate citi nimic (record 0). */
export function saveIfRecord(secs: number, store?: Store | null): { record: number; isNew: boolean } {
  const s = store === undefined ? pageStore() : store
  const old = readRecord(s)
  if (secs <= old) return { record: old, isNew: false }
  try { s?.setItem(RECORD_KEY, String(secs)) } catch { /* stocare plină sau blocată: jocul merge mai departe */ }
  return { record: secs, isNew: true }
}
