// Purtările jucătorilor automați: ce cumpără, pe rând, și ce urmăresc la fiecare pas.
// Doar citesc starea. Cifrele de mai jos nu sunt cifre de joc: sunt ale jucătorilor automați.
import { BALANCE, cost } from '../data/balance'
import { CORE } from '../data/layout'
import { heroReady } from '../sim/mods'
import type { Foe, GameState, Pad, Res, ResNode } from '../sim/state'

export type BotName = 'nimic' | 'amestec' | 'doar-nava' | 'fara-nava' | 'fara-economie'
export type Category = 'turret' | 'economy' | 'hero'
export interface Policy { name: BotName; label: string; still: boolean; buy: readonly Category[] }

/** În ordinea tabelului din design. */
export const POLICIES: readonly Policy[] = [
  { name: 'nimic', label: 'Nimic', still: true, buy: [] },
  { name: 'amestec', label: 'Amestec', still: false, buy: ['turret', 'economy', 'hero'] },
  { name: 'doar-nava', label: 'Doar navă', still: false, buy: ['hero'] },
  { name: 'fara-nava', label: 'Fără navă', still: false, buy: ['turret', 'economy'] },
  { name: 'fara-economie', label: 'Fără economie', still: false, buy: ['turret', 'hero'] },
]

export const GUARD = 120   // raza de apărare în jurul centrului planetei, px: o navă dușmană mai aproape lasă totul în urmă

export type Goal =
  | { kind: 'none' }
  | { kind: 'fight'; foe: Foe }
  | { kind: 'pay'; pad: Pad }
  | { kind: 'gather'; node: ResNode; pad: Pad }
  | { kind: 'home' }

/** Câte niveluri a cumpărat: nava peste nivelul 1, plus turelele, colectorul și mina. */
export function bought(s: GameState): number {
  let n = s.hero.lvl - 1
  for (const p of s.pads) if (p.kind === 'turret' || p.kind === 'collector' || p.kind === 'mine') n += p.lvl
  return n
}

function padOfKind(s: GameState, kind: Pad['kind']): Pad | null {
  return s.pads.find((p) => p.kind === kind) ?? null
}

/** Cercul de cumpărat din categorie, sau null dacă acolo totul e la maxim. */
function pick(s: GameState, cat: Category): Pad | null {
  if (cat === 'hero') return heroReady(s) ? padOfKind(s, 'hero') : null   // sub prag, cercul navei nu primește plată
  if (cat === 'turret') {
    let best: Pad | null = null
    for (const p of s.pads) if (p.kind === 'turret' && p.lvl < BALANCE.turret.maxLevel && (!best || p.lvl < best.lvl)) best = p
    return best
  }
  const c = padOfKind(s, 'collector'), m = padOfKind(s, 'mine')
  const cOk = c !== null && c.lvl < BALANCE.collector.maxLevel
  const mOk = m !== null && m.lvl < BALANCE.mine.maxLevel
  if (cOk && (!mOk || c.lvl <= m.lvl)) return c
  return mOk ? m : null
}

/**
 * Cercul navei, dacă purtarea cumpără nava, nava e gata de nivel și stocul acoperă ce a rămas de plătit acolo; altfel null.
 * Un jucător adevărat își ia nivelul imediat ce e gata: plata asta trece înaintea rândului și a luptei.
 */
function heroDue(s: GameState, buy: readonly Category[]): Pad | null {
  if (!buy.includes('hero') || !heroReady(s)) return null
  const pad = padOfKind(s, 'hero')
  if (!pad) return null
  const left = remaining(s, pad)
  return s.crystal >= left.crystal && s.metal >= left.metal ? pad : null
}

/** Cercul la care merg banii acum: nava gata și plătibilă; altfel categoria de rând, sau următoarea din listă care mai are ce cumpăra. */
export function nextPad(s: GameState, buy: readonly Category[]): Pad | null {
  const due = heroDue(s, buy)
  if (due) return due
  const start = buy.length > 0 ? bought(s) % buy.length : 0
  for (let i = 0; i < buy.length; i++) {
    const p = pick(s, buy[(start + i) % buy.length]!)
    if (p) return p
  }
  return null
}

/** Ce a rămas de plătit la cerc pentru nivelul următor. */
function remaining(s: GameState, pad: Pad): Record<Res, number> {
  if (pad.kind === 'repair') return { crystal: 0, metal: 0 }
  const need = cost(pad.kind, (pad.kind === 'hero' ? s.hero.lvl : pad.lvl) + 1)
  return { crystal: need.crystal - pad.paid.crystal, metal: need.metal - pad.paid.metal }
}

/** Nodul de strâns: cel nevid mai apropiat de navă; dacă toate sunt goale, cel care crește primul la loc. */
function nodeFor(s: GameState, type: Res): ResNode | null {
  let best: ResNode | null = null, bd = Infinity
  for (const n of s.nodes) {
    if (n.type !== type || n.left <= 0) continue
    const d = Math.hypot(n.x - s.hero.x, n.y - s.hero.y)
    if (d < bd) { bd = d; best = n }
  }
  if (best) return best
  for (const n of s.nodes) if (n.type === type && n.regrowAt < bd) { bd = n.regrowAt; best = n }
  return best
}

export function chooseGoal(s: GameState, p: Policy, guard = GUARD): Goal {
  if (p.still || s.hero.dead) return { kind: 'none' }
  const due = heroDue(s, p.buy)
  if (due) return { kind: 'pay', pad: due }
  let foe: Foe | null = null, fd = guard
  for (const f of s.foes) {
    if (f.hp <= 0) continue
    const d = Math.hypot(f.x - CORE.x, f.y - CORE.y)
    if (d < fd) { fd = d; foe = f }
  }
  if (foe) return { kind: 'fight', foe }
  const pad = nextPad(s, p.buy)
  if (!pad) return { kind: 'home' }
  const left = remaining(s, pad)
  const missC = Math.max(0, left.crystal - s.crystal), missM = Math.max(0, left.metal - s.metal)
  if (missC === 0 && missM === 0) return { kind: 'pay', pad }
  const node = nodeFor(s, missM > missC ? 'metal' : 'crystal')
  return node ? { kind: 'gather', node, pad } : { kind: 'home' }
}
