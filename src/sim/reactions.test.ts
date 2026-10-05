import { describe, expect, it } from 'vitest'
import { ENEMIES, type EnemyType } from '../data/enemies'
import { ELEMENT_NAMES, REACTION_RULES, REACTIONS, STATES, TAG_NAMES, type ReactionType, type StateType } from '../data/reactions'
import { TOWERS } from '../data/towers'
import { checkBuild, coverage, fingerprint, newGame, pathContacts, step, towerCost, towerRange, type GameState } from './game'
import { key, neighbors } from './hex'
import { applyContact, enemySpeed, hasTag, STATE_ORDER, tickStates, type Contact, type ReactionContext, type States, type Victim } from './reactions'
import { must, runWave, startWave } from './testkit'

// Inamici de test pe o linie: `pos` e hexagonul (vecini = |pos − pos'| ≤ rază).
type V = Victim & { pos: number }
const enemy = (id: number, pos: number, stari: States = {}, tip: EnemyType = 'normal', viata = 100): V => ({
  id,
  tip,
  viata,
  stari: { ...stari },
  pos,
})
function world(...vs: V[]): { ctx: ReactionContext<V>; events: [ReactionType, number][] } {
  const events: [ReactionType, number][] = []
  const ctx: ReactionContext<V> = {
    neighbors: (v, r) => vs.filter((n) => n !== v && n.viata > 0 && Math.abs(n.pos - v.pos) <= r),
    emit: (t, v) => events.push([t, v.id]),
  }
  return { ctx, events }
}
const hit = (tower: keyof typeof TOWERS): Contact => ({ element: TOWERS[tower].element, dauna: TOWERS[tower].dauna, aplica: TOWERS[tower].aplica })
const water: Contact = { element: 'apa', dauna: 0, aplica: 'ud' }
const keys = (v: V): StateType[] => STATE_ORDER.filter((s) => v.stari[s] !== undefined)

describe('datele reacțiilor', () => {
  it('fiecare regulă folosește un element, o etichetă și o reacție care există, iar eticheta o poartă o stare', () => {
    for (const r of REACTION_RULES) {
      expect(ELEMENT_NAMES[r.element]).toBeDefined()
      expect(TAG_NAMES[r.eticheta]).toBeDefined()
      expect(REACTIONS[r.tip]).toBeDefined()
      expect(STATE_ORDER.some((s) => STATES[s].etichete.includes(r.eticheta))).toBe(true)
      if (r.inlocuieste) expect(STATES[r.inlocuieste]).toBeDefined()
    }
  })

  it('cele 6 reacții din GDD §6 au fiecare cel puțin o regulă', () => {
    expect(new Set(REACTION_RULES.map((r) => r.tip))).toEqual(new Set(Object.keys(REACTIONS)))
    expect(Object.keys(REACTIONS)).toHaveLength(6)
  })
})

