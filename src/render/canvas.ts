// Desenarea pe Canvas 2D. Citește starea, nu o modifică.
//
// Straturi, de jos în sus: terenul (static, din cache — `terrain.ts`), animațiile terenului, drumul, raza și
// fantomele, grupurile, turnurile, inamicii, loviturile, efectele (`fx.ts`), capetele, textele reacțiilor.
// Tot ce se mișcă aici se mișcă doar în desen: timpul (`Overlay.now`) e al ecranului, simularea nu știe de el.

import { ENEMIES, TRAITS } from '../data/enemies'
import { MILI_HEX, VIETI_BAZA } from '../data/joc'
import { TERRAIN, type Terrain } from '../data/terrain'
import { TOWERS, type TowerInfo, type TowerType } from '../data/towers'
import { enemyHealth, enemySpeed, isCombined, pathContacts, towerGroups, type Enemy, type GameState } from '../sim/game'
import { distance, fromKey, type Hex } from '../sim/hex'
import type { Fx } from './fx'
import { drawTerrain, drawTerrainAnimations, FUNDAL, shade } from './terrain'

const SQRT3 = Math.sqrt(3)

export interface Layout {
  /** Raza unui hexagon, în pixeli CSS. */
  readonly size: number
  readonly originX: number
  readonly originY: number
}

/** Zona ecranului rămasă liberă pentru hartă (între barele și panoul interfeței), în pixeli CSS. */
export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** Hexagoanele „pointy-top” încap în `area`, centrate. */
export function fitLayout(radius: number, area: Rect): Layout {
  const sizeByW = area.w / (SQRT3 * (2 * radius + 1) + 1)
  const sizeByH = area.h / (1.5 * (2 * radius) + 2 + 0.5)
  const size = Math.max(6, Math.min(sizeByW, sizeByH))
  return { size, originX: area.x + area.w / 2, originY: area.y + area.h / 2 }
}

export function hexToPixel(h: Hex, l: Layout): { x: number; y: number } {
  return {
    x: l.originX + l.size * SQRT3 * (h.q + h.r / 2),
    y: l.originY + l.size * 1.5 * h.r,
  }
}

export function pixelToHex(x: number, y: number, l: Layout): Hex {
  const px = (x - l.originX) / l.size
  const py = (y - l.originY) / l.size
  const qf = (SQRT3 / 3) * px - (1 / 3) * py
  const rf = (2 / 3) * py
  // rotunjire în coordonate cubice
  const sf = -qf - rf
  let q = Math.round(qf)
  let r = Math.round(rf)
  const s = Math.round(sf)
  const dq = Math.abs(q - qf)
  const dr = Math.abs(r - rf)
  const ds = Math.abs(s - sf)
  if (dq > dr && dq > ds) q = -r - s
  else if (dr > ds) r = -q - s
  return { q: q + 0, r: r + 0 }
}

export function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    const x = cx + size * Math.cos(a)
    const y = cy + size * Math.sin(a)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

export interface Overlay {
  /** Porțiunea de drum aleasă: ocolul pornește din path[start] și înlocuiește `span` hexagoane. */
  readonly start?: number
  readonly span?: number
  /** Ocolul propus, desenat ca fantomă. */
  readonly preview?: readonly Hex[]
  /**
   * Cât din tick-ul următor a trecut deja (0..1). Doar desenul îl folosește, ca mișcarea să fie lină între
   * două tick-uri; simularea rămâne pe pas fix.
   */
  readonly alpha?: number
  /** Timpul ecranului, în ms (pentru animații). */
  readonly now?: number
  /**
   * Raza arătată: a turnului de sub mouse, a celui de construit, sau — pentru un grup combinat — reuniunea razelor
   * turnurilor lui (un hexagon e luminat dacă îl acoperă oricare).
   */
  readonly range?: { readonly cercuri: readonly { readonly hex: Hex; readonly raza: number }[]; readonly culoare: string }
  /** Turnul care s-ar construi aici, ca fantomă; `ok: false` = nu se poate (motivul e în text). */
  readonly ghost?: { readonly hex: Hex; readonly tip: TowerType; readonly ok: boolean }
  /** Textele reacțiilor de pe hartă: unde (pe drum), ce scrie și cât de vechi sunt (0 = proaspete, 1 = dispar). */
  readonly popups?: readonly { readonly text: string; readonly culoare: string; readonly progres: number; readonly varsta: number }[]
  /** Legăturile fantomei cu turnurile vecine: grupul în care ar intra, combinat sau nu. */
  readonly ghostLinks?: readonly { readonly to: Hex; readonly combinat: boolean }[]
  /** Turnul ales (click): un inel în jurul lui. */
  readonly selected?: Hex
  /** Terraformarea de sub mouse: hexagonul colorat în terenul care ar ieși; `ok: false` = nu se poate. */
  readonly terraform?: { readonly hex: Hex; readonly teren: Terrain; readonly ok: boolean }
  /** Mina de sub mouse, ca fantomă. */
  readonly mineGhost?: { readonly hex: Hex; readonly ok: boolean }
  /** Efectele de scurtă durată (particule, fulgere, scuturarea ecranului). */
  readonly fx?: Fx
  /** Când a fost lovit ultima oară fiecare inamic (ms), ca să clipească alb. */
  readonly flash?: ReadonlyMap<number, number>
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath()
  ctx.moveTo(x - size * 0.4, y - size * 0.4)
  ctx.lineTo(x + size * 0.4, y + size * 0.4)
  ctx.moveTo(x + size * 0.4, y - size * 0.4)
  ctx.lineTo(x - size * 0.4, y + size * 0.4)
  ctx.strokeStyle = '#f0a35e'
  ctx.lineWidth = 3
  ctx.stroke()
}

