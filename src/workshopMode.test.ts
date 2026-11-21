import { describe, expect, it } from 'vitest'
import { emptyProfile, type Profile } from './app/profile'
import { buyStep } from './workshopMode'

describe('buyStep', () => {
  const memory = (p: Profile) => { let cur = p; return { load: () => cur, save: (n: Profile) => { cur = n }, get: () => cur } }
  it('citește din stocare, cumpără, salvează și întoarce profilul nou', () => {
    const m = memory({ ...emptyProfile(), crystal: 100, metal: 20 })
    const r = buyStep(m.load, m.save, 'hull')
    expect(r.ups.hull).toBe(1)
    expect(m.get()).toBe(r)
    expect(r.crystal).toBe(50)
  })
  it('două apăsări repezi: a doua trepte doar dacă rezerva ajunge pentru amândouă', () => {
    const m = memory({ ...emptyProfile(), crystal: 100, metal: 20 })
    buyStep(m.load, m.save, 'hull')            // 50 + 10
    expect(m.get().crystal).toBe(50)
    buyStep(m.load, m.save, 'hull')            // 85 + 15: nu ajunge
    expect(m.get().ups.hull).toBe(1)
    expect(m.get().crystal).toBe(50)
  })
  it('scade din ce e acum în stocare, nu dintr-un profil ținut de dinainte', () => {
    const m = memory({ ...emptyProfile(), crystal: 200, metal: 50 })
    const stale = m.get()
    m.save({ ...stale, crystal: 60 })           // alt zbor a schimbat rezerva între timp
    expect(buyStep(m.load, m.save, 'reach').crystal).toBe(20)
  })
  it('refuzul nu scrie nimic', () => {
    let writes = 0
    const m = memory(emptyProfile())
    buyStep(m.load, (p) => { writes++; m.save(p) }, 'hull')
    expect(writes).toBe(0)
  })
})
