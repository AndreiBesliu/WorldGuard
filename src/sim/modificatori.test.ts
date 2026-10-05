import { describe, expect, it } from 'vitest'
import { ENEMIES, WAVES } from '../data/enemies'
import { AMFIBII, LUME } from '../data/lume'
import { AVANGARDA, INUNDATII_MINIM_APA, MODIFICATOR_IDS, MODIFICATORI, PRAGURI, PRESETARI, type Modificatori } from '../data/modificatori'
import type { Terrain } from '../data/terrain'
import { TOWERS } from '../data/towers'
import {
  checkDetourAllowed,
  checkStartWave,
  detourLimit,
  enemyGold,
  enemyHealth,
  fingerprint,
  naturalAmphibians,
  naturalRoadsideWater,
  newGame,
  replay,
  spawnSchedule,
  step,
  towerRange,
  waveAt,
  waveHealth,
  type GameState,
} from './game'
import { key, neighbors } from './hex'
import { commitRun, decodeWorld, encodeWorld, newWorld, planetRegions, regionOf, settleRun, startRun, type Lume } from './lume'
import { floodPlains, generateMap } from './map'
import { availableModifiers, checkModifiers, encodeModifiers, modValue, parseModifiers, sealOf, threat } from './modificatori'
import { runWave, startWave } from './testkit'

// Arena: drumul drept de la (-9,0) la (9,0) (indicele i e hexagonul (i − 9, 0)), câmpie peste tot în afară de terenurile
// date, fără ocol obligatoriu.
function arena(teren: Record<string, Terrain> = {}, extra: Partial<GameState> = {}): GameState {
  const s = newGame(7)
  const terrain = new Map([...s.map.terrain].map(([k]) => [k, teren[k] ?? ('campie' as const)]))
  return { ...s, map: { ...s.map, terrain }, ocoluriPeVal: 0, aur: 500, pamant: 10, ...extra }
}

/** Un seed de hartă cu cel puțin `minim` hexagoane de apă naturală lângă drum (sau cel mult, cu `cel = 'mult'`). */
function seedCuApa(minim: number, cel: 'putin' | 'mult' = 'putin'): number {
  for (let seed = 1; seed < 500; seed++) {
    const apa = naturalRoadsideWater(seed)
    if (cel === 'putin' ? apa >= minim : apa <= minim) return seed
  }
  throw new Error('niciun seed potrivit')
}

describe('Amenințarea, pragurile și presetările (GDD §9.2)', () => {
  it('amenințarea e suma treptelor alese; fără modificatori, zero', () => {
    expect(threat({})).toBe(0)
    expect(threat({ hoarde: 2, piele: 1 })).toBe(MODIFICATORI.hoarde.trepte[1]!.amenintare + MODIFICATORI.piele.trepte[0]!.amenintare)
    const tot = Object.fromEntries(MODIFICATOR_IDS.map((id) => [id, MODIFICATORI[id].trepte.length])) as Modificatori
    expect(threat(tot)).toBe(MODIFICATOR_IDS.reduce((n, id) => n + MODIFICATORI[id].trepte.at(-1)!.amenintare, 0))
  })

  it('pragurile cresc, iar treptele unui modificator dau tot mai multă amenințare', () => {
    for (let i = 1; i < PRAGURI.length; i++) expect(PRAGURI[i]!.amenintare).toBeGreaterThan(PRAGURI[i - 1]!.amenintare)
    for (const id of MODIFICATOR_IDS) {
      const t = MODIFICATORI[id].trepte
      expect(t.length).toBeGreaterThanOrEqual(1)
      expect(t.length).toBeLessThanOrEqual(3)
      for (let i = 1; i < t.length; i++) expect(t[i]!.amenintare).toBeGreaterThan(t[i - 1]!.amenintare)
    }
  })

  it('sigiliul: cel mai înalt prag atins', () => {
    const [bronz, argint, aur] = PRAGURI
    expect(sealOf(0)).toBeUndefined()
    expect(sealOf(bronz!.amenintare - 1)).toBeUndefined()
    expect(sealOf(bronz!.amenintare)?.sigiliu).toBe('bronz')
    expect(sealOf(argint!.amenintare - 1)?.sigiliu).toBe('bronz')
    expect(sealOf(argint!.amenintare)?.sigiliu).toBe('argint')
    expect(sealOf(aur!.amenintare)?.sigiliu).toBe('aur')
    expect(sealOf(99)?.sigiliu).toBe('aur')
  })

  it('fiecare presetare ajunge exact la pragul ei și e o alegere validă pe orice hartă', () => {
    expect(Object.values(PRESETARI).map(threat)).toEqual(PRAGURI.map((p) => p.amenintare))
    for (const p of Object.values(PRESETARI)) expect(checkModifiers(p, 0)).toEqual({ ok: true, value: p })
  })
})

