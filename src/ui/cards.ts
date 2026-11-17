// Cartonașele de start și de final. Butoanele sunt în pagină; aici doar se leagă și se arată.
import { clock } from './format'
import { STR } from './strings'

function el<T extends HTMLElement>(doc: Document, id: string): T {
  const e = doc.getElementById(id)
  if (!e) throw new Error(`lipsește elementul #${id}`)
  return e as T
}

export function createCards(doc: Document, on: { start(): void; stress(): void; again(): void }): {
  showStart(): void; showOver(r: { secs: number; record: number; isNew: boolean; kills: number }): void; hide(): void
} {
  const startVeil = el(doc, 'startVeil'), overVeil = el(doc, 'overVeil')
  const startBtn = el(doc, 'start'), againBtn = el(doc, 'again')
  startBtn.addEventListener('click', () => on.start())
  el(doc, 'stress').addEventListener('click', () => on.stress())
  againBtn.addEventListener('click', () => on.again())
  const hide = (): void => { startVeil.hidden = true; overVeil.hidden = true }

  return {
    showStart() { hide(); startVeil.hidden = false; startBtn.focus({ preventScroll: true }) },
    showOver(r) {
      hide()
      el(doc, 'overTime').textContent = clock(r.secs)
      el(doc, 'recordLabel').textContent = r.isNew ? STR.recordNew : STR.record
      el(doc, 'overRecord').textContent = clock(r.record)
      el(doc, 'overKills').textContent = String(r.kills)
      overVeil.hidden = false
      againBtn.focus({ preventScroll: true })
    },
    hide,
  }
}
