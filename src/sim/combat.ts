// Lupta: unda eroului, tragerea turelelor, zborul razelor.
import { BALANCE, turretDamage } from '../data/balance'
import { DT, EPS, type Foe, type GameState } from './state'
import { heroDamage } from './hero'
import { hurtFoe } from './foes'

/** Eroul trimite unda când îi vine rândul și are un dușman în rază: toți cei din arcul din jurul celui mai apropiat. */
function strike(s: GameState): void {
  const h = s.hero
  if (h.dead) return
  h.strikeT = Math.max(0, h.strikeT - DT)
  if (h.strikeT > EPS) return
  let near = null as GameState['foes'][number] | null
  let nearD: number = BALANCE.hero.reach
  for (const f of s.foes) {
    if (f.hp <= EPS) continue
    const d = Math.hypot(f.x - h.x, f.y - h.y) - f.r
    if (d <= nearD) { nearD = d; near = f }
  }
  if (!near) return                                              // fără țintă, unda pleacă în pasul în care apare una
  const a = Math.atan2(near.y - h.y, near.x - h.x)
  const dmg = heroDamage(s)
  for (const f of s.foes) {
    if (f.hp <= EPS) continue
    const dx = f.x - h.x, dy = f.y - h.y, d = Math.hypot(dx, dy)
    if (d - f.r > BALANCE.hero.reach) continue
    const diff = Math.atan2(dy, dx) - a
    const da = Math.atan2(Math.sin(diff), Math.cos(diff))      // diferența, adusă în [−π, π]
    if (Math.abs(da) > BALANCE.hero.arc) continue
    hurtFoe(s, f, dmg)
    const k = f.brute ? BALANCE.hero.pushBrute : BALANCE.hero.push
    f.kx += (d <= EPS ? 1 : dx / d) * k
    f.ky += (d <= EPS ? 0 : dy / d) * k
  }
  h.strikeT = BALANCE.hero.strikeEvery
  h.waveT = s.t
  h.waveA = a
  h.face = a
}

/** Cel mai apropiat dușman viu aflat strict mai aproape de (x, y) decât `range`; la egalitate, primul din listă. */
export function nearestFoeWithin(s: GameState, x: number, y: number, range: number): Foe | null {
  let near: Foe | null = null
  let nearD = range
  for (const f of s.foes) {
    if (f.hp <= EPS) continue
    const d = Math.hypot(f.x - x, f.y - y)
    if (d < nearD) { nearD = d; near = f }
  }
  return near
}

/** Fiecare turelă construită trage în cel mai apropiat dușman viu din bătaia ei. */
function fireTurrets(s: GameState): void {
  for (const p of s.pads) {
    if (p.kind !== 'turret' || p.lvl <= 0) continue
    p.cool -= DT
    if (p.cool > EPS) continue
    const near = nearestFoeWithin(s, p.bx, p.by, BALANCE.turret.range)
    if (!near) { p.cool = 0; continue }
    s.shots.push({ x: p.bx, y: p.by, tx: near.x, ty: near.y, a: 0, targetId: near.id, dmg: turretDamage(p.lvl) })
    p.cool = BALANCE.turret.every
  }
}

/** Razele zboară spre ținta de acum; rămase fără ținte, merg la ultimul punct știut și dispar. */
function flyShots(s: GameState): void {
  const move = BALANCE.turret.shotSpeed * DT
  const kept: GameState['shots'] = []
  for (const sh of s.shots) {
    const target = sh.targetId < 0 ? undefined : s.foes.find((f) => f.id === sh.targetId)
    if (target && target.hp > EPS) { sh.tx = target.x; sh.ty = target.y }
    else sh.targetId = -1
    const dx = sh.tx - sh.x, dy = sh.ty - sh.y, d = Math.hypot(dx, dy)
    if (d > EPS) sh.a = Math.atan2(dy, dx)
    if (d <= move + BALANCE.turret.arrive) {
      if (sh.targetId >= 0 && target) hurtFoe(s, target, sh.dmg)
      continue
    }
    sh.x += (dx / d) * move
    sh.y += (dy / d) * move
    kept.push(sh)
  }
  s.shots = kept
}

export function updateCombat(s: GameState): void {
  strike(s)
  fireTurrets(s)
  flyShots(s)
}
