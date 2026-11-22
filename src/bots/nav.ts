// Mersul jucătorilor automați: drept spre țintă, cu ocolire când nu se mai apropie.
// Doar citește starea; ce ține minte stă în `Nav`, nu în stare.
import { BALANCE } from '../data/balance'
import { PAD_R } from '../data/layout'
import { DT, type GameState, type Input, type Pad } from '../sim/state'

const ZERO: Input = { x: 0, y: 0 }
const GAIN = 1          // cu cât trebuie să scadă distanța ca să conteze ca apropiere, px
const STUCK = 24        // după atâția pași fără apropiere, începe ocolirea
const DETOUR = 30       // câți pași ține ocolirea
const SIDE = 0.9        // cât din direcție e pe lângă (perpendicular) în timpul ocolirii; restul e înainte
const NEW_TARGET = 40   // o țintă mutată cu mai mult de atât de la un pas la altul e una nouă, px
const PAD_EDGE = 3      // cât în afara marginii unui cerc străin încă se socotește pe el, px
const SKIRT = PAD_R + 6 // pe la atâta de un cerc străin construit trece nava când îl ocolește, px (acoperă și clădirea)
const SKIRT_LEAVE = SKIRT + 20   // abia mai departe de atât se uită partea ocolirii, px
const STRIDE = BALANCE.hero.speed * DT   // cât merge nava într-un pas, px

export interface Nav { toward(s: GameState, x: number, y: number, stop: number): Input }

export function createNav(): Nav {
  let tx = NaN, ty = NaN   // ținta de la pasul trecut
  let best = Infinity      // cea mai mică distanță până la țintă de la ultima apropiere
  let since = 0            // pași fără apropiere
  let detour = 0           // pași de ocolire rămași
  let side = 1             // partea ocolirii; se schimbă la fiecare blocaj
  let last = NaN           // distanța de la pasul trecut
  const forget = (): void => { best = Infinity; since = 0; detour = 0 }

  return {
    toward(s, x, y, stop) {
      const h = s.hero
      if (!(Math.hypot(x - tx, y - ty) <= NEW_TARGET)) forget()   // și la prima țintă (NaN)
      tx = x; ty = y
      const dx = x - h.x, dy = y - h.y, d = Math.hypot(dx, dy)
      if (d > last + STRIDE + GAIN) forget()   // un salt mai lung decât un pas: nava a reapărut acasă
      last = d
      if (d <= stop) { forget(); return ZERO }
      const ux = dx / d, uy = dy / d
      if (detour > 0) {
        detour--
        const vx = -uy * side * SIDE + ux * (1 - SIDE), vy = ux * side * SIDE + uy * (1 - SIDE), m = Math.hypot(vx, vy)
        return { x: vx / m, y: vy / m }
      }
      if (d <= best - GAIN) { best = d; since = 0 }
      else if (d > best + STRIDE) { best = d; since = 0 }   // s-a depărtat (o țintă care fuge): de aici se măsoară apropierea
      else if (++since >= STUCK) { since = 0; best = d; side = -side; detour = DETOUR }
      return { x: ux, y: uy }
    },
  }
}

/** Un cerc construit cu clădire: clădirea stă lipită de cerc și îi acoperă o parte. */
function built(p: Pad): boolean {
  return p.lvl > 0 && p.kind !== 'hero' && p.kind !== 'repair'
}

/**
 * Dinspre cerc spre navă: direcția (unitate) și distanța. La un cerc construit, cercul și clădirea lui sunt un singur
 * obstacol: segmentul de la centrul cercului la clădire, măsurat din punctul lui cel mai apropiat de navă. În colțul dintre
 * clădire și cerc, direcția e într-o parte, nu spre clădire. Un cerc fără clădire e doar centrul lui.
 */
