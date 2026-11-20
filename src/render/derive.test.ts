import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { CORE } from '../data/layout'
import { addFoe, addNode, padOf, quietGame } from '../sim/testkit'
import { blastReach, blockGlow, fade, regrown, shieldReady, shieldSpan, turretAim } from './derive'

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

describe('modulele și tragerile, citite pentru desen', () => {
  it('scutul se vede încărcat doar cu modulul pe navă, cu ceasul la zero și cu nava vie', () => {
    const s = quietGame()
    expect(shieldReady(s)).toBe(false)                // fără Scut
    s.hero.mods.push({ id: 'shield', tier: 1, t: 0 })
    expect(shieldReady(s)).toBe(true)
    s.hero.mods[1]!.t = 2
    expect(shieldReady(s)).toBe(false)                // se reface
    s.hero.mods[1]!.t = 0; s.hero.dead = true
    expect(shieldReady(s)).toBe(false)
  })
  it('inelul clipește după ultima lovitură oprită: 1 chiar atunci, spre 0 la capătul duratei, 0 fără efect', () => {
    const s = quietGame(); s.t = 10
    expect(blockGlow(s)).toBe(0)
    s.fx.push({ kind: 'block', x: 0, y: 0, t0: 10 - BALANCE.fx.blockLife / 2 })
    expect(blockGlow(s)).toBeCloseTo(0.5, 9)
    s.fx.push({ kind: 'block', x: 0, y: 0, t0: 10 })
    expect(blockGlow(s)).toBe(1)                      // cea mai nouă câștigă
    s.t = 10 + BALANCE.fx.blockLife
    expect(blockGlow(s)).toBe(0)
  })
  it('stingerea: 1 la început, 0 la capăt și după, niciodată sub 0', () => {
    expect(fade(0, 0.3)).toBe(1)
    expect(fade(0.15, 0.3)).toBeCloseTo(0.5, 9)
    expect(fade(0.3, 0.3)).toBe(0)
    expect(fade(1, 0.3)).toBe(0)
  })
  it('explozia crește până la zona ei și nu trece de ea', () => {
    const life = BALANCE.fx.blastLife
    expect(blastReach(50, 0)).toBeGreaterThan(0)
    expect(blastReach(50, 0)).toBeLessThan(50 / 2)
    expect(blastReach(50, life / 2)).toBeGreaterThan(blastReach(50, life / 4))
    expect(blastReach(50, life)).toBeCloseTo(50, 9)
    expect(blastReach(50, life * 2)).toBeCloseTo(50, 9)
  })
})
