// Constantele partidei.

/** Simularea rulează pe pas fix: 20 de tick-uri pe secundă. Viteza din UI doar rulează mai multe tick-uri pe cadru. */
export const TICK_MS = 50

/** Câte vieți are baza la începutul partidei. */
export const VIETI_BAZA = 20

/** Vitezele de joc din UI (1×, 2×, 4×). Nu schimbă simularea, doar câte tick-uri rulează pe secundă. */
export const VITEZE_UI = [1, 2, 4] as const

/** Lungimea unui hexagon de drum în unitățile simulării. */
export const MILI_HEX = 1000
