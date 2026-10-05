// Interfața HTML peste hartă: bara de sus (stare + comenzi), bara de jos (turnurile și ocolul), panoul din
// dreapta (valul următor, ce e sub mouse, codexul reacțiilor), notificări și ecranul de final.
//
// Nu citește starea jocului: primește o vedere gata calculată (`HudView`) de la main.ts și trimite înapoi
// acțiuni (`HudActions`). Totul se poate face și cu mouse-ul, nu doar din taste. Fiecare secțiune se rescrie
// doar când i se schimbă conținutul, ca bucla de desen să nu reconstruiască DOM-ul la fiecare cadru.

import type { TowerShape, TowerType } from '../data/towers'
import './hud.css'

export interface HudActions {
  startWave(): void
  togglePause(): void
  cycleSpeed(): void
  undo(): void
  restart(): void
  newMap(): void
  selectTower(tip: TowerType): void
  setExtra(extra: number): void
  nextVariant(): void
  /** Un buton din panoul unui turn: ținta, comutarea grupului, sau renunțarea la alegere. */
  towerAction(a: TowerAction, id?: number): void
}

export type TowerAction = 'tinta' | 'combina' | 'deselecteaza'

export interface Row {
  readonly k: string
  readonly v: string
  /** `up` = mai bine (verde), `down` = mai rău (roșu). */
  readonly ton?: 'up' | 'down'
}