/** Culorile grupurilor: auriu = combinat (un singur turn), alb-transparent = turnuri vecine care trag individual. */
const LINK_COMBINAT = 'rgba(245, 215, 110, 0.95)'
const LINK_INDIVIDUAL = 'rgba(232, 230, 227, 0.45)'

function drawLink(ctx: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }, size: number, combinat: boolean, dashed = false): void {
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.strokeStyle = combinat ? LINK_COMBINAT : LINK_INDIVIDUAL
  ctx.lineWidth = combinat ? Math.max(4, size * 0.24) : Math.max(2, size * 0.09)
  ctx.lineCap = 'round'
  if (dashed) ctx.setLineDash([5, 4])
  ctx.stroke()
  ctx.setLineDash([])
}

/** O mină pe un filon: intrarea în galerie, neagră, cu o grindă aurie deasupra. */
function drawMine(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha = 1): void {
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(x, y + size * 0.15, size * 0.38, Math.PI, 0)
  ctx.closePath()
  ctx.fillStyle = '#12161c'
  ctx.fill()
  ctx.strokeStyle = '#f5d76e'
  ctx.lineWidth = Math.max(2, size * 0.1)
  ctx.beginPath()
  ctx.moveTo(x - size * 0.48, y + size * 0.15)
  ctx.lineTo(x - size * 0.48, y - size * 0.3)
  ctx.lineTo(x + size * 0.48, y - size * 0.3)
  ctx.lineTo(x + size * 0.48, y + size * 0.15)
  ctx.stroke()
  ctx.globalAlpha = 1
}

/** Forma turnului (aceeași ca în cărțile din interfață), centrată în (0, 0), de rază `r`. */
function turretPath(ctx: CanvasRenderingContext2D, info: TowerInfo, r: number): void {
  ctx.beginPath()
  switch (info.forma) {
    case 'patrat':
      ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6)
      break
    case 'triunghi':
      ctx.moveTo(r, 0)
      ctx.lineTo(-r * 0.7, r * 0.9)
      ctx.lineTo(-r * 0.7, -r * 0.9)
      ctx.closePath()
      break
    case 'cerc':
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2)
      break
    case 'romb':
      ctx.moveTo(r, 0)
      ctx.lineTo(0, r * 0.8)
      ctx.lineTo(-r, 0)
      ctx.lineTo(0, -r * 0.8)
      ctx.closePath()
      break
  }
}

/**
 * Un turn: placa de bază (cu marginea aurie, dacă e într-un grup combinat), corpul în forma și culoarea tipului,
 * rotit spre ultima țintă, și strălucirea loviturii proaspete. Punctele aurii de dedesubt = îmbunătățirile din cărți.
 */
