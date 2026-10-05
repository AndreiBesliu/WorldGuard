import { describe, expect, it } from 'vitest'
import { ENEMIES, WAVES, describeWave } from '../data/enemies'
import { MILI_HEX, VIETI_BAZA } from '../data/joc'
import {
  applyDecision,
  fingerprint,
  newGame,
  pathLength,
  replay,
  spawnSchedule,
  step,
  type Decision,
  type GameState,
} from './game'
import { key } from './hex'
import { optionsAround } from './path'

const must = (s: GameState, d: Decision): GameState => {
  const r = applyDecision(s, d)
  if (!r.ok) throw new Error(r.reason)
  return r.value
}

/** Rulează simularea până se schimbă faza (sfârșitul valului sau al partidei). */
function runWave(s: GameState, maxTicks = 100_000): GameState {
  let cur = s
  for (let i = 0; i < maxTicks && cur.faza === 'val'; i++) cur = step(cur)
  return cur
}

describe('datele valurilor', () => {
  it('15 valuri, fiecare cu grupuri valide', () => {
    expect(WAVES).toHaveLength(15)
    for (const w of WAVES) {
      expect(w.grupuri.length).toBeGreaterThan(0)
      expect(w.viata).toBeGreaterThan(0)
      for (const g of w.grupuri) {
        expect(ENEMIES[g.tip]).toBeDefined()
        expect(Number.isInteger(g.numar) && g.numar > 0).toBe(true)
        expect(Number.isInteger(g.interval) && g.interval > 0).toBe(true)
        expect(Number.isInteger(g.intarziere) && g.intarziere >= 0).toBe(true)
      }
    }
  })

  it('bossul apare la valurile 5, 10 și 15', () => {
    const cuBoss = WAVES.map((w, i) => (w.grupuri.some((g) => g.tip === 'boss') ? i + 1 : 0)).filter(Boolean)
    expect(cuBoss).toEqual([5, 10, 15])
  })

  it('rezumatul valului numără corect', () => {
    expect(describeWave({ viata: 1, grupuri: [{ tip: 'normal', numar: 3, interval: 5, intarziere: 0 }, { tip: 'normal', numar: 2, interval: 5, intarziere: 9 }] })).toBe(
      '5 Normal',
    )
  })
})

describe('apariția inamicilor', () => {
  it('programul e sortat după tick, are câți inamici declară valul și pornește după tick-ul de start', () => {
    for (let v = 0; v < WAVES.length; v++) {
      const sched = spawnSchedule(v, 100)
      const total = WAVES[v]!.grupuri.reduce((n, g) => n + g.numar, 0)
      expect(sched).toHaveLength(total)
      for (let i = 1; i < sched.length; i++) expect(sched[i]!.tick).toBeGreaterThanOrEqual(sched[i - 1]!.tick)
      expect(sched[0]!.tick).toBeGreaterThan(100)
    }
  })

  it('în pregătire timpul stă pe loc', () => {
    const s = newGame(1)
    expect(step(s)).toBe(s)
  })
})

describe('deplasarea și baza', () => {
  it('un inamic normal ajunge la bază exact când a parcurs tot drumul', () => {
    let s = must(newGame(4), { tip: 'pornesteVal' })
    const firstSpawn = s.deGenerat[0]!.tick
    const ticksToWalk = Math.ceil(pathLength(s) / ENEMIES.normal.viteza)
    // Până la tick-ul în care ar trebui să ajungă, primul inamic e încă pe drum.
    while (s.tick < firstSpawn + ticksToWalk - 1) s = step(s)
    const first = s.inamici.find((e) => e.id === 1)
    expect(first).toBeDefined()
    expect(first!.progres).toBe((ticksToWalk - 1) * ENEMIES.normal.viteza)
    expect(s.vieti).toBe(VIETI_BAZA)
    s = step(s)
    expect(s.inamici.find((e) => e.id === 1)).toBeUndefined()
    expect(s.vieti).toBe(VIETI_BAZA - ENEMIES.normal.dauna)
  })

  it('progresul fiecărui inamic crește strict și nu depășește drumul', () => {
    let s = must(newGame(2), { tip: 'pornesteVal' })
    const last = new Map<number, number>()
    while (s.faza === 'val') {
      s = step(s)
      for (const e of s.inamici) {
        const prev = last.get(e.id)
        if (prev !== undefined) expect(e.progres).toBeGreaterThan(prev)
        expect(e.progres).toBeLessThan(pathLength(s))
        last.set(e.id, e.progres)
      }
    }
  })

  it('un drum mai lung ține inamicii mai mult pe hartă — rostul ocolurilor', () => {
    const shortRun = runWave(must(newGame(9), { tip: 'pornesteVal' }))
    // Șase ocoluri într-o singură pregătire: ca după un upgrade al limitei (`ocoluriPeVal`).
    let long: GameState = { ...newGame(9), ocoluriPeVal: 6 }
    for (let k = 0; k < 6; k++) {
      const opts = optionsAround(long.map, long.path, Math.floor(long.path.length / 2), 3)
      if (opts.length === 0) break
      const o = opts[0]!
      long = must(long, { tip: 'ocol', start: o.start, span: o.span, hexuri: o.hexes.map(key) })
    }
    expect(long.path.length).toBeGreaterThan(newGame(9).path.length)
    const longRun = runWave(must(long, { tip: 'pornesteVal' }))
    expect(longRun.tick).toBeGreaterThan(shortRun.tick)
  })
})

