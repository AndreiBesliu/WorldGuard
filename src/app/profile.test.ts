import { describe, expect, it } from 'vitest'
import { MAX_UPS, WORKSHOP, upPrice } from '../data/workshop'
import { bank, buy, canBuy, emptyProfile, markExplored, packProfile, unpackProfile, type Profile } from './profile'

const rich = (): Profile => ({ crystal: 1000, metal: 1000, sector: 2, ups: { hull: 1, arms: 0, reach: 2, core: 3, kit: 0 } })
const raw = (o: object) => JSON.stringify(o)
const good = () => JSON.parse(packProfile(rich())) as { v: number; crystal: number; metal: number; sector: number; ups: Record<string, number> }

it('dus-întors dă același profil', () => {
  const p = rich()
  const r = unpackProfile(packProfile(p))
  expect(r).toEqual({ ok: true, value: p })
  expect(unpackProfile(packProfile(emptyProfile()))).toEqual({ ok: true, value: emptyProfile() })
})

describe('un profil stricat e respins, cu motiv', () => {
  const bad = (text: string | null | undefined) => { const r = unpackProfile(text); expect(r.ok).toBe(false); if (!r.ok) expect(r.reason.length).toBeGreaterThan(0) }
  it('lipsă', () => { bad(null); bad(undefined); bad('') })
  it('text care nu e JSON', () => bad('nu e json'))
  it('altă versiune', () => bad(raw({ ...good(), v: 99 })))
  it('rezervă negativă', () => { bad(raw({ ...good(), crystal: -1 })); bad(raw({ ...good(), metal: -5 })) })
  it('NaN (scris ca null)', () => { bad(raw({ ...good(), crystal: NaN })); bad(raw({ ...good(), ups: { ...good().ups, hull: NaN } })) })
  it('număr neîntreg', () => { bad(raw({ ...good(), crystal: 1.5 })); bad(raw({ ...good(), sector: 0.5 })); bad(raw({ ...good(), ups: { ...good().ups, arms: 1.5 } })) })
  it('treaptă peste plafon', () => bad(raw({ ...good(), ups: { ...good().ups, reach: 4 } })))
  it('treaptă negativă', () => bad(raw({ ...good(), ups: { ...good().ups, core: -1 } })))
  it('întărire lipsă', () => { const g = good(); delete g.ups.kit; bad(raw(g)) })
  it('sector negativ', () => bad(raw({ ...good(), sector: -1 })))
  it('altă formă: câmp în plus sau ups care nu e obiect', () => { bad(raw({ ...good(), extra: 1 })); bad(raw({ ...good(), ups: 3 })); bad('[]') })
})

describe('buy', () => {
  it('scade exact prețul și urcă o treaptă; profilul vechi rămâne neatins', () => {
    const p = rich(); const before = JSON.stringify(p)
    const price = upPrice('arms', 1)
    const r = buy(p, 'arms')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.ups.arms).toBe(1)
      expect(r.value.crystal).toBe(p.crystal - price.crystal)
      expect(r.value.metal).toBe(p.metal - price.metal)
      expect(r.value.sector).toBe(p.sector)
    }
    expect(JSON.stringify(p)).toBe(before)
  })
  it('refuză la plafon', () => {
    const p = { ...rich(), ups: MAX_UPS }
    for (const id of Object.keys(MAX_UPS) as (keyof typeof MAX_UPS)[]) { expect(buy(p, id).ok).toBe(false); expect(canBuy(p, id).ok).toBe(false) }
  })
  it('refuză cu rezervă prea mică, la cristale sau la metal', () => {
    const p = { ...rich(), crystal: upPrice('hull', 2).crystal - 5 }
    const r = buy(p, 'hull'); expect(r.ok).toBe(false); if (!r.ok) expect(r.reason.length).toBeGreaterThan(0)
    expect(buy({ ...rich(), metal: 0 }, 'hull').ok).toBe(false)
    expect(JSON.stringify(p.ups)).toBe(JSON.stringify(rich().ups))
  })
  it('canBuy dă prețul treptei următoare', () => {
    const r = canBuy(rich(), 'core')
    expect(r).toEqual({ ok: true, value: upPrice('core', 4) })
  })
  it('o întărire cu preț fără metal se poate cumpăra cu zero metal', () => {
    expect(buy({ ...emptyProfile(), crystal: 50 }, 'reach').ok).toBe(true)
  })
  it('toate treptele se pot cumpăra cu rezerva destulă, până la plafon', () => {
    let p: Profile = { ...emptyProfile(), crystal: 1e6, metal: 1e6 }
    for (const id of Object.keys(MAX_UPS) as (keyof typeof MAX_UPS)[]) {
      for (let i = 0; i < WORKSHOP[id].max; i++) { const r = buy(p, id); expect(r.ok).toBe(true); if (r.ok) p = r.value }
    }
    expect(p.ups).toEqual(MAX_UPS)
  })
})

describe('bank', () => {
  it('adună ce s-a adus; profilul vechi rămâne neatins', () => {
    const p = rich()
    expect(bank(p, { crystal: 7, metal: 3 })).toMatchObject({ crystal: 1007, metal: 1003 })
    expect(p.crystal).toBe(1000)
  })
  it('valorile negative sau nefinite nu schimbă nimic', () => {
    const p = rich()
    for (const h of [{ crystal: -1, metal: 5 }, { crystal: 5, metal: -1 }, { crystal: NaN, metal: 1 }, { crystal: 1, metal: Infinity }]) {
      expect(bank(p, h)).toEqual(p)
    }
  })
})

describe('markExplored', () => {
  it('urcă sectorul, nu-l coboară', () => {
    const p = rich()
    expect(markExplored(p, 5).sector).toBe(5)
    expect(markExplored(p, 1).sector).toBe(2)
    expect(markExplored(p, 2).sector).toBe(2)
    expect(p.sector).toBe(2)
  })
  it('un sector nefinit, negativ sau neîntreg nu schimbă nimic', () => {
    for (const s of [NaN, -3, 1.5, Infinity]) expect(markExplored(rich(), s)).toEqual(rich())
  })
})
