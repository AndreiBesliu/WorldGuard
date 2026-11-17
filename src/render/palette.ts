// Paleta: citită o singură dată din variabilele CSS de pe :root, ca terenul și HUD-ul să aibă o sursă.
const NAMES = [
  'ground', 'ground-lift', 'ground-sink', 'edge', 'dirt', 'stone', 'stone-shade', 'rock', 'rock-shade',
  'wood', 'trunk', 'pine', 'pine-lift', 'hero', 'hero-shade', 'foe', 'foe-shade', 'ink', 'ink-soft', 'night',
] as const

type Camel<S extends string> = S extends `${infer A}-${infer B}` ? `${A}${Capitalize<Camel<B>>}` : S
export type Palette = Record<Camel<(typeof NAMES)[number]>, string>

let cached: Palette | null = null

export function palette(): Palette {
  if (cached) return cached
  const css = getComputedStyle(document.documentElement)
  const out: Record<string, string> = {}
  for (const n of NAMES) out[n.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())] = css.getPropertyValue('--' + n).trim()
  cached = out as Palette
  return cached
}

/** '#rrggbb' + opacitate -> 'rgba(...)'. */
export function alpha(hex: string, a: number): string {
  const v = parseInt(hex.slice(1), 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`
}

export const FONT_UI = '"Rubik", system-ui, sans-serif'
