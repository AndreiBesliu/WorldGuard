import { describe, expect, it } from 'vitest'
import { TRAITS, WAVES, type Trait } from '../data/enemies'
import { STATES } from '../data/reactions'
import { TOWERS } from '../data/towers'
import { enemySpeed, fingerprint, newGame, spawnSchedule, step, type GameState } from './game'
import { applyContact, type Contact, type ReactionContext, type Victim } from './reactions'

type V = Victim & { pos: number }
const foe = (id: number, pos: number, trasaturi?: readonly Trait[], stari: V['stari'] = {}): V => ({ id, tip: 'boss', viata: 5000, stari: { ...stari }, pos, ...(trasaturi ? { trasaturi } : {}) })
function world(...vs: V[]): { ctx: ReactionContext<V>; events: string[] } {
  const events: string[] = []
  return {
    ctx: { neighbors: (v, r) => vs.filter((n) => n !== v && n.viata > 0 && Math.abs(n.pos - v.pos) <= r), emit: (t, v) => events.push(`${t}:${v.id}`) },
    events,
  }
}
const hit = (t: keyof typeof TOWERS): Contact => ({ element: TOWERS[t].element, dauna: TOWERS[t].dauna, aplica: TOWERS[t].aplica })
const water: Contact = { element: 'apa', dauna: 0, aplica: 'ud' }
const oil: Contact = { element: 'ulei', dauna: 0, aplica: 'uns' }

describe('bossul și trăsăturile', () => {
  it('bossii au trăsături din val: la 5 uscat, la 10 neclintit, la 15 unul ignifug și unul uscat și neclintit', () => {
    const bossTraits = (val: number): (readonly Trait[] | undefined)[] =>
      spawnSchedule(val, 0)
        .filter((sp) => sp.tip === 'boss')
        .map((sp) => sp.trasaturi)
    expect(bossTraits(4)).toEqual([['uscat']])
    expect(bossTraits(9)).toEqual([['neclintit']])
    expect(bossTraits(14)).toEqual([['ignifug'], ['uscat', 'neclintit']])
    // Inamicii obișnuiți n-au trăsături.
    expect(spawnSchedule(4, 0).filter((sp) => sp.tip !== 'boss').every((sp) => sp.trasaturi === undefined)).toBe(true)
    // Datele: fiecare imunitate e o stare care există.
    for (const t of Object.values(TRAITS)) for (const s of t.imun) expect(STATES[s]).toBeDefined()
    expect(WAVES.flatMap((w) => w.grupuri).filter((g) => g.trasaturi).every((g) => g.trasaturi!.every((t) => TRAITS[t]))).toBe(true)
  })

  it('uscat: apa nu-l udă, deci frigul doar îl răcește (fără îngheț) și fulgerul nu sare de la el', () => {
    const boss = foe(1, 0, ['uscat'])
    const wet = foe(2, 1, undefined, { ud: 30 })
    const { ctx, events } = world(boss, wet)
    applyContact(boss, water, ctx)
    expect(boss.stari.ud).toBeUndefined()
    applyContact(boss, hit('frig'), ctx)
    expect(boss.stari.racit).toBeDefined()
    expect(boss.stari.inghetat).toBeUndefined()
    applyContact(boss, hit('fulger'), ctx)
    expect(events).toEqual([])
    expect(wet.viata).toBe(5000)
  })

  it('neclintit: frigul nu-l încetinește și nu-l îngheață, nici ud', () => {
    const boss = foe(1, 0, ['neclintit'], { ud: 30 })
    const { ctx } = world(boss)
    const speed = enemySpeed(boss)
    applyContact(boss, hit('frig'), ctx)
    expect(boss.stari.racit).toBeUndefined()
    expect(boss.stari.inghetat).toBeUndefined()
    expect(enemySpeed(boss)).toBe(speed)
  })

  it('ignifug: nu ia foc și nu se unge — fără arsură, fără explozie', () => {
    const boss = foe(1, 0, ['ignifug'])
    const oiled = foe(2, 1, undefined, { uns: 100 })
    const { ctx, events } = world(boss, oiled)
    applyContact(boss, oil, ctx)
    expect(boss.stari.uns).toBeUndefined()
    applyContact(boss, hit('foc'), ctx)
    expect(boss.stari.arde).toBeUndefined()
    expect(events).toEqual([])
    // Același foc pe un boss fără trăsături: aprinde.
    const plain = foe(3, 9)
    applyContact(plain, hit('foc'), world(plain).ctx)
    expect(plain.stari.arde).toBeDefined()
  })

  it('bossul apare în val cu trăsăturile lui, iar ele intră în amprentă', () => {
    const s0 = newGame(3)
    const wave = (trasaturi?: readonly Trait[]): GameState =>
      step({ ...s0, faza: 'val', deGenerat: [{ tick: 1, tip: 'boss', ...(trasaturi ? { trasaturi } : {}) }, { tick: 1e6, tip: 'normal' }] })
    const a = wave(['uscat'])
    expect(a.inamici[0]!.trasaturi).toEqual(['uscat'])
    expect(fingerprint(a)).not.toBe(fingerprint(wave()))
    expect(wave().inamici[0]!.trasaturi).toBeUndefined()
  })
})
