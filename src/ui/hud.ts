// Banda de sus: cristal, metal, ceas, viața nucleului. DOM-ul se atinge doar când o valoare s-a schimbat.
import { BALANCE } from '../data/balance'
import { LOW_FRAC } from '../data/layout'
import type { GameState } from '../sim/state'
import { clock } from './format'
import { STR } from './strings'

const ALARM_SECS = 1      // cât timp banda rămâne roșie după o lovitură în nucleu (prezentare)

function el<T extends HTMLElement>(doc: Document, id: string): T {
  const e = doc.getElementById(id)
  if (!e) throw new Error(`lipsește elementul #${id}`)
  return e as T
}

export function createHud(doc: Document): { sync(s: GameState, o: { hint: boolean; fps: { now: number; min: number } | null }): void; bottom(): number } {
  const banner = el(doc, 'banner'), field = el(doc, 'field'), meter = el(doc, 'meter'), fill = el(doc, 'coreFill'), hintEl = el(doc, 'hint')
  const text: Record<string, HTMLElement> = {}
  for (const id of ['crystal', 'metal', 'clock', 'coreHp', 'fps']) text[id] = el(doc, id)
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
      toggle('hint', o.hint, (on) => { hintEl.hidden = !on })
    },
    bottom: () => banner.getBoundingClientRect().bottom - field.getBoundingClientRect().top,
  }
}