describe('alegerea: verificată și scrisă scurt', () => {
  it('textul scurt („hoarde2,piele1”) merge în ambele sensuri, în ordinea fixă', () => {
    const m: Modificatori = { piele: 1, hoarde: 2, avangarda: 2 }
    expect(encodeModifiers(m)).toBe('hoarde2,piele1,avangarda2')
    expect(parseModifiers('hoarde2,piele1,avangarda2')).toEqual({ ok: true, value: { hoarde: 2, piele: 1, avangarda: 2 } })
    expect(parseModifiers('')).toEqual({ ok: true, value: {} })
    expect(encodeModifiers({})).toBe('')
  })

  it('textul greșit se refuză, cu motiv', () => {
    expect(parseModifiers('hoarde').ok).toBe(false)
    expect(parseModifiers('vulcan1').ok).toBe(false)
    const dublu = parseModifiers('hoarde1,hoarde2')
    expect(!dublu.ok && dublu.reason).toContain('câte unul pe axă')
  })

  it('treptele care nu există, modificatorii necunoscuți și ce nu e o listă se refuză', () => {
    expect(checkModifiers({ hoarde: 0 }, 0).ok).toBe(false)
    expect(checkModifiers({ hoarde: 4 }, 0).ok).toBe(false)
    expect(checkModifiers({ saracie: 3 }, 0).ok).toBe(false)
    expect(checkModifiers({ hoarde: 1.5 }, 0).ok).toBe(false)
    expect(checkModifiers({ hoarde: '2' }, 0).ok).toBe(false)
    expect(checkModifiers({ vulcan: 1 }, 0).ok).toBe(false)
    expect(checkModifiers(null, 0).ok).toBe(false)
    expect(checkModifiers([1], 0).ok).toBe(false)
    expect(checkModifiers({}, 0)).toEqual({ ok: true, value: {} })
  })

  it('Sezonul inundațiilor cere apă naturală lângă drum; restul, oriunde', () => {
    expect(availableModifiers(INUNDATII_MINIM_APA - 1).has('inundatii')).toBe(false)
    expect(availableModifiers(INUNDATII_MINIM_APA).has('inundatii')).toBe(true)
    expect(availableModifiers(0).size).toBe(MODIFICATOR_IDS.length - 1)
    const r = checkModifiers({ inundatii: 1 }, INUNDATII_MINIM_APA - 1)
    expect(!r.ok && r.reason).toContain('apă lângă drum')
    expect(checkModifiers({ inundatii: 1 }, INUNDATII_MINIM_APA).ok).toBe(true)
  })
})

