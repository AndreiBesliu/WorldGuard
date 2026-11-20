import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import type { ModId } from '../data/modules'
import type { GameState } from './state'
import { heroDamage, hurtHero } from './hero'
import { addFoe, heroAt, padOf, quietGame, stepFor } from './testkit'

const turret = (s: GameState, lvl = 1) => { const p = padOf(s, 'turret'); p.lvl = lvl; return p }
const dummy = (s: GameState, x: number, y: number) => addFoe(s, x, y, { hp: 1000, maxHp: 1000, speed: 0, dmg: 0 })

describe('lupta', () => {
  it('turela trage la 0,8 s, cu 6 pe rază', () => {
    const s = quietGame(); heroAt(s, 100, 100); const p = turret(s); const f = dummy(s, p.bx + 100, p.by)
    stepFor(s, 1 / 60); expect(s.shots).toHaveLength(1)
    stepFor(s, 4.5); expect(f.hp).toBe(1000 - 6 * 6)
  })
  it('nivelul 3 lovește cu 16; la 191 de unități nu trage', () => {
    const s = quietGame(); heroAt(s, 100, 100); const p = turret(s, 3); const f = dummy(s, p.bx + 100, p.by)
    stepFor(s, 0.5); expect(f.hp).toBe(984)
    const far = quietGame(); heroAt(far, 100, 100); const q = turret(far); dummy(far, q.bx - 191, q.by)
    stepFor(far, 2); expect(far.shots).toEqual([])
  })
  it('alege cel mai apropiat dușman, iar raza rămasă fără țintă dispare', () => {
    const s = quietGame(); heroAt(s, 100, 100); const p = turret(s)
    const near = dummy(s, p.bx + 50, p.by); const other = dummy(s, p.bx + 120, p.by)
    stepFor(s, 1 / 60); expect(s.shots[0]!.targetId).toBe(near.id)
    near.hp = 0; stepFor(s, 1.2)             // a doua rază pleacă la 0,8 s, spre celălalt
    expect(s.shots.every((x) => x.targetId !== near.id)).toBe(true)
    expect(other.hp).toBe(1000 - 6)        // prima rază, rămasă fără țintă, nu l-a atins
  })
  it('eroul trimite singur unda la 0,45 s și împinge', () => {
    const s = quietGame(); heroAt(s, 300, 300); const f = dummy(s, 340, 300)
    stepFor(s, 1 / 60); expect(f.hp).toBe(990)
    stepFor(s, 0.1); expect(f.x).toBeGreaterThan(341)
    stepFor(s, 0.4); expect(f.hp).toBe(980)
  })
  it('lovește doar în arcul din jurul celui mai apropiat', () => {
    const s = quietGame(); heroAt(s, 300, 300)
    const front = dummy(s, 340, 300); const side = dummy(s, 335, 320); const back = dummy(s, 255, 300)
    stepFor(s, 1 / 60)
    expect([front.hp, side.hp, back.hp]).toEqual([990, 990, 1000])
  })
  it('dincolo de raza undei nu lovește; doborât, nu lovește', () => {
    const s = quietGame(); heroAt(s, 300, 300); const f = dummy(s, 300 + 58 + 10 + 1, 300)
    stepFor(s, 1); expect(f.hp).toBe(1000)
    const d = quietGame(); heroAt(d, 300, 300); const g = dummy(d, 340, 300); hurtHero(d, 999)
    stepFor(d, 1); expect(g.hp).toBe(1000)
  })
})

/** Nava cu modulele date (Unda la treapta 1 dacă nu e în listă). */
function arm(s: GameState, mods: [ModId, number][]): void {
  const all: [ModId, number][] = mods.some(([id]) => id === 'wave') ? mods : [['wave', 1], ...mods]
  s.hero.mods = all.map(([id, tier]) => ({ id, tier, t: 0 }))
}
const TIERS = [1, 2, 3] as const