function drawTower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  info: TowerInfo,
  opts: { alpha?: number; combinat?: boolean; angle?: number; glow?: number; pips?: number } = {},
): void {
  const r = size * 0.62
  const alpha = opts.alpha ?? 1
  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = alpha
  // Umbra și placa.
  ctx.beginPath()
  ctx.ellipse(0, size * 0.12, r * 0.95, r * 0.6, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2)
  ctx.fillStyle = gradient(ctx, `placa|${r}`, (c) => {
    const g = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r)
    g.addColorStop(0, '#3a434f')
    g.addColorStop(1, '#1b2129')
    return g
  })
  ctx.fill()
  ctx.strokeStyle = opts.combinat ? '#f5d76e' : shade(info.culoare, -0.35)
  ctx.lineWidth = opts.combinat ? 3 : 2
  ctx.stroke()
  // Strălucirea loviturii: aceeași pată, mai mult sau mai puțin opacă.
  if (opts.glow && opts.glow > 0) {
    ctx.globalAlpha = alpha * opts.glow
    ctx.fillStyle = gradient(ctx, `stralucire|${info.culoare}|${r}`, (c) => {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 1.5)
      g.addColorStop(0, shade(info.culoare, 0.4, 0.55))
      g.addColorStop(1, shade(info.culoare, 0.4, 0))
      return g
    })
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = alpha
  }
  // Îmbunătățirile.
  const n = Math.min(6, opts.pips ?? 0)
  ctx.fillStyle = '#f5d76e'
  for (let i = 0; i < n; i++) {
    ctx.beginPath()
    ctx.arc((i - (n - 1) / 2) * size * 0.16, r * 0.95, Math.max(1.5, size * 0.06), 0, Math.PI * 2)
    ctx.fill()
  }
  // Corpul, rotit spre țintă.
  ctx.rotate(opts.angle ?? -Math.PI / 2)
  turretPath(ctx, info, r * 0.62)
  ctx.fillStyle = gradient(ctx, `turela|${info.culoare}|${r}`, (c) => {
    const g = c.createLinearGradient(-r, -r, r, r)
    g.addColorStop(0, shade(info.culoare, 0.25))
    g.addColorStop(1, shade(info.culoare, -0.2))
    return g
  })
  ctx.fill()
  ctx.strokeStyle = '#12161c'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

/** Forma inamicului după tip, centrată în (0, 0) și orientată spre direcția de mers (axa x). */
function enemyPath(ctx: CanvasRenderingContext2D, tip: Enemy['tip'], r: number): void {
  ctx.beginPath()
  switch (tip) {
    case 'rapid':
      ctx.moveTo(r * 1.2, 0)
      ctx.lineTo(-r * 0.8, r * 0.85)
      ctx.lineTo(-r * 0.4, 0)
      ctx.lineTo(-r * 0.8, -r * 0.85)
      ctx.closePath()
      break
    case 'blindat': {
      const a = r * 0.95
      ctx.roundRect(-a, -a, a * 2, a * 2, r * 0.3)
      break
    }
    default:
      ctx.arc(0, 0, r, 0, Math.PI * 2)
  }
}

// Ce ține desenul de la un cadru la altul: unde a fost văzut ultima oară fiecare inamic (ca o lovitură să se
// vadă și când ținta a murit în același tick) și încotro s-a întors fiecare turn. Doar desen.
const lastSeen = new Map<number, { x: number; y: number; at: number }>()
const angles = new Map<number, number>()
// Gradienții, creați o dată pe formă și mărime. Sunt în coordonatele locale ale formei (desenul translatează întâi),
// deci același gradient servește fiecare turn sau inamic de același fel: altfel, 120 de inamici = 120 de gradienți
// noi la fiecare cadru.
const gradients = new Map<string, CanvasGradient>()

function gradient(ctx: CanvasRenderingContext2D, k: string, make: (c: CanvasRenderingContext2D) => CanvasGradient): CanvasGradient {
  let g = gradients.get(k)
  if (!g) {
    if (gradients.size > 256) gradients.clear() // redimensionările adună chei cu mărimi vechi
    g = make(ctx)
    gradients.set(k, g)
  }
  return g
}

/** Uită ce ține desenul (la o partidă nouă: id-urile o iau de la capăt). */
export function resetRenderCaches(): void {
  lastSeen.clear()
  angles.clear()
  gradients.clear()
}

