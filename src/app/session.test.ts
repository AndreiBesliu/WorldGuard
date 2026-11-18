import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
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
})
