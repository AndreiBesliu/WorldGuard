// Atelierul: ce arată (`shopView`, fără DOM) și cum se pune în pagină (`createShop`). Panoul stă peste cartonașul de unde s-a deschis;
// cine îl cheamă ține cartonașul și rezerva. O apăsare cumpără o treaptă, iar cine cheamă `onBuy` reface rândurile cu `show`.
import { canBuy, type Profile } from '../app/profile'
import { UP_IDS, WORKSHOP, upPrice, type Cost, type UpId } from '../data/workshop'
import { STR } from './strings'
import { onTap } from './tap'

export interface ShopRow { id: UpId; name: string; text: string; level: number; max: number; price: Cost | null; state: 'buy' | 'poor' | 'max' }

/** Ce arată atelierul pentru un profil: rezerva și cele cinci rânduri, în ordinea din `UP_IDS`. */
export function shopView(p: Profile): { crystal: number; metal: number; rows: ShopRow[] } {
  const rows = UP_IDS.map((id): ShopRow => {
    const level = p.ups[id], max = WORKSHOP[id].max
    const text = id === 'kit' ? STR.kitText[Math.min(level, STR.kitText.length - 1)]! : STR.upText[id]
    const base = { id, name: STR.upName[id], text, level, max }
    if (level >= max) return { ...base, price: null, state: 'max' }
    return { ...base, price: upPrice(id, level + 1), state: canBuy(p, id).ok ? 'buy' : 'poor' }
  })
  return { crystal: p.crystal, metal: p.metal, rows }
}

function el<T extends HTMLElement>(doc: Document, id: string): T {
  const e = doc.getElementById(id)
  if (!e) throw new Error(`lipsește elementul #${id}`)
  return e as T
}

/**
 * Leagă panoul din pagină (`#shopVeil`). `show` face rândurile din nou când profilul s-a schimbat, cu ascultători noi: o atingere
 * începută înainte să apară panoul (sau pe un rând de dinainte) nu are cum să fi apăsat pe un buton de acum. Fiecare buton ține
 * „generația” lui; după `hide` sau o refacere, cele vechi nu mai cumpără. Focusul de la deschidere stă pe panou, nu pe un buton:
 * un Enter ținut apăsat nu cumpără. Doar rândurile „buy” cumpără; „poor” și „max” nu cheamă nimic.
 */
export function createShop(doc: Document, onBuy: (id: UpId) => void, onBack: () => void): {
  show(p: Profile): void; hide(): void; readonly open: boolean
} {
  const veil = el(doc, 'shopVeil'), card = el(doc, 'shopCard'), crystal = el(doc, 'shopCrystal'), metal = el(doc, 'shopMetal')
  const list = el(doc, 'shopRows'), back = el(doc, 'shopBack')
  let open = false
  let gen = 0                       // crește la fiecare refacere și la `hide`: un buton ține generația în care a fost făcut
  let shown = ''                    // ce e pe ecran, ca pagina să se atingă doar când ceva s-a schimbat
  let refocus: UpId | null = null   // rândul cumpărat acum: după refacere, focusul se întoarce pe butonul lui
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] => {
    const e = doc.createElement(tag)
    e.className = cls
    if (text !== '') e.textContent = text
    return e
  }
  const price = (c: Cost): HTMLElement[] => [
    make('i', 'chip chip-crystal'), make('span', '', String(c.crystal)),
    ...(c.metal > 0 ? [make('i', 'chip chip-metal'), make('span', '', String(c.metal))] : []),   // metal 0 nu se arată
  ]
  const row = (r: ShopRow, mine: number): { box: HTMLElement; button: HTMLElement | null } => {
    const box = make('div', 'up')
    const head = make('div', 'up-head')
    const dots = make('span', 'up-dots')
    for (let t = 1; t <= r.max; t++) dots.append(make('i', t <= r.level ? 'on' : ''))
    head.append(make('h2', 'up-name', r.name), dots)
    let buy: HTMLElement, button: HTMLElement | null = null
    if (r.price === null) {
      buy = make('span', 'buy max', STR.maxed)
    } else {
      const b = make('button', r.state === 'buy' ? 'buy' : 'buy poor')
      b.type = 'button'
      b.setAttribute('data-up', r.id)
      b.setAttribute('aria-label', STR.buyLabel(r.name, r.price.crystal, r.price.metal))
      if (r.state === 'poor') b.setAttribute('aria-disabled', 'true')   // rămâne buton, ca focusul să nu se piardă; nu cheamă nimic
      b.append(...price(r.price))
      onTap(b, () => {
        if (!open || mine !== gen || r.state !== 'buy') return
        refocus = r.id
        try { onBuy(r.id) } finally { refocus = null }
      })
      buy = button = b
    }
    box.append(head, make('span', 'up-text', r.text), buy)
    return { box, button }
  }
  onTap(back, () => { if (open) onBack() })
  return {
    show(p) {
      const v = shopView(p)
      const key = JSON.stringify(v)
      if (open && key === shown) return
      shown = key
      gen++
      crystal.textContent = String(v.crystal)
      metal.textContent = String(v.metal)
      const made = v.rows.map((r) => row(r, gen))
      list.replaceChildren(...made.map((m) => m.box))
      veil.hidden = false
      const wasOpen = open
      open = true
      const again = wasOpen && refocus !== null ? v.rows.findIndex((r) => r.id === refocus) : -1
      const target = again >= 0 ? made[again]!.button : null
      if (target !== null) target.focus({ preventScroll: true })
      else card.focus({ preventScroll: true })
    },
    hide() {
      open = false
      gen++
      shown = ''
      veil.hidden = true
      list.replaceChildren()
    },
    get open() { return open },
  }
}
