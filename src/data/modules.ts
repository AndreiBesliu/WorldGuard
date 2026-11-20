// Modulele navei: doar numele, felul și treapta maximă. Ce face fiecare stă în simulare; cifrele lor, în balance.ts.

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
