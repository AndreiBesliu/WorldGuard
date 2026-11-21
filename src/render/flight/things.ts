// Zborul în aspectul „Orbită”: nava ta (vârful în sus, cu modulele pe ea), navele dușmane (vârful în jos), asteroizii,
// resursele, lucrurile de cules, tragerile și efectele. Doar forme pline și linii: fără gradient, fără decupaj, fără umbră.
// Citește starea, nu o scrie. Ce se mișcă doar pe ecran (flăcări, pâlpâit, plutire) vine din timpul zborului, `f.t`.
// Formele, culorile și mărimile de aici sunt propuneri.
import { FLIGHT, FLIGHT_MOD_KIND, type FlightModId } from '../../data/flight'
import type { ModKind } from '../../data/modules'
import type { FlightAsteroid, FlightDrop, FlightFoe, FlightFx, FlightMissile, FlightPick, FlightState } from '../../flight/state'
import { fade } from '../derive'
import { disc, poly, rr, TAU, type Pt } from '../draw'
import { BRUTE, GRUNT, SHIP } from '../orbit/things'
import { alpha, palette, type Palette } from '../palette'
import type { Area } from './scene'

/** Formele, cu botul spre +x, la mărimea 1: se scalează cu raza navei. Drona e nava obișnuită de la apărare, nava grea e cea grea. */
const WEAVER: readonly Pt[] = [[1.15, 0], [0, 0.5], [-0.75, 1.15], [-0.35, 0], [-0.75, -1.15], [0, -0.5]]
const ELITE: readonly Pt[] = [[1, 0], [0.59, -0.65], [-0.12, -1.06], [-0.76, -0.76], [-0.76, 0.76], [-0.12, 1.06], [0.59, 0.65]]

const FOE_FLASH = 0.06       // cât se aprinde conturul unei nave lovite, s (Tunul lovește la 0,11 s: o navă plină ar fi albă mai tot timpul)
const ASTEROID_FLASH = 0.07      // cât clipește un asteroid lovit, s
const BLINK = 12             // de câte ori pe secundă clipește nava ta cât nu poate fi lovită
const SHIELD_R = 25          // raza inelului Scutului, unități de câmp
const HIT_DOT = 2.6          // punctul care contează la lovituri, desenat (cel din reguli are raza `FLIGHT.ship.hitR`)
const PICK_HALF = 13         // jumătatea laturii pătratului unui lucru de cules
const BLAST_START = 0.3      // cât din zonă are explozia în primul ei cadru

const toneOf = (C: Palette, kind: ModKind): string => (kind === 'weapon' ? C.hero : kind === 'body' ? C.shield : C.metal)

/** Jetul din spate al unei nave, cu baza la x = `back`: flacăra (jumătate de lățime `w`, vârful la `tip`) și miezul ei. */
function jet(ctx: CanvasRenderingContext2D, back: number, w: number, tip: number, w2: number, tip2: number, flame: string, core: string): void {
  ctx.beginPath(); ctx.moveTo(back, -w); ctx.lineTo(tip, 0); ctx.lineTo(back, w); ctx.closePath(); ctx.fillStyle = flame; ctx.fill()
  ctx.beginPath(); ctx.moveTo(back, -w2); ctx.lineTo(tip2, 0); ctx.lineTo(back, w2); ctx.closePath(); ctx.fillStyle = core; ctx.fill()
}

/** Un semn de pe navă: întâi o linie lată, închisă, ca semnul să se desprindă de corpul galben, apoi semnul în culoarea lui. */
function mark(ctx: CanvasRenderingContext2D, color: string, width: number): void {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.lineWidth = width + 2; ctx.strokeStyle = palette().hullDark; ctx.stroke()
  ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke()
}

const SIDES = [-1, 1] as const

/**
 * Nava ta, cu vârful în sus. Pe ea: Tunul — țevi pe aripi, mai lungi cu treapta, încă o pereche la treapta 3; Laserul — o țeavă
 * în bot; Rachetele — două cutii pe aripi, cu vârful portocaliu; Magnetul — o potcoavă. Scutul e inelul din `shield`.
 * În mijloc, punctul care contează la lovituri. Cât nu poate fi lovită, clipește.
 */
