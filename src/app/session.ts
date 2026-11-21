// Stările aplicației (start, joc, pauză, final) și ce se salvează sau se șterge la fiecare trecere.
// Fără DOM și fără stocare: salvarea vine prin `SessionDeps`.
import { STRESS_SHIP } from '../data/balance'
import type { Ups } from '../data/workshop'
import { coreMaxHp } from '../sim/boost'
import { spawnFoe } from '../sim/foes'
import { heroMaxHp } from '../sim/hero'
import { choose as chooseOffer } from '../sim/mods'
import { createGame, type GameState, type Input } from '../sim/state'
import { step } from '../sim/step'

export const STRESS_FOES = 150      // cât de plină e zona de joc în testul de viteză: număr de măsurat, nu de joc

export type Phase = 'ready' | 'playing' | 'paused' | 'over'
export interface SessionDeps {
  saveGame(s: GameState): void
  clearGame(): void
  saveIfRecord(secs: number): { record: number; isNew: boolean }
  ups(): Ups                          // întăririle cu care pornește o partidă obișnuită; testul de viteză pornește fără ele
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
  /** „Înapoi la start”, din pauză sau de la final: sesiunea trece pe start („ready”) fără să scrie ceva (pauza a salvat deja
   *  partida, finalul a șters-o); false cât partida e în curs sau e deja pe start. */
  leave(): boolean
  /** Alege oferta deschisă cu indexul dat; false fără partidă în curs, fără ofertă, cu un index greșit sau dacă simularea o refuză. */
  choose(index: number): boolean
  advance(steps: number, input: Input): OverInfo | null
}

export function createSession(deps: SessionDeps, seed: number): Session {
  let phase: Phase = 'ready'
  let stress = false
  let s: GameState = createGame(seed)

  // Testul de viteză: harta rămâne plină, planeta și nava nu cad, iar experiența nu se strânge (fără niveluri, fără panou).
  // Nava rămâne cu încărcătura de la pornire (`STRESS_SHIP`), deci armele trag tot testul.
  function keepStressed(): void {
    while (s.foes.length < STRESS_FOES) spawnFoe(s)
    s.core.hp = coreMaxHp(s)
    s.hero.dead = false
    s.hero.hp = heroMaxHp(s)
    s.hero.xp = 0
  }

  return {
    get phase() { return phase },
    get s() { return s },
    get stress() { return stress },
    start(newSeed, isStress) {
      stress = isStress
      s = stress ? createGame(newSeed) : createGame(newSeed, deps.ups())
      if (stress) {
        s.spawnT = 1e9                        // în test nu apar dușmani de la sine: numărul rămâne exact STRESS_FOES
        s.hero.lvl = STRESS_SHIP.lvl          // nava pornește cu armele trăgând (STRESS_SHIP), cu viața plină pentru nivelul ei
        s.hero.mods = STRESS_SHIP.mods.map((id) => ({ id, tier: STRESS_SHIP.tier, t: 0 }))
        s.hero.hp = heroMaxHp(s)
      } else deps.clearGame()                 // partida nouă o înlocuiește pe cea salvată
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
    leave() {
      if (phase !== 'paused' && phase !== 'over') return false
      phase = 'ready'
      return true
    },
    choose(index) {
      if (phase !== 'playing') return false   // pe pauză sau pe un cartonaș, panoul nu e pe ecran
      return chooseOffer(s, index).ok
    },
    advance(steps, input) {
      if (phase !== 'playing') return null
      for (let i = 0; i < steps; i++) {
        step(s, input)                        // cu o ofertă deschisă pasul nu schimbă nimic: alegerea vine prin `choose`
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
