import { describe, expect, it } from 'vitest'
import { ECONOMIE, TERRAFORMARI } from '../data/economie'
import { TERRAIN, type Terrain } from '../data/terrain'
import { TOWERS } from '../data/towers'
import {
  applyDecision,
  checkBuild,
  checkMine,
  checkTerraform,
  fingerprint,
  newGame,
  pathContacts,
  step,
  towerRange,
  waveIncome,
  type Enemy,
  type GameState,
} from './game'
import { key } from './hex'
import { must, runWave, startWave } from './testkit'

const reason = (r: ReturnType<typeof applyDecision>): string => (r.ok ? 'ok' : r.reason)

/**
 * Arena: drumul drept de la (-9,0) la (9,0), câmpie peste tot în afară de terenurile date, fără ocol obligatoriu,
 * cu aurul și pământul date.
 */
function arena(teren: Record<string, Terrain> = {}, extra: Partial<GameState> = {}): GameState {
  const s = newGame(7)
  const terrain = new Map([...s.map.terrain].map(([k]) => [k, teren[k] ?? ('campie' as const)]))
  return { ...s, map: { ...s.map, terrain }, ocoluriPeVal: 0, aur: 500, pamant: 10, ...extra }
}

describe('economia: dobânda și pământul', () => {
  it('venitul unui val: dobânda e un procent din aur, cu plafon; pământul vine din val și din mine', () => {
    expect(waveIncome({ aur: 0, mine: [] })).toEqual({ aur: 0, pamant: ECONOMIE.pamant.peVal })
    expect(waveIncome({ aur: 150, mine: [] }).aur).toBe(Math.floor((150 * ECONOMIE.dobanda.procent) / 100))
    expect(waveIncome({ aur: 10_000, mine: [] }).aur).toBe(ECONOMIE.dobanda.maxim)
    expect(waveIncome({ aur: 0, mine: ['a', 'b'] }).pamant).toBe(ECONOMIE.pamant.peVal + 2 * ECONOMIE.pamant.peMina)
  })

  it('la sfârșitul valului primești dobânda și pământul; partida pornește cu pământul din date', () => {
    const s0 = newGame(5)
    expect(s0.pamant).toBe(ECONOMIE.pamant.start)
    const start = startWave(s0)
    const after = runWave(start)
    expect(after.faza).toBe('pregatire')
    // Aurul de la sfârșitul valului = cel din ultimul tick al valului + dobânda la el.
    const lastTick = runWave(start, after.tick - start.tick - 1)
    const expected = waveIncome({ aur: lastTick.aur, mine: [] })
    expect(after.venit).toEqual(expected)
    expect(after.pamant).toBe(ECONOMIE.pamant.start + expected.pamant)
  })

  it('o mină pe un filon costă aur și aduce pământ la fiecare val; pe ea nu se mai construiește', () => {
    const s = arena({ '0,-3': 'filon', '1,-3': 'filon' })
    const m = must(s, { tip: 'mina', hex: '0,-3' })
    expect(m.aur).toBe(s.aur - ECONOMIE.mina.costAur)
    expect(m.mine).toEqual(['0,-3'])
    expect(m.jurnal.at(-1)!.d).toEqual({ tip: 'mina', hex: '0,-3' })
    expect(checkBuild(m, 'fizic', '0,-3')).toEqual({ ok: false, reason: 'aici e o mină' })
    expect(waveIncome(m).pamant).toBe(ECONOMIE.pamant.peVal + ECONOMIE.pamant.peMina)
    // Refuzurile spun de ce.
    expect(checkMine(m, '0,-3')).toEqual({ ok: false, reason: 'aici e o mină' })
    expect(checkMine(m, '2,-3')).toEqual({ ok: false, reason: 'o mină se sapă doar pe un filon' })
    expect(checkMine({ ...m, aur: 10 }, '1,-3')).toEqual({ ok: false, reason: `nu ajunge aurul: mina costă ${ECONOMIE.mina.costAur}, ai 10` })
    expect(checkMine({ ...m, faza: 'val' }, '1,-3')).toEqual({ ok: false, reason: 'minele se sapă doar între valuri' })
    const t = must(m, { tip: 'turn', turn: 'fizic', hex: '1,-3' })
    expect(checkMine(t, '1,-3')).toEqual({ ok: false, reason: 'aici e un turn' })
  })
})

