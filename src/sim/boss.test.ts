import { describe, expect, it } from 'vitest'
import { ENEMIES, TRAITS, VAL_INIMA, WAVES, type Trait } from '../data/enemies'
import { VIETI_BAZA } from '../data/joc'
import { STATES } from '../data/reactions'
import { TOWERS } from '../data/towers'
import { enemyHealth, enemySpeed, fingerprint, newGame, spawnSchedule, step, waveAt, type Enemy, type GameState } from './game'
import { applyContact, type Contact, type ReactionContext, type Victim } from './reactions'
import { startWave } from './testkit'

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

describe('inima planetei: Paznicul inimii (felia 9)', () => {
  const last = WAVES.length - 1

  it('pe inimă, ultimul val e cel al inimii: bossii valului 25, apoi Paznicul; pe celelalte regiuni, nu', () => {
    expect(waveAt({ inima: true }, last)).toBe(VAL_INIMA)
    expect(waveAt({ inima: true }, 3)).toBe(WAVES[3])
    expect(waveAt({ inima: false }, last)).toBe(WAVES[last])
    const inima = spawnSchedule(last, 0, true)
    expect(inima.filter((s) => s.tip === 'paznic')).toHaveLength(1)
    expect(spawnSchedule(last, 0).some((s) => s.tip === 'paznic')).toBe(false)
    // Paznicul vine după toți bossii.
    const iP = inima.findIndex((s) => s.tip === 'paznic')
    expect(inima.every((s, i) => s.tip !== 'boss' || i < iP)).toBe(true)
    // Valul pornit pe inimă e chiar cel al inimii.
    const pe = (inima: boolean): string[] => startWave({ ...newGame(5, { inima }), val: last, ocoluriPeVal: 0 }).deGenerat.map((x) => x.tip)
    expect(pe(true)).toContain('paznic')
    expect(pe(false)).not.toContain('paznic')
    // Partida știe că e pe inimă, iar amprenta o deosebește.
    expect(newGame(5, { inima: true }).inima).toBe(true)
    expect(fingerprint(newGame(5, { inima: true }))).not.toBe(fingerprint(newGame(5)))
  })

  it('e mai greu decât un boss: mai multă viață, mai multă armură, ia toate viețile bazei', () => {
    expect(ENEMIES.paznic.viata).toBeGreaterThan(ENEMIES.boss.viata)
    expect(ENEMIES.paznic.armura).toBeGreaterThan(ENEMIES.boss.armura)
    expect(ENEMIES.paznic.dauna).toBeGreaterThanOrEqual(VIETI_BAZA)
  })

  it('pulsul: la fiecare interval, Paznicul naște roiuri acolo unde e; un Paznic mort nu mai naște', () => {
    const puls = ENEMIES.paznic.puls!
    const s0 = newGame(7)
    const paznic: Enemy = { id: 9, tip: 'paznic', viata: 50_000, progres: 5000, stari: {} }
    // Tick-ul următor e multiplu de interval.
    const s = { ...s0, faza: 'val' as const, val: last, tick: puls.interval * 3 - 1, inamici: [paznic], deGenerat: [{ tick: 1e6, tip: 'normal' as const }], urmatorulId: 50 }
    const a = step(s)
    const nascuti = a.inamici.filter((e) => e.tip === puls.tip)
    const unde = a.inamici.find((e) => e.id === 9)!.progres
    expect(nascuti.map((e) => [e.id, e.progres, e.viata])).toEqual(
      Array.from({ length: puls.numar }, (_, i) => [50 + i, unde, enemyHealth(puls.tip, last)]),
    )
    // Până la următorul interval, nimic nou; la el, iar.
    let c = a
    for (let t = 1; t < puls.interval; t++) {
      c = step(c)
      expect(c.inamici, `tick-ul ${c.tick}`).toHaveLength(a.inamici.length)
    }
    expect(step(c).inamici).toHaveLength(a.inamici.length + puls.numar)
    // Născuții nu primesc atingerea terenului pe hexagonul pe care s-au născut (abia când trec pe altul): lângă apă,
    // rămân uscați.
    const langaDrum = '-4,-1' // vecin cu hexagonul de drum 5, (−4, 0), pe care stă Paznicul
    const lac = { ...s, map: { ...s.map, terrain: new Map(s.map.terrain).set(langaDrum, 'apa' as const) } }
    expect(step(lac).inamici.filter((e) => e.tip === puls.tip).map((e) => e.stari)).toEqual(Array(puls.numar).fill({}))
    // Mort, nu mai pulsează.
    const mort = step({ ...s, inamici: [{ ...paznic, viata: 0 }] })
    expect(mort.inamici.some((e) => e.tip === puls.tip)).toBe(false)
  })
})
