import { describe, expect, it } from 'vitest'
import { MOD_IDS } from '../data/modules'
import { STR } from './strings'

describe('textele temei de spațiu', () => {
  it('numele de pe cercuri și din bandă', () => {
    expect(STR.pad).toEqual({ turret: 'Turelă', collector: 'Colector', mine: 'Mină', hero: 'Navă', repair: 'Repară planeta' })
    expect([STR.crystal, STR.metal, STR.core]).toEqual(['cristale', 'metal', 'Planetă'])
    expect(STR.padLevel(STR.pad.turret, 3)).toBe('Turelă nivel 3')
    expect(STR.padMax(STR.pad.mine)).toBe('Mină · nivel maxim')
  })
  it('mesajele partidei', () => {
    expect(STR.heroDown).toBe('Nava a fost doborâtă')
    expect(STR.overTitle).toBe('Planeta a căzut')
    expect(STR.overKills).toBe('Nave doborâte')
    expect(STR.fieldLabel).toBe('Zona de joc')
  })
  it('indiciul de mers; cele patru rânduri de reguli de pe cartonașul de start nu mai sunt', () => {
    expect(STR.hint).toBe('Ține degetul pe ecran și trage ca să miști nava')
    for (const k of ['ruleMove', 'ruleGather', 'ruleInvest', 'ruleFight', 'start']) expect(k in STR, k).toBe(false)
  })
  it('textele pauzei și ale reluării', () => {
    expect([STR.pause, STR.pauseTitle, STR.pauseSoFar]).toEqual(['Pauză', 'Pauză', 'Ai rezistat până acum'])
    expect([STR.resume, STR.fresh]).toEqual(['Continuă', 'Partidă nouă'])
    expect(STR.continueSaved('2:47')).toBe('Continuă partida · 2:47')
  })
  it('panoul de alegere: fiecare modul are nume și rânduri scurte', () => {
    expect(Object.keys(STR.mods).sort()).toEqual([...MOD_IDS].sort())
    for (const id of MOD_IDS) {
      const m = STR.mods[id]
      expect(m.name.length).toBeGreaterThan(0)
      expect(m.up.length).toBeGreaterThan(0)
      expect(m.fresh.length).toBeLessThanOrEqual(2)
      if (id !== 'wave') expect(m.fresh.length).toBeGreaterThan(0)   // Unda e pe navă de la început: nu se oferă ca nouă
      for (const l of [...m.fresh, m.up, STR.tierLine(3)]) expect(l.length).toBeLessThanOrEqual(28)
    }
    expect(MOD_IDS.map((id) => STR.mods[id].name)).toEqual(['Undă', 'Laser', 'Rachete', 'Blindaj', 'Scut', 'Reparator', 'Motor', 'Magnet', 'Releu'])
    expect(STR.kind).toEqual({ weapon: 'Armă', body: 'Corp', utility: 'Utilitar' })
    expect([STR.offerNew, STR.offerUp, STR.chooseTitle, STR.chooseNote]).toEqual(['Nou', 'Întărire', 'Alege un modul', 'Jocul stă pe loc cât alegi.'])
    expect([STR.levelN(4), STR.tierLine(2)]).toEqual(['Nivel 4', 'Treapta 2 din 3'])
  })
  it('experiența și nivelul din bandă și de pe cercul navei', () => {
    expect([STR.xpOf(14, 40), STR.levelReady(4), STR.levelMax]).toEqual(['experiență 14/40', 'Nivel 4 gata', 'Nivel maxim'])
    expect(STR.xpOf(34, 34).length).toBeLessThanOrEqual(18)   // încape în bandă la 360 px, lângă inel și locuri
  })
  it('cartonașul de start: cele două moduri, sectorul și rezerva', () => {
    expect([STR.defend, STR.explore, STR.sectorN(3), STR.reserve, STR.workshop]).toEqual(['Apără planeta', 'Explorează galaxia', 'Sectorul 3', 'Rezerva', 'Atelier'])
    expect(STR.defendLine).toBe('Strânge, construiește și rezistă cât poți.')
    expect(STR.exploreLine).toBe('Zboară trei minute, ferește-te și adu resurse acasă.')
    expect(STR.defendFresh).toBe('Partidă nouă: cea salvată se pierde.')   // rândul lui „Apără planeta” cât e o partidă salvată
    expect([STR.sectorLess, STR.sectorMore]).toEqual(['Un sector mai aproape', 'Un sector mai departe'])
  })
  it('sfârșitul zborului și pauza lui', () => {
    expect([STR.explored, STR.heroDown, STR.broughtHome, STR.gotSoFar]).toEqual(['Sector explorat', 'Nava a fost doborâtă', 'Ai adus acasă', 'Ai apucat să strângi'])
    expect([STR.nextSector, STR.flyAgain, STR.backHome]).toEqual(['Sectorul următor', 'Încă un zbor', 'Înapoi la start'])
    expect([STR.flightPauseTitle, STR.flightSoFar, STR.quitFlight]).toEqual(['Zbor în pauză', 'Ai strâns până acum', 'Renunță la zbor'])
  })
  it('banda din zbor: modulele, nava de elită și rândul „ai cules”', () => {
    expect(STR.flightMods).toEqual({ gun: 'Tun', laser: 'Laser', missile: 'Rachete', shield: 'Scut', magnet: 'Magnet' })
    expect(STR.flightMods.laser).toBe(STR.mods.laser.name)   // aceleași nume ca la apărare, nu scrise de două ori
    expect(STR.elite).toBe('Elită')
    expect(STR.tookRepair).toBe('Reparație · +1 viață')
    expect(STR.tookNew('Scut')).toBe('Scut · nou')
    expect(STR.tookTier('Tun', 2)).toBe('Tun · treapta 2')
    expect(STR.tookMaxed('Laser', 5)).toBe('Laser e la maxim · +5 cristale')
  })
  it('atelierul: titlul, „Înapoi”, „La plafon”, cele cinci întăriri și rândul fiecăreia', () => {
    expect([STR.shopEyebrow, STR.back, STR.maxed]).toEqual(['Întăriri care rămân', 'Înapoi', 'La plafon'])
    expect(STR.upName).toEqual({ hull: 'Carenă', arms: 'Armament', reach: 'Colectare', core: 'Planetă', kit: 'Arsenal de pornire' })
    expect(STR.upText.hull).toBe('Nava are mai multă viață.')
    expect(STR.upText.core).toBe('Planeta are mai multă viață.')
    expect(STR.kitText[0]).toBe('Zborul pornește cu Laserul.')
    expect(STR.buyLabel('Carenă', 50, 10)).toBe('Carenă: 50 cristale, 10 metal')
    expect(STR.buyLabel('Colectare', 40, 0)).toBe('Colectare: 40 cristale')
  })
  it('textele noi din butoane și din bandă au cel mult 28 de caractere', () => {
    const names = Object.values(STR.flightMods)
    const lines = [STR.defend, STR.explore, STR.sectorN(99), STR.reserve, STR.workshop, STR.explored, STR.heroDown, STR.broughtHome, STR.gotSoFar,
      STR.nextSector, STR.flyAgain, STR.backHome, STR.flightPauseTitle, STR.flightSoFar, STR.quitFlight, STR.elite, STR.tookRepair, STR.shopEyebrow, STR.back, STR.maxed, ...Object.values(STR.upName),
      ...names.flatMap((n) => [STR.tookNew(n), STR.tookTier(n, 3)])]
    for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(28)
    // Rândul pentru un modul deja la maxim are forma cerută și trece de 28 („Rachete e la maxim · +5 cristale” are 32); stă pe un rând
    // al lui, sub bandă, nu într-un buton: cel mult 32.
    for (const n of names) expect(STR.tookMaxed(n, 5).length).toBeLessThanOrEqual(32)
  })
  it('niciun text nu mai pomenește tema veche', () => {
    const all = JSON.stringify(STR, (_k, v) => (typeof v === 'function' ? v('x', 1) : v)).toLowerCase()
    for (const w of ['castel', 'turn', 'lemn', 'piatr', 'copac', 'stânc', 'tăietor', 'carier', 'erou']) expect(all).not.toContain(w)
  })
})
