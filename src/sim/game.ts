// Starea unei partide, timpul simulării și JURNALUL DECIZIILOR.
//
// Fiecare acțiune a jucătorului intră în jurnal ca o Decizie serializabilă, cu tick-ul la care a
// fost luată. Starea se poate reconstrui oricând din (seed, jurnal) — și trebuie să iasă identic.
// Pe asta stau, mai târziu:
//   - meta-progresia (favoarea zeilor, cronica: „ce a făcut jucătorul”),
//   - verificarea pe server a partidelor (se rejoacă seed + jurnal),
//   - datele de playtest (ce combinații câștigă).
// Regula: nicio schimbare de stare în afara lui `applyDecision` și `step`.
//
// Timpul: simularea avansează doar în timpul unui val, câte un tick (TICK_MS) pe rând. Între valuri
// timpul stă pe loc: acolo jucătorul modelează drumul și (mai târziu) alege din draft.

import { ENEMIES, WAVES, type EnemyType } from '../data/enemies'
import { MILI_HEX, VIETI_BAZA } from '../data/joc'
import { fromKey, key, type Hex } from './hex'
import { generateMap, type GameMap } from './map'
import { insertDetour } from './path'
import { fail, ok, type Result } from './result'

export type Decision =
  | {
      readonly tip: 'ocol'
      /** Ocolul pornește din path[start]… */
      readonly start: number
      /** …și înlocuiește cele `span` hexagoane de după el (se întoarce în drum la path[start + span + 1]). */
      readonly span: number
      /** Hexagoanele ocolului, ca chei „q,r”, în ordinea drumului. */
      readonly hexuri: readonly string[]
    }
  | { readonly tip: 'pornesteVal' }

/** O decizie, cu tick-ul la care a fost luată. */
export interface LoggedDecision {
  readonly la: number
  readonly d: Decision
}

export type Phase = 'pregatire' | 'val' | 'castigat' | 'pierdut'

export interface Enemy {
  readonly id: number
  readonly tip: EnemyType
  readonly viata: number
  /** Cât a parcurs pe drum, în mili-hexagoane de la intrare. */
  readonly progres: number
}

export interface Spawn {
  readonly tick: number
  readonly tip: EnemyType
}

export interface GameState {
  readonly seed: number
  readonly map: GameMap
  readonly path: readonly Hex[]
  readonly jurnal: readonly LoggedDecision[]
  readonly tick: number
  readonly faza: Phase
  /** Indicele valului curent (în faza „val”) sau al următorului (în „pregătire”). */
  readonly val: number
  readonly vieti: number
  readonly inamici: readonly Enemy[]
  /** Inamicii care urmează să apară în valul curent, în ordinea tick-ului. */
  readonly deGenerat: readonly Spawn[]
  readonly urmatorulId: number
}

export function newGame(seed: number): GameState {
  const { map, path } = generateMap(seed)
  return {
    seed,
    map,
    path,
    jurnal: [],
    tick: 0,
    faza: 'pregatire',
    val: 0,
    vieti: VIETI_BAZA,
    inamici: [],
    deGenerat: [],
    urmatorulId: 1,
  }
}

/** Cât de lung e drumul, în unitățile simulării. Un inamic ajunge la bază când îl parcurge. */
export const pathLength = (s: GameState): number => (s.path.length - 1) * MILI_HEX

/** Programul de apariție al unui val, pornit la `startTick`. Ordine stabilă: tick, apoi ordinea grupurilor. */
export function spawnSchedule(valIndex: number, startTick: number): Spawn[] {
  const wave = WAVES[valIndex]
  if (!wave) return []
  const out: { tick: number; tip: EnemyType; ordine: number }[] = []
  let ordine = 0
  for (const grp of wave.grupuri) {
    for (let k = 0; k < grp.numar; k++) {
      out.push({ tick: startTick + 1 + grp.intarziere + k * grp.interval, tip: grp.tip, ordine: ordine++ })
    }
  }
  out.sort((a, b) => a.tick - b.tick || a.ordine - b.ordine)
  return out.map(({ tick, tip }) => ({ tick, tip }))
}

