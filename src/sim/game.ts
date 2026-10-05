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

import { CARD_IDS, CARDS, cardTower, DRAFT, type CardEffect, type CardId } from '../data/draft'
import { ECONOMIE, TERRAFORMARI, type Terraform } from '../data/economie'
import { CRESTERE_VIATA, ENEMIES, WAVES, type EnemyType, type Trait } from '../data/enemies'
import { MILI_HEX, VIETI_BAZA } from '../data/joc'
import type { ReactionType } from '../data/reactions'
import { INSERARE, TERRAIN, type Terrain } from '../data/terrain'
import { AUR_START, COMBINARE, TARGET_MODES, TOWERS, type ArmorCombo, type TargetMode, type TowerType } from '../data/towers'
import { distance, fromKey, key, lineBetween, neighbors, type Hex } from './hex'
import { generateMap, type GameMap } from './map'
import { detourOptions, insertDetour } from './path'
import { applyContact, enemySpeed, STATE_ORDER, tickStates, type Contact, type ReactionContext, type States } from './reactions'
import { fail, ok, type Result } from './result'
import { createRng } from './rng'

export { damageAfterArmor, enemySpeed } from './reactions'

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
  | {
      readonly tip: 'alege'
      /** Cartea aleasă din oferta draftului. */
      readonly carte: CardId
    }
  | {
      readonly tip: 'teren'
      /** Terraformarea: canal, deal sau arde (pădurea). Se plătește cu pământ. */
      readonly actiune: Terraform
      /** Hexagonul, ca cheie „q,r”. */
      readonly hex: string
    }
  | {
      readonly tip: 'mina'
      /** Filonul pe care se sapă mina, ca cheie „q,r”. */
      readonly hex: string
    }
  | {
      readonly tip: 'combina'
      /** Un turn din grup — oricare. */
      readonly turn: number
      /** `true` = grupul devine un singur turn; `false` = turnurile lui trag din nou fiecare pe cont propriu. */
      readonly activ: boolean
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
  /** Stările de pe el (arde, ud, răcit…): câte tick-uri mai ține fiecare. */
  readonly stari: Readonly<States>
  /** Trăsăturile grupului din care vine (bossii le au): stările la care e imun. */
  readonly trasaturi?: readonly Trait[]
}

/** O reacție produsă într-un tick — pentru desen (textul care apare pe hartă) și, mai târziu, pentru cronică. */
export interface ReactionEvent {
  readonly tip: ReactionType
  readonly inamic: number
  /** Unde era inamicul pe drum, în mili-hexagoane. */
  readonly progres: number
}

export interface Spawn {
  readonly tick: number
  readonly tip: EnemyType
  readonly trasaturi?: readonly Trait[]
}

export interface Tower {
  readonly id: number
  readonly tip: TowerType
  /** Hexagonul turnului, ca cheie „q,r”. */
  readonly hex: string
  readonly tintire: TargetMode
  /** Câte tick-uri mai sunt până poate lovi din nou (0 = gata). */
  readonly reincarcare: number
  /**
   * Face parte dintr-un grup combinat (vezi `towerGroups`). Toate turnurile unui grup au aceeași valoare, iar un
   * turn fără vecini are mereu `false` — `applyDecision` păstrează regula asta la fiecare schimbare.
   */
  readonly combinat: boolean
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
  /** De câte ori s-a produs fiecare reacție în partida asta (câți inamici a prins). Date pentru cronică și playtest. */
  readonly reactii: Readonly<Partial<Record<ReactionType, number>>>
  /** Reacțiile din ultimul tick. Nu influențează viitorul — doar desenul le citește. */
  readonly evenimente: readonly ReactionEvent[]
  /** Oferta draftului din pregătirea asta (goală = nicio carte de ales). Se face când se termină un val. */
  readonly oferta: readonly CardId[]
  /** Cărțile alese, în ordine. */
  readonly carti: readonly CardId[]
  /** Turnurile gratuite primite din draft, pe tip. */
  readonly gratuite: Readonly<Partial<Record<TowerType, number>>>
  /** Îmbunătățirile din draft, pe tip: procentele adunate. */
  readonly imbunatatiri: Improvements
  /** Ocoluri în plus în pregătirea curentă (cartea „Ocol în plus”). Se golește când pornește valul. */
  readonly ocoluriBonus: number
  /** Pământul (GDD §7): vine din valuri și din mine, se cheltuie doar pe terraformare. */
  readonly pamant: number
  /** Minele, ca chei de hexagon (pe filoane). Fiecare aduce pământ la fiecare val încheiat. */
  readonly mine: readonly string[]
  /** Ce a adus ultimul val încheiat (dobânda și pământul). Doar interfața îl citește. */
  readonly venit?: { readonly aur: number; readonly pamant: number }
}

/** Îmbunătățirile unui tip de turn: +`dauna`% daună, trage cu `reincarcare`% mai des. */
export interface Improvement {
  readonly dauna: number
  readonly reincarcare: number
}

export type Improvements = Readonly<Partial<Record<TowerType, Improvement>>>

/**
 * O partidă nouă pe harta generată din `seed`. `teren` = terenul pe care o regiune îl are deja de la partidele
 * dinainte (lumea care ține minte, `lume.ts`): înlocuiește, hexagon cu hexagon, terenul generat. Drumul inițial rămâne
 * legal: unde trece și terenul nu-l ține, devine câmpie, ca la generare (cu regula „drumul vechi”, nu se ajunge aici).
 */
