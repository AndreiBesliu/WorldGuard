// Cifrele și regulile de teren stau aici, nu împrăștiate prin cod.

export type Terrain = 'campie' | 'apa' | 'padure' | 'deal' | 'filon'

export interface TerrainInfo {
  readonly nume: string
  readonly culoare: string
  /** Poate trece traseul peste acest teren? */
  readonly permiteTraseu: boolean
  /** Se poate construi un turn pe acest teren? */
  readonly permiteTurn: boolean
}

export const TERRAIN: Readonly<Record<Terrain, TerrainInfo>> = {
  campie: { nume: 'Câmpie', culoare: '#8f9d6a', permiteTraseu: true, permiteTurn: true },
  apa: { nume: 'Apă', culoare: '#3f6f9e', permiteTraseu: false, permiteTurn: false },
  padure: { nume: 'Pădure', culoare: '#2f5a37', permiteTraseu: true, permiteTurn: true },
  deal: { nume: 'Deal', culoare: '#9a7f5a', permiteTraseu: true, permiteTurn: true },
  filon: { nume: 'Filon', culoare: '#7d5f8f', permiteTraseu: false, permiteTurn: true },
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
   * Câte ocoluri se pot pune într-o pregătire (decis de owner, 05.10.2026: unul pe val). Upgrade-urile de mai
   * târziu (draft, relicve) cresc valoarea din stare — `GameState.ocoluriPeVal` — nu pe cea de aici.
   */
  peVal: 1,
} as const
