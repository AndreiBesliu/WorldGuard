// Un pas de simulare, de 1/60 s. Deocamdată ceasul, eroul și resursele; restul vine în task-urile următoare.
import { BALANCE } from '../data/balance'
import { DT, EPS, type GameState, type Input } from './state'
import { updateHero } from './hero'

export function step(s: GameState, input: Input): void {
  if (s.mode === 'over') return
  s.tick += 1
  s.t = s.tick * DT
  updateHero(s, input)
  for (const n of s.nodes) if (n.left === 0 && s.t + EPS >= n.regrowAt) n.left = BALANCE.node[n.type].amount   // resursa crește la loc
}