export function newGame(seed: number, teren?: ReadonlyMap<string, Terrain>): GameState {
  const gen = generateMap(seed)
  let map = gen.map
  const path = gen.path
  if (teren && teren.size > 0) {
    const t = new Map(map.terrain)
    for (const [k, v] of teren) if (t.has(k)) t.set(k, v)
    for (const h of path) if (!TERRAIN[t.get(key(h)) ?? 'campie'].permiteTraseu) t.set(key(h), 'campie')
    map = { ...map, terrain: t }
  }
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
    reactii: {},
    evenimente: [],
    oferta: [],
    carti: [],
    gratuite: {},
    imbunatatiri: {},
    ocoluriBonus: 0,
    pamant: ECONOMIE.pamant.start,
    mine: [],
  }
}

/** Cât de lung e drumul, în unitățile simulării. Un inamic ajunge la bază când îl parcurge. */
export const pathLength = (s: GameState): number => (s.path.length - 1) * MILI_HEX

/**
 * Viața unui inamic de tipul `tip` în valul `valIndex`: a tipului × multiplicatorul valului × (1 + CRESTERE_VIATA ×
 * valIndex / 100). Calculul e pe întregi (multiplicatorul valului în sutimi), ca rotunjirea să nu depindă de virgulă.
 */
export function enemyHealth(tip: EnemyType, valIndex: number): number {
  const sutimi = Math.round((WAVES[valIndex]?.viata ?? 1) * 100)
  return Math.round((ENEMIES[tip].viata * sutimi * (100 + CRESTERE_VIATA * valIndex)) / 10_000)
}

/** Multiplicatorul de viață al valului `valIndex` (pentru afișare): cât din viața de bază are fiecare inamic. */
export const waveHealth = (valIndex: number): number => (Math.round((WAVES[valIndex]?.viata ?? 1) * 100) * (100 + CRESTERE_VIATA * valIndex)) / 10_000

/** Programul de apariție al unui val, pornit la `startTick`. Ordine stabilă: tick, apoi ordinea grupurilor. */
export function spawnSchedule(valIndex: number, startTick: number): Spawn[] {
  const wave = WAVES[valIndex]
  if (!wave) return []
  const out: { tick: number; tip: EnemyType; trasaturi?: readonly Trait[]; ordine: number }[] = []
  let ordine = 0
  for (const grp of wave.grupuri) {
    for (let k = 0; k < grp.numar; k++) {
      out.push({ tick: startTick + 1 + grp.intarziere + k * grp.interval, tip: grp.tip, trasaturi: grp.trasaturi, ordine: ordine++ })
    }
  }
  out.sort((a, b) => a.tick - b.tick || a.ordine - b.ordine)
  return out.map(({ tick, tip, trasaturi }) => (trasaturi ? { tick, tip, trasaturi } : { tick, tip }))
}

/** Câte ocoluri se pun în pregătirea asta: cele de pe val (relicvele le cresc) plus cele din cartea „Ocol în plus”. */
export const detourLimit = (state: Pick<GameState, 'ocoluriPeVal' | 'ocoluriBonus'>): number => state.ocoluriPeVal + state.ocoluriBonus

/** Se poate pune un ocol acum (faza, limita pe val)? Dacă nu, de ce. Folosit și de UI. */
export function checkDetourAllowed(state: GameState): Result<true> {
  if (state.faza !== 'pregatire') return fail('drumul se modelează doar între valuri')
  if (state.ocoluriFolosite >= detourLimit(state)) {
    const n = detourLimit(state)
    return fail(n === 1 ? 'ocolul acestui val e deja pus — următorul vine după val' : `ai pus deja cele ${n} ocoluri ale acestui val — următoarele vin după val`)
  }
  return ok(true)
}

/**
 * Hexagoanele ocupate de turnuri. Jocul refuză un ocol care ar trece peste ele (decis de owner, 05.10.2026),
 * deci ele intră ca hexagoane blocate în căutarea și în validarea ocolurilor.
 */
export function towerKeys(state: GameState): Set<string> {
  return new Set(state.turnuri.map((t) => t.hex))
}

// Memorare pentru `detourPossible`: e o funcție pură de stare, iar UI-ul o întreabă la fiecare desen.
const possibleCache = new WeakMap<GameState, boolean>()

/** Mai încape vreun ocol pe drum acum (teren, turnuri, regula „drumul nu se atinge singur”)? */
export function detourPossible(state: GameState): boolean {
  const cached = possibleCache.get(state)
  if (cached !== undefined) return cached
  const blocked = towerKeys(state)
  let found = false
  for (let span = 1; span <= INSERARE.portiuneMaxima && !found; span++) {
    for (let start = 0; start + span + 1 <= state.path.length - 1 && !found; start++) {
      for (let extra = INSERARE.minim; extra <= INSERARE.maxim && !found; extra++) {
        found = detourOptions(state.map, state.path, start, span, extra, blocked).length > 0
      }
    }
  }
  possibleCache.set(state, found)
  return found
}

/**
 * Poate porni valul? Ocolul pregătirii e obligatoriu (decis de owner, 05.10.2026): cât timp mai e de pus
 * și încape vreunul pe drum, valul așteaptă. Dacă pe drum nu mai încape niciun ocol, valul pornește —
 * altfel partida s-ar bloca.
 */
export function checkStartWave(state: GameState): Result<true> {
  if (state.faza !== 'pregatire') return fail('un val e deja în desfășurare sau partida s-a încheiat')
  if (!WAVES[state.val]) return fail('nu mai există valuri')
  if (state.oferta.length > 0) return fail('alege întâi o carte din draft (1 din 3)')
  const rest = detourLimit(state) - state.ocoluriFolosite
  if (rest > 0 && detourPossible(state)) {
    if (detourLimit(state) === 1) return fail('pune întâi ocolul acestui val — e obligatoriu')
    return fail(rest === 1 ? 'mai ai de pus un ocol în pregătirea asta — e obligatoriu' : `mai ai de pus ${rest} ocoluri în pregătirea asta — sunt obligatorii`)
  }
  return ok(true)
}

