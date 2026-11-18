// Desenatorul: mărimea canvasului, camera și ordinea straturilor. Citește starea, nu o scrie.
// Singurul loc care numește aspectul și îl dă mai departe.
import { HOME } from '../data/layout'
import type { Stick } from '../input/joystick'
import type { GameState, Input } from '../sim/state'
import { followCamera, viewScale, type Cam, type View } from './camera'
import { ORBIT } from './orbit'
import { drawOverlay } from './overlay'
import { palette } from './palette'
import { drawWorld } from './world'

export function createRenderer(canvas: HTMLCanvasElement): {
  resize(hudBottom: number): void
  frame(s: GameState, input: Input, stick: Stick | null, frameDt: number): void
  refresh(): void
} {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2D indisponibil')
  const view: View = { w: 0, h: 0, scale: 1, dpr: 1, hudBottom: 0 }
  const cam: Cam = { x: HOME.x, y: HOME.y + 50 }
  const skin = ORBIT
  let sky: HTMLCanvasElement | null = null
  // Cerul pictat se aruncă și se pictează din nou la cadrul următor: telefonul poate pierde ce era pe canvas cât pagina a stat ascunsă.
  const refresh = (): void => { sky = null }
  canvas.addEventListener('contextrestored', refresh)

  return {
    refresh,
    resize(hudBottom) {
      const r = canvas.getBoundingClientRect()
      view.w = r.width; view.h = r.height
      view.dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(view.w * view.dpr))
      canvas.height = Math.max(1, Math.round(view.h * view.dpr))
      view.scale = viewScale(view.w, view.h)
      view.hudBottom = hudBottom
    },
    frame(s, input, stick, frameDt) {
      followCamera(cam, s, view, frameDt)
      const { w, h, scale: sc } = view
      if (!w || !h) return
      const C = palette()
      sky ??= skin.paintSky()
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0)
      ctx.globalAlpha = 1
      ctx.fillStyle = C.edge; ctx.fillRect(0, 0, w, h)
      const left = cam.x - w / sc / 2, top = cam.y - h / sc / 2
      ctx.save(); ctx.scale(sc, sc); ctx.translate(-left, -top)
      ctx.drawImage(sky, 0, 0)
      drawWorld(ctx, s, input, { l: left, t: top, r: left + w / sc, b: top + h / sc }, skin)
      ctx.restore()
      drawOverlay(ctx, s, cam, view, stick, skin)
    },
  }
}