describe('fazele partidei', () => {
  it('după un val terminat, revine pregătirea pentru valul următor', () => {
    const s = runWave(must(newGame(3), { tip: 'pornesteVal' }))
    expect(s.faza).toBe('pregatire')
    expect(s.val).toBe(1)
    expect(s.inamici).toHaveLength(0)
  })

  it('drumul nu se poate modela în timpul unui val — refuz cu motiv', () => {
    const s = must(newGame(3), { tip: 'pornesteVal' })
    const r = applyDecision(s, { tip: 'ocol', start: 1, span: 3, hexuri: [] })
    expect(r).toEqual({ ok: false, reason: 'drumul se modelează doar între valuri' })
  })

  it('un val nu poate porni peste altul', () => {
    const s = must(newGame(3), { tip: 'pornesteVal' })
    expect(applyDecision(s, { tip: 'pornesteVal' }).ok).toBe(false)
  })

  it('fără turnuri, partida se pierde — și se pierde identic de fiecare dată', () => {
    const play = (): GameState => {
      let s = newGame(2026)
      while (s.faza === 'pregatire') s = runWave(must(s, { tip: 'pornesteVal' }))
      return s
    }
    const a = play()
    const b = play()
    expect(a.faza).toBe('pierdut')
    expect(a.vieti).toBe(0)
    expect(fingerprint(a)).toBe(fingerprint(b))
  })
})

describe('replay cu timp', () => {
  it('ocoluri între valuri + valuri jucate: replay(seed, jurnal, tick) dă aceeași stare, și la mijlocul unui val', () => {
    let s = newGame(17)
    const checkpoints: { tick: number; fp: string }[] = []
    // Fără turnuri partida cade în valul 2 (8 + 14 vieți > 20), deci bucla se oprește când nu mai e pregătire.
    for (let v = 0; v < 3 && s.faza === 'pregatire'; v++) {
      const opts = optionsAround(s.map, s.path, 1 + (v * 3) % (s.path.length - 2), 2)
      if (opts[0]) s = must(s, { tip: 'ocol', start: opts[0].start, span: opts[0].span, hexuri: opts[0].hexes.map(key) })
      s = must(s, { tip: 'pornesteVal' })
      for (let t = 0; t < 150; t++) s = step(s)
      checkpoints.push({ tick: s.tick, fp: fingerprint(s) })
      s = runWave(s)
    }
    expect(checkpoints.length).toBeGreaterThanOrEqual(2)
    const end = replay(17, s.jurnal, s.tick)
    expect(fingerprint(end)).toBe(fingerprint(s))
    // La mijlocul fiecărui val, din jurnalul de până atunci.
    for (const c of checkpoints) {
      const upTo = s.jurnal.filter((l) => l.la <= c.tick)
      expect(fingerprint(replay(17, upTo, c.tick))).toBe(c.fp)
    }
  })

  it('anularea unui ocol după un val jucat (cum face Z în UI) dă starea de dinainte de ocol', () => {
    const before = runWave(must(newGame(21), { tip: 'pornesteVal' }))
    expect(before.faza).toBe('pregatire')
    let o: ReturnType<typeof optionsAround>[number] | undefined
    for (let i = 1; i < before.path.length - 1 && !o; i++) o = optionsAround(before.map, before.path, i, 2)[0]
    expect(o).toBeDefined()
    const after = must(before, { tip: 'ocol', start: o!.start, span: o!.span, hexuri: o!.hexes.map(key) })
    expect(after.jurnal.at(-1)!.la).toBe(before.tick)
    const undone = replay(21, after.jurnal.slice(0, -1), after.tick)
    expect(fingerprint(undone)).toBe(fingerprint(before))
  })

  it('pozițiile sunt întregi (fără derivă de virgulă mobilă)', () => {
    let s = must(newGame(5), { tip: 'pornesteVal' })
    for (let t = 0; t < 300; t++) s = step(s)
    for (const e of s.inamici) {
      expect(Number.isInteger(e.progres)).toBe(true)
      expect(Number.isInteger(e.viata)).toBe(true)
    }
    expect(MILI_HEX).toBe(1000)
  })
})
