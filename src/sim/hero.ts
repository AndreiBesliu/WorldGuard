// Eroul: reapariție, mers, coliziuni, refacere, strâns, scutul. Nu atacă (asta e în luptă).
// Modulele de corp și cele utilitare (Blindaj, Scut, Reparator, Motor, Magnet) lucrează aici; Releul, în luptă.
import { BALANCE } from '../data/balance'
import { CORE, HOME, WORLD } from '../data/layout'
import { atTier, MODS } from '../data/modules'
import { modOf, tierOf } from './mods'
import { DT, EPS, NEVER, type GameState, type Input, type PadKind, type ResNode } from './state'

export function heroMaxHp(s: GameState): number {
  const armor = tierOf(s, 'armor')
  return BALANCE.hero.hp + BALANCE.hero.hpPerLevel * (s.hero.lvl - 1) + (armor > 0 ? atTier(MODS.armor.hp, armor) : 0)
}

/** Lovitura Undei de acum; 0 dacă nava nu o are. */
export function heroDamage(s: GameState): number {
  const wave = tierOf(s, 'wave')
  return wave > 0 ? atTier(MODS.wave.dmg, wave) : 0
}

/** Arcul Undei de acum, radiani: sunt loviți dușmanii al căror unghi față de țintă e cel mult atât. */
export function heroArc(s: GameState): number {
  return atTier(MODS.wave.arc, Math.max(1, tierOf(s, 'wave')))
}

/** Raza unei clădiri care îl oprește pe erou; cercurile de erou și de reparat nu opresc pe nimeni. */
function buildingR(kind: PadKind): number {
  if (kind === 'turret' || kind === 'collector' || kind === 'mine') return BALANCE[kind].r
  return 0
}

/** Împinge eroul în afara cercului (ox, oy, or), pe normală; la distanță zero, pe axa x. */
function pushOut(s: GameState, ox: number, oy: number, or: number): void {
  const h = s.hero
  const dx = h.x - ox, dy = h.y - oy, d = Math.hypot(dx, dy), min = BALANCE.hero.r + or
  if (d >= min) return
  if (d <= EPS) { h.x = ox + min; return }
  h.x = ox + (dx / d) * min
  h.y = oy + (dy / d) * min
}

function collide(s: GameState): void {
  const h = s.hero
  pushOut(s, CORE.x, CORE.y, CORE.r)
  for (const n of s.nodes) if (n.left > 0) pushOut(s, n.x, n.y, BALANCE.node[n.type].r)
  for (const p of s.pads) if (p.lvl > 0 && buildingR(p.kind) > 0) pushOut(s, p.bx, p.by, buildingR(p.kind))
  const e = BALANCE.hero.edge
  h.x = Math.min(WORLD.w - e, Math.max(e, h.x))
  h.y = Math.min(WORLD.h - e, Math.max(e, h.y))
}

function gather(s: GameState): void {
  const h = s.hero
  h.gatherT = Math.max(0, h.gatherT - DT)
  const magnet = tierOf(s, 'magnet')
  let best: ResNode | null = null
  let bestD: number = magnet > 0 ? atTier(MODS.magnet.reach, magnet) : BALANCE.node.reach
  for (const n of s.nodes) {
    if (n.left <= 0) continue
    const d = Math.hypot(n.x - h.x, n.y - h.y) - BALANCE.node[n.type].r - BALANCE.hero.r
    if (d <= bestD) { bestD = d; best = n }
  }
  if (!best || h.gatherT > EPS) return
  const cfg = BALANCE.node[best.type]
  best.left -= 1
  s[best.type] += 1
  best.shakeT = s.t
  h.gatherT = cfg.every * (magnet > 0 ? atTier(MODS.magnet.every, magnet) : 1)
  s.fx.push({ kind: 'gain', res: best.type, x: best.x, y: best.y, t0: s.t })
  if (best.left <= 0) best.regrowAt = s.t + cfg.regrow
}

export function updateHero(s: GameState, input: Input): void {
  const h = s.hero
  const shield = modOf(s, 'shield')
  if (shield) shield.t = Math.max(0, shield.t - DT)   // scutul se reface și cât nava e doborâtă
  if (h.dead) {
    h.respawnT -= DT
    if (h.respawnT <= EPS) {
      h.dead = false
      h.hp = heroMaxHp(s)
      h.x = HOME.x
      h.y = HOME.y
      h.hurtT = NEVER
    }
    return
  }
  const raw = Math.hypot(input.x, input.y)
  const cap = raw > 1 ? 1 / raw : 1                // comanda are cel mult lungimea 1, oricine ar chema pasul
  const ix = input.x * cap, iy = input.y * cap, mag = Math.min(1, raw)
  if (mag > BALANCE.hero.deadzone) {
    const engine = tierOf(s, 'engine')
    const speed = BALANCE.hero.speed * (engine > 0 ? atTier(MODS.engine.speed, engine) : 1)
    h.x += ix * speed * DT
    h.y += iy * speed * DT
    h.moved = true
    if (s.t - h.waveT > BALANCE.hero.faceLock) h.face = Math.atan2(iy, ix)
  }
  collide(s)
  const mender = tierOf(s, 'mender')                 // cu Reparator, refacerea lui o înlocuiește pe cea de bază
  const wait = mender > 0 ? atTier(MODS.mender.wait, mender) : BALANCE.hero.regenWait
  const regen = mender > 0 ? atTier(MODS.mender.regen, mender) : BALANCE.hero.regen
  if (s.t - h.hurtT - wait > EPS && h.hp < heroMaxHp(s)) {
    h.hp = Math.min(heroMaxHp(s), h.hp + regen * DT)
  }
  gather(s)
}

export function hurtHero(s: GameState, dmg: number): void {
  const h = s.hero
  if (h.dead) return
  const shield = modOf(s, 'shield')
  if (shield && shield.t <= EPS) {                   // scutul încărcat oprește lovitura cu totul și pornește să se refacă
    shield.t = atTier(MODS.shield.every, shield.tier)
    s.fx.push({ kind: 'block', x: h.x, y: h.y, t0: s.t })
    return
  }
  h.hp = Math.max(0, h.hp - dmg)
  h.hurtT = s.t
  if (h.hp <= EPS) {
    h.dead = true
    h.respawnT = BALANCE.hero.respawn
    s.fx.push({ kind: 'heroDown', x: h.x, y: h.y, t0: s.t })
    s.fx.push({ kind: 'puff', r: BALANCE.hero.puffR, x: h.x, y: h.y, t0: s.t })
  }
}