describe('terraformarea', () => {
  it('canalul face apă din câmpie: costă pământ, intră în jurnal, iar drumul de lângă el udă', () => {
    const s = arena()
    const before = pathContacts(s)[s.path.findIndex((h) => key(h) === '-3,0')]
    expect(before).toEqual([])
    const c = must(s, { tip: 'teren', actiune: 'canal', hex: '-3,-1' })
    expect(c.map.terrain.get('-3,-1')).toBe('apa')
    expect(c.pamant).toBe(s.pamant - TERRAFORMARI.canal.costPamant)
    expect(c.jurnal.at(-1)!.d).toEqual({ tip: 'teren', actiune: 'canal', hex: '-3,-1' })
    expect(pathContacts(c)[c.path.findIndex((h) => key(h) === '-3,0')]!.map((x) => x.aplica)).toEqual(['ud'])
    // Harta veche a rămas cum era: starea e imuabilă.
    expect(s.map.terrain.get('-3,-1')).toBe('campie')
    expect(fingerprint(c)).not.toBe(fingerprint(s))
  })

  it('dealul dă rază turnului construit pe el', () => {
    const d = must(arena(), { tip: 'teren', actiune: 'deal', hex: '0,-2' })
    expect(d.map.terrain.get('0,-2')).toBe('deal')
    expect(towerRange(d, 'fizic', '0,-2')).toBe(TOWERS.fizic.raza + (TERRAIN.deal.bonusRaza ?? 0))
  })

  it('pădurea arsă aprinde inamicii de pe drumul vecin, iar cei unși cu ulei explodează (GDD §1)', () => {
    // Uleiul la (-6,-1) unge, pădurea de la (-3,-1) arde: inamicii trec întâi pe lângă ulei, apoi pe lângă foc.
    let s = must(arena({ '-6,-1': 'ulei', '-3,-1': 'padure' }), { tip: 'teren', actiune: 'arde', hex: '-3,-1' })
    expect(s.map.terrain.get('-3,-1')).toBe('jar')
    s = must(s, { tip: 'pornesteVal' })
    const start = s
    for (let t = 0; t < 4000 && s.faza === 'val'; t++) s = step(s)
    // Inamicii unși explodează în lanț lângă foc și mor acolo (50 de daune de la fiecare explozie vecină): niciun
    // turn nu e pe hartă, deci tot ce a murit a murit din teren.
    expect(s.reactii.explozie ?? 0).toBeGreaterThan(0)
    expect(s.aur).toBeGreaterThan(start.aur)
  })

  it('refuzurile spun de ce: faza, drumul, turnul, terenul greșit, pământul', () => {
    const s = must(arena({ '2,-2': 'deal', '3,-2': 'padure' }), { tip: 'turn', turn: 'fizic', hex: '0,-1' })
    expect(checkTerraform({ ...s, faza: 'val' }, 'canal', '1,-2')).toEqual({ ok: false, reason: 'terenul se modelează doar între valuri' })
    expect(checkTerraform(s, 'canal', '0,0')).toEqual({ ok: false, reason: 'pe drum nu se poate' })
    expect(checkTerraform(s, 'canal', '0,-1')).toEqual({ ok: false, reason: 'aici e un turn' })
    expect(checkTerraform(s, 'canal', '2,-2')).toEqual({ ok: false, reason: 'sapi un canal se poate doar pe câmpie, pădure, cenușă sau puieți, nu pe deal' })
    expect(checkTerraform(s, 'arde', '1,-2')).toEqual({ ok: false, reason: 'aprinzi pădurea se poate doar pe pădure, nu pe câmpie' })
    expect(checkTerraform({ ...s, pamant: 1 }, 'deal', '1,-2')).toEqual({
      ok: false,
      reason: `nu ajunge pământul: deal costă ${TERRAFORMARI.deal.costPamant}, ai 1`,
    })
    expect(checkTerraform(s, 'arde', '3,-2').ok).toBe(true)
    // Un refuz nu intră în jurnal.
    expect(reason(applyDecision(s, { tip: 'teren', actiune: 'canal', hex: '0,0' }))).toBe('pe drum nu se poate')
  })

  it('datele: fiecare terraformare costă pământ și duce într-un teren care există', () => {
    for (const t of Object.values(TERRAFORMARI)) {
      expect(t.costPamant).toBeGreaterThan(0)
      expect(TERRAIN[t.in]).toBeDefined()
      for (const din of t.din) expect(TERRAIN[din]).toBeDefined()
      expect(t.din).not.toContain(t.in)
    }
    // Pădurea în flăcări atinge drumul cu foc; nu ține drum și nici turn.
    expect(TERRAIN.jar.atingere).toEqual({ element: 'foc', aplica: 'arde' })
  })

  it('pământul și minele intră în amprentă', () => {
    const s = arena()
    expect(fingerprint({ ...s, pamant: s.pamant + 1 })).not.toBe(fingerprint(s))
    expect(fingerprint({ ...s, mine: ['0,-3'] })).not.toBe(fingerprint(s))
  })

  it('un inamic care trece pe lângă jar ia foc la intrarea pe hexagon', () => {
    const s = must(arena({ '-3,-1': 'padure' }), { tip: 'teren', actiune: 'arde', hex: '-3,-1' })
    const foe: Enemy = { id: 1, tip: 'normal', viata: 5000, progres: 4460, stari: {} }
    // Indicele 5 e (-4,0), vecin cu jarul: 4460 e încă pe indicele 4, iar 4460 + 40 = 4500 intră pe 5.
    const w = step({ ...s, faza: 'val', inamici: [foe], deGenerat: [{ tick: 1e6, tip: 'normal' }] })
    expect(w.inamici[0]!.stari.arde).toBeDefined()
  })
})
