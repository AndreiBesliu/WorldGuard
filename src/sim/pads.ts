// Cercurile de investit: plata, terminarea nivelului, producția colectorului și a minei, reparatul.
// Nu trage cu turelele: asta e în lupta de mai târziu.
import { BALANCE, cost } from '../data/balance'
import { PAD_R } from '../data/layout'
import { DT, EPS, type BuildKind, type GameState, type Pad, type Res } from './state'
import { heroMaxHp } from './hero'

const RES: readonly Res[] = ['crystal', 'metal']

/** Nivelul construcției de la cerc; pentru erou, nivelul eroului. */
export function levelOf(s: GameState, p: Pad): number {
  return p.kind === 'hero' ? s.hero.lvl : p.lvl
}

function maxLevelOf(kind: BuildKind): number {
  return BALANCE[kind].maxLevel
}

/** Costul nivelului următor; null la „repair” și la nivel maxim. */
export function nextCost(s: GameState, p: Pad): Record<Res, number> | null {
  if (p.kind === 'repair') return null
  const lvl = levelOf(s, p)
  if (lvl >= maxLevelOf(p.kind)) return null
  return cost(p.kind, lvl + 1)
}

function finishLevel(s: GameState, p: Pad, kind: BuildKind): void {
  p.paid = { crystal: 0, metal: 0 }
  p.dwell = -BALANCE.pay.restAfterLevel
  p.popT = s.t
  let lvl: number
  if (kind === 'hero') {
    s.hero.lvl += 1
    s.hero.hp = heroMaxHp(s)
    lvl = s.hero.lvl
    s.fx.push({ kind: 'level', what: kind, lvl, x: p.x, y: p.y, t0: s.t })
    return
  }
  p.lvl += 1
  lvl = p.lvl
  if ((kind === 'collector' || kind === 'mine') && lvl === 1) p.prodT = BALANCE[kind].every[0]   // producția pornește la prima construire
  s.fx.push({ kind: 'level', what: kind, lvl, x: p.bx, y: p.by, t0: s.t })
}

/** O unitate plătită la un cerc de construit; false dacă nu e nimic de plătit. */
function payUnit(s: GameState, p: Pad, kind: BuildKind, need: Record<Res, number>): boolean {
  const can = RES.filter((r) => need[r] - p.paid[r] > 0 && s[r] >= 1)
  const r = can.length === 2 ? (p.flip ? 'metal' : 'crystal') : can[0]
  if (!r) return false
  if (can.length === 2) p.flip = !p.flip
  s[r] -= 1
  p.paid[r] += 1
  if (RES.every((x) => p.paid[x] >= need[x])) finishLevel(s, p, kind)
  return true
}

function payPad(s: GameState, p: Pad): void {
  p.payT -= DT
  while (p.payT <= EPS) {
    if (p.kind === 'repair') {
      if (s.metal < 1 || s.core.hp >= BALANCE.core.hp - EPS) { p.payT = 0; return }
      s.metal -= 1
      s.core.hp = Math.min(BALANCE.core.hp, s.core.hp + BALANCE.repair.heal)
      p.payT += BALANCE.repair.every
      continue
    }
    const need = nextCost(s, p)
    if (!need || !payUnit(s, p, p.kind, need)) { p.payT = 0; return }
    p.payT += BALANCE.pay.every
    if (p.dwell < 0) return   // nivelul s-a încheiat: pauza de după nivel
  }
}

function produce(s: GameState, p: Pad): void {
  if ((p.kind !== 'collector' && p.kind !== 'mine') || p.lvl < 1) return
  p.prodT -= DT
  if (p.prodT > EPS) return
  const res: Res = p.kind === 'collector' ? 'crystal' : 'metal'
  s[res] += 1
  s.fx.push({ kind: 'gain', res, x: p.bx, y: p.by, t0: s.t })
  p.prodT += BALANCE[p.kind].every[p.lvl - 1] ?? BALANCE[p.kind].every[0]
}

export function updatePads(s: GameState): void {
  const h = s.hero
  for (const p of s.pads) {
    produce(s, p)
    const onPad = !h.dead && Math.hypot(h.x - p.x, h.y - p.y) <= PAD_R
    if (!onPad) {
      p.dwell = p.dwell > EPS ? 0 : Math.min(0, p.dwell + DT)
      p.payT = 0
      continue
    }
    if (p.dwell < BALANCE.pay.dwell) { p.dwell += DT; p.payT = 0; continue }
    payPad(s, p)
  }
}