/** Cât costă turnul `tip` pe hexagonul `hex`: prețul lui plus ce cere terenul (dealul) — sau nimic, cu o carte de turn gratuit. */
export function towerCost(state: GameState, tip: TowerType, hex: string): number {
  if ((state.gratuite[tip] ?? 0) > 0) return 0
  const t = state.map.terrain.get(hex)
  return TOWERS[tip].cost + (t === undefined ? 0 : (TERRAIN[t].costTurn ?? 0))
}

/** Dauna unei lovituri a turnului `tip`, cu îmbunătățirile din draft. */
export function towerDamage(state: Pick<GameState, 'imbunatatiri'>, tip: TowerType): number {
  return Math.floor((TOWERS[tip].dauna * (100 + (state.imbunatatiri[tip]?.dauna ?? 0))) / 100)
}

/**
 * Reîncărcarea turnului `tip`, cu îmbunătățirile din draft. „Trage cu p% mai des” = cadența × (100 + p)/100, deci
 * cărțile se adună fără să ajungă vreodată la zero: reîncărcarea × 100/(100 + p), rotunjit, cel puțin 1 tick.
 */
export function towerReload(state: Pick<GameState, 'imbunatatiri'>, tip: TowerType): number {
  const p = state.imbunatatiri[tip]?.reincarcare ?? 0
  return Math.max(1, Math.floor((TOWERS[tip].reincarcare * 200 + (100 + p)) / (2 * (100 + p))))
}

/** Raza turnului: a tipului, plus ce dă terenul pe care stă (dealul). */
export function towerRange(state: GameState, tip: TowerType, hex: string): number {
  const t = state.map.terrain.get(hex)
  return TOWERS[tip].raza + (t === undefined ? 0 : (TERRAIN[t].bonusRaza ?? 0))
}

/**
 * Grupurile de turnuri: turnurile vecine (la un hexagon unul de altul), de orice tip, legate din aproape în
 * aproape. Fiecare grup e în ordinea id-urilor; grupurile, în ordinea celui mai mic id. Un turn fără vecini e un
 * grup de unul.
 */
export function towerGroups(turnuri: readonly Tower[]): Tower[][] {
  const byHex = new Map(turnuri.map((t) => [t.hex, t]))
  const seen = new Set<number>()
  const out: Tower[][] = []
  for (const t of [...turnuri].sort((a, b) => a.id - b.id)) {
    if (seen.has(t.id)) continue
    seen.add(t.id)
    const grup = [t]
    for (let i = 0; i < grup.length; i++) {
      for (const n of neighbors(fromKey((grup[i] as Tower).hex))) {
        const u = byHex.get(key(n))
        if (u && !seen.has(u.id)) {
          seen.add(u.id)
          grup.push(u)
        }
      }
    }
    out.push(grup.sort((a, b) => a.id - b.id))
  }
  return out
}

/** Grupul din care face parte turnul `id` (gol, dacă turnul nu există). */
export function groupOf(turnuri: readonly Tower[], id: number): Tower[] {
  return towerGroups(turnuri).find((g) => g.some((t) => t.id === id)) ?? []
}

/** Un grup trage combinat dacă are cel puțin două turnuri și toate sunt combinate. */
export const isCombined = (grup: readonly Pick<Tower, 'combinat'>[]): boolean => grup.length >= 2 && grup.every((t) => t.combinat)

/** Perechea incompatibilă din tipurile date, dacă există (focul și frigul nu se combină). */
export function incompatiblePair(tipuri: readonly TowerType[]): readonly [TowerType, TowerType] | undefined {
  return COMBINARE.incompatibile.find(([a, b]) => tipuri.includes(a) && tipuri.includes(b))
}

/** Reîncărcarea unui grup combinat: a celui mai lent turn (cu îmbunătățirile din draft). */
export const groupReload = (tipuri: readonly TowerType[], imbunatatiri: Improvements = {}): number =>
  Math.max(...tipuri.map((t) => towerReload({ imbunatatiri }, t)))

/** Combinațiile de elemente din grup care schimbă armura (`COMBINARE.armura`), în ordinea din date. */
export function armorCombos(tipuri: readonly TowerType[]): ArmorCombo[] {
  const elemente = new Set(tipuri.map((t) => TOWERS[t].element))
  return COMBINARE.armura.filter((c) => c.elemente.every((e) => elemente.has(e)))
}

/**
 * Lovitura unui grup combinat, ca listă de atingeri în ordinea `COMBINARE.ordine`. Pentru fiecare element: suma
 * daunelor pe care turnurile lui le-ar fi dat singure într-o reîncărcare a grupului, plus `bonusPeElement`% pentru
 * fiecare element diferit din grup peste primul. Rotunjirile sunt în jos, pe întregi.
 *
 * Armura (decis de owner, 05.10.2026): se scade de câte ori ar fi lovit turnurile separat în timpul ăsta (rotunjit
 * la cel mai apropiat întreg, cel puțin o dată pe turn), deci combinarea singură nu trece de ea. Doar combinațiile
 * din `COMBINARE.armura` o străpung (`penetrare`) sau o ignoră.
 */
