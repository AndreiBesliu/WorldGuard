// Limitele din design (docs/GDD.md) ca date, verdictul pe fiecare jucător automat și tabelul tipărit.
// Textele de aici sunt ale tabelului, nu ale jocului: de aceea nu stau în `src/ui/strings.ts`.
import type { BotName } from './policy'
import { RUN_CAP, type Row } from './run'

export const LIMITS = {
  nimic: { min: 60, max: 130 },        // secunde, pe mediană
  amestec: { min: 240, max: 360 },     // secunde, pe mediană
  doarNava: 0.75,                      // cel mult atât din mediana „Amestec”
  faraNava: 0.9,                       // cel mult atât din mediana „Amestec”
} as const

export interface Verdict { name: BotName; label: string; ok: boolean | null; limit: string; value: string }

/** Secunde întregi; o mediană lipită de marginea testului înseamnă „cel puțin atât”. */
function secs(x: number): string {
  const n = Math.round(x)
  return x >= RUN_CAP ? `≥ ${RUN_CAP} s` : `${n} s`
}

/** Limita, în procente întregi. */
const pct = (x: number) => `${Math.round(x * 100)}%`
/** Partea din „Amestec”, cu o zecimală: un rând picat la 75,4% nu se scrie „75%” lângă limita „≤ 75%”. */
const share1 = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`

/** Un verdict pe rând, în ordinea rândurilor; `ok === null` înseamnă „fără limită”. */
export function verdicts(rows: readonly Row[]): Verdict[] {
  const mix = rows.find((r) => r.name === 'amestec')
  if (!mix) throw new Error('Lipsește rândul „Amestec”: limitele celorlalți se măsoară față de el')
  return rows.map((r): Verdict => {
    const base = { name: r.name, label: r.label }
    const value = secs(r.median)
    const share = r.median / mix.median
    switch (r.name) {
      case 'nimic':
        return { ...base, ok: r.median >= LIMITS.nimic.min && r.median <= LIMITS.nimic.max,
          limit: `${LIMITS.nimic.min}–${LIMITS.nimic.max} s`, value }
      case 'amestec':
        return { ...base, ok: r.median >= LIMITS.amestec.min && r.median <= LIMITS.amestec.max,
          limit: `${LIMITS.amestec.min}–${LIMITS.amestec.max} s`, value }
      case 'doar-nava':
        return { ...base, ok: share <= LIMITS.doarNava,
          limit: `≤ ${pct(LIMITS.doarNava)} din Amestec`, value: `${value} (${share1(share)})` }
      case 'fara-nava':
        return { ...base, ok: share <= LIMITS.faraNava,
          limit: `≤ ${pct(LIMITS.faraNava)} din Amestec`, value: `${value} (${share1(share)})` }
      case 'fara-economie':
      case 'fara-turele':
        return { ...base, ok: null, limit: '—', value }
    }
  })
}

/** Secunda la care nava a atins un nivel; „—” dacă mediana e marginea testului (pe cel puțin jumătate din semințe, neatins). */
const reachedAt = (x: number) => (x >= RUN_CAP ? '—' : `${Math.round(x)} s`)
/** Nivelul navei: întreg, sau cu o zecimală când mediana cade între două niveluri. */
const lvlText = (x: number) => String(x).replace('.', ',')

const verdictText = (ok: boolean | null) => (ok === null ? 'fără limită' : ok ? 'în limită' : 'ÎN AFARA LIMITEI')

/**
 * Antet și un rând pe jucător, coloanele aliniate cu spații. Ultimele trei coloane sunt doar informație:
 * nivelul navei la sfârșit și secundele la care a atins nivelurile 2 și 5 (medianele).
 */
export function formatTable(rows: readonly Row[]): string {
  const cells: string[][] = [['Jucător', 'Mediană', 'Min', 'Max', 'Limită', 'Verdict', 'Nivel', 'Nivel 2', 'Nivel 5']]
  const vs = verdicts(rows)
  rows.forEach((r, i) => {
    const v = vs[i]!
    cells.push([r.label, v.value, secs(r.min), secs(r.max), v.limit, verdictText(v.ok), lvlText(r.level), reachedAt(r.lvl2At), reachedAt(r.lvl5At)])
  })
  const widths = cells[0]!.map((_, c) => Math.max(...cells.map((row) => [...row[c]!].length)))
  return cells
    .map((row) => row.map((cell, c) => cell + ' '.repeat(widths[c]! - [...cell].length)).join('  ').trimEnd())
    .join('\n')
}
