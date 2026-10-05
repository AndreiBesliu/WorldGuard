import { describe, expect, it } from 'vitest'
import { ENEMIES, WAVES } from '../data/enemies'
import { AMFIBII, EVOLUTIE, LUME } from '../data/lume'
import { STATES } from '../data/reactions'
import type { Terrain } from '../data/terrain'
import { TOWERS } from '../data/towers'
import { checkBuild, enemySpeed, fingerprint, naturalAmphibians, newGame, pathContacts, replay, spawnSchedule, step, waveAt, type Enemy, type GameState } from './game'
import { key, neighbors } from './hex'
import { commitRun, dugCanals, newWorld, regionAmphibians, regionTerrain, settleRun, startRun } from './lume'
import { mixTerrain } from './map'
import { applyContact, type ReactionContext, type Victim } from './reactions'
import { must, runWave, startWave } from './testkit'

// Arena: drumul drept de la (-9,0) la (9,0) (indicele i e hexagonul (i − 9, 0)), câmpie peste tot în afară de terenurile
// date, fără ocol obligatoriu.
function arena(teren: Record<string, Terrain> = {}, extra: Partial<GameState> = {}): GameState {
  const s = newGame(7)
  const terrain = new Map([...s.map.terrain].map(([k]) => [k, teren[k] ?? ('campie' as const)]))
  return { ...s, map: { ...s.map, terrain }, ocoluriPeVal: 0, aur: 500, pamant: 10, ...extra }
}

const ctx: ReactionContext<Victim> = { neighbors: () => [], emit: () => {} }
const victim = (tip: Victim['tip'], stari: Victim['stari'] = {}): Victim => ({ id: 1, tip, viata: 1000, stari: { ...stari } })

describe('noroiul: cenușă + apă (GDD §9.1)', () => {
  it('cenușa cu apă vecină devine noroi; fără apă rămâne cenușă; ordinea hexagoanelor nu contează', () => {
    const t = new Map<string, Terrain>([
      ['0,0', 'cenusa'],
      ['1,0', 'apa'],
      ['5,5', 'cenusa'],
      ['0,1', 'cenusa'],
    ])
    const m = mixTerrain(t)
    expect([...m]).toEqual([
      ['0,0', 'noroi'],
      ['1,0', 'apa'],
      ['5,5', 'cenusa'],
      // (0,1) e și el vecin cu apa de la (1,0).
      ['0,1', 'noroi'],
    ])
    expect([...mixTerrain(new Map([...t].reverse()))].sort()).toEqual([...m].sort())
    // Terenul de intrare nu se schimbă.
    expect(t.get('0,0')).toBe('cenusa')
  })

  it('la începutul partidei, pe terenul regiunii; harta fără cenușă rămâne neatinsă', () => {
    // (-5,-3) are numai vecini de câmpie: rămâne cenușă.
    const uscat = neighbors({ q: -5, r: -3 }).map((n): [string, Terrain] => [key(n), 'campie'])
    const s = newGame(7, { teren: new Map<string, Terrain>([['0,-2', 'cenusa'], ['1,-2', 'apa'], ['-5,-3', 'cenusa'], ...uscat]) })
    expect(s.map.terrain.get('0,-2')).toBe('noroi')
    expect(s.map.terrain.get('-5,-3')).toBe('cenusa')
    expect([...newGame(7).map.terrain.values()]).not.toContain('noroi')
  })

  it('un canal săpat lângă cenușă o face noroi pe loc', () => {
    const s = arena({ '0,-3': 'cenusa' })
    const c = must(s, { tip: 'teren', actiune: 'canal', hex: '1,-3' })
    expect(c.map.terrain.get('1,-3')).toBe('apa')
    expect(c.map.terrain.get('0,-3')).toBe('noroi')
    // Harta veche rămâne cum era.
    expect(s.map.terrain.get('0,-3')).toBe('cenusa')
  })

  it('noroiul de lângă drum îi împotmolește pe inamici: încetinire, la intrarea pe hexagon', () => {
    const s = arena({ '-3,-1': 'noroi' })
    const i = s.path.findIndex((h) => key(h) === '-3,0')
    expect(pathContacts(s)[i]!.map((c) => c.aplica)).toEqual(['impotmolit'])
    const foe: Enemy = { id: 1, tip: 'normal', viata: 5000, progres: (i - 1) * 1000 + 460, stari: {} }
    const w = step({ ...s, faza: 'val', inamici: [foe], deGenerat: [{ tick: 1e6, tip: 'normal' }] })
    expect(w.inamici[0]!.stari.impotmolit).toBeDefined()
    expect(enemySpeed(w.inamici[0]!)).toBe(Math.floor((ENEMIES.normal.viteza * (100 - STATES.impotmolit.incetinire!)) / 100))
  })

  it('noroiul nu ține nici drum, nici turn', () => {
    const s = arena({ '0,-2': 'noroi' })
    expect(must(s, { tip: 'turn', turn: 'fizic', hex: '0,-3' }).turnuri).toHaveLength(1)
    expect(() => must(s, { tip: 'turn', turn: 'fizic', hex: '0,-2' })).toThrow()
  })
})