export function combinedContacts(tipuri: readonly TowerType[], imbunatatiri: Improvements = {}): Contact[] {
  const R = groupReload(tipuri, imbunatatiri)
  const dauna = (t: TowerType): number => towerDamage({ imbunatatiri }, t)
  const reincarcare = (t: TowerType): number => towerReload({ imbunatatiri }, t)
  const elemente = new Set(tipuri.map((t) => TOWERS[t].element))
  const bonus = 100 + COMBINARE.bonusPeElement * Math.min(elemente.size - 1, COMBINARE.elementeInPlus)
  const combos = armorCombos(tipuri)
  const penetrare = combos.some((c) => c.ignora) ? Infinity : combos.reduce((n, c) => n + (c.penetrare ?? 0), 0)
  const out: Contact[] = []
  for (const element of COMBINARE.ordine) {
    const ale = tipuri.filter((t) => TOWERS[t].element === element)
    const prim = ale[0]
    if (prim === undefined) continue
    const baza = ale.reduce((sum, t) => sum + Math.floor((dauna(t) * R) / reincarcare(t)), 0)
    // R / reîncărcare, rotunjit la cel mai apropiat întreg, pe întregi: ⌊(2R + r) / 2r⌋.
    const lovituri = ale.reduce((sum, t) => sum + Math.max(1, Math.floor((2 * R + reincarcare(t)) / (2 * reincarcare(t)))), 0)
    out.push({ element, dauna: Math.floor((baza * bonus) / 100), aplica: TOWERS[prim].aplica, lovituri, ...(penetrare > 0 ? { penetrare } : {}) })
  }
  return out
}

/**
 * Pune grupul pe modul dat. Combinat, turnurile lui iau ținta liderului (cel mai mic id) și cea mai lungă
 * reîncărcare dintre ele — comutarea în timpul valului nu dă o lovitură gratuită.
 */
function withMode(turnuri: readonly Tower[], grup: readonly Tower[], combinat: boolean): Tower[] {
  const lider = grup[0]
  if (!lider) return [...turnuri]
  const ids = new Set(grup.map((t) => t.id))
  const reincarcare = Math.max(...grup.map((t) => t.reincarcare))
  return turnuri.map((t) => {
    if (!ids.has(t.id)) return t
    if (combinat) return { ...t, combinat, tintire: lider.tintire, reincarcare }
    return t.combinat ? { ...t, combinat } : t
  })
}

/** Se poate comuta grupul turnului `id` pe modul `activ` acum? Dacă nu, de ce. Folosit și de UI. */
export function checkCombine(state: GameState, id: number, activ: boolean): Result<true> {
  if (state.faza === 'castigat' || state.faza === 'pierdut') return fail('partida s-a încheiat')
  const grup = groupOf(state.turnuri, id)
  if (grup.length === 0) return fail(`nu există turnul ${id}`)
  if (grup.length < 2) return fail('turnul n-are vecini — un grup se face din turnuri puse unul lângă altul')
  if (isCombined(grup) === activ) return fail(activ ? 'grupul e deja combinat' : 'turnurile grupului trag deja fiecare singur')
  const pereche = activ ? incompatiblePair(grup.map((t) => t.tip)) : undefined
  if (pereche) return fail(`${TOWERS[pereche[0]].nume} și ${TOWERS[pereche[1]].nume} sunt incompatibile — un grup cu amândouă nu se poate combina`)
  return ok(true)
}

/**
 * Oferta draftului pentru pregătirea curentă (`state.val`): `DRAFT.marime` cărți diferite, trase din fluxul
 * „draft/<val>”. `DRAFT.dinAfara` dintre ele sunt pentru tipuri de turn pe care jucătorul nu le are; restul, din stilul
 * lui (tipurile pe care le are, relicvele, traseul). Relicvele deja luate nu mai apar. Dacă un fel se termină, se ia
 * din celălalt. Ordinea: întâi cele din stil, apoi cele din afară.
 */
export function draftOffer(state: Pick<GameState, 'seed' | 'val' | 'turnuri' | 'carti'>): CardId[] {
  const rng = createRng(state.seed, `draft/${state.val}`)
  const owned = new Set(state.turnuri.map((t) => t.tip))
  const available = CARD_IDS.filter((id) => !(CARDS[id].efect.tip === 'relicva' && state.carti.includes(id)))
  const outside = (id: CardId): boolean => {
    const t = cardTower(id)
    return t !== undefined && owned.size > 0 && !owned.has(t)
  }
  const inStyle = available.filter((id) => !outside(id))
  const other = available.filter(outside)
  const take = (pool: CardId[], n: number): CardId[] => {
    const out: CardId[] = []
    while (out.length < n && pool.length > 0) out.push(...pool.splice(rng.int(pool.length), 1))
    return out
  }
  const fromOther = take(other, DRAFT.dinAfara)
  const fromStyle = take(inStyle, DRAFT.marime - fromOther.length)
  return [...fromStyle, ...fromOther, ...take([...inStyle, ...other], DRAFT.marime - fromStyle.length - fromOther.length)]
}

/** Se poate alege cartea `carte` acum? Dacă nu, de ce. */
export function checkPick(state: GameState, carte: CardId): Result<true> {
  if (state.faza !== 'pregatire') return fail('cărțile se aleg doar între valuri')
  if (state.oferta.length === 0) return fail('nu e nicio carte de ales acum — draftul vine după fiecare val')
  if (!state.oferta.includes(carte)) return fail('cartea nu e în oferta de acum')
  return ok(true)
}

