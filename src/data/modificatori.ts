// Modificatorii de dificultate (GDD §9.2; felia 11). Dificultatea implicită e fixă; după ce salvezi o regiune, la
// revenire poți alege modificatori care o fac mai grea. Fiecare modificator e o axă, cu 1–3 trepte, iar fiecare treaptă
// dă puncte de Amenințare. Toate cifrele de aici sunt propunerea mea, măsurate cu botul (DEVLOG, felia 11).
//
// Unii schimbă cifre (Hoardele, Pielea groasă, Prada săracă), alții schimbă reguli (Drumuri rare, Ceața, Avangarda de
// cenușă), iar unul ține de terenul regiunii (Sezonul inundațiilor: doar unde e apă lângă drum).

import type { EnemyType, Trait } from './enemies'

export type ModificatorId = 'hoarde' | 'piele' | 'saracie' | 'drumuri' | 'ceata' | 'avangarda' | 'inundatii'

export interface Treapta {
  /** Punctele de Amenințare pe care le dă treapta. */
  readonly amenintare: number
  /** Cifra treptei; ce înseamnă scrie la fiecare modificator. */
  readonly valoare: number
  readonly descriere: string
}

export interface ModificatorInfo {
  readonly nume: string
  /** `cifre` = aceleași reguli, alte cifre; `reguli` = altă regulă; `teren` = ține de terenul regiunii. */
  readonly fel: 'cifre' | 'reguli' | 'teren'
  readonly trepte: readonly Treapta[]
}

/** Modificatorii aleși: treapta fiecăruia (de la 1). Un modificator lipsă e neales — câte unul pe axă (GDD). */
export type Modificatori = Readonly<Partial<Record<ModificatorId, number>>>

export const MODIFICATORI: Readonly<Record<ModificatorId, ModificatorInfo>> = {
  // valoare: cu câte procente crește numărul inamicilor din fiecare grup (fără bossi). Cei în plus vin în același ritm,
  // deci grupul ține mai mult. (Măsurat: strânși în același timp, +45% costa cât +60% așa — DEVLOG, felia 11.)
  hoarde: {
    nume: 'Hoardele',
    fel: 'cifre',
    trepte: [
      { amenintare: 1, valoare: 20, descriere: '+20% inamici în fiecare grup (bossii rămân)' },
      { amenintare: 2, valoare: 40, descriere: '+40% inamici în fiecare grup (bossii rămân)' },
      { amenintare: 3, valoare: 60, descriere: '+60% inamici în fiecare grup (bossii rămân)' },
    ],
  },
  // valoare: procente de viață în plus, pentru toți inamicii. Viața contează mult (crește deja cu 20% pe val), deci
  // treptele sunt mici: +50% tăia câștigurile botului de la 105 la 41 din 120.
  piele: {
    nume: 'Pielea groasă',
    fel: 'cifre',
    trepte: [
      { amenintare: 1, valoare: 8, descriere: 'inamicii au +8% viață' },
      { amenintare: 2, valoare: 15, descriere: 'inamicii au +15% viață' },
      { amenintare: 3, valoare: 25, descriere: 'inamicii au +25% viață' },
    ],
  },
  // valoare: cu câte procente scade aurul primit pe un inamic ucis. Dobânda rămâne. Aurul e aproape tot venitul, deci și
  // aici treptele sunt mici, iar a doua dă multă amenințare.
  saracie: {
    nume: 'Prada săracă',
    fel: 'cifre',
    trepte: [
      { amenintare: 1, valoare: 10, descriere: 'un inamic ucis lasă cu 10% mai puțin aur' },
      { amenintare: 3, valoare: 20, descriere: 'un inamic ucis lasă cu 20% mai puțin aur' },
    ],
  },
  // valoare: ocolul pregătirii vine doar la fiecare al câtelea val (1 = la fiecare, ca fără modificator). Fără ocol,
  // drumul rămâne mai scurt. Cartea „Ocol în plus” merge oricând. Cel mai greu dintre ei, pe amenințare.
  drumuri: {
    nume: 'Drumuri rare',
    fel: 'reguli',
    trepte: [
      { amenintare: 3, valoare: 2, descriere: 'ocolul vine doar înaintea valurilor 1, 3, 5…' },
      { amenintare: 5, valoare: 3, descriere: 'ocolul vine doar înaintea valurilor 1, 4, 7…' },
    ],
  },
  // valoare: 1 = nu vezi ce aduce valul următor; 2 = nici dealurile nu mai văd peste ceață (fără raza în plus).
  ceata: {
    nume: 'Ceața',
    fel: 'reguli',
    trepte: [
      { amenintare: 1, valoare: 1, descriere: 'nu vezi ce aduce valul următor până nu pornește' },
      { amenintare: 2, valoare: 2, descriere: 'nu vezi valul următor, iar dealurile nu mai dau rază în plus' },
    ],
  },
  // valoare: câți inamici are avangarda fiecărui val (rapizi, ignifugi), înaintea celorlalți. Lovește în turnurile lipite
  // și combinate (măsurat: 8 pe val costă botul 4 câștiguri din 120 cu turnuri răsfirate și 39 cu turnuri lipite —
  // DEVLOG, felia 11), deci e contra unui stil, nu o greutate pentru toți. Mai târziu (de la valul 4) nu ajută.
  avangarda: {
    nume: 'Avangarda de cenușă',
    fel: 'reguli',
    trepte: [
      { amenintare: 2, valoare: 4, descriere: 'de la valul 2, fiecare val e precedat de 4 rapizi ignifugi' },
      { amenintare: 3, valoare: 8, descriere: 'de la valul 2, fiecare val e precedat de 8 rapizi ignifugi' },
    ],
  },
  // valoare: câți amfibi în plus pe val. Apa crește și ea, cu un inel: câmpiile de lângă apă se inundă (nu și drumul).
  inundatii: {
    nume: 'Sezonul inundațiilor',
    fel: 'teren',
    trepte: [{ amenintare: 2, valoare: 2, descriere: 'câmpiile de lângă apă se inundă, iar apa aduce 2 amfibi în plus pe val' }],
  },
}

