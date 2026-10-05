// Sunetele jocului — rețete, nu fișiere. Fiecare sunet e o sumă de straturi scurte (un ton care alunecă între două
// frecvențe, sau zgomot alb trecut printr-un filtru), cu un atac și o stingere. Le cântă `audio/synth.ts`, prin
// Web Audio, în browser. E echivalentul sonor al „formelor simple, zero artă” din GDD §10: nicio înregistrare.
// Toate cifrele de aici sunt propunerea mea (DEVLOG, felia 8).
//
// Unități: frecvențe în Hz, timpi în secunde, volume între 0 și 1, `interval` în milisecunde.

export type Oscilator = 'sine' | 'square' | 'sawtooth' | 'triangle'

export interface Filtru {
  readonly tip: 'lowpass' | 'highpass' | 'bandpass'
  /** Frecvența filtrului la începutul și la sfârșitul stratului (alunecă exponențial). */
  readonly frecventa: readonly [number, number]
  readonly q?: number
}

interface StratComun {
  /** Întârzierea stratului față de începutul sunetului. */
  readonly start?: number
  /** Cât crește volumul de la 0 la maxim. */
  readonly atac: number
  /** Cât se stinge după atac. */
  readonly durata: number
  readonly volum: number
  readonly filtru?: Filtru
}

export type Strat =
  /** Un ton care alunecă de la prima frecvență la a doua. */
  | (StratComun & { readonly sursa: Oscilator; readonly frecventa: readonly [number, number] })
  /** Zgomot alb (suflu, foșnet, pocnet), modelat de filtru. */
  | (StratComun & { readonly sursa: 'zgomot' })

export interface SoundInfo {
  readonly straturi: readonly Strat[]
  /** Volumul sunetului întreg (înmulțește volumul fiecărui strat). */
  readonly volum: number
  /** Cât trebuie să treacă între două porniri ale aceluiași sunet: 12 turnuri care trag deodată nu fac 12 sunete. */
  readonly interval: number
  /** Câte exemplare ale lui pot suna deodată. */
  readonly voci: number
  /** Cât variază înălțimea la fiecare pornire (± procente), ca un sunet repetat să nu sune ca o mitralieră. */
  readonly variatie?: number
  /** Trece de plafonul total de voci: sunetele care spun ceva important (baza, bossul, valul). */
  readonly prioritar?: boolean
}

const nota = (f: number, start: number, durata: number, volum: number, sursa: Oscilator = 'sine'): Strat => ({
  sursa,
  frecventa: [f, f],
  start,
  atac: 0.008,
  durata,
  volum,
})

