// Cartonașele de start, de pauză și de final, plus butonul de pauză din bandă. Butoanele sunt în pagină; aici doar se leagă și se arată.
import type { OverInfo } from '../app/session'
import { clock } from './format'
import { STR } from './strings'
import { onTap } from './tap'

function el<T extends HTMLElement>(doc: Document, id: string): T {
  const e = doc.getElementById(id)
  if (!e) throw new Error(`lipsește elementul #${id}`)
  return e as T
}

export function createCards(doc: Document, on: {
  start(): void; continue(): void; stress(): void; again(): void; pause(): void; resume(): void; fresh(): void
}): {
  showStart(saved: { secs: number } | null): void
  showPause(secs: number): void
  showOver(r: OverInfo): void
  hide(): void
  hold(): void
} {
  const startVeil = el(doc, 'startVeil'), pauseVeil = el(doc, 'pauseVeil'), overVeil = el(doc, 'overVeil')
  const startBtn = el(doc, 'start'), continueBtn = el(doc, 'continue'), againBtn = el(doc, 'again')
  const pauseBtn = el(doc, 'pause'), resumeBtn = el(doc, 'resume')
  const bind = (b: HTMLElement, f: () => void): void => onTap(b, f)   // primul deget, al doilea, mausul și tastatura
  bind(startBtn, on.start)
  bind(continueBtn, on.continue)
  bind(el(doc, 'stress'), on.stress)
  bind(againBtn, on.again)
  bind(pauseBtn, on.pause)
  bind(resumeBtn, on.resume)
  bind(el(doc, 'fresh'), on.fresh)

  // Fără niciun cartonaș și fără panoul de alegere, partida e în curs: atunci, și doar atunci, butonul de pauză e la vedere.
  // Ascuns, rămâne în așezare (invizibil, de neatins, scos din ordinea de tabulare): banda nu-și schimbă înălțimea, iar canvasul nu e realocat.
  const pauseOn = (yes: boolean): void => { pauseBtn.classList.toggle('off', !yes); pauseBtn.tabIndex = yes ? 0 : -1 }
  const veils = (): void => { startVeil.hidden = true; pauseVeil.hidden = true; overVeil.hidden = true }
  const show = (veil: HTMLElement, focus: HTMLElement): void => {
    veils()
    pauseOn(false)
    veil.hidden = false
    focus.focus({ preventScroll: true })
  }

  return {
    showStart(saved) {
      continueBtn.hidden = saved === null
      continueBtn.textContent = saved === null ? '' : STR.continueSaved(clock(saved.secs))
      startBtn.textContent = saved === null ? STR.start : STR.fresh
      startBtn.classList.toggle('alt', saved !== null)
      show(startVeil, saved === null ? startBtn : continueBtn)
    },
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
