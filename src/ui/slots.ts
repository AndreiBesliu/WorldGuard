// Locurile pentru module ale navei: aceeași funcție fără DOM și același desen în panoul de alegere și în banda de sus.
import { BALANCE } from '../data/balance'
import { MOD_KIND, type ModId, type ModKind } from '../data/modules'
import { slotsAt } from '../sim/mods'
import type { GameState } from '../sim/state'

/** Un loc: ocupat de un modul (cu felul lui), liber, ori următorul care se deschide. */
export type SlotView = { kind: ModKind; id: ModId } | { kind: 'free' } | { kind: 'locked' }

/** Locurile navei: modulele de pe ea, apoi cele libere, apoi (dacă mai există) următorul loc care se deschide. */
export function shipSlots(s: GameState): SlotView[] {
  const open = slotsAt(s.hero.lvl)
  const out: SlotView[] = s.hero.mods.map((m) => ({ kind: MOD_KIND[m.id], id: m.id }))
  while (out.length < open) out.push({ kind: 'free' })
  if (slotsAt(BALANCE.hero.maxLevel) > open) out.push({ kind: 'locked' })
  return out
}

/** Pictograma din `index.html` (`<symbol id="i-…">`). */
export const icon = (id: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${id}"/></svg>`

/** Semnătura unui șir de locuri: se redesenează doar când ea se schimbă. */
export const slotsKey = (v: SlotView[]): string => v.map((x) => ('id' in x ? x.id : x.kind)).join()

/** Elementul unui loc: pictograma modulului în culoarea felului, contur punctat pentru unul liber, lacăt pentru următorul. */
export function slotElement(doc: Document, v: SlotView): HTMLElement {
  const e = doc.createElement('i')
  e.className = `slot slot-${v.kind}`
  if ('id' in v) e.innerHTML = icon(v.id)
  else if (v.kind === 'locked') e.innerHTML = icon('lock')
  return e
}