export function applyDecision(state: GameState, d: Decision): Result<GameState> {
  const logged = (next: GameState): GameState => ({ ...next, jurnal: [...state.jurnal, { la: state.tick, d }] })
  switch (d.tip) {
    case 'ocol': {
      if (state.faza !== 'pregatire') return fail('drumul se modelează doar între valuri')
      const r = insertDetour(state.map, state.path, d.start, d.span, d.hexuri.map(fromKey))
      if (!r.ok) return fail(r.reason)
      return ok(logged({ ...state, path: r.value }))
    }
    case 'pornesteVal': {
      if (state.faza !== 'pregatire') return fail('un val e deja în desfășurare sau partida s-a încheiat')
      if (!WAVES[state.val]) return fail('nu mai există valuri')
      return ok(logged({ ...state, faza: 'val', deGenerat: spawnSchedule(state.val, state.tick) }))
    }
  }
}

/** Un pas de simulare. În afara unui val, starea rămâne neschimbată (timpul stă pe loc). */
export function step(state: GameState): GameState {
  if (state.faza !== 'val') return state
  const tick = state.tick + 1
  const end = pathLength(state)
  const valIndex = state.val
  const multiplier = WAVES[valIndex]?.viata ?? 1

  // 1. Inamicii existenți merg înainte; cei care ajung la bază îi iau vieți.
  let vieti = state.vieti
  const inamici: Enemy[] = []
  for (const e of state.inamici) {
    const progres = e.progres + ENEMIES[e.tip].viteza
    if (progres >= end) vieti -= ENEMIES[e.tip].dauna
    else inamici.push({ ...e, progres })
  }

  // 2. Apar inamicii programați pentru tick-ul ăsta (pornesc de la intrare, se mișcă de la tick-ul următor).
  let i = 0
  let urmatorulId = state.urmatorulId
  while (i < state.deGenerat.length && (state.deGenerat[i] as Spawn).tick <= tick) {
    const sp = state.deGenerat[i] as Spawn
    inamici.push({ id: urmatorulId++, tip: sp.tip, viata: Math.round(ENEMIES[sp.tip].viata * multiplier), progres: 0 })
    i++
  }
  const deGenerat = state.deGenerat.slice(i)

  // 3. Sfârșitul valului sau al partidei.
  if (vieti <= 0) {
    return { ...state, tick, vieti: 0, inamici, deGenerat, urmatorulId, faza: 'pierdut' }
  }
  if (deGenerat.length === 0 && inamici.length === 0) {
    const val = valIndex + 1
    return { ...state, tick, vieti, inamici, deGenerat, urmatorulId, val, faza: val >= WAVES.length ? 'castigat' : 'pregatire' }
  }
  return { ...state, tick, vieti, inamici, deGenerat, urmatorulId }
}

/**
 * Reconstruiește starea din seed și jurnal: rulează simularea până la tick-ul fiecărei decizii, o aplică,
 * apoi continuă până la `panaLaTick` (dacă e dat). Aruncă eroare dacă o decizie nu mai e validă.
 */
export function replay(seed: number, jurnal: readonly LoggedDecision[], panaLaTick?: number): GameState {
  let state = newGame(seed)
  const advanceTo = (target: number): void => {
    while (state.tick < target) {
      const next = step(state)
      if (next.tick === state.tick) throw new Error(`timpul nu mai avansează la tick-ul ${state.tick} (faza: ${state.faza})`)
      state = next
    }
  }
  for (const [i, { la, d }] of jurnal.entries()) {
    advanceTo(la)
    const r = applyDecision(state, d)
    if (!r.ok) throw new Error(`decizia ${i} nu se mai poate aplica: ${r.reason}`)
    state = r.value
  }
  if (panaLaTick !== undefined) advanceTo(panaLaTick)
  return state
}

/** Amprentă stabilă a stării — aceeași stare dă mereu același șir, pe orice mașină. */
export function fingerprint(state: GameState): string {
  const parts: string[] = [`seed=${state.seed}`, `tick=${state.tick}`, `faza=${state.faza}`, `val=${state.val}`, `vieti=${state.vieti}`]
  for (const [k, t] of state.map.terrain) parts.push(`${k}:${t}`)
  parts.push(`path=${state.path.map(key).join(';')}`)
  parts.push(`inamici=${state.inamici.map((e) => `${e.id}/${e.tip}/${e.viata}/${e.progres}`).join(';')}`)
  parts.push(`deGenerat=${state.deGenerat.length}`)
  let h = 0x811c9dc5
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
