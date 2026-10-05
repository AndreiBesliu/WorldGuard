// Lumea care ține minte (GDD §9.1, stratul C; felia 9). Toate cifrele de aici sunt propunerea mea, de decis cu owner-ul.
//
// O planetă e un ciclu de regiuni; fiecare regiune e o partidă. Terenul unei regiuni păstrează ce i-ai făcut, de la o
// partidă la alta, și evoluează după ceasul lumii — timpul jucat pe planetă, în tick-uri (20 pe secundă).

import type { Terraform } from './economie'
import type { Terrain } from './terrain'

export const LUME = {
  /** Versiunea generatorului, fixată pe planetă: un generator schimbat nu strică planetele vechi. */
  versiuneGenerator: 1,
  /** Raza planetei, în regiuni: 1 = inima în centru și 6 regiuni în jurul ei. */
  raza: 1,
  /** Regiunea de start (vestul, de unde vin inamicii pe orice hartă). */
  start: { q: -1, r: 0 },
  /** Câte regiuni din jur trebuie salvate ca inima planetei să se deschidă (GDD: 6–10 partide pe planetă). */
  pentruInima: 5,
} as const

/** Un minut de joc, în tick-uri (ceasul lumii). */
const MINUT = 20 * 60

/**
 * Cum evoluează un hexagon modelat, după ceasul lumii: etapele prin care trece, cu momentul (tick-uri de la editare)
 * de la care începe fiecare. Ultima editare a unui hexagon îi dă etapele. Prima etapă e terenul din partida în care
 * s-a făcut; `dupa: 1` = de la partida următoare.
 */
export const EVOLUTIE: Readonly<Record<Terraform, readonly { readonly dupa: number; readonly teren: Terrain }[]>> = {
  arde: [
    { dupa: 0, teren: 'jar' },
    { dupa: 1, teren: 'cenusa' },
    { dupa: 40 * MINUT, teren: 'puiet' },
    { dupa: 80 * MINUT, teren: 'padure' },
  ],
  // Canalul se colmatează.
  canal: [
    { dupa: 0, teren: 'apa' },
    { dupa: 60 * MINUT, teren: 'campie' },
  ],
  deal: [{ dupa: 0, teren: 'deal' }],
}