function fromPad(h: { x: number; y: number }, p: Pad): { x: number; y: number; d: number } {
  let cx = p.x, cy = p.y
  if (built(p)) {
    const ax = p.bx - p.x, ay = p.by - p.y, len2 = ax * ax + ay * ay
    const k = len2 > 0 ? Math.min(1, Math.max(0, ((h.x - p.x) * ax + (h.y - p.y) * ay) / len2)) : 0
    cx += ax * k; cy += ay * k
  }
  const dx = h.x - cx, dy = h.y - cy, d = Math.hypot(dx, dy)
  return d < 1e-6 ? { x: 1, y: 0, d } : { x: dx / d, y: dy / d, d }
}

/** Partea lui `want` de-a lungul marginii, cu lungimea 1; dacă `want` e chiar spre obstacol, una dintre cele două. */
function alongEdge(want: Input, rx: number, ry: number): Input {
  const in_ = want.x * rx + want.y * ry
  const ax = want.x - in_ * rx, ay = want.y - in_ * ry, am = Math.hypot(ax, ay)
  return am < 1e-6 ? { x: -ry, y: rx } : { x: ax / am, y: ay / am }
}

/** Direcția de ieșire de pe un cerc străin (oricare în afară de `target`, și cel de reparat), sau null dacă nava nu e pe vreunul. */
export function offForeignPad(s: GameState, target: Pad | null): Input | null {
  const h = s.hero
  for (const p of s.pads) {
    if (p === target || Math.hypot(h.x - p.x, h.y - p.y) > PAD_R + PAD_EDGE) continue
    const o = fromPad(h, p)
    return { x: o.x, y: o.y }
  }
  return null
}

/**
 * Cât stă pe un cerc străin, plata nu pornește decât după `BALANCE.pay.dwell` petrecute în el, în mers sau pe loc.
 * Din primul pas numărat pe un astfel de cerc, nava iese pe o diagonală (jumătate dinspre cerc, jumătate de-a lungul
 * marginii, în partea în care voia să meargă), deci ajunge afară cu mult înaintea plății și își continuă drumul pe lângă cerc.
 * Întoarce null dacă nava nu e pe un cerc străin care a început să numere.
 */
export function slipOff(s: GameState, target: Pad | null, want: Input): Input | null {
  const h = s.hero
  for (const p of s.pads) {
    if (p === target || p.dwell <= 0 || Math.hypot(h.x - p.x, h.y - p.y) > PAD_R) continue
    const o = fromPad(h, p), a = alongEdge(want, o.x, o.y)
    const vx = o.x + a.x, vy = o.y + a.y, m = Math.hypot(vx, vy)
    return { x: vx / m, y: vy / m }
  }
  return null
}

export type Skirt = (s: GameState, target: Pad | null, want: Input) => Input | null

/**
 * Lângă un cerc străin construit (cerc și clădire, un singur obstacol), nava nu mai intră spre el: merge de-a lungul
 * marginii, cu toată viteza, deci îl ocolește pe la `SKIRT` de segmentul lui și nu ajunge în colțul dintre clădire și cerc.
 * Partea ocolirii e cea în care voia să meargă la primul pas lângă cerc și se păstrează până se depărtează la `SKIRT_LEAVE`:
 * pe latura dreaptă a obstacolului, cu ținta chiar în spatele lui, partea dorită s-ar schimba de la un pas la altul și nava
 * ar sta pe loc.
 * Întoarce null dacă nava nu e lângă un astfel de cerc sau dacă `want` nu duce spre el.
 */
export function createSkirt(): Skirt {
  let around: Pad | null = null   // cercul ocolit acum
  let side = 1                    // partea ocolirii, față de (−ry, rx)
  return (s, target, want) => {
    const h = s.hero
    if (around && fromPad(h, around).d > SKIRT_LEAVE) around = null
    for (const p of s.pads) {
      if (p === target || !built(p)) continue
      const o = fromPad(h, p)
      if (o.d > SKIRT || want.x * o.x + want.y * o.y >= 0) continue
      if (p !== around) { around = p; side = want.y * o.x - want.x * o.y >= 0 ? 1 : -1 }
      return { x: -o.y * side, y: o.x * side }
    }
    return null
  }
}