/** Ordinea fixă a modificatorilor: în interfață, în amprentă și în `?mod=`. */
export const MODIFICATOR_IDS = Object.keys(MODIFICATORI) as ModificatorId[]

/** Avangarda de cenușă: cine e, cu ce trăsătură, de la ce val (numărat de la 0) și cât de des vin. */
export const AVANGARDA: { readonly tip: EnemyType; readonly trasaturi: readonly Trait[]; readonly dinValul: number; readonly interval: number } = {
  tip: 'rapid',
  trasaturi: ['ignifug'],
  dinValul: 1,
  interval: 10,
}

/**
 * Sezonul inundațiilor se poate alege doar pe o hartă cu atâtea hexagoane de apă naturală lângă drumul vechi (cât să
 * aducă și un amfibiu din apa naturală: `AMFIBII.apaNaturala.hexagoane`).
 */
export const INUNDATII_MINIM_APA = 4

/** Pragurile de Amenințare: o partidă câștigată peste prag îi dă regiunii sigiliul lui, o singură dată (GDD §9.2). */
export const PRAGURI: readonly { readonly amenintare: number; readonly sigiliu: 'bronz' | 'argint' | 'aur'; readonly nume: string }[] = [
  { amenintare: 4, sigiliu: 'bronz', nume: 'Sigiliul de bronz' },
  { amenintare: 8, sigiliu: 'argint', nume: 'Sigiliul de argint' },
  { amenintare: 12, sigiliu: 'aur', nume: 'Sigiliul de aur' },
]

/** Presetările cu un clic (GDD §9.2), câte una pe prag: fiecare ajunge exact la pragul ei. */
export const PRESETARI: Readonly<Record<'I' | 'II' | 'III', Modificatori>> = {
  I: { hoarde: 1, piele: 1, saracie: 1, ceata: 1 },
  II: { hoarde: 2, piele: 2, drumuri: 1, ceata: 1 },
  III: { hoarde: 3, piele: 2, drumuri: 1, avangarda: 2, ceata: 1 },
}
