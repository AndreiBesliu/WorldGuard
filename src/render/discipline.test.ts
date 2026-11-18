// Desenul de pe fiecare cadru rămâne ieftin pe telefon: fără umbră estompată, iar gradientul și decupajul stau
// doar la cer și la planetă (`orbit/scene.ts`). Testul citește sursele din `src/render/`; proba lui negativă e ultimul caz.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** Fișierele în care apare tiparul și care nu sunt îngăduite, în ordinea cheilor. */
export function offenders(files: Record<string, string>, pattern: RegExp, allowed: string[] = []): string[] {
  return Object.keys(files).filter((f) => pattern.test(files[f] as string) && !allowed.includes(f))
}

/** Sursele `.ts` din `src/render/` și din subdosarele lui, fără teste, cu calea relativă scrisă cu `/`. */
function renderSources(): Record<string, string> {
  const root = dirname(fileURLToPath(import.meta.url))
  const out: Record<string, string> = {}
  const visit = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name)
      if (e.isDirectory()) visit(full)
      else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out[relative(root, full).split(sep).join('/')] = readFileSync(full, 'utf8')
    }
  }
  visit(root)
  return out
}

/** Gradientul de orice fel, decupajul și filtrul de canvas: costisitoare pe fiecare cadru. */
const COSTLY = /createRadialGradient|createLinearGradient|createConicGradient|\.clip\(|\.filter\s*=(?!=)/

describe('disciplina desenului', () => {
  const files = renderSources()

  it('fișierele desenului au fost găsite', () => {
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['world.ts', 'orbit/scene.ts', 'orbit/things.ts']))
  })
  it('nicio umbră estompată în desen', () => {
    expect(offenders(files, /shadowBlur/)).toEqual([])
  })
  it('gradient și decupaj doar la cer și la nucleu', () => {
    expect(offenders(files, COSTLY, ['orbit/scene.ts'])).toEqual([])
  })
  it('tiparul celor costisitoare prinde și gradientul conic și filtrul, dar nu metoda filter a listelor', () => {
    const probe = { 'a.ts': 'ctx.createConicGradient(0, 0, 0)', 'b.ts': "ctx.filter = 'blur(2px)'", 'c.ts': 'xs.filter((x) => x)' }
    expect(offenders(probe, COSTLY)).toEqual(['a.ts', 'b.ts'])
  })
  it('proba negativă: un fișier cu umbră estompată e prins', () => {
    expect(offenders({ 'x.ts': 'ctx.shadowBlur = 4' }, /shadowBlur/)).toEqual(['x.ts'])
  })
})
