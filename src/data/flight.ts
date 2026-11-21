// Cifrele zborului („Explorează galaxia”). Un număr din regulile zborului scris în afara lui `src/data/` e o greșeală.
// Unități: secunde, unități de câmp (câmpul e 390 × 680, în picioare), puncte de viață; vitezele, în unități pe secundă.
// Cifrele din tabelele specului sunt ale lui; restul vin din prototipul de aruncat (`docs/prototip-explorare.html`) și sunt
// propuneri, ca și mărimea câmpului și formula sectoarelor.

export type FlightModId = 'gun' | 'laser' | 'missile' | 'shield' | 'magnet'
export type FlightFoeKind = 'drone' | 'weaver' | 'gunship' | 'cargo' | 'elite'

/** Modulele din zbor, în ordinea din spec. */
export const FLIGHT_MODS: readonly FlightModId[] = ['gun', 'laser', 'missile', 'shield', 'magnet']

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
    // Salva pe trepte: unghiurile evantaiului, radiani față de drept în sus; lista goală = cele două proiectile paralele de la treapta 1.
    volley: [[], [-0.1, 0, 0.1], [-0.2, -0.1, 0, 0.1, 0.2]] as readonly (readonly number[])[],
    fanX: 45,                                // în evantai, un proiectil pleacă la unghi × `fanX` de mijlocul navei, în lățime
    lift: 12,                                // și cu atât mai sus de el
    goneTop: 20, goneSide: 10,               // iese din joc la atât deasupra câmpului sau în afara lui, în lături
    foeHit: { x: 3, y: 6 },                  // cât de larg prinde un proiectil un dușman, peste raza lui (în lățime, în înălțime)
    asteroidHit: { x: 2, y: 5 },             // la fel, pentru un asteroid
  },
  // Modulele culese din zbor. Listele pe trepte au indexul treaptă − 1. Lovitura armelor se înmulțește cu Armamentul.
  mods: {
    tiers: 3,                                // treapta cea mai mare
    maxed: 5,                                // cristalele date de un modul cules când e deja la treapta 3
    laser: {
      every: 0.9, range: 300, dmg: [14, 22, 32] as readonly number[],
      retry: 0.1,                            // fără țintă, mai caută peste atât
      from: 14,                              // raza pleacă de la atât deasupra mijlocului navei
    },
    missile: {
      every: 2.4, dmg: [12, 18, 26] as readonly number[],
      range: 430,                            // pleacă doar dacă are o țintă până la atât
      retry: 0.2,
      blast: 50, blastPad: 0.5,              // explozia prinde tot ce e la mai puțin de `blast` + `blastPad` × raza lui
      from: 10, launch: 220,                 // pleacă de la atât deasupra navei, în sus cu `launch`
      speed: 320, steer: 7,                  // viteza spre țintă și cât de repede se întoarce (pe secundă, cel mult 1 pe pas)
      seek: 500, seekAhead: 60,              // fără țintă, ia cel mai apropiat dușman până la `seek`, căutat de la `seekAhead` sub ea
      hit: 5,                                // se sparge la raza dușmanului + atât
      gone: 30,                              // iese din joc la atât în afara câmpului
    },
    shield: {
      recharge: [6, 4.5, 3] as readonly number[],   // secunde până se reîncarcă după o lovitură oprită
      inv: 0.45,                             // secunde fără lovituri după una oprită
    },
    magnet: { reach: [45, 90, 135] as readonly number[] },   // se adaugă la `drops.reach`
  },
  // Pe cine țintesc Laserul și Rachetele: dușmanii vii, nu mai sus de `top` (transportul, nu mai sus de `cargoTop`),
  // nici mai jos de `below` sub punctul din care se caută.
  aim: { top: 12, cargoTop: 30, below: 30 },
  // Ce lasă transportul doborât (un singur lucru de cules) și cum se culege.
  picks: {
    fall: 62,                                // coboară cu atât; nu vine spre navă, nici cu Magnetul
    take: 27,                                // se culege la atât de mijlocul navei
    gone: 30,                                // iese din joc la atât sub câmp
    fresh: 0.65,                             // șansa să aleagă dintre modulele pe care nava nu le are (când există)
    repair: 0.22, repairLow: 0.5, low: 2,    // cu nava lovită, șansa unei reparații; cu viața cel mult `low`, `repairLow`
  },
  // `keepsAway`: nu trage la mai puțin de `foe.fireGap` deasupra navei, nici după ce a trecut de ea. Doar cei care trec pe lângă
  // navă; nava grea și elita stau sus și trag oricât de aproape ar urca nava (propunere, R2).
  foes: {
    drone: { r: 13, hp: 14, vy: 95, fire: 1.7, drop: 1, keepsAway: true },
    weaver: { r: 13, hp: 20, vy: 75, fire: 2.1, drop: 1, keepsAway: true, amp: 70, freq: 1.6, edge: 16 },   // șerpuiește ±`amp`, cu `freq` radiani pe secundă
    gunship: { r: 20, hp: 70, vy: 60, fire: 1.9, drop: 4, keepsAway: false, stopAt: 0.2, roam: 32, roamEdge: 50, stay: 9, leave: 130 },
    cargo: { r: 17, hp: 34, vy: 62, fire: 0, drop: 0, keepsAway: false },
    elite: {
      r: 34, hp: 1400, vy: 45, fire: 1.3, drop: 24, keepsAway: false,
      pattern: ['ring', 'burst', 'burst'],   // tiparul focului, în cerc; între două salve la rând, `burstGap`, altfel `fire`
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
    fireGap: 110,                            // cei cu `keepsAway`: nici la mai puțin de atât deasupra navei (sau după ce a trecut de ea)
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
    cargo: { first: 5, every: 14, span: 4, margin: 60 },   // transportul: la `every` + până la `span` secunde (nu în liniștea de la jumătate)
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
    big: 19,                                 // peste raza asta e mare
    metal: { small: 1, big: 2 },             // cât metal lasă spart, mic sau mare
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
    beamLife: 0.12, blastLife: 0.3, blockLife: 0.35, tookLife: 1.6,   // raza Laserului, explozia unei rachete, lovitura oprită de Scut, rândul „ai cules”
    foePuff: 1.9, elitePuffs: 6, elitePuffR: 30, elitePuffSpan: 30, eliteSpreadX: 80, eliteSpreadY: 60,
    shotPuff: 9, asteroidPuff: 1.7, crashPuff: 1.6,
  },
} as const

/** Cum crește sectorul `n` față de primul (propunere): viața, ritmul aparițiilor, viața elitei, ce lasă în urmă. */
export function sectorScale(n: number): { hp: number; pace: number; elite: number; loot: number } {
  const k = n - 1
  return { hp: 1 + 0.25 * k, pace: Math.max(0.6, 0.94 ** k), elite: 1 + 0.35 * k, loot: 1 + 0.2 * k }
}
