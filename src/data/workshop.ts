// Atelierul: cele cinci întăriri cumpărate din rezerva păstrată între partide. Cifrele sunt propuneri; regulile (cumpărat, plătit) stau în `src/app/profile.ts`.
// Prețurile țin țintele din spec față de zborul măsurat în `src/bots/flightYield.ts`: cea mai
// ieftină întărire după un zbor, toate la plafon după 25–35 de zboruri (păzite de `src/bots/flightYield.test.ts`).

export type UpId = 'hull' | 'arms' | 'reach' | 'core' | 'kit'   // Carenă, Armament, Colectare, Planetă, Arsenal de pornire
export type Ups = Readonly<Record<UpId, number>>                // treapta fiecărei întăriri, 0 = necumpărată

export const UP_IDS: readonly UpId[] = ['hull', 'arms', 'reach', 'core', 'kit']

export interface Cost { crystal: number; metal: number }

export const WORKSHOP = {
  // Carena: viață în plus pentru navă și lovituri în plus în zbor. `hits[t]` e cifra la treapta t (indexul 0 = necumpărată).
  hull: { max: 4 as const, hp: 6, hits: [0, 0, 1, 1, 2] as readonly number[], base: { crystal: 50, metal: 10 }, grow: 1.7 },
  // Armamentul: lovitura navei crește cu `dmg` (fracție) pe treaptă.
  arms: { max: 5 as const, dmg: 0.04, base: { crystal: 60, metal: 15 }, grow: 1.6 },
  // Colectarea: raza de strâns crește cu `reach` (fracție) pe treaptă.
  reach: { max: 3 as const, reach: 0.1, base: { crystal: 40, metal: 0 }, grow: 1.8 },
  // Planeta: viața planetei crește cu `hp` (fracție) pe treaptă.
  core: { max: 4 as const, hp: 0.05, base: { crystal: 55, metal: 20 }, grow: 1.7 },
  // Arsenalul de pornire: modulele cu care pornește zborul. `mods[t]` e lista la treapta t (indexul 0 = niciunul).
  kit: {
    max: 3 as const,
    mods: [[], ['laser'], ['laser', 'missile'], ['laser', 'missile', 'shield']] as readonly (readonly ('laser' | 'missile' | 'shield')[])[],
    base: { crystal: 95, metal: 30 }, grow: 2,
  },
}

export const NO_UPS: Ups = { hull: 0, arms: 0, reach: 0, core: 0, kit: 0 }
export const MAX_UPS: Ups = { hull: WORKSHOP.hull.max, arms: WORKSHOP.arms.max, reach: WORKSHOP.reach.max, core: WORKSHOP.core.max, kit: WORKSHOP.kit.max }

const round5 = (n: number): number => Math.round(n / 5) * 5

/** Prețul treptei `level` (1…max): baza × `grow`^(treapta − 1), rotunjit la 5. */
export function upPrice(id: UpId, level: number): Cost {
  const w = WORKSHOP[id], f = w.grow ** (level - 1)
  return { crystal: round5(w.base.crystal * f), metal: round5(w.base.metal * f) }
}
