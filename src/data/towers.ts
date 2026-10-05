// Turnurile de bază — date, nu cod. Balansul se face aici.
//
// Felia 2 le dă doar lovitura și ținta. Fiecare turn are deja un rol din cifre (lovitură grea / dese /
// pe zonă / bătaie lungă); stările pe care le lasă pe inamici (arde, ud, înghețat…) vin în felia 3.
// Cifrele sunt o primă trecere, măsurată cu un bot simplu (DEVLOG, felia 2) — nu un balans.
// Unități: `raza` în hexagoane (distanța pe grilă până la hexagonul inamicului), `reincarcare` în tick-uri.

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
    descriere: 'lovituri dese și mici — slab contra armurii',
    culoare: '#e8743b',
    forma: 'triunghi',
  },
  frig: {
    nume: 'Frig',
    cost: 55,
    dauna: 12,
    raza: 1,
    reincarcare: 8,
    zona: true,
    descriere: 'lovește toți inamicii de lângă el — bun contra roiului',
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

/**
 * Turnurile nu blochează drumul (decis de owner, 05.10.2026). Ce se întâmplă cu turnul din cale e o
 * propunere: ocolul îl ridică și dă înapoi fracțiunea asta din cost — acum tot. (Alternativa: turnul se mută.)
 */
export const RAMBURSARE_OCOL = 1
