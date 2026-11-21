import { FLIGHT } from '../data/flight'
import type { FlightInput } from '../flight/state'
import type { Input } from '../sim/state'
import { dragDown, dragMove, dragReset, dragUp, newDrag, type Drag } from './drag'
import { keysVector, MOVE_KEYS, newStick, stickDown, stickMove, stickUp, stickVector } from './joystick'
import type { Stick } from './joystick'

/** Tastele care aleg o ofertă din panou: 1, 2, 3, de pe rândul cu cifre sau de pe tastatura numerică. */
const PICK_KEYS: ReadonlyMap<string, number> = new Map([['Digit1', 0], ['Digit2', 1], ['Digit3', 2], ['Numpad1', 0], ['Numpad2', 1], ['Numpad3', 2]])

export interface PickKey { code: string; repeat: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }

/** Oferta (0–2) aleasă de o tastă; null pentru altă tastă, pentru tasta ținută apăsată și pentru scurtăturile browserului. */
export function pickIndex(e: PickKey): number | null {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return null
  return PICK_KEYS.get(e.code) ?? null
}

/** Mișcarea cerută de tastele apăsate (direcția `v`, lungime cel mult 1) în `secs` secunde de zbor: după înmulțirea regulilor
 *  cu `FLIGHT.drive.gain`, nava merge cu `FLIGHT.drive.keys` unități pe secundă. */
export function flightKeys(v: Input, secs: number): FlightInput {
  const k = (FLIGHT.drive.keys * secs) / FLIGHT.drive.gain
  return { dx: v.x * k + 0, dy: v.y * k + 0 }
}

/** În zbor: dacă degetul conduce nava și câți pixeli de ecran are o unitate de câmp. */
export interface FlightBind { on(): boolean; scale(): number }

/**
 * Leagă pointerul canvasului și tastele: la apărare, de joystick (toate deciziile lui stau în joystick.ts); în zbor (`flight.on()`),
 * de condusul cu degetul (drag.ts), cu pozițiile în unități de câmp. Tastele 1–3 aleg din panou (`pick` cu indexul ofertei;
 * cine primește decide dacă panoul e deschis).
 */
export function bindInput(canvas: HTMLCanvasElement, enabled: () => boolean, pick: (index: number) => void, flight: FlightBind): {
  stick: Stick; drag: Drag; read(): Input; keys(): Input; release(): void
} {
  const stick = newStick()
  const drag = newDrag()
  const down = new Set<string>()
  const local = (e: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const field = (e: PointerEvent): [number, number] => { const [x, y] = local(e), k = flight.scale(); return [x / k, y / k] }
  const release = (): void => { if (stick.on) stickUp(stick, stick.id); dragReset(drag); down.clear() }

  canvas.addEventListener('pointerdown', (e) => {
    if (!enabled() || e.button !== 0) return   // doar butonul principal (degetul are mereu 0)
    e.preventDefault()
    let took: boolean
    if (flight.on()) {
      const [x, y] = field(e)
      dragDown(drag, e.pointerId, x, y)
      took = drag.on && drag.id === e.pointerId
    } else {
      const [x, y] = local(e)
      stickDown(stick, e.pointerId, x, y)
      took = stick.on && stick.id === e.pointerId
    }
    if (took) {                                  // captura doar dacă degetul a fost luat
      try { canvas.setPointerCapture(e.pointerId) } catch { /* pointer deja dispărut */ }
    }
  })
  canvas.addEventListener('pointermove', (e) => {
    if (drag.on) { const [x, y] = field(e); dragMove(drag, e.pointerId, x, y) } else { const [x, y] = local(e); stickMove(stick, e.pointerId, x, y) }
  })
  canvas.addEventListener('pointerup', (e) => { stickUp(stick, e.pointerId); dragUp(drag, e.pointerId) })
  canvas.addEventListener('pointercancel', (e) => {
    stickUp(stick, e.pointerId)
    if (drag.on && drag.id === e.pointerId) dragReset(drag)   // gestul pierdut: și mișcarea nestrânsă se aruncă
  })
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())

  window.addEventListener('keydown', (e) => {
    const n = pickIndex(e)
    if (n !== null) { pick(n); return }
    if (!MOVE_KEYS.has(e.code) || e.ctrlKey || e.metaKey || e.altKey) return   // scurtăturile browserului nu mișcă nava
    if (enabled()) e.preventDefault()
    down.add(e.code)
  })
  window.addEventListener('keyup', (e) => { down.delete(e.code) })
  window.addEventListener('blur', release)
  document.addEventListener('visibilitychange', release)

  return { stick, drag, read: () => (stick.on ? stickVector(stick) : keysVector(down)), keys: () => keysVector(down), release }
}
