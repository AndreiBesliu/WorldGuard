// Draftul: după fiecare val alegi 1 carte din 3 (GDD §4: „o bucată de traseu, un turn, o îmbunătățire sau o
// relicvă”). Cărțile sunt date, nu cod: efectele lor le aplică `applyDecision` (decizia `alege`).
// Ce cărți există și cu cât schimbă jocul e propunerea mea, de măsurat cu botul (DEVLOG, felia 5).

import type { TowerType } from './towers'

export type CardEffect =
  /** Următorul turn de tipul ăsta nu costă nimic (nici dealul). */
  | { readonly tip: 'turn'; readonly turn: TowerType }
  /** Îmbunătățire permanentă pe toate turnurile de un tip; procentele se adună de la o carte la alta. */
  | { readonly tip: 'imbunatatire'; readonly turn: TowerType; readonly dauna?: number; readonly reincarcare?: number }
  /** Relicvă: efect permanent, o singură dată pe partidă. */
  | { readonly tip: 'relicva'; readonly ocoluriPeVal?: number; readonly vieti?: number }
  /** Bucată de traseu: ocoluri în plus în pregătirea asta (obligatorii, ca primul). */
  | { readonly tip: 'traseu'; readonly ocoluri: number }

export interface CardInfo {
  readonly nume: string
  readonly descriere: string
  readonly efect: CardEffect
}

export const CARDS = {
  'turn-fizic': { nume: 'Fizic gratuit', descriere: 'următorul turn Fizic nu costă nimic', efect: { tip: 'turn', turn: 'fizic' } },
  'turn-foc': { nume: 'Foc gratuit', descriere: 'următorul turn Foc nu costă nimic', efect: { tip: 'turn', turn: 'foc' } },
  'turn-frig': { nume: 'Frig gratuit', descriere: 'următorul turn Frig nu costă nimic', efect: { tip: 'turn', turn: 'frig' } },
  'turn-fulger': { nume: 'Fulger gratuit', descriere: 'următorul turn Fulger nu costă nimic', efect: { tip: 'turn', turn: 'fulger' } },
  'fizic-dauna': { nume: 'Fizic: proiectile grele', descriere: '+25% daună la toate turnurile Fizic', efect: { tip: 'imbunatatire', turn: 'fizic', dauna: 25 } },
  'fizic-ritm': { nume: 'Fizic: mecanism uns', descriere: 'turnurile Fizic trag cu 20% mai des', efect: { tip: 'imbunatatire', turn: 'fizic', reincarcare: 20 } },
  'foc-dauna': { nume: 'Foc: flacără albă', descriere: '+25% daună la toate turnurile Foc', efect: { tip: 'imbunatatire', turn: 'foc', dauna: 25 } },
  'foc-ritm': { nume: 'Foc: foale', descriere: 'turnurile Foc trag cu 20% mai des', efect: { tip: 'imbunatatire', turn: 'foc', reincarcare: 20 } },
  'frig-dauna': { nume: 'Frig: ger', descriere: '+25% daună la toate turnurile Frig', efect: { tip: 'imbunatatire', turn: 'frig', dauna: 25 } },
  'frig-ritm': { nume: 'Frig: viscol', descriere: 'turnurile Frig trag cu 20% mai des', efect: { tip: 'imbunatatire', turn: 'frig', reincarcare: 20 } },
  'fulger-dauna': { nume: 'Fulger: tunet', descriere: '+25% daună la toate turnurile Fulger', efect: { tip: 'imbunatatire', turn: 'fulger', dauna: 25 } },
  'fulger-ritm': { nume: 'Fulger: furtună', descriere: 'turnurile Fulger trag cu 20% mai des', efect: { tip: 'imbunatatire', turn: 'fulger', reincarcare: 20 } },
  cartograful: { nume: 'Cartograful', descriere: '+1 ocol în fiecare pregătire (toate obligatorii)', efect: { tip: 'relicva', ocoluriPeVal: 1 } },
  bastionul: { nume: 'Bastionul', descriere: '+5 vieți', efect: { tip: 'relicva', vieti: 5 } },
  'ocol-in-plus': { nume: 'Ocol în plus', descriere: 'încă un ocol în pregătirea asta (obligatoriu)', efect: { tip: 'traseu', ocoluri: 1 } },
} as const satisfies Record<string, CardInfo>

export type CardId = keyof typeof CARDS

/** Ordinea fixă a cărților (din care trage oferta). */
export const CARD_IDS = Object.keys(CARDS) as CardId[]

export const DRAFT = {
  /** Câte cărți are o ofertă. */
  marime: 3,
  /**
   * Câte cărți din ofertă vin din AFARA stilului tău: turnuri sau îmbunătățiri pentru tipuri pe care nu le ai (GDD §6:
   * „draftul ține cont de ce ai, dar oferă mereu și o carte din afara stilului tău”). Restul sunt din stil: pentru
   * tipurile pe care le ai, plus relicvele și traseul.
   */
  dinAfara: 1,
} as const

/** Tipul de turn de care ține o carte (turn gratuit, îmbunătățire), dacă ține de unul. */
export function cardTower(id: CardId): TowerType | undefined {
  const e: CardEffect = CARDS[id].efect
  return e.tip === 'turn' || e.tip === 'imbunatatire' ? e.turn : undefined
}
