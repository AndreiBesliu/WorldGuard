import { describe, expect, it } from 'vitest'
import { createGame, type GameState } from '../sim/state'
import { CHOICE_GRACE_MS, choiceView, createChoice } from './choice'
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
    expect(choiceView(withOffer())!.slots).toEqual([{ kind: 'weapon', id: 'wave' }, { kind: 'body', id: 'armor' }, { kind: 'free' }, { kind: 'locked' }])
    const s = withOffer(); s.hero.lvl = 9
    expect(choiceView(s)!.slots.map((v) => v.kind)).toEqual(['weapon', 'body', 'free', 'free', 'free', 'free'])   // la nivelul maxim nu mai e nimic de deschis
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
  for (const id of ['choiceVeil', 'choiceCard', 'choiceLevel', 'choiceSlots', 'choiceOffers']) els[id] = new FakeEl('div')
  const doc = { getElementById: (id: string) => els[id] ?? null, createElement: (tag: string) => new FakeEl(tag) }
  return { els, doc: doc as unknown as Document }
}
const finger = (id: number): Partial<TapEvent> => ({ pointerId: id, pointerType: 'touch', clientX: 50, clientY: 30 })

// Panoul pe un document fals, cu un ceas fals în milisecunde; `at(ms)` mută ceasul la `ms` de la deschidere.
const setup = () => {
  const { els, doc } = fakeDoc(); const picks: number[] = []
  let ms = 1000
  const c = createChoice(doc, (i) => picks.push(i), () => ms)
  c.show(choiceView(withOffer())!)
  const opened = ms
  const at = (t: number): void => { ms = opened + t }
  const row = (i: number): FakeEl => els.choiceOffers!.children[i]!
  const tap = (i: number, id = 1): void => { row(i).send('pointerdown', finger(id)); row(i).send('pointerup', finger(id)); row(i).send('click', finger(id)) }
  return { els, c, picks, at, row, tap }
}

describe('createChoice', () => {
  it('show pune nivelul, locurile și trei rânduri-buton', () => {
    const { els, c } = setup()
    expect([c.open, els.choiceVeil!.hidden]).toEqual([true, false])
    expect(els.choiceLevel!.textContent).toBe(STR.levelN(3))
    expect(els.choiceSlots!.children.length).toBe(4)
    const rows = els.choiceOffers!.children
    expect(rows.map((r) => [r.tag, r.type])).toEqual([['button', 'button'], ['button', 'button'], ['button', 'button']])
    expect(rows[1]!.text()).toContain('Undă')
    expect(rows[1]!.text()).toContain('Treapta 2 din 3')
  })
  it('focusul la deschidere stă pe cartonaș, nu pe o ofertă: Enter sau Spațiu apăsate din reflex n-au ce rând să aleagă', () => {
    const { els } = setup()
    expect(els.choiceCard!.focused).toBe(true)
    expect(els.choiceOffers!.children.map((r) => r.focused)).toEqual([false, false, false])
  })
  it('o atingere pe al doilea rând, după fereastra de început, cheamă onPick(1) o singură dată', () => {
    const { picks, at, tap } = setup()
    at(CHOICE_GRACE_MS + 100)
    tap(1)
    expect(picks).toEqual([1])
  })
  it('fereastra de început: o apăsare completă la 100 ms nu alege; la 500 ms alege', () => {
    const { picks, at, tap } = setup()
    at(100); tap(0)
    expect(picks).toEqual([])
    at(500); tap(0, 2)
    expect(picks).toEqual([0])
  })
  it('o apăsare începută la 300 ms și ridicată la 500 ms nu alege: trebuie să înceapă după fereastră', () => {
    const { picks, at, row } = setup()
    at(300); row(2).send('pointerdown', finger(1))
    at(500); row(2).send('pointerup', finger(1)); row(2).send('click', finger(1))
    expect(picks).toEqual([])
  })
  it('un clic de la tastatură (fără pointer) trece prin aceeași fereastră', () => {
    const { picks, at, row } = setup()
    at(100); row(0).send('click', { pointerType: '' })
    expect(picks).toEqual([])
    at(500); row(0).send('click', { pointerType: '' })
    expect(picks).toEqual([0])
  })
  it('tastele 1–3 (key): la 100 ms nimic, la 500 ms aleg', () => {
    const { c, picks, at } = setup()
    at(100); c.key(0)
    expect(picks).toEqual([])
    at(500); c.key(0)
    expect(picks).toEqual([0])
  })
  it('după hide și un nou show, fereastra pornește din nou', () => {
    const { c, picks, at } = setup()
    at(500); c.hide()
    c.show(choiceView(withOffer())!)              // redeschis la 500 ms
    at(600); c.key(1)
    expect(picks).toEqual([])
    at(500 + CHOICE_GRACE_MS + 1); c.key(1)
    expect(picks).toEqual([1])
  })
  it('degetul care n-a apăsat pe rând (a pornit pe canvas) și se ridică deasupra lui nu alege nimic', () => {
    const { picks, at, row } = setup()
    at(1000)
    row(0).send('pointerup', finger(1)); row(0).send('click', finger(1))
    expect(picks).toEqual([])
  })
  it('hide închide panoul; rândurile vechi și tastele nu mai aleg nimic', () => {
    const { els, c, picks, at, row } = setup()
    at(1000)
    const old = row(0)
    c.hide()
    expect([c.open, els.choiceVeil!.hidden]).toEqual([false, true])
    old.send('click', { pointerType: 'mouse' }); c.key(0)
    expect(picks).toEqual([])
  })
})
