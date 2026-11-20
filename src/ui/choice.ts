// Panoul de alegere de la un nivel nou al navei: ce arată (`choiceView`, fără DOM) și cum se pune în pagină (`createChoice`).
// Jocul stă pe loc cât panoul e deschis; panoul nu se închide decât printr-o alegere.
import { MAX_TIER, MOD_KIND, type ModId, type ModKind } from '../data/modules'
import type { GameState } from '../sim/state'
import { icon, shipSlots, slotElement, type SlotView } from './slots'
import { STR } from './strings'
import { onTap } from './tap'

export interface OfferView { id: ModId; name: string; kind: string; tag: string; lines: string[]; pips: number; tone: ModKind }
export interface ChoiceView { level: number; slots: SlotView[]; offers: OfferView[] }

/** Ce arată panoul pentru oferta deschisă; null fără ofertă. */
export function choiceView(s: GameState): ChoiceView | null {
  if (s.offer === null) return null
  const offers = s.offer.map((o): OfferView => {
    const t = STR.mods[o.id], fresh = o.tier === 1
    return {
      id: o.id, name: t.name, kind: STR.kind[MOD_KIND[o.id]], tag: fresh ? STR.offerNew : STR.offerUp,
      lines: fresh ? t.fresh : [t.up, STR.tierLine(o.tier)], pips: o.tier, tone: MOD_KIND[o.id],
    }
  })
  return { level: s.hero.lvl, slots: shipSlots(s), offers }
}

function el<T extends HTMLElement>(doc: Document, id: string): T {
  const e = doc.getElementById(id)
  if (!e) throw new Error(`lipsește elementul #${id}`)
  return e as T
}

/**
 * Fereastra de la deschiderea panoului în care nicio apăsare nu alege, ms. Jucătorul stă pe cercul navei ca să plătească, de multe ori
 * cu degetul ridicat; dacă îl pune pe ecran ca să plece exact când apare panoul, apăsarea ar începe pe un rând. Propunere, de văzut în joc.
 */
export const CHOICE_GRACE_MS = 400

/**
 * Leagă panoul din pagină (`#choiceVeil`). `show` face rândurile din nou de fiecare dată, cu ascultători noi:
 * o atingere începută înainte să apară panoul nu are cum să fi apăsat pe ele, deci nu alege nimic.
 * Focusul merge pe cartonaș, nu pe o ofertă: Enter sau Spațiu apăsate din reflex nu aleg; Tab duce la prima ofertă.
 * Orice alegere (atingere, clic, tastele 1–3 prin `key`) trece prin `tryPick`: alege doar o apăsare ÎNCEPUTĂ după `CHOICE_GRACE_MS`.
 * `now` e ceasul interfeței, în ms (în teste, unul fals); simularea nu are de-a face cu el.
 */
export function createChoice(doc: Document, onPick: (index: number) => void, now: () => number = () => performance.now()): {
  show(v: ChoiceView): void; hide(): void; key(index: number): void; readonly open: boolean
} {
  const veil = el(doc, 'choiceVeil'), card = el(doc, 'choiceCard'), level = el(doc, 'choiceLevel'), slots = el(doc, 'choiceSlots'), list = el(doc, 'choiceOffers')
  let open = false
  let openedAt = 0
  /** Poarta, singura: panoul deschis și apăsarea începută după fereastră. */
  const tryPick = (index: number, startedAt: number): void => {
    if (open && startedAt - openedAt >= CHOICE_GRACE_MS) onPick(index)
  }
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
    // Când a început apăsarea: la `pointerdown` (deget sau maus); un clic de la tastatură n-are `pointerdown`, deci începe acum.
    let pressedAt: number | null = null
    b.addEventListener('pointerdown', () => { pressedAt = now() })
    b.addEventListener('pointercancel', () => { pressedAt = null })
    onTap(b, () => {
      const at = pressedAt ?? now()
      pressedAt = null
      tryPick(i, at)
    })
    return b
  }
  return {
    show(v) {
      level.textContent = STR.levelN(v.level)
      slots.replaceChildren(...v.slots.map((x) => slotElement(doc, x)))
      const rows = v.offers.map(row)
      list.replaceChildren(...rows)
      veil.hidden = false
      open = true
      openedAt = now()
      card.focus({ preventScroll: true })
    },
    key(index) { tryPick(index, now()) },
    hide() {
      open = false
      veil.hidden = true
      list.replaceChildren()
    },
    get open() { return open },
  }
}
