// Cartonașele: de start (cele două moduri și sectorul ales), de pauză și de final ale apărării, de pauză și de sfârșit ale zborului,
// plus butoanele de pauză din cele două benzi. Butoanele sunt în pagină; aici doar se leagă și se arată.
import type { FlightOver } from '../app/flightSession'
import type { Profile } from '../app/profile'
import type { OverInfo } from '../app/session'
import { clock } from './format'
import { STR } from './strings'
import { onTap } from './tap'

/** Sectorul de după o apăsare pe − sau +: de la 1 până la cel mai departe explorat (`farthest`) plus unu, oricâte apăsări ar veni. */
export function stepSector(sector: number, delta: -1 | 1, farthest: number): number {
  const top = Math.max(1, Math.floor(farthest) + 1)
  const n = Number.isFinite(sector) ? Math.floor(sector) + delta : 1
  return Math.min(top, Math.max(1, n))
}

/**
 * Cele două drumuri de pe cartonașul de start. Fără salvare, „Apără planeta” e principalul. Cu o partidă salvată, „Continuă partida”
 * e principalul, iar „Apără planeta” trece pe stilul secundar și spune că partida salvată se pierde (o partidă nouă o înlocuiește).
 */
export function startView(saved: { secs: number } | null): { defendMain: boolean; defendLine: string; continueText: string | null } {
  if (saved === null) return { defendMain: true, defendLine: STR.defendLine, continueText: null }
  return { defendMain: false, defendLine: STR.defendFresh, continueText: STR.continueSaved(clock(saved.secs)) }
}

function el<T extends HTMLElement>(doc: Document, id: string): T {
  const e = doc.getElementById(id)
  if (!e) throw new Error(`lipsește elementul #${id}`)
  return e as T
}

