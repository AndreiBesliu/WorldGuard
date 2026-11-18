import { describe, expect, it } from 'vitest'
import { STR } from './strings'

describe('textele temei de spațiu', () => {
  it('numele de pe cercuri și din bandă', () => {
    expect(STR.pad).toEqual({ turret: 'Turelă', collector: 'Colector', mine: 'Mină', hero: 'Navă', repair: 'Repară planeta' })
    expect([STR.crystal, STR.metal, STR.core]).toEqual(['cristale', 'metal', 'Planetă'])
    expect(STR.padLevel(STR.pad.turret, 3)).toBe('Turelă nivel 3')
    expect(STR.padMax(STR.pad.mine)).toBe('Mină · nivel maxim')
  })
  it('mesajele partidei', () => {
    expect(STR.heroDown).toBe('Nava a fost doborâtă')
    expect(STR.overTitle).toBe('Planeta a căzut')
    expect(STR.overKills).toBe('Nave doborâte')
    expect(STR.fieldLabel).toBe('Zona de joc')
  })
  it('regulile de pe cartonașul de start', () => {
    expect(STR.hint).toBe('Ține degetul pe ecran și trage ca să miști nava')
    expect(STR.ruleMove).toBe('Ține degetul pe ecran și trage. Nava merge încotro tragi.')
    expect(STR.ruleGather).toBe('Stai lângă cristale și asteroizi ca să strângi cristale și metal.')
    expect(STR.ruleInvest).toBe('Oprește-te pe un cerc punctat ca să investești în turele, colector, mină sau navă.')
    expect(STR.ruleFight).toBe('Nava lovește singură ce e aproape. Partida ține până cade planeta.')
  })
  it('textele pauzei și ale reluării', () => {
    expect([STR.pause, STR.pauseTitle, STR.pauseSoFar]).toEqual(['Pauză', 'Pauză', 'Ai rezistat până acum'])
    expect([STR.resume, STR.fresh]).toEqual(['Continuă', 'Partidă nouă'])
    expect(STR.continueSaved('2:47')).toBe('Continuă partida · 2:47')
  })
  it('niciun text nu mai pomenește tema veche', () => {
    const all = JSON.stringify(STR, (_k, v) => (typeof v === 'function' ? v('x', 1) : v)).toLowerCase()
    for (const w of ['castel', 'turn', 'lemn', 'piatr', 'copac', 'stânc', 'tăietor', 'carier', 'erou']) expect(all).not.toContain(w)
  })
})
