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
  wood: string
  stone: string
  castle: string
  hint: string
  fpsLabel(n: number): string
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
}

export const STR: Strings = {
  fieldLabel: 'Terenul de joc',
  title: 'World Guard',
  pad: { tower: 'Turn', camp: 'Tăietori', quarry: 'Carieră', hero: 'Erou', repair: 'Repară castelul' },
  padLevel: (name, n) => `${name} nivel ${n}`,
  padMax: (name) => `${name} · nivel maxim`,
  repairCost: (heal) => `1 = +${heal} viață`,
  gain: '+1',
  heroDown: 'Eroul a căzut',
  wood: 'lemn',
  stone: 'piatră',
  castle: 'Castel',
  fpsLabel: (n) => `TEST · ${n} fps`,
  hint: 'Ține degetul pe ecran și trage ca să miști eroul',
  ruleMove: 'Ține degetul pe ecran și trage. Eroul merge încotro tragi.',
  ruleGather: 'Stai lângă copaci și stânci ca să strângi lemn și piatră.',
  ruleInvest: 'Oprește-te pe un cerc punctat ca să investești în turnuri, tăietori, carieră sau erou.',
  ruleFight: 'Eroul lovește singur ce e aproape. Partida ține până cade castelul.',
  start: 'Începe',
  stress: 'Test de viteză',
  overTitle: 'Castelul a căzut',
  overSurvived: 'Ai rezistat',
  record: 'Record',
  recordNew: 'Record nou',
  overKills: 'Dușmani doborâți',
  again: 'Încă o partidă',
}
