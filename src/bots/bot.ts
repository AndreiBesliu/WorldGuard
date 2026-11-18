// Un jucător automat: din purtare și stare, comanda joystickului pentru pasul următor.
// Doar citește starea. Niciun jucător automat nu repară planeta.
import { BALANCE } from '../data/balance'
import { HOME, PAD_R } from '../data/layout'
import type { GameState, Input } from '../sim/state'
import { createNav, offForeignPad, slipOff, type Nav } from './nav'
import { chooseGoal, GUARD, nextPad, type Goal, type Policy } from './policy'

const ZERO: Input = { x: 0, y: 0 }
const FIGHT_REACH = 0.7   // se oprește la atâta din bătaia undei, plus raza navei dușmane, de centrul ei
const PAY_STOP = 0.4      // se oprește la atâta din raza cercului, de centrul lui
const GATHER_SLACK = 4    // cât intră sub bătaia de strâns, px
const HOME_STOP = 6       // cât de aproape de casă se oprește, px

export type Bot = (s: GameState) => Input

function go(s: GameState, nav: Nav, g: Goal): Input {
  switch (g.kind) {
    case 'none': return ZERO
    case 'fight': return nav.toward(s, g.foe.x, g.foe.y, BALANCE.hero.reach * FIGHT_REACH + g.foe.r)
    case 'pay': return nav.toward(s, g.pad.x, g.pad.y, PAD_R * PAY_STOP)
    case 'gather': {
      const stop = BALANCE.node[g.node.type].r + BALANCE.hero.r + BALANCE.node.reach - GATHER_SLACK
      return nav.toward(s, g.node.x, g.node.y, stop)
    }
    case 'home': return nav.toward(s, HOME.x, HOME.y, HOME_STOP)
  }
}

export function createBot(p: Policy, guard = GUARD): Bot {
  const nav = createNav()
  return (s) => {
    const out = go(s, nav, chooseGoal(s, p, guard))
    if (p.still || s.hero.dead) return out
    const target = nextPad(s, p.buy)   // singurul cerc pe care are voie să stea și să plătească
    if (out.x === 0 && out.y === 0) return offForeignPad(s, target) ?? out
    return slipOff(s, target, out) ?? out
  }
}
