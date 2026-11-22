import { describe, expect, it } from 'vitest'
import { buy, emptyProfile, type Profile } from '../app/profile'
import { MAX_UPS, UP_IDS, WORKSHOP, upPrice } from '../data/workshop'
import { createShop, shopView } from './shop'
import { STR } from './strings'
import type { TapEvent } from './tap'

const rich = (): Profile => ({ ...emptyProfile(), crystal: 1000, metal: 300 })

describe('shopView', () => {
  it('profil gol: cinci rânduri, toate „poor”, cu prețul treptei 1 și rezerva 0', () => {
    const v = shopView(emptyProfile())
    expect([v.crystal, v.metal]).toEqual([0, 0])
    expect(v.rows.map((r) => r.id)).toEqual([...UP_IDS])
    expect(v.rows.map((r) => r.name)).toEqual(['Carenă', 'Armament', 'Colectare', 'Planetă', 'Arsenal de pornire'])
    for (const r of v.rows) {
      expect(r.state).toBe('poor')
      expect(r.level).toBe(0)
      expect(r.price).toEqual(upPrice(r.id, 1))
      expect(r.text.length).toBeGreaterThan(0)
    }
  })
  it('rezervă destulă: „buy”, cu prețul din upPrice pentru treapta următoare', () => {
    let p = rich()
    const r = buy(p, 'hull'); if (r.ok) p = r.value
    const row = shopView(p).rows.find((x) => x.id === 'hull')!
    expect([row.state, row.level, row.max]).toEqual(['buy', 1, WORKSHOP.hull.max])
    expect(row.price).toEqual(upPrice('hull', 2))
  })
  it('rezerva care ajunge la cristale, dar nu la metal, e tot „poor”', () => {
    const v = shopView({ ...emptyProfile(), crystal: 1000, metal: 0 })
    expect(v.rows.find((r) => r.id === 'hull')!.state).toBe('poor')
    expect(v.rows.find((r) => r.id === 'reach')!.state).toBe('buy')   // Colectarea nu cere metal
  })
  it('la plafon: „max” și fără preț', () => {
    const v = shopView({ ...rich(), ups: { ...MAX_UPS } })
    for (const r of v.rows) { expect(r.state).toBe('max'); expect(r.price).toBeNull(); expect(r.level).toBe(r.max) }
  })
  it('Arsenalul spune ce aduce treapta următoare, iar la plafon ce are', () => {
    const at = (kit: number) => shopView({ ...rich(), ups: { ...emptyProfile().ups, kit } }).rows.find((r) => r.id === 'kit')!.text
    expect([at(0), at(1), at(2), at(3)]).toEqual([STR.kitText[0], STR.kitText[1], STR.kitText[2], STR.kitText[3]])
    expect(new Set([at(0), at(1), at(2), at(3)]).size).toBe(4)
    expect(at(0)).toContain('Laser')
    expect(at(1)).toContain('Rachete')
    expect(at(2)).toContain('Scut')
  })
  it('textele rândurilor au cel mult 34 de caractere (încap pe două rânduri la 360 px)', () => {
    const all = [...Object.values(STR.upText), ...STR.kitText]
    for (const t of all) expect(t.length, t).toBeLessThanOrEqual(34)
  })
})

// Un document fals, cât îi trebuie atelierului.
class FakeEl {
  children: FakeEl[] = []
  className = ''
  textContent = ''
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
  text(): string { return [this.textContent, ...this.children.map((c) => c.text())].filter((t) => t !== '').join(' ') }
  find(pred: (e: FakeEl) => boolean): FakeEl[] { return [...(pred(this) ? [this] : []), ...this.children.flatMap((c) => c.find(pred))] }
}
const fakeDoc = () => {
  const els: Record<string, FakeEl> = {}
  for (const id of ['shopVeil', 'shopCard', 'shopCrystal', 'shopMetal', 'shopRows', 'shopBack']) els[id] = new FakeEl('div')
  const doc = { getElementById: (id: string) => els[id] ?? null, createElement: (tag: string) => new FakeEl(tag) }
  return { els, doc: doc as unknown as Document }
}
const finger = (id: number): Partial<TapEvent> => ({ pointerId: id, pointerType: 'touch', clientX: 50, clientY: 30 })

const setup = (p: Profile = rich()) => {
  const { els, doc } = fakeDoc(); const bought: string[] = []; let backs = 0
  const shop = createShop(doc, (id) => bought.push(id), () => backs++)
  shop.show(p)
  const btn = (id: string): FakeEl => els.shopRows!.find((e) => e.tag === 'button' && e.attrs['data-up'] === id)[0]!
  const tap = (b: FakeEl, id = 1): void => { b.send('pointerdown', finger(id)); b.send('pointerup', finger(id)); b.send('click', finger(id)) }
  return { els, shop, bought, btn, tap, backs: () => backs }
}

