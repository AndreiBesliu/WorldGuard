// Recordul (secunde) și partida întreruptă în localStorage. Orice lipsă sau eroare de stocare înseamnă „fără record”
// și „fără reluare”, nu o oprire a jocului.
import { emptyProfile, packProfile, unpackProfile, type Profile } from './profile'
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

export const PROFILE_KEY = 'wg.v1.profile'

const copyProfile = (p: Profile): Profile => ({ ...p, ups: { ...p.ups } })

/**
 * Ultimul profil scris, ținut și în memorie cât e pagina deschisă, cu stocarea în care s-a scris și dacă a ajuns acolo (`ahead`:
 * nu a ajuns, deci memoria e mai nouă decât stocarea). Cu stocarea refuzată, bucla zbor → rezervă → atelier merge așa măcar o ședință.
 */
let kept: { store: Store | null; p: Profile; ahead: boolean } | null = null

/**
 * Profilul jucătorului (rezerva și atelierul). Stocarea e adevărul când se poate citi și ultima scriere a ajuns în ea (așa se vede
 * și ce a scris altă filă); altfel, ultimul profil scris, din memorie. Lipsă sau stricat dau profil gol; unul stricat nu se șterge:
 * următoarea salvare îl înlocuiește.
 */
export function loadProfile(store?: Store | null): Profile {
  const s = store === undefined ? pageStore() : store
  const mine = kept !== null && kept.store === s ? kept : null
  if (mine !== null && (mine.ahead || s === null)) return copyProfile(mine.p)
  try {
    if (s === null) return emptyProfile()
    const r = unpackProfile(s.getItem(PROFILE_KEY))
    return r.ok ? r.value : emptyProfile()
  } catch { return mine !== null ? copyProfile(mine.p) : emptyProfile() }
}

export function saveProfile(p: Profile, store?: Store | null): void {
  const s = store === undefined ? pageStore() : store
  let ahead = true
  try {
    if (s !== null) { s.setItem(PROFILE_KEY, packProfile(p)); ahead = false }
  } catch { /* fără păstrare în stocare: rămâne în memorie, iar jocul merge */ }
  kept = { store: s, p: copyProfile(p), ahead }
}
