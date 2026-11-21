// Banda din zbor: ce a strâns zborul, viețile navei, drumul prin sector (care devine viața navei de elită), modulele cu treptele lor,
// pauza și, sub bandă, rândul scurt cu ce ai cules. Ia locul benzii apărării cât se zboară. DOM-ul se atinge doar când o valoare s-a schimbat.
import { FLIGHT, FLIGHT_MOD_KIND, FLIGHT_MODS, type FlightModId } from '../data/flight'
import { eliteOf, sectorProgress, type FlightState } from '../flight/state'
import { flightFxLife } from '../flight/step'
import { icon } from './slots'
import { STR } from './strings'

/** Ce arată banda din zbor; `frac` e drumul prin sector (0–1) sau, cât nava de elită e pe ecran (`elite`), viața ei. */
export interface FlightRow {
  crystal: number; metal: number; hits: number; maxHits: number; elite: boolean; frac: number; label: string
  mods: { id: FlightModId; tier: number }[]; toast: string
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/** Rândul „ai cules”: textul ultimului lucru cules, cât efectul lui trăiește (după timpul zborului), altfel gol. */
function toastOf(f: FlightState): string {
  for (let i = f.fx.length - 1; i >= 0; i--) {
    const e = f.fx[i]!
    if (e.kind !== 'took') continue
    if (f.t - e.t0 > flightFxLife(e)) return ''
    if (e.what === 'repair') return STR.tookRepair
    const name = STR.flightMods[e.what]
    if (e.maxed) return STR.tookMaxed(name, FLIGHT.mods.maxed)
    return e.tier === 1 ? STR.tookNew(name) : STR.tookTier(name, e.tier)
  }
  return ''
}

/** Banda din starea zborului, fără DOM. */
export function flightRow(f: FlightState): FlightRow {
  const elite = eliteOf(f), s = f.ship
  return {
    crystal: f.crystal, metal: f.metal, hits: Math.max(0, s.hp), maxHits: s.maxHp,
    elite: elite !== null,
    frac: elite !== null ? clamp01(elite.hp / elite.maxHp) : sectorProgress(f),
    label: elite !== null ? STR.elite : STR.sectorN(f.sector),
    mods: FLIGHT_MODS.filter((id) => s.mods[id] > 0).map((id) => ({ id, tier: s.mods[id] })),
    toast: toastOf(f),
  }
}

function el<T extends HTMLElement>(doc: Document, id: string): T {
  const e = doc.getElementById(id)
  if (!e) throw new Error(`lipsește elementul #${id}`)
  return e as T
}

/** Un modul în bandă: pictograma în culoarea felului, cu treptele ca puncte dedesubt. */
function modElement(doc: Document, m: { id: FlightModId; tier: number }): HTMLElement {
  const e = doc.createElement('i')
  e.className = `fslot slot-${FLIGHT_MOD_KIND[m.id]}`
  const dots = Array.from({ length: FLIGHT.mods.tiers }, (_, i) => `<i${i < m.tier ? ' class="on"' : ''}></i>`).join('')
  e.innerHTML = `${icon(m.id)}<span class="fdots">${dots}</span>`
  return e
}

export function createFlightHud(doc: Document): { sync(f: FlightState): void; show(on: boolean): void } {
  const band = el(doc, 'flightBanner'), defense = el(doc, 'banner'), toast = el(doc, 'flToast')
  const way = el(doc, 'flWay'), fill = el(doc, 'flFill'), hits = el(doc, 'flHits'), mods = el(doc, 'flMods')
  const text: Record<string, HTMLElement> = {}
  for (const id of ['flCrystal', 'flMetal', 'flLabel', 'flPct']) text[id] = el(doc, id)
  const shown: Record<string, string> = {}
  const put = (id: string, v: string): void => { if (shown[id] !== v) { shown[id] = v; text[id]!.textContent = v } }
  const once = (key: string, v: string, apply: () => void): void => { if (shown[key] !== v) { shown[key] = v; apply() } }
  let on: boolean | null = null

  return {
    sync(f) {
      const r = flightRow(f)
      put('flCrystal', String(r.crystal)); put('flMetal', String(r.metal))
      put('flLabel', r.label); put('flPct', `${Math.round(r.frac * 100)}%`)
      const width = `${Math.round(r.frac * 1000) / 10}%`
      once('fill', width, () => { fill.style.width = width })
      once('elite', String(r.elite), () => way.classList.toggle('elite', r.elite))
      once('hits', `${r.hits}/${r.maxHits}`, () => {
        hits.replaceChildren(...Array.from({ length: r.maxHits }, (_, i) => { const p = doc.createElement('i'); if (i < r.hits) p.className = 'on'; return p }))
      })
      once('mods', r.mods.map((m) => `${m.id}${m.tier}`).join(), () => mods.replaceChildren(...r.mods.map((m) => modElement(doc, m))))
      once('toast', r.toast, () => { toast.textContent = r.toast; toast.hidden = r.toast === '' })
    },
    // Banda zborului în locul celei a apărării (în zbor, în pauza lui și pe cartonașul lui de sfârșit), și înapoi.
    show(yes) {
      if (on === yes) return
      on = yes
      band.hidden = !yes
      defense.hidden = yes
      if (!yes) { toast.hidden = true; shown.toast = '' }
    },
  }
}
