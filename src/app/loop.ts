import { DT, EPS } from '../sim/state'

export const MAX_STEPS = 5   // cel mult atâția pași pe cadru; restul timpului se aruncă

/** Adună timpul cadrului și scoate pași întregi de DT. Dacă ar ieși mai mulți de MAX_STEPS, aruncă restul. */
export function advance(acc: number, frameDt: number): { steps: number; acc: number } {
  const dt = Number.isFinite(frameDt) ? Math.max(0, frameDt) : 0   // un timp de cadru stricat (NaN) nu îngheață jocul
  let a = acc + dt
  let steps = 0
  while (a + EPS >= DT) {
    if (steps === MAX_STEPS) return { steps: MAX_STEPS, acc: 0 }
    a -= DT
    steps++
  }
  return { steps, acc: a }
}