describe('Unda, pe trepte', () => {
  it('lovitura 10 / 16 / 24 și arcul 1,25 / 1,6 / 2,0 rad', () => {
    const dmg = [10, 16, 24]
    for (const tier of TIERS) {
      const s = quietGame(); heroAt(s, 300, 300); arm(s, [['wave', tier]])
      const at = (a: number, d: number) => dummy(s, 300 + Math.cos(a) * d, 300 + Math.sin(a) * d)
      const front = at(0, 40), a14 = at(1.4, 45), a18 = at(-1.8, 45), a22 = at(2.2, 45)
      expect(heroDamage(s)).toBe(dmg[tier - 1])
      stepFor(s, 1 / 60)
      const hit = (f: { hp: number }) => f.hp < 1000
      expect([front.hp, hit(a14), hit(a18), hit(a22)]).toEqual([1000 - dmg[tier - 1]!, tier >= 2, tier >= 3, false])
    }
  })
  it('la treapta 1 face exact ce făcea nava de nivelul 1: aceeași lovitură, aceiași dușmani, același împins', () => {
    const s = quietGame(); heroAt(s, 300, 300)
    const foes = [
      dummy(s, 340, 300), dummy(s, 330, 330), addFoe(s, 345, 268, { hp: 1000, maxHp: 1000, speed: 0, dmg: 0, brute: true, r: 15 }),
      dummy(s, 255, 300), dummy(s, 375, 300),
    ]
    stepFor(s, 1 / 60)
    // Regula de dinainte, scrisă de mână: lovitura 10, raza 58, arcul 1,25 rad în jurul celui mai apropiat, împinsul 140 / 60.
    const damp = Math.exp(-7 / 60), a = 0
    const want = foes.map((f, i) => {
      const x = [340, 330, 345, 255, 375][i]!, y = [300, 330, 268, 300, 300][i]!
      const dx = x - 300, dy = y - 300, d = Math.hypot(dx, dy)
      const inArc = d - f.r <= 58 && Math.abs(Math.atan2(dy, dx) - a) <= 1.25
      const k = f.brute ? 60 : 140
      return { hp: inArc ? 990 : 1000, kx: inArc ? (dx / d) * k * damp : 0, ky: inArc ? (dy / d) * k * damp : 0 }
    })
    expect(want.map((w) => w.hp)).toEqual([990, 990, 990, 1000, 1000])
    foes.forEach((f, i) => {
      expect(f.hp).toBe(want[i]!.hp)
      expect(f.kx).toBeCloseTo(want[i]!.kx, 9)
      expect(f.ky).toBeCloseTo(want[i]!.ky, 9)
    })
  })
})

describe('Laserul', () => {
  it('lovește pe loc doar cel mai apropiat din raza 170, cu 14 / 22 / 32, și lasă o rază de lumină', () => {
    const dmg = [14, 22, 32]
    for (const tier of TIERS) {
      const s = quietGame(); heroAt(s, 300, 300); arm(s, [['laser', tier]])
      const near = dummy(s, 300 + 160, 300), other = dummy(s, 300 - 175, 300)   // marginile la 150 și 165
      stepFor(s, 1 / 60)
      expect([near.hp, other.hp]).toEqual([1000 - dmg[tier - 1]!, 1000])
      expect(s.fx).toContainEqual({ kind: 'beam', x: 300, y: 300, tx: near.x, ty: near.y, t0: s.t })
      expect(s.shots).toEqual([])
    }
  })
  it('raza de lumină dispare din efecte după durata ei', () => {
    const s = quietGame(); heroAt(s, 300, 300); arm(s, [['laser', 1]])
    dummy(s, 460, 300)
    stepFor(s, 1 / 60)
    const beams = () => s.fx.filter((f) => f.kind === 'beam').length
    stepFor(s, BALANCE.fx.beamLife - 1 / 60); expect(beams()).toBe(1)
    stepFor(s, 2 / 60); expect(beams()).toBe(0)
  })
  it('o tragere la 0,9 s', () => {
    const s = quietGame(); heroAt(s, 300, 300); arm(s, [['laser', 1]])
    const f = dummy(s, 460, 300)
    stepFor(s, 1 / 60); expect(f.hp).toBe(986)
    stepFor(s, 0.88); expect(f.hp).toBe(986)
    stepFor(s, 1 / 60); expect(f.hp).toBe(972)
  })
  it('la 171 de la margine nu trage și așteaptă cu ceasul la zero', () => {
    const s = quietGame(); heroAt(s, 300, 300); arm(s, [['laser', 3]])
    const f = dummy(s, 300 + 181, 300)
    stepFor(s, 2)
    expect([f.hp, s.hero.mods[1]!.t]).toEqual([1000, 0])
    f.x = 300 + 180; stepFor(s, 1 / 60)
    expect(f.hp).toBe(968)
  })
})

