// Banda de sus: lemn, piatră, ceas, viața castelului. DOM-ul se atinge doar când o valoare s-a schimbat.
import { BALANCE } from '../data/balance'
import type { GameState } from '../sim/state'
import { clock } from './format'
import { STR } from './strings'

const LOW_FRAC = 0.35     // sub atâta din viața castelului bara devine roșie (prezentare)
const ALARM_SECS = 1      // cât timp banda rămâne roșie după o lovitură în castel (prezentare)

function el<T extends HTMLElement>(doc: Document, id: string): T {
  const e = doc.getElementById(id)
  if (!e) throw new Error(`lipsește elementul #${id}`)
  return e as T
}

export function createHud(doc: Document): { sync(s: GameState, o: { hint: boolean; fps: number | null }): void; bottom(): number } {
  const banner = el(doc, 'banner'), field = el(doc, 'field'), meter = el(doc, 'meter'), fill = el(doc, 'castleFill'), hintEl = el(doc, 'hint')
  const text: Record<string, HTMLElement> = {}
  for (const id of ['wood', 'stone', 'clock', 'castleHp', 'fps']) text[id] = el(doc, id)
  const shown: Record<string, string> = {}
  const flag: Record<string, boolean> = {}

  const put = (id: string, v: string): void => { if (shown[id] !== v) { shown[id] = v; text[id]!.textContent = v } }
  const toggle = (name: string, on: boolean, apply: (on: boolean) => void): void => { if (flag[name] !== on) { flag[name] = on; apply(on) } }

  return {
    sync(s, o) {
      put('wood', String(s.wood)); put('stone', String(s.stone))
      put('clock', clock(s.t))
      put('castleHp', String(Math.max(0, Math.ceil(s.castle.hp))))
      put('fps', o.fps === null ? '' : STR.fpsLabel(o.fps))
      const frac = Math.min(1, Math.max(0, s.castle.hp / BALANCE.castle.hp))
      const width = `${Math.round(frac * 100)}%`
      if (shown.fill !== width) { shown.fill = width; fill.style.width = width }
      toggle('low', frac < LOW_FRAC, (on) => meter.classList.toggle('low', on))
      toggle('alarm', s.mode === 'playing' && s.t - s.castle.hitT < ALARM_SECS, (on) => banner.classList.toggle('alarm', on))
      toggle('hint', o.hint, (on) => { hintEl.hidden = !on })
    },
    bottom: () => banner.getBoundingClientRect().bottom - field.getBoundingClientRect().top,
  }
}
