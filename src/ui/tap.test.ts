import { describe, expect, it } from 'vitest'
import { onTap, type TapEvent, type TapTarget } from './tap'

// Un buton fals: 100 × 40 px la (10, 10); `send` trimite un eveniment la ascultătorii lui.
const fakeButton = () => {
  const on = new Map<string, ((e: TapEvent) => void)[]>()
  const el: TapTarget = {
    addEventListener(type, f) { on.set(type, [...(on.get(type) ?? []), f]) },
    getBoundingClientRect: () => ({ left: 10, top: 10, right: 110, bottom: 50 }),
  }
  let t = 0
  const send = (type: string, e: Partial<TapEvent> = {}): void => {
    t += 50
    for (const f of on.get(type) ?? []) f({ timeStamp: t, ...e })
  }
  let n = 0
  onTap(el, () => { n++ })
  return { send, fired: () => n }
}
const finger = (id: number, x = 50, y = 30): Partial<TapEvent> => ({ pointerId: id, pointerType: 'touch', clientX: x, clientY: y })

describe('apăsarea unui buton', () => {
  it('primul deget: pornește la ridicare, iar clicul care urmează nu-l mai pornește o dată', () => {
    const b = fakeButton()
    b.send('pointerdown', finger(1)); expect(b.fired()).toBe(0)
    b.send('pointerup', finger(1)); expect(b.fired()).toBe(1)
    b.send('click', { pointerId: 1, pointerType: 'touch', clientX: 50, clientY: 30 }); expect(b.fired()).toBe(1)
  })
  it('al doilea deget, cât primul ține joystickul: pornește, deși browserul nu dă clic', () => {
    const b = fakeButton()
    b.send('pointerdown', finger(7)); b.send('pointerup', finger(7))
    expect(b.fired()).toBe(1)
  })
  it('un clic fără felul pointerului, imediat după o atingere, e același gest: o singură pornire', () => {
    const b = fakeButton()
    b.send('pointerdown', finger(1)); b.send('pointerup', finger(1))
    b.send('click'); expect(b.fired()).toBe(1)
  })
  it('tastatura și mausul pornesc la clic, ca înainte', () => {
    const b = fakeButton()
    b.send('click', { pointerType: '' }); expect(b.fired()).toBe(1)
    b.send('pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 30 })
    b.send('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 30 }); expect(b.fired()).toBe(1)
    b.send('click', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 30 }); expect(b.fired()).toBe(2)
  })
  it('degetul ridicat în afara butonului nu pornește nimic', () => {
    const b = fakeButton()
    b.send('pointerdown', finger(1)); b.send('pointerup', finger(1, 200, 30))
    b.send('click', { pointerId: 1, pointerType: 'touch' })
    expect(b.fired()).toBe(0)
  })
  it('atingerea nu lasă evenimentele de maus imitate, care ar lua focusul de pe cartonașul nou', () => {
    const b = fakeButton(); let stopped = 0
    b.send('pointerdown', { ...finger(1), preventDefault: () => { stopped++ } })
    b.send('pointerdown', { pointerId: 2, pointerType: 'mouse', clientX: 50, clientY: 30, preventDefault: () => { stopped += 10 } })
    expect(stopped).toBe(1)
  })
  it('un deget anulat sau unul care n-a apăsat butonul nu pornește nimic', () => {
    const b = fakeButton()
    b.send('pointerdown', finger(1)); b.send('pointercancel', finger(1)); b.send('pointerup', finger(1))
    b.send('pointerup', finger(2))
    expect(b.fired()).toBe(0)
  })
})