export function ship(ctx: CanvasRenderingContext2D, f: FlightState): void {
  const C = palette(), s = f.ship, m = s.mods, fl = 0.6 + 0.4 * Math.sin(f.t * 34), ga = ctx.globalAlpha
  if (s.inv > 0 && f.mode === 'flying' && Math.floor(s.inv * BLINK) % 2 === 0) ctx.globalAlpha = ga * 0.35
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(-Math.PI / 2)   // formele au botul spre +x, ca la apărare
  jet(ctx, -8, 4.5, -14 - 9 * fl, 2.2, -10 - 5 * fl, C.jet, C.star)
  if (m.missile > 0) {
    const len = 7 + 2 * m.missile
    for (const side of SIDES) {
      const y = side * 12.3 - 2.4
      rr(ctx, -10, y, len, 4.8, 1.8); ctx.fillStyle = C.hull; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.hullDark; ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-10 + len, y); ctx.lineTo(-6 + len, y + 2.4); ctx.lineTo(-10 + len, y + 4.8); ctx.closePath()
      ctx.fillStyle = C.foeJet; ctx.fill(); ctx.stroke()
    }
  }
  poly(ctx, SHIP)
  ctx.fillStyle = C.hero; ctx.fill()
  ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.strokeStyle = C.heroShade; ctx.stroke()
  if (m.gun > 0) {                                        // țevile Tunului, pe aripi, cu vârful dincolo de marginea lor
    const len = 6 + 2 * m.gun
    ctx.fillStyle = C.hull; ctx.lineWidth = 1; ctx.strokeStyle = C.hullDark
    for (const side of SIDES) {
      rr(ctx, -3, side * 7 - 1.3, len, 2.6, 1); ctx.fill(); ctx.stroke()
      if (m.gun >= 3) { rr(ctx, -7, side * 10.5 - 1.2, len - 4, 2.4, 1); ctx.fill(); ctx.stroke() }
    }
  }
  if (m.laser > 0) {
    const tip = 20 + 3 * m.laser
    rr(ctx, 7, -1.9, tip - 7, 3.8, 1.5); ctx.fillStyle = C.hull; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.hullDark; ctx.stroke()
    disc(ctx, tip, 0, 2, C.shield)
  }
  ctx.beginPath(); ctx.ellipse(6, 0, 4.4, 2.9, 0, 0, TAU); ctx.fillStyle = C.night; ctx.fill()
  if (m.magnet > 0) {                                     // potcoava, cu deschiderea spre coadă
    const r = 1.4 + 0.45 * m.magnet, x = -4, y = -5.4
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x, y - r); ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x - r, y + r)
    mark(ctx, C.metal, 1.6)
  }
  disc(ctx, 0, 0, HIT_DOT + 1, C.hullDark)
  disc(ctx, 0, 0, HIT_DOT, C.ink)
  ctx.restore()
  ctx.globalAlpha = ga
}

/** Inelul Scutului: plin cât e încărcat (mai gros cu treapta); cât se reîncarcă, un arc stins care crește. */
export function shield(ctx: CanvasRenderingContext2D, f: FlightState): void {
  const C = palette(), s = f.ship, tier = s.mods.shield, ga = ctx.globalAlpha
  if (tier <= 0) return
  ctx.beginPath()
  if (s.shieldUp) {
    ctx.arc(s.x, s.y, SHIELD_R, 0, TAU)
    ctx.globalAlpha = ga * 0.8; ctx.lineWidth = 1 + 0.6 * tier
  } else {
    const full = FLIGHT.mods.shield.recharge[tier - 1] ?? 1, k = Math.min(1, Math.max(0, 1 - s.shieldT / full))
    ctx.arc(s.x, s.y, SHIELD_R, -Math.PI / 2, -Math.PI / 2 + TAU * k)
    ctx.globalAlpha = ga * 0.3; ctx.lineWidth = 1.2
  }
  ctx.lineCap = 'round'; ctx.strokeStyle = C.shield; ctx.stroke()
  ctx.globalAlpha = ga
}

/** Conturul aprins al unei nave lovite, peste calea de acum. */
function lit(ctx: CanvasRenderingContext2D, on: boolean): void {
  if (!on) return
  ctx.lineWidth = 2.5; ctx.strokeStyle = palette().ink; ctx.stroke()
}

