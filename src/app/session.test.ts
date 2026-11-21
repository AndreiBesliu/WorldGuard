import { describe, expect, it } from 'vitest'
import { BALANCE, STRESS_SHIP } from '../data/balance'
import { heroMaxHp } from '../sim/hero'
import { slotsAt } from '../sim/mods'
import { createGame, type GameState } from '../sim/state'
import { step } from '../sim/step'
import { STRESS_FOES, createSession } from './session'

const still = { x: 0, y: 0 }
const deps = () => {
  const calls: string[] = []; const saved: GameState[] = []
  return { calls, saved, d: {
    saveGame: (s: GameState) => { calls.push('save'); saved.push(s) },
    clearGame: () => { calls.push('clear') },
    saveIfRecord: (secs: number) => { calls.push('record ' + secs); return { record: secs, isNew: true } },
  } }
}

describe('sesiunea', () => {
it('pornește pe cartonașul de start și nu avansează singură', () => {
  const { d } = deps(); const x = createSession(d, 5)
  expect([x.phase, x.s.seed, x.stress]).toEqual(['ready', 5, false])
  expect(x.advance(10, still)).toBeNull(); expect(x.s.tick).toBe(0)
})
it('o partidă nouă șterge salvarea veche; testul de viteză n-o atinge', () => {
  const a = deps(); const x = createSession(a.d, 5); x.start(7, false)
  expect([x.phase, x.s.seed, a.calls]).toEqual(['playing', 7, ['clear']])
  const b = deps(); const y = createSession(b.d, 5); y.start(7, true)
  expect([y.phase, y.stress, y.s.spawnT, b.calls]).toEqual(['playing', true, 1e9, []])
})
it('pauza salvează o singură dată starea de acum și oprește simularea', () => {
  const { d, calls, saved } = deps(); const x = createSession(d, 5); x.start(7, false); x.advance(60, still)
  expect(x.pause()).toBe(true); expect(x.pause()).toBe(false)
  expect([x.phase, calls, saved[0] === x.s]).toEqual(['paused', ['clear', 'save'], true])
  expect(x.advance(60, still)).toBeNull(); expect(x.s.tick).toBe(60)
  expect(x.unpause()).toBe(true); expect(x.unpause()).toBe(false)
  x.advance(60, still); expect(x.s.tick).toBe(120)
})
it('pauza nu există pe cartonașul de start și nici după final', () => {
  const { d } = deps(); const x = createSession(d, 5)
  expect([x.pause(), x.unpause()]).toEqual([false, false])
  x.start(7, false); x.s.core.hp = 0
  expect(x.advance(1, still)).not.toBeNull(); expect(x.phase).toBe('over')
  expect([x.pause(), x.unpause()]).toEqual([false, false]); expect(x.phase).toBe('over')
})
it('dacă salvarea aruncă, pauza tot are loc', () => {
  const { d } = deps(); d.saveGame = () => { throw new Error('plin') }
  const x = createSession(d, 5); x.start(7, false)
  expect(x.pause()).toBe(true); expect(x.phase).toBe('paused')
})
it('testul de viteză: harta plină, nimeni nu cade, nimic nu se salvează', () => {
  const { d, calls } = deps(); const x = createSession(d, 5); x.start(7, true)
  x.advance(600, still)
  expect([x.s.foes.length, x.s.core.hp, x.s.hero.dead, x.s.mode]).toEqual([STRESS_FOES, BALANCE.core.hp, false, 'playing'])
  x.pause()
  expect(calls).toEqual([])
})
it('la căderea planetei: final, salvarea ștearsă, recordul întrebat o dată', () => {
  const { d, calls } = deps(); const x = createSession(d, 5); x.start(7, false)
  x.s.core.hp = 0; x.s.mode = 'over'; x.s.tick = 4321; x.s.t = 4321 / 60; x.s.kills = 9
  expect(x.advance(0, still)).toEqual({ secs: 72, record: 72, isNew: true, kills: 9 })
  expect([x.phase, calls]).toEqual(['over', ['clear', 'clear', 'record 72']])
  expect(x.advance(5, still)).toBeNull()
})
it('o partidă reluată continuă de unde era și nu e niciodată test de viteză', () => {
  const { d } = deps(); const x = createSession(d, 5); x.start(7, true)
  const saved = createGame(9); for (let i = 0; i < 300; i++) step(saved, still)
  x.resume(saved)
  expect([x.phase, x.stress, x.s === saved]).toEqual(['playing', false, true])
  x.advance(60, still); expect(x.s.tick).toBe(360)
})
it('cu o ofertă deschisă, advance nu mișcă partida: alegerea o face jucătorul', () => {
  const { d } = deps(); const x = createSession(d, 5); x.start(7, false); x.advance(60, still)
  x.s.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }]
  const t = x.s.t
  expect(x.advance(30, still)).toBeNull()
  expect([x.s.t, x.s.tick, x.s.offer?.length]).toEqual([t, 60, 2])
})
it('choose: false fără ofertă, fără partidă în curs sau cu un index greșit', () => {
  const { d } = deps(); const x = createSession(d, 5)
  x.s.offer = [{ id: 'laser', tier: 1 }]
  expect(x.choose(0)).toBe(false)                 // încă pe cartonașul de start
  x.start(7, false)
  expect(x.choose(0)).toBe(false)                 // nicio ofertă deschisă
  x.s.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }]
  expect([x.choose(2), x.choose(-1), x.choose(0.5)]).toEqual([false, false, false])
  x.pause()
  expect(x.choose(0)).toBe(false)                 // pe pauză panoul nu e pe ecran
  expect(x.s.offer?.length).toBe(2)
})
it('choose cu o ofertă deschisă o închide, pune modulul și advance merge mai departe', () => {
  const { d } = deps(); const x = createSession(d, 5); x.start(7, false); x.advance(60, still)
  x.s.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }]
  expect(x.choose(1)).toBe(true)
  expect([x.s.offer, x.s.hero.mods.map((m) => [m.id, m.tier])]).toEqual([null, [['wave', 2]]])
  x.advance(30, still); expect(x.s.tick).toBe(90)
})
it('choose întoarce false când simularea refuză oferta, iar oferta rămâne deschisă', () => {
  const { d } = deps(); const x = createSession(d, 5); x.start(7, false)
  x.s.offer = [{ id: 'wave', tier: 1 }]           // Unda e deja pe navă
  expect(x.choose(0)).toBe(false)
  expect(x.s.offer).toEqual([{ id: 'wave', tier: 1 }])
})
it('pauza cu oferta deschisă salvează o stare cu oferta în ea', () => {
  const { d, saved } = deps(); const x = createSession(d, 5); x.start(7, false); x.advance(60, still)
  x.s.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }]
  expect(x.pause()).toBe(true)
  expect(JSON.parse(JSON.stringify(saved[0])).offer).toEqual([{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }])
})
it('testul de viteză: experiența rămâne 0 după 200 de dușmani doborâți și nicio ofertă nu se deschide', () => {
  const { d } = deps(); const x = createSession(d, 5); x.start(7, true)
  for (let i = 0; i < 3; i++) {                   // de fiecare dată toți cei 150 cad în pasul următor
    for (const f of x.s.foes) f.hp = 0
    x.advance(1, still)
  }
  expect(x.s.kills).toBeGreaterThanOrEqual(200)
  expect([x.s.hero.xp, x.s.hero.lvl, x.s.offer]).toEqual([0, STRESS_SHIP.lvl, null])
})
it('testul de viteză: nava pornește cu cele trei arme la treapta 3, în locurile nivelului ei, cu viața plină', () => {
  const { d } = deps(); const x = createSession(d, 5); x.start(7, true)
  const h = x.s.hero
  expect(h.mods.map((m) => [m.id, m.tier])).toEqual([['wave', 3], ['laser', 3], ['missile', 3]])
  expect(h.mods.length).toBeLessThanOrEqual(slotsAt(h.lvl))
  expect([h.lvl, h.xp, h.hp]).toEqual([3, 0, heroMaxHp(x.s)])
})
it('testul de viteză: armele chiar trag, experiența rămâne 0, numărul de dușmani nu se schimbă', () => {
  const { d } = deps(); const x = createSession(d, 5); x.start(7, true)
  let beams = 0, missiles = 0
  for (let i = 0; i < 600; i++) {
    x.advance(1, still)
    if (x.s.fx.some((f) => f.kind === 'beam')) beams++
    if (x.s.shots.some((q) => q.kind === 'missile')) missiles++
    expect(x.s.foes.length).toBe(STRESS_FOES)
  }
  expect(beams).toBeGreaterThan(0)
  expect(missiles).toBeGreaterThan(0)
  expect([x.s.hero.xp, x.s.hero.lvl, x.s.offer, x.s.mode]).toEqual([0, 3, null, 'playing'])
})
it('o partidă obișnuită pornește ca înainte: nivelul 1, doar Unda la treapta 1', () => {
  const { d } = deps(); const x = createSession(d, 5); x.start(7, false)
  expect(x.s.hero).toEqual(createGame(7).hero)
  expect([x.s.hero.lvl, x.s.hero.mods.map((m) => [m.id, m.tier])]).toEqual([1, [['wave', 1]]])
})
})