describe('reacțiile, una câte una', () => {
  it('fără stări, lovitura doar lovește și lasă starea turnului', () => {
    const a = enemy(1, 0)
    const { ctx, events } = world(a)
    applyContact(a, hit('foc'), ctx)
    expect(a.viata).toBe(100 - TOWERS.foc.dauna)
    expect(keys(a)).toEqual(['arde'])
    expect(events).toEqual([])
  })

  it('explozie: focul pe un inamic uns — 50 în jur, iar unșii de alături explodează și ei (în lanț)', () => {
    const a = enemy(1, 0, { uns: 100 })
    const b = enemy(2, 1, { uns: 100 })
    const c = enemy(3, 2) // neuns, lângă B: primește doar dauna lui B
    const d = enemy(4, 5, { uns: 100 }) // departe: nu se atinge
    const { ctx, events } = world(a, b, c, d)
    applyContact(a, hit('foc'), ctx)
    expect(events).toEqual([
      ['explozie', 1],
      ['explozie', 2],
    ])
    expect(a.viata).toBe(100 - 50 - 50 - TOWERS.foc.dauna) // zona lui, zona lui B, lovitura
    expect(b.viata).toBe(100 - 50 - 50)
    expect(c.viata).toBe(100 - 50)
    expect(d.viata).toBe(100)
    expect(hasTag(a, 'inflamabil') || hasTag(b, 'inflamabil')).toBe(false) // uleiul s-a consumat
    expect(hasTag(d, 'inflamabil')).toBe(true)
  })

  it('abur: focul pe un inamic ud — udul dispare și flacăra nu mai prinde; lovitura trece', () => {
    const a = enemy(1, 0, { ud: 30 })
    const { ctx, events } = world(a)
    applyContact(a, hit('foc'), ctx)
    expect(events).toEqual([['abur', 1]])
    expect(keys(a)).toEqual([])
    expect(a.viata).toBe(100 - TOWERS.foc.dauna)
  })

  it('abur: apa pe un inamic care arde — se sting amândouă', () => {
    const a = enemy(1, 0, { arde: 30 })
    const { ctx, events } = world(a)
    applyContact(a, water, ctx)
    expect(events).toEqual([['abur', 1]])
    expect(keys(a)).toEqual([])
    expect(a.viata).toBe(100)
  })

  it('dezgheț: focul topește frigul (răcit și înghețat), iar flacăra prinde', () => {
    const a = enemy(1, 0, { racit: 10, inghetat: 10 })
    const { ctx, events } = world(a)
    applyContact(a, hit('foc'), ctx)
    expect(events).toEqual([['dezghet', 1]])
    expect(keys(a)).toEqual(['arde'])
  })

  it('dezgheț: frigul stinge focul, dar nu prinde nici el', () => {
    const a = enemy(1, 0, { arde: 30 })
    const { ctx, events } = world(a)
    applyContact(a, hit('frig'), ctx)
    expect(events).toEqual([['dezghet', 1]])
    expect(keys(a)).toEqual([])
    expect(a.viata).toBe(100 - TOWERS.frig.dauna)
  })

  it('îngheț: frigul pe un inamic ud îl îngheață de tot, în loc să-l răcească', () => {
    const a = enemy(1, 0, { ud: 30 })
    const { ctx, events } = world(a)
    applyContact(a, hit('frig'), ctx)
    expect(events).toEqual([['inghet', 1]])
    expect(keys(a)).toEqual(['inghetat'])
    expect(a.stari.inghetat).toBe(STATES.inghetat.durata)
  })

  it('spargere: lovitura fizică pe un înghețat face ×3 (înainte de armură) și sparge doar gheața', () => {
    const a = enemy(1, 0, { inghetat: 10, racit: 10 })
    const b = enemy(2, 3, { inghetat: 10 }, 'blindat', 500)
    const { ctx, events } = world(a, b)
    applyContact(a, hit('fizic'), ctx)
    applyContact(b, hit('fizic'), ctx)
    expect(events).toEqual([
      ['spargere', 1],
      ['spargere', 2],
    ])
    expect(a.viata).toBe(100 - 3 * TOWERS.fizic.dauna)
    expect(b.viata).toBe(500 - (3 * TOWERS.fizic.dauna - ENEMIES.blindat.armura))
    expect(keys(a)).toEqual(['racit']) // răcitul rămâne: nu e fragil
  })

  it('electrocutare: fulgerul pe un ud sare, din aproape în aproape, doar la vecinii uzi — cu procentul și limita din date', () => {
    const rule = REACTION_RULES.find((r) => r.tip === 'electrocutare')!
    const a = enemy(1, 0, { ud: 30 })
    const b = enemy(2, 1, { ud: 30 })
    const c = enemy(3, 2, { ud: 30 }) // prins prin B
    const d = enemy(4, 3, { ud: 30 }) // ar fi al treilea în lanț: peste limită
    const dry = enemy(5, 1) // lângă A, dar uscat
    const far = enemy(6, 6, { ud: 30 }) // ud, dar departe
    const { ctx, events } = world(a, b, c, d, dry, far)
    applyContact(a, hit('fulger'), ctx)
    expect(rule.lant?.maxim).toBe(2)
    expect(events).toEqual([
      ['electrocutare', 1],
      ['electrocutare', 2],
      ['electrocutare', 3],
    ])
    const chained = Math.floor((TOWERS.fulger.dauna * rule.lant!.procent!) / 100)
    expect(a.viata).toBe(100 - TOWERS.fulger.dauna)
    for (const v of [b, c]) expect(v.viata).toBe(100 - chained)
    for (const v of [d, dry, far]) expect(v.viata).toBe(100)
    expect(hasTag(a, 'ud')).toBe(true) // udul rămâne
  })
})

describe('stările în timp', () => {
  it('arsura: 6 daune la fiecare 10 tick-uri, trece de armură, apoi starea dispare', () => {
    const a = enemy(1, 0, { arde: STATES.arde.durata }, 'blindat', 500)
    for (let t = 0; t < 10; t++) tickStates(a)
    expect(a.viata).toBe(500 - 6)
    for (let t = 10; t < STATES.arde.durata; t++) tickStates(a)
    expect(a.viata).toBe(500 - 6 * (STATES.arde.durata / 10))
    expect(keys(a)).toEqual([])
  })

  it('viteza: răcit încetinește cu procentul lui, înghețat oprește, iar încetinirile nu se adună', () => {
    expect(enemySpeed({ tip: 'normal', stari: {} })).toBe(ENEMIES.normal.viteza)
    expect(enemySpeed({ tip: 'normal', stari: { racit: 5 } })).toBe(Math.floor((ENEMIES.normal.viteza * (100 - STATES.racit.incetinire!)) / 100))
    expect(enemySpeed({ tip: 'normal', stari: { racit: 5 } })).toBeLessThan(ENEMIES.normal.viteza)
    expect(enemySpeed({ tip: 'normal', stari: { inghetat: 5 } })).toBe(0)
    expect(enemySpeed({ tip: 'normal', stari: { inghetat: 5, racit: 5 } })).toBe(0)
  })
})

