// Eroul: reapariție, mers, coliziuni, refacere, strâns. Nu lovește (asta e în lupta de mai târziu).
import { BALANCE } from '../data/balance'
import { CASTLE, HOME, WORLD } from '../data/layout'
import { DT, EPS, NEVER, type GameState, type Input, type PadKind, type ResNode } from './state'

export function heroMaxHp(s: GameState): number {
  return BALANCE.hero.hp + BALANCE.hero.hpPerLevel * (s.hero.lvl - 1)
}

export function heroDamage(s: GameState): number {
  return BALANCE.hero.dmg + BALANCE.hero.dmgPerLevel * (s.hero.lvl - 1)
}

/** Raza unei clădiri care îl oprește pe erou; cercurile de erou și de reparat nu opresc pe nimeni. */
function buildingR(kind: PadKind): number {
  if (kind === 'tower' || kind === 'camp' || kind === 'quarry') return BALANCE[kind].r
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
  pushOut(s, CASTLE.x, CASTLE.y, CASTLE.r)
  for (const n of s.nodes) if (n.left > 0) pushOut(s, n.x, n.y, BALANCE.node[n.type].r)
  for (const p of s.pads) if (p.lvl > 0 && buildingR(p.kind) > 0) pushOut(s, p.bx, p.by, buildingR(p.kind))
  const e = BALANCE.hero.edge
  h.x = Math.min(WORLD.w - e, Math.max(e, h.x))
  h.y = Math.min(WORLD.h - e, Math.max(e, h.y))
}

function gather(s: GameState): void {
  const h = s.hero
  h.gatherT = Math.max(0, h.gatherT - DT)
  let best: ResNode | null = null
  let bestD: number = BALANCE.node.reach
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
  h.gatherT = cfg.every
  s.fx.push({ kind: 'gain', res: best.type, x: best.x, y: best.y, t0: s.t })
  if (best.left <= 0) best.regrowAt = s.t + cfg.regrow
}

export function updateHero(s: GameState, input: Input): void {
  const h = s.hero
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
  const mag = Math.hypot(input.x, input.y)
  if (mag > BALANCE.hero.deadzone) {
    h.x += input.x * BALANCE.hero.speed * DT
    h.y += input.y * BALANCE.hero.speed * DT
    h.moved = true
    h.walk += DT * mag
    if (s.t - h.slashT > BALANCE.hero.faceLock) h.face = Math.atan2(input.y, input.x)
  }
  collide(s)
  if (s.t - h.hurtT - BALANCE.hero.regenWait > EPS && h.hp < heroMaxHp(s)) {
    h.hp = Math.min(heroMaxHp(s), h.hp + BALANCE.hero.regen * DT)
  }
  gather(s)
}

export function hurtHero(s: GameState, dmg: number): void {
  const h = s.hero
  if (h.dead) return
  h.hp = Math.max(0, h.hp - dmg)
  h.hurtT = s.t
  if (h.hp <= EPS) {
    h.dead = true
    h.respawnT = BALANCE.hero.respawn
    s.fx.push({ kind: 'heroDown', x: h.x, y: h.y, t0: s.t })
    s.fx.push({ kind: 'puff', r: BALANCE.hero.puffR, x: h.x, y: h.y, t0: s.t })
  }
}
