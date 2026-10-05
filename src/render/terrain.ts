// Terenul desenat: plăcile hexagonale cu decorul lor (iarbă, copaci, curbe de nivel, cristale) și animațiile apei,
// uleiului și jarului.
//
// Partea statică — fundalul și plăcile — se desenează o dată, într-un canvas ascuns, și se refolosește cât timp harta
// și aranjamentul rămân aceleași: terraformarea face o hartă nouă, deci cache-ul se reface singur. Fundalul stă tot
// acolo fiindcă un gradient pe tot ecranul, redesenat la fiecare cadru, era cea mai scumpă operație a desenului
// (DEVLOG, felia 7). Decorul fiecărui hexagon vine dintr-un
// hash al cheii lui, deci aceeași hartă arată mereu la fel — fără aleator.

import { TERRAIN, type Terrain } from '../data/terrain'
import type { GameMap } from '../sim/map'
import { hexPath, hexToPixel, type Layout } from './canvas'

/** Un număr în [0, 1) din cheia hexagonului și un indice (FNV-1a). */
export function hash01(k: string, i = 0): number {
  let h = 0x811c9dc5 ^ i
  for (let j = 0; j < k.length; j++) {
    h ^= k.charCodeAt(j)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

const shades = new Map<string, string>()

/** Culoarea `hex` (#rrggbb) luminată (amt > 0) sau întunecată (amt < 0), ca rgba. Ține minte ce a calculat. */
export function shade(hex: string, amt: number, alpha = 1): string {
  const k = `${hex}|${amt}|${alpha}`
  let c = shades.get(k)
  if (c === undefined) {
    const n = parseInt(hex.slice(1), 16)
    const f = (v: number): number => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))
    c = `rgba(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)}, ${alpha})`
    if (shades.size > 512) shades.clear()
    shades.set(k, c)
  }
  return c
}

function tile(ctx: CanvasRenderingContext2D, k: string, t: Terrain, l: Layout): void {
  const [q, r] = k.split(',').map(Number) as [number, number]
  const { x, y } = hexToPixel({ q, r }, l)
  const s = l.size
  const base = TERRAIN[t].culoare
  hexPath(ctx, x, y, s * 0.97)
  // Lumina vine de sus: puțin mai deschis sus, mai închis jos.
  const g = ctx.createLinearGradient(x, y - s, x, y + s)
  g.addColorStop(0, shade(base, 0.1))
  g.addColorStop(1, shade(base, -0.12))
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = shade(base, -0.35, 0.55)
  ctx.lineWidth = 1
  ctx.stroke()
  const at = (i: number): { x: number; y: number } => ({ x: x + (hash01(k, i) - 0.5) * s * 0.95, y: y + (hash01(k, i + 50) - 0.5) * s * 0.85 })
  switch (t) {
    case 'campie':
      // Smocuri de iarbă.
      ctx.strokeStyle = shade(base, 0.28, 0.7)
      ctx.lineWidth = Math.max(1, s * 0.05)
      for (let i = 0; i < 3; i++) {
        const p = at(i)
        const h = s * 0.12
        ctx.beginPath()
        ctx.moveTo(p.x - h * 0.6, p.y - h)
        ctx.lineTo(p.x, p.y)
        ctx.lineTo(p.x + h * 0.6, p.y - h)
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x, p.y - h * 1.2)
        ctx.stroke()
      }
      break
    case 'padure':
      // Copaci: triunghiuri închise, cu marginea luminată, de la spate spre față.
      for (const i of [0, 1, 2].sort((a, b) => at(a).y - at(b).y)) {
        const p = at(i)
        const h = s * (0.32 + hash01(k, i + 9) * 0.12)
        ctx.beginPath()
        ctx.moveTo(p.x, p.y - h)
        ctx.lineTo(p.x + h * 0.55, p.y + h * 0.35)
        ctx.lineTo(p.x - h * 0.55, p.y + h * 0.35)
        ctx.closePath()
        ctx.fillStyle = shade(base, -0.35)
        ctx.fill()
        ctx.strokeStyle = shade(base, 0.25, 0.8)
        ctx.lineWidth = 1
        ctx.stroke()
      }
      break
    case 'deal': {
      // Curbe de nivel.
      ctx.strokeStyle = shade(base, 0.3, 0.55)
      ctx.lineWidth = Math.max(1, s * 0.05)
      for (const rr of [0.55, 0.33]) {
        ctx.beginPath()
        ctx.ellipse(x, y + s * 0.12, s * rr, s * rr * 0.55, 0, Math.PI * 1.05, Math.PI * 1.95)
        ctx.stroke()
      }
      break
    }
    case 'filon':
      // Cristale.
      for (let i = 0; i < 3; i++) {
        const p = at(i)
        const h = s * (0.16 + hash01(k, i + 20) * 0.1)
        ctx.beginPath()
        ctx.moveTo(p.x, p.y - h)
        ctx.lineTo(p.x + h * 0.45, p.y)
        ctx.lineTo(p.x, p.y + h * 0.6)
        ctx.lineTo(p.x - h * 0.45, p.y)
        ctx.closePath()
        ctx.fillStyle = shade(base, 0.45)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
      break
    case 'ulei':
      ctx.beginPath()
      ctx.ellipse(x - s * 0.15, y - s * 0.1, s * 0.42, s * 0.2, -0.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(170, 130, 255, 0.2)'
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x + s * 0.2, y + s * 0.18, s * 0.25, s * 0.1, -0.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(120, 220, 170, 0.16)'
      ctx.fill()
      break
    case 'apa':
    case 'jar':
      break // animate, în `drawTerrainAnimations`
  }
}

const cache = new WeakMap<GameMap, { key: string; canvas: HTMLCanvasElement }>()

/** Culoarea fundalului la margini (și sub ecranul care tremură). */
export const FUNDAL = '#0d1014'

/** Desenează fundalul și terenul static (din cache, dacă harta și aranjamentul n-au schimbat). Acoperă tot ecranul. */
export function drawTerrain(ctx: CanvasRenderingContext2D, map: GameMap, l: Layout, w: number, h: number): void {
  const dpr = window.devicePixelRatio || 1
  const key = `${l.size}|${l.originX}|${l.originY}|${w}|${h}|${dpr}`
  let c = cache.get(map)
  if (!c || c.key !== key) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    const tctx = canvas.getContext('2d') as CanvasRenderingContext2D
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // Fundalul: întunecat, cu o lumină slabă în centrul hărții.
    const bg = tctx.createRadialGradient(l.originX, l.originY, l.size * 2, l.originX, l.originY, Math.max(w, h) * 0.7)
    bg.addColorStop(0, '#1b222b')
    bg.addColorStop(1, FUNDAL)
    tctx.fillStyle = bg
    tctx.fillRect(0, 0, w, h)
    for (const [k, t] of map.terrain) tile(tctx, k, t, l)
    c = { key, canvas }
    cache.set(map, c)
  }
  ctx.drawImage(c.canvas, 0, 0, w, h)
}