export interface HudView {
  readonly val: string
  readonly boss: boolean
  readonly vieti: number
  readonly vietiMax: number
  readonly aur: number
  readonly drum: number
  readonly fazaText: string
  readonly faza: 'pregatire' | 'val' | 'castigat' | 'pierdut'
  readonly start: { readonly ok: boolean; readonly motiv?: string }
  readonly paused: boolean
  readonly speed: number
  readonly canUndo: boolean
  readonly towers: readonly {
    readonly tip: TowerType
    readonly nume: string
    readonly cost: number
    readonly culoare: string
    readonly forma: TowerShape
    readonly tasta: string
    readonly ales: boolean
    readonly accesibil: boolean
  }[]
  readonly ocol: { readonly stare: string; readonly extra: number; readonly variante: string; readonly activ: boolean }
  readonly wave: { readonly titlu: string; readonly randuri: readonly { readonly nume: string; readonly culoare: string; readonly numar: number; readonly boss: boolean }[]; readonly nota: string }
  readonly context: {
    readonly titlu: string
    readonly randuri: readonly Row[]
    readonly nota?: string
    readonly ton?: 'ok' | 'bad'
    /** Butoanele turnului arătat; `motiv` = de ce nu se poate (butonul apare dezactivat, cu motivul în titlu). */
    readonly butoane?: readonly { readonly act: TowerAction; readonly id: number; readonly text: string; readonly tasta: string; readonly activ?: boolean; readonly motiv?: string }[]
  }
  readonly codex: readonly { readonly nume: string; readonly reteta: string; readonly efect: string; readonly numar: number; readonly culoare: string }[]
  readonly debug: string
  readonly final?: { readonly titlu: string; readonly text: string; readonly castigat: boolean }
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

/** Iconița turnului: aceeași formă ca pe hartă. */
export function towerIcon(forma: TowerShape, culoare: string, size = 22): string {
  const shape = {
    patrat: '<rect x="5" y="5" width="14" height="14" />',
    triunghi: '<polygon points="12,3 21,20 3,20" />',
    cerc: '<circle cx="12" cy="12" r="8.5" />',
    romb: '<polygon points="12,2 21,12 12,22 3,12" />',
  }[forma]
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><g fill="${culoare}" stroke="#12161c" stroke-width="1.6">${shape}</g></svg>`
}

function el(tag: string, cls: string, parent: HTMLElement): HTMLElement {
  const e = document.createElement(tag)
  e.className = cls
  parent.append(e)
  return e
}

/** Un element care se rescrie doar când i se schimbă HTML-ul. */
function slot(e: HTMLElement): (html: string) => void {
  let last = ''
  return (html) => {
    if (html !== last) {
      e.innerHTML = html
      last = html
    }
  }
}

export interface Hud {
  /** Zona rămasă pentru hartă, în pixeli CSS. */
  mapArea(): { x: number; y: number; w: number; h: number }
  update(v: HudView): void
  toast(text: string): void
  announce(text: string): void
}

export function createHud(actions: HudActions): Hud {
  const root = el('div', 'hud', document.body)

  // Bara de sus.
  const top = el('header', 'bar sus', root)
  const stats = slot(el('div', 'stats', top))
  const controls = el('div', 'controls', top)
  const btn = (label: string, title: string, fn: () => void, cls = ''): HTMLButtonElement => {
    const b = document.createElement('button')
    b.className = `btn ${cls}`
    b.innerHTML = label
    b.title = title
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      fn()
    })
    controls.append(b)
    return b
  }
  const startBtn = btn('▶ Pornește valul <kbd>Spațiu</kbd>', '', actions.startWave, 'primar')
  const pauseBtn = btn('⏸ <kbd>P</kbd>', 'Pauză', actions.togglePause)
  const speedBtn = btn('1× <kbd>F</kbd>', 'Viteza jocului', actions.cycleSpeed)
  const undoBtn = btn('↶ <kbd>Z</kbd>', 'Anulează ultima decizie din pregătirea asta', actions.undo)
  btn('⟳ <kbd>R</kbd>', 'Aceeași hartă, de la capăt', actions.restart)
  btn('Hartă nouă <kbd>N</kbd>', 'Altă hartă', actions.newMap)

  // Bara de jos: turnurile și ocolul.
  const bottom = el('footer', 'bar jos', root)
  const towersBox = el('div', 'towers', bottom)
  const towerSlot = slot(towersBox)
  towersBox.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]')
    if (card) actions.selectTower(card.dataset.tip as TowerType)
  })
  const ocolBox = el('div', 'ocol', bottom)
  const ocolSlot = slot(ocolBox)
  ocolBox.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button')
    if (!b) return
    if (b.dataset.extra) actions.setExtra(Number(b.dataset.extra))
    else if (b.dataset.variant !== undefined) actions.nextVariant()
  })

  // Panoul din dreapta.
  const panel = el('aside', 'panou', root)
  const waveSlot = slot(el('section', 'sectiune', panel))
  const contextBox = el('section', 'sectiune context', panel)
  const contextSlot = slot(contextBox)
  contextBox.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]')
    if (b && !b.disabled) actions.towerAction(b.dataset.act as TowerAction, b.dataset.id ? Number(b.dataset.id) : undefined)
  })
  const codexSlot = slot(el('section', 'sectiune', panel))
  const debugSlot = slot(el('div', 'debug', panel))

  // Notificările, anunțul și ecranul de final.
  const toasts = el('div', 'toasts', root)
  const announceBox = el('div', 'anunt', root)
  const endBox = el('div', 'final', root)
  endBox.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button')
    if (b?.dataset.act === 'restart') actions.restart()
    if (b?.dataset.act === 'new') actions.newMap()
  })
  const endSlot = slot(endBox)
  let announceTimer: number | undefined

  return {
    mapArea() {
      const t = top.getBoundingClientRect()
      const b = bottom.getBoundingClientRect()
      // Pe ecrane late panoul stă fixat în dreapta, deci harta îi lasă loc; pe cele înguste e ascuns (CSS).
      const docked = getComputedStyle(panel).display !== 'none'
      const right = docked ? panel.getBoundingClientRect().width + 16 : 0
      return { x: 8, y: t.bottom + 6, w: innerWidth - right - 16, h: b.top - t.bottom - 12 }
    },

    update(v) {
      const hearts = Math.round((v.vieti / v.vietiMax) * 100)
      stats(
        `<span class="titlu">World Guard</span>` +
          `<span class="pill ${v.boss ? 'boss' : ''}">${esc(v.val)}${v.boss ? ' · boss' : ''}</span>` +
          `<span class="stat" title="Vieți"><span class="ico vieti">♥</span>${v.vieti}<span class="bara"><span style="width:${hearts}%"></span></span></span>` +
          `<span class="stat" title="Aur"><span class="ico aur">◆</span>${v.aur}</span>` +
          `<span class="stat mic" title="Lungimea drumului">drum ${v.drum}</span>` +
          `<span class="faza ${v.faza}">${esc(v.fazaText)}</span>`,
      )
      startBtn.disabled = !v.start.ok
      startBtn.title = v.start.ok ? 'Pornește valul' : (v.start.motiv ?? '')
      pauseBtn.innerHTML = `${v.paused ? '▶' : '⏸'} <kbd>P</kbd>`
      pauseBtn.classList.toggle('activ', v.paused)
      speedBtn.innerHTML = `${v.speed}× <kbd>F</kbd>`
      undoBtn.disabled = !v.canUndo

      towerSlot(
        v.towers
          .map(
            (t) =>
              `<button class="card ${t.ales ? 'ales' : ''} ${t.accesibil ? '' : 'scump'}" data-tip="${t.tip}" title="${esc(t.nume)} — tasta ${t.tasta}">` +
              `${towerIcon(t.forma, t.culoare)}<span class="nume">${esc(t.nume)}</span><span class="cost">◆ ${t.cost}</span><kbd>${t.tasta}</kbd></button>`,
          )
          .join(''),
      )
      ocolSlot(
        `<div class="eticheta">Ocol <span class="stare">${esc(v.ocol.stare)}</span></div>` +
          `<div class="grup">${[1, 2, 3]
            .map((n) => `<button class="btn ${v.ocol.extra === n ? 'ales' : ''}" data-extra="${n}" ${v.ocol.activ ? '' : 'disabled'} title="Ocol care lungește drumul cu ${n}">+${n} <kbd>${n}</kbd></button>`)
            .join('')}<button class="btn" data-variant ${v.ocol.activ ? '' : 'disabled'} title="Următoarea variantă de ocol aici">⇥ ${esc(v.ocol.variante)} <kbd>Tab</kbd></button></div>`,
      )

      waveSlot(
        `<h3>${esc(v.wave.titlu)}</h3>` +
          `<ul class="val">${v.wave.randuri
            .map((r) => `<li><span class="punct" style="background:${r.culoare}"></span>${esc(r.nume)}${r.boss ? ' <span class="boss">boss</span>' : ''}<span class="nr">×${r.numar}</span></li>`)
            .join('')}</ul>` +
          (v.wave.nota ? `<p class="nota">${esc(v.wave.nota)}</p>` : ''),
      )
      contextSlot(
        `<h3 class="${v.context.ton ?? ''}">${esc(v.context.titlu)}</h3>` +
          `<dl>${v.context.randuri.map((r) => `<dt>${esc(r.k)}</dt><dd class="${r.ton ?? ''}">${esc(r.v)}</dd>`).join('')}</dl>` +
          (v.context.nota ? `<p class="nota">${esc(v.context.nota)}</p>` : '') +
          (v.context.butoane?.length
            ? `<div class="grup actiuni">${v.context.butoane
                .map(
                  (b) =>
                    `<button class="btn ${b.activ ? 'activ' : ''}" data-act="${b.act}" data-id="${b.id}" ${b.motiv ? 'disabled' : ''} title="${esc(b.motiv ?? '')}">${esc(b.text)} <kbd>${esc(b.tasta)}</kbd></button>`,
                )
                .join('')}</div>` +
              (v.context.butoane.find((b) => b.act === 'combina' && b.motiv) ? `<p class="nota motiv">${esc(v.context.butoane.find((b) => b.act === 'combina')?.motiv ?? '')}</p>` : '')
            : ''),
      )
      codexSlot(
        `<h3>Reacții descoperite <span class="mic">${v.codex.filter((c) => c.numar > 0).length}/${v.codex.length}</span></h3>` +
          `<ul class="codex">${v.codex
            .map((c) =>
              c.numar > 0
                ? `<li><span class="nume" style="color:${c.culoare}">${esc(c.nume)}</span><span class="nr">×${c.numar}</span><span class="reteta">${esc(c.reteta)}</span><span class="efect">${esc(c.efect)}</span></li>`
                : `<li class="ascuns"><span class="nume">? ? ?</span><span class="reteta">nedescoperită</span></li>`,
            )
            .join('')}</ul>`,
      )
      debugSlot(esc(v.debug))
      endSlot(
        v.final
          ? `<div class="card-final ${v.final.castigat ? 'castigat' : 'pierdut'}"><h2>${esc(v.final.titlu)}</h2><p>${esc(v.final.text)}</p>` +
              `<div class="grup"><button class="btn primar" data-act="restart">⟳ Aceeași hartă <kbd>R</kbd></button><button class="btn" data-act="new">Hartă nouă <kbd>N</kbd></button></div></div>`
          : '',
      )
      endBox.classList.toggle('vizibil', v.final !== undefined)
    },

    toast(text) {
      const t = el('div', 'toast', toasts)
      t.textContent = text
      window.setTimeout(() => t.classList.add('stinge'), 3200)
      window.setTimeout(() => t.remove(), 3700)
      while (toasts.children.length > 3) toasts.firstElementChild?.remove()
    },

    announce(text) {
      announceBox.textContent = text
      announceBox.classList.add('vizibil')
      window.clearTimeout(announceTimer)
      announceTimer = window.setTimeout(() => announceBox.classList.remove('vizibil'), 3200)
    },
  }
}
