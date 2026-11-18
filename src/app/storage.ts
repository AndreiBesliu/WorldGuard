// Recordul (secunde) și partida întreruptă în localStorage. Orice lipsă sau eroare de stocare înseamnă „fără record”
// și „fără reluare”, nu o oprire a jocului.
import { packSave, unpackSave } from './save'
import type { GameState } from '../sim/state'

export const RECORD_KEY = 'wg.v1.record'
export const SAVE_KEY = 'wg.v1.save'

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

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
  if (!Number.isFinite(secs)) return { record: old, isNew: false }
  if (secs <= old) return { record: old, isNew: false }
  try { s?.setItem(RECORD_KEY, String(secs)) } catch { /* stocare plină sau blocată: jocul merge mai departe */ }
  return { record: secs, isNew: true }
}

/** Păstrează partida pentru reluare; o stocare plină sau blocată nu oprește jocul. */
export function saveGame(g: GameState, store?: Store | null): void {
  try { (store === undefined ? pageStore() : store)?.setItem(SAVE_KEY, packSave(g)) } catch { /* fără reluare, dar jocul merge */ }
}

/** Partida salvată, dacă există și e bună; una respinsă (stricată, altă versiune) se șterge. */
export function loadGame(store?: Store | null): GameState | null {
  try {
    const s = store === undefined ? pageStore() : store
    const raw = s?.getItem(SAVE_KEY)
    if (raw === null || raw === undefined) return null
    const r = unpackSave(raw)
    if (r.ok) return r.value
    clearGame(s)
    return null
  } catch { return null }
}

/** Scoate partida salvată (recordul rămâne). */
export function clearGame(store?: Store | null): void {
  try { (store === undefined ? pageStore() : store)?.removeItem(SAVE_KEY) } catch { /* nimic de scos sau stocare blocată */ }
}
