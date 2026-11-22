// Desenatorul zborului: mărimea canvasului, așezarea câmpului pe ecran și cerul. Citește starea, nu o scrie.
// Câmpul (`FLIGHT.field`) stă lipit de banda de sus, la scara cea mai mare la care încape întreg, deci dușmanii ies de sub bandă;
// pe un ecran mai înalt rămâne o fâșie dedesubt, pe unul prea scund fâșii în lături, umplute cu culoarea paginii (`outsideField`),
// deci ce iese din câmp nu se vede. Regulile nu știu de ecran.
import { FLIGHT } from '../../data/flight'
import { WORLD } from '../../data/layout'
import type { FlightState } from '../../flight/state'
import { palette } from '../palette'
import { drawFlight, type Area } from './scene'

/** Așezarea câmpului: pixeli de ecran pe unitate de câmp și colțul de sus-stânga al câmpului, în pixeli de ecran. */
export interface Fit { scale: number; x: number; y: number }

/** Câmpul întreg sub bandă (`hudBottom`, px de la marginea de sus a canvasului), lipit de ea și pe mijloc în lățime. */
export function fitField(w: number, h: number, hudBottom: number): Fit {
  const { w: FW, h: FH } = FLIGHT.field
  const k = Math.min(w / FW, (h - hudBottom) / FH)
  const scale = Number.isFinite(k) && k > 0 ? k : 1
  const x = (w - FW * scale) / 2
  return { scale, x: Number.isFinite(x) ? x : 0, y: Number.isFinite(hudBottom) ? hudBottom : 0 }
}

/** Un dreptunghi pe ecran, în px de la colțul canvasului. */
export interface Rect { x: number; y: number; w: number; h: number }

const HAIR = 0.01            // px: o fâșie mai îngustă de atât e doar o rotunjire, nu se umple

/**
 * Fâșiile de sub bandă din afara câmpului (în lături pe un ecran scund, dedesubt pe unul înalt), de umplut cu culoarea paginii după ce
 * s-a desenat zborul: ce iese din câmp nu se mai vede. Deasupra câmpului e banda, deci acolo nu e nimic. Umpleri simple, fără decupaj.
 */
export function outsideField(w: number, h: number, fit: Fit): Rect[] {
  const fw = FLIGHT.field.w * fit.scale, fh = FLIGHT.field.h * fit.scale
  const right = fit.x + fw, bottom = Math.min(h, fit.y + fh)
  const rs: Rect[] = [
    { x: 0, y: fit.y, w: fit.x, h: bottom - fit.y },
    { x: right, y: fit.y, w: w - right, h: bottom - fit.y },
    { x: 0, y: bottom, w, h: h - bottom },
  ]
  return rs.filter((r) => r.w > HAIR && r.h > HAIR)
}

// Cerul pictat al apărării e mult mai mare decât câmpul: zborul ia bucata din mijlocul lui, departe de marginile care se întunecă.
const SKY_X = (WORLD.w - FLIGHT.field.w) / 2
const SKY_Y = (WORLD.h - FLIGHT.field.h) / 2

/** `sky` dă cerul pictat al apărării (`createRenderer(...).sky`): se pictează o singură dată și se împarte între cele două desenatoare;
 *  cine îl ține îl aruncă și îl pictează din nou când trebuie (pagina ascunsă, contextul pierdut). */
export function createFlightRenderer(canvas: HTMLCanvasElement, sky: () => HTMLCanvasElement): {
  resize(hudBottom: number): void
  frame(f: FlightState, frameDt: number): void
  scale(): number
  fit(): Fit
} {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2D indisponibil')
  let w = 0, h = 0, dpr = 1
  let fit: Fit = { scale: 1, x: 0, y: 0 }

  return {
    resize(hudBottom) {
      const r = canvas.getBoundingClientRect()
      w = r.width; h = r.height
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      fit = fitField(w, h, hudBottom)
    },
    // Timpul cadrului nu contează: tot ce se mișcă vine din `f.t`.
    frame(f) {
      if (!w || !h) return
      const C = palette(), k = fit.scale
      const back = sky()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalAlpha = 1
      ctx.fillStyle = C.edge; ctx.fillRect(0, 0, w, h)
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * fit.x, dpr * fit.y)
      const area: Area = { l: -fit.x / k, t: -fit.y / k, r: (w - fit.x) / k, b: (h - fit.y) / k }
      const aw = area.r - area.l, ah = area.b - area.t
      ctx.drawImage(back, SKY_X + area.l, SKY_Y + area.t, aw, ah, area.l, area.t, aw, ah)
      drawFlight(ctx, f, area)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalAlpha = 1
      ctx.fillStyle = C.edge                    // culoarea paginii: în afara câmpului nu se vede nimic din zbor
      for (const r of outsideField(w, h, fit)) ctx.fillRect(r.x, r.y, r.w, r.h)
    },
    scale: () => fit.scale,
    fit: () => ({ ...fit }),
  }
}
