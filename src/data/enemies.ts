// Inamicii și valurile — date, nu cod. Balansul se face aici.
//
// Unități: viteza e în MILI-HEXAGOANE PE TICK (1000 = un hexagon întreg). Pozițiile din simulare sunt
// întregi, ca să nu existe nicio derivă de virgulă mobilă între un replay și altul.

import type { StateType } from './reactions'

export type EnemyType = 'normal' | 'rapid' | 'blindat' | 'roi' | 'boss' | 'paznic' | 'amfibiu'

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
  /** Stările pe care le primește altfel: amfibiul, în loc să se ude, se grăbește. */
  readonly inLoc?: Partial<Record<StateType, StateType>>
  /** Pulsul: la fiecare `interval` tick-uri, naște `numar` inamici de tipul `tip` acolo unde e (Paznicul inimii). */
  readonly puls?: { readonly interval: number; readonly tip: EnemyType; readonly numar: number }
}

export const ENEMIES: Readonly<Record<EnemyType, EnemyInfo>> = {
  normal: { nume: 'Normal', viata: 100, viteza: 40, dauna: 1, armura: 0, aur: 6, culoare: '#e8e2d4', marime: 0.32 },
  rapid: { nume: 'Rapid', viata: 60, viteza: 75, dauna: 1, armura: 0, aur: 5, culoare: '#f2c94c', marime: 0.26 },
  blindat: { nume: 'Blindat', viata: 260, viteza: 24, dauna: 2, armura: 8, aur: 12, culoare: '#8a96a3', marime: 0.4 },
  roi: { nume: 'Roi', viata: 30, viteza: 55, dauna: 1, armura: 0, aur: 2, culoare: '#c77dff', marime: 0.2 },
  // Bossul e mare și lent; ce-l face greu sunt trăsăturile din valul lui (vezi `TRAITS` și `WAVES`).
  boss: { nume: 'Boss', viata: 2000, viteza: 18, dauna: 10, armura: 5, aur: 100, culoare: '#e5533d', marime: 0.6 },
  // Bossul inimii planetei (decis de owner, 05.10.2026: „mai greu și diferit”; cifrele sunt propunerea mea, măsurate cu
  // botul — DEVLOG, felia 9). Mai greu: de trei ori viața unui boss, armură mai mare, și ia toate viețile bazei.
  // Diferit: pulsul — naște roiuri unde se află, deci nu ajunge să-l ții în loc, trebuie ucis repede.
  paznic: {
    nume: 'Paznicul inimii',
    viata: 6000,
    viteza: 14,
    dauna: 20,
    armura: 10,
    aur: 300,
    culoare: '#ff3d6e',
    marime: 0.72,
    puls: { interval: 80, tip: 'roi', numar: 3 },
  },
  // Regiunea reacționează (GDD §9.1, felia 10, propunere): canalele săpate aduc amfibi. Apa nu-i udă, ci îi grăbește,
  // deci nici înghețul, nici electrocutarea nu pornesc de la ea pe ei. Fragili (măsurat: cu 140 de viață și armură,
  // trei pe val dărâmau partida la valul 2–3); periculoși prin viteza din apă.
  amfibiu: { nume: 'Amfibiu', viata: 70, viteza: 45, dauna: 1, armura: 0, aur: 5, culoare: '#3fbfa0', marime: 0.3, inLoc: { ud: 'grabit' } },
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
 * Cele 25 de valuri ale prototipului. Bossul apare la valurile 5, 10 și 15 (decis de owner) și, de când sunt 25 de
 * valuri, la fiecare al cincilea (20, 25 — propunere). Fiecare boss are trăsături care contracarează altă combinație
 * (propunere): la 5 apa (uscat), la 10 frigul (neclintit), la 15 focul (ignifug) și apa cu frigul, la 20 focul cu
 * frigul, la 25 trei bossi, câte unul pe fiecare.
 * Scrise de mână; viața crește și cu `CRESTERE_VIATA` (măsurat cu botul).
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
  // Valurile 16–25 (owner, 05.10.2026: „mai multe valuri”, ca partida să ajungă la 20–30 de minute). Propunere: de aici
  // au trăsături și grupurile obișnuite, ca o combinație să nu țină singură până la capăt.
  { viata: 2.75, grupuri: [g('roi', 30, 4), g('rapid', 14, 10, 60)] },
  { viata: 2.9, grupuri: [g('blindat', 12, 18), g('normal', 20, 10, 40)] },
  { viata: 3.05, grupuri: [g('rapid', 20, 8, 0, ['neclintit']), g('roi', 24, 5, 80)] },
  { viata: 3.2, grupuri: [g('normal', 24, 9), g('blindat', 10, 18, 60), g('roi', 20, 5, 160)] },
  { viata: 3.35, grupuri: [g('blindat', 10, 20), g('normal', 16, 10, 40), g('boss', 1, 1, 200, ['ignifug', 'neclintit'])] },
  { viata: 3.5, grupuri: [g('roi', 40, 3, 0, ['uscat']), g('rapid', 16, 9, 100)] },
  { viata: 3.65, grupuri: [g('blindat', 14, 16), g('rapid', 20, 8, 60)] },
  { viata: 3.8, grupuri: [g('normal', 28, 8, 0, ['ignifug']), g('roi', 30, 4, 80)] },
  { viata: 3.95, grupuri: [g('blindat', 16, 14), g('rapid', 20, 8, 40), g('normal', 20, 8, 160)] },
  {
    viata: 4.1,
    grupuri: [
      g('rapid', 20, 8),
      g('blindat', 12, 16, 60),
      g('boss', 1, 1, 200, ['uscat']),
      g('boss', 1, 1, 320, ['neclintit']),
      g('boss', 1, 1, 440, ['ignifug']),
    ],
  },
]

/**
 * Ultimul val al inimii planetei (felia 9): valul 25, cu cei trei bossi ai lui, iar după ei Paznicul inimii. Propunere,
 * măsurată cu botul.
 */
export const VAL_INIMA: Wave = {
  viata: 4.1,
  grupuri: [...(WAVES[WAVES.length - 1] as Wave).grupuri, g('paznic', 1, 1, 640)],
}

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
