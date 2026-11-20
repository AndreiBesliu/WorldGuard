import { describe, expect, it } from 'vitest'
import { createGame, type GameState } from '../sim/state'
import { choiceView, createChoice, type ChoiceView } from './choice'
import { STR } from './strings'
import type { TapEvent } from './tap'

// O navă de nivelul 3 (3 locuri) cu Unda și Blindajul, cu trei oferte: Laser nou, Unda la treapta 2, Releu nou.
const withOffer = (): GameState => {
  const s = createGame(4)
  s.hero.lvl = 3
  s.hero.mods = [{ id: 'wave', tier: 1, t: 0 }, { id: 'armor', tier: 1, t: 0 }]
  s.offer = [{ id: 'laser', tier: 1 }, { id: 'wave', tier: 2 }, { id: 'relay', tier: 1 }]
  return s
}

describe('choiceView', () => {
  it('fără ofertă deschisă: null', () => {
    expect(choiceView(createGame(4))).toBeNull()
  })
  it('trei oferte: nume, fel, „Nou” sau „Întărire”, rândurile, punctele și culoarea', () => {
    const v = choiceView(withOffer())!
    expect(v.level).toBe(3)
    expect(v.offers.map((o) => [o.name, o.kind, o.tag, o.pips, o.tone])).toEqual([
      ['Laser', 'Armă', 'Nou', 1, 'weapon'],
      ['Undă', 'Armă', 'Întărire', 2, 'weapon'],
      ['Releu', 'Utilitar', 'Nou', 1, 'utility'],
    ])
    expect(v.offers.map((o) => o.lines)).toEqual([
      ['Un dușman, de departe.', 'Bun contra navelor grele.'],
      ['Mai lată și mai puternică.', 'Treapta 2 din 3'],
      ['Turelele de lângă navă', 'trag mai repede.'],
    ])
    for (const o of v.offers) {
      expect(o.lines.length).toBeGreaterThan(0)
      expect(o.lines.length).toBeLessThanOrEqual(2)
      for (const l of o.lines) expect(l.length).toBeLessThanOrEqual(28)
    }
  })
  it('locurile: ocupate cu felul lor, apoi cele libere, apoi următorul care se deschide', () => {
    expect(choiceView(withOffer())!.slots).toEqual(['weapon', 'body', 'free', 'locked'])
    const s = withOffer(); s.hero.lvl = 9
    expect(choiceView(s)!.slots).toEqual(['weapon', 'body', 'free', 'free', 'free', 'free'])   // la nivelul maxim nu mai e nimic de deschis
  })
})

// Un document fals, cât îi trebuie panoului: elemente cu copii, text, ascultători și o margine.
class FakeEl {
  children: FakeEl[] = []
  className = ''
  textContent = ''
  innerHTML = ''
  hidden = true
  type = ''
  focused = false
  attrs: Record<string, string> = {}
  private on = new Map<string, ((e: TapEvent) => void)[]>()
  constructor(readonly tag: string) {}
  addEventListener(type: string, f: (e: TapEvent) => void): void { this.on.set(type, [...(this.on.get(type) ?? []), f]) }
  getBoundingClientRect() { return { left: 0, top: 0, right: 300, bottom: 80 } }
  replaceChildren(...c: FakeEl[]): void { this.children = c }
  append(...c: FakeEl[]): void { this.children.push(...c) }
  setAttribute(k: string, v: string): void { this.attrs[k] = v }
  focus(): void { this.focused = true }
  send(type: string, e: Partial<TapEvent> = {}): void { for (const f of this.on.get(type) ?? []) f({ timeStamp: 1, ...e }) }
  /** Tot textul din element și din copiii lui, în ordine. */
  text(): string { return [this.textContent, ...this.children.map((c) => c.text())].filter((t) => t !== '').join(' ') }
}
const fakeDoc = () => {
  const els: Record<string, FakeEl> = {}
  for (const id of ['choiceVeil', 'choiceLevel', 'choiceSlots', 'choiceOffers']) els[id] = new FakeEl('div')
  const doc = { getElementById: (id: string) => els[id] ?? null, createElement: (tag: string) => new FakeEl(tag) }
  return { els, doc: doc as unknown as Document }
}
const finger = (id: number): Partial<TapEvent> => ({ pointerId: id, pointerType: 'touch', clientX: 50, clientY: 30 })

describe('createChoice', () => {
  const view = (): ChoiceView => choiceView(withOffer())!
  it('show pune nivelul, locurile și trei rânduri-buton; focusul pe primul', () => {
    const { els, doc } = fakeDoc(); const c = createChoice(doc, () => {})
    expect(c.open).toBe(false)
    c.show(view())
    expect([c.open, els.choiceVeil!.hidden]).toEqual([true, false])
    expect(els.choiceLevel!.textContent).toBe(STR.levelN(3))
    expect(els.choiceSlots!.children.length).toBe(4)
    const rows = els.choiceOffers!.children
    expect(rows.map((r) => [r.tag, r.type])).toEqual([['button', 'button'], ['button', 'button'], ['button', 'button']])
    expect(rows[1]!.text()).toContain('Undă')
    expect(rows[1]!.text()).toContain('Treapta 2 din 3')
    expect(rows.map((r) => r.focused)).toEqual([true, false, false])
  })
  it('o atingere pe al doilea rând cheamă onPick(1) o singură dată', () => {
    const { els, doc } = fakeDoc(); const picks: number[] = []
    const c = createChoice(doc, (i) => picks.push(i)); c.show(view())
    const row = els.choiceOffers!.children[1]!
    row.send('pointerdown', finger(1)); row.send('pointerup', finger(1)); row.send('click', finger(1))
    expect(picks).toEqual([1])
  })
  it('degetul care n-a apăsat pe rând (a pornit pe canvas) și se ridică deasupra lui nu alege nimic', () => {
    const { els, doc } = fakeDoc(); const picks: number[] = []
    const c = createChoice(doc, (i) => picks.push(i)); c.show(view())
    const row = els.choiceOffers!.children[0]!
    row.send('pointerup', finger(1)); row.send('click', finger(1))
    expect(picks).toEqual([])
  })
  it('hide închide panoul; rândurile vechi nu mai aleg nimic', () => {
    const { els, doc } = fakeDoc(); const picks: number[] = []
    const c = createChoice(doc, (i) => picks.push(i)); c.show(view())
    const row = els.choiceOffers!.children[0]!
    c.hide()
    expect([c.open, els.choiceVeil!.hidden]).toEqual([false, true])
    row.send('click', { pointerType: 'mouse' })
    expect(picks).toEqual([])
  })
})
