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
// timpul stă pe loc: acolo jucătorul modelează drumul, construiește turnuri și (mai târziu) alege din draft.

import { ENEMIES, WAVES, type EnemyType } from '../data/enemies'
import { MILI_HEX, VIETI_BAZA } from '../data/joc'
import { INSERARE, TERRAIN } from '../data/terrain'
import { AUR_START, RAMBURSARE_OCOL, TARGET_MODES, TOWERS, type TargetMode, type TowerType } from '../data/towers'
import { distance, fromKey, key, type Hex } from './hex'
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
  | {
      readonly tip: 'turn'
      readonly turn: TowerType
      /** Hexagonul turnului, ca cheie „q,r”. */
      readonly hex: string
    }
  | {
      readonly tip: 'tintire'
      /** Id-ul turnului. */
      readonly turn: number
      readonly mod: TargetMode
    }

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

export interface Tower {
  readonly id: number
  readonly tip: TowerType
  /** Hexagonul turnului, ca cheie „q,r”. */
  readonly hex: string
  readonly tintire: TargetMode
  /** Câte tick-uri mai sunt până poate lovi din nou (0 = gata). */
  readonly reincarcare: number
  /** Ultima lovitură: tick-ul și pe cine a lovit. Doar desenul o folosește. */
  readonly lovitura?: { readonly tick: number; readonly tinte: readonly number[] }
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
  readonly aur: number
  readonly turnuri: readonly Tower[]
  readonly urmatorulTurn: number
  /** Câte ocoluri se pot pune într-o pregătire. Pornește de la `INSERARE.peVal`; upgrade-urile îl vor crește. */
  readonly ocoluriPeVal: number
  /** Câte ocoluri s-au pus în pregătirea curentă. Se golește când pornește valul. */
  readonly ocoluriFolosite: number
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
    aur: AUR_START,
    turnuri: [],
    urmatorulTurn: 1,
    ocoluriPeVal: INSERARE.peVal,
    ocoluriFolosite: 0,
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

/** Se poate pune un ocol acum (faza, limita pe val)? Dacă nu, de ce. Folosit și de UI. */
export function checkDetourAllowed(state: GameState): Result<true> {
  if (state.faza !== 'pregatire') return fail('drumul se modelează doar între valuri')
  if (state.ocoluriFolosite >= state.ocoluriPeVal) {
    const n = state.ocoluriPeVal
    return fail(n === 1 ? 'ocolul acestui val e deja pus — următorul vine după val' : `ai pus deja cele ${n} ocoluri ale acestui val — următoarele vin după val`)
  }
  return ok(true)
}

/**
 * Turnurile de pe hexagoanele date — cele pe care un ocol le-ar ridica. Turnurile nu blochează drumul
 * (decis de owner); ce se întâmplă cu turnul din cale e o propunere: ocolul îl ridică, iar aurul lui se dă
 * înapoi (`towerRefund`). Alternativa încă deschisă: turnul se mută.
 */
export function towersOnHexes(state: GameState, hexes: readonly Hex[]): Tower[] {
  const keys = new Set(hexes.map(key))
  return state.turnuri.filter((t) => keys.has(t.hex))
}

/** Aurul dat înapoi pentru un turn ridicat de un ocol. */
export const towerRefund = (tip: TowerType): number => Math.floor(TOWERS[tip].cost * RAMBURSARE_OCOL)

/** Se poate construi turnul `tip` pe hexagonul `hex` acum? Dacă nu, de ce. Folosit și de previzualizare. */
export function checkBuild(state: GameState, tip: TowerType, hex: string): Result<true> {
  if (state.faza !== 'pregatire') return fail('turnurile se construiesc doar între valuri')
  const t = state.map.terrain.get(hex)
  if (t === undefined) return fail(`${hex} e în afara hărții`)
  if (state.path.some((h) => key(h) === hex)) return fail('pe drum nu se construiește')
  if (!TERRAIN[t].permiteTurn) return fail(`pe ${TERRAIN[t].nume.toLowerCase()} nu se construiește`)
  if (state.turnuri.some((x) => x.hex === hex)) return fail('aici e deja un turn')
  const info = TOWERS[tip]
  if (state.aur < info.cost) return fail(`nu ajunge aurul: turnul ${info.nume} costă ${info.cost}, ai ${state.aur}`)
  return ok(true)
}

export function applyDecision(state: GameState, d: Decision): Result<GameState> {
  const logged = (next: GameState): GameState => ({ ...next, jurnal: [...state.jurnal, { la: state.tick, d }] })
  switch (d.tip) {
    case 'ocol': {
      const allowed = checkDetourAllowed(state)
      if (!allowed.ok) return fail(allowed.reason)
      const hexes = d.hexuri.map(fromKey)
      const r = insertDetour(state.map, state.path, d.start, d.span, hexes)
      if (!r.ok) return fail(r.reason)
      const ridicate = new Set(towersOnHexes(state, hexes))
      let refund = 0
      for (const t of ridicate) refund += towerRefund(t.tip)
      return ok(
        logged({
          ...state,
          path: r.value,
          ocoluriFolosite: state.ocoluriFolosite + 1,
          aur: state.aur + refund,
          turnuri: state.turnuri.filter((t) => !ridicate.has(t)),
        }),
      )
    }
    case 'pornesteVal': {
      if (state.faza !== 'pregatire') return fail('un val e deja în desfășurare sau partida s-a încheiat')
      if (!WAVES[state.val]) return fail('nu mai există valuri')
      // Turnurile încep fiecare val încărcate.
      const turnuri = state.turnuri.map((t) => (t.reincarcare === 0 ? t : { ...t, reincarcare: 0 }))
      return ok(logged({ ...state, faza: 'val', turnuri, ocoluriFolosite: 0, deGenerat: spawnSchedule(state.val, state.tick) }))
    }
    case 'turn': {
      const r = checkBuild(state, d.turn, d.hex)
      if (!r.ok) return fail(r.reason)
      const tower: Tower = { id: state.urmatorulTurn, tip: d.turn, hex: d.hex, tintire: 'primul', reincarcare: 0 }
      return ok(
        logged({
          ...state,
          aur: state.aur - TOWERS[d.turn].cost,
          turnuri: [...state.turnuri, tower],
          urmatorulTurn: state.urmatorulTurn + 1,
        }),
      )
    }
    case 'tintire': {
      // Ținta se poate schimba și în timpul valului: decizia intră în jurnal cu tick-ul ei.
      if (state.faza === 'castigat' || state.faza === 'pierdut') return fail('partida s-a încheiat')
      const t = state.turnuri.find((x) => x.id === d.turn)
      if (!t) return fail(`nu există turnul ${d.turn}`)
      const info = TOWERS[t.tip]
      if (info.zona) return fail(`turnul ${info.nume} lovește toți inamicii din rază — nu are țintă de ales`)
      if (!TARGET_MODES.includes(d.mod)) return fail(`mod de țintire necunoscut: ${d.mod}`)
      if (t.tintire === d.mod) return fail('turnul țintește deja așa')
      return ok(logged({ ...state, turnuri: state.turnuri.map((x) => (x === t ? { ...x, tintire: d.mod } : x)) }))
    }
  }
}

/** Hexagonul de drum pe care stă inamicul acum: cel mai apropiat centru. */
export const enemyPathIndex = (s: GameState, e: Enemy): number =>
  Math.min(s.path.length - 1, Math.floor((e.progres + MILI_HEX / 2) / MILI_HEX))

// Ce indici de drum acoperă un turn. Drumul nu se schimbă în timpul valului, deci se calculează o dată pe
// (drum, hexagon, rază). Cache-ul e doar o memorare a unei funcții pure — nu schimbă rezultatul.
const coverageCache = new WeakMap<readonly Hex[], Map<string, readonly boolean[]>>()
export function coverage(path: readonly Hex[], hex: string, raza: number): readonly boolean[] {
  let perPath = coverageCache.get(path)
  if (!perPath) {
    perPath = new Map()
    coverageCache.set(path, perPath)
  }
  const k = `${hex}/${raza}`
  let c = perPath.get(k)
  if (!c) {
    const at = fromKey(hex)
    c = path.map((h) => distance(at, h) <= raza)
    perPath.set(k, c)
  }
  return c
}

/**
 * Ținta unui turn cu țintă unică. Egalitățile se rup mereu la fel: după progres (mai aproape de bază
 * întâi), apoi după id (cel apărut primul). `undefined` dacă lista e goală.
 */
export function pickTarget<E extends Pick<Enemy, 'id' | 'viata' | 'progres'>>(candidates: readonly E[], mode: TargetMode): E | undefined {
  const byProgressThenId = (a: E, b: E): boolean => (a.progres !== b.progres ? a.progres > b.progres : a.id < b.id)
  const better = (a: E, b: E): boolean => {
    switch (mode) {
      case 'primul':
        return byProgressThenId(a, b)
      case 'ultimul':
        return a.progres !== b.progres ? a.progres < b.progres : a.id < b.id
      case 'puternic':
        return a.viata !== b.viata ? a.viata > b.viata : byProgressThenId(a, b)
      case 'slab':
        return a.viata !== b.viata ? a.viata < b.viata : byProgressThenId(a, b)
    }
  }
  let best: E | undefined
  for (const c of candidates) if (!best || better(c, best)) best = c
  return best
}

/** Dauna care trece de armură. Minimum 1: orice lovitură contează. */
export const damageAfterArmor = (dauna: number, tip: EnemyType): number => Math.max(1, dauna - ENEMIES[tip].armura)

type LiveEnemy = { -readonly [K in keyof Enemy]: Enemy[K] }

/** Un pas de simulare. În afara unui val, starea rămâne neschimbată (timpul stă pe loc). */
export function step(state: GameState): GameState {
  if (state.faza !== 'val') return state
  const tick = state.tick + 1
  const end = pathLength(state)
  const valIndex = state.val
  const multiplier = WAVES[valIndex]?.viata ?? 1

  // 1. Inamicii existenți merg înainte; cei care ajung la bază îi iau vieți.
  //    (Obiectele de aici sunt noi, deci se pot modifica până la sfârșitul pasului.)
  let vieti = state.vieti
  const live: LiveEnemy[] = []
  for (const e of state.inamici) {
    const progres = e.progres + ENEMIES[e.tip].viteza
    if (progres >= end) vieti -= ENEMIES[e.tip].dauna
    else live.push({ ...e, progres })
  }

  // 2. Apar inamicii programați pentru tick-ul ăsta (pornesc de la intrare, se mișcă de la tick-ul următor).
  let i = 0
  let urmatorulId = state.urmatorulId
  while (i < state.deGenerat.length && (state.deGenerat[i] as Spawn).tick <= tick) {
    const sp = state.deGenerat[i] as Spawn
    live.push({ id: urmatorulId++, tip: sp.tip, viata: Math.round(ENEMIES[sp.tip].viata * multiplier), progres: 0 })
    i++
  }
  const deGenerat = state.deGenerat.slice(i)

  // 3. Turnurile lovesc, în ordinea id-urilor. Un inamic ucis de un turn nu mai e țintă pentru următorul.
  const turnuri: Tower[] = []
  for (const t of state.turnuri) {
    const info = TOWERS[t.tip]
    const reincarcare = Math.max(0, t.reincarcare - 1)
    if (reincarcare > 0) {
      turnuri.push({ ...t, reincarcare })
      continue
    }
    const cover = coverage(state.path, t.hex, info.raza)
    const inRange = live.filter((e) => e.viata > 0 && cover[enemyPathIndex(state, e)] === true)
    const target = info.zona ? undefined : pickTarget(inRange, t.tintire)
    const tinte = info.zona ? inRange : target ? [target] : []
    if (tinte.length === 0) {
      turnuri.push(t.reincarcare === 0 ? t : { ...t, reincarcare: 0 })
      continue
    }
    for (const e of tinte) e.viata -= damageAfterArmor(info.dauna, e.tip)
    turnuri.push({ ...t, reincarcare: info.reincarcare, lovitura: { tick, tinte: tinte.map((e) => e.id) } })
  }

  // 4. Cei uciși dispar și lasă aur.
  let aur = state.aur
  const inamici: Enemy[] = []
  for (const e of live) {
    if (e.viata <= 0) aur += ENEMIES[e.tip].aur
    else inamici.push(e)
  }

  // 5. Sfârșitul valului sau al partidei.
  const next = { ...state, tick, vieti, aur, turnuri, inamici, deGenerat, urmatorulId }
  if (vieti <= 0) return { ...next, vieti: 0, faza: 'pierdut' }
  if (deGenerat.length === 0 && inamici.length === 0) {
    const val = valIndex + 1
    return { ...next, val, faza: val >= WAVES.length ? 'castigat' : 'pregatire' }
  }
  return next
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
  const parts: string[] = [
    `seed=${state.seed}`,
    `tick=${state.tick}`,
    `faza=${state.faza}`,
    `val=${state.val}`,
    `vieti=${state.vieti}`,
    `aur=${state.aur}`,
    `ocoluri=${state.ocoluriFolosite}/${state.ocoluriPeVal}`,
    // Contoarele de id sunt stare cu viitor: după ce un ocol ridică un turn, `urmatorulTurn` nu mai e
    // „numărul de turnuri + 1”, deci intră separat în amprentă.
    `urmatorulTurn=${state.urmatorulTurn}`,
    `urmatorulId=${state.urmatorulId}`,
  ]
  for (const [k, t] of state.map.terrain) parts.push(`${k}:${t}`)
  parts.push(`path=${state.path.map(key).join(';')}`)
  parts.push(`inamici=${state.inamici.map((e) => `${e.id}/${e.tip}/${e.viata}/${e.progres}`).join(';')}`)
  parts.push(`deGenerat=${state.deGenerat.length}`)
  parts.push(`turnuri=${state.turnuri.map((t) => `${t.id}/${t.tip}/${t.hex}/${t.tintire}/${t.reincarcare}`).join(';')}`)
  let h = 0x811c9dc5
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
