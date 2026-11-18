// Primitivele de desen folosite și de `world.ts`, și de aspect. Doar forme pline și linii.

export const TAU = Math.PI * 2

/** Un punct de poligon, [x, y]. */
export type Pt = readonly [number, number]

/** Disc plin. */
export function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill()
}

/** Calea unui poligon închis; punctele se înmulțesc cu `k` (formele se țin la mărimea 1 și se scalează la desen). */
export function poly(ctx: CanvasRenderingContext2D, pts: readonly Pt[], k = 1): void {
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i] as Pt
    if (i) ctx.lineTo(p[0] * k, p[1] * k); else ctx.moveTo(p[0] * k, p[1] * k)
  }
  ctx.closePath()
}

/** Calea unui segment. */
export function seg(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1)
}

/** Calea unui dreptunghi cu colțuri rotunjite. */
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/** Calea unei pete neregulate: `radii` dă raza relativă pe fiecare direcție, iar pe verticală se turtește puțin. */
export function blob(ctx: CanvasRenderingContext2D, x: number, y: number, radii: readonly number[], R: number, rot: number): void {
  ctx.beginPath()
  for (let i = 0; i < radii.length; i++) {
    const a = rot + (i / radii.length) * TAU
    const px = x + Math.cos(a) * (radii[i] ?? 1) * R, py = y + Math.sin(a) * (radii[i] ?? 1) * R * 0.9
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py)
  }
  ctx.closePath()
}