/** Efectul unei cărți asupra stării. */
function applyCard(state: GameState, efect: CardEffect): GameState {
  switch (efect.tip) {
    case 'turn':
      return { ...state, gratuite: { ...state.gratuite, [efect.turn]: (state.gratuite[efect.turn] ?? 0) + 1 } }
    case 'imbunatatire': {
      const cur = state.imbunatatiri[efect.turn] ?? { dauna: 0, reincarcare: 0 }
      const next = { dauna: cur.dauna + (efect.dauna ?? 0), reincarcare: cur.reincarcare + (efect.reincarcare ?? 0) }
      return { ...state, imbunatatiri: { ...state.imbunatatiri, [efect.turn]: next } }
    }
    case 'relicva':
      return { ...state, ocoluriPeVal: state.ocoluriPeVal + (efect.ocoluriPeVal ?? 0), vieti: state.vieti + (efect.vieti ?? 0) }
    case 'traseu':
      return { ...state, ocoluriBonus: state.ocoluriBonus + efect.ocoluri }
  }
}

/** Se poate construi turnul `tip` pe hexagonul `hex` acum? Dacă nu, de ce. Folosit și de previzualizare. */
export function checkBuild(state: GameState, tip: TowerType, hex: string): Result<true> {
  if (state.faza !== 'pregatire') return fail('turnurile se construiesc doar între valuri')
  const t = state.map.terrain.get(hex)
  if (t === undefined) return fail(`${hex} e în afara hărții`)
  if (state.path.some((h) => key(h) === hex)) return fail('pe drum nu se construiește')
  if (!TERRAIN[t].permiteTurn) return fail(`pe ${TERRAIN[t].nume.toLowerCase()} nu se construiește`)
  if (state.turnuri.some((x) => x.hex === hex)) return fail('aici e deja un turn')
  if (state.mine.includes(hex)) return fail('aici e o mină')
  const cost = towerCost(state, tip, hex)
  const unde = cost === TOWERS[tip].cost ? '' : ` pe ${TERRAIN[t].nume.toLowerCase()}`
  if (state.aur < cost) return fail(`nu ajunge aurul: turnul ${TOWERS[tip].nume}${unde} costă ${cost}, ai ${state.aur}`)
  return ok(true)
}

/** Drumul vechi: linia dreaptă de la intrare la bază, pe care pornește drumul la începutul fiecărei partide. */
export function isOldRoad(map: GameMap, hex: string): boolean {
  return lineBetween(map.spawn, map.base).some((h) => key(h) === hex)
}

/** Ce nu se poate terraforma și nu se poate săpa: drumul, turnurile, minele. Motivul, sau `undefined` dacă e liber. */
function occupied(state: GameState, hex: string): string | undefined {
  if (state.path.some((h) => key(h) === hex)) return 'pe drum nu se poate'
  if (state.turnuri.some((x) => x.hex === hex)) return 'aici e un turn'
  if (state.mine.includes(hex)) return 'aici e o mină'
  return undefined
}

/** Se poate face terraformarea `actiune` pe `hex` acum? Dacă nu, de ce. Folosit și de previzualizare. */
export function checkTerraform(state: GameState, actiune: Terraform, hex: string): Result<true> {
  const info = TERRAFORMARI[actiune]
  if (state.faza !== 'pregatire') return fail('terenul se modelează doar între valuri')
  const t = state.map.terrain.get(hex)
  if (t === undefined) return fail(`${hex} e în afara hărții`)
  const busy = occupied(state, hex)
  if (busy) return fail(busy)
  // Terenul unei regiuni rămâne de la o partidă la alta, dar drumul se reface la fiecare partidă pe linia dreaptă de la
  // intrare la bază. O terraformare pe linia aia, făcută după ce un ocol a mutat drumul, n-ar avea cum să rămână.
  if (isOldRoad(state.map, hex)) return fail('pe drumul vechi nu se poate: drumul se reface pe aici la fiecare partidă')
  if (!info.din.includes(t)) {
    const nume = info.din.map((x) => TERRAIN[x].nume.toLowerCase())
    const unde = nume.length > 1 ? `${nume.slice(0, -1).join(', ')} sau ${nume.at(-1)}` : (nume[0] ?? '')
    return fail(`${info.verb} se poate doar pe ${unde}, nu pe ${TERRAIN[t].nume.toLowerCase()}`)
  }
  if (state.pamant < info.costPamant) return fail(`nu ajunge pământul: ${info.nume.toLowerCase()} costă ${info.costPamant}, ai ${state.pamant}`)
  return ok(true)
}

/** Se poate săpa o mină pe `hex` acum? Dacă nu, de ce. */
export function checkMine(state: GameState, hex: string): Result<true> {
  if (state.faza !== 'pregatire') return fail('minele se sapă doar între valuri')
  const t = state.map.terrain.get(hex)
  if (t === undefined) return fail(`${hex} e în afara hărții`)
  const busy = occupied(state, hex)
  if (busy) return fail(busy)
  if (t !== 'filon') return fail('o mină se sapă doar pe un filon')
  if (state.aur < ECONOMIE.mina.costAur) return fail(`nu ajunge aurul: mina costă ${ECONOMIE.mina.costAur}, ai ${state.aur}`)
  return ok(true)
}

/**
 * Ce aduce sfârșitul unui val: dobânda (`ECONOMIE.dobanda.procent`% din aur, cel mult `maxim`) și pământul (al valului,
 * plus câte unul pe mină).
 */
export function waveIncome(state: Pick<GameState, 'aur' | 'mine'>): { aur: number; pamant: number } {
  const dobanda = Math.min(ECONOMIE.dobanda.maxim, Math.floor((Math.max(0, state.aur) * ECONOMIE.dobanda.procent) / 100))
  return { aur: dobanda, pamant: ECONOMIE.pamant.peVal + state.mine.length * ECONOMIE.pamant.peMina }
}

