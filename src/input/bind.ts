import type { Input } from '../sim/state'
import { keysVector, MOVE_KEYS, newStick, stickDown, stickMove, stickUp, stickVector } from './joystick'
import type { Stick } from './joystick'

/** Leagă pointerul canvasului și tastele de joystick. Toate deciziile stau în joystick.ts. */
export function bindInput(canvas: HTMLCanvasElement, enabled: () => boolean): { stick: Stick; read(): Input; release(): void } {
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
    if (!MOVE_KEYS.has(e.code) || e.ctrlKey || e.metaKey || e.altKey) return   // scurtăturile browserului nu mișcă eroul
    if (enabled()) e.preventDefault()
    down.add(e.code)
  })
  window.addEventListener('keyup', (e) => { down.delete(e.code) })
  window.addEventListener('blur', release)
  document.addEventListener('visibilitychange', release)

  return { stick, read: () => (stick.on ? stickVector(stick) : keysVector(down)), release }
}
