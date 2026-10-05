// Ecranul planetei (GDD §9.1): regiunile, care sunt salvate și care se pot juca, ceasul lumii, și — pentru regiunea
// aleasă — o hartă mică a terenului ei, cu hexagoanele pe care le-ai schimbat în partidele de dinainte.
//
// Ca restul interfeței, nu citește lumea: primește o vedere gata calculată (`PlanetView`) și trimite înapoi acțiuni.

import type { GameMap } from '../sim/map'
import { fitLayout, hexPath, hexToPixel } from '../render/canvas'
import { drawTerrain } from '../render/terrain'
import './planeta.css'

export type Acces = 'salvata' | 'accesibila' | 'blocata'
export type Sigiliu = 'bronz' | 'argint' | 'aur'

/** Alegerea modificatorilor de dificultate pentru regiunea aleasă (GDD §9.2), gata de arătat. */
export interface ThreatView {
  readonly total: number
  /** Ce aduce o partidă câștigată cu alegerea asta. */
  readonly rezumat: string
  /** Cea mai mare amenințare câștigată aici, cu sigiliul ei, dacă e vreuna. */
  readonly record?: string
  readonly presetari: readonly { readonly nume: string; readonly activ: boolean; readonly amenintare: number }[]
  readonly modificatori: readonly {
    readonly id: string
    readonly nume: string
    /** Treapta aleasă; 0 = neales. */
    readonly treapta: number
    readonly trepte: readonly { readonly amenintare: number; readonly descriere: string }[]
    /** De ce nu se poate alege aici, dacă nu se poate. */
    readonly motiv?: string
  }[]
}

export interface PlanetView {
  readonly titlu: string
  /** „ceasul lumii: 1 h 12 min jucate · 2 din 7 regiuni salvate” */
  readonly subtitlu: string
  /** Planeta e salvată: i-ai salvat inima. */
  readonly salvata: boolean
  readonly regiuni: readonly {
    readonly cheie: string
    readonly nume: string
    readonly q: number
    readonly r: number
    readonly acces: Acces
    readonly inima: boolean
    readonly aleasa: boolean
    /** Sigiliul câștigat cu modificatori (cel mai înalt prag atins). */
    readonly sigiliu?: Sigiliu
  }[]
  readonly aleasa?: {
    readonly cheie: string
    readonly nume: string
    readonly stare: string
    readonly randuri: readonly string[]
    /** De ce nu se poate juca, dacă nu se poate. */
    readonly motiv?: string
    readonly harta: GameMap
    /** Hexagoanele schimbate de partidele de dinainte. */
    readonly editate: readonly string[]
    /** Modificatorii, doar pe o regiune salvată (la revenire). */
    readonly amenintare?: ThreatView
  }
}

export interface PlanetActions {
  alege(cheie: string): void
  joaca(): void
  planetaNoua(): void
  /** Treapta modificatorului `id` (0 = scos). */
  modificator(id: string, treapta: number): void
  /** O presetare (I, II, III) sau „fără”. */
  presetare(nume: string): void
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

/** Colțurile unui hexagon „cu vârful în sus”, pentru SVG. */
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30)
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

export interface PlanetScreen {
  show(v: PlanetView): void
  hide(): void
  readonly visible: boolean
}

