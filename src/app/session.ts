// Stările aplicației (start, joc, pauză, final) și ce se salvează sau se șterge la fiecare trecere.
// Fără DOM și fără stocare: salvarea vine prin `SessionDeps`.
import { BALANCE } from '../data/balance'
import { spawnFoe } from '../sim/foes'
import { heroMaxHp } from '../sim/hero'
import { createGame, type GameState, type Input } from '../sim/state'
import { step } from '../sim/step'

export const STRESS_FOES = 150      // cât de plină e zona de joc în testul de viteză: număr de măsurat, nu de joc

export type Phase = 'ready' | 'playing' | 'paused' | 'over'
export interface SessionDeps {
  saveGame(s: GameState): void
  clearGame(): void
  saveIfRecord(secs: number): { record: number; isNew: boolean }
}
export interface OverInfo { secs: number; record: number; isNew: boolean; kills: number }
export interface Session {
  readonly phase: Phase
  readonly s: GameState
  readonly stress: boolean
  start(seed: number, stress: boolean): void
  resume(saved: GameState): void
  pause(): boolean
  unpause(): boolean
  advance(steps: number, input: Input): OverInfo | null
}

export function createSession(deps: SessionDeps, seed: number): Session {
  let phase: Phase = 'ready'
  let stress = false
  let s: GameState = createGame(seed)

  // Testul de viteză: harta rămâne plină, planeta și nava nu cad.
  function keepStressed(): void {
    while (s.foes.length < STRESS_FOES) spawnFoe(s)
    s.core.hp = BALANCE.core.hp
    s.hero.dead = false
    s.hero.hp = heroMaxHp(s)
  }

  return {
    get phase() { return phase },
    get s() { return s },
    get stress() { return stress },
    start(newSeed, isStress) {
      s = createGame(newSeed)
      stress = isStress
      if (stress) s.spawnT = 1e9              // în test nu apar dușmani de la sine: numărul rămâne exact STRESS_FOES
      else deps.clearGame()                   // partida nouă o înlocuiește pe cea salvată
      phase = 'playing'
    },
    resume(saved) {
      s = saved
      stress = false
      phase = 'playing'
    },
    pause() {
      if (phase !== 'playing') return false
      phase = 'paused'
      if (!stress) {
        try { deps.saveGame(s) } catch { /* salvarea eșuată nu strică pauza */ }
      }
      return true
    },
    unpause() {
      if (phase !== 'paused') return false
      phase = 'playing'
      return true
    },
    advance(steps, input) {
      if (phase !== 'playing') return null
      for (let i = 0; i < steps; i++) {
        step(s, input)
        if (stress) keepStressed()
      }
      if (s.mode !== 'over') return null
      phase = 'over'
      const secs = Math.floor(s.t)
      if (stress) return { secs, record: secs, isNew: false, kills: s.kills }   // testul nu atinge nici salvarea, nici recordul
      deps.clearGame()
      return { secs, ...deps.saveIfRecord(secs), kills: s.kills }
    },
  }
}
