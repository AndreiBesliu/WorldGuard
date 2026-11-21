// Toate textele jocului, în română. Nicio altă parte a codului nu scrie text pentru jucător.
import type { FlightModId } from '../data/flight'
import { MAX_TIER, type ModId, type ModKind } from '../data/modules'
import type { PadKind } from '../sim/state'

export interface Strings {
  fieldLabel: string
  title: string
  pad: Record<PadKind, string>
  padLevel(name: string, n: number): string
  padMax(name: string): string
  repairCost(heal: number): string
  gain: string
  heroDown: string
  crystal: string
  metal: string
  core: string
  hint: string
  fpsLabel(now: number, min: number): string
  /** Cartonașul de start: cele două moduri, cu rândul de explicație al fiecăruia, sectorul ales și rezerva. */
  defend: string
  defendLine: string
  /** Rândul lui „Apără planeta” cât e o partidă salvată: apăsat, o înlocuiește. */
  defendFresh: string
  explore: string
  exploreLine: string
  sectorN(n: number): string
  sectorLess: string
  sectorMore: string
  reserve: string
  workshop: string
  stress: string
  overTitle: string
  overSurvived: string
  record: string
  recordNew: string
  overKills: string
  again: string
  pause: string
  pauseTitle: string
  pauseSoFar: string
  resume: string
  fresh: string
  continueSaved(time: string): string
  /** Modulele navei: numele, rândurile pentru „nou” (cel mult două) și rândul pentru „întărire”. */
  mods: Record<ModId, { name: string; fresh: string[]; up: string }>
  kind: Record<ModKind, string>
  offerNew: string
  offerUp: string
  tierLine(t: number): string
  chooseTitle: string
  levelN(n: number): string
  chooseNote: string
  /** Experiența strânsă și pragul nivelului următor, din bandă și de sub cercul navei. */
  xpOf(a: number, b: number): string
  /** Pragul e atins: nivelul de după cel de acum e gata de plătit. */
  levelReady(n: number): string
  levelMax: string
  /** Sfârșitul zborului (titlul pentru nava doborâtă e `heroDown`) și pauza lui. */
  explored: string
  broughtHome: string
  gotSoFar: string
  nextSector: string
  flyAgain: string
  backHome: string
  flightPauseTitle: string
  flightSoFar: string
  quitFlight: string
  /** Banda din zbor: numele modulelor (cele care sunt și la apărare au același nume), nava de elită și rândul „ai cules”. */
  flightMods: Record<FlightModId, string>
  elite: string
  tookRepair: string
  tookNew(name: string): string
  tookTier(name: string, n: number): string
  tookMaxed(name: string, crystal: number): string
}

const MODS: Strings['mods'] = {
  wave: { name: 'Undă', fresh: [], up: 'Mai lată și mai puternică.' },   // e pe navă de la început: nu se oferă ca nouă
  laser: { name: 'Laser', fresh: ['Un dușman, de departe.', 'Bun contra navelor grele.'], up: 'Lovește mai tare.' },
  missile: { name: 'Rachete', fresh: ['Lente, lovesc o zonă.', 'Bune contra grupurilor.'], up: 'Explozie mai puternică.' },
  armor: { name: 'Blindaj', fresh: ['Mai multă viață.'], up: 'Și mai multă viață.' },
  shield: { name: 'Scut', fresh: ['Oprește o lovitură', 'la câteva secunde.'], up: 'Se reface mai repede.' },
  mender: { name: 'Reparator', fresh: ['Te refaci mai repede.'], up: 'Te refaci și mai repede.' },
  engine: { name: 'Motor', fresh: ['Nava merge mai repede.'], up: 'Și mai repede.' },
  magnet: { name: 'Magnet', fresh: ['Strângi de mai departe.'], up: 'Mai departe și mai iute.' },
  relay: { name: 'Releu', fresh: ['Turelele de lângă navă', 'trag mai repede.'], up: 'Trag și mai repede.' },
}

export const STR: Strings = {
  fieldLabel: 'Zona de joc',
  title: 'World Guard',
  pad: { turret: 'Turelă', collector: 'Colector', mine: 'Mină', hero: 'Navă', repair: 'Repară planeta' },
  padLevel: (name, n) => `${name} nivel ${n}`,
  padMax: (name) => `${name} · nivel maxim`,
  repairCost: (heal) => `1 = +${heal} viață`,
  gain: '+1',
  heroDown: 'Nava a fost doborâtă',
  crystal: 'cristale',
  metal: 'metal',
  core: 'Planetă',
  fpsLabel: (now, min) => `TEST · ${now} fps · min ${min}`,
  hint: 'Ține degetul pe ecran și trage ca să miști nava',
  defend: 'Apără planeta',
  defendLine: 'Strânge, construiește și rezistă cât poți.',
  defendFresh: 'Partidă nouă: cea salvată se pierde.',
  explore: 'Explorează galaxia',
  exploreLine: 'Zboară trei minute, ferește-te și adu resurse acasă.',
  sectorN: (n) => `Sectorul ${n}`,
  sectorLess: 'Un sector mai aproape',
  sectorMore: 'Un sector mai departe',
  reserve: 'Rezerva',
  workshop: 'Atelier',
  stress: 'Test de viteză',
  overTitle: 'Planeta a căzut',
  overSurvived: 'Ai rezistat',
  record: 'Record',
  recordNew: 'Record nou',
  overKills: 'Nave doborâte',
  again: 'Încă o partidă',
  pause: 'Pauză',
  pauseTitle: 'Pauză',
  pauseSoFar: 'Ai rezistat până acum',
  resume: 'Continuă',
  fresh: 'Partidă nouă',
  continueSaved: (time) => `Continuă partida · ${time}`,
  mods: MODS,
  kind: { weapon: 'Armă', body: 'Corp', utility: 'Utilitar' },
  offerNew: 'Nou',
  offerUp: 'Întărire',
  tierLine: (t) => `Treapta ${t} din ${MAX_TIER}`,
  chooseTitle: 'Alege un modul',
  levelN: (n) => `Nivel ${n}`,
  chooseNote: 'Jocul stă pe loc cât alegi.',
  xpOf: (a, b) => `experiență ${a}/${b}`,
  levelReady: (n) => `Nivel ${n} gata`,
  levelMax: 'Nivel maxim',
  explored: 'Sector explorat',
  broughtHome: 'Ai adus acasă',
  gotSoFar: 'Ai apucat să strângi',
  nextSector: 'Sectorul următor',
  flyAgain: 'Încă un zbor',
  backHome: 'Înapoi la start',
  flightPauseTitle: 'Zbor în pauză',
  flightSoFar: 'Ai strâns până acum',
  quitFlight: 'Renunță la zbor',
  flightMods: { gun: 'Tun', laser: MODS.laser.name, missile: MODS.missile.name, shield: MODS.shield.name, magnet: MODS.magnet.name },
  elite: 'Elită',
  tookRepair: 'Reparație · +1 viață',
  tookNew: (name) => `${name} · nou`,
  tookTier: (name, n) => `${name} · treapta ${n}`,
  tookMaxed: (name, crystal) => `${name} e la maxim · +${crystal} cristale`,
}
