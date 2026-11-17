// Un pas de simulare, de 1/60 s. Deocamdată doar ceasul; regulile vin în task-urile următoare.
import { DT, type GameState, type Input } from './state'

export function step(s: GameState, _input: Input): void {
  if (s.mode === 'over') return
  s.tick += 1
  s.t = s.tick * DT
}