describe('amfibii: canalul săpat îi aduce (GDD §9.1)', () => {
  it('apa nu-l udă, îl grăbește: deci nici îngheț, nici electrocutare de la ea', () => {
    const a = victim('amfibiu')
    applyContact(a, { element: 'apa', dauna: 0, aplica: 'ud' }, ctx)
    expect(a.stari).toEqual({ grabit: STATES.grabit.durata })
    // Frigul pe el: doar răcit (nu e ud, deci nu îngheață).
    applyContact(a, { element: 'frig', dauna: 0, aplica: TOWERS.frig.aplica }, ctx)
    expect(a.stari.inghetat).toBeUndefined()
    expect(a.stari.racit).toBeDefined()
    // Un inamic obișnuit, în aceeași apă, se udă.
    const n = victim('normal')
    applyContact(n, { element: 'apa', dauna: 0, aplica: 'ud' }, ctx)
    expect(n.stari).toEqual({ ud: STATES.ud.durata })
  })

  it('viteza: grăbirea se înmulțește cu încetinirea; înghețat, stă pe loc și grăbit', () => {
    const v = ENEMIES.amfibiu.viteza
    expect(enemySpeed({ tip: 'amfibiu', stari: { grabit: 1 } })).toBe(Math.floor((v * (100 + STATES.grabit.grabire!)) / 100))
    expect(enemySpeed({ tip: 'amfibiu', stari: { grabit: 1, racit: 1 } })).toBe(
      Math.floor((v * (100 - STATES.racit.incetinire!) * (100 + STATES.grabit.grabire!)) / 10_000),
    )
    expect(enemySpeed({ tip: 'amfibiu', stari: { grabit: 1, inghetat: 1 } })).toBe(0)
    // Fără grăbire, viteza de până acum (nimic nu se schimbă pentru ceilalți).
    expect(enemySpeed({ tip: 'normal', stari: { racit: 1 } })).toBe(Math.floor((ENEMIES.normal.viteza * 75) / 100))
  })

  it('valurile cu amfibi: fiecare val îi are la coadă; fără, valurile rămân cele din date', () => {
    expect(waveAt({ amfibii: 0 }, 3)).toBe(WAVES[3])
    const w = waveAt({ amfibii: 4 }, 3)!
    expect(w.grupuri.at(-1)).toEqual({ tip: 'amfibiu', numar: 4, interval: AMFIBII.interval, intarziere: AMFIBII.intarziere })
    expect(spawnSchedule(AMFIBII.dinValul, 0, { amfibii: 3 }).filter((x) => x.tip === 'amfibiu')).toHaveLength(3)
    // Primele valuri rămân cele din date.
    for (let i = 0; i < AMFIBII.dinValul; i++) expect(waveAt({ amfibii: 3 }, i)).toBe(WAVES[i])
    // Și pe inimă, ultimul val îi are pe amândoi.
    const ultim = waveAt({ inima: true, amfibii: 2 }, WAVES.length - 1)!
    expect(ultim.grupuri.map((g) => g.tip)).toEqual(expect.arrayContaining(['paznic', 'amfibiu']))
    // Partida îi ține minte (în amprentă), cu plafon.
    expect(newGame(5, { amfibii: 99 }).amfibii).toBe(AMFIBII.maxim)
    expect(fingerprint(newGame(5, { amfibii: 2 }))).not.toBe(fingerprint(newGame(5)))
  })

  it('pe planetă: canalele săpate (încă apă) aduc amfibi; cele colmatate nu, nici cele din partide pierdute', () => {
    let l = newWorld(42)
    const START = key(LUME.start)
    const r = startRun(l, START)
    if (!r.ok) throw new Error(r.reason)
    const s = r.value.state
    const libere = [...s.map.terrain]
      .filter(([h, t]) => t === 'campie' && !s.path.some((p) => key(p) === h) && !h.endsWith(',0'))
      .map(([h]) => h)
      .slice(0, 3)
    let jucata = { ...s, pamant: 10 }
    for (const hex of libere) jucata = must(jucata, { tip: 'teren', actiune: 'canal', hex })
    // Pierdută: nicio urmă, niciun amfibiu.
    l = commitRun(l, START, { ...jucata, faza: 'pierdut', tick: 1000 })
    expect(dugCanals(l, START)).toBe(0)
    // Câștigată: trei canale, trei amfibi pe val.
    l = commitRun(l, START, { ...jucata, faza: 'castigat', tick: 1000 })
    expect(dugCanals(l, START)).toBe(3)
    expect(regionAmphibians(l, START)).toBe(3 * AMFIBII.peCanal)
    // În partidă: cei din canale, plus cei din apa naturală a hărții regiunii.
    const next = startRun(l, START)
    expect(next.ok && next.value.start.amfibii).toBe(3)
    expect(next.ok && next.value.state.amfibii).toBe(Math.min(AMFIBII.maxim, 3 + naturalAmphibians(s.map, s.path)))
    // Colmatate, nu mai aduc pe nimeni.
    const colmatat = { ...l, ceas: l.ceas + EVOLUTIE.canal[1]!.dupa }
    expect(regionAmphibians(colmatat, START)).toBe(0)
    // Un canal acoperit apoi de un deal (ultima editare câștigă) nu mai e canal.
    const cuDeal = { ...l, regiuni: { [START]: { ...l.regiuni[START]!, editari: [...l.regiuni[START]!.editari, { hex: libere[0]!, actiune: 'deal' as const, la: l.ceas }] } } }
    expect(dugCanals(cuDeal, START)).toBe(2)
  })

  it('o partidă rămasă la jumătate se reface cu amfibii regiunii, identic cu partida de atunci', () => {
    let l = newWorld(42)
    const START = key(LUME.start)
    const r0 = startRun(l, START)
    if (!r0.ok) throw new Error(r0.reason)
    const s0 = r0.value.state
    const libere = [...s0.map.terrain].filter(([h, t]) => t === 'campie' && !s0.path.some((p) => key(p) === h) && !h.endsWith(',0')).map(([h]) => h)
    let castigata = { ...s0, pamant: 10 }
    for (const hex of libere.slice(0, 2)) castigata = must(castigata, { tip: 'teren', actiune: 'canal', hex })
    l = commitRun(l, START, { ...castigata, faza: 'castigat', tick: 1000 })
    expect(regionAmphibians(l, START)).toBe(2)
    // Partida de acum: două valuri, apoi pagina se închide la mijlocul celui de-al treilea, după ce au apărut amfibii.
    const r = startRun(l, START)
    if (!r.ok) throw new Error(r.reason)
    let s: GameState = r.value.state
    // Turnuri Fizic lângă drum, cu tot aurul, înainte de fiecare val.
    const construieste = (): void => {
      for (const h of s.path) {
        for (const n of neighbors(h)) {
          if (s.aur >= TOWERS.fizic.cost && checkBuild(s, 'fizic', key(n)).ok) s = must(s, { tip: 'turn', turn: 'fizic', hex: key(n) })
        }
      }
    }
    for (let v = 0; v < 2; v++) {
      construieste()
      s = runWave(startWave(s))
    }
    construieste()
    s = startWave(s)
    let amfibi = false
    for (let i = 0; i < 300 && s.faza === 'val'; i++) {
      s = step(s)
      amfibi ||= s.inamici.some((e) => e.tip === 'amfibiu')
    }
    expect(amfibi).toBe(true)
    const refacuta = settleRun(l, { cheie: START, tick: s.tick, jurnal: s.jurnal })
    if (!refacuta.ok) throw new Error(refacuta.reason)
    expect(fingerprint(refacuta.value.final)).toBe(fingerprint(s))
    // Fără amfibii regiunii (greșeala de dinainte), rejucarea iese altfel.
    const fara = replay(r.value.state.seed, s.jurnal, s.tick, { teren: regionTerrain(l, START), inima: false })
    expect(fingerprint(fara)).not.toBe(fingerprint(refacuta.value.final))
    expect(refacuta.value.lume.regiuni[START]?.partide).toBe(2)
  })

  it('și apa naturală îi aduce (owner): unul la fiecare câteva hexagoane de apă de lângă drum, cu plafonul ei', () => {
    const k = AMFIBII.apaNaturala.hexagoane
    // Apă pe rândul de deasupra drumului, departe de capete: k − 1 hexagoane nu aduc niciunul, k aduc unul.
    const lac = (n: number): GameState => arena(Object.fromEntries(Array.from({ length: n }, (_, i) => [`${i - 4},-1`, 'apa' as const])))
    expect(naturalAmphibians(lac(k - 1).map, lac(k - 1).path)).toBe(0)
    expect(naturalAmphibians(lac(k).map, lac(k).path)).toBe(1)
    expect(naturalAmphibians(lac(9).map, lac(9).path)).toBe(Math.min(AMFIBII.apaNaturala.maxim, Math.floor(9 / k)))
    // Apa departe de drum nu contează.
    expect(naturalAmphibians(arena({ '0,-5': 'apa', '1,-5': 'apa', '2,-5': 'apa', '3,-5': 'apa' }).map, lac(0).path)).toBe(0)
    // Plafonul apei naturale.
    const mare = arena(Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`${i - 8},-1`, 'apa' as const])))
    expect(naturalAmphibians(mare.map, mare.path)).toBe(AMFIBII.apaNaturala.maxim)
  })

  it('apa naturală se socotește pe harta generată: un canal săpat lângă drum nu numără de două ori', () => {
    const s = newGame(11)
    const gol = [...s.map.terrain].filter(([h, t]) => t === 'campie' && !s.path.some((p) => key(p) === h)).map(([h]) => h)
    const langaDrum = gol.filter((h) => s.path.some((p) => neighbors(p).some((n) => key(n) === h))).slice(0, 8)
    const cuCanale = newGame(11, { teren: new Map(langaDrum.map((h): [string, Terrain] => [h, 'apa'])) })
    expect(cuCanale.amfibii).toBe(s.amfibii)
  })

  it('plafonul: oricâte canale, cel mult `AMFIBII.maxim` amfibi pe val', () => {
    const START = key(LUME.start)
    const editari = Array.from({ length: AMFIBII.maxim + 3 }, (_, i) => ({ hex: `${i},-4`, actiune: 'canal' as const, la: 0 }))
    const l = { ...newWorld(1), ceas: 10, regiuni: { [START]: { salvata: true, partide: 1, editari } } }
    expect(dugCanals(l, START)).toBe(AMFIBII.maxim + 3)
    expect(regionAmphibians(l, START)).toBe(AMFIBII.maxim)
  })
})