/** Ce se mișcă pe teren: valurile apei, luciul uleiului, flăcările jarului. */
export function drawTerrainAnimations(ctx: CanvasRenderingContext2D, map: GameMap, l: Layout, now: number): void {
  const s = l.size
  for (const [k, t] of map.terrain) {
    if (t !== 'apa' && t !== 'jar' && t !== 'ulei') continue
    const [q, r] = k.split(',').map(Number) as [number, number]
    const { x, y } = hexToPixel({ q, r }, l)
    const ph = hash01(k, 7) * Math.PI * 2
    if (t === 'apa') {
      ctx.strokeStyle = 'rgba(200, 228, 255, 0.28)'
      ctx.lineWidth = Math.max(1, s * 0.05)
      for (const [dy, off] of [[-0.18, 0], [0.2, 1.7]] as const) {
        const shift = Math.sin(now / 900 + ph + off) * s * 0.12
        ctx.beginPath()
        for (let i = 0; i <= 8; i++) {
          const px = x - s * 0.42 + (i / 8) * s * 0.84 + shift
          const py = y + dy * s + Math.sin(i * 1.4 + now / 500 + ph) * s * 0.04
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
    } else if (t === 'ulei') {
      const a = 0.08 + 0.06 * Math.sin(now / 1300 + ph)
      ctx.beginPath()
      ctx.ellipse(x + Math.sin(now / 1700 + ph) * s * 0.1, y, s * 0.3, s * 0.12, -0.4, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(200, 170, 255, ${a})`
      ctx.fill()
    } else {
      // Jarul: flăcări care pâlpâie.
      for (let i = 0; i < 4; i++) {
        const fx = x + (hash01(k, i) - 0.5) * s * 0.8
        const fy = y + (hash01(k, i + 30) - 0.3) * s * 0.6
        const fl = 0.6 + 0.4 * Math.sin(now / 110 + i * 2.1 + ph)
        const h = s * 0.3 * fl
        ctx.beginPath()
        ctx.moveTo(fx, fy - h)
        ctx.quadraticCurveTo(fx + h * 0.45, fy - h * 0.2, fx, fy + h * 0.15)
        ctx.quadraticCurveTo(fx - h * 0.45, fy - h * 0.2, fx, fy - h)
        ctx.fillStyle = i % 2 ? 'rgba(255, 180, 60, 0.9)' : 'rgba(255, 110, 40, 0.85)'
        ctx.fill()
      }
    }
  }
}