describe('Rachetele', () => {
  it('pleacă spre cel mai apropiat din raza 200, zboară cu 240/s și lovesc toți din zona 50 cu 12 / 18 / 26', () => {
    const dmg = [12, 18, 26]
    for (const tier of TIERS) {
      const s = quietGame(); heroAt(s, 300, 300); arm(s, [['missile', tier]])
      const a = dummy(s, 450, 300), b = dummy(s, 450, 330), c = dummy(s, 520, 300)
      stepFor(s, 1 / 60)
      expect(s.shots).toHaveLength(1)
      expect(s.shots[0]).toMatchObject({ kind: 'missile', blast: 50, targetId: a.id, dmg: dmg[tier - 1] })
      expect(s.shots[0]!.x).toBeCloseTo(304, 6)                    // un pas la 240/s
      stepFor(s, 0.5); expect([a.hp, b.hp, c.hp]).toEqual([1000, 1000, 1000])
      stepFor(s, 0.2)
      const d = 1000 - dmg[tier - 1]!
      expect([a.hp, b.hp, c.hp]).toEqual([d, d, 1000])
      expect(s.shots).toEqual([])
      expect(s.fx.some((f) => f.kind === 'blast' && f.r === 50 && f.x === 450 && f.y === 300)).toBe(true)
    }
  })
  it('una la 2,4 s', () => {
    const s = quietGame(); heroAt(s, 300, 300); arm(s, [['missile', 1]])
    dummy(s, 450, 300)
    let launched = 0, last = 0
    for (let i = 0; i < 60 * 5; i++) {
      stepFor(s, 1 / 60)
      if (s.shots.length > last) launched++
      last = s.shots.length
    }
    expect(launched).toBe(3)   // la 0, 2,4 și 4,8 s
  })
  it('ținta doborâtă în zbor: racheta merge la ultimul punct știut și lovește zona de acolo (Review Focus 5)', () => {
    const s = quietGame(); heroAt(s, 300, 300); arm(s, [['missile', 1]])
    const a = dummy(s, 450, 300), b = dummy(s, 450, 330)
    stepFor(s, 0.2)
    a.hp = 0
    stepFor(s, 0.6)
    expect(b.hp).toBe(988)
    expect(s.fx.some((f) => f.kind === 'blast' && f.x === 450 && f.y === 300)).toBe(true)
    expect(s.shots).toEqual([])
  })
  it('explozia dispare din efecte după durata ei', () => {
    const s = quietGame(); heroAt(s, 300, 300); arm(s, [['missile', 1]])
    dummy(s, 450, 300)
    const blasts = () => s.fx.filter((f) => f.kind === 'blast').length
    let n = 0
    while (blasts() === 0 && n++ < 120) stepFor(s, 1 / 60)   // racheta zboară până la țintă
    expect(blasts()).toBe(1)
    stepFor(s, BALANCE.fx.blastLife - 1 / 60); expect(blasts()).toBe(1)
    stepFor(s, 2 / 60); expect(blasts()).toBe(0)
  })
  it('razele turelelor rămân „bolt”, fără zonă', () => {
    const s = quietGame(); heroAt(s, 100, 100); const p = turret(s); dummy(s, p.bx + 100, p.by)
    stepFor(s, 1 / 60)
    expect(s.shots[0]).toMatchObject({ kind: 'bolt', blast: 0 })
  })
})

describe('Releul', () => {
  /** Pașii dintre primele două trageri ale primei turele, cu nava la `away` de corpul ei, spre stânga. */
  const gap = (tier: number, away: number, dead = false): number => {
    const s = quietGame(); const p = turret(s); heroAt(s, p.bx - away, p.by)
    if (tier > 0) arm(s, [['relay', tier]])
    dummy(s, p.bx + 100, p.by)
    if (dead) hurtHero(s, 999)
    const fired: number[] = []
    for (let i = 1; i <= 200 && fired.length < 2; i++) {
      const before = p.cool
      stepFor(s, 1 / 60)
      if (p.cool > before) fired.push(i)
    }
    return fired[1]! - fired[0]!
  }
  it('o turelă la 200 de navă trage cu timpul dintre trageri împărțit la 1,2 / 1,35 / 1,5', () => {
    expect([0, 1, 2, 3].map((t) => gap(t, 200))).toEqual([48, 40, 36, 32])   // 0,8 s; 0,667 s; 0,593 s; 0,533 s
  })
  it('una la 240 de navă, sau cu nava doborâtă, nu', () => {
    expect(gap(3, 240)).toBe(48)
    expect(gap(3, 200, true)).toBe(48)
  })
})

describe('armele împreună', () => {
  it('unda, laserul și racheta pot trage în același pas', () => {
    const s = quietGame(); heroAt(s, 300, 300); arm(s, [['wave', 1], ['laser', 1], ['missile', 1]])
    const f = dummy(s, 340, 300)
    stepFor(s, 1 / 60)
    expect(f.hp).toBe(1000 - 10 - 14)
    expect(s.shots.map((x) => x.kind)).toEqual(['missile'])
  })
  it(`nava doborâtă nu trage cu nicio armă timp de ${BALANCE.hero.respawn} s, iar ceasurile armelor nu curg (Review Focus 5)`, () => {
    const s = quietGame(); heroAt(s, 300, 300); arm(s, [['wave', 3], ['laser', 3], ['missile', 3]])
    s.hero.mods[1]!.t = 0.5
    const near = dummy(s, 340, 300), mid = dummy(s, 440, 300)
    hurtHero(s, 999)
    stepFor(s, BALANCE.hero.respawn - 0.1)
    expect([near.hp, mid.hp, s.shots.length, s.fx.some((f) => f.kind === 'beam')]).toEqual([1000, 1000, 0, false])
    expect(s.hero.mods[1]!.t).toBe(0.5)
  })
})
