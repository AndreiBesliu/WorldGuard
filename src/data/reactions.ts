// Stările de pe inamici și reacțiile dintre ele — date, nu cod (GDD §5, §6).
//
// Regulile se scriu pe ETICHETE, nu pe perechi de turnuri: o reacție se declanșează când un element (lovitura
// unui turn sau terenul de lângă drum) atinge un inamic care poartă o stare cu o anumită etichetă. O stare nouă
// cu eticheta „inflamabil” (de exemplu o viitoare „smoală”) explodează la foc fără nicio linie de cod nouă.
//
// Unități: durate în tick-uri (20 pe secundă), încetinirea în procente din viteză.
// Cifrele sunt o primă trecere (propunere), măsurată cu botul — nu un balans.

export type StateType = 'arde' | 'ud' | 'racit' | 'inghetat' | 'uns' | 'impotmolit' | 'grabit'

export type Tag = 'fierbinte' | 'ud' | 'conductor' | 'rece' | 'fragil' | 'inflamabil'

/** Ce atinge un inamic: lovitura unui turn sau terenul de lângă drum. */
export type Element = 'impact' | 'foc' | 'frig' | 'fulger' | 'apa' | 'ulei' | 'noroi'

export interface StateInfo {
  readonly nume: string
  /** Câte tick-uri ține; o aplicare nouă o reîmprospătează (nu se adună). */
  readonly durata: number
  readonly etichete: readonly Tag[]
  /** Cu câte procente încetinește inamicul (100 = stă pe loc). */
  readonly incetinire?: number
  /** Cu câte procente îl grăbește (se înmulțește cu încetinirea: unul înghețat tot stă pe loc). */
  readonly grabire?: number
  /** Daună în timp: `dauna` la fiecare `la` tick-uri. Trece de armură (propunere). */
  readonly arsura?: { readonly la: number; readonly dauna: number }
  readonly culoare: string
}

export const STATES: Readonly<Record<StateType, StateInfo>> = {
  arde: { nume: 'Arde', durata: 60, etichete: ['fierbinte'], arsura: { la: 10, dauna: 6 }, culoare: '#ff8a3d' },
  ud: { nume: 'Ud', durata: 60, etichete: ['ud', 'conductor'], culoare: '#4aa3ff' },
  // „Înghețat parțial” din GDD: încetinit, nu oprit.
  racit: { nume: 'Răcit', durata: 40, etichete: ['rece'], incetinire: 25, culoare: '#bfefff' },
  inghetat: { nume: 'Înghețat', durata: 15, etichete: ['rece', 'fragil'], incetinire: 100, culoare: '#ffffff' },
  uns: { nume: 'Uns cu ulei', durata: 200, etichete: ['inflamabil'], culoare: '#6b4f2a' },
  // Urmele cu două tăișuri (felia 10, propunere): noroiul de lângă drum încetinește; apa îi grăbește pe amfibii.
  impotmolit: { nume: 'Împotmolit', durata: 60, etichete: [], incetinire: 35, culoare: '#7a5c3a' },
  grabit: { nume: 'Grăbit', durata: 40, etichete: [], grabire: 40, culoare: '#3fbfa0' },
}

/** Cum se citește o etichetă în textele din joc („… pe un inamic ud”). */
export const TAG_NAMES: Readonly<Record<Tag, string>> = {
  fierbinte: 'care arde',
  ud: 'ud',
  conductor: 'ud',
  rece: 'răcit sau înghețat',
  fragil: 'înghețat',
  inflamabil: 'uns cu ulei',
}

export const ELEMENT_NAMES: Readonly<Record<Element, string>> = {
  impact: 'lovitură fizică',
  foc: 'foc',
  frig: 'frig',
  fulger: 'fulger',
  apa: 'apă',
  ulei: 'ulei',
  noroi: 'noroi',
}

export type ReactionType = 'explozie' | 'abur' | 'dezghet' | 'inghet' | 'spargere' | 'electrocutare'

export interface ReactionInfo {
  readonly nume: string
  /** Ce face, pe scurt — apare în joc la prima descoperire și în descrierea turnurilor. */
  readonly efect: string
  readonly culoare: string
}

