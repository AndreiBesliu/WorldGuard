import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { CORE } from '../data/layout'
import { addFoe, addNode, padOf, quietGame } from '../sim/testkit'
import { regrown, shieldSpan, turretAim } from './derive'

describe('ce citește desenul din stare', () => {
  it('turela fără țintă arată dinspre nucleu în afară', () => {
    const s = quietGame(), p = padOf(s, 'turret', 0)
    expect(turretAim(s, p)).toBeCloseTo(Math.atan2(p.by - CORE.y, p.bx - CORE.x), 9)
  })
  it('turela arată spre cea mai apropiată navă vie din bătaie', () => {
    const s = quietGame(), p = padOf(s, 'turret', 0)
    addFoe(s, p.bx, p.by + 150)                       // vie, la 150
    addFoe(s, p.bx + 60, p.by, { hp: 0 })             // mai aproape, dar doborâtă
    addFoe(s, p.bx - 100, p.by)                       // vie, la 100: cea mai apropiată
    expect(turretAim(s, p)).toBeCloseTo(Math.PI, 9)
  })
  it('o navă aflată exact la marginea bătăii nu e țintă', () => {
    const s = quietGame(), p = padOf(s, 'turret', 0)
    addFoe(s, p.bx + BALANCE.turret.range, p.by)
    expect(turretAim(s, p)).toBeCloseTo(Math.atan2(p.by - CORE.y, p.bx - CORE.x), 9)
  })
  it('inelul: gol la viață zero sau sub, întreg la viață plină sau peste', () => {
    expect(shieldSpan(0, 400)).toBe(0)
    expect(shieldSpan(-5, 400)).toBe(0)
    expect(shieldSpan(400, 400)).toBeCloseTo(2 * Math.PI, 9)
    expect(shieldSpan(500, 400)).toBeCloseTo(2 * Math.PI, 9)
    expect(shieldSpan(100, 400)).toBeCloseTo(Math.PI / 2, 9)
  })
  it('resursa golită crește la loc de la 0 la 1', () => {
    const s = quietGame(), n = addNode(s, 'crystal', 300, 300), grow = BALANCE.node.crystal.regrow
    expect(regrown(n, 5)).toBe(1)                     // plină
    n.left = 0; n.regrowAt = 10 + grow
    expect(regrown(n, 10)).toBe(0)
    expect(regrown(n, 10 + grow / 2)).toBeCloseTo(0.5, 9)
    expect(regrown(n, 10 + grow + 3)).toBe(1)
  })
})