describe('Hoardele și Avangarda de cenușă: valurile', () => {
  it('Hoardele cresc fiecare grup în afară de bossi, rotunjit, în același ritm', () => {
    for (const treapta of [1, 2, 3]) {
      const p = modValue({ hoarde: treapta }, 'hoarde')
      for (let i = 0; i < WAVES.length; i++) {
        const baza = WAVES[i]!.grupuri
        const cu = waveAt({ modificatori: { hoarde: treapta } }, i)!.grupuri
        expect(cu).toHaveLength(baza.length)
        for (const [j, g] of baza.entries()) {
          const h = cu[j]!
          if (g.tip === 'boss') {
            expect(h).toEqual(g)
            continue
          }
          expect(h.numar).toBe(Math.round((g.numar * (100 + p)) / 100))
          expect(h.numar).toBeGreaterThan(g.numar)
          expect({ ...h, numar: g.numar }).toEqual(g)
        }
      }
    }
  })

  it('Hoardele nu ating Paznicul inimii, nici amfibii regiunii', () => {
    const ultim = WAVES.length - 1
    const cu = waveAt({ inima: true, amfibii: 3, modificatori: { hoarde: 3 } }, ultim)!.grupuri
    expect(cu.filter((g) => g.tip === 'paznic').map((g) => g.numar)).toEqual([1])
    expect(cu.filter((g) => g.tip === 'boss').map((g) => g.numar)).toEqual([1, 1, 1])
    expect(cu.at(-1)).toMatchObject({ tip: 'amfibiu', numar: 3 })
  })

  it('Avangarda: de la valul 2, rapizi ignifugi în fața valului; primul val rămâne cel din date', () => {
    expect(waveAt({ modificatori: { avangarda: 2 } }, 0)).toBe(WAVES[0])
    for (const treapta of [1, 2]) {
      const numar = modValue({ avangarda: treapta }, 'avangarda')
      const w = waveAt({ modificatori: { avangarda: treapta } }, 3)!
      expect(w.grupuri[0]).toEqual({ tip: AVANGARDA.tip, numar, interval: AVANGARDA.interval, intarziere: 0, trasaturi: ['ignifug'] })
      expect(w.grupuri.slice(1)).toEqual(WAVES[3]!.grupuri)
    }
    // Primii care apar sunt ei (la egalitate de tick, grupul lor e primul).
    const sp = spawnSchedule(1, 0, { modificatori: { avangarda: 1 } })
    expect(sp[0]).toEqual({ tick: 1, tip: 'rapid', trasaturi: ['ignifug'] })
    expect(sp).toHaveLength(spawnSchedule(1, 0).length + modValue({ avangarda: 1 }, 'avangarda'))
    // Hoardele nu cresc avangarda.
    expect(waveAt({ modificatori: { avangarda: 1, hoarde: 3 } }, 3)!.grupuri[0]!.numar).toBe(modValue({ avangarda: 1 }, 'avangarda'))
  })

  it('fără modificatori, valurile sunt exact cele din date', () => {
    for (let i = 0; i < WAVES.length; i++) expect(waveAt({ modificatori: {} }, i)).toBe(WAVES[i])
  })
})