export const SOUNDS = {
  // --- Loviturile turnurilor (cele mai dese, deci cele mai încete) ---
  'turn-fizic': {
    volum: 0.5,
    interval: 70,
    voci: 3,
    variatie: 6,
    straturi: [
      { sursa: 'sine', frecventa: [190, 55], atac: 0.003, durata: 0.14, volum: 0.9 },
      { sursa: 'zgomot', filtru: { tip: 'lowpass', frecventa: [2200, 400] }, atac: 0.001, durata: 0.05, volum: 0.5 },
    ],
  },
  'turn-foc': {
    volum: 0.4,
    interval: 90,
    voci: 3,
    variatie: 8,
    straturi: [
      { sursa: 'zgomot', filtru: { tip: 'bandpass', frecventa: [500, 1400], q: 0.8 }, atac: 0.03, durata: 0.22, volum: 0.9 },
      { sursa: 'sawtooth', frecventa: [90, 70], filtru: { tip: 'lowpass', frecventa: [400, 300] }, atac: 0.03, durata: 0.18, volum: 0.25 },
    ],
  },
  'turn-frig': {
    volum: 0.3,
    interval: 110,
    voci: 2,
    variatie: 4,
    straturi: [
      { sursa: 'triangle', frecventa: [1760, 1320], atac: 0.005, durata: 0.22, volum: 0.6 },
      { sursa: 'sine', frecventa: [2637, 2637], start: 0.02, atac: 0.005, durata: 0.25, volum: 0.35 },
      { sursa: 'zgomot', filtru: { tip: 'highpass', frecventa: [6000, 6000] }, atac: 0.01, durata: 0.15, volum: 0.25 },
    ],
  },
  'turn-fulger': {
    volum: 0.5,
    interval: 80,
    voci: 3,
    variatie: 10,
    straturi: [
      { sursa: 'sawtooth', frecventa: [1400, 160], atac: 0.002, durata: 0.11, volum: 0.6 },
      { sursa: 'zgomot', filtru: { tip: 'highpass', frecventa: [3500, 2000] }, atac: 0.001, durata: 0.09, volum: 0.6 },
    ],
  },

  // --- Reacțiile (câte una pentru fiecare din `REACTIONS`) ---
  explozie: {
    volum: 0.8,
    interval: 90,
    voci: 3,
    variatie: 8,
    straturi: [
      { sursa: 'zgomot', filtru: { tip: 'lowpass', frecventa: [2400, 180] }, atac: 0.004, durata: 0.6, volum: 1 },
      { sursa: 'sine', frecventa: [110, 38], atac: 0.004, durata: 0.5, volum: 0.9 },
    ],
  },
  abur: {
    volum: 0.4,
    interval: 150,
    voci: 2,
    variatie: 6,
    straturi: [{ sursa: 'zgomot', filtru: { tip: 'bandpass', frecventa: [3200, 2000], q: 0.6 }, atac: 0.06, durata: 0.5, volum: 0.8 }],
  },
  dezghet: {
    volum: 0.45,
    interval: 150,
    voci: 2,
    variatie: 6,
    straturi: [
      { sursa: 'zgomot', filtru: { tip: 'bandpass', frecventa: [2500, 900], q: 2 }, atac: 0.01, durata: 0.25, volum: 0.6 },
      { sursa: 'sine', frecventa: [900, 450], start: 0.05, atac: 0.005, durata: 0.12, volum: 0.5 },
    ],
  },
  inghet: {
    volum: 0.4,
    interval: 150,
    voci: 2,
    variatie: 3,
    straturi: [nota(1319, 0, 0.45, 0.6), nota(1976, 0.04, 0.4, 0.45), nota(2637, 0.08, 0.35, 0.35)],
  },
  spargere: {
    volum: 0.55,
    interval: 120,
    voci: 2,
    variatie: 8,
    straturi: [
      { sursa: 'zgomot', filtru: { tip: 'highpass', frecventa: [5000, 3000] }, atac: 0.001, durata: 0.25, volum: 0.8 },
      { sursa: 'triangle', frecventa: [3520, 2800], atac: 0.001, durata: 0.08, volum: 0.4 },
      { sursa: 'triangle', frecventa: [2960, 2400], start: 0.05, atac: 0.001, durata: 0.08, volum: 0.35 },
    ],
  },
  electrocutare: {
    volum: 0.7,
    interval: 100,
    voci: 2,
    variatie: 10,
    straturi: [
      { sursa: 'sawtooth', frecventa: [180, 140], filtru: { tip: 'bandpass', frecventa: [1200, 3000], q: 1.2 }, atac: 0.005, durata: 0.22, volum: 0.9 },
      { sursa: 'zgomot', filtru: { tip: 'highpass', frecventa: [3000, 3000] }, atac: 0.002, durata: 0.12, volum: 0.6 },
    ],
  },

  // --- Inamicii și baza ---
  /** Un inamic ucis: un pocnet scurt și clinchetul aurului. */
  ucis: {
    volum: 0.6,
    interval: 45,
    voci: 4,
    variatie: 12,
    straturi: [
      { sursa: 'sine', frecventa: [620, 200], atac: 0.002, durata: 0.08, volum: 0.7 },
      { ...nota(1319, 0.05, 0.07, 0.18, 'square'), atac: 0.002 },
    ],
  },
  'boss-ucis': {
    volum: 0.9,
    interval: 300,
    voci: 1,
    prioritar: true,
    straturi: [
      { sursa: 'zgomot', filtru: { tip: 'lowpass', frecventa: [3000, 120] }, atac: 0.005, durata: 1.1, volum: 1 },
      { sursa: 'sine', frecventa: [80, 30], atac: 0.005, durata: 1, volum: 1 },
      nota(523, 0.25, 0.5, 0.3, 'triangle'),
      nota(784, 0.37, 0.6, 0.3, 'triangle'),
    ],
  },
  /** Bossul apare la intrare: un corn grav. */
  boss: {
    volum: 0.55,
    interval: 1000,
    voci: 1,
    prioritar: true,
    straturi: [
      { sursa: 'sawtooth', frecventa: [55, 52], filtru: { tip: 'lowpass', frecventa: [300, 900] }, atac: 0.25, durata: 1.4, volum: 0.8 },
      { sursa: 'sawtooth', frecventa: [82.4, 78], filtru: { tip: 'lowpass', frecventa: [300, 900] }, atac: 0.25, durata: 1.4, volum: 0.6 },
    ],
  },
  /** Un inamic a ajuns la bază. */
  baza: {
    volum: 0.7,
    interval: 200,
    voci: 1,
    prioritar: true,
    straturi: [
      { sursa: 'sawtooth', frecventa: [130, 90], filtru: { tip: 'lowpass', frecventa: [900, 300] }, atac: 0.005, durata: 0.4, volum: 0.8 },
      { sursa: 'sine', frecventa: [65, 45], atac: 0.005, durata: 0.45, volum: 0.9 },
    ],
  },

  // --- Valul și partida ---
  'val-start': {
    volum: 0.5,
    interval: 500,
    voci: 1,
    prioritar: true,
    straturi: [
      nota(220, 0, 0.25, 0.8, 'triangle'),
      nota(330, 0.16, 0.45, 0.8, 'triangle'),
      { sursa: 'sawtooth', frecventa: [110, 110], filtru: { tip: 'lowpass', frecventa: [400, 400] }, atac: 0.02, durata: 0.6, volum: 0.35 },
    ],
  },
  'val-gata': {
    volum: 0.45,
    interval: 500,
    voci: 1,
    prioritar: true,
    straturi: [nota(523, 0, 0.5, 0.6), nota(659, 0.08, 0.5, 0.55), nota(784, 0.16, 0.7, 0.5)],
  },
  castigat: {
    volum: 0.55,
    interval: 2000,
    voci: 1,
    prioritar: true,
    straturi: [
      nota(523, 0, 0.4, 0.6, 'triangle'),
      nota(659, 0.13, 0.4, 0.6, 'triangle'),
      nota(784, 0.26, 0.4, 0.6, 'triangle'),
      nota(1047, 0.39, 1.2, 0.7, 'triangle'),
    ],
  },
  pierdut: {
    volum: 0.5,
    interval: 2000,
    voci: 1,
    prioritar: true,
    straturi: [392, 349, 311, 262].map((f, i) => ({
      sursa: 'sawtooth' as const,
      frecventa: [f, f] as const,
      filtru: { tip: 'lowpass' as const, frecventa: [1200, 600] as const },
      start: i * 0.3,
      atac: 0.01,
      durata: i === 3 ? 1 : 0.45,
      volum: 0.5,
    })),
  },
  /** O reacție văzută prima dată în partidă (odată cu anunțul ei). */
  descoperire: {
    volum: 0.45,
    interval: 500,
    voci: 1,
    prioritar: true,
    straturi: [nota(1047, 0, 0.6, 0.5), nota(1319, 0.06, 0.6, 0.45), nota(1568, 0.12, 0.6, 0.4), nota(2093, 0.18, 0.7, 0.35)],
  },

  // --- Deciziile jucătorului ---
  construire: {
    volum: 0.45,
    interval: 60,
    voci: 2,
    variatie: 5,
    straturi: [
      { sursa: 'square', frecventa: [150, 80], filtru: { tip: 'lowpass', frecventa: [1200, 500] }, atac: 0.002, durata: 0.12, volum: 0.6 },
      { sursa: 'zgomot', filtru: { tip: 'lowpass', frecventa: [1500, 600] }, atac: 0.002, durata: 0.1, volum: 0.6 },
      { sursa: 'square', frecventa: [220, 140], filtru: { tip: 'lowpass', frecventa: [1200, 500] }, start: 0.09, atac: 0.002, durata: 0.1, volum: 0.4 },
    ],
  },
  mina: {
    volum: 0.55,
    interval: 60,
    voci: 2,
    variatie: 5,
    straturi: [
      { sursa: 'triangle', frecventa: [1200, 1000], atac: 0.001, durata: 0.06, volum: 0.6 },
      { sursa: 'zgomot', filtru: { tip: 'bandpass', frecventa: [2000, 1500], q: 1.5 }, atac: 0.001, durata: 0.05, volum: 0.5 },
      { sursa: 'triangle', frecventa: [1150, 950], start: 0.14, atac: 0.001, durata: 0.06, volum: 0.5 },
      { sursa: 'zgomot', filtru: { tip: 'bandpass', frecventa: [2000, 1500], q: 1.5 }, start: 0.14, atac: 0.001, durata: 0.05, volum: 0.4 },
    ],
  },
  'teren-canal': {
    volum: 0.5,
    interval: 60,
    voci: 2,
    variatie: 5,
    straturi: [
      { sursa: 'zgomot', filtru: { tip: 'bandpass', frecventa: [800, 300], q: 1 }, atac: 0.02, durata: 0.4, volum: 0.7 },
      { sursa: 'sine', frecventa: [380, 180], start: 0.1, atac: 0.003, durata: 0.12, volum: 0.5 },
      { sursa: 'sine', frecventa: [520, 260], start: 0.22, atac: 0.003, durata: 0.1, volum: 0.4 },
    ],
  },
  'teren-deal': {
    volum: 0.4,
    interval: 60,
    voci: 2,
    variatie: 5,
    straturi: [
      { sursa: 'zgomot', filtru: { tip: 'lowpass', frecventa: [400, 150] }, atac: 0.05, durata: 0.6, volum: 0.8 },
      { sursa: 'sine', frecventa: [70, 45], atac: 0.05, durata: 0.5, volum: 0.7 },
    ],
  },
  'teren-arde': {
    volum: 0.5,
    interval: 60,
    voci: 2,
    variatie: 5,
    straturi: [
      { sursa: 'zgomot', filtru: { tip: 'bandpass', frecventa: [300, 1800], q: 0.7 }, atac: 0.2, durata: 0.6, volum: 0.9 },
      { sursa: 'zgomot', filtru: { tip: 'highpass', frecventa: [3000, 3000] }, start: 0.15, atac: 0.005, durata: 0.05, volum: 0.3 },
      { sursa: 'zgomot', filtru: { tip: 'highpass', frecventa: [3000, 3000] }, start: 0.32, atac: 0.005, durata: 0.05, volum: 0.3 },
    ],
  },
  /** Un ocol pus pe drum: foșnet de pământ. */
  ocol: {
    volum: 0.8,
    interval: 60,
    voci: 2,
    variatie: 5,
    straturi: [{ sursa: 'zgomot', filtru: { tip: 'bandpass', frecventa: [1200, 500], q: 0.9 }, atac: 0.03, durata: 0.2, volum: 0.8 }],
  },
  /** O carte aleasă din draft. */
  carte: {
    volum: 0.4,
    interval: 200,
    voci: 1,
    straturi: [nota(784, 0, 0.3, 0.6), nota(1175, 0.07, 0.35, 0.55)],
  },
  /** Ținta unui turn schimbată. */
  clic: {
    volum: 0.6,
    interval: 40,
    voci: 2,
    straturi: [{ sursa: 'square', frecventa: [1600, 1600], filtru: { tip: 'lowpass', frecventa: [3000, 3000] }, atac: 0.001, durata: 0.04, volum: 0.8 }],
  },
  /** Un grup comutat între individual și combinat. */
  combina: {
    volum: 0.4,
    interval: 150,
    voci: 1,
    straturi: [
      { sursa: 'triangle', frecventa: [330, 440], atac: 0.005, durata: 0.1, volum: 0.6 },
      { sursa: 'triangle', frecventa: [440, 660], start: 0.08, atac: 0.005, durata: 0.15, volum: 0.6 },
    ],
  },
  /** Un refuz („Nu se poate: …”). */
  refuz: {
    volum: 0.35,
    interval: 150,
    voci: 1,
    straturi: [
      { sursa: 'square', frecventa: [196, 196], filtru: { tip: 'lowpass', frecventa: [1000, 1000] }, atac: 0.003, durata: 0.08, volum: 0.6 },
      { sursa: 'square', frecventa: [165, 165], filtru: { tip: 'lowpass', frecventa: [1000, 1000] }, start: 0.1, atac: 0.003, durata: 0.12, volum: 0.6 },
    ],
  },
} as const satisfies Record<string, SoundInfo>

export type SoundId = keyof typeof SOUNDS

/** Cât ține un sunet (s): până la sfârșitul ultimului strat. */
export function soundLength(s: SoundInfo): number {
  return Math.max(...s.straturi.map((l) => (l.start ?? 0) + l.atac + l.durata))
}

/** Nivelurile de volum din interfață (tasta S le ia pe rând): tare, încet, oprit. */
export const NIVELURI_SUNET = [1, 0.5, 0] as const

/** Volumul general, înainte de compresor: lasă loc pentru multe sunete deodată. */
export const VOLUM_GENERAL = 0.6
