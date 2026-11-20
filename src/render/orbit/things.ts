// „Orbită”: ce se desenează de multe ori pe cadru (resurse, clădiri, nave, raze) și semnele mici.
// Doar forme pline și linii: fără gradient, fără decupaj, fără umbră estompată.
import { BALANCE } from '../../data/balance'
import { heroArc } from '../../sim/hero'
import { tierOf } from '../../sim/mods'
import type { Foe, Fx, GameState, Input, Pad, PadKind, Res, ResNode, Shot } from '../../sim/state'
import { blastReach, blockGlow, fade, regrown, shieldReady, turretAim } from '../derive'
import { blob, disc, poly, rr, seg, TAU, type Pt } from '../draw'
import { alpha, FONT_UI, palette } from '../palette'

// Formele navelor, la mărimea 1 (cele dușmane se scalează cu raza lor) sau în px de lume (nava ta).
const GRUNT: readonly Pt[] = [[1.25, 0], [-0.8, 0.95], [-0.4, 0], [-0.8, -0.95]]
const BRUTE: readonly Pt[] = [[1.2, 0], [0.15, 0.6], [-0.9, 1], [-0.5, 0.3], [-0.75, 0], [-0.5, -0.3], [-0.9, -1], [0.15, -0.6]]
const SHIP: readonly Pt[] = [[18, 0], [-3, 9.5], [-12, 13], [-7, 0], [-12, -13], [-3, -9.5]]

const SHAKE = 0.18           // cât tresare o resursă după o bucată strânsă, s
const SPROUT = 0.45          // de la cât din creștere apare din nou țandăra unui cristal golit
const POP = 0.25             // cât crește o clădire abia construită, s
const LUNGE = 0.12           // cât ține avântul unei nave care lovește, s
const FOE_FLASH = 0.08       // cât clipește o navă dușmană lovită, s
const HURT_FLASH = 0.1       // cât clipește nava ta lovită, s
const WAVE = 0.16            // cât se vede unda, s
const SHIELD_R = 25          // raza inelului Scutului în jurul navei tale, px
const BEAM_FROM = 14         // de la ce distanță de mijlocul navei pornește raza laserului, px

/** Un patrulater rotit cu (cos, sin) în jurul lui (x, y). */
function quad(ctx: CanvasRenderingContext2D, x: number, y: number, c: number, sn: number,
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number, fill: string): void {
  ctx.beginPath()
  ctx.moveTo(x + ax * c - ay * sn, y + ax * sn + ay * c)
  ctx.lineTo(x + bx * c - by * sn, y + bx * sn + by * c)
  ctx.lineTo(x + cx * c - cy * sn, y + cx * sn + cy * c)
  ctx.lineTo(x + dx * c - dy * sn, y + dx * sn + dy * c)
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill()
}

/** O țandără de cristal cu trei fețe (umbră, lumină, mijloc), înaltă de 1,75 × size, înclinată cu `tilt`. */
function shard(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tilt: number, base: string, light: string, dark: string): void {
  const c = Math.cos(tilt), sn = Math.sin(tilt), top = -1.25 * size, mid = -0.25 * size, bot = 0.5 * size, w = 0.42 * size
  quad(ctx, x, y, c, sn, 0, top, w, mid, 0, bot, 0, mid, dark)
  quad(ctx, x, y, c, sn, 0, top, -w, mid, 0, bot, 0, mid, light)
  quad(ctx, x, y, c, sn, 0, top, 0.15 * size, mid, 0, bot, -0.15 * size, mid, base)
}

/** Calea unui hexagon cu vârful în sus, de rază r. */
function hex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6
    if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  ctx.closePath()
}

/** Tresăritul unei resurse din care tocmai s-a strâns, pe orizontală. */
function shake(s: GameState, n: ResNode): number {
  return s.t - n.shakeT < SHAKE ? Math.sin((s.t - n.shakeT) * 70) * 2 : 0
}

