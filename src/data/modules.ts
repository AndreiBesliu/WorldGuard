// Modulele navei: numele, felul, treapta maximă și cifrele pe trepte. Ce face fiecare stă în simulare.

export type ModId = 'wave' | 'laser' | 'missile' | 'armor' | 'shield' | 'mender' | 'engine' | 'magnet' | 'relay'
export type ModKind = 'weapon' | 'body' | 'utility'

export const MAX_TIER = 3   // treapta cea mai înaltă a unui modul
export const OFFERS = 3     // câte oferte are panoul de la un nivel nou, cel mult

export const MOD_KIND: Record<ModId, ModKind> = {
  wave: 'weapon', laser: 'weapon', missile: 'weapon',
  armor: 'body', shield: 'body', mender: 'body',
  engine: 'utility', magnet: 'utility', relay: 'utility',
}

/** Toate modulele, în ordinea de mai sus: arme, corp, utilitare. */
export const MOD_IDS: readonly ModId[] = ['wave', 'laser', 'missile', 'armor', 'shield', 'mender', 'engine', 'magnet', 'relay']

// Cifrele modulelor. Listele au câte o valoare pe treaptă: indexul 0 e treapta 1. Propuneri de pornire, de reglat cu plasa.
export const MODS = {
  wave: {                                     // raza, ritmul și împinsul Undei sunt cele din BALANCE.hero
    dmg: [10, 16, 24],                        // lovitura
    arc: [1.25, 1.6, 2.0],                    // deschiderea arcului, radiani
  },
  laser: {
    range: 170,                               // de la centrul navei la marginea dușmanului, px
    every: 0.9,                               // secunde între două trageri
    dmg: [14, 22, 32],                        // lovitura
  },
  missile: {
    range: 200,                               // de la centrul navei la marginea dușmanului, px
    every: 2.4,                               // secunde între două rachete
    speed: 240,                               // viteza rachetei, px/s
    blast: 50,                                // zona loviturii, de la punctul exploziei la marginea dușmanului, px
    dmg: [12, 18, 26],                        // lovitura, în fiecare dușman din zonă
  },
  armor: { hp: [30, 60, 100] },               // viață maximă în plus
  shield: { every: [6, 4.5, 3] },             // secunde până se reface după ce a oprit o lovitură
  mender: {
    wait: [2, 1.5, 1],                        // secunde fără lovituri primite până începe refacerea
    regen: [6, 9, 12],                        // viață pe secundă
  },
  engine: { speed: [1.12, 1.22, 1.3] },       // viteza navei se înmulțește cu atât
  magnet: {
    reach: [40, 60, 80],                      // distanța de strâns, de la marginea navei la marginea resursei, px
    every: [0.8, 0.65, 0.5],                  // timpul între două bucăți se înmulțește cu atât
  },
  relay: {
    range: 220,                               // turelele cu corpul la cel mult atât de nava vie, px
    every: [1.3, 1.55, 1.8],                  // timpul între două trageri ale lor se împarte la atât
  },
} as const

/** Cifra treptei `tier` (1–3) dintr-o listă pe trepte. */
export function atTier(list: readonly number[], tier: number): number {
  return list[Math.min(Math.max(tier, 1), list.length) - 1]!
}
