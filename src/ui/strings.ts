// Toate textele jocului, în română. Nicio altă parte a codului nu scrie text pentru jucător.
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
  ruleMove: string
  ruleGather: string
  ruleInvest: string
  ruleFight: string
  start: string
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
  ruleMove: 'Ține degetul pe ecran și trage. Nava merge încotro tragi.',
  ruleGather: 'Stai lângă cristale și asteroizi ca să strângi cristale și metal.',
  ruleInvest: 'Oprește-te pe un cerc punctat ca să investești în turele, colector, mină sau navă.',
  ruleFight: 'Nava lovește singură ce e aproape. Partida ține până cade planeta.',
  start: 'Începe',
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
  mods: {
    wave: { name: 'Undă', fresh: [], up: 'Mai lată și mai puternică.' },   // e pe navă de la început: nu se oferă ca nouă
    laser: { name: 'Laser', fresh: ['Un dușman, de departe.', 'Bun contra navelor grele.'], up: 'Lovește mai tare.' },
    missile: { name: 'Rachete', fresh: ['Lente, lovesc o zonă.', 'Bune contra grupurilor.'], up: 'Explozie mai puternică.' },
    armor: { name: 'Blindaj', fresh: ['Mai multă viață.'], up: 'Și mai multă viață.' },
    shield: { name: 'Scut', fresh: ['Oprește o lovitură', 'la câteva secunde.'], up: 'Se reface mai repede.' },
    mender: { name: 'Reparator', fresh: ['Te refaci mai repede.'], up: 'Te refaci și mai repede.' },
    engine: { name: 'Motor', fresh: ['Nava merge mai repede.'], up: 'Și mai repede.' },
    magnet: { name: 'Magnet', fresh: ['Strângi de mai departe.'], up: 'Mai departe și mai iute.' },
    relay: { name: 'Releu', fresh: ['Turelele de lângă navă', 'trag mai repede.'], up: 'Trag și mai repede.' },
  },
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
}