export function draw(ctx: CanvasRenderingContext2D, s: GameState, l: Layout, o: Overlay): void {
  const { width, height } = ctx.canvas.getBoundingClientRect()
  const now = o.now ?? 0
  const sz = l.size
  const shake = o.fx?.shakeOffset(now) ?? { x: 0, y: 0 }
  // Fundalul și terenul vin împreună din cache și acoperă tot ecranul; doar când ecranul tremură rămâne o margine
  // descoperită, care se umple cu culoarea fundalului.
  if (shake.x !== 0 || shake.y !== 0) {
    ctx.fillStyle = FUNDAL
    ctx.fillRect(0, 0, width, height)
  }
  ctx.save()
  ctx.translate(shake.x, shake.y)

  // Terenul.
  drawTerrain(ctx, s.map, l, width, height)
  drawTerrainAnimations(ctx, s.map, l, now)

  // Drumul: plăcile, apoi drumul propriu-zis (margine închisă, mijloc deschis), apoi săgețile care curg spre bază.
  const contacts = pathContacts(s)
  const pts = s.path.map((h) => hexToPixel(h, l))
  for (const p of pts) {
    hexPath(ctx, p.x, p.y, sz * 0.97)
    ctx.fillStyle = '#c9b48a'
    ctx.fill()
  }
  // Atingerile terenului: un inel în culoarea elementului (apă, ulei, foc) pe hexagoanele unde se întâmplă.
  s.path.forEach((_, i) => {
    const p = pts[i] as { x: number; y: number }
    ;(contacts[i] ?? []).forEach((c, j) => {
      hexPath(ctx, p.x, p.y, sz * (0.82 - j * 0.14))
      ctx.strokeStyle = c.element === 'ulei' ? 'rgba(214, 138, 40, 0.95)' : c.element === 'foc' ? 'rgba(255, 96, 48, 0.95)' : 'rgba(74, 163, 255, 0.8)'
      ctx.lineWidth = c.element === 'apa' ? 2 : 2.5
      ctx.stroke()
    })
  })
  const road = (w: number, color: string): void => {
    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.strokeStyle = color
    ctx.lineWidth = w
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  road(Math.max(4, sz * 0.5), '#8a6d45')
  road(Math.max(2, sz * 0.36), '#e3d3aa')
  // Săgețile: una la fiecare hexagon de drum, alunecând încet spre bază.
  const phase = ((now / 1400) % 1) * MILI_HEX
  ctx.strokeStyle = 'rgba(110, 84, 50, 0.55)'
  ctx.lineWidth = Math.max(1.5, sz * 0.07)
  for (let k = 0; k < s.path.length - 1; k++) {
    const pr = k * MILI_HEX + phase
    const i = Math.floor(pr / MILI_HEX)
    const a = pts[i]
    const b = pts[i + 1]
    if (!a || !b) continue
    const f = (pr % MILI_HEX) / MILI_HEX
    const x = a.x + (b.x - a.x) * f
    const y = a.y + (b.y - a.y) * f
    const ang = Math.atan2(b.y - a.y, b.x - a.x)
    const c = sz * 0.12
    ctx.beginPath()
    ctx.moveTo(x - Math.cos(ang - 0.7) * c, y - Math.sin(ang - 0.7) * c)
    ctx.lineTo(x, y)
    ctx.lineTo(x - Math.cos(ang + 0.7) * c, y - Math.sin(ang + 0.7) * c)
    ctx.stroke()
  }

  if (o.start !== undefined && o.span !== undefined) {
    // Capetele ocolului: conturul galben. Porțiunea care dispare: întunecată.
    for (const i of [o.start, o.start + o.span + 1]) {
      const p = pts[i]
      if (!p) continue
      hexPath(ctx, p.x, p.y, sz * 0.97)
      ctx.strokeStyle = '#f5d76e'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    for (let i = o.start + 1; i <= o.start + o.span; i++) {
      const p = pts[i]
      if (!p || !o.preview) continue
      hexPath(ctx, p.x, p.y, sz * 0.97)
      ctx.fillStyle = 'rgba(18, 22, 28, 0.55)'
      ctx.fill()
    }
  }

  // Ocolul propus.
  if (o.preview && o.preview.length > 0 && o.start !== undefined && o.span !== undefined) {
    const a = s.path[o.start]
    const b = s.path[o.start + o.span + 1]
    for (const h of o.preview) {
      const { x, y } = hexToPixel(h, l)
      hexPath(ctx, x, y, sz * 0.97)
      ctx.fillStyle = 'rgba(245, 215, 110, 0.5)'
      ctx.fill()
    }
    if (a && b) {
      ctx.beginPath()
      ;[a, ...o.preview, b].forEach((h, i) => {
        const { x, y } = hexToPixel(h, l)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.setLineDash([6, 5])
      ctx.lineDashOffset = -now / 40
      ctx.strokeStyle = '#f5d76e'
      ctx.lineWidth = Math.max(2, sz * 0.12)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.lineDashOffset = 0
    }
  }

  // Minele de pe filoane.
  for (const k of s.mine) {
    const { x, y } = hexToPixel(fromKey(k), l)
    drawMine(ctx, x, y, sz)
  }
  // Terraformarea sau mina de sub mouse, ca fantomă.
  if (o.terraform) {
    const { x, y } = hexToPixel(o.terraform.hex, l)
    hexPath(ctx, x, y, sz * 0.97)
    ctx.globalAlpha = o.terraform.ok ? 0.85 : 0.35
    ctx.fillStyle = TERRAIN[o.terraform.teren].culoare
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = o.terraform.ok ? '#f5d76e' : '#f0a35e'
    ctx.lineWidth = 2
    ctx.stroke()
    if (!o.terraform.ok) drawCross(ctx, x, y, sz)
  }
  if (o.mineGhost) {
    const { x, y } = hexToPixel(o.mineGhost.hex, l)
    drawMine(ctx, x, y, sz, o.mineGhost.ok ? 0.8 : 0.3)
    if (!o.mineGhost.ok) drawCross(ctx, x, y, sz)
  }

  // Raza turnului de sub mouse (sau a celui de construit, sau a grupului): hexagoanele acoperite, ușor luminate.
  if (o.range) {
    const { cercuri } = o.range
    for (const k of s.map.terrain.keys()) {
      const h = fromKey(k)
      if (!cercuri.some((c) => distance(h, c.hex) <= c.raza)) continue
      const { x, y } = hexToPixel(h, l)
      hexPath(ctx, x, y, sz * 0.97)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
      ctx.fill()
      ctx.strokeStyle = o.range.culoare
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  // Grupurile (sub turnuri): o legătură între fiecare două turnuri vecine din grup — aurie dacă grupul e combinat.
  const combinate = new Set<number>()
  for (const g of towerGroups(s.turnuri)) {
    if (g.length < 2) continue
    const combinat = isCombined(g)
    if (combinat) for (const t of g) combinate.add(t.id)
    for (const a of g) {
      for (const b of g) {
        if (a.id < b.id && distance(fromKey(a.hex), fromKey(b.hex)) === 1) drawLink(ctx, hexToPixel(fromKey(a.hex), l), hexToPixel(fromKey(b.hex), l), sz, combinat)
      }
    }
  }
  if (o.ghost) for (const link of o.ghostLinks ?? []) drawLink(ctx, hexToPixel(o.ghost.hex, l), hexToPixel(link.to, l), sz, link.combinat, true)

  // Inamicii: poziția se interpolează între centrele hexagoanelor de drum (calculată înainte de turnuri, ca turnurile
  // să se poată întoarce spre ținte).
  const alpha = o.alpha ?? 0
  const lastProgress = (s.path.length - 1) * MILI_HEX
  const pos = new Map<number, { x: number; y: number; ang: number }>()
  for (const e of s.inamici) {
    const progres = Math.min(lastProgress, e.progres + enemySpeed(e) * alpha)
    const idx = Math.floor(progres / MILI_HEX)
    const frac = (progres % MILI_HEX) / MILI_HEX
    const from = pts[idx]
    const to = pts[idx + 1] ?? from
    if (!from || !to) continue
    const p = { x: from.x + (to.x - from.x) * frac, y: from.y + (to.y - from.y) * frac, ang: Math.atan2(to.y - from.y, to.x - from.x) }
    pos.set(e.id, p)
    lastSeen.set(e.id, { x: (p.x - l.originX) / sz, y: (p.y - l.originY) / sz, at: now })
  }
  for (const [id, v] of lastSeen) if (now - v.at > 1500) lastSeen.delete(id)
  const targetPos = (id: number): { x: number; y: number } | undefined => {
    const p = pos.get(id)
    if (p) return p
    const w = lastSeen.get(id)
    return w ? { x: l.originX + w.x * sz, y: l.originY + w.y * sz } : undefined
  }

  // Turnurile, întoarse spre ultima lor țintă.
  const pips = (tip: TowerType): number => {
    const imb = s.imbunatatiri[tip]
    return imb ? Math.round(imb.dauna / 25) + Math.round(imb.reincarcare / 20) : 0
  }
  for (const t of s.turnuri) {
    const { x, y } = hexToPixel(fromKey(t.hex), l)
    const target = t.lovitura?.tinte[0] !== undefined ? targetPos(t.lovitura.tinte[0]) : undefined
    if (target) angles.set(t.id, Math.atan2(target.y - y, target.x - x))
    const age = t.lovitura ? s.tick - t.lovitura.tick + alpha : Infinity
    drawTower(ctx, x, y, sz, TOWERS[t.tip], {
      combinat: combinate.has(t.id),
      angle: angles.get(t.id),
      glow: s.faza === 'val' ? Math.max(0, 1 - age / 3) : 0,
      pips: pips(t.tip),
    })
  }
  if (o.selected) {
    const { x, y } = hexToPixel(o.selected, l)
    ctx.beginPath()
    ctx.arc(x, y, sz * 0.92, 0, Math.PI * 2)
    ctx.setLineDash([5, 4])
    ctx.lineDashOffset = -now / 60
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
  }
  if (o.ghost) {
    const { x, y } = hexToPixel(o.ghost.hex, l)
    drawTower(ctx, x, y, sz, TOWERS[o.ghost.tip], { alpha: o.ghost.ok ? 0.75 : 0.3 })
    if (!o.ghost.ok) drawCross(ctx, x, y, sz)
  }

  // Inamicii.
  for (const e of s.inamici) {
    const p = pos.get(e.id)
    if (!p) continue
    const info = ENEMIES[e.tip]
    const r = Math.max(3, sz * info.marime)
    // Umbra.
    ctx.beginPath()
    ctx.ellipse(p.x, p.y + r * 0.7, r * 0.9, r * 0.35, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fill()
    ctx.save()
    ctx.translate(p.x, p.y)
    if (e.tip === 'rapid') ctx.rotate(p.ang)
    // Roiul: o mică ceată, cu doi sateliți care se învârt.
    if (e.tip === 'roi') {
      for (let i = 0; i < 2; i++) {
        const a = now / 180 + i * Math.PI + e.id
        ctx.beginPath()
        ctx.arc(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, r * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = shade(info.culoare, -0.1)
        ctx.fill()
      }
    }
    // Bossul: o coroană de țepi care se rotește.
    if (e.tip === 'boss') {
      ctx.save()
      ctx.rotate(now / 1500)
      ctx.beginPath()
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        const rr = i % 2 ? r * 1.05 : r * 1.35
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      ctx.closePath()
      ctx.fillStyle = shade(info.culoare, -0.35)
      ctx.fill()
      ctx.restore()
    }
    // Paznicul inimii: o aură care bate ca o inimă (mai repede spre puls) și o coroană aurie dublă, în sens invers.
    if (e.tip === 'paznic') {
      const puls = info.puls?.interval ?? 80
      const faza = ((s.tick + alpha) % puls) / puls
      const bataie = Math.pow(faza, 6)
      ctx.beginPath()
      ctx.arc(0, 0, r * (1.5 + 0.35 * bataie), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 61, 110, ${0.12 + 0.3 * bataie})`
      ctx.fill()
      for (const [dir, n, rr0, rr1, col] of [
        [1, 12, 1.1, 1.45, '#f5d76e'],
        [-1, 8, 0.95, 1.2, '#a8203f'],
      ] as const) {
        ctx.save()
        ctx.rotate((dir * now) / 1800)
        ctx.beginPath()
        for (let i = 0; i < n * 2; i++) {
          const a = (i / (n * 2)) * Math.PI * 2
          const rr = i % 2 ? r * rr0 : r * rr1
          if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
          else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
        }
        ctx.closePath()
        ctx.fillStyle = col
        ctx.fill()
        ctx.restore()
      }
    }
    enemyPath(ctx, e.tip, r)
    ctx.fillStyle = gradient(ctx, `corp|${info.culoare}|${r}`, (c) => {
      const g = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.2)
      g.addColorStop(0, shade(info.culoare, 0.35))
      g.addColorStop(1, shade(info.culoare, -0.25))
      return g
    })
    ctx.fill()
    const mare = e.tip === 'boss' || e.tip === 'paznic'
    ctx.strokeStyle = mare ? '#ffffff' : 'rgba(0, 0, 0, 0.6)'
    ctx.lineWidth = mare ? 2 : 1
    ctx.stroke()
    if (e.tip === 'blindat') {
      // Plăcile armurii.
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-r * 0.95, 0)
      ctx.lineTo(r * 0.95, 0)
      ctx.moveTo(0, -r * 0.95)
      ctx.lineTo(0, r * 0.95)
      ctx.stroke()
    }
    // Clipitul albului când a fost lovit.
    const hitAt = o.flash?.get(e.id)
    if (hitAt !== undefined && now - hitAt < 140) {
      enemyPath(ctx, e.tip, r)
      ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * (1 - (now - hitAt) / 140)})`
      ctx.fill()
    }
    ctx.restore()

    // Stările, pe inamic.
    if (e.stari.inghetat !== undefined) {
      hexPath(ctx, p.x, p.y, r * 1.45)
      ctx.fillStyle = 'rgba(220, 245, 255, 0.45)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else if (e.stari.racit !== undefined) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, r + 2.5, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(191, 239, 255, 0.9)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    if (e.stari.uns !== undefined) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, r + 1, Math.PI * 0.15, Math.PI * 0.85)
      ctx.strokeStyle = 'rgba(70, 50, 25, 0.95)'
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
    if (e.stari.ud !== undefined) {
      const dx = p.x + r * 0.9
      const dy = p.y - r * 0.6
      ctx.beginPath()
      ctx.moveTo(dx, dy - r * 0.45)
      ctx.quadraticCurveTo(dx + r * 0.3, dy, dx, dy + r * 0.12)
      ctx.quadraticCurveTo(dx - r * 0.3, dy, dx, dy - r * 0.45)
      ctx.fillStyle = '#4aa3ff'
      ctx.fill()
    }
    if (e.stari.arde !== undefined) {
      for (let i = 0; i < 2; i++) {
        const fl = 0.6 + 0.4 * Math.sin(now / 90 + i * 2 + e.id)
        const fx = p.x + (i ? r * 0.35 : -r * 0.3)
        const fy = p.y - r * 0.8
        const h = r * 0.9 * fl
        ctx.beginPath()
        ctx.moveTo(fx, fy - h)
        ctx.quadraticCurveTo(fx + h * 0.45, fy - h * 0.2, fx, fy + h * 0.2)
        ctx.quadraticCurveTo(fx - h * 0.45, fy - h * 0.2, fx, fy - h)
        ctx.fillStyle = i ? 'rgba(255, 190, 70, 0.95)' : 'rgba(255, 110, 40, 0.95)'
        ctx.fill()
      }
    }
    // Trăsăturile (bossii): numele lor deasupra, ca imunitățile să se vadă pe hartă.
    if (e.trasaturi?.length) {
      ctx.font = `bold ${Math.max(9, sz * 0.38)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(18, 22, 28, 0.85)'
      const label = e.trasaturi.map((t) => TRAITS[t].nume).join(' · ')
      ctx.strokeText(label, p.x, p.y - r * 1.4 - 9)
      ctx.fillStyle = '#ffd0c8'
      ctx.fillText(label, p.x, p.y - r * 1.4 - 9)
    }
    // Bara de viață, după prima lovitură: verde, galbenă, roșie.
    const max = enemyHealth(e.tip, s.val)
    if (e.viata < max) {
      const f = Math.max(0, e.viata) / max
      const w = Math.max(16, r * 2.4)
      const top = p.y - r * (e.tip === 'boss' || e.tip === 'paznic' ? 1.5 : 1) - 7
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
      ctx.beginPath()
      ctx.roundRect(p.x - w / 2 - 1, top - 1, w + 2, 5, 2)
      ctx.fill()
      ctx.fillStyle = f > 0.5 ? '#7bd389' : f > 0.25 ? '#f5d76e' : '#f06250'
      ctx.beginPath()
      ctx.roundRect(p.x - w / 2, top, w * f, 3, 1.5)
      ctx.fill()
    }
  }

  // Loviturile proaspete, după tipul turnului: ghiulea (Fizic), flacără (Foc), fulger frânt (Fulger), val de ger
  // (Frig, pe zonă). Un grup combinat trage cu toate turnurile în aceeași țintă — și un Frig din el.
  if (s.faza === 'val') {
    for (const t of s.turnuri) {
      if (!t.lovitura) continue
      const age = s.tick - t.lovitura.tick + alpha
      if (age > 3) continue
      const info = TOWERS[t.tip]
      const from = hexToPixel(fromKey(t.hex), l)
      if (info.zona && !combinate.has(t.id)) {
        ctx.beginPath()
        ctx.arc(from.x, from.y, sz * (0.5 + (info.raza + 0.5) * 1.6 * Math.min(1, age / 2)), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(191, 239, 255, ${Math.max(0, 0.9 - age / 3)})`
        ctx.lineWidth = 3
        ctx.stroke()
        continue
      }
      for (const id of t.lovitura.tinte) {
        const to = targetPos(id)
        if (!to) continue
        const k = Math.min(1, age / 1.5)
        if (t.tip === 'fulger') {
          if (age > 1.5) continue
          ctx.beginPath()
          ctx.moveTo(from.x, from.y)
          for (let i = 1; i < 5; i++) {
            const f = i / 5
            const off = ((((t.lovitura.tick * 31 + i * 17 + id) % 7) - 3) / 3) * sz * 0.18
            const nx = -(to.y - from.y)
            const ny = to.x - from.x
            const nl = Math.hypot(nx, ny) || 1
            ctx.lineTo(from.x + (to.x - from.x) * f + (nx / nl) * off, from.y + (to.y - from.y) * f + (ny / nl) * off)
          }
          ctx.lineTo(to.x, to.y)
          ctx.globalAlpha = Math.max(0, 1 - age / 1.5)
          ctx.strokeStyle = info.culoare
          ctx.lineWidth = 3
          ctx.stroke()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.globalAlpha = 1
        } else if (t.tip === 'foc') {
          const hx = from.x + (to.x - from.x) * k
          const hy = from.y + (to.y - from.y) * k
          const gr = ctx.createLinearGradient(from.x, from.y, hx, hy)
          gr.addColorStop(0, 'rgba(255, 110, 40, 0)')
          gr.addColorStop(1, 'rgba(255, 190, 70, 0.95)')
          ctx.beginPath()
          ctx.moveTo(from.x, from.y)
          ctx.lineTo(hx, hy)
          ctx.strokeStyle = gr
          ctx.lineWidth = Math.max(2, sz * 0.14)
          ctx.lineCap = 'round'
          ctx.stroke()
        } else {
          // Ghiuleaua (și orice altă lovitură țintită): o bilă care zboară în arc.
          if (age > 1.5) continue
          const hx = from.x + (to.x - from.x) * k
          const hy = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * sz * 0.4
          ctx.beginPath()
          ctx.arc(hx, hy, Math.max(2.5, sz * 0.12), 0, Math.PI * 2)
          ctx.fillStyle = shade(info.culoare, -0.3)
          ctx.fill()
          ctx.strokeStyle = '#12161c'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
    }
  }

  // Efectele de scurtă durată.
  o.fx?.draw(ctx, l, now)

  // Capetele fixe: portalul de intrare (se rotește) și baza (un scut, cu viețile pe margine).
  const sp = hexToPixel(s.map.spawn, l)
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, sz * (0.62 - i * 0.14), 0, Math.PI * 2)
    ctx.fillStyle = ['#4a1712', '#7a2418', '#b03a2e'][i] as string
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(sp.x, sp.y, sz * 0.72, 0, Math.PI * 2)
  ctx.setLineDash([sz * 0.25, sz * 0.18])
  ctx.lineDashOffset = now / 50
  ctx.strokeStyle = 'rgba(240, 98, 80, 0.9)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineDashOffset = 0
  const bp = hexToPixel(s.map.base, l)
  ctx.beginPath()
  ctx.moveTo(bp.x, bp.y - sz * 0.62)
  ctx.lineTo(bp.x + sz * 0.52, bp.y - sz * 0.38)
  ctx.lineTo(bp.x + sz * 0.45, bp.y + sz * 0.2)
  ctx.lineTo(bp.x, bp.y + sz * 0.62)
  ctx.lineTo(bp.x - sz * 0.45, bp.y + sz * 0.2)
  ctx.lineTo(bp.x - sz * 0.52, bp.y - sz * 0.38)
  ctx.closePath()
  const sg = ctx.createLinearGradient(bp.x, bp.y - sz * 0.6, bp.x, bp.y + sz * 0.6)
  sg.addColorStop(0, '#4f8fd0')
  sg.addColorStop(1, '#22517f')
  ctx.fillStyle = sg
  ctx.fill()
  ctx.strokeStyle = '#e8e6e3'
  ctx.lineWidth = 2
  ctx.stroke()
  const lifeFrac = Math.max(0, Math.min(1, s.vieti / Math.max(VIETI_BAZA, s.vieti)))
  ctx.beginPath()
  ctx.arc(bp.x, bp.y, sz * 0.85, -Math.PI / 2, -Math.PI / 2 + lifeFrac * Math.PI * 2)
  ctx.strokeStyle = lifeFrac > 0.5 ? '#7bd389' : lifeFrac > 0.25 ? '#f5d76e' : '#f06250'
  ctx.lineWidth = 3
  ctx.stroke()

  // Reacțiile, ca text care urcă și se stinge acolo unde s-au produs.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.max(11, sz * 0.5)}px system-ui, sans-serif`
  for (const pop of o.popups ?? []) {
    const idx = Math.min(s.path.length - 1, Math.floor(pop.progres / MILI_HEX))
    const frac = (pop.progres % MILI_HEX) / MILI_HEX
    const a = pts[idx]
    const b = pts[idx + 1] ?? a
    if (!a || !b) continue
    const x = a.x + (b.x - a.x) * frac
    const y = a.y + (b.y - a.y) * frac - sz * (0.6 + pop.varsta)
    ctx.globalAlpha = Math.max(0, 1 - pop.varsta)
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(18, 22, 28, 0.85)'
    ctx.strokeText(pop.text, x, y)
    ctx.fillStyle = pop.culoare
    ctx.fillText(pop.text, x, y)
    ctx.globalAlpha = 1
  }
  ctx.restore()

  // Baza lovită: marginea ecranului se înroșește scurt (în afara scuturării, ca să acopere tot ecranul).
  const hit = now - (o.fx?.baseHitAt ?? -Infinity)
  if (hit < 500) {
    const v = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.75)
    v.addColorStop(0, 'rgba(240, 98, 80, 0)')
    v.addColorStop(1, `rgba(240, 98, 80, ${0.35 * (1 - hit / 500)})`)
    ctx.fillStyle = v
    ctx.fillRect(0, 0, width, height)
  }
}
