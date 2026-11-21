import { describe, expect, it } from 'vitest'
import { startView, stepSector } from './cards'
import { STR } from './strings'

describe('cartonașul de start, cu și fără partidă salvată', () => {
  it('fără salvare: „Apără planeta” e butonul principal, cu rândul lui de explicație; „Continuă partida” nu se vede', () => {
    expect(startView(null)).toEqual({ defendMain: true, defendLine: STR.defendLine, continueText: null })
  })
  it('cu salvare: „Continuă partida · m:ss” e principalul, „Apără planeta” trece pe stilul secundar și avertizează că salvarea se pierde', () => {
    expect(startView({ secs: 161 })).toEqual({ defendMain: false, defendLine: 'Partidă nouă: cea salvată se pierde.', continueText: 'Continuă partida · 2:41' })
  })
})

describe('alegerea sectorului de pe cartonașul de start', () => {
  it('− coboară și + urcă cu câte unul, între 1 și cel mai departe explorat plus unu', () => {
    expect(stepSector(3, -1, 4)).toBe(2)
    expect(stepSector(3, 1, 4)).toBe(4)
    expect(stepSector(5, 1, 4)).toBe(5)
  })
  it('nu coboară sub 1', () => {
    expect(stepSector(1, -1, 0)).toBe(1)
    expect(stepSector(1, -1, 7)).toBe(1)
  })
  it('nu trece de cel mai departe explorat plus unu: fără niciun sector explorat, rămâne 1', () => {
    expect(stepSector(1, 1, 0)).toBe(1)
    expect(stepSector(3, 1, 2)).toBe(3)
  })
  it('apăsări repezi, oricâte, rămân în margini', () => {
    let s = 2
    for (let i = 0; i < 50; i++) s = stepSector(s, 1, 5)
    expect(s).toBe(6)
    for (let i = 0; i < 50; i++) s = stepSector(s, -1, 5)
    expect(s).toBe(1)
  })
  it('un sector de pornire în afara marginilor (profil schimbat între timp) e adus înăuntru', () => {
    expect(stepSector(9, -1, 2)).toBe(3)
    expect(stepSector(0, 1, 2)).toBe(1)
    expect(stepSector(Number.NaN, 1, 2)).toBe(1)
  })
})
