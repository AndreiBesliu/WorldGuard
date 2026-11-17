// Un pas de simulare, de 1/60 s. Ceasul, eroul, cercurile, lupta, dușmanii și resursele.
import { BALANCE } from '../data/balance'
import { DT, EPS, type GameState, type Input } from './state'
import { updateHero } from './hero'
import { updatePads } from './pads'
import { updateCombat } from './combat'
import { updateFoes } from './foes'

export function step(s: GameState, input: Input): void {
  if (s.mode === 'over') return
  s.tick += 1
  s.t = s.tick * DT
  updateHero(s, input)
  updatePads(s)
  updateCombat(s)
  updateFoes(s)
  s.fx = s.fx.filter((f) => s.t - f.t0 <= (f.kind === 'puff' ? BALANCE.fx.puffLife : BALANCE.fx.textLife))   // efectele bătrâne dispar
  if (s.castle.hp <= EPS) { s.castle.hp = 0; s.mode = 'over' }                                          // castelul a căzut
  for (const n of s.nodes) if (n.left === 0 && s.t + EPS >= n.regrowAt) n.left = BALANCE.node[n.type].amount   // resursa crește la loc
}