describe('Pielea groasă și Prada săracă: viața și aurul', () => {
  it('viața crește cu procentul treptei; fără ea, aceeași ca înainte', () => {
    for (const tip of ['normal', 'blindat', 'boss'] as const) {
      for (const v of [0, 7, 24]) {
        expect(enemyHealth(tip, v, 0)).toBe(enemyHealth(tip, v))
        expect(Math.abs(enemyHealth(tip, v, 50) - enemyHealth(tip, v) * 1.5)).toBeLessThanOrEqual(1)
        expect(enemyHealth(tip, v, 15)).toBeGreaterThan(enemyHealth(tip, v))
      }
    }
  })

  it('multiplicatorul de viață arătat în interfață ține cont de Pielea groasă', () => {
    for (const v of [0, 10, 24]) expect(waveHealth(v, 30)).toBeCloseTo(waveHealth(v) * 1.3, 10)
    expect(waveHealth(3, 0)).toBe(waveHealth(3))
  })

  it('inamicii care apar au viața cu Pielea groasă — și cei născuți de puls', () => {
    const s0 = arena({}, { modificatori: { piele: 2 } })
    let s: GameState = { ...s0, faza: 'val', deGenerat: [{ tick: 1, tip: 'normal' }, { tick: 500, tip: 'normal' }] }
    s = step(s)
    const p2 = modValue({ piele: 2 }, 'piele')
    expect(s.inamici[0]!.viata).toBe(enemyHealth('normal', 0, p2))
    // Paznicul inimii, pus direct pe drum la un tick dinaintea pulsului.
    const paznic = { id: 99, tip: 'paznic' as const, viata: 100_000, progres: 3000, stari: {} }
    let p: GameState = { ...s0, faza: 'val', tick: ENEMIES.paznic.puls!.interval - 1, inamici: [paznic], deGenerat: [{ tick: 10_000, tip: 'normal' }] }
    p = step(p)
    const roiuri = p.inamici.filter((e) => e.tip === 'roi')
    expect(roiuri).toHaveLength(ENEMIES.paznic.puls!.numar)
    for (const r of roiuri) expect(r.viata).toBe(enemyHealth('roi', 0, p2))
  })

  it('aurul unui inamic ucis scade cu procentul treptei, rotunjit în jos', () => {
    expect(enemyGold({ modificatori: {} }, 'blindat')).toBe(ENEMIES.blindat.aur)
    const [p1, p2] = [1, 2].map((t) => modValue({ saracie: t }, 'saracie')) as [number, number]
    expect(p1).toBeGreaterThan(0)
    expect(p2).toBeGreaterThan(p1)
    // Rotunjit în jos, pe toate tipurile.
    for (const tip of Object.keys(ENEMIES) as (keyof typeof ENEMIES)[]) {
      for (const [t, p] of [
        [1, p1],
        [2, p2],
      ] as const) {
        expect(enemyGold({ modificatori: { saracie: t } }, tip)).toBe(Math.floor((ENEMIES[tip].aur * (100 - p)) / 100))
      }
    }
    // Un caz cu rest, ca rotunjirea să conteze: Blindatul (12 aur) cu 10% mai puțin = 10,8 → 10.
    expect(Math.floor((ENEMIES.blindat.aur * (100 - p1)) / 100)).not.toBe((ENEMIES.blindat.aur * (100 - p1)) / 100)
    // În partidă: un inamic ucis de un turn.
    const ucis = (modificatori: Modificatori): number => {
      const tur = { id: 1, tip: 'fizic' as const, hex: '-9,1', tintire: 'primul' as const, reincarcare: 0, combinat: false }
      const s: GameState = {
        ...arena({}, { modificatori }),
        faza: 'val',
        turnuri: [tur],
        inamici: [{ id: 1, tip: 'blindat', viata: 1, progres: 0, stari: {} }],
        deGenerat: [{ tick: 10_000, tip: 'normal' }],
      }
      const n = step(s)
      expect(n.inamici).toHaveLength(0)
      return n.aur - s.aur
    }
    expect(ucis({})).toBe(ENEMIES.blindat.aur)
    expect(ucis({ saracie: 1 })).toBe(Math.floor((ENEMIES.blindat.aur * (100 - p1)) / 100))
  })
})

describe('Drumuri rare și Ceața: regulile', () => {
  it('Drumuri rare: ocolul vine doar înaintea valurilor 1, 1 + k, 1 + 2k…', () => {
    const s = newGame(7)
    const limite = (m: Modificatori): number[] => [0, 1, 2, 3, 4, 5, 6].map((val) => detourLimit({ ...s, val, modificatori: m }))
    expect(limite({})).toEqual([1, 1, 1, 1, 1, 1, 1])
    expect(limite({ drumuri: 1 })).toEqual([1, 0, 1, 0, 1, 0, 1])
    expect(limite({ drumuri: 2 })).toEqual([1, 0, 0, 1, 0, 0, 1])
    // Cartea „Ocol în plus” merge oricând, iar relicva crește doar ocolurile de pe val.
    expect(detourLimit({ ...s, val: 1, modificatori: { drumuri: 1 }, ocoluriBonus: 1 })).toBe(1)
    expect(detourLimit({ ...s, val: 2, modificatori: { drumuri: 1 }, ocoluriPeVal: 2 })).toBe(2)
  })

  it('Drumuri rare: fără ocol, valul pornește direct, iar ocolul se refuză cu motivul și valul următor', () => {
    const s = { ...newGame(7, { modificatori: { drumuri: 2 } }), val: 1 }
    expect(checkStartWave(s).ok).toBe(true)
    const r = checkDetourAllowed(s)
    expect(!r.ok && r.reason).toContain('înaintea valului 4')
    expect(checkStartWave({ ...s, val: 3 }).ok).toBe(false)
  })

  it('Ceața de treapta a doua ia dealului raza în plus; treapta întâi, nu', () => {
    const s = arena({ '0,1': 'deal' })
    for (const tip of ['fizic', 'fulger'] as const) {
      expect(towerRange(s, tip, '0,1')).toBe(TOWERS[tip].raza + 1)
      expect(towerRange({ ...s, modificatori: { ceata: 1 } }, tip, '0,1')).toBe(TOWERS[tip].raza + 1)
      expect(towerRange({ ...s, modificatori: { ceata: 2 } }, tip, '0,1')).toBe(TOWERS[tip].raza)
      expect(towerRange({ ...s, modificatori: { ceata: 2 } }, tip, '0,2')).toBe(TOWERS[tip].raza)
    }
  })
})

