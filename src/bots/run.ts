// Rularea jucătorilor automați: partide întregi, fără browser, pe semințe fixe.
import { NO_UPS, type Ups } from '../data/workshop'
import { choose } from '../sim/mods'
import { createGame, type GameState } from '../sim/state'
import { step } from '../sim/step'
import { createBot, type Bot } from './bot'
import { GUARD, pickOffer, POLICIES, type BotName, type Policy } from './policy'

export const RUN_CAP = 900   // o partidă se oprește aici chiar dacă planeta n-a căzut, secunde
export const SEEDS: readonly number[] = Array.from({ length: 20 }, (_, i) => i + 1)

// `level`: mediana nivelului navei la sfârșit; `lvl2At`, `lvl5At`: mediana secundei la care nava a atins nivelul 2, respectiv 5 (`RUN_CAP` dacă nu l-a atins).
export interface Row { name: BotName; label: string; times: number[]; median: number; min: number; max: number; level: number; lvl2At: number; lvl5At: number }

/** O partidă jucată și secundele la care nava a atins nivelurile 2 și 5 (`RUN_CAP` dacă nu le-a atins). */
export interface Timed { s: GameState; lvl2At: number; lvl5At: number }

/** O mișcare a rulării: cu o ofertă deschisă, alegerea după `pickOffer` (o face rularea, nu jucătorul automat); altfel un pas. */
export function playStep(s: GameState, p: Policy, bot: Bot): void {
  if (s.offer !== null) choose(s, pickOffer(s, p))
  else step(s, bot(s))
}

/** O partidă întreagă, până cade planeta sau până la `cap` secunde, cu secundele nivelurilor 2 și 5; pornește cu întăririle `ups`. */
export function playTimed(p: Policy, seed: number, cap = RUN_CAP, guard = GUARD, ups: Ups = NO_UPS): Timed {
  const s = createGame(seed, ups)
  const bot = createBot(p, guard)
  let lvl2At = RUN_CAP, lvl5At = RUN_CAP
  while (s.mode === 'playing' && s.t < cap) {
    playStep(s, p, bot)
    if (lvl2At === RUN_CAP && s.hero.lvl >= 2) lvl2At = s.t
    if (lvl5At === RUN_CAP && s.hero.lvl >= 5) lvl5At = s.t
  }
  return { s, lvl2At, lvl5At }
}

/** O partidă întreagă, până cade planeta sau până la `cap` secunde. */
export function playOne(p: Policy, seed: number, cap = RUN_CAP, guard = GUARD): GameState {
  return playTimed(p, seed, cap, guard).s
}

/** La un număr par de valori, media celor două din mijloc. */
export function median(xs: readonly number[]): number {
  const v = [...xs].sort((a, b) => a - b), m = v.length >> 1
  return v.length % 2 === 1 ? v[m]! : (v[m - 1]! + v[m]!) / 2
}

/** Timpii pe `SEEDS`, în ordinea semințelor, cu întăririle `ups`. */
export function measure(p: Policy, guard = GUARD, ups: Ups = NO_UPS): Row {
  const games = SEEDS.map((seed) => playTimed(p, seed, RUN_CAP, guard, ups))
  const times = games.map((g) => g.s.t)
  return {
    name: p.name, label: p.label, times, median: median(times), min: Math.min(...times), max: Math.max(...times),
    level: median(games.map((g) => g.s.hero.lvl)), lvl2At: median(games.map((g) => g.lvl2At)), lvl5At: median(games.map((g) => g.lvl5At)),
  }
}

export function measureAll(guard = GUARD): Row[] {
  return POLICIES.map((p) => measure(p, guard))
}
