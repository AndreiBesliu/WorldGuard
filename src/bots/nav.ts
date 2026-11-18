// Mersul jucătorilor automați: drept spre țintă, cu ocolire când nu se mai apropie.
// Doar citește starea; ce ține minte stă în `Nav`, nu în stare.
import { PAD_R } from '../data/layout'
import type { GameState, Input, Pad } from '../sim/state'

const ZERO: Input = { x: 0, y: 0 }
const GAIN = 1          // cu cât trebuie să scadă distanța ca să conteze ca apropiere, px
const STUCK = 24        // după atâția pași fără apropiere, începe ocolirea
const DETOUR = 30       // câți pași ține ocolirea
const SIDE = 0.9        // cât din direcție e pe lângă (perpendicular) în timpul ocolirii; restul e înainte
const NEW_TARGET = 40   // o țintă mutată cu mai mult de atât de la un pas la altul e una nouă, px
const PAD_EDGE = 3      // cât în afara marginii unui cerc străin încă se socotește pe el, px

export interface Nav { toward(s: GameState, x: number, y: number, stop: number): Input }

export function createNav(): Nav {
  let tx = NaN, ty = NaN   // ținta de la pasul trecut
  let best = Infinity      // cea mai mică distanță până la țintă de la ultima apropiere
  let since = 0            // pași fără apropiere
  let detour = 0           // pași de ocolire rămași
  let side = 1             // partea ocolirii; se schimbă la fiecare blocaj
  const forget = (): void => { best = Infinity; since = 0; detour = 0 }

  return {
    toward(s, x, y, stop) {
      const h = s.hero
      if (!(Math.hypot(x - tx, y - ty) <= NEW_TARGET)) forget()   // și la prima țintă (NaN)
      tx = x; ty = y
      const dx = x - h.x, dy = y - h.y, d = Math.hypot(dx, dy)
      if (d <= stop) { forget(); return ZERO }
      const ux = dx / d, uy = dy / d
      if (detour > 0) {
        detour--
        const vx = -uy * side * SIDE + ux * (1 - SIDE), vy = ux * side * SIDE + uy * (1 - SIDE), m = Math.hypot(vx, vy)
        return { x: vx / m, y: vy / m }
      }
      if (d <= best - GAIN) { best = d; since = 0 }
      else if (++since >= STUCK) { since = 0; best = d; side = -side; detour = DETOUR }
      return { x: ux, y: uy }
    },
  }
}

/** Direcția de ieșire de pe un cerc străin (oricare în afară de `target`, și cel de reparat), sau null dacă nava nu e pe vreunul. */
export function offForeignPad(s: GameState, target: Pad | null): Input | null {
  const h = s.hero
  for (const p of s.pads) {
    if (p === target) continue
    const dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy)
    if (d > PAD_R + PAD_EDGE) continue
    return d < 1e-6 ? { x: 1, y: 0 } : { x: dx / d, y: dy / d }
  }
  return null
}