export const REACTIONS: Readonly<Record<ReactionType, ReactionInfo>> = {
  explozie: { nume: 'Explozie', efect: '50 de daune în jur; inamicii unși de alături explodează și ei', culoare: '#ffb347' },
  abur: { nume: 'Abur', efect: 'focul și apa se sting una pe alta', culoare: '#d8e2ea' },
  // Focul și frigul sunt incompatibile (decis de owner, 05.10.2026): se anulează, și nu se pot combina în grup.
  dezghet: { nume: 'Dezgheț', efect: 'focul și frigul se anulează', culoare: '#ffd1a8' },
  inghet: { nume: 'Îngheț', efect: 'inamicul ud îngheață de tot, 0,75 s', culoare: '#e8fbff' },
  spargere: { nume: 'Spargere', efect: 'daună ×3; gheața se sparge', culoare: '#9fe7ff' },
  electrocutare: { nume: 'Electrocutare', efect: 'fulgerul sare la cel mult 2 inamici uzi de alături, cu 35% din daună', culoare: '#c9a3ff' },
}

/**
 * O regulă: când `element` atinge un inamic cu o stare purtând eticheta `eticheta`. Efectele, în ordinea în care
 * se aplică:
 *   - `consuma`: stările cu eticheta se șterg;
 *   - `blocheaza`: starea pe care ar fi aplicat-o atingerea nu se mai aplică;
 *   - `inlocuieste`: se aplică altă stare în locul ei;
 *   - `multiplicator`: dauna atingerii se înmulțește;
 *   - `zona`: daună tuturor inamicilor până la `raza` hexagoane (inclusiv celui atins);
 *   - `lant`: reacția trece la inamicii până la `raza` care poartă aceeași etichetă, și de la ei mai departe,
 *     până la `maxim` inamici în plus; cu `daunaAtingerii`, fiecare primește `procent`% din dauna atingerii.
 */
export interface ReactionRule {
  readonly tip: ReactionType
  readonly element: Element
  readonly eticheta: Tag
  readonly consuma?: boolean
  readonly blocheaza?: boolean
  readonly inlocuieste?: StateType
  readonly multiplicator?: number
  readonly zona?: { readonly raza: number; readonly dauna: number }
  readonly lant?: { readonly raza: number; readonly maxim?: number; readonly daunaAtingerii?: boolean; readonly procent?: number }
}

/**
 * Regulile, în ordinea în care se verifică. Ud și „care arde” nu pot sta împreună (abur), deci regulile de frig
 * nu se ciocnesc între ele.
 */
export const REACTION_RULES: readonly ReactionRule[] = [
  // ulei + foc: explozie în lanț (GDD §6). Uleiul vine din bălțile de pe hartă (decis de owner, 05.10.2026).
  { tip: 'explozie', element: 'foc', eticheta: 'inflamabil', consuma: true, zona: { raza: 1, dauna: 50 }, lant: { raza: 1 } },
  // Focul anulează udul: abur, iar flacăra nu mai prinde.
  { tip: 'abur', element: 'foc', eticheta: 'ud', consuma: true, blocheaza: true },
  // …și apa stinge focul: se sting amândouă.
  { tip: 'abur', element: 'apa', eticheta: 'fierbinte', consuma: true, blocheaza: true },
  // Focul anulează frigul: gheața se topește, flacăra prinde.
  { tip: 'dezghet', element: 'foc', eticheta: 'rece', consuma: true },
  // …iar frigul stinge focul, dar nu prinde nici el.
  { tip: 'dezghet', element: 'frig', eticheta: 'fierbinte', consuma: true, blocheaza: true },
  // ud + frig: îngheț de tot, în loc de răcit.
  { tip: 'inghet', element: 'frig', eticheta: 'ud', consuma: true, inlocuieste: 'inghetat' },
  // înghețat + impact: spargere, consumă înghețul.
  { tip: 'spargere', element: 'impact', eticheta: 'fragil', consuma: true, multiplicator: 3 },
  // ud + fulger: electrocutare, sare la vecinii uzi; udul rămâne. Limitată (măsurat, DEVLOG felia 3): fără limită,
  // pe hărțile cu multă apă fulgerul singur câștiga fără să piardă vreo viață.
  { tip: 'electrocutare', element: 'fulger', eticheta: 'conductor', lant: { raza: 1, maxim: 2, daunaAtingerii: true, procent: 35 } },
]
