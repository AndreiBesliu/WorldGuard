// Camera: scara ecranului și urmărirea eroului. Nu scrie nimic în starea jocului.
import { HOME, WORLD } from '../data/layout'
import type { GameState } from '../sim/state'

export interface View { w: number; h: number; scale: number; dpr: number; hudBottom: number }
export interface Cam { x: number; y: number }

const LOOK_DOWN = 50      // camera ține eroul puțin deasupra mijlocului, px de lume (prezentare)
const FOLLOW = 7          // cât de repede urmărește camera, 1/s (prezentare)
const OVERSCAN = 30       // cât poate ieși centrul camerei dincolo de marginea hărții, px de lume

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)

/** max(înălțime / 880, lățime / 1100); 1 când mărimea nu e un număr bun. */
export function viewScale(w: number, h: number): number {
  const k = Math.max(h / 880, w / 1100)
  return Number.isFinite(k) && k > 0 ? k : 1
}

export function followCamera(cam: Cam, s: GameState, view: View, frameDt: number): void {
  const h = s.hero
  const vw = view.w / view.scale
  const vh = view.h / view.scale
  const tx = h.dead ? HOME.x : h.x
  const ty = (h.dead ? HOME.y : h.y) + LOOK_DOWN
  const k = 1 - Math.exp(-FOLLOW * frameDt)
  cam.x += (tx - cam.x) * k
  cam.y += (ty - cam.y) * k
  cam.x = vw >= WORLD.w ? WORLD.w / 2 : clamp(cam.x, vw / 2 - OVERSCAN, WORLD.w - vw / 2 + OVERSCAN)
  cam.y = vh >= WORLD.h ? WORLD.h / 2 : clamp(cam.y, vh / 2 - OVERSCAN, WORLD.h - vh / 2 + OVERSCAN)
}
