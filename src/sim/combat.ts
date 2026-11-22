// Lupta: armele navei (Unda, Laserul, Rachetele), tragerea turelelor (cu Releul), zborul razelor și al rachetelor.
// Ordinea în pas: unda, laserul, rachetele, apoi turelele; armele pot trage în același pas.
import { BALANCE, turretDamage } from '../data/balance'
import { atTier, MODS } from '../data/modules'
import { DT, EPS, type Foe, type GameState, type Mod, type Shot } from './state'
import { heroArc, heroDamage } from './hero'
import { hurtFoe } from './foes'
import { armsFactor } from './boost'
import { modOf, tierOf } from './mods'

/** Cel mai apropiat dușman viu a cărui margine e la cel mult `range` de (x, y); la egalitate, ultimul din listă. */
function nearestEdgeWithin(s: GameState, x: number, y: number, range: number): Foe | null {
  let near: Foe | null = null
  let nearD = range
  for (const f of s.foes) {
    if (f.hp <= EPS) continue
    const d = Math.hypot(f.x - x, f.y - y) - f.r
    if (d <= nearD) { nearD = d; near = f }
  }
  return near
}

/** Eroul trimite unda când îi vine rândul și are un dușman în rază: toți cei din arcul din jurul celui mai apropiat. */
function strike(s: GameState): void {
  const h = s.hero
  if (tierOf(s, 'wave') === 0) return
  h.strikeT = Math.max(0, h.strikeT - DT)
  if (h.strikeT > EPS) return
  const near = nearestEdgeWithin(s, h.x, h.y, BALANCE.hero.reach)
  if (!near) return                                              // fără țintă, unda pleacă în pasul în care apare una
  const a = Math.atan2(near.y - h.y, near.x - h.x)
  const dmg = heroDamage(s), arc = heroArc(s)
  for (const f of s.foes) {
    if (f.hp <= EPS) continue
    const dx = f.x - h.x, dy = f.y - h.y, d = Math.hypot(dx, dy)
    if (d - f.r > BALANCE.hero.reach) continue
    const diff = Math.atan2(dy, dx) - a
    const da = Math.atan2(Math.sin(diff), Math.cos(diff))      // diferența, adusă în [−π, π]
    if (Math.abs(da) > arc) continue
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

/** Ceasul unei arme: curge, iar la zero întoarce ținta din rază (cel mai apropiat), dacă există; fără țintă, așteaptă la zero. */
function ready(s: GameState, m: Mod, range: number): Foe | null {
  m.t = Math.max(0, m.t - DT)
  if (m.t > EPS) return null
  return nearestEdgeWithin(s, s.hero.x, s.hero.y, range)
}

/** Laserul lovește pe loc cel mai apropiat dușman din rază și lasă raza de lumină. */
function laser(s: GameState): void {
  const m = modOf(s, 'laser')
  if (!m) return
  const f = ready(s, m, MODS.laser.range)
  if (!f) return
  hurtFoe(s, f, atTier(MODS.laser.dmg, m.tier) * armsFactor(s))
  s.fx.push({ kind: 'beam', x: s.hero.x, y: s.hero.y, tx: f.x, ty: f.y, t0: s.t })
  m.t = MODS.laser.every
}

/** Racheta pleacă spre cel mai apropiat dușman din rază; lovește la sosire (în `flyShots`). */
function missile(s: GameState): void {
  const m = modOf(s, 'missile')
  if (!m) return
  const f = ready(s, m, MODS.missile.range)
  if (!f) return
  s.shots.push({
    x: s.hero.x, y: s.hero.y, tx: f.x, ty: f.y, a: 0, targetId: f.id,
    dmg: atTier(MODS.missile.dmg, m.tier) * armsFactor(s), kind: 'missile', blast: MODS.missile.blast,
  })
  m.t = MODS.missile.every
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

/** Fiecare turelă construită trage în cel mai apropiat dușman viu din bătaia ei; cu Releul și nava vie aproape, mai des. */
function fireTurrets(s: GameState): void {
  const relay = s.hero.dead ? 0 : tierOf(s, 'relay')
  for (const p of s.pads) {
    if (p.kind !== 'turret' || p.lvl <= 0) continue
    p.cool -= DT
    if (p.cool > EPS) continue
    const near = nearestFoeWithin(s, p.bx, p.by, BALANCE.turret.range)
    if (!near) { p.cool = 0; continue }
    s.shots.push({ x: p.bx, y: p.by, tx: near.x, ty: near.y, a: 0, targetId: near.id, dmg: turretDamage(p.lvl), kind: 'bolt', blast: 0 })
    const close = relay > 0 && Math.hypot(p.bx - s.hero.x, p.by - s.hero.y) <= MODS.relay.range
    p.cool = BALANCE.turret.every / (close ? atTier(MODS.relay.every, relay) : 1)
  }
}

/** Racheta sosită: lovește toți dușmanii vii din zona ei și lasă explozia. */
function explode(s: GameState, sh: Shot): void {
  for (const f of s.foes) {
    if (f.hp > EPS && Math.hypot(f.x - sh.tx, f.y - sh.ty) - f.r <= sh.blast) hurtFoe(s, f, sh.dmg)
  }
  s.fx.push({ kind: 'blast', r: sh.blast, x: sh.tx, y: sh.ty, t0: s.t })
}

/**
 * Razele și rachetele zboară spre ținta de acum; rămase fără ținte, merg la ultimul punct știut.
 * Acolo raza dispare, iar racheta explodează.
 */
function flyShots(s: GameState): void {
  const kept: GameState['shots'] = []
  for (const sh of s.shots) {
    const move = (sh.kind === 'missile' ? MODS.missile.speed : BALANCE.turret.shotSpeed) * DT
    const target = sh.targetId < 0 ? undefined : s.foes.find((f) => f.id === sh.targetId)
    if (target && target.hp > EPS) { sh.tx = target.x; sh.ty = target.y }
    else sh.targetId = -1
    const dx = sh.tx - sh.x, dy = sh.ty - sh.y, d = Math.hypot(dx, dy)
    if (d > EPS) sh.a = Math.atan2(dy, dx)
    if (d <= move + BALANCE.turret.arrive) {
      if (sh.kind === 'missile') explode(s, sh)
      else if (sh.targetId >= 0 && target) hurtFoe(s, target, sh.dmg)
      continue
    }
    sh.x += (dx / d) * move
    sh.y += (dy / d) * move
    kept.push(sh)
  }
  s.shots = kept
}

export function updateCombat(s: GameState): void {
  if (!s.hero.dead) {          // nava doborâtă nu trage, iar ceasurile armelor ei nu curg
    strike(s)
    laser(s)
    missile(s)
  }
  fireTurrets(s)
  flyShots(s)
}