export function createCards(doc: Document, on: {
  defend(): void; continue(): void; stress(): void; again(): void; pause(): void; resume(): void; fresh(): void
  explore(): void; sector(delta: -1 | 1): void; next(): void; home(): void
}): {
  showStart(o: { saved: { secs: number } | null; profile: Profile; sector: number }): void
  /** Sectorul ales (îl ține cine cheamă; cartonașul doar îl arată), după o apăsare pe − sau +, fără să mute focusul. */
  showSector(sector: number, farthest: number): void
  showPause(secs: number): void
  showOver(r: OverInfo): void
  showFlightPause(got: { crystal: number; metal: number }): void
  showFlightOver(r: FlightOver, profile: Profile): void
  hide(): void
  hold(): void
} {
  const startVeil = el(doc, 'startVeil'), pauseVeil = el(doc, 'pauseVeil'), overVeil = el(doc, 'overVeil')
  const flightPauseVeil = el(doc, 'flightPauseVeil'), flightOverVeil = el(doc, 'flightOverVeil')
  const allVeils = [startVeil, pauseVeil, overVeil, flightPauseVeil, flightOverVeil]
  const startBtn = el(doc, 'start'), continueBtn = el(doc, 'continue'), againBtn = el(doc, 'again')
  const pauseBtns = [el(doc, 'pause'), el(doc, 'flightPause')], resumeBtn = el(doc, 'resume')
  const sectorDown = el(doc, 'sectorDown'), sectorUp = el(doc, 'sectorUp'), nextBtn = el(doc, 'flightNext')
  const put = (id: string, v: string): void => { el(doc, id).textContent = v }
  const bind = (b: HTMLElement, f: () => void): void => onTap(b, f)   // primul deget, al doilea, mausul și tastatura
  bind(startBtn, on.defend)
  bind(continueBtn, on.continue)
  bind(el(doc, 'stress'), on.stress)
  bind(againBtn, on.again)
  for (const b of pauseBtns) bind(b, on.pause)
  bind(resumeBtn, on.resume)
  bind(el(doc, 'fresh'), on.fresh)
  bind(el(doc, 'explore'), on.explore)          // sectorul îl ține cine cheamă, nu cartonașul
  bind(sectorDown, () => on.sector(-1))
  bind(sectorUp, () => on.sector(1))
  bind(el(doc, 'flightResume'), on.resume)
  bind(el(doc, 'quitFlight'), on.home)          // renunțarea: strânsul e deja în rezervă, de la pauză
  bind(nextBtn, on.next)
  bind(el(doc, 'flightHome'), on.home)

  // Fără niciun cartonaș și fără panoul de alegere, partida e în curs: atunci, și doar atunci, butonul de pauză e la vedere.
  // Ascuns, rămâne în așezare (invizibil, de neatins, scos din ordinea de tabulare): banda nu-și schimbă înălțimea, iar canvasul nu e realocat.
  const pauseOn = (yes: boolean): void => { for (const b of pauseBtns) { b.classList.toggle('off', !yes); b.tabIndex = yes ? 0 : -1 } }
  const veils = (): void => { for (const v of allVeils) v.hidden = true }
  const show = (veil: HTMLElement, focus: HTMLElement): void => {
    veils()
    pauseOn(false)
    veil.hidden = false
    focus.focus({ preventScroll: true })
  }
  // − și + stinse la capete: rămân apăsabile (regula le ține în margini), ca focusul de pe ele să nu se piardă.
  const showSector = (n: number, farthest: number): void => {
    put('sectorN', STR.sectorN(n))
    const low = n <= 1, high = n >= farthest + 1
    sectorDown.classList.toggle('off', low); sectorDown.setAttribute('aria-disabled', String(low))
    sectorUp.classList.toggle('off', high); sectorUp.setAttribute('aria-disabled', String(high))
  }
  const reserve = (prefix: string, p: Profile): void => { put(`${prefix}Crystal`, String(p.crystal)); put(`${prefix}Metal`, String(p.metal)) }

  return {
    showStart(o) {
      const v = startView(o.saved)
      continueBtn.hidden = v.continueText === null
      continueBtn.textContent = v.continueText ?? ''
      continueBtn.classList.toggle('line', v.defendMain)   // fără clasa `line`, butonul galben principal
      startBtn.classList.toggle('main', v.defendMain)
      startBtn.classList.toggle('alt', !v.defendMain)
      put('defendLine', v.defendLine)
      reserve('start', o.profile)
      showSector(o.sector, o.profile.sector)
      show(startVeil, o.saved === null ? startBtn : continueBtn)
    },
    showSector,
    showPause(secs) {
      el(doc, 'pauseTime').textContent = clock(secs)
      show(pauseVeil, resumeBtn)
    },
    showOver(r) {
      el(doc, 'overTime').textContent = clock(r.secs)
      el(doc, 'recordLabel').textContent = r.isNew ? STR.recordNew : STR.record
      el(doc, 'overRecord').textContent = clock(r.record)
      el(doc, 'overKills').textContent = String(r.kills)
      show(overVeil, againBtn)
    },
    showFlightPause(got) {
      put('pauseCrystal', `+${got.crystal}`); put('pauseMetal', `+${got.metal}`)
      show(flightPauseVeil, el(doc, 'flightResume'))
    },
    showFlightOver(r, profile) {
      put('flightOverSector', STR.sectorN(r.sector))
      put('flightOverTitle', r.explored ? STR.explored : STR.heroDown)
      put('flightOverLabel', r.explored ? STR.broughtHome : STR.gotSoFar)
      put('overCrystal', `+${r.crystal}`); put('overMetal', `+${r.metal}`)
      reserve('flightOver', profile)
      nextBtn.textContent = r.explored ? STR.nextSector : STR.flyAgain
      show(flightOverVeil, nextBtn)
    },
    hide() {
      veils()
      pauseOn(true)
    },
    // Niciun cartonaș, dar nici butonul de pauză: e pe ecran panoul de alegere, care nu se închide decât alegând.
    hold() {
      veils()
      pauseOn(false)
    },
  }
}
