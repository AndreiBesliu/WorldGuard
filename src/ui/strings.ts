// Toate textele jocului, în română. Nicio altă parte a codului nu scrie text pentru jucător.
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
}
