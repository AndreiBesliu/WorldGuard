// Paleta: citită o singură dată din variabilele CSS de pe :root, ca cerul, aspectul și banda de sus să aibă o sursă.
const NAMES = [
  'sky', 'sky-deep', 'edge', 'nebula-a', 'nebula-b', 'nebula-c', 'nebula-d', 'star', 'star-cool', 'star-warm',
  'ocean', 'land', 'land-shade', 'air', 'shield', 'hero', 'hero-shade', 'jet', 'foe', 'foe-shade', 'foe-jet', 'foe-glass',
  'crystal', 'crystal-lift', 'crystal-shade', 'crystal-base', 'ore', 'ore-shade', 'ore-pit', 'ore-fleck', 'metal',
  'hull', 'hull-shade', 'hull-dark', 'solar', 'solar-line', 'bolt', 'ink', 'ink-soft', 'night',
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

const alphas = new Map<string, string>()

/** '#rrggbb' + opacitate -> 'rgba(...)'; rezultatul se ține minte, ca desenul să nu construiască texte în fiecare cadru. */
export function alpha(hex: string, a: number): string {
  const key = hex + a
  let out = alphas.get(key)
  if (out === undefined) {
    const v = parseInt(hex.slice(1), 16)
    out = `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`
    alphas.set(key, out)
  }
  return out
}

export const FONT_UI = '"Rubik", system-ui, sans-serif'