/** O navă dușmană, cu vârful în jos: drona, șerpuitoarea, nava grea, transportul gri cu dunga lui, nava de elită. Lovită, își aprinde conturul. */
export function foe(ctx: CanvasRenderingContext2D, f: FlightState, foe: FlightFoe): void {
  const C = palette(), r = foe.r, hit = f.t - foe.hitT < FOE_FLASH, fl = 0.6 + 0.4 * Math.sin(f.t * 30 + foe.id)
  ctx.save(); ctx.translate(foe.x, foe.y); ctx.rotate(Math.PI / 2)
  ctx.lineJoin = 'round'
  if (foe.kind === 'cargo') {
    jet(ctx, -15, 4.5, -19 - 7 * fl, 2.2, -16 - 4 * fl, C.jet, C.star)
    rr(ctx, -15, -14, 31, 28, 7); ctx.fillStyle = C.hull; ctx.fill()
    ctx.lineWidth = 2.2; ctx.strokeStyle = C.hullShade; ctx.stroke(); lit(ctx, hit)
    ctx.fillStyle = C.hero; ctx.fillRect(-3, -14, 6, 28)
    ctx.fillStyle = C.hullDark; ctx.fillRect(7, -6, 5, 12)
    ctx.restore()
    return
  }
  ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.34); ctx.lineTo(-r * (1.05 + fl * 0.5), 0); ctx.lineTo(-r * 0.45, r * 0.34); ctx.closePath()
  ctx.fillStyle = C.foeJet; ctx.fill()
  if (foe.kind === 'gunship' || foe.kind === 'elite') {   // tunurile din lături
    const at = foe.kind === 'elite' ? 0.8 : 0.72, w = foe.kind === 'elite' ? 0.2 : 0.24
    ctx.fillStyle = C.hull
    for (const side of SIDES) { rr(ctx, -r * 0.1, side * r * at - r * w / 2, r * 0.75, r * w, 2); ctx.fill() }
  }
  if (foe.kind === 'drone') {
    poly(ctx, GRUNT, r); ctx.fillStyle = C.foe; ctx.fill(); lit(ctx, hit)
  } else if (foe.kind === 'weaver') {
    poly(ctx, WEAVER, r); ctx.fillStyle = C.foe; ctx.fill()
    ctx.lineWidth = 2; ctx.strokeStyle = C.foeShade; ctx.stroke(); lit(ctx, hit)
  } else if (foe.kind === 'gunship') {
    poly(ctx, BRUTE, r); ctx.fillStyle = C.foeShade; ctx.fill()
    ctx.lineWidth = 2.5; ctx.strokeStyle = hit ? C.ink : C.foe; ctx.stroke()
  } else {
    poly(ctx, ELITE, r); ctx.fillStyle = C.foe; ctx.fill()
    ctx.lineWidth = 3; ctx.strokeStyle = hit ? C.ink : C.foeShade; ctx.stroke()
    disc(ctx, 0, 0, r * 0.38, C.foeGlass)
    disc(ctx, 0, 0, r * 0.18, foe.hp < foe.maxHp / 2 ? C.foeJet : C.hull)   // sub jumătate din viață, miezul se aprinde
    ctx.restore()
    return
  }
  ctx.beginPath(); ctx.ellipse(r * 0.28, 0, r * 0.3, r * 0.19, 0, 0, TAU); ctx.fillStyle = C.foeGlass; ctx.fill()
  ctx.restore()
  if (foe.kind === 'gunship' && foe.hp < foe.maxHp) {     // bara de viață a navei grele, deasupra ei
    const w = 2 * r, y = foe.y - r - 9
    ctx.fillStyle = alpha(C.night, 0.78); rr(ctx, foe.x - r - 1, y - 1, w + 2, 5, 2.5); ctx.fill()
    ctx.fillStyle = C.foe; rr(ctx, foe.x - r, y, Math.max(3, w * Math.max(0, foe.hp / foe.maxHp)), 3, 1.5); ctx.fill()
  }
}

/** Calea conturului unui asteroid: câte o rază pe direcție, din `shape`, × `k`. */
function asteroidPath(ctx: CanvasRenderingContext2D, a: FlightAsteroid, k: number, dx: number, dy: number): void {
  ctx.beginPath()
  const n = a.shape.length
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU, rad = a.r * (a.shape[i] ?? 1) * k
    if (i) ctx.lineTo(dx + Math.cos(ang) * rad, dy + Math.sin(ang) * rad); else ctx.moveTo(dx + rad, dy)
  }
  ctx.closePath()
}

