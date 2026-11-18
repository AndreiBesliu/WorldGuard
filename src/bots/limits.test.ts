import { describe, expect, it } from 'vitest'
import { POLICIES, type BotName } from './policy'
import { formatTable, verdicts } from './limits'
import { RUN_CAP, type Row } from './run'

const DEFAULTS: Record<BotName, number> = { nimic: 90, amestec: 300, 'doar-nava': 200, 'fara-nava': 250, 'fara-economie': 280 }

/** Rânduri făcute de mână: doar mediana contează pentru verdict. */
function rows(over: Partial<Record<BotName, number>> = {}, without?: BotName): Row[] {
  return POLICIES.filter((p) => p.name !== without).map((p) => {
    const m = over[p.name] ?? DEFAULTS[p.name]
    return { name: p.name, label: p.label, times: [m], median: m, min: m, max: m }
  })
}
const okOf = (rs: Row[], name: BotName) => verdicts(rs).find((v) => v.name === name)!.ok

describe('verdictele', () => {
  it('toate în limită: patru da și unul fără limită', () => {
    const v = verdicts(rows())
    expect(v).toHaveLength(5)
    expect(v.map((x) => x.ok)).toEqual([true, true, true, true, null])
    expect(v.map((x) => x.name)).toEqual(POLICIES.map((p) => p.name))
  })
  it('„Nimic”: limitele 60 și 130 sunt închise', () => {
    expect(okOf(rows({ nimic: 59 }), 'nimic')).toBe(false)
    expect(okOf(rows({ nimic: 60 }), 'nimic')).toBe(true)
    expect(okOf(rows({ nimic: 130 }), 'nimic')).toBe(true)
    expect(okOf(rows({ nimic: 131 }), 'nimic')).toBe(false)
  })
  it('„Amestec”: 240 și 360 trec, 361 pică', () => {
    expect(okOf(rows({ amestec: 361 }), 'amestec')).toBe(false)
    expect(okOf(rows({ amestec: 360, 'doar-nava': 200, 'fara-nava': 250 }), 'amestec')).toBe(true)
    expect(okOf(rows({ amestec: 240 }), 'amestec')).toBe(true)
    expect(okOf(rows({ amestec: 239 }), 'amestec')).toBe(false)
  })
  it('„Doar navă”: 75% din „Amestec” trece, 76% pică', () => {
    expect(okOf(rows({ amestec: 300, 'doar-nava': 225 }), 'doar-nava')).toBe(true)
    expect(okOf(rows({ amestec: 300, 'doar-nava': 228 }), 'doar-nava')).toBe(false)
  })
  it('„Fără navă”: 90% din „Amestec” trece, 91% pică', () => {
    expect(okOf(rows({ amestec: 300, 'fara-nava': 270 }), 'fara-nava')).toBe(true)
    expect(okOf(rows({ amestec: 300, 'fara-nava': 273 }), 'fara-nava')).toBe(false)
  })
  it('valoarea: secunde întregi, iar la cele două procentul din „Amestec”, cu o zecimală', () => {
    const v = verdicts(rows({ amestec: 300, 'doar-nava': 200.4, 'fara-nava': 270 }))
    expect(v.find((x) => x.name === 'amestec')!.value).toBe('300 s')
    expect(v.find((x) => x.name === 'doar-nava')!.value).toBe('200 s (66,8%)')
    expect(v.find((x) => x.name === 'fara-nava')!.value).toBe('270 s (90,0%)')
    expect(v.find((x) => x.name === 'doar-nava')!.limit).toBe('≤ 75% din Amestec')
  })
  it('rotunjirea de afișare nu intră în comparație: „Nimic” la 59,6 s se scrie „60 s” și e în afara limitei', () => {
    const v = verdicts(rows({ nimic: 59.6 })).find((x) => x.name === 'nimic')!
    expect([v.value, v.ok]).toEqual(['60 s', false])
  })
  it('rotunjirea de afișare nu intră în comparație: „Nimic” la 130,4 s e în afara limitei', () => {
    const v = verdicts(rows({ nimic: 130.4 })).find((x) => x.name === 'nimic')!
    expect([v.value, v.ok]).toEqual(['130 s', false])
  })
  it('„Doar navă” la 75,4% se scrie „75,4%”, nu „75%”, și e în afara limitei', () => {
    const v = verdicts(rows({ amestec: 300, 'doar-nava': 226.2 })).find((x) => x.name === 'doar-nava')!
    expect([v.value, v.ok]).toEqual(['226 s (75,4%)', false])
  })
  it('fără rândul „Amestec” aruncă o eroare cu mesaj', () => {
    expect(() => verdicts(rows({}, 'amestec'))).toThrow(/Amestec/)
  })
})

describe('tabelul', () => {
  it('are antet și un rând pe jucător, cu toate etichetele', () => {
    const t = formatTable(rows())
    for (const p of POLICIES) expect(t).toContain(p.label)
    expect(t.split('\n')).toHaveLength(1 + POLICIES.length)
    expect(t).toContain('fără limită')
    expect(t).toContain('în limită')
  })
  it('un rând picat apare ca „ÎN AFARA LIMITEI”', () => {
    const t = formatTable(rows({ amestec: 400 }))
    expect(t).toContain('ÎN AFARA LIMITEI')
    expect(formatTable(rows())).not.toContain('ÎN AFARA LIMITEI')
  })
  it('o mediană egală cu marginea testului se scrie „≥ 900”', () => {
    expect(RUN_CAP).toBe(900)
    expect(formatTable(rows({ 'fara-economie': 900 }))).toContain('≥ 900')
    expect(formatTable(rows())).not.toContain('≥ 900')
  })
})
