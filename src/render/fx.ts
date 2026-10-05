// Efectele vizuale de scurtă durată: particule, fulgere, texte care urcă, scuturarea ecranului.
//
// Doar desen: simularea nu știe de ele, iar aleatorul de aici (Math.random) nu atinge starea jocului — de aceea
// fișierul stă în `render/`, nu în `sim/`. Pozițiile sunt în UNITĂȚI DE HEXAGON față de centrul hărții, ca un efect
// pornit înainte de o redimensionare a ferestrei să rămână la locul lui.

import type { Layout } from './canvas'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  /** Accelerația verticală (gravitație pozitivă, plutire negativă), în hexagoane pe secundă la pătrat. */
  g: number
  born: number
  life: number
  size: number
  color: string
  kind: 'punct' | 'aschie' | 'fum' | 'inel' | 'text'
  text?: string
  angle: number
  spin: number
}

interface Bolt {
  pts: { x: number; y: number }[]
  born: number
  life: number
  color: string
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a)

/** Din pixeli (în aranjamentul curent) în unități de hexagon față de centrul hărții. */
export const toWorld = (p: { x: number; y: number }, l: Layout): { x: number; y: number } => ({ x: (p.x - l.originX) / l.size, y: (p.y - l.originY) / l.size })

export class Fx {
  private particles: Particle[] = []
  private bolts: Bolt[] = []
  private shakeUntil = 0
  private shakeMag = 0
  /** Când a fost lovită ultima oară baza: marginea ecranului se înroșește scurt. */
  baseHitAt = -Infinity

  clear(): void {
    this.particles = []
    this.bolts = []
    this.shakeUntil = 0
    this.baseHitAt = -Infinity
  }

  /** Câte efecte trăiesc acum (pentru verificări). */
  get count(): number {
    return this.particles.length + this.bolts.length
  }