/** Asteroidul, ca la apărare: umbra, fața mai deschisă, o groapă și două sclipiri; se rotește după starea lui. */
export function asteroid(ctx: CanvasRenderingContext2D, f: FlightState, a: FlightAsteroid): void {
  const C = palette(), hit = f.t - a.hitT < ASTEROID_FLASH, r = a.r
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot)
  asteroidPath(ctx, a, 1, 0, 0); ctx.fillStyle = hit ? C.oreFleck : C.oreShade; ctx.fill()
  asteroidPath(ctx, a, 0.74, -1.5, -2); ctx.fillStyle = C.ore; ctx.fill()
  disc(ctx, r * 0.3, r * 0.1, r * 0.16, C.orePit)
  ctx.fillStyle = C.oreFleck
  for (const [px, py] of [[-0.35, -0.3], [0.1, 0.4]] as const) {
    const x = px * r, y = py * r
    ctx.beginPath(); ctx.moveTo(x, y - 2.6); ctx.lineTo(x + 2, y); ctx.lineTo(x, y + 2.6); ctx.lineTo(x - 2, y); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

/** Calea unui hexagon cu vârful în lături. */
function hex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU
    if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + r, y)
  }
  ctx.closePath()
}

/** O resursă care cade: cristalul e un romb în două tonuri, metalul un hexagon, ca jetoanele de la apărare. Plutește puțin. */
export function drop(ctx: CanvasRenderingContext2D, f: FlightState, d: FlightDrop): void {
  const C = palette(), x = d.x, y = d.y + Math.sin(f.t * 4 + d.x * 0.3) * 1.5
  if (d.kind === 'crystal') {
    ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 6, y); ctx.closePath()
    ctx.fillStyle = C.crystal; ctx.fill()
    ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fillStyle = C.crystalLift; ctx.fill()
    return
  }
  hex(ctx, x, y, 6.5); ctx.fillStyle = C.metal; ctx.fill()
  ctx.lineWidth = 1.2; ctx.strokeStyle = C.oreShade; ctx.stroke()
}

/** Pictograma unui lucru de cules, în jurul lui (0, 0), cam 12 × 12; aceleași semne ca în bandă. */
function glyph(ctx: CanvasRenderingContext2D, kind: FlightModId | 'repair', color: string): void {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath()
  switch (kind) {
    case 'gun':                                           // trei țevi, cea din mijloc mai lungă
      ctx.moveTo(-5, 4.5); ctx.lineTo(-5, -1); ctx.moveTo(0, 4.5); ctx.lineTo(0, -5); ctx.moveTo(5, 4.5); ctx.lineTo(5, -1); ctx.stroke()
      return
    case 'laser':                                         // raza și lentila
      ctx.moveTo(-5, 5); ctx.lineTo(3, -3); ctx.stroke(); disc(ctx, 4.5, -4.5, 2, color)
      return
    case 'missile':                                       // vârful și coada
      ctx.moveTo(0, -6); ctx.lineTo(3.5, 2.5); ctx.lineTo(-3.5, 2.5); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(0, 3.5); ctx.lineTo(0, 6.5); ctx.stroke()
      return
    case 'shield':                                        // inelul și miezul
      ctx.arc(0, 0, 5.5, 0, TAU); ctx.stroke(); disc(ctx, 0, 0, 1.7, color)
      return
    case 'magnet':                                        // potcoava, deschisă în sus
      ctx.moveTo(-4.5, -5); ctx.lineTo(-4.5, 0); ctx.arc(0, 0, 4.5, Math.PI, 0, true); ctx.lineTo(4.5, -5); ctx.stroke()
      return
    case 'repair':                                        // plus
      ctx.moveTo(-5.5, 0); ctx.lineTo(5.5, 0); ctx.moveTo(0, -5.5); ctx.lineTo(0, 5.5); ctx.stroke()
  }
}

/**
 * Un lucru de cules: pătrat închis cu chenar în culoarea felului (armă, corp, utilitar, ca la apărare; reparația, deschisă) și
 * pictograma lui, cu un inel care pulsează. Nu seamănă cu focul dușman (rotund, portocaliu) și nici cu resursele.
 */