describe('Sezonul inundațiilor: apa crește', () => {
  it('se inundă câmpiile vecine cu o apă; un singur inel; drumul și celelalte terenuri, niciodată', () => {
    const s = arena({ '0,2': 'apa', '6,2': 'apa', '6,1': 'padure', '3,1': 'apa' })
    const t = floodPlains(s.map.terrain, s.path)
    // Toți vecinii-câmpie ai apei (0,2).
    for (const k of ['0,1', '1,1', '1,2', '-1,2', '0,3', '-1,3']) expect(t.get(k)).toBe('apa')
    // Un singur inel: la două hexagoane de apă, câmpia rămâne.
    expect(t.get('0,4')).toBe('campie')
    expect(t.get('-2,2')).toBe('campie')
    // Pădurea de lângă apă rămâne pădure; câmpia fără apă vecină rămâne câmpie.
    expect(t.get('6,1')).toBe('padure')
    expect(t.get('-7,1')).toBe('campie')
    // Drumul, vecin cu apa (3,1), nu se inundă.
    for (const h of s.path) expect(t.get(key(h))).toBe(s.map.terrain.get(key(h)))
    // Terenul de dinainte rămâne neatins.
    expect(s.map.terrain.get('0,1')).toBe('campie')
  })

  it('la pornire: harta inundată (drumul rămâne), amfibii cu 2 în plus (peste plafon), iar cenușa de lângă apa nouă e noroi', () => {
    const seed = seedCuApa(INUNDATII_MINIM_APA)
    const fara = newGame(seed)
    const cu = newGame(seed, { modificatori: { inundatii: 1 } })
    const nou = [...cu.map.terrain].filter(([k, t]) => t === 'apa' && fara.map.terrain.get(k) !== 'apa').map(([k]) => k)
    expect(nou.length).toBeGreaterThan(0)
    expect(cu.path).toEqual(fara.path)
    expect(cu.amfibii).toBe(fara.amfibii + 2)
    const plin = newGame(seed, { amfibii: 99, modificatori: { inundatii: 1 } })
    expect(plin.amfibii).toBe(AMFIBII.maxim + 2)
    // Cenușă pusă de regiune lângă o câmpie care se inundă devine noroi.
    const h = nou[0]!
    const vecin = neighbors({ q: Number(h.split(',')[0]), r: Number(h.split(',')[1]) })
      .map(key)
      .find((k) => fara.map.terrain.get(k) === 'campie' && !fara.path.some((p) => key(p) === k) && !nou.includes(k))
    expect(vecin).toBeDefined()
    expect(newGame(seed, { teren: new Map([[vecin!, 'cenusa']]) }).map.terrain.get(vecin!)).toBe('cenusa')
    expect(newGame(seed, { teren: new Map([[vecin!, 'cenusa']]), modificatori: { inundatii: 1 } }).map.terrain.get(vecin!)).toBe('noroi')
  })

  it('apa crește și în jurul canalelor săpate pe regiune', () => {
    const seed = seedCuApa(INUNDATII_MINIM_APA)
    const fara = newGame(seed)
    // O câmpie departe de orice apă și de drum, cu vecini câmpie: acolo se sapă canalul.
    const uscata = (k: string): boolean => {
      const [q, r] = k.split(',').map(Number) as [number, number]
      return neighbors({ q, r }).every((n) => fara.map.terrain.get(key(n)) !== 'apa' && !fara.path.some((p) => key(p) === key(n)))
    }
    const canal = [...fara.map.terrain].find(([k, t]) => t === 'campie' && uscata(k))?.[0]
    expect(canal).toBeDefined()
    const [q, r] = canal!.split(',').map(Number) as [number, number]
    const vecini = neighbors({ q, r }).map(key).filter((k) => fara.map.terrain.get(k) === 'campie')
    expect(vecini.length).toBeGreaterThan(0)
    const cu = newGame(seed, { teren: new Map([[canal!, 'apa']]), modificatori: { inundatii: 1 } })
    for (const k of vecini) expect(cu.map.terrain.get(k)).toBe('apa')
  })

  it('apa naturală se socotește pe harta generată', () => {
    const seed = seedCuApa(INUNDATII_MINIM_APA)
    const g = generateMap(seed)
    expect(naturalAmphibians(g.map, g.path)).toBe(Math.min(AMFIBII.apaNaturala.maxim, Math.floor(naturalRoadsideWater(seed) / AMFIBII.apaNaturala.hexagoane)))
  })
})

