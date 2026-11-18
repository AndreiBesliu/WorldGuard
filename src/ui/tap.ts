// Apăsarea unui buton al jocului, la fel pentru primul deget și pentru al doilea.
// Browserul nu dă `click` pentru al doilea deget: cine ține joystickul cu o mână și atinge pauza cu cealaltă n-ar obține nimic.
// De aceea, la atingere butonul pornește la ridicarea degetului deasupra lui; cu tastatura și cu mausul, la `click`, ca înainte.

/** Cât de aproape de o atingere un `click` fără felul pointerului e socotit același gest (browsere care nu-l spun). */
const GHOST_MS = 1000

export interface TapEvent { timeStamp: number; pointerId?: number; pointerType?: string; clientX?: number; clientY?: number; preventDefault?(): void }
export interface TapTarget {
  addEventListener(type: string, f: (e: TapEvent) => void): void
  getBoundingClientRect(): { left: number; top: number; right: number; bottom: number }
}

export function onTap(el: TapTarget, fire: () => void): void {
  const down = new Set<number>()      // degetele care au apăsat pe buton și nu s-au ridicat încă
  let lastTouch = -Infinity
  const isTouch = (e: TapEvent): boolean => e.pointerType === 'touch' && e.pointerId !== undefined
  el.addEventListener('pointerdown', (e) => {
    if (!isTouch(e)) return
    down.add(e.pointerId as number)
    // Fără evenimentele de maus imitate după atingere: butonul pornește la ridicare și poate schimba ce e pe ecran,
    // iar un `mousedown` imitat ar cădea pe ce a apărut dedesubt și ar lua focusul de pe butonul cartonașului nou.
    e.preventDefault?.()
  })
  el.addEventListener('pointercancel', (e) => { if (isTouch(e)) down.delete(e.pointerId as number) })
  el.addEventListener('pointerup', (e) => {
    if (!isTouch(e) || !down.delete(e.pointerId as number)) return
    const r = el.getBoundingClientRect(), x = e.clientX ?? NaN, y = e.clientY ?? NaN
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return   // degetul s-a ridicat în altă parte: răzgândit
    lastTouch = e.timeStamp
    fire()
  })
  el.addEventListener('click', (e) => {
    if (e.pointerType === 'touch') return                                       // atingerea a pornit deja la ridicare
    if (e.pointerType === undefined && e.timeStamp - lastTouch < GHOST_MS) return   // același gest, într-un browser care nu spune felul
    fire()
  })
}
