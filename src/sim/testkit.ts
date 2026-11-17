// Ajutoare pentru teste (și, mai târziu, pentru jucătorii automați).
import { BALANCE } from '../data/balance'
import { createGame, NEVER, type GameState, type Input, type Pad, type PadKind, type Res, type ResNode } from './state'
import { step } from './step'

/** createGame fără noduri și fără apariții. */
export function quietGame(seed = 1): GameState {
  const s = createGame(seed)
  s.nodes = []
  s.spawnT = 1e9
  return s
}

export function stepFor(s: GameState, seconds: number, input: Input = { x: 0, y: 0 }): void {
  const n = Math.round(seconds * 60)
  for (let i = 0; i < n; i++) step(s, input)
}

export function heroAt(s: GameState, x: number, y: number): void {
  s.hero.x = x
  s.hero.y = y
}

export function addNode(s: GameState, type: Res, x: number, y: number): ResNode {
  const node: ResNode = { type, x, y, left: BALANCE.node[type].amount, regrowAt: 0, shakeT: NEVER, tilt: 0, shape: [] }
  s.nodes.push(node)
  return node
}

/** Al i-lea cerc de felul dat. */
export function padOf(s: GameState, kind: PadKind, i = 0): Pad {
  const pad = s.pads.filter((p) => p.kind === kind)[i]
  if (!pad) throw new Error(`nu există cercul ${kind} #${i}`)
  return pad
}