function crystal(ctx: CanvasRenderingContext2D, s: GameState, n: ResNode): void {
  const C = palette()
  if (n.left <= 0) {
    ctx.beginPath(); ctx.ellipse(n.x, n.y + 3, 7, 4, 0, 0, TAU); ctx.fillStyle = C.crystalBase; ctx.fill()
    const ga = ctx.globalAlpha
    ctx.globalAlpha = ga * 0.5
    shard(ctx, n.x, n.y + 1, 4.5, 0, C.crystalShade, C.crystalShade, C.crystalBase)         // ciotul
    ctx.globalAlpha = ga
    const g = regrown(n, s.t)
    if (g > SPROUT) shard(ctx, n.x, n.y + 1, (7 * (g - SPROUT)) / (1 - SPROUT), 0, C.crystal, C.crystalLift, C.crystalShade)
    return
  }
  const R = 11 + 7 * (n.left / BALANCE.node.crystal.amount), x = n.x + shake(s, n), y = n.y
  ctx.beginPath(); ctx.ellipse(x, y + R * 0.36, R * 0.82, R * 0.42, 0, 0, TAU); ctx.fillStyle = C.crystalBase; ctx.fill()
  shard(ctx, x - R * 0.42, y + R * 0.2, R * 0.62, -0.38, C.crystal, C.crystalLift, C.crystalShade)
  shard(ctx, x + R * 0.46, y + R * 0.24, R * 0.55, 0.42, C.crystal, C.crystalLift, C.crystalShade)
  shard(ctx, x, y - R * 0.02, R * 0.95, 0, C.crystal, C.crystalLift, C.crystalShade)
  const tw = Math.sin(s.t * 2 + n.x * 0.13 + n.y * 0.07)        // o sclipire scurtă, din când în când
  if (tw > 0.86) {
    const k = 5 * ((tw - 0.86) / 0.14), sx = x - R * 0.12, sy = y - R * 0.8
    ctx.strokeStyle = C.star; ctx.lineWidth = 1.4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(sx - k, sy); ctx.lineTo(sx + k, sy); ctx.moveTo(sx, sy - k); ctx.lineTo(sx, sy + k); ctx.stroke()
  }
}

function asteroid(ctx: CanvasRenderingContext2D, s: GameState, n: ResNode): void {
  const C = palette()
  if (n.left <= 0) {
    disc(ctx, n.x - 5, n.y + 2, 3.5, C.oreShade); disc(ctx, n.x + 4, n.y + 4, 2.8, C.oreShade); disc(ctx, n.x + 1, n.y - 3, 2.4, C.oreShade)
    return
  }
  const R = 10 + 8 * (n.left / BALANCE.node.metal.amount), rot = s.t * 0.12 + n.x, x = n.x + shake(s, n), y = n.y
  blob(ctx, x, y, n.shape, R, rot); ctx.fillStyle = C.oreShade; ctx.fill()
  blob(ctx, x - 1.5, y - 2.5, n.shape, R * 0.72, rot); ctx.fillStyle = C.ore; ctx.fill()
  disc(ctx, x + Math.cos(rot + 1) * R * 0.3, y + Math.sin(rot + 1) * R * 0.28, R * 0.15, C.orePit)
  ctx.fillStyle = C.oreFleck
  for (let i = 0; i < 3; i++) {
    const a = rot + i * 2.1 + 0.5, px = x + Math.cos(a) * R * 0.5, py = y + Math.sin(a) * R * 0.44
    ctx.beginPath(); ctx.moveTo(px, py - 3); ctx.lineTo(px + 2.4, py); ctx.lineTo(px, py + 3); ctx.lineTo(px - 2.4, py); ctx.closePath(); ctx.fill()
  }
}

export function node(ctx: CanvasRenderingContext2D, s: GameState, n: ResNode): void {
  if (n.type === 'crystal') crystal(ctx, s, n); else asteroid(ctx, s, n)
}

