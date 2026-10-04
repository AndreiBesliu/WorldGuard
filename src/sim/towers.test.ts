import { describe, expect, it } from 'vitest'
import { ENEMIES } from '../data/enemies'
import { AUR_START, TOWERS, type TowerType } from '../data/towers'
import {
  applyDecision,
  checkBuild,
  coverage,
  damageAfterArmor,
  fingerprint,
  newGame,
  pickTarget,
  replay,
  step,
  towerKeys,
  type Decision,
  type GameState,
} from './game'
import { distance, fromKey, key } from './hex'
import { optionsAround } from './path'

const must = (s: GameState, d: Decision): GameState => {
  const r = applyDecision(s, d)
  if (!r.ok) throw new Error(r.reason)
  return r.value
}

const runWave = (s: GameState): GameState => {
  let cur = s
  while (cur.faza === 'val') cur = step(cur)
  return cur
}

/** Hexagonul liber care acoperă cele mai multe hexagoane de drum (primul, la egalitate). */
function bestHex(s: GameState, tip: TowerType): string {
  let best: string | undefined
  let bestN = -1
  for (const k of s.map.terrain.keys()) {
    if (!checkBuild(s, tip, k).ok) continue
    const n = coverage(s.path, k, TOWERS[tip].raza).filter(Boolean).length
    if (n > bestN) {
      best = k
      bestN = n
    }
  }
  if (!best) throw new Error('niciun hexagon liber')
  return best
}

const build = (s: GameState, tip: TowerType): GameState => must(s, { tip: 'turn', turn: tip, hex: bestHex(s, tip) })

describe('construcția', () => {
  it('turnul costă aur, primește un id și țintește implicit pe primul', () => {
    const s = build(newGame(3), 'fizic')
    expect(s.aur).toBe(AUR_START - TOWERS.fizic.cost)
    expect(s.turnuri).toEqual([{ id: 1, tip: 'fizic', hex: s.turnuri[0]!.hex, tintire: 'primul', reincarcare: 0 }])
    expect(s.jurnal.at(-1)!.d.tip).toBe('turn')
  })

  it('refuzurile spun de ce', () => {
    const s = newGame(3)
    const onPath = key(s.path[4]!)
    expect(checkBuild(s, 'fizic', onPath)).toEqual({ ok: false, reason: 'pe drum nu se construiește' })
    const water = [...s.map.terrain].find(([, t]) => t === 'apa')![0]
    expect(checkBuild(s, 'fizic', water)).toEqual({ ok: false, reason: 'pe apă nu se construiește' })
    const withTower = build(s, 'fizic')
    expect(checkBuild(withTower, 'foc', withTower.turnuri[0]!.hex)).toEqual({ ok: false, reason: 'aici e deja un turn' })
    const poor = build(withTower, 'fizic') // 120 − 2×55 = 10
    // hexagonul liber se caută cu aur din belșug, ca refuzul să vină doar din aur
    expect(checkBuild(poor, 'fulger', bestHex({ ...poor, aur: 1e9 }, 'fulger'))).toEqual({
      ok: false,
      reason: `nu ajunge aurul: turnul Fulger costă ${TOWERS.fulger.cost}, ai ${poor.aur}`,
    })
    const inWave = must(s, { tip: 'pornesteVal' })
    expect(applyDecision(inWave, { tip: 'turn', turn: 'fizic', hex: bestHex(s, 'fizic') })).toEqual({
      ok: false,
      reason: 'turnurile se construiesc doar între valuri',
    })
  })

  it('drumul nu trece prin turnuri: ocolul e refuzat cu motiv și nu mai apare printre variante', () => {
    let s = newGame(11)
    let index = 1
    while (optionsAround(s.map, s.path, index, 2).length === 0) index++
    const options = optionsAround(s.map, s.path, index, 2)
    const o = options[0]!
    const blockedHex = key(o.hexes[0]!)
    s = must(s, { tip: 'turn', turn: 'fizic', hex: blockedHex })
    const r = applyDecision(s, { tip: 'ocol', start: o.start, span: o.span, hexuri: o.hexes.map(key) })
    expect(r).toEqual({ ok: false, reason: `pe ${blockedHex} e un turn — drumul nu trece prin turnuri` })
    const after = optionsAround(s.map, s.path, index, 2, towerKeys(s))
    expect(after.some((x) => x.hexes.some((h) => key(h) === blockedHex))).toBe(false)
    expect(after.length).toBeLessThan(options.length)
  })
})

