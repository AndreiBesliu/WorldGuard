// Rularea jucătorilor automați: partide întregi, fără browser, pe semințe fixe.
import { choose } from '../sim/mods'
import { createGame, type GameState } from '../sim/state'
import { step } from '../sim/step'
import { createBot } from './bot'
import { GUARD, POLICIES, type BotName, type Policy } from './policy'

export const RUN_CAP = 900   // o partidă se oprește aici chiar dacă planeta n-a căzut, secunde
export const SEEDS: readonly number[] = Array.from({ length: 20 }, (_, i) => i + 1)

export interface Row { name: BotName; label: string; times: number[]; median: number; min: number; max: number }

/** O partidă întreagă, până cade planeta sau până la `cap` secunde. */
export function playOne(p: Policy, seed: number, cap = RUN_CAP, guard = GUARD): GameState {
  const s = createGame(seed)
  const bot = createBot(p, guard)
  while (s.mode === 'playing' && s.t < cap) {
    if (s.offer !== null) choose(s, 0)   // alegerea o face rularea, nu jucătorul automat
    else step(s, bot(s))
  }
  return s
}

/** La un număr par de valori, media celor două din mijloc. */
export function median(xs: readonly number[]): number {
  const v = [...xs].sort((a, b) => a - b), m = v.length >> 1
  return v.length % 2 === 1 ? v[m]! : (v[m - 1]! + v[m]!) / 2
}

/** Timpii pe `SEEDS`, în ordinea semințelor. */
export function measure(p: Policy, guard = GUARD): Row {
  const times = SEEDS.map((seed) => playOne(p, seed, RUN_CAP, guard).t)
  return { name: p.name, label: p.label, times, median: median(times), min: Math.min(...times), max: Math.max(...times) }
}

export function measureAll(guard = GUARD): Row[] {
  return POLICIES.map((p) => measure(p, guard))
}
