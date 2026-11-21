// Cifrele zborului („Explorează galaxia”). Un număr din regulile zborului scris în afara lui `src/data/` e o greșeală.
// Unități: secunde, unități de câmp (câmpul e 390 × 680, în picioare), puncte de viață; vitezele, în unități pe secundă.
// Cifrele din tabelele specului sunt ale lui; restul vin din prototipul de aruncat (`docs/prototip-explorare.html`) și sunt
// propuneri, ca și mărimea câmpului și formula sectoarelor.

export type FlightModId = 'gun' | 'laser' | 'missile' | 'shield' | 'magnet'
export type FlightFoeKind = 'drone' | 'weaver' | 'gunship' | 'cargo' | 'elite'

export const FLIGHT = {
  field: { w: 390, h: 680 },                 // câmpul de joc, fix (propunere); înălțimile de mai jos sunt fracții din `h`
  sectorSecs: 170,                           // secunde până nu mai apar dușmani obișnuiți
  eliteDelay: 2.5,                           // după `sectorSecs`, secunde până apare nava de elită
  lootSecs: 3.4,                             // după ce cade nava de elită, secunde de strâns până se încheie zborul
  calm: { before: 1, after: 6 },             // liniștea de la jumătatea sectorului: de la jumătate − `before` la jumătate + `after`
  ship: {
    hp: 5,                                   // lovituri pe care le ține nava (plus Carena)
    hitR: 6,                                 // raza punctului din mijloc, singurul care contează la lovituri
    inv: 1.2,                                // secunde fără lovituri după una primită
    startY: 0.8,                             // unde pornește, din înălțime (pe mijloc în lățime)
    side: 18,                                // cât de aproape de marginile din lături poate merge
    top: 0.3,                                // până unde poate urca, din înălțime, măsurat de sus
    bottom: 34,                              // cât de aproape de marginea de jos poate coborî
  },
  drive: { gain: 1.2, max: 1100 },           // nava face mișcarea cerută × `gain`, cu cel mult `max` unități pe secundă
  gun: {
    every: 0.11,                             // secunde între două salve
    firstAt: 0.3,                            // prima salvă
    dmg: 4,                                  // lovitura unui proiectil (× Armamentul)
    speed: 780,                              // viteza proiectilului, în sus
    spread: 7,                               // la treapta 1: cele două proiectile pleacă la ±`spread` de mijlocul navei
    lift: 12,                                // și cu atât mai sus de el
    goneTop: 20, goneSide: 10,               // iese din joc la atât deasupra câmpului sau în afara lui, în lături
    foeHit: { x: 3, y: 6 },                  // cât de larg prinde un proiectil un dușman, peste raza lui (în lățime, în înălțime)
    asteroidHit: { x: 2, y: 5 },             // la fel, pentru un asteroid
  },
  foes: {
    drone: { r: 13, hp: 14, vy: 95, fire: 1.7, drop: 1 },
    weaver: { r: 13, hp: 20, vy: 75, fire: 2.1, drop: 1, amp: 70, freq: 1.6, edge: 16 },   // șerpuiește ±`amp`, cu `freq` radiani pe secundă
    gunship: { r: 20, hp: 70, vy: 60, fire: 1.9, drop: 4, stopAt: 0.2, roam: 32, roamEdge: 50, stay: 9, leave: 130 },
    cargo: { r: 17, hp: 34, vy: 62, fire: 0, drop: 0 },
    elite: {
      r: 34, hp: 1400, vy: 45, fire: 1.3, drop: 24,
      stopAt: 0.17,                          // coboară până la 17% din înălțime, apoi se leagănă
      swayFreq: 0.55, swayAmp: 105,          // leagănul, în jurul mijlocului câmpului
      ring: 14, ringAngry: 18, spin: 0.22,   // cercul de proiectile și cât se rotește de la un cerc la altul, radiani
      burstGap: 0.42,                        // secunde între cele două salve
      angry: 0.8,                            // sub jumătate din viață, pauzele × `angry`
    },
  },
  foe: {
    hpGrow: 0.8,                             // viața crește cu timpul până la × (1 + `hpGrow`) la `sectorSecs` (nu și a elitei)
    firstFire: 0.7, firstFireJitter: 0.8,    // primul foc: `firstFire` + până la `firstFireJitter` secunde
    jitter: 0.85, jitterSpan: 0.3,           // pauza dintre focuri × între `jitter` și `jitter` + `jitterSpan` (nu la elită)
    fireTop: 24,                             // nu trage cât e mai sus de atât (abia a intrat în câmp)
    fireLow: 0.62,                           // nici sub 62% din înălțime
    fireGap: 110,                            // nici la mai puțin de atât deasupra navei (sau după ce a trecut de ea)
    touch: 0.75,                             // o navă dușmană atinge nava ta la `touch` × raza ei + raza punctului
    bump: 12,                                // lovitura pe care o primește o navă dușmană (nu elita) când o atinge pe a ta
    gone: 50,                                // iese din joc la atât sub câmp
  },
  shot: {
    r: 5,                                    // raza proiectilului dușman
    down: 185, aim: 170, fan: 160, ring: 120, burst: 180,   // vitezele: drona, șerpuitoarea, nava grea, cercul și salvele elitei
    fanSpread: [-0.28, 0, 0.28],             // evantaiul navei grele, radiani față de direcția spre navă
    burstSpread: [-0.3, -0.15, 0, 0.15, 0.3],// salva elitei
    burstFrom: 0.6,                          // salva pleacă de la `burstFrom` × raza, sub mijlocul elitei
    gone: 20, goneTop: 30,                   // iese din joc la atât în afara câmpului (sus, `goneTop`)
  },
  spawn: {
    drone: { first: 1.2, every: [1.7, 0.75], jitter: 0.8, jitterSpan: 0.4, margin: 30, pairAfter: 0.15, pair: 0.35 },
    weaver: { first: 24, every: [3.6, 2.0], jitter: 0.8, jitterSpan: 0.4, margin: 80 },
    gunship: { first: 50, every: [10, 6.5], margin: 70, most: 2, mostLate: 3, lateAfter: 0.6, retry: 1 },
    asteroid: { first: 10, every: [2.8, 1.8], jitter: 0.7, jitterSpan: 0.6 },
    escort: { first: 7, every: 5.5, x: 40, xSpan: 110 },   // dronele care o însoțesc pe elită, câte două, simetric
    y: 6,                                    // un dușman intră la raza lui + atât deasupra câmpului
  },
  asteroid: {
    r: 14, rSpan: 11,                        // raza: între `r` și `r` + `rSpan`
    margin: 24,                              // cât de departe de marginile din lături intră
    vx: 34, vy: 55, vySpan: 32, vr: 1.6,     // lateral ±`vx`/2, în jos între `vy` și `vy` + `vySpan`; rotirea ±`vr`/2
    hpPerR: 1.5,                             // viața: raza × `hpPerR`
    shape: 8, shapeMin: 0.78, shapeSpan: 0.32,   // conturul: 8 raze, fiecare între 0,78 și 1,1 din rază
    touch: 0.85,                             // atinge nava la `touch` × raza lui + raza punctului
    big: 19,                                 // peste raza asta lasă 2 de metal, altfel 1
    gone: 40,                                // iese din joc la atât în afara câmpului
    y: 4,                                    // intră la raza lui + atât deasupra câmpului
  },
  drops: {
    reach: 85,                               // de la cât vin spre navă (× Colectarea; Magnetul se adaugă aici)
    pull: 340,                               // cu cât vin
    collect: 22,                             // la cât se culeg
    fall: 75,                                // cu cât coboară cele lăsate în pace
    gone: 20,                                // ies din joc la atât sub câmp
    spread: { one: 6, many: 34, elite: 110, asteroid: 16 },   // cât de împrăștiate cad
  },
  fx: {
    puffLife: 0.4, hurtLife: 0.3, downLife: 0.6,
    foePuff: 1.9, elitePuffs: 6, elitePuffR: 30, elitePuffSpan: 30, eliteSpreadX: 80, eliteSpreadY: 60,
    shotPuff: 9, asteroidPuff: 1.7, crashPuff: 1.6,
  },
} as const

/** Cum crește sectorul `n` față de primul (propunere): viața, ritmul aparițiilor, viața elitei, ce lasă în urmă. */
export function sectorScale(n: number): { hp: number; pace: number; elite: number; loot: number } {
  const k = n - 1
  return { hp: 1 + 0.25 * k, pace: Math.max(0.6, 0.94 ** k), elite: 1 + 0.35 * k, loot: 1 + 0.2 * k }
}