describe('țintirea', () => {
  const c = (id: number, viata: number, progres: number) => ({ id, viata, progres })

  it('fiecare mod alege după regula lui, iar egalitățile se rup mereu la fel', () => {
    const list = [c(1, 50, 3000), c(2, 80, 5000), c(3, 20, 1000), c(4, 80, 2000), c(5, 20, 1000)]
    expect(pickTarget(list, 'primul')?.id).toBe(2)
    expect(pickTarget(list, 'ultimul')?.id).toBe(3) // 3 și 5 la egalitate: câștigă id-ul mai mic
    expect(pickTarget(list, 'puternic')?.id).toBe(2) // 2 și 4 la egalitate de viață: cel mai aproape de bază
    expect(pickTarget(list, 'slab')?.id).toBe(3)
    expect(pickTarget([], 'primul')).toBeUndefined()
  })

  it('raza e distanța pe grilă până la hexagonul de drum', () => {
    const s = newGame(5)
    const hex = bestHex(s, 'fulger')
    const cov = coverage(s.path, hex, TOWERS.fulger.raza)
    s.path.forEach((h, i) => expect(cov[i]).toBe(distance(fromKey(hex), h) <= TOWERS.fulger.raza))
  })

  it('ținta se poate schimba în timpul valului; replay-ul o reproduce la tick-ul ei', () => {
    let s = build(build(newGame(8), 'fizic'), 'fizic')
    s = must(s, { tip: 'pornesteVal' })
    for (let t = 0; t < 120; t++) s = step(s)
    s = must(s, { tip: 'tintire', turn: 1, mod: 'ultimul' })
    expect(s.jurnal.at(-1)).toEqual({ la: s.tick, d: { tip: 'tintire', turn: 1, mod: 'ultimul' } })
    for (let t = 0; t < 120; t++) s = step(s)
    expect(fingerprint(replay(8, s.jurnal, s.tick))).toBe(fingerprint(s))
  })

  it('refuzuri: turnul de zonă n-are țintă de ales, modul repetat, partida încheiată', () => {
    const s = build(build(newGame(8), 'frig'), 'fizic')
    expect(applyDecision(s, { tip: 'tintire', turn: 1, mod: 'slab' })).toEqual({
      ok: false,
      reason: 'turnul Frig lovește toți inamicii din rază — nu are țintă de ales',
    })
    expect(applyDecision(s, { tip: 'tintire', turn: 2, mod: 'primul' })).toEqual({ ok: false, reason: 'turnul țintește deja așa' })
    expect(applyDecision(s, { tip: 'tintire', turn: 9, mod: 'slab' })).toEqual({ ok: false, reason: 'nu există turnul 9' })
    let lost = newGame(8)
    while (lost.faza === 'pregatire') lost = runWave(must(lost, { tip: 'pornesteVal' }))
    expect(applyDecision(lost, { tip: 'tintire', turn: 1, mod: 'slab' })).toEqual({ ok: false, reason: 'partida s-a încheiat' })
  })
})

describe('lovitura', () => {
  it('armura scade din fiecare lovitură, dar trece mereu cel puțin 1', () => {
    expect(damageAfterArmor(TOWERS.fizic.dauna, 'blindat')).toBe(TOWERS.fizic.dauna - ENEMIES.blindat.armura)
    expect(damageAfterArmor(TOWERS.foc.dauna, 'blindat')).toBe(1)
    expect(damageAfterArmor(TOWERS.foc.dauna, 'normal')).toBe(TOWERS.foc.dauna)
  })

  it('un turn lovește exact o dată la `reincarcare` tick-uri cât are țintă, iar uciderea dă aur', () => {
    let s = must(build(newGame(4), 'fizic'), { tip: 'pornesteVal' })
    const hits: number[] = []
    let killed = 0
    while (s.faza === 'val') {
      const prev = s
      s = step(s)
      const hit = s.turnuri[0]!.lovitura
      if (hit && hit.tick !== prev.turnuri[0]!.lovitura?.tick) hits.push(hit.tick)
      // Cine a dispărut și n-a ajuns la bază (valul 1 are doar inamici normali, care iau câte o viață) a fost ucis.
      const gone = prev.inamici.filter((e) => !s.inamici.some((x) => x.id === e.id)).length
      const killedNow = gone - (prev.vieti - s.vieti) / ENEMIES.normal.dauna
      expect(s.aur - prev.aur).toBe(killedNow * ENEMIES.normal.aur)
      killed += killedNow
    }
    expect(hits.length).toBeGreaterThan(3)
    for (let i = 1; i < hits.length; i++) expect(hits[i]! - hits[i - 1]!).toBeGreaterThanOrEqual(TOWERS.fizic.reincarcare)
    // Primele lovituri vin una după alta, la exact `reincarcare` tick-uri.
    expect(hits[1]! - hits[0]!).toBe(TOWERS.fizic.reincarcare)
    expect(killed).toBeGreaterThan(0)
    expect(s.aur).toBe(AUR_START - TOWERS.fizic.cost + killed * ENEMIES.normal.aur)
  })

  it('turnul de zonă lovește toți inamicii din rază deodată', () => {
    // Pornim direct de la valul 3, cel cu roiul (starea e date simple, deci se poate construi așa în test).
    let s: GameState = { ...build(newGame(6), 'frig'), val: 2 }
    let maxTargets = 0
    s = must(s, { tip: 'pornesteVal' })
    while (s.faza === 'val') {
      s = step(s)
      const hit = s.turnuri[0]!.lovitura
      if (hit?.tick === s.tick) maxTargets = Math.max(maxTargets, hit.tinte.length)
    }
    expect(maxTargets).toBeGreaterThan(1)
  })
})

describe('partida cu turnuri', () => {
  const play = (seed: number, withTowers: boolean): GameState => {
    let s = newGame(seed)
    while (s.faza === 'pregatire') {
      if (withTowers) {
        while (s.aur >= TOWERS.fizic.cost) s = build(s, 'fizic')
      }
      s = runWave(must(s, { tip: 'pornesteVal' }))
    }
    return s
  }

  it('turnurile țin baza mai mult decât lipsa lor — și partida iese identic de două ori', () => {
    const without = play(12, false)
    const a = play(12, true)
    const b = play(12, true)
    expect(a.val).toBeGreaterThan(without.val)
    expect(fingerprint(a)).toBe(fingerprint(b))
    expect(fingerprint(replay(12, a.jurnal, a.tick))).toBe(fingerprint(a))
  })
})
