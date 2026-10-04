// Starea unei partide și JURNALUL DECIZIILOR.
//
// Fiecare acțiune a jucătorului intră în jurnal ca o Decizie serializabilă. Starea se poate reconstrui
// oricând din (seed, jurnal) — și trebuie să iasă identic. Pe asta stau, mai târziu:
//   - meta-progresia (favoarea zeilor, cronica: „ce a făcut jucătorul”),
//   - verificarea pe server a partidelor (se rejoacă seed + jurnal),
//   - datele de playtest (ce combinații câștigă).
// Regula: nicio schimbare de stare în afara lui `applyDecision`.

import { fromKey, key, type Hex } from './hex'
import { generateMap, type GameMap } from './map'
import { insertDetour } from './path'
import { fail, ok, type Result } from './result'

export type Decision = {
  readonly tip: 'ocol'
  /** Ocolul pornește din path[start]… */
  readonly start: number
  /** …și înlocuiește cele `span` hexagoane de după el (se întoarce în drum la path[start + span + 1]). */
  readonly span: number
  /** Hexagoanele ocolului, ca chei „q,r”, în ordinea drumului. */
  readonly hexuri: readonly string[]
}

export interface GameState {
  readonly seed: number
  readonly map: GameMap
  readonly path: readonly Hex[]
  readonly jurnal: readonly Decision[]
}

export function newGame(seed: number): GameState {
  const { map, path } = generateMap(seed)
  return { seed, map, path, jurnal: [] }
}

export function applyDecision(state: GameState, d: Decision): Result<GameState> {
  switch (d.tip) {
    case 'ocol': {
      const r = insertDetour(state.map, state.path, d.start, d.span, d.hexuri.map(fromKey))
      if (!r.ok) return fail(r.reason)
      return ok({ ...state, path: r.value, jurnal: [...state.jurnal, d] })
    }
  }
}

/** Reconstruiește starea din seed și jurnal. Aruncă eroare dacă o decizie nu mai e validă. */
export function replay(seed: number, jurnal: readonly Decision[]): GameState {
  let state = newGame(seed)
  for (const [i, d] of jurnal.entries()) {
    const r = applyDecision(state, d)
    if (!r.ok) throw new Error(`decizia ${i} nu se mai poate aplica: ${r.reason}`)
    state = r.value
  }
  return state
}

/** Amprentă stabilă a stării — aceeași stare dă mereu același șir, pe orice mașină. */
export function fingerprint(state: GameState): string {
  const parts: string[] = [`seed=${state.seed}`]
  for (const [k, t] of state.map.terrain) parts.push(`${k}:${t}`)
  parts.push(`path=${state.path.map(key).join(';')}`)
  let h = 0x811c9dc5
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
