// Panoul de alegere de la un nivel nou al navei: ce arată (`choiceView`, fără DOM) și cum se pune în pagină (`createChoice`).
// Jocul stă pe loc cât panoul e deschis; panoul nu se închide decât printr-o alegere.
import { BALANCE } from '../data/balance'
import { MAX_TIER, MOD_KIND, type ModId, type ModKind } from '../data/modules'
import { slotsAt } from '../sim/mods'
import type { GameState } from '../sim/state'
import { STR } from './strings'
import { onTap } from './tap'

export interface OfferView { id: ModId; name: string; kind: string; tag: string; lines: string[]; pips: number; tone: ModKind }
export interface ChoiceView { level: number; slots: ('weapon' | 'body' | 'utility' | 'free' | 'locked')[]; offers: OfferView[] }

/** Ce arată panoul pentru oferta deschisă; null fără ofertă. */
export function choiceView(s: GameState): ChoiceView | null {
  if (s.offer === null) return null
  const level = s.hero.lvl, open = slotsAt(level)
  const slots: ChoiceView['slots'] = s.hero.mods.map((m) => MOD_KIND[m.id])
  while (slots.length < open) slots.push('free')
  if (slotsAt(BALANCE.hero.maxLevel) > open) slots.push('locked')   // următorul loc care se deschide
  const offers = s.offer.map((o): OfferView => {
    const t = STR.mods[o.id], fresh = o.tier === 1
    return {
      id: o.id, name: t.name, kind: STR.kind[MOD_KIND[o.id]], tag: fresh ? STR.offerNew : STR.offerUp,
      lines: fresh ? t.fresh : [t.up, STR.tierLine(o.tier)], pips: o.tier, tone: MOD_KIND[o.id],
    }
  })
  return { level, slots, offers }
}

function el<T extends HTMLElement>(doc: Document, id: string): T {
  const e = doc.getElementById(id)
  if (!e) throw new Error(`lipsește elementul #${id}`)
  return e as T
}

/** Pictograma din `index.html` (`<symbol id="i-…">`). */
const icon = (id: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${id}"/></svg>`

/**
 * Leagă panoul din pagină (`#choiceVeil`). `show` face rândurile din nou de fiecare dată, cu ascultători noi:
 * o atingere începută înainte să apară panoul nu are cum să fi apăsat pe ele, deci nu alege nimic.
 */
export function createChoice(doc: Document, onPick: (index: number) => void): { show(v: ChoiceView): void; hide(): void; readonly open: boolean } {
  const veil = el(doc, 'choiceVeil'), level = el(doc, 'choiceLevel'), slots = el(doc, 'choiceSlots'), list = el(doc, 'choiceOffers')
  let open = false
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] => {
    const e = doc.createElement(tag)
    e.className = cls
    if (text !== '') e.textContent = text
    return e
  }
  const row = (o: OfferView, i: number): HTMLButtonElement => {
    const b = make('button', `offer tone-${o.tone}`)
    b.type = 'button'
    const pic = make('span', 'offer-icon')
    pic.innerHTML = icon(o.id)
    const head = make('span', 'offer-head')
    head.append(make('b', 'offer-name', o.name), make('span', 'offer-tag', `${o.kind} · ${o.tag}`))
    const lines = make('span', 'offer-lines')
    lines.append(...o.lines.map((l) => make('span', 'offer-line', l)))
    const pips = make('span', 'pips')
    for (let t = 1; t <= MAX_TIER; t++) pips.append(make('i', t <= o.pips ? 'pip on' : 'pip'))
    const body = make('span', 'offer-body')
    body.append(head, lines, pips)
    b.append(pic, body)
    onTap(b, () => { if (open) onPick(i) })
    return b
  }
  const slot = (k: ChoiceView['slots'][number]): HTMLElement => {
    const e = make('i', `slot slot-${k}`)
    if (k === 'locked') e.innerHTML = icon('lock')
    return e
  }

  return {
    show(v) {
      level.textContent = STR.levelN(v.level)
      slots.replaceChildren(...v.slots.map(slot))
      const rows = v.offers.map(row)
      list.replaceChildren(...rows)
      veil.hidden = false
      open = true
      rows[0]?.focus({ preventScroll: true })
    },
    hide() {
      open = false
      veil.hidden = true
      list.replaceChildren()
    },
    get open() { return open },
  }
}
