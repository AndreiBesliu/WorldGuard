import type { Input } from '../sim/state'
import { keysVector, MOVE_KEYS, newStick, stickDown, stickMove, stickUp, stickVector } from './joystick'
import type { Stick } from './joystick'

/** Tastele care aleg o ofertă din panou: 1, 2, 3, de pe rândul cu cifre sau de pe tastatura numerică. */
const PICK_KEYS: Readonly<Record<string, number>> = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }

/**
 * Leagă pointerul canvasului și tastele de joystick, iar tastele 1–3 de alegerea din panou (`pick` cu indexul ofertei;
 * cine primește decide dacă panoul e deschis). Toate deciziile joystickului stau în joystick.ts.
 */
export function bindInput(canvas: HTMLCanvasElement, enabled: () => boolean, pick: (index: number) => void): { stick: Stick; read(): Input; release(): void } {
  const stick = newStick()
  const down = new Set<string>()
  const local = (e: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const release = (): void => { if (stick.on) stickUp(stick, stick.id); down.clear() }

  canvas.addEventListener('pointerdown', (e) => {
    if (!enabled() || e.button !== 0) return   // doar butonul principal (degetul are mereu 0)
    e.preventDefault()
    const [x, y] = local(e)
    stickDown(stick, e.pointerId, x, y)
    if (stick.on && stick.id === e.pointerId) {   // captura doar dacă joystickul a luat pointerul
      try { canvas.setPointerCapture(e.pointerId) } catch { /* pointer deja dispărut */ }
    }
  })
  canvas.addEventListener('pointermove', (e) => { const [x, y] = local(e); stickMove(stick, e.pointerId, x, y) })
  canvas.addEventListener('pointerup', (e) => stickUp(stick, e.pointerId))
  canvas.addEventListener('pointercancel', (e) => stickUp(stick, e.pointerId))
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())

  window.addEventListener('keydown', (e) => {
    const n = PICK_KEYS[e.code]
    if (n !== undefined && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) { pick(n); return }
    if (!MOVE_KEYS.has(e.code) || e.ctrlKey || e.metaKey || e.altKey) return   // scurtăturile browserului nu mișcă eroul
    if (enabled()) e.preventDefault()
    down.add(e.code)
  })
  window.addEventListener('keyup', (e) => { down.delete(e.code) })
  window.addEventListener('blur', release)
  document.addEventListener('visibilitychange', release)

  return { stick, read: () => (stick.on ? stickVector(stick) : keysVector(down)), release }
}
