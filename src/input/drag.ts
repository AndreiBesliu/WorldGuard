// Condusul cu degetul: nava urmează mișcarea degetului, nu o direcție. Fără DOM.
// Coordonatele sunt în unități de câmp; împărțirea la scara ecranului o face cine leagă pagina.
import type { FlightInput } from '../flight/state'

export interface Drag { on: boolean; id: number; x: number; y: number; dx: number; dy: number }

export function newDrag(): Drag {
  return { on: false, id: -1, x: 0, y: 0, dx: 0, dy: 0 }
}

export function dragDown(d: Drag, id: number, x: number, y: number): void {
  if (d.on) return
  d.on = true; d.id = id; d.x = x; d.y = y
}

export function dragMove(d: Drag, id: number, x: number, y: number): void {
  if (!d.on || d.id !== id) return
  d.dx += x - d.x; d.dy += y - d.y
  d.x = x; d.y = y
}

export function dragUp(d: Drag, id: number): void {
  if (!d.on || d.id !== id) return
  d.on = false; d.id = -1
}

/** Mișcarea strânsă de la ultima citire; o golește. */
export function dragTake(d: Drag): FlightInput {
  const out = { dx: d.dx + 0, dy: d.dy + 0 }   // `+ 0` taie un −0
  d.dx = 0; d.dy = 0
  return out
}