describe('modificatorii în partidă: amprenta și rejucarea', () => {
  it('modificatorii intră în amprentă și în rejucare', () => {
    const m: Modificatori = { hoarde: 1, piele: 1, avangarda: 1 }
    expect(fingerprint(newGame(7, { modificatori: m }))).not.toBe(fingerprint(newGame(7)))
    expect(fingerprint(newGame(7, { modificatori: { ceata: 1 } }))).not.toBe(fingerprint(newGame(7)))
    let s = newGame(7, { modificatori: m })
    for (let v = 0; v < 2; v++) s = runWave(startWave(s))
    expect(fingerprint(replay(7, s.jurnal, s.tick, { modificatori: m }))).toBe(fingerprint(s))
    // Fără ei, rejucarea iese altfel (sau se oprește: o decizie nu se mai potrivește).
    const fara = ((): string => {
      try {
        return fingerprint(replay(7, s.jurnal, s.tick))
      } catch {
        return 'refuzată'
      }
    })()
    expect(fara).not.toBe(fingerprint(s))
  })
})

describe('pe planetă: la revenire, cu sigilii', () => {
  const START = key(LUME.start)
  const win = (l: Lume, cheie: string, m: Modificatori = {}): Lume => {
    const r = startRun(l, cheie, m)
    if (!r.ok) throw new Error(r.reason)
    return commitRun(l, cheie, { ...r.value.state, faza: 'castigat', tick: 1000 })
  }

  it('modificatorii se aleg doar pe o regiune salvată, iar alegerea se verifică', () => {
    let l = newWorld(42)
    const r = startRun(l, START, { hoarde: 1 })
    expect(!r.ok && r.reason).toContain('după ce salvezi regiunea')
    l = win(l, START)
    const ok = startRun(l, START, { hoarde: 1 })
    expect(ok.ok && ok.value.state.modificatori).toEqual({ hoarde: 1 })
    expect(ok.ok && ok.value.start.modificatori).toEqual({ hoarde: 1 })
    expect(startRun(l, START, { hoarde: 9 }).ok).toBe(false)
    // Fără modificatori, partida e ca înainte (și `start` n-are câmpul).
    const fara = startRun(l, START)
    expect(fara.ok && 'modificatori' in fara.value.start).toBe(false)
  })

  it('Sezonul inundațiilor, doar pe regiunile cu apă lângă drum', () => {
    // O planetă cu o regiune uscată și una udă printre cele 7.
    let gasit: { l: Lume; uda: string; uscata: string } | undefined
    for (let seed = 1; seed < 200 && !gasit; seed++) {
      const regiuni = planetRegions(seed).filter((r) => !r.inima)
      const uda = regiuni.find((r) => naturalRoadsideWater(r.seed) >= INUNDATII_MINIM_APA)
      const uscata = regiuni.find((r) => naturalRoadsideWater(r.seed) < INUNDATII_MINIM_APA)
      if (!uda || !uscata) continue
      // Le salvează pe amândouă direct, ca accesul să nu conteze aici.
      const l: Lume = { ...newWorld(seed), regiuni: { [uda.cheie]: { salvata: true, partide: 1, editari: [] }, [uscata.cheie]: { salvata: true, partide: 1, editari: [] } } }
      gasit = { l, uda: uda.cheie, uscata: uscata.cheie }
    }
    if (!gasit) throw new Error('nicio planetă potrivită')
    expect(startRun(gasit.l, gasit.uda, { inundatii: 1 }).ok).toBe(true)
    const r = startRun(gasit.l, gasit.uscata, { inundatii: 1 })
    expect(!r.ok && r.reason).toContain('apă lângă drum')
  })

  it('o partidă câștigată ține minte cea mai mare amenințare; pierderile și amenințările mai mici n-o schimbă', () => {
    let l = win(newWorld(42), START)
    expect(l.regiuni[START]?.amenintare).toBeUndefined()
    l = win(l, START, PRESETARI.II)
    expect(l.regiuni[START]?.amenintare).toBe(8)
    l = win(l, START, PRESETARI.I)
    expect(l.regiuni[START]?.amenintare).toBe(8)
    const r = startRun(l, START, PRESETARI.III)
    if (!r.ok) throw new Error(r.reason)
    l = commitRun(l, START, { ...r.value.state, faza: 'pierdut', tick: 1000 })
    expect(l.regiuni[START]?.amenintare).toBe(8)
    expect(sealOf(l.regiuni[START]?.amenintare ?? 0)?.sigiliu).toBe('argint')
    l = win(l, START, PRESETARI.III)
    expect(sealOf(l.regiuni[START]?.amenintare ?? 0)?.sigiliu).toBe('aur')
    // Salvarea o păstrează; una stricată se refuză.
    expect(decodeWorld(encodeWorld(l))).toEqual({ ok: true, value: l })
    const stricata = (a: unknown): boolean => decodeWorld(JSON.stringify({ ...l, regiuni: { [START]: { ...l.regiuni[START], amenintare: a } } })).ok
    expect(stricata(-1)).toBe(false)
    expect(stricata(2.5)).toBe(false)
    expect(stricata('8')).toBe(false)
    const nesalvata = { ...l, regiuni: { [START]: { salvata: false, partide: 1, editari: [], amenintare: 4 } } }
    expect(decodeWorld(JSON.stringify(nesalvata)).ok).toBe(false)
  })

  it('o partidă rămasă la jumătate se reface cu modificatorii ei', () => {
    let l = win(newWorld(42), START)
    const m: Modificatori = { hoarde: 2, avangarda: 1 }
    const r = startRun(l, START, m)
    if (!r.ok) throw new Error(r.reason)
    let s = runWave(startWave(r.value.state))
    s = startWave(s)
    for (let i = 0; i < 100; i++) s = step(s)
    const refacuta = settleRun(l, { cheie: START, tick: s.tick, jurnal: s.jurnal, modificatori: m })
    if (!refacuta.ok) throw new Error(refacuta.reason)
    expect(fingerprint(refacuta.value.final)).toBe(fingerprint(s))
    // Fără modificatori (o salvare de dinainte de felia 11), rejucarea iese altfel.
    const fara = settleRun(l, { cheie: START, tick: s.tick, jurnal: s.jurnal })
    expect(fara.ok && fingerprint(fara.value.final)).not.toBe(fingerprint(s))
    l = refacuta.value.lume
    expect(l.regiuni[START]?.partide).toBe(2)
    expect(regionOf(l, START)).toBeDefined()
  })
})
