import { BALANCE } from '../data/balance'
import type { Input } from '../sim/state'

export const STICK_R = BALANCE.stick.r

export interface Stick { on: boolean; id: number; bx: number; by: number; x: number; y: number }

export function newStick(): Stick {
  return { on: false, id: -1, bx: 0, by: 0, x: 0, y: 0 }
}

export function stickDown(j: Stick, id: number, x: number, y: number): void {
  if (j.on) return
  j.on = true; j.id = id; j.bx = x; j.by = y; j.x = x; j.y = y
}

export function stickMove(j: Stick, id: number, x: number, y: number): void {
  if (!j.on || j.id !== id) return
  j.x = x; j.y = y
  const dx = x - j.bx, dy = y - j.by
  const d = Math.hypot(dx, dy)
  if (d > STICK_R) {   // baza urmează degetul
    j.bx = x - (dx / d) * STICK_R
    j.by = y - (dy / d) * STICK_R
  }
}

export function stickUp(j: Stick, id: number): void {
  if (!j.on || j.id !== id) return
  j.on = false; j.id = -1
}

/** Direcția joystickului, lungime cel mult 1; exact (0, 0) cât e oprit sau în zona moartă. */
export function stickVector(j: Stick): Input {
  if (!j.on) return { x: 0, y: 0 }
  const dx = j.x - j.bx, dy = j.y - j.by
  const d = Math.hypot(dx, dy)
  const t = d / STICK_R
  if (t < BALANCE.stick.dead) return { x: 0, y: 0 }
  const m = Math.min(1, t / BALANCE.stick.full)
  return { x: (dx / d) * m + 0, y: (dy / d) * m + 0 }
}

export const MOVE_KEYS: ReadonlySet<string> = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
])

/** Direcția tastelor apăsate, lungime cel mult 1 (pe diagonală se normalizează). */
export function keysVector(down: ReadonlySet<string>): Input {
  const x = (down.has('KeyD') || down.has('ArrowRight') ? 1 : 0) - (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0)
  const y = (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0) - (down.has('KeyW') || down.has('ArrowUp') ? 1 : 0)
  const d = Math.hypot(x, y)
  if (d === 0) return { x: 0, y: 0 }
  const k = d > 1 ? 1 / d : 1
  return { x: x * k + 0, y: y * k + 0 }
}
