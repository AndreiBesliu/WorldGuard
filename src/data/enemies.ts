// Inamicii și valurile — date, nu cod. Balansul se face aici.
//
// Unități: viteza e în MILI-HEXAGOANE PE TICK (1000 = un hexagon întreg). Pozițiile din simulare sunt
// întregi, ca să nu existe nicio derivă de virgulă mobilă între un replay și altul.

import type { StateType } from './reactions'

export type EnemyType = 'normal' | 'rapid' | 'blindat' | 'roi' | 'boss'

export interface EnemyInfo {
  readonly nume: string
  readonly viata: number
  /** mili-hexagoane pe tick; la 20 tick/s, 40 = 0,8 hexagoane pe secundă */
  readonly viteza: number
  /** câte vieți ia bazei dacă ajunge la ea */
  readonly dauna: number
  /** se scade din fiecare lovitură primită (minimum 1 daună trece mereu) */
  readonly armura: number
  /** aurul primit când e ucis */
  readonly aur: number
  readonly culoare: string
  /** mărimea desenului, ca fracție din raza unui hexagon */
  readonly marime: number
}

export const ENEMIES: Readonly<Record<EnemyType, EnemyInfo>> = {
  normal: { nume: 'Normal', viata: 100, viteza: 40, dauna: 1, armura: 0, aur: 6, culoare: '#e8e2d4', marime: 0.32 },
  rapid: { nume: 'Rapid', viata: 60, viteza: 75, dauna: 1, armura: 0, aur: 5, culoare: '#f2c94c', marime: 0.26 },
  blindat: { nume: 'Blindat', viata: 260, viteza: 24, dauna: 2, armura: 8, aur: 12, culoare: '#8a96a3', marime: 0.4 },
  roi: { nume: 'Roi', viata: 30, viteza: 55, dauna: 1, armura: 0, aur: 2, culoare: '#c77dff', marime: 0.2 },
  // Bossul e mare și lent; ce-l face greu sunt trăsăturile din valul lui (vezi `TRAITS` și `WAVES`).
  boss: { nume: 'Boss', viata: 2000, viteza: 18, dauna: 10, armura: 5, aur: 100, culoare: '#e5533d', marime: 0.6 },
}

/**
 * Trăsăturile unui grup de inamici: îi fac imuni la anumite stări, ca un val să contracareze o combinație anume
 * (GDD §6: „valuri cu trăsături care contracarează anumite etichete — imun la foc, uscat, greu de înghețat”).
 * Imunitatea oprește starea, deci și reacțiile care pornesc de la ea (fără ud: fără îngheț, fără electrocutare).
 */
export type Trait = 'uscat' | 'neclintit' | 'ignifug'

export interface TraitInfo {
  readonly nume: string
  /** Stările care nu se prind de inamic. */
  readonly imun: readonly StateType[]
  readonly descriere: string
}

export const TRAITS: Readonly<Record<Trait, TraitInfo>> = {
  uscat: { nume: 'Uscat', imun: ['ud'], descriere: 'nu poate fi udat: nici îngheț, nici electrocutare' },
  neclintit: { nume: 'Neclintit', imun: ['racit', 'inghetat'], descriere: 'frigul nu-l încetinește și nu-l îngheață' },
  ignifug: { nume: 'Ignifug', imun: ['arde', 'uns'], descriere: 'nu ia foc și nu se unge: nici arsură, nici explozie' },
}

export interface WaveGroup {
  readonly tip: EnemyType
  readonly numar: number
  /** tick-uri între doi inamici din grup */
  readonly interval: number
  /** tick-uri de la pornirea valului până la primul inamic din grup */
  readonly intarziere: number
  /** Trăsăturile inamicilor din grup. */
  readonly trasaturi?: readonly Trait[]
}

export interface Wave {
  readonly grupuri: readonly WaveGroup[]
  /** multiplicator de viață pentru toți inamicii valului */
  readonly viata: number
}

const g = (tip: EnemyType, numar: number, interval: number, intarziere = 0, trasaturi?: readonly Trait[]): WaveGroup => ({
  tip,
  numar,
  interval,
  intarziere,
  ...(trasaturi ? { trasaturi } : {}),
})

/**
 * Cele 15 valuri ale prototipului. Bossul apare la valurile 5, 10 și 15 (decis de owner), fiecare cu trăsături care
 * contracarează altă combinație (propunere): la 5 apa (uscat), la 10 frigul (neclintit), la 15 doi bossi — focul
 * (ignifug) și apa cu frigul (uscat, neclintit).
 * Prima versiune, scrisă de mână — se echilibrează după ce există turnuri.
 */
export const WAVES: readonly Wave[] = [
  { viata: 1.0, grupuri: [g('normal', 8, 24)] },
  { viata: 1.0, grupuri: [g('normal', 10, 20), g('rapid', 4, 30, 120)] },
  { viata: 1.1, grupuri: [g('roi', 12, 8), g('normal', 6, 24, 80)] },
  { viata: 1.15, grupuri: [g('blindat', 4, 40), g('normal', 10, 18, 40)] },
  { viata: 1.2, grupuri: [g('normal', 10, 18), g('boss', 1, 1, 160, ['uscat'])] },
  { viata: 1.3, grupuri: [g('rapid', 12, 14), g('roi', 16, 6, 60)] },
  { viata: 1.4, grupuri: [g('blindat', 6, 30), g('normal', 14, 14, 30)] },
  { viata: 1.5, grupuri: [g('roi', 24, 5), g('rapid', 10, 12, 80)] },
  { viata: 1.6, grupuri: [g('blindat', 8, 26), g('rapid', 10, 12, 100), g('normal', 10, 14, 40)] },
  { viata: 1.75, grupuri: [g('normal', 14, 14), g('boss', 1, 1, 120, ['neclintit']), g('roi', 16, 6, 200)] },
  { viata: 1.9, grupuri: [g('rapid', 18, 10), g('blindat', 8, 24, 60)] },
  { viata: 2.05, grupuri: [g('roi', 32, 4), g('normal', 16, 12, 60)] },
  { viata: 2.2, grupuri: [g('blindat', 12, 20), g('rapid', 16, 10, 80)] },
  { viata: 2.4, grupuri: [g('normal', 20, 10), g('roi', 24, 5, 40), g('blindat', 8, 22, 120)] },
  { viata: 2.6, grupuri: [g('blindat', 10, 20), g('rapid', 16, 10, 60), g('boss', 1, 1, 200, ['ignifug']), g('boss', 1, 1, 320, ['uscat', 'neclintit'])] },
]

/**
 * Cât crește viața inamicilor de la un val la altul, în procente, peste multiplicatorul valului (felia 5, măsurat cu
 * botul — propunere): cărțile din draft cresc puterea jucătorului cu fiecare val, deci și valurile trebuie să crească.
 * Viața din valul i (numărat de la 0) se înmulțește cu 1 + CRESTERE_VIATA × i / 100.
 */
export const CRESTERE_VIATA = 20

/** Rezumat scurt pentru previzualizarea valului: „10 Normal, 4 Rapid”. */
export function describeWave(w: Wave): string {
  const counts = new Map<EnemyType, number>()
  for (const grp of w.grupuri) counts.set(grp.tip, (counts.get(grp.tip) ?? 0) + grp.numar)
  return [...counts].map(([tip, n]) => `${n} ${ENEMIES[tip].nume}`).join(', ')
}
