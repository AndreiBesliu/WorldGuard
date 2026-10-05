// Ajutoare pentru teste. Nu fac parte din joc (nimic din `src/` nu le importă în afara testelor), dar stau
// lângă nucleu ca să treacă prin aceeași disciplină (fără ceas, fără aleator global).

import { applyDecision, checkStartWave, step, towerKeys, type Decision, type GameState } from './game'
import { key } from './hex'
import { optionsAround } from './path'

/** Aplică decizia sau aruncă eroarea cu motivul refuzului. */
export function must(s: GameState, d: Decision): GameState {
  const r = applyDecision(s, d)
  if (!r.ok) throw new Error(r.reason)
  return r.value
}

/** Primul ocol care încape pe drum (de la intrare spre bază, +1 apoi +2, +3), ocolind turnurile. */
export function firstDetour(s: GameState, extras: readonly number[] = [1, 2, 3]): Decision | undefined {
  const blocked = towerKeys(s)
  for (let i = 1; i < s.path.length - 1; i++) {
    for (const extra of extras) {
      const o = optionsAround(s.map, s.path, i, extra, blocked)[0]
      if (o) return { tip: 'ocol', start: o.start, span: o.span, hexuri: o.hexes.map(key) }
    }
  }
  return undefined
}

/** Pornește valul; dacă ocolul pregătirii e obligatoriu și n-a fost pus, pune întâi primul ocol posibil. */
export function startWave(s: GameState): GameState {
  let cur = s
  while (!checkStartWave(cur).ok && cur.faza === 'pregatire' && cur.ocoluriFolosite < cur.ocoluriPeVal) {
    const d = firstDetour(cur)
    if (!d) break
    cur = must(cur, d)
  }
  return must(cur, { tip: 'pornesteVal' })
}

/** Rulează simularea până se schimbă faza (sfârșitul valului sau al partidei). */
export function runWave(s: GameState, maxTicks = 100_000): GameState {
  let cur = s
  for (let i = 0; i < maxTicks && cur.faza === 'val'; i++) cur = step(cur)
  return cur
}