/** Turela, în coordonate locale: două panouri solare, discul, țeava spre țintă și nivelul în mijloc. */
function turret(ctx: CanvasRenderingContext2D, s: GameState, p: Pad): void {
  const C = palette(), R = BALANCE.turret.r, aim = turretAim(s, p)
  ctx.fillStyle = C.solar
  rr(ctx, -28, -5.5, 12, 11, 2); ctx.fill(); rr(ctx, 16, -5.5, 12, 11, 2); ctx.fill()
  ctx.strokeStyle = C.solarLine; ctx.lineWidth = 1
  seg(ctx, -22, -5.5, -22, 5.5); ctx.stroke(); seg(ctx, 22, -5.5, 22, 5.5); ctx.stroke()
  disc(ctx, 0, 0, R, C.hullShade); disc(ctx, 0, 0, R * 0.75, C.hull)
  ctx.rotate(aim)
  rr(ctx, 2, -3, 17, 6, 3); ctx.fillStyle = C.ink; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = C.hullShade; ctx.stroke()
  ctx.rotate(-aim)
  disc(ctx, 0, 0, 5.6, C.hullDark)
  ctx.font = `700 9.5px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.ink; ctx.fillText(String(p.lvl), 0, 0.5)
}

/** Colectorul sau mina, în coordonate locale: cutia cu dunga, antena, grămăjoara, punctele de nivel și drona. */
function station(ctx: CanvasRenderingContext2D, s: GameState, p: Pad): void {
  const C = palette(), tone = p.kind === 'collector' ? C.crystal : C.metal
  ctx.fillStyle = C.hullShade; rr(ctx, -17, -10, 34, 25, 6); ctx.fill()
  ctx.fillStyle = C.hull; rr(ctx, -17, -13, 34, 24, 6); ctx.fill()
  ctx.fillStyle = tone; ctx.fillRect(-17, -4, 34, 6)
  disc(ctx, -9, -8.5, 2, C.hullDark); disc(ctx, -2, -8.5, 2, C.hullDark)
  ctx.strokeStyle = C.hull; ctx.lineWidth = 2; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(12, -19, 6, Math.PI * 0.95, Math.PI * 1.95); ctx.stroke()
  seg(ctx, 12, -19, 12, -13); ctx.stroke()
  if (p.kind === 'collector') {
    shard(ctx, 24, 9, 7, 0.2, C.crystal, C.crystalLift, C.crystalShade)
    shard(ctx, 30, 12, 5, -0.3, C.crystal, C.crystalLift, C.crystalShade)
  } else {
    hex(ctx, 24, 8, 5.5); ctx.fillStyle = C.metal; ctx.fill()
    hex(ctx, 30, 13, 4); ctx.fillStyle = C.oreShade; ctx.fill()
  }
  for (let i = 0; i < p.lvl; i++) disc(ctx, -9 + i * 7, -22, 2.4, C.ink)
  const a = s.t * 1.6 + p.bx
  disc(ctx, Math.cos(a) * 29, -2 + Math.sin(a) * 19, 2.6, tone)
}

export function building(ctx: CanvasRenderingContext2D, s: GameState, p: Pad): void {
  const age = s.t - p.popT
  const grow = age < POP ? 1 + Math.sin((age / POP) * Math.PI) * 0.22 : 1
  ctx.save(); ctx.translate(p.bx, p.by); ctx.scale(grow, grow)
  if (p.kind === 'turret') turret(ctx, s, p); else station(ctx, s, p)
  ctx.restore()
}

export function foe(ctx: CanvasRenderingContext2D, s: GameState, f: Foe): void {
  const C = palette(), r = f.r, fl = 0.6 + 0.4 * Math.sin(s.t * 30 + f.id)
  ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a)
  if (s.t - f.lungeT < LUNGE) ctx.translate(4, 0)
  ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.34); ctx.lineTo(-r * (1.05 + fl * 0.5), 0); ctx.lineTo(-r * 0.45, r * 0.34); ctx.closePath()
  ctx.fillStyle = C.foeJet; ctx.fill()
  poly(ctx, f.brute ? BRUTE : GRUNT, r)
  ctx.fillStyle = s.t - f.hitT < FOE_FLASH ? C.ink : f.brute ? C.foeShade : C.foe; ctx.fill()
  if (f.brute) { ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = C.foe; ctx.stroke() }
  ctx.beginPath(); ctx.ellipse(r * 0.28, 0, r * 0.3, r * 0.19, 0, 0, TAU); ctx.fillStyle = C.foeGlass; ctx.fill()
  ctx.restore()
}

/** Un semn mic de pe navă: întâi o linie lată, închisă, ca semnul să se desprindă de corpul galben, apoi semnul în culoarea lui. */
function mark(ctx: CanvasRenderingContext2D, color: string, width: number): void {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.lineWidth = width + 2; ctx.strokeStyle = palette().hullDark; ctx.stroke()
  ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke()
}

/** Jetul din spate, cu vârful la `back` − `len` × pâlpâire; `w` e jumătate din lățimea lui la bază. */
function jet(ctx: CanvasRenderingContext2D, back: number, w: number, len: number, fl: number): void {
  const C = palette()
  ctx.beginPath(); ctx.moveTo(back, -w); ctx.lineTo(back - len * fl, 0); ctx.lineTo(back, w); ctx.closePath(); ctx.fillStyle = C.jet; ctx.fill()
  ctx.beginPath(); ctx.moveTo(back, -w / 2); ctx.lineTo(back - len * fl * 0.55, 0); ctx.lineTo(back, w / 2); ctx.closePath(); ctx.fillStyle = C.star; ctx.fill()
}

/**
 * Nava ta, în coordonate locale (botul spre +x), cu formele modulelor: Motorul — o duză în coadă și un jet care arde și pe loc,
 * mai lung în mers; Blindajul — un contur alb, gros; Laserul — o țeavă în bot; Rachetele — două cutii pe aripi, cu vârful
 * portocaliu; Reparatorul — un plus în cabină; Magnetul — o potcoavă pe aripa stângă; Releul — o antenă cu unde pe aripa dreaptă.
 * Treapta: țeava, cutiile și jetul se lungesc, conturul și plusul se îngroașă, potcoava crește, antena are una, două sau trei unde.
 */
function ship(ctx: CanvasRenderingContext2D, s: GameState, moving: boolean): void {
  const C = palette(), h = s.hero
  const engine = tierOf(s, 'engine'), armor = tierOf(s, 'armor'), laser = tierOf(s, 'laser'), missile = tierOf(s, 'missile')
  const mender = tierOf(s, 'mender'), magnet = tierOf(s, 'magnet'), relay = tierOf(s, 'relay')
  const fl = 0.6 + 0.4 * Math.sin(s.t * 34)
  if (engine > 0) {
    jet(ctx, -11, 4.2, moving ? 13 + 4 * engine : 4 + 2 * engine, moving ? fl : 0.85 + 0.15 * fl)
    ctx.fillStyle = C.hullShade; rr(ctx, -12.5, -3, 7, 6, 2); ctx.fill()
  } else if (moving) jet(ctx, -8, 4.5, 14, fl)
  poly(ctx, SHIP)
  if (armor > 0) { ctx.lineWidth = 2.6 + 1.6 * armor; ctx.lineJoin = 'round'; ctx.strokeStyle = C.hull; ctx.stroke() }
  ctx.fillStyle = s.t - h.hurtT < HURT_FLASH ? C.ink : C.hero; ctx.fill()
  ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.strokeStyle = C.heroShade; ctx.stroke()
  if (missile > 0) {
    const len = 7 + 2 * missile
    for (const side of [-1, 1]) {
      const y = side * 12.3 - 2.4
      rr(ctx, -10, y, len, 4.8, 1.8); ctx.fillStyle = C.hull; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.hullDark; ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-10 + len, y); ctx.lineTo(-6 + len, y + 2.4); ctx.lineTo(-10 + len, y + 4.8); ctx.closePath()
      ctx.fillStyle = C.foeJet; ctx.fill(); ctx.stroke()
    }
  }
  if (laser > 0) {
    const tip = 20 + 3 * laser
    rr(ctx, 7, -1.9, tip - 7, 3.8, 1.5); ctx.fillStyle = C.hull; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.hullDark; ctx.stroke()
    disc(ctx, tip, 0, 2, C.shield)
  }
  ctx.beginPath(); ctx.ellipse(3, 0, 5, 3.2, 0, 0, TAU); ctx.fillStyle = C.night; ctx.fill()
  if (mender > 0) {
    const a = 1.2 + 0.4 * mender
    ctx.beginPath(); ctx.moveTo(3 - a, 0); ctx.lineTo(3 + a, 0); ctx.moveTo(3, -a); ctx.lineTo(3, a)
    ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.strokeStyle = C.shield; ctx.stroke()
  }
  if (magnet > 0) {                                       // potcoava, cu deschiderea spre coadă
    const r = 1.4 + 0.45 * magnet, x = -4, y = -5.2
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x, y - r); ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x - r, y + r)
    mark(ctx, C.metal, 1.6)
  }
  if (relay > 0) {                                        // antena: un punct între două unde, spre bot și spre coadă; undele se îngroașă cu treapta
    const x = -3.5, y = 5.6, r = 4.3
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(-0.8) * r, y + Math.sin(-0.8) * r); ctx.arc(x, y, r, -0.8, 0.8)
    ctx.moveTo(x + Math.cos(Math.PI - 0.8) * r, y + Math.sin(Math.PI - 0.8) * r); ctx.arc(x, y, r, Math.PI - 0.8, Math.PI + 0.8)
    ctx.lineWidth = 0.9 + 0.35 * relay; ctx.lineCap = 'round'; ctx.strokeStyle = C.hullDark; ctx.stroke()
    disc(ctx, x, y, 2.2, C.hullDark); disc(ctx, x, y, 1.4, C.metal)
  }
}

export function hero(ctx: CanvasRenderingContext2D, s: GameState, input: Input): void {
  const C = palette(), h = s.hero
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.face)
  ship(ctx, s, Math.hypot(input.x, input.y) > BALANCE.hero.deadzone)
  ctx.restore()
  const glow = blockGlow(s), shield = tierOf(s, 'shield')
  if (shieldReady(s) || glow > 0) {                       // inelul Scutului: subțire cât e încărcat; clipește când oprește o lovitură
    const ga = ctx.globalAlpha
    ctx.beginPath(); ctx.arc(h.x, h.y, glow > 0 ? SHIELD_R + 5 * (1 - glow) : SHIELD_R, 0, TAU)
    if (glow > 0) { ctx.globalAlpha = ga * glow; ctx.lineWidth = 4.5; ctx.strokeStyle = C.ink }
    else { ctx.globalAlpha = ga * 0.8; ctx.lineWidth = 0.8 + 0.5 * shield; ctx.strokeStyle = C.shield }
    ctx.stroke(); ctx.globalAlpha = ga
  }
  const sa = s.t - h.waveT
  if (sa < WAVE) {
    const ga = ctx.globalAlpha, arc = heroArc(s)
    ctx.globalAlpha = ga * (1 - sa / WAVE)
    ctx.beginPath(); ctx.arc(h.x, h.y, BALANCE.hero.reach * 0.8, h.waveA - arc + sa * 5, h.waveA + arc)
    ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = C.bolt; ctx.stroke(); ctx.globalAlpha = ga
  }
}

/** Racheta: un corp mic, alb, cu vârful portocaliu și un jet care pâlpâie după locul în care se află (fără ceas). */
function missileShot(ctx: CanvasRenderingContext2D, sh: Shot): void {
  const C = palette(), fl = 0.6 + 0.4 * Math.sin((sh.x + sh.y) * 0.9)
  ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.a)
  ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-5 - 8 * fl, 0); ctx.lineTo(-5, 2); ctx.closePath(); ctx.fillStyle = C.foeJet; ctx.fill()
  rr(ctx, -6, -2.2, 10, 4.4, 2); ctx.fillStyle = C.hull; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.hullDark; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(2, -2.2); ctx.lineTo(7, 0); ctx.lineTo(2, 2.2); ctx.closePath(); ctx.fillStyle = C.foeJet; ctx.fill()
  ctx.restore()
}

/** Raza unei turele: o liniuță cu halou lat și străveziu, cu vârful în (x, y) și coada în urmă. Racheta navei are forma ei. */
export function shot(ctx: CanvasRenderingContext2D, sh: Shot): void {
  if (sh.kind === 'missile') { missileShot(ctx, sh); return }
  const C = palette(), x1 = sh.x - Math.cos(sh.a) * 12, y1 = sh.y - Math.sin(sh.a) * 12
  ctx.lineCap = 'round'
  seg(ctx, sh.x, sh.y, x1, y1); ctx.strokeStyle = alpha(C.shield, 0.3); ctx.lineWidth = 7; ctx.stroke()
  seg(ctx, sh.x, sh.y, x1, y1); ctx.strokeStyle = C.bolt; ctx.lineWidth = 2.5; ctx.stroke()
}

/** Raza laserului: o linie dreaptă de la navă la țintă, cu halou, și o scânteie la țintă; se stinge în `beamLife`. */
export function beam(ctx: CanvasRenderingContext2D, f: Extract<Fx, { kind: 'beam' }>, age: number): void {
  const C = palette(), k = fade(age, BALANCE.fx.beamLife), ga = ctx.globalAlpha
  if (k <= 0) return
  const d = Math.hypot(f.tx - f.x, f.ty - f.y), off = d > BEAM_FROM ? BEAM_FROM / d : 0      // pornește de la marginea navei, nu din mijlocul ei
  const x0 = f.x + (f.tx - f.x) * off, y0 = f.y + (f.ty - f.y) * off
  ctx.globalAlpha = ga * k; ctx.lineCap = 'round'
  seg(ctx, x0, y0, f.tx, f.ty); ctx.strokeStyle = alpha(C.shield, 0.35); ctx.lineWidth = 7; ctx.stroke()
  seg(ctx, x0, y0, f.tx, f.ty); ctx.strokeStyle = C.bolt; ctx.lineWidth = 2.2; ctx.stroke()
  disc(ctx, f.tx, f.ty, 3 + 3 * k, C.bolt)
  ctx.globalAlpha = ga
}

/** Explozia: un disc portocaliu, străveziu, și un inel galben care cresc până la zona rachetei și se sting în `blastLife`. */
export function blast(ctx: CanvasRenderingContext2D, f: Extract<Fx, { kind: 'blast' }>, age: number): void {
  const C = palette(), k = fade(age, BALANCE.fx.blastLife), ga = ctx.globalAlpha
  if (k <= 0) return
  const r = blastReach(f.r, age)
  ctx.globalAlpha = ga * k
  disc(ctx, f.x, f.y, r, alpha(C.foeJet, 0.28))
  disc(ctx, f.x, f.y, r * 0.45 * k, C.star)
  ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, TAU); ctx.lineWidth = 3.5; ctx.strokeStyle = C.hero; ctx.stroke()
  ctx.globalAlpha = ga
}

/** Semnul din mijlocul cercului: țintă, romb, hexagon, săgeată de navă sau plus. */
export function glyph(ctx: CanvasRenderingContext2D, kind: PadKind, x: number, y: number): void {
  ctx.strokeStyle = alpha(palette().ink, 0.85); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  if (kind === 'mine') { hex(ctx, x, y, 8); ctx.stroke(); return }
  ctx.beginPath()
  if (kind === 'turret') { ctx.arc(x, y, 7, 0, TAU); ctx.moveTo(x + 2, y); ctx.arc(x, y, 2, 0, TAU) }
  else if (kind === 'collector') { ctx.moveTo(x, y - 9); ctx.lineTo(x + 6, y - 1); ctx.lineTo(x, y + 9); ctx.lineTo(x - 6, y - 1); ctx.closePath() }
  else if (kind === 'hero') { ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y + 8); ctx.lineTo(x, y + 3.5); ctx.lineTo(x - 7, y + 8); ctx.closePath() }
  else { ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y) }
  ctx.stroke()
}

/** Jetonul: romb pentru cristale, hexagon pentru metal. */
export function chip(ctx: CanvasRenderingContext2D, res: Res, x: number, y: number): void {
  const C = palette()
  if (res === 'crystal') {
    ctx.beginPath(); ctx.moveTo(x + 5, y - 6.5); ctx.lineTo(x + 10.5, y); ctx.lineTo(x + 5, y + 6.5); ctx.lineTo(x - 0.5, y); ctx.closePath()
    ctx.fillStyle = C.crystal; ctx.fill()
    return
  }
  hex(ctx, x + 5, y, 6.2); ctx.fillStyle = C.metal; ctx.fill()
}
