// Motorul de reacții: o ATINGERE (lovitura unui turn sau terenul de lângă drum) întâlnește stările unui inamic.
//
// Regulile vin din `data/reactions.ts` și se potrivesc pe etichete. Funcțiile de aici lucrează pe obiectele
// create în pasul curent al simulării (`step` le copiază înainte), deci le pot modifica. Sunt deterministe:
// regulile se verifică în ordinea din date, vecinii vin în ordinea listei de inamici, stările în ordinea
// din `STATES`.

import { ENEMIES, TRAITS, type EnemyType, type Trait } from '../data/enemies'
import { REACTION_RULES, STATES, type Element, type ReactionType, type StateType, type Tag } from '../data/reactions'

/** Stările unui inamic: câte tick-uri mai ține fiecare. */
export type States = Partial<Record<StateType, number>>

/** Ordinea fixă în care se parcurg stările (ordinea din `STATES`). */
export const STATE_ORDER = Object.keys(STATES) as StateType[]

/** Inamicul în timpul unui pas: obiect nou, modificabil până la sfârșitul pasului. */
export interface Victim {
  readonly id: number
  readonly tip: EnemyType
  viata: number
  stari: States
  /** Trăsăturile lui: stările la care e imun nu se prind (vezi `TRAITS`). */
  readonly trasaturi?: readonly Trait[]
}

export interface Contact {
  readonly element: Element
  /** Dauna atingerii, înainte de armură (0 pentru teren). */
  readonly dauna: number
  /** Starea pe care o lasă atingerea, dacă nicio reacție n-o blochează. */
  readonly aplica?: StateType
  /**
   * De câte ori se scade armura din daună (implicit 1). O lovitură combinată ține locul mai multor lovituri, deci
   * armura se scade de câte ori ar fi lovit turnurile separat.
   */
  readonly lovituri?: number
  /** Câtă armură nu contează la atingerea asta (implicit 0; `Infinity` = armura nu contează deloc). */
  readonly penetrare?: number
}

export interface ReactionContext<V extends Victim> {
  /** Inamicii vii până la `raza` hexagoane de `v`, fără el, în ordinea listei. */
  neighbors(v: V, raza: number): readonly V[]
  /** O reacție s-a produs pe `v` (pentru numărători, jurnalul cronicii și desen). */
  emit(tip: ReactionType, v: V): void
}

/**
 * Dauna care trece de armură: armura (minus ce străpunge lovitura) se scade o dată pentru fiecare lovitură pe care o
 * ține locul atingerea. Minimum 1 pe lovitură: orice lovitură contează.
 */
export const damageAfterArmor = (dauna: number, tip: EnemyType, lovituri = 1, penetrare = 0): number =>
  Math.max(lovituri, dauna - Math.max(0, ENEMIES[tip].armura - penetrare) * lovituri)

export function hasTag(v: Pick<Victim, 'stari'>, tag: Tag): boolean {
  return STATE_ORDER.some((s) => v.stari[s] !== undefined && STATES[s].etichete.includes(tag))
}

function removeTag(v: Victim, tag: Tag): void {
  for (const s of STATE_ORDER) if (v.stari[s] !== undefined && STATES[s].etichete.includes(tag)) delete v.stari[s]
}

/** Inamicul e imun la starea `s` (o trăsătură a lui o oprește)? */
export const isImmune = (v: Pick<Victim, 'trasaturi'>, s: StateType): boolean => (v.trasaturi ?? []).some((t) => TRAITS[t].imun.includes(s))

/** Aplică (sau reîmprospătează) o stare: durata ei pornește de la capăt; nu se adună. Imunitatea o oprește. */
function applyState(v: Victim, s: StateType): void {
  if (isImmune(v, s)) return
  v.stari[s] = STATES[s].durata
}

function hurt(v: Victim, dauna: number, lovituri = 1, penetrare = 0): void {
  if (dauna > 0) v.viata -= damageAfterArmor(dauna, v.tip, lovituri, penetrare)
}

/**
 * Inamicii prin care trece reacția: `start` și, din aproape în aproape (în lățime), vecinii care poartă
 * eticheta — cel mult `maxim` în plus.
 */
function chain<V extends Victim>(start: V, tag: Tag, raza: number, maxim: number, ctx: ReactionContext<V>): V[] {
  const out = [start]
  const seen = new Set([start.id])
  for (let i = 0; i < out.length && out.length - 1 < maxim; i++) {
    for (const n of ctx.neighbors(out[i] as V, raza)) {
      if (out.length - 1 >= maxim) break
      if (seen.has(n.id) || !hasTag(n, tag)) continue
      seen.add(n.id)
      out.push(n)
    }
  }
  return out
}

/**
 * O atingere pe un inamic: întâi reacțiile (cu stările pe care le are deja), apoi dauna atingerii (după armură)
 * și starea pe care o lasă, dacă n-a fost blocată sau înlocuită.
 */
export function applyContact<V extends Victim>(target: V, contact: Contact, ctx: ReactionContext<V>): void {
  let dauna = contact.dauna
  let stare = contact.aplica
  let blocata = false
  for (const rule of REACTION_RULES) {
    if (rule.element !== contact.element || !hasTag(target, rule.eticheta)) continue
    if (rule.blocheaza) blocata = true
    if (rule.inlocuieste && stare !== undefined) stare = rule.inlocuieste
    if (rule.multiplicator) dauna *= rule.multiplicator
    const reacting = rule.lant ? chain(target, rule.eticheta, rule.lant.raza, rule.lant.maxim ?? Infinity, ctx) : [target]
    for (const v of reacting) {
      ctx.emit(rule.tip, v)
      if (rule.consuma) removeTag(v, rule.eticheta)
      if (rule.zona) {
        hurt(v, rule.zona.dauna)
        for (const n of ctx.neighbors(v, rule.zona.raza)) hurt(n, rule.zona.dauna)
      }
      if (rule.lant?.daunaAtingerii && v !== target) hurt(v, Math.floor((contact.dauna * (rule.lant.procent ?? 100)) / 100))
    }
  }
  // Lovitura însăși (cu armura ei: de câte ori se scade, cât străpunge). Dauna din reacții e o lovitură separată.
  hurt(target, dauna, contact.lovituri ?? 1, contact.penetrare ?? 0)
  if (stare !== undefined && !blocata) applyState(target, stare)
}

/** Trece un tick peste stări: arsura lovește (trece de armură), iar stările expirate dispar. */
export function tickStates(v: Victim): void {
  for (const s of STATE_ORDER) {
    const left = v.stari[s]
    if (left === undefined) continue
    const next = left - 1
    const arsura = STATES[s].arsura
    if (arsura && next % arsura.la === 0) v.viata -= arsura.dauna
    if (next <= 0) delete v.stari[s]
    else v.stari[s] = next
  }
}

/** Viteza efectivă, în mili-hexagoane pe tick: cea mai mare încetinire dintre stări se aplică (nu se adună). */
export function enemySpeed(v: { readonly tip: EnemyType; readonly stari: States }): number {
  let slow = 0
  for (const s of STATE_ORDER) if (v.stari[s] !== undefined) slow = Math.max(slow, STATES[s].incetinire ?? 0)
  return Math.floor((ENEMIES[v.tip].viteza * (100 - slow)) / 100)
}