export function pick(ctx: CanvasRenderingContext2D, f: FlightState, p: FlightPick): void {
  const C = palette(), color = p.kind === 'repair' ? C.ink : toneOf(C, FLIGHT_MOD_KIND[p.kind])
  const pulse = 0.5 + 0.5 * Math.sin(f.t * 6 + p.x * 0.1), ga = ctx.globalAlpha
  ctx.save(); ctx.translate(p.x, p.y + Math.sin(f.t * 3 + p.x) * 2)
  ctx.globalAlpha = ga * (0.25 + 0.3 * pulse)
  ctx.beginPath(); ctx.arc(0, 0, PICK_HALF + 6 + 4 * pulse, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke()
  ctx.globalAlpha = ga
  rr(ctx, -PICK_HALF, -PICK_HALF, 2 * PICK_HALF, 2 * PICK_HALF, 7); ctx.fillStyle = C.night; ctx.fill()
  ctx.lineWidth = 2.2; ctx.strokeStyle = color; ctx.stroke()
  glyph(ctx, p.kind, color)
  ctx.restore()
}

/** Proiectilele Tunului: liniuțe deschise, toate într-o singură cale. */
export function bolts(ctx: CanvasRenderingContext2D, f: FlightState): void {
  ctx.beginPath()
  for (const b of f.bolts) { ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.014, b.y + 11) }
  ctx.lineCap = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = palette().bolt; ctx.stroke()
}

/** Focul dușman: mereu rotund și portocaliu, cu miez deschis; toate proiectilele în două umpleri. */
export function shots(ctx: CanvasRenderingContext2D, f: FlightState): void {
  const C = palette(), R = FLIGHT.shot.r + 1.5, r = 2.6
  ctx.beginPath()
  for (const s of f.shots) { ctx.moveTo(s.x + R, s.y); ctx.arc(s.x, s.y, R, 0, TAU) }
  ctx.fillStyle = C.foeJet; ctx.fill()
  ctx.beginPath()
  for (const s of f.shots) { ctx.moveTo(s.x + r, s.y); ctx.arc(s.x, s.y, r, 0, TAU) }
  ctx.fillStyle = C.ink; ctx.fill()
}

/** Racheta: corp deschis, vârf în direcția de mers și o flacără care pâlpâie după locul în care se află. */
export function missile(ctx: CanvasRenderingContext2D, m: FlightMissile): void {
  const C = palette(), fl = 0.6 + 0.4 * Math.sin((m.x + m.y) * 0.9)
  ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.atan2(m.vy, m.vx))
  ctx.beginPath(); ctx.moveTo(-5, -2.2); ctx.lineTo(-5 - 8 * fl, 0); ctx.lineTo(-5, 2.2); ctx.closePath(); ctx.fillStyle = C.foeJet; ctx.fill()
  rr(ctx, -6, -2.4, 10, 4.8, 2); ctx.fillStyle = C.hull; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.hullDark; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(3, -2.4); ctx.lineTo(8, 0); ctx.lineTo(3, 2.4); ctx.closePath(); ctx.fillStyle = C.hero; ctx.fill()
  ctx.restore()
}

type Fx<K extends FlightFx['kind']> = Extract<FlightFx, { kind: K }>

/** Raza Laserului, de la navă la țintă, cu halou; se stinge în `beamLife`. */
export function beam(ctx: CanvasRenderingContext2D, e: Fx<'beam'>, age: number): void {
  const C = palette(), k = fade(age, FLIGHT.fx.beamLife), ga = ctx.globalAlpha
  if (k <= 0) return
  ctx.lineCap = 'round'
  ctx.globalAlpha = ga * 0.35 * k
  ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.lineWidth = 7; ctx.strokeStyle = C.jet; ctx.stroke()
  ctx.globalAlpha = ga * k
  ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.lineWidth = 2.4; ctx.strokeStyle = C.bolt; ctx.stroke()
  disc(ctx, e.x2, e.y2, 2 + 3 * k, C.bolt)
  ctx.globalAlpha = ga
}

/** Explozia unei rachete: un disc portocaliu, străveziu, și un inel care cresc până la zona ei și se sting în `blastLife`. */
export function blast(ctx: CanvasRenderingContext2D, e: Fx<'blast'>, age: number): void {
  const C = palette(), k = fade(age, FLIGHT.fx.blastLife), ga = ctx.globalAlpha
  if (k <= 0) return
  const q = 1 - k, r = e.r * (BLAST_START + (1 - BLAST_START) * (1 - k * k))   // crește repede, apoi încetinește
  ctx.globalAlpha = ga * k
  disc(ctx, e.x, e.y, r, alpha(C.foeJet, 0.28))
  disc(ctx, e.x, e.y, r * 0.45 * (1 - q), C.star)
  ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.lineWidth = 3.5; ctx.strokeStyle = C.hero; ctx.stroke()
  ctx.globalAlpha = ga
}