  private burst(w: { x: number; y: number }, now: number, n: number, opts: Partial<Particle> & { speed: [number, number] }): void {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2)
      const v = rnd(opts.speed[0], opts.speed[1])
      this.particles.push({
        x: w.x,
        y: w.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: opts.g ?? 0,
        born: now,
        life: (opts.life ?? 600) * rnd(0.7, 1.2),
        size: (opts.size ?? 0.08) * rnd(0.7, 1.3),
        color: opts.color ?? '#ffffff',
        kind: opts.kind ?? 'punct',
        angle: rnd(0, Math.PI * 2),
        spin: rnd(-8, 8),
      })
    }
  }

  shake(mag: number, ms: number, now: number): void {
    if (now + ms > this.shakeUntil) this.shakeUntil = now + ms
    this.shakeMag = Math.max(this.shakeMag * (this.shakeUntil > now ? 1 : 0), mag)
  }

  /** Decalajul ecranului acum, în pixeli (0 când nu tremură). */
  shakeOffset(now: number): { x: number; y: number } {
    if (now >= this.shakeUntil) {
      this.shakeMag = 0
      return { x: 0, y: 0 }
    }
    const m = this.shakeMag * Math.min(1, (this.shakeUntil - now) / 200)
    return { x: rnd(-m, m), y: rnd(-m, m) }
  }

  explozie(w: { x: number; y: number }, now: number): void {
    this.burst(w, now, 18, { speed: [1.2, 3.2], color: '#ffb347', size: 0.11, life: 520, kind: 'punct' })
    this.burst(w, now, 8, { speed: [0.4, 1.2], color: '#fff1c4', size: 0.07, life: 380 })
    this.burst(w, now, 6, { speed: [0.2, 0.6], color: 'rgba(60, 50, 45, 0.6)', size: 0.25, life: 900, kind: 'fum', g: -0.6 })
    this.particles.push({ x: w.x, y: w.y, vx: 0, vy: 0, g: 0, born: now, life: 420, size: 1.1, color: '#ffb347', kind: 'inel', angle: 0, spin: 0 })
    this.shake(5, 260, now)
  }

  abur(w: { x: number; y: number }, now: number): void {
    this.burst(w, now, 7, { speed: [0.1, 0.5], color: 'rgba(225, 232, 238, 0.7)', size: 0.22, life: 900, kind: 'fum', g: -0.9 })
  }

  dezghet(w: { x: number; y: number }, now: number): void {
    this.burst(w, now, 6, { speed: [0.3, 0.9], color: '#ffd1a8', size: 0.07, life: 450 })
    this.burst(w, now, 3, { speed: [0.1, 0.3], color: 'rgba(225, 232, 238, 0.6)', size: 0.18, life: 700, kind: 'fum', g: -0.7 })
  }

  inghet(w: { x: number; y: number }, now: number): void {
    this.burst(w, now, 10, { speed: [0.6, 1.6], color: '#d9f6ff', size: 0.1, life: 550, kind: 'aschie' })
  }

  spargere(w: { x: number; y: number }, now: number): void {
    this.burst(w, now, 14, { speed: [1.5, 3.4], color: '#ffffff', size: 0.12, life: 480, kind: 'aschie', g: 2 })
    this.particles.push({ x: w.x, y: w.y, vx: 0, vy: 0, g: 0, born: now, life: 300, size: 0.8, color: '#9fe7ff', kind: 'inel', angle: 0, spin: 0 })
    this.shake(2, 120, now)
  }

  /** Un fulger frânt între două puncte (lanțul electrocutării). */
  fulger(a: { x: number; y: number }, b: { x: number; y: number }, now: number, color = '#d8c2ff'): void {
    const pts = [a]
    const n = 5
    for (let i = 1; i < n; i++) {
      const t = i / n
      pts.push({ x: a.x + (b.x - a.x) * t + rnd(-0.15, 0.15), y: a.y + (b.y - a.y) * t + rnd(-0.15, 0.15) })
    }
    pts.push(b)
    this.bolts.push({ pts, born: now, life: 220, color })
  }

  /** Un inamic ucis: o explozie mică în culoarea lui și aurul primit, care urcă. */
  moarte(w: { x: number; y: number }, color: string, aur: number, now: number): void {
    this.burst(w, now, 9, { speed: [0.6, 1.8], color, size: 0.08, life: 420, g: 1.5 })
    if (aur > 0) this.particles.push({ x: w.x, y: w.y - 0.3, vx: 0, vy: -0.8, g: 0, born: now, life: 800, size: 0.42, color: '#f5d76e', kind: 'text', text: `+${aur}`, angle: 0, spin: 0 })
  }

  /** Praful unei construcții sau al unei terraformări. */
  praf(w: { x: number; y: number }, now: number, color = 'rgba(210, 190, 150, 0.7)'): void {
    this.burst(w, now, 10, { speed: [0.4, 1.1], color, size: 0.16, life: 520, kind: 'fum', g: -0.3 })
  }

  /** Pulsul Paznicului inimii: un inel roșu-aprins care se lărgește și o scuturare scurtă. */
  puls(w: { x: number; y: number }, now: number): void {
    this.particles.push({ x: w.x, y: w.y, vx: 0, vy: 0, g: 0, born: now, life: 650, size: 2.2, color: '#ff3d6e', kind: 'inel', angle: 0, spin: 0 })
    this.burst(w, now, 10, { speed: [0.6, 1.6], color: '#ff8fab', size: 0.08, life: 500 })
    this.shake(2, 160, now)
  }

  /** Baza lovită: inel roșu, scuturare, margine roșie. */
  baza(w: { x: number; y: number }, now: number): void {
    this.particles.push({ x: w.x, y: w.y, vx: 0, vy: 0, g: 0, born: now, life: 450, size: 1.0, color: '#f06250', kind: 'inel', angle: 0, spin: 0 })
    this.shake(4, 200, now)
    this.baseHitAt = now
  }

  draw(ctx: CanvasRenderingContext2D, l: Layout, now: number): void {
    this.particles = this.particles.filter((p) => now - p.born < p.life)
    this.bolts = this.bolts.filter((b) => now - b.born < b.life)
    const sx = (x: number): number => l.originX + x * l.size
    const sy = (y: number): number => l.originY + y * l.size
    for (const p of this.particles) {
      const t = (now - p.born) / 1000
      const k = (now - p.born) / p.life
      const x = sx(p.x + p.vx * t * (1 - k * 0.5))
      const y = sy(p.y + p.vy * t * (1 - k * 0.5) + 0.5 * p.g * t * t)
      const a = Math.max(0, 1 - k)
      ctx.globalAlpha = a
      switch (p.kind) {
        case 'punct':
          ctx.beginPath()
          ctx.arc(x, y, Math.max(1, p.size * l.size * (1 - k * 0.5)), 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.fill()
          break
        case 'fum':
          ctx.beginPath()
          ctx.arc(x, y, Math.max(2, p.size * l.size * (0.6 + k)), 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.fill()
          break
        case 'aschie': {
          const r = Math.max(2, p.size * l.size)
          const ang = p.angle + p.spin * t
          ctx.beginPath()
          ctx.moveTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r)
          ctx.lineTo(x + Math.cos(ang + 2.6) * r * 0.5, y + Math.sin(ang + 2.6) * r * 0.5)
          ctx.lineTo(x + Math.cos(ang - 2.6) * r * 0.5, y + Math.sin(ang - 2.6) * r * 0.5)
          ctx.closePath()
          ctx.fillStyle = p.color
          ctx.fill()
          break
        }
        case 'inel':
          ctx.beginPath()
          ctx.arc(x, y, Math.max(2, p.size * l.size * (0.3 + k)), 0, Math.PI * 2)
          ctx.strokeStyle = p.color
          ctx.lineWidth = Math.max(1, 4 * (1 - k))
          ctx.stroke()
          break
        case 'text':
          ctx.font = `bold ${Math.max(10, p.size * l.size)}px system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.lineWidth = 3
          ctx.strokeStyle = 'rgba(18, 22, 28, 0.8)'
          ctx.strokeText(p.text ?? '', x, y)
          ctx.fillStyle = p.color
          ctx.fillText(p.text ?? '', x, y)
          break
      }
    }
    for (const b of this.bolts) {
      const k = (now - b.born) / b.life
      ctx.globalAlpha = Math.max(0, 1 - k)
      ctx.beginPath()
      b.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(sx(p.x), sy(p.y)) : ctx.lineTo(sx(p.x), sy(p.y))))
      ctx.strokeStyle = b.color
      ctx.lineWidth = 3
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
}
