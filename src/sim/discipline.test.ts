// Nucleul `src/sim`, regulile zborului din `src/flight` și jucătorii automați din `src/bots` trebuie să fie deterministe: fără ceasul mașinii și fără aleator global.
// Testul citește sursele și refuză tiparele interzise. Proba lui negativă e ultimul caz de mai jos.
// Toate trei folderele stau aici, într-un singur fișier de test: un test care ar importa `violations` din acest fișier i-ar înregistra testele a doua oară.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const FORBIDDEN: readonly [RegExp, string][] = [
  [/Math\.random\s*\(/, 'Math.random() — folosește createRng(seed, flux)'],
  [/Date\.now\s*\(/, 'Date.now() — timpul simulării vine din valuri/tick-uri, nu din ceas'],
  [/new\s+Date\s*\(/, 'new Date() — idem'],
  [/performance\.now\s*\(/, 'performance.now() — idem'],
]

export function violations(source: string): string[] {
  // Comentariile pot cita tiparele; se scot înainte de verificare.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  return FORBIDDEN.filter(([re]) => re.test(code)).map(([, why]) => why)
}

/** Importurile din `source` (fișierul `file`) care duc în folderul `bots` (cale absolută). */
export function botImports(file: string, source: string, bots: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const specs = [...code.matchAll(/\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!)
  return specs.filter((spec) => {
    if (!spec.startsWith('.')) return false
    const to = resolve(dirname(file), spec)
    return to === bots || to.startsWith(bots + sep)
  })
}

describe('disciplina nucleului src/sim, a regulilor zborului din src/flight și a jucătorilor din src/bots', () => {
  const sim = dirname(fileURLToPath(import.meta.url))
  const folders = [['src/sim', sim], ['src/flight', join(sim, '..', 'flight')], ['src/bots', join(sim, '..', 'bots')]] as const

  for (const [name, dir] of folders) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))

    it(`găsește fișierele din ${name}`, () => {
      expect(files.length).toBeGreaterThan(3)
    })

    for (const f of files) {
      it(`${name}/${f} nu folosește ceasul sau aleatorul global`, () => {
        expect(violations(readFileSync(join(dir, f), 'utf8'))).toEqual([])
      })
    }
  }

  it('proba negativă: verificarea chiar prinde un tipar interzis', () => {
    expect(violations('const x = Math.random()')).toHaveLength(1)
    expect(violations('// Math.random() într-un comentariu e permis')).toHaveLength(0)
  })
})

// Jocul livrat nu are voie să ajungă la jucătorii automați: nimic din `src/` din afara `src/bots/` nu importă din el.
describe('jocul livrat nu importă din src/bots', () => {
  const self = fileURLToPath(import.meta.url), src = join(dirname(self), '..'), bots = join(src, 'bots')
  const files = readdirSync(src, { recursive: true, encoding: 'utf8' })
    .map((f) => join(src, f))
    .filter((f) => f.endsWith('.ts') && !f.startsWith(bots + sep) && f !== self)   // fișierul ăsta are importuri de probă în text

  it('găsește fișierele jocului, între ele src/main.ts', () => {
    expect(files.length).toBeGreaterThan(20)
    expect(files).toContain(join(src, 'main.ts'))
  })

  it('niciun import care duce în src/bots', () => {
    const bad = files.flatMap((f) => botImports(f, readFileSync(f, 'utf8'), bots).map((spec) => `${f.slice(src.length + 1)}: ${spec}`))
    expect(bad).toEqual([])
  })

  it('proba negativă: verificarea chiar prinde un import din src/bots', () => {
    const main = join(src, 'main.ts'), sim = join(src, 'sim', 'step.ts')
    expect(botImports(main, "import { createBot } from './bots/bot'", bots)).toEqual(['./bots/bot'])
    expect(botImports(sim, "import type { Policy } from '../bots/policy'", bots)).toEqual(['../bots/policy'])
    expect(botImports(main, "const m = await import('./bots/run')", bots)).toEqual(['./bots/run'])
    expect(botImports(main, "// import { createBot } from './bots/bot'", bots)).toEqual([])
    expect(botImports(main, "import { robots } from './robots'", bots)).toEqual([])
  })
})
