// Cifrele și regulile de teren stau aici, nu împrăștiate prin cod.

import type { Element, StateType } from './reactions'

export type Terrain = 'campie' | 'apa' | 'padure' | 'deal' | 'filon' | 'ulei' | 'jar' | 'cenusa' | 'puiet'

export interface TerrainInfo {
  readonly nume: string
  readonly culoare: string
  /** Poate trece traseul peste acest teren? */
  readonly permiteTraseu: boolean
  /** Se poate construi un turn pe acest teren? */
  readonly permiteTurn: boolean
  /**
   * Terenul participă la reacții (GDD §5): un inamic care intră pe un hexagon de drum vecin cu terenul ăsta
   * e atins de `element` și primește starea `aplica` (apa udă, uleiul unge).
   */
  readonly atingere?: { readonly element: Element; readonly aplica: StateType }
  /** Rază în plus pentru turnul construit aici (dealul). */
  readonly bonusRaza?: number
  /** Aur în plus la construcția unui turn aici — prețul razei, ca dealul să nu fie evident cel mai bun. */
  readonly costTurn?: number
}

export const TERRAIN: Readonly<Record<Terrain, TerrainInfo>> = {
  campie: { nume: 'Câmpie', culoare: '#8f9d6a', permiteTraseu: true, permiteTurn: true },
  apa: { nume: 'Apă', culoare: '#3f6f9e', permiteTraseu: false, permiteTurn: false, atingere: { element: 'apa', aplica: 'ud' } },
  padure: { nume: 'Pădure', culoare: '#2f5a37', permiteTraseu: true, permiteTurn: true },
  // Propunere: +1 rază, +20 aur. Prețul ar putea fi și altul (reîncărcare mai lentă, teren mai rar).
  deal: { nume: 'Deal', culoare: '#9a7f5a', permiteTraseu: true, permiteTurn: true, bonusRaza: 1, costTurn: 20 },
  filon: { nume: 'Filon', culoare: '#7d5f8f', permiteTraseu: false, permiteTurn: true },
  // Uleiul se găsește pe hartă (decis de owner, 05.10.2026): bălți mici, departe de drumul inițial (vezi `MAP_GEN`).
  ulei: { nume: 'Baltă de ulei', culoare: '#3a3026', permiteTraseu: false, permiteTurn: false, atingere: { element: 'ulei', aplica: 'uns' } },
  // Pădurea aprinsă prin terraformare (GDD §1: „arzi pădurea de lângă drum, iar inamicii unși cu ulei explodează în
  // lanț”). Arde tot restul partidei (propunere); nu ține drum și nici turn.
  jar: { nume: 'Pădure în flăcări', culoare: '#5c2416', permiteTraseu: false, permiteTurn: false, atingere: { element: 'foc', aplica: 'arde' } },
  // Urmele lumii care ține minte (GDD §9.1, felia 9): pădurea arsă devine cenușă la partida următoare, apoi puieți,
  // apoi iar pădure (`EVOLUTIE`, `data/lume.ts`). Cenușa nu mai arde; amândouă țin drum și turn, ca o câmpie.
  cenusa: { nume: 'Cenușă', culoare: '#5f5a55', permiteTraseu: true, permiteTurn: true },
  puiet: { nume: 'Puieți', culoare: '#6f8f5a', permiteTraseu: true, permiteTurn: true },
}

/** Parametrii generatorului de hartă. */
export const MAP_GEN = {
  raza: 9,
  /** Câte treceri de netezire (fac din zgomot pete coerente: lacuri, păduri, coline). */
  netezire: 2,
  pragApa: 0.62,
  pragDeal: 0.63,
  pragPadure: 0.53,
  sansaFilon: 0.03,
  /** Câte bălți de ulei are harta și din câte hexagoane e fiecare (cel mult). */
  balti: 2,
  marimeBalta: 3,
  /**
   * La câte hexagoane de drumul INIȚIAL stă uleiul, cel puțin. Propunere: 2 — la început nimic nu e uns, iar un
   * ocol care iese un hexagon din drum spre baltă o aduce lângă drum. Uleiul devine un loc spre care modelezi drumul.
   */
  departareBalta: 2,
  /** Distanța minimă dintre centrele a două bălți, ca să nu iasă una singură, mai mare. */
  intreBalti: 5,
} as const

/** Ocolurile: cu cât lungește drumul o bucată, și cât de lungă poate fi porțiunea înlocuită. */
export const INSERARE = {
  minim: 1,
  maxim: 3,
  /**
   * Măsurat (04.10.2026, `path.test.ts`): cu regula „drumul nu se atinge singur”, pe un drum drept
   * un ocol de +k are nevoie să înlocuiască cel puțin k hexagoane — altfel capetele ocolului ajung
   * vecine între ele. Porțiune 1: doar +1; porțiune 2: +1, +2; porțiune 3: +1, +2, +3.
   */
  portiuneMaxima: 3,
  /**
   * Câte ocoluri se pun într-o pregătire (decis de owner, 05.10.2026: unul pe val, obligatoriu). Upgrade-urile
   * de mai târziu (draft, relicve) cresc valoarea din stare — `GameState.ocoluriPeVal` — nu pe cea de aici.
   */
  peVal: 1,
} as const
