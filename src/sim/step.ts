// Un pas de simulare, de 1/60 s. Ceasul, eroul, cercurile, lupta, dușmanii și resursele.
import { BALANCE } from '../data/balance'
import { DT, EPS, type Fx, type GameState, type Input } from './state'
import { updateHero } from './hero'
import { updatePads } from './pads'
import { updateCombat } from './combat'
import { updateFoes } from './foes'

/** Cât trăiește un efect, secunde. */
export function fxLife(f: Fx): number {
  switch (f.kind) {
    case 'puff': return BALANCE.fx.puffLife
    case 'beam': return BALANCE.fx.beamLife
    case 'blast': return BALANCE.fx.blastLife
    case 'block': return BALANCE.fx.blockLife
    default: return BALANCE.fx.textLife
  }
}

export function step(s: GameState, input: Input): void {
  if (s.mode === 'over' || s.offer !== null) return   // cât o ofertă e deschisă, jocul stă pe loc
  s.tick += 1
  s.t = s.tick * DT
  updateHero(s, input)
  updatePads(s)
  updateCombat(s)
  updateFoes(s)
  s.fx = s.fx.filter((f) => s.t - f.t0 <= fxLife(f))                                               // efectele bătrâne dispar
  if (s.core.hp <= EPS) { s.core.hp = 0; s.mode = 'over' }                                          // nucleul a căzut
  for (const n of s.nodes) if (n.left === 0 && s.t + EPS >= n.regrowAt) n.left = BALANCE.node[n.type].amount   // resursa crește la loc
}