describe('createShop', () => {
  it('show: panoul se vede, rezerva e pusă, cinci rânduri, focusul pe panou și nu pe un buton', () => {
    const { els, shop } = setup()
    expect([shop.open, els.shopVeil!.hidden]).toEqual([true, false])
    expect([els.shopCrystal!.textContent, els.shopMetal!.textContent]).toEqual(['1000', '300'])
    expect(els.shopRows!.children.length).toBe(5)
    expect(els.shopCard!.focused).toBe(true)
    expect(els.shopRows!.find((e) => e.focused).length).toBe(0)
    expect(els.shopRows!.text()).toContain('Carenă')
  })
  it('o apăsare pe un buton de cumpărat cheamă onBuy o singură dată, cu întărirea lui', () => {
    const { bought, btn, tap } = setup()
    tap(btn('hull'))
    expect(bought).toEqual(['hull'])
  })
  it('un buton stins („poor”) nu cumpără', () => {
    const { bought, btn, tap } = setup(emptyProfile())
    tap(btn('hull'))
    expect(bought).toEqual([])
  })
  it('la plafon nu există buton de cumpărat și rândul spune „La plafon”', () => {
    const { els } = setup({ ...rich(), ups: { ...MAX_UPS } })
    expect(els.shopRows!.find((e) => e.tag === 'button').length).toBe(0)
    expect(els.shopRows!.text()).toContain('La plafon')
  })
  it('pointerup și click fără pointerdown pe buton (apăsarea a început în altă parte) nu cumpără', () => {
    const { bought, btn } = setup()
    const b = btn('arms')
    b.send('pointerup', finger(1)); b.send('click', finger(1))
    expect(bought).toEqual([])
  })
  it('degetul ridicat în afara butonului nu cumpără', () => {
    const { bought, btn } = setup()
    const b = btn('arms')
    b.send('pointerdown', finger(1)); b.send('pointerup', { ...finger(1), clientX: 900 })
    expect(bought).toEqual([])
  })
  it('un clic de la tastatură (fără pointer) cumpără', () => {
    const { bought, btn } = setup()
    btn('core').send('click', { pointerType: '' })
    expect(bought).toEqual(['core'])
  })
  it('show din nou cu alt profil reface rândurile; butoanele vechi nu mai cumpără', () => {
    const { shop, bought, btn, tap, els } = setup()
    const old = btn('hull')
    const p = buy(rich(), 'hull'); if (!p.ok) throw new Error('buy')
    shop.show(p.value)
    expect(els.shopCrystal!.textContent).toBe(String(p.value.crystal))
    tap(old)
    expect(bought).toEqual([])
    tap(btn('hull'))
    expect(bought).toEqual(['hull'])
  })
  it('show cu același profil nu atinge rândurile (aceleași butoane)', () => {
    const { shop, btn } = setup()
    const b = btn('hull')
    shop.show(rich())
    expect(btn('hull')).toBe(b)
  })
  it('după hide, butoanele vechi nu mai cumpără, iar panoul e ascuns', () => {
    const { shop, els, bought, btn, tap } = setup()
    const b = btn('hull')
    shop.hide()
    expect([shop.open, els.shopVeil!.hidden]).toEqual([false, true])
    tap(b)
    expect(bought).toEqual([])
  })
  it('un nou show după hide face rânduri noi: o apăsare începută înainte de deschidere nu cumpără', () => {
    const { shop, bought, btn, tap } = setup()
    const b = btn('hull')
    b.send('pointerdown', finger(1))
    shop.hide(); shop.show(rich())
    b.send('pointerup', finger(1))
    expect(bought).toEqual([])
    tap(btn('hull'))
    expect(bought).toEqual(['hull'])
  })
  it('„Înapoi” cheamă onBack; închis, nu', () => {
    const { shop, els, backs, tap } = setup()
    tap(els.shopBack!)
    expect(backs()).toBe(1)
    shop.hide()
    tap(els.shopBack!)
    expect(backs()).toBe(1)
  })
  it('cumpărarea cu tastatura mută focusul pe butonul rândului refăcut', () => {
    const { els, doc } = fakeDoc()
    const after = buy(rich(), 'hull'); if (!after.ok) throw new Error('buy')
    const shop = createShop(doc, () => shop.show(after.value), () => {})
    shop.show(rich())
    const find = (id: string) => els.shopRows!.find((e) => e.tag === 'button' && e.attrs['data-up'] === id)[0]!
    find('hull').send('click', { pointerType: '' })
    expect(find('hull').focused).toBe(true)
    expect(els.shopRows!.find((e) => e.focused).length).toBe(1)
  })
})
