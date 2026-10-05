// Economia (GDD §7): aurul și pământul. Date, nu cod — balansul se face aici.
//
// - Aurul vine din inamicii uciși și din DOBÂNDĂ: la sfârșitul fiecărui val primești o parte din aurul economisit.
//   Se cheltuie pe turnuri și pe mine.
// - Pământul vine din valurile încheiate și din FILOANE exploatate (o mină pe un filon). Se cheltuie doar pe
//   TERRAFORMARE (GDD §5): sapi un canal, ridici un deal, arzi o pădure.
// Tensiunea: apărare acum sau teren mai bun pentru mai târziu. Cifrele sunt o propunere, măsurată cu botul (DEVLOG,
// felia 6).

import type { Terrain } from './terrain'

export const ECONOMIE = {
  /** Dobânda: `procent`% din aurul de la sfârșitul valului, cel mult `maxim`. Plafonul ține economisirea în frâu. */
  dobanda: { procent: 10, maxim: 30 },
  pamant: {
    /** Cu cât pământ pornești. */
    start: 3,
    /** Cât pământ aduce fiecare val încheiat. */
    peVal: 1,
    /** Cât pământ aduce, la fiecare val încheiat, fiecare mină. */
    peMina: 1,
  },
  /** O mină se sapă pe un filon, cu aur; hexagonul ei nu mai poate ține un turn. */
  mina: { costAur: 40 },
} as const

export type Terraform = 'canal' | 'deal' | 'arde'

export interface TerraformInfo {
  readonly nume: string
  /** Verbul, pentru texte: „sapi un canal”. */
  readonly verb: string
  readonly costPamant: number
  /** Pe ce teren se poate face. */
  readonly din: readonly Terrain[]
  /** Ce teren iese. */
  readonly in: Terrain
  readonly descriere: string
}

export const TERRAFORMARI: Readonly<Record<Terraform, TerraformInfo>> = {
  canal: {
    nume: 'Canal',
    verb: 'sapi un canal',
    costPamant: 2,
    din: ['campie', 'padure', 'cenusa', 'puiet'],
    in: 'apa',
    descriere: 'devine apă: inamicii de pe drumul vecin se udă',
  },
  deal: {
    nume: 'Deal',
    verb: 'ridici un deal',
    costPamant: 3,
    din: ['campie', 'padure', 'cenusa', 'puiet'],
    in: 'deal',
    descriere: 'devine deal: turnul de pe el bate cu 1 mai departe',
  },
  arde: {
    nume: 'Arde pădurea',
    verb: 'aprinzi pădurea',
    costPamant: 2,
    din: ['padure'],
    in: 'jar',
    descriere: 'pădurea arde: inamicii de pe drumul vecin iau foc, iar cei unși cu ulei explodează',
  },
}

/** Ordinea din UI (tastele Q, W, E). */
export const TERRAFORM_TYPES: readonly Terraform[] = ['canal', 'deal', 'arde']
