// Turnurile de bază — date, nu cod. Balansul se face aici.
//
// Fiecare turn are un rol din cifre (lovitură grea / dese / pe zonă / bătaie lungă) și, din felia 3, un
// ELEMENT: lovitura lui atinge inamicul cu elementul ăsta, iar regulile din `reactions.ts` decid ce se întâmplă
// cu stările pe care le poartă deja. Unele turnuri lasă și o stare (Foc: arde, Frig: răcit).
// Cifrele sunt o primă trecere, măsurată cu un bot simplu (DEVLOG, felia 2) — nu un balans.
// Unități: `raza` în hexagoane (distanța pe grilă până la hexagonul inamicului), `reincarcare` în tick-uri.

import type { Element, StateType } from './reactions'

export type TowerType = 'fizic' | 'foc' | 'frig' | 'fulger'

export type TowerShape = 'patrat' | 'triunghi' | 'cerc' | 'romb'

export interface TowerInfo {
  readonly nume: string
  readonly cost: number
  /** Dauna unei lovituri, înainte de armura inamicului. */
  readonly dauna: number
  readonly raza: number
  /** Câte tick-uri trec între două lovituri. */
  readonly reincarcare: number
  /** `true` = lovește toți inamicii din rază deodată; nu are țintă de ales. */
  readonly zona: boolean
  /** Cu ce atinge lovitura inamicul — de asta depind reacțiile. */
  readonly element: Element
  /** Starea pe care o lasă lovitura (dacă o reacție n-o blochează sau n-o înlocuiește). */
  readonly aplica?: StateType
  readonly descriere: string
  readonly culoare: string
  readonly forma: TowerShape
}

/** Ordinea din UI (tastele 4–7). */
export const TOWER_TYPES: readonly TowerType[] = ['fizic', 'foc', 'frig', 'fulger']

export const TOWERS: Readonly<Record<TowerType, TowerInfo>> = {
  fizic: {
    nume: 'Fizic',
    cost: 55,
    dauna: 40,
    raza: 2,
    reincarcare: 30,
    zona: false,
    element: 'impact',
    descriere: 'lovitură grea și rară — trece de armură',
    culoare: '#c9b68f',
    forma: 'patrat',
  },
  foc: {
    nume: 'Foc',
    cost: 60,
    dauna: 9,
    raza: 2,
    reincarcare: 5,
    zona: false,
    element: 'foc',
    aplica: 'arde',
    descriere: 'lovituri dese și mici, aprinde — arsura trece de armură',
    culoare: '#e8743b',
    forma: 'triunghi',
  },
  frig: {
    nume: 'Frig',
    cost: 55,
    dauna: 8,
    raza: 1,
    reincarcare: 8,
    zona: true,
    element: 'frig',
    aplica: 'racit',
    descriere: 'lovește toți inamicii de lângă el și îi încetinește',
    culoare: '#7fd3f7',
    forma: 'cerc',
  },
  fulger: {
    nume: 'Fulger',
    cost: 70,
    dauna: 36,
    raza: 3,
    reincarcare: 24,
    zona: false,
    element: 'fulger',
    descriere: 'bătaie lungă',
    culoare: '#b48cff',
    forma: 'romb',
  },
}

/**
 * Pe cine țintește un turn cu țintă unică. Egalitățile se rup mereu la fel (vezi `pickTarget`), ca
 * simularea să rămână deterministă.
 */
export type TargetMode = 'primul' | 'ultimul' | 'puternic' | 'slab'

export const TARGET_MODES: readonly TargetMode[] = ['primul', 'ultimul', 'puternic', 'slab']

export const TARGET_NAMES: Readonly<Record<TargetMode, string>> = {
  primul: 'primul (cel mai aproape de bază)',
  ultimul: 'ultimul (cel mai departe de bază)',
  puternic: 'cel mai puternic (viață rămasă)',
  slab: 'cel mai slab (viață rămasă)',
}

/**
 * Aurul cu care pornești. Economia completă (dobânda, pământul) vine în felia 5; până atunci aurul
 * vine doar din inamicii uciși (GDD §7) și se cheltuie doar pe turnuri.
 */
export const AUR_START = 120
