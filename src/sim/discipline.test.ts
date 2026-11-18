// Nucleul `src/sim` și jucătorii automați din `src/bots` trebuie să fie deterministe: fără ceasul mașinii și fără aleator global.
// Testul citește sursele și refuză tiparele interzise. Proba lui negativă e ultimul caz de mai jos.
// Ambele foldere stau aici, într-un singur fișier de test: un test care ar importa `violations` din acest fișier i-ar înregistra testele a doua oară.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
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

describe('disciplina nucleului src/sim și a jucătorilor din src/bots', () => {
  const sim = dirname(fileURLToPath(import.meta.url))
  const folders = [['src/sim', sim], ['src/bots', join(sim, '..', 'bots')]] as const

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
