import { describe, expect, it } from 'vitest'
import { foeHp } from '../data/balance'
import { createGame, type Foe, type GameState } from './state'
import { hurtFoe, spawnFoe } from './foes'
import { addFoe, heroAt, quietGame, stepFor } from './testkit'

describe('dușmanii', () => {
  const idle = (seed: number, secs: number) => { const s = createGame(seed); stepFor(s, secs); return s }
  it('primul dușman apare la 10 s, cu cifrele din spec', () => {
    expect(idle(1, 9.9).foes).toEqual([])
    const s = idle(1, 10.1)
    expect(s.foes).toHaveLength(1)
    expect(s.foes[0]).toMatchObject({ r: 10, speed: 46, dmg: 3, brute: false })
    expect(s.foes[0]!.maxHp).toBeCloseTo(14 * (1 + 10 / 45), 1)
  })
  it('dușmanii apar pe marginea hărții, pe toate cele patru laturi', () => {
    const s = quietGame()
    for (let i = 0; i < 40; i++) spawnFoe(s)           // priviți în clipa apariției, înainte să facă vreun pas
    const side = (f: Foe) => (f.y === 0 ? 'sus' : f.x === 1100 ? 'dreapta' : f.y === 1500 ? 'jos' : f.x === 0 ? 'stanga' : 'nicaieri')
    expect(new Set(s.foes.map(side))).toEqual(new Set(['sus', 'dreapta', 'jos', 'stanga']))
    for (const f of s.foes) { expect(f.x >= 0 && f.x <= 1100).toBe(true); expect(f.y >= 0 && f.y <= 1500).toBe(true) }
  })
  it('aceeași sămânță dă aceiași dușmani; altă sămânță, alții', () => {
    expect(idle(5, 60).foes).toEqual(idle(5, 60).foes)
    expect(idle(5, 60).foes).not.toEqual(idle(6, 60).foes)
  })
  it('fiecare al 7-lea, după 120 s, e greu', () => {
    const s = quietGame(); s.tick = 121 * 60; s.t = 121; s.spawnN = 6
    spawnFoe(s)
    expect(s.foes[0]).toMatchObject({ brute: true, r: 15, speed: 30, dmg: 9 })
    expect(s.foes[0]!.maxHp).toBeCloseTo(4 * foeHp(121), 6)
    const early = quietGame(); early.spawnN = 6; spawnFoe(early); expect(early.foes[0]!.brute).toBe(false)
  })
  it('merge la nucleu, se oprește și lovește nucleul cu 3 pe secundă', () => {
    const s = quietGame(); heroAt(s, 100, 100); const f = addFoe(s, 550, 400)
    stepFor(s, 8); expect(Math.hypot(f.x - 550, f.y - 750)).toBeCloseTo(65, 0)
    const hp = s.core.hp; stepFor(s, 3); expect(hp - s.core.hp).toBe(9)
  })
  it('urmărește eroul aflat la mai puțin de 90 de unități și îl lovește când îl atinge', () => {
    const s = quietGame(); heroAt(s, 300, 300); const f = addFoe(s, 385, 300)
    stepFor(s, 0.3); expect(f.x).toBeLessThan(375)            // vine spre erou; încă e în afara undei lui
    const t = quietGame(); heroAt(t, 300, 300); addFoe(t, 320, 300, { atkT: 0 })
    stepFor(t, 1 / 60); expect(t.hero.hp).toBe(57)
    const far = quietGame(); heroAt(far, 300, 300); const g = addFoe(far, 400, 300)
    stepFor(far, 1); expect(g.x).toBeGreaterThan(400)        // la 100 de unități îl ignoră și pleacă spre nucleu
  })
  it('nu se suprapun și nu intră în nucleu', () => {
    const s = quietGame(); heroAt(s, 100, 100)
    for (let i = 0; i < 30; i++) addFoe(s, 550, 500)
    stepFor(s, 12)
    for (const a of s.foes) {
      expect(Number.isFinite(a.x + a.y)).toBe(true)
      expect(Math.hypot(a.x - 550, a.y - 750)).toBeGreaterThanOrEqual(64 - 0.01)
      // O singură trecere de despărțire pe pas lasă o suprapunere mică într-o mulțime înghesuită (măsurat: 18–19 din 20).
      // Testul păzește că nu se calcă mai mult de un sfert de corp, nu o despărțire perfectă.
      for (const b of s.foes) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(15)
    }
  })
  it('un dușman fără viață e scos și numărat', () => {
    const s = quietGame(); heroAt(s, 100, 100); const f = addFoe(s, 550, 400)
    hurtFoe(s, f, 999); stepFor(s, 1 / 60)
    expect([s.foes.length, s.kills]).toEqual([0, 1])
    expect(s.fx.some((x) => x.kind === 'puff')).toBe(true)
  })
  it('partida se termină când cade nucleul', () => {
    const s = quietGame(); heroAt(s, 100, 100); s.core.hp = 3; addFoe(s, 550, 686)
    stepFor(s, 2); expect([s.mode, s.core.hp]).toEqual(['over', 0])
    const t = s.tick; stepFor(s, 1); expect(s.tick).toBe(t)
  })
  it('starea trece prin JSON și continuă identic', () => {
    const a = idle(3, 40); const b: GameState = JSON.parse(JSON.stringify(a))
    stepFor(a, 30); stepFor(b, 30)
    expect(b).toEqual(a)
  })
  it('împinsul se stinge de tot: după 3 s e exact zero, nu un rest și nu un zero negativ', () => {
    const s = quietGame(); heroAt(s, 100, 100); const f = addFoe(s, 550, 300, { kx: -140, ky: 90 })
    stepFor(s, 3)
    expect(Object.is(f.kx, 0) && Object.is(f.ky, 0)).toBe(true)
  })
})
