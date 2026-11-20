// Banda de sus: cristal, metal, ceas, viața nucleului și rândul navei (nivel, locuri, experiență). DOM-ul se atinge doar când o valoare s-a schimbat.
import { BALANCE } from '../data/balance'
import { LOW_FRAC } from '../data/layout'
import { heroPadView } from '../render/derive'
import type { GameState } from '../sim/state'
import { clock } from './format'
import { shipSlots, slotElement, slotsKey, type SlotView } from './slots'
import { STR } from './strings'

const ALARM_SECS = 1      // cât timp banda rămâne roșie după o lovitură în nucleu (prezentare)

/** Ce arată rândul navei: nivelul, cât din inel e plin (0–1), locurile și textul din dreapta. */
export interface ShipRow { level: number; frac: number; ready: boolean; max: boolean; slots: SlotView[]; text: string }

/** Rândul navei din starea jocului, fără DOM; aceeași citire ca la cercul navei de pe canvas (`heroPadView`). */
export function shipRow(s: GameState): ShipRow {
  const v = heroPadView(s), level = s.hero.lvl, slots = shipSlots(s)
  if (v.kind === 'max') return { level, frac: 1, ready: false, max: true, slots, text: STR.levelMax }
  if (v.kind === 'ready') return { level, frac: 1, ready: true, max: false, slots, text: STR.levelReady(level + 1) }
  return { level, frac: Math.min(1, Math.max(0, v.a / v.b)), ready: false, max: false, slots, text: STR.xpOf(v.a, v.b) }
}

function el<T extends HTMLElement>(doc: Document, id: string): T {
  const e = doc.getElementById(id)
  if (!e) throw new Error(`lipsește elementul #${id}`)
  return e as T
}

export function createHud(doc: Document): { sync(s: GameState, o: { hint: boolean; fps: { now: number; min: number } | null }): void; bottom(): number } {
  const banner = el(doc, 'banner'), field = el(doc, 'field'), meter = el(doc, 'meter'), fill = el(doc, 'coreFill'), hintEl = el(doc, 'hint')
  const ship = el(doc, 'ship'), ring = el<HTMLElement>(doc, 'xpRing'), slotsEl = el(doc, 'shipSlots')
  const text: Record<string, HTMLElement> = {}
  for (const id of ['crystal', 'metal', 'clock', 'coreHp', 'fps', 'level', 'xpText']) text[id] = el(doc, id)
  const shown: Record<string, string> = {}
  const flag: Record<string, boolean> = {}

  const put = (id: string, v: string): void => { if (shown[id] !== v) { shown[id] = v; text[id]!.textContent = v } }
  const toggle = (name: string, on: boolean, apply: (on: boolean) => void): void => { if (flag[name] !== on) { flag[name] = on; apply(on) } }

  return {
    sync(s, o) {
      put('crystal', String(s.crystal)); put('metal', String(s.metal))
      put('clock', clock(s.t))
      put('coreHp', String(Math.max(0, Math.ceil(s.core.hp))))
      put('fps', o.fps === null ? '' : STR.fpsLabel(o.fps.now, o.fps.min))
      const frac = Math.min(1, Math.max(0, s.core.hp / BALANCE.core.hp))
      const width = `${Math.round(frac * 100)}%`
      if (shown.fill !== width) { shown.fill = width; fill.style.width = width }
      toggle('low', frac < LOW_FRAC, (on) => meter.classList.toggle('low', on))
      toggle('alarm', s.mode === 'playing' && s.t - s.core.hitT < ALARM_SECS, (on) => banner.classList.toggle('alarm', on))
      const row = shipRow(s)
      put('level', String(row.level)); put('xpText', row.text)
      const dash = `${Math.round(row.frac * 1000) / 10} 100`
      if (shown.ring !== dash) { shown.ring = dash; ring.style.strokeDasharray = dash }
      toggle('ready', row.ready || row.max, (on) => ship.classList.toggle('ready', on))
      const key = slotsKey(row.slots)
      if (shown.slots !== key) { shown.slots = key; slotsEl.replaceChildren(...row.slots.map((x) => slotElement(doc, x))) }
      toggle('hint', o.hint, (on) => { hintEl.hidden = !on })
    },
    bottom: () => banner.getBoundingClientRect().bottom - field.getBoundingClientRect().top,
  }
}
