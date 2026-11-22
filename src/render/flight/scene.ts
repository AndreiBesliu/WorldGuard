// Scena zborului: stelele care curg în jos și ordinea straturilor. Formele le dă `things.ts`. Citește starea, nu o scrie;
// tot ce se mișcă doar pe ecran se calculează din timpul zborului (`f.t`), deci stă pe loc la pauză și după sfârșit.
import { LAYOUT_SEED } from '../../data/layout'
import type { FlightFx, FlightState } from '../../flight/state'
import { flightFxLife } from '../../flight/step'
import { createRng } from '../../sim/rng'
import { palette } from '../palette'
import { FLIGHT_LOOK, type FlightLook } from './things'

/** Ce se vede din câmp, în unități de câmp: poate ieși în afara lui (cer în plus deasupra sau în lături). */
export interface Area { l: number; t: number; r: number; b: number }

/** Trei straturi de stele, cele mai apropiate mai mari, mai deschise și mai repezi (prezentare, propunere). */
const STARS = (() => {
  const rng = createRng(LAYOUT_SEED, 'stele-zbor')
  const out: { x: number; y: number; size: number; v: number; a: number; tone: 'star' | 'starCool' | 'starWarm' }[] = []
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 30; i++) {
      out.push({ x: rng.next(), y: rng.next(), size: 1 + layer * 0.7, v: 22 + layer * 38, a: 0.35 + layer * 0.25, tone: i % 5 === 0 ? 'starWarm' : i % 3 === 0 ? 'starCool' : 'star' })
    }
  }
  return out
})()
const STAR_PAD = 4           // cât ies stelele peste marginea de sus și de jos a vederii înainte să o ia de la capăt

/** Stelele care curg în jos, cu viteza stratului lor, peste toată vederea; ca liniuțe pline, lungite după viteză. */
export function stars(ctx: CanvasRenderingContext2D, f: FlightState, area: Area): void {
  const C = palette(), w = area.r - area.l, span = area.b - area.t + 2 * STAR_PAD, ga = ctx.globalAlpha
  for (const s of STARS) {
    const y = area.t - STAR_PAD + ((s.y * span + s.v * f.t) % span)
    ctx.globalAlpha = ga * s.a
    ctx.fillStyle = C[s.tone]
    ctx.fillRect(area.l + s.x * w, y, s.size, s.size * (1 + s.v / 60))
  }
  ctx.globalAlpha = ga
}

/** Vârsta unui efect încă viu, după timpul zborului; null pentru unul stins. */
function ageOf(f: FlightState, e: FlightFx): number | null {
  const age = f.t - e.t0
  return age <= flightFxLife(e) ? age : null
}

/**
 * Zborul în straturi: stelele; resursele și asteroizii; navele dușmane; exploziile; lucrurile de cules; proiectilele Tunului,
 * raza Laserului și rachetele; nava ta cu inelul Scutului; focul dușman, deasupra navei, ca să se vadă mereu; norii căderilor;
 * la sfârșit înroșirea ecranului când nava e lovită sau cade.
 */
export function drawFlight(ctx: CanvasRenderingContext2D, f: FlightState, area: Area, look: FlightLook = FLIGHT_LOOK): void {
  stars(ctx, f, area)
  for (const d of f.drops) look.drop(ctx, f, d)
  for (const a of f.asteroids) look.asteroid(ctx, f, a)
  for (const foe of f.foes) look.foe(ctx, f, foe)
  for (const e of f.fx) { if (e.kind !== 'blast') continue; const age = ageOf(f, e); if (age !== null) look.blast(ctx, e, age) }
  for (const p of f.picks) look.pick(ctx, f, p)
  if (f.bolts.length > 0) look.bolts(ctx, f)
  for (const e of f.fx) { if (e.kind !== 'beam') continue; const age = ageOf(f, e); if (age !== null) look.beam(ctx, e, age) }
  for (const m of f.missiles) look.missile(ctx, m)
  if (f.mode !== 'down') {
    look.ship(ctx, f)
    if (f.ship.mods.shield > 0) look.shield(ctx, f)
    for (const e of f.fx) { if (e.kind !== 'block') continue; const age = ageOf(f, e); if (age !== null) look.block(ctx, f, e, age) }
  }
  if (f.shots.length > 0) look.shots(ctx, f)
  for (const e of f.fx) { if (e.kind !== 'puff') continue; const age = ageOf(f, e); if (age !== null) look.puff(ctx, e, age) }
  for (const e of f.fx) {
    if (e.kind !== 'hurt' && e.kind !== 'down') continue
    const age = ageOf(f, e)
    if (age !== null) look.flash(ctx, e, age, area)
  }
}