export function createPlanetScreen(actions: PlanetActions): PlanetScreen {
  const root = document.createElement('div')
  root.className = 'planeta'
  document.body.append(root)
  root.innerHTML =
    `<header class="planeta-cap"><h1></h1><p class="sub"></p></header>` +
    `<div class="planeta-corp"><svg class="harta-planetei" viewBox="-170 -150 340 300" role="img" aria-label="Regiunile planetei"></svg>` +
    `<aside class="regiune-card"><div class="stanga"><h2></h2><p class="stare"></p><canvas class="mini"></canvas><ul class="randuri"></ul><p class="motiv"></p>` +
    `<button class="btn primar joaca">▶ Apără regiunea <kbd>Enter</kbd></button></div><section class="amenintare"></section></aside></div>` +
    `<footer class="planeta-jos"><span class="indiciu">Click pe o regiune ca s-o vezi. Ce faci terenului rămâne: canalele, dealurile, pădurile arse.</span>` +
    `<button class="btn noua">Planetă nouă</button></footer>`
  const $ = <T extends Element>(sel: string): T => root.querySelector(sel) as T
  const svg = $<SVGSVGElement>('.harta-planetei')
  const mini = $<HTMLCanvasElement>('.mini')
  const joaca = $<HTMLButtonElement>('.joaca')
  svg.addEventListener('click', (e) => {
    const g = (e.target as Element).closest('[data-cheie]')
    const k = g?.getAttribute('data-cheie')
    if (k) actions.alege(k)
  })
  joaca.addEventListener('click', () => actions.joaca())
  const amenintare = $<HTMLElement>('.amenintare')
  amenintare.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button')
    if (!b || b.disabled) return
    const preset = b.getAttribute('data-preset')
    if (preset !== null) actions.presetare(preset)
    const mod = b.getAttribute('data-mod')
    if (mod !== null) actions.modificator(mod, Number(b.getAttribute('data-treapta')))
  })
  $<HTMLButtonElement>('.noua').addEventListener('click', () => actions.planetaNoua())

  let lastSvg = ''
  let lastAmenintare = ''

  const threatHtml = (a: ThreatView): string =>
    `<h3>Amenințare <span class="total">${a.total}</span></h3>` +
    `<div class="presetari">${a.presetari
      .map((p) => `<button class="btn mic${p.activ ? ' activ' : ''}" data-preset="${esc(p.nume)}" title="Amenințare ${p.amenintare}">${esc(p.nume)}</button>`)
      .join('')}</div>` +
    `<ul class="modificatori">${a.modificatori
      .map((m) => {
        const titlu = m.motiv ?? (m.treapta > 0 ? (m.trepte[m.treapta - 1]?.descriere ?? '') : 'neales')
        const trepte = [0, ...m.trepte.map((_, i) => i + 1)]
          .map((t) => {
            const info = t > 0 ? m.trepte[t - 1] : undefined
            const tt = info ? `${info.descriere} (+${info.amenintare})` : 'fără'
            return `<button class="treapta${t === m.treapta ? ' activ' : ''}" data-mod="${m.id}" data-treapta="${t}" title="${esc(tt)}"${m.motiv && t > 0 ? ' disabled' : ''}>${t === 0 ? '–' : t}</button>`
          })
          .join('')
        return `<li class="${m.treapta > 0 ? 'ales' : ''}${m.motiv ? ' indisponibil' : ''}" title="${esc(titlu)}"><span class="nume">${esc(m.nume)}</span><span class="trepte">${trepte}</span></li>`
      })
      .join('')}</ul>` +
    `<ul class="efecte">${a.modificatori
      .filter((m) => m.treapta > 0)
      .map((m) => `<li><b>${esc(m.nume)}:</b> ${esc(m.trepte[m.treapta - 1]?.descriere ?? '')}</li>`)
      .join('')}</ul>` +
    `<p class="rezumat">${esc(a.rezumat)}</p>` +
    (a.record ? `<p class="record">${esc(a.record)}</p>` : '')
  let lastMini: GameMap | undefined
  let lastEditate = ''

  const drawMini = (harta: GameMap, editate: readonly string[]): void => {
    const w = 260
    const h = 230
    const dpr = window.devicePixelRatio || 1
    mini.width = w * dpr
    mini.height = h * dpr
    mini.style.width = `${w}px`
    mini.style.height = `${h}px`
    const ctx = mini.getContext('2d') as CanvasRenderingContext2D
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const l = fitLayout(harta.radius, { x: 0, y: 0, w, h })
    drawTerrain(ctx, harta, l, w, h)
    for (const k of editate) {
      const [q, r] = k.split(',').map(Number) as [number, number]
      const p = hexToPixel({ q, r }, l)
      hexPath(ctx, p.x, p.y, l.size * 0.92)
      ctx.strokeStyle = '#f5d76e'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  return {
    get visible() {
      return root.classList.contains('vizibil')
    },
    hide() {
      root.classList.remove('vizibil')
    },
    show(v) {
      root.classList.add('vizibil')
      $<HTMLElement>('h1').textContent = v.titlu
      $<HTMLElement>('.sub').textContent = v.subtitlu
      root.classList.toggle('salvata', v.salvata)
      const R = 52
      const html = v.regiuni
        .map((g) => {
          const cx = R * Math.sqrt(3) * (g.q + g.r / 2)
          const cy = R * 1.5 * g.r
          const cls = `regiune ${g.acces}${g.inima ? ' inima' : ''}${g.aleasa ? ' aleasa' : ''}`
          const eticheta = g.inima ? 'Inima' : g.nume.replace('Ținutul de ', '')
          const semn = g.acces === 'salvata' ? '✓' : g.acces === 'blocata' ? '🔒' : g.inima ? '♥' : '▶'
          const sigiliu = g.sigiliu ? `<circle class="sigiliu ${g.sigiliu}" cx="${cx.toFixed(1)}" cy="${(cy - 30).toFixed(1)}" r="7"><title>Sigiliul de ${g.sigiliu}</title></circle>` : ''
          return (
            `<g class="${cls}" data-cheie="${g.cheie}"><polygon points="${hexPoints(cx, cy, R * 0.95)}"/>${sigiliu}` +
            `<text x="${cx.toFixed(1)}" y="${(cy - 4).toFixed(1)}" class="semn">${semn}</text>` +
            `<text x="${cx.toFixed(1)}" y="${(cy + 16).toFixed(1)}" class="eticheta">${esc(eticheta)}</text></g>`
          )
        })
        .join('')
      if (html !== lastSvg) {
        svg.innerHTML = html
        lastSvg = html
      }
      const a = v.aleasa
      const card = $<HTMLElement>('.regiune-card')
      card.classList.toggle('gol', !a)
      if (!a) return
      $<HTMLElement>('.regiune-card h2').textContent = a.nume
      $<HTMLElement>('.stare').textContent = a.stare
      $<HTMLElement>('.randuri').innerHTML = a.randuri.map((x) => `<li>${esc(x)}</li>`).join('')
      const am = a.amenintare ? threatHtml(a.amenintare) : ''
      if (am !== lastAmenintare) {
        amenintare.innerHTML = am
        lastAmenintare = am
      }
      amenintare.hidden = !a.amenintare
      $<HTMLElement>('.motiv').textContent = a.motiv ?? ''
      joaca.disabled = a.motiv !== undefined
      const ed = a.editate.join(';')
      if (a.harta !== lastMini || ed !== lastEditate) {
        drawMini(a.harta, a.editate)
        lastMini = a.harta
        lastEditate = ed
      }
    },
  }
}