/** Ceva a căzut sau s-a spart: un inel care se lărgește și se stinge, în culoarea lui. */
export function puff(ctx: CanvasRenderingContext2D, e: Fx<'puff'>, age: number): void {
  const C = palette(), k = fade(age, FLIGHT.fx.puffLife), q = 1 - k, ga = ctx.globalAlpha
  if (k <= 0) return
  const color = e.what === 'asteroid' ? C.oreFleck : e.what === 'shot' ? C.ink : C.foeJet
  ctx.globalAlpha = ga * k * 0.8
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.3 + 0.7 * q), 0, TAU); ctx.lineWidth = 3 * k + 1; ctx.strokeStyle = color; ctx.stroke()
  ctx.globalAlpha = ga
}

/** Scutul a oprit o lovitură: inelul din jurul navei clipește alb și se lărgește puțin. */
export function block(ctx: CanvasRenderingContext2D, f: FlightState, _e: Fx<'block'>, age: number): void {
  const k = fade(age, FLIGHT.fx.blockLife), ga = ctx.globalAlpha
  if (k <= 0) return
  ctx.globalAlpha = ga * k
  ctx.beginPath(); ctx.arc(f.ship.x, f.ship.y, SHIELD_R + 5 * (1 - k), 0, TAU); ctx.lineWidth = 4.5; ctx.strokeStyle = palette().ink; ctx.stroke()
  ctx.globalAlpha = ga
}

/** Nava ta lovită: ecranul se înroșește scurt. Căzută: mai tare, cu două inele care se lărgesc din locul ei. */
export function flash(ctx: CanvasRenderingContext2D, e: Fx<'hurt'> | Fx<'down'>, age: number, area: Area): void {
  const C = palette(), life = e.kind === 'down' ? FLIGHT.fx.downLife : FLIGHT.fx.hurtLife, k = fade(age, life), q = 1 - k, ga = ctx.globalAlpha
  if (k <= 0) return
  ctx.globalAlpha = ga * k * (e.kind === 'down' ? 0.35 : 0.25)
  ctx.fillStyle = C.foe; ctx.fillRect(area.l, area.t, area.r - area.l, area.b - area.t)
  if (e.kind === 'down') {
    ctx.globalAlpha = ga * k
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(e.x, e.y, 10 + 55 * q, 0, TAU); ctx.strokeStyle = C.hero; ctx.stroke()
    ctx.beginPath(); ctx.arc(e.x, e.y, 6 + 30 * q, 0, TAU); ctx.strokeStyle = C.foeJet; ctx.stroke()
  }
  ctx.globalAlpha = ga
}

/** Formele zborului; `scene.ts` hotărăște ordinea. Testele pun în locul lor un aspect care doar notează. */
export interface FlightLook {
  ship(ctx: CanvasRenderingContext2D, f: FlightState): void
  shield(ctx: CanvasRenderingContext2D, f: FlightState): void
  foe(ctx: CanvasRenderingContext2D, f: FlightState, foe: FlightFoe): void
  asteroid(ctx: CanvasRenderingContext2D, f: FlightState, a: FlightAsteroid): void
  drop(ctx: CanvasRenderingContext2D, f: FlightState, d: FlightDrop): void
  pick(ctx: CanvasRenderingContext2D, f: FlightState, p: FlightPick): void
  bolts(ctx: CanvasRenderingContext2D, f: FlightState): void
  shots(ctx: CanvasRenderingContext2D, f: FlightState): void
  missile(ctx: CanvasRenderingContext2D, m: FlightMissile): void
  beam(ctx: CanvasRenderingContext2D, e: Fx<'beam'>, age: number): void
  blast(ctx: CanvasRenderingContext2D, e: Fx<'blast'>, age: number): void
  puff(ctx: CanvasRenderingContext2D, e: Fx<'puff'>, age: number): void
  block(ctx: CanvasRenderingContext2D, f: FlightState, e: Fx<'block'>, age: number): void
  flash(ctx: CanvasRenderingContext2D, e: Fx<'hurt'> | Fx<'down'>, age: number, area: Area): void
}

export const FLIGHT_LOOK: FlightLook = { ship, shield, foe, asteroid, drop, pick, bolts, shots, missile, beam, blast, puff, block, flash }