export function applyDecision(state: GameState, d: Decision): Result<GameState> {
  const logged = (next: GameState): GameState => ({ ...next, jurnal: [...state.jurnal, { la: state.tick, d }] })
  switch (d.tip) {
    case 'ocol': {
      const allowed = checkDetourAllowed(state)
      if (!allowed.ok) return fail(allowed.reason)
      const r = insertDetour(state.map, state.path, d.start, d.span, d.hexuri.map(fromKey), towerKeys(state))
      if (!r.ok) return fail(r.reason)
      return ok(logged({ ...state, path: r.value, ocoluriFolosite: state.ocoluriFolosite + 1 }))
    }
    case 'pornesteVal': {
      const allowed = checkStartWave(state)
      if (!allowed.ok) return fail(allowed.reason)
      // Turnurile încep fiecare val încărcate.
      const turnuri = state.turnuri.map((t) => (t.reincarcare === 0 ? t : { ...t, reincarcare: 0 }))
      return ok(
        logged({ ...state, faza: 'val', turnuri, ocoluriFolosite: 0, ocoluriBonus: 0, evenimente: [], deGenerat: spawnSchedule(state.val, state.tick) }),
      )
    }
    case 'turn': {
      const r = checkBuild(state, d.turn, d.hex)
      if (!r.ok) return fail(r.reason)
      const tower: Tower = { id: state.urmatorulTurn, tip: d.turn, hex: d.hex, tintire: 'primul', reincarcare: 0, combinat: false }
      const turnuri = [...state.turnuri, tower]
      // Un turn nou lângă un grup combinat intră în grup (decis de owner, 05.10.2026). Dacă leagă grupul de turnuri
      // care trag singure, sau aduce în el o pereche incompatibilă, grupul unit trage individual: combinarea rămâne
      // o alegere a jucătorului, nu se face pe ascuns.
      const at = fromKey(d.hex)
      const vecini = state.turnuri.filter((t) => distance(fromKey(t.hex), at) === 1)
      const grup = groupOf(turnuri, tower.id)
      const combinat = vecini.length > 0 && vecini.every((t) => t.combinat) && !incompatiblePair(grup.map((t) => t.tip))
      // Un turn gratuit din draft se consumă la construcție.
      const gratuit = (state.gratuite[d.turn] ?? 0) > 0
      return ok(
        logged({
          ...state,
          gratuite: gratuit ? { ...state.gratuite, [d.turn]: (state.gratuite[d.turn] ?? 0) - 1 } : state.gratuite,
          aur: state.aur - towerCost(state, d.turn, d.hex),
          turnuri: withMode(turnuri, grup, combinat),
          urmatorulTurn: state.urmatorulTurn + 1,
        }),
      )
    }
    case 'tintire': {
      // Ținta se poate schimba și în timpul valului: decizia intră în jurnal cu tick-ul ei.
      if (state.faza === 'castigat' || state.faza === 'pierdut') return fail('partida s-a încheiat')
      const t = state.turnuri.find((x) => x.id === d.turn)
      if (!t) return fail(`nu există turnul ${d.turn}`)
      // Un grup combinat are o singură țintă, deci ținta se schimbă pentru tot grupul — și pentru un Frig din el.
      const grup = groupOf(state.turnuri, t.id)
      const combinat = isCombined(grup)
      const info = TOWERS[t.tip]
      if (info.zona && !combinat) return fail(`turnul ${info.nume} lovește toți inamicii din rază — nu are țintă de ales`)
      if (!TARGET_MODES.includes(d.mod)) return fail(`mod de țintire necunoscut: ${d.mod}`)
      if (t.tintire === d.mod) return fail(combinat ? 'grupul țintește deja așa' : 'turnul țintește deja așa')
      const ids = new Set(combinat ? grup.map((x) => x.id) : [t.id])
      return ok(logged({ ...state, turnuri: state.turnuri.map((x) => (ids.has(x.id) ? { ...x, tintire: d.mod } : x)) }))
    }
    case 'alege': {
      const allowed = checkPick(state, d.carte)
      if (!allowed.ok) return fail(allowed.reason)
      return ok(logged(applyCard({ ...state, oferta: [], carti: [...state.carti, d.carte] }, CARDS[d.carte].efect)))
    }
    case 'teren': {
      const allowed = checkTerraform(state, d.actiune, d.hex)
      if (!allowed.ok) return fail(allowed.reason)
      const info = TERRAFORMARI[d.actiune]
      // Harta e imuabilă: terenul nou intră într-o hartă nouă (ordinea hexagoanelor rămâne, deci și amprenta).
      const terrain = new Map(state.map.terrain).set(d.hex, info.in)
      return ok(logged({ ...state, map: { ...state.map, terrain }, pamant: state.pamant - info.costPamant }))
    }
    case 'mina': {
      const allowed = checkMine(state, d.hex)
      if (!allowed.ok) return fail(allowed.reason)
      return ok(logged({ ...state, aur: state.aur - ECONOMIE.mina.costAur, mine: [...state.mine, d.hex] }))
    }
    case 'combina': {
      // Ca ținta, modul se poate schimba și în timpul valului.
      const allowed = checkCombine(state, d.turn, d.activ)
      if (!allowed.ok) return fail(allowed.reason)
      return ok(logged({ ...state, turnuri: withMode(state.turnuri, groupOf(state.turnuri, d.turn), d.activ) }))
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

// Ce face terenul inamicilor, pe fiecare hexagon de drum: atingerile terenurilor vecine (apa udă, uleiul unge),
// fiecare teren o dată, în ordinea din `TERRAIN`. Depinde de hartă și de drum; se memorează pe perechea lor.
const contactCache = new WeakMap<GameMap, WeakMap<readonly Hex[], readonly (readonly Contact[])[]>>()
export function pathContacts(state: Pick<GameState, 'map' | 'path'>): readonly (readonly Contact[])[] {
  let perMap = contactCache.get(state.map)
  if (!perMap) {
    perMap = new WeakMap()
    contactCache.set(state.map, perMap)
  }
  let c = perMap.get(state.path)
  if (!c) {
    c = state.path.map((h) => {
      const near = new Set(neighbors(h).map((n) => state.map.terrain.get(key(n))))
      return TERRAIN_ORDER.flatMap((t) => {
        const a = TERRAIN[t].atingere
        return near.has(t) && a ? [{ element: a.element, dauna: 0, aplica: a.aplica }] : []
      })
    })
    perMap.set(state.path, c)
  }
  return c
}

const TERRAIN_ORDER = Object.keys(TERRAIN) as Terrain[]
const TOWERS_ORDER = Object.keys(TOWERS) as TowerType[]

/** Inamicul în timpul unui pas: obiect nou, modificabil; `fost` = hexagonul de drum de la începutul pasului. */
type LiveEnemy = { -readonly [K in keyof Enemy]: Enemy[K] } & { stari: States; fost: number }

/** Un pas de simulare. În afara unui val, starea rămâne neschimbată (timpul stă pe loc). */
export function step(state: GameState): GameState {
  if (state.faza !== 'val') return state
  const tick = state.tick + 1
  const end = pathLength(state)
  const valIndex = state.val
  const indexOf = (progres: number): number => Math.min(state.path.length - 1, Math.floor((progres + MILI_HEX / 2) / MILI_HEX))

  // 1. Inamicii existenți merg înainte, cu viteza dată de stări (răcit încetinește, înghețat oprește);
  //    cei care ajung la bază îi iau vieți. Obiectele de aici sunt noi, deci se pot modifica până la sfârșitul pasului.
  let vieti = state.vieti
  const live: LiveEnemy[] = []
  for (const e of state.inamici) {
    const progres = e.progres + enemySpeed(e)
    if (progres >= end) vieti -= ENEMIES[e.tip].dauna
    else live.push({ ...e, stari: { ...e.stari }, progres, fost: indexOf(e.progres) })
  }

  // 2. Apar inamicii programați pentru tick-ul ăsta (pornesc de la intrare, se mișcă de la tick-ul următor).
  let i = 0
  let urmatorulId = state.urmatorulId
  while (i < state.deGenerat.length && (state.deGenerat[i] as Spawn).tick <= tick) {
    const sp = state.deGenerat[i] as Spawn
    const nou = { id: urmatorulId++, tip: sp.tip, viata: enemyHealth(sp.tip, valIndex), progres: 0, stari: {}, fost: -1 }
    live.push(sp.trasaturi ? { ...nou, trasaturi: sp.trasaturi } : nou)
    i++
  }
  const deGenerat = state.deGenerat.slice(i)

  // 3. Stările trec cu un tick: arsura lovește, cele expirate dispar.
  for (const e of live) tickStates(e)

  // Reacțiile se numără și se notează pentru desen. Vecinii unui inamic = inamicii vii până la `raza`
  // hexagoane de hexagonul lui de drum.
  const evenimente: ReactionEvent[] = []
  const reactii = { ...state.reactii }
  const hexOf = (e: LiveEnemy): Hex => state.path[indexOf(e.progres)] as Hex
  const ctx: ReactionContext<LiveEnemy> = {
    neighbors: (v, raza) => live.filter((n) => n !== v && n.viata > 0 && distance(hexOf(n), hexOf(v)) <= raza),
    emit: (tip, v) => {
      evenimente.push({ tip, inamic: v.id, progres: v.progres })
      reactii[tip] = (reactii[tip] ?? 0) + 1
    },
  }

  // 4. Terenul: cine intră pe un hexagon de drum vecin cu apa se udă, cu uleiul se unge (o dată pe hexagon, la intrare).
  const contacts = pathContacts(state)
  for (const e of live) {
    const at = indexOf(e.progres)
    if (at === e.fost) continue
    for (const c of contacts[at] ?? []) if (e.viata > 0) applyContact(e, c, ctx)
  }

  // 5. Turnurile lovesc, în ordinea id-urilor. Un inamic ucis nu mai e țintă pentru următorul.
  //    Fiecare lovitură e o atingere cu elementul turnului: reacțiile se decid în `applyContact`.
  //    Un grup combinat trage o singură dată, la rândul liderului (cel mai mic id): o țintă, din razele tuturor
  //    turnurilor lui, lovită pe rând de elementele din `combinedContacts`. Turnurile grupului au aceeași reîncărcare.
  const lideri = new Map<number, readonly Tower[]>()
  for (const g of towerGroups(state.turnuri)) if (isCombined(g)) lideri.set((g[0] as Tower).id, g)
  const decise = new Map<number, Tower>()
  const inRangeOf = (covers: readonly (readonly boolean[])[]): LiveEnemy[] =>
    live.filter((e) => e.viata > 0 && covers.some((c) => c[indexOf(e.progres)] === true))
  const turnuri: Tower[] = []
  for (const t of state.turnuri) {
    const gata = decise.get(t.id)
    if (gata) {
      turnuri.push(gata)
      continue
    }
    const grup = lideri.get(t.id)
    const membri = grup ?? [t]
    const reincarcare = Math.max(0, t.reincarcare - 1)
    let urmatoarea: (m: Tower) => Tower
    if (reincarcare > 0) {
      urmatoarea = (m) => ({ ...m, reincarcare: Math.max(0, m.reincarcare - 1) })
    } else if (grup) {
      const target = pickTarget(inRangeOf(grup.map((m) => coverage(state.path, m.hex, towerRange(state, m.tip, m.hex)))), t.tintire)
      if (target) {
        for (const c of combinedContacts(grup.map((m) => m.tip), state.imbunatatiri)) if (target.viata > 0) applyContact(target, c, ctx)
        const R = groupReload(grup.map((m) => m.tip), state.imbunatatiri)
        urmatoarea = (m) => ({ ...m, reincarcare: R, lovitura: { tick, tinte: [target.id] } })
      } else urmatoarea = (m) => (m.reincarcare === 0 ? m : { ...m, reincarcare: 0 })
    } else {
      const info = TOWERS[t.tip]
      const inRange = inRangeOf([coverage(state.path, t.hex, towerRange(state, t.tip, t.hex))])
      const target = info.zona ? undefined : pickTarget(inRange, t.tintire)
      const tinte = info.zona ? inRange : target ? [target] : []
      if (tinte.length > 0) {
        const lovitura: Contact = { element: info.element, dauna: towerDamage(state, t.tip), aplica: info.aplica }
        for (const e of tinte) applyContact(e, lovitura, ctx)
        const R = towerReload(state, t.tip)
        urmatoarea = (m) => ({ ...m, reincarcare: R, lovitura: { tick, tinte: tinte.map((e) => e.id) } })
      } else urmatoarea = (m) => (m.reincarcare === 0 ? m : { ...m, reincarcare: 0 })
    }
    for (const m of membri) decise.set(m.id, urmatoarea(m))
    turnuri.push(decise.get(t.id) as Tower)
  }

  // 6. Cei uciși dispar și lasă aur.
  let aur = state.aur
  const inamici: Enemy[] = []
  for (const e of live) {
    if (e.viata <= 0) aur += ENEMIES[e.tip].aur
    else {
      const { fost: _fost, ...enemy } = e
      inamici.push(enemy)
    }
  }

  // 7. Sfârșitul valului sau al partidei.
  const next = { ...state, tick, vieti, aur, turnuri, inamici, deGenerat, urmatorulId, reactii, evenimente }
  if (vieti <= 0) return { ...next, vieti: 0, faza: 'pierdut' }
  if (deGenerat.length === 0 && inamici.length === 0) {
    const val = valIndex + 1
    if (val >= WAVES.length) return { ...next, val, faza: 'castigat' }
    // Valul s-a încheiat: dobânda și pământul (GDD §7), apoi draftul (1 din 3) pentru pregătirea următoare.
    const venit = waveIncome(next)
    return { ...next, val, faza: 'pregatire', aur: aur + venit.aur, pamant: state.pamant + venit.pamant, venit, oferta: draftOffer({ ...next, val }) }
  }
  return next
}

/**
 * Reconstruiește starea din seed și jurnal: rulează simularea până la tick-ul fiecărei decizii, o aplică,
 * apoi continuă până la `panaLaTick` (dacă e dat). Aruncă eroare dacă o decizie nu mai e validă.
 */
export function replay(seed: number, jurnal: readonly LoggedDecision[], panaLaTick?: number, teren?: ReadonlyMap<string, Terrain>): GameState {
  let state = newGame(seed, teren)
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
    `ocoluri=${state.ocoluriFolosite}/${state.ocoluriPeVal}+${state.ocoluriBonus}`,
    `oferta=${state.oferta.join(',')}`,
    `carti=${state.carti.join(',')}`,
    `gratuite=${TOWERS_ORDER.map((t) => state.gratuite[t] ?? 0).join(',')}`,
    `imbunatatiri=${TOWERS_ORDER.map((t) => `${state.imbunatatiri[t]?.dauna ?? 0}/${state.imbunatatiri[t]?.reincarcare ?? 0}`).join(',')}`,
    // Contoarele de id sunt stare cu viitor: de îndată ce un turn va putea dispărea (vânzare, de exemplu),
    // `urmatorulTurn` nu mai e „numărul de turnuri + 1”, deci intră separat în amprentă.
    `urmatorulTurn=${state.urmatorulTurn}`,
    `urmatorulId=${state.urmatorulId}`,
  ]
  for (const [k, t] of state.map.terrain) parts.push(`${k}:${t}`)
  parts.push(`path=${state.path.map(key).join(';')}`)
  const stari = (e: Enemy): string =>
    STATE_ORDER.filter((st) => e.stari[st] !== undefined)
      .map((st) => `${st}:${e.stari[st]}`)
      .join(',')
  parts.push(`inamici=${state.inamici.map((e) => `${e.id}/${e.tip}/${e.viata}/${e.progres}/${stari(e)}/${(e.trasaturi ?? []).join('+')}`).join(';')}`)
  const reactii = Object.entries(state.reactii).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
  parts.push(`reactii=${reactii.map(([r, n]) => `${r}:${n}`).join(',')}`)
  parts.push(`deGenerat=${state.deGenerat.length}`)
  parts.push(`turnuri=${state.turnuri.map((t) => `${t.id}/${t.tip}/${t.hex}/${t.tintire}/${t.reincarcare}/${t.combinat ? 'c' : 'i'}`).join(';')}`)
  parts.push(`pamant=${state.pamant}`, `mine=${state.mine.join(';')}`)
  let h = 0x811c9dc5
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
