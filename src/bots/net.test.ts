// Plasa pentru dificultate: limitele din design (docs/GDD.md) ca teste care pică build-ul.
// Un singur parcurs al celor 100 de partide pentru tot fișierul; fiecare limită e un test separat.
import { beforeAll, describe, expect, it } from 'vitest'
import { verdicts, type Verdict } from './limits'
import { POLICIES, type BotName } from './policy'
import { measureAll, RUN_CAP, SEEDS, type Row } from './run'

let rows: Row[] = []
let vs: Verdict[] = []

beforeAll(() => {
  rows = measureAll()
  vs = verdicts(rows)
}, 120_000)

const verdictOf = (name: BotName) => vs.find((v) => v.name === name)!

describe('plasa pentru dificultate', { timeout: 120_000 }, () => {
  it('un verdict pe jucător, câte cinci', () => {
    expect(vs).toHaveLength(5)
    expect(vs.map((v) => v.name)).toEqual(POLICIES.map((p) => p.name))
  })
  for (const name of ['nimic', 'amestec', 'doar-nava', 'fara-nava'] as const) {
    it(`limita pentru ${POLICIES.find((p) => p.name === name)!.label}`, () => {
      const v = verdictOf(name)
      expect(v.ok, `${v.label}: ${v.value}, limita ${v.limit}`).toBe(true)
    })
  }
  it('fiecare partidă s-a încheiat înainte de marginea testului', () => {
    const long = rows.flatMap((r) => r.times.flatMap((t, i) => (t < RUN_CAP ? [] : [`${r.label}, sămânța ${SEEDS[i]}: ${t} s`])))
    expect(long).toEqual([])
  })
})