describe('terenul în reacții', () => {
  /** O hartă cu drumul drept, apă doar unde spune `apa`, câmpie în rest; fără ocol obligatoriu. */
  function setup(seed: number, apa: (k: string, s: GameState) => boolean): GameState {
    const s0 = newGame(seed)
    const onPath = new Set(s0.path.map(key))
    const terrain = new Map([...s0.map.terrain].map(([k]) => [k, onPath.has(k) ? ('campie' as const) : apa(k, s0) ? ('apa' as const) : ('campie' as const)]))
    return { ...s0, map: { ...s0.map, terrain }, ocoluriPeVal: 0 }
  }

  it('apa udă inamicul exact când intră pe un hexagon de drum vecin cu ea', () => {
    const wet = new Set(neighbors({ q: -3, r: 0 }).map(key).filter((k) => k.endsWith(',-1')))
    let s = must(setup(4, (k) => wet.has(k)), { tip: 'pornesteVal' })
    const contacts = pathContacts(s)
    const expected = s.path.map((_, i) => i).filter((i) => contacts[i] !== undefined)
    expect(expected.length).toBeGreaterThan(0)
    // Primul inamic: la ce hexagon a primit udul proaspăt?
    const freshAt: number[] = []
    let last = -1
    let seen = false
    for (let t = 0; t < 5000 && s.faza === 'val'; t++) {
      s = step(s)
      const e = s.inamici.find((x) => x.id === 1)
      if (!e) {
        if (seen) break // a ajuns la bază
        continue // încă n-a apărut
      }
      seen = true
      const at = Math.floor((e.progres + 500) / 1000)
      if (at !== last && e.stari.ud === STATES.ud.durata) freshAt.push(at)
      // Cât stă pe același hexagon, udul nu se reîmprospătează: doar scade.
      if (at === last && e.stari.ud !== undefined) expect(e.stari.ud).toBeLessThan(STATES.ud.durata)
      last = at
    }
    expect(seen).toBe(true)
    expect(freshAt).toEqual(expected)
  })

  it('apă + frig: inamicii îngheață, dar nu rămân prinși — valul se termină', () => {
    // Apă pe tot rândul de deasupra drumului; turnuri de frig dedesubt, la mijloc.
    let s = setup(4, (k) => k.endsWith(',-1'))
    s = { ...s, aur: 1000 }
    for (const q of [-2, 0, 2]) s = must(s, { tip: 'turn', turn: 'frig', hex: `${q},1` })
    s = runWave(must(s, { tip: 'pornesteVal' }), 20_000)
    expect(s.faza).not.toBe('val')
    expect(s.reactii.inghet ?? 0).toBeGreaterThan(0)
  })
})

describe('amprenta', () => {
  it('stările inamicilor și numărătorile reacțiilor intră în amprentă', () => {
    let s = startWave(newGame(3))
    while (s.inamici.length === 0) s = step(s)
    const e = s.inamici[0]!
    const wet: GameState = { ...s, inamici: [{ ...e, stari: { ...e.stari, ud: 7 } }, ...s.inamici.slice(1)] }
    const wetter: GameState = { ...s, inamici: [{ ...e, stari: { ...e.stari, ud: 8 } }, ...s.inamici.slice(1)] }
    expect(fingerprint(wet)).not.toBe(fingerprint(s))
    expect(fingerprint(wet)).not.toBe(fingerprint(wetter))
    expect(fingerprint({ ...s, reactii: { inghet: 1 } })).not.toBe(fingerprint(s))
  })
})

describe('dealul', () => {
  it('dă rază +1 și costă 20 de aur în plus; refuzul de aur spune „pe deal”', () => {
    const s0 = newGame(7)
    const hill = [...s0.map.terrain].find(([k, t]) => t === 'deal' && checkBuild(s0, 'fizic', k).ok)
    expect(hill).toBeDefined()
    const hex = hill![0]
    expect(towerRange(s0, 'fizic', hex)).toBe(TOWERS.fizic.raza + 1)
    expect(towerCost(s0, 'fizic', hex)).toBe(TOWERS.fizic.cost + 20)
    const built = must(s0, { tip: 'turn', turn: 'fizic', hex })
    expect(built.aur).toBe(s0.aur - TOWERS.fizic.cost - 20)
    const wider = coverage(s0.path, hex, towerRange(s0, 'fizic', hex)).filter(Boolean).length
    const plain = coverage(s0.path, hex, TOWERS.fizic.raza).filter(Boolean).length
    expect(wider).toBeGreaterThanOrEqual(plain)
    expect(checkBuild({ ...s0, aur: 60 }, 'fizic', hex)).toEqual({
      ok: false,
      reason: `nu ajunge aurul: turnul Fizic pe deal costă ${TOWERS.fizic.cost + 20}, ai 60`,
    })
  })
})
