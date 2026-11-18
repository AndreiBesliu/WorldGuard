// Toate cifrele de echilibru ale jocului. Un număr de gameplay scris în altă parte e o greșeală.
// Unități: secunde, pixeli de lume (lumea e 1100 × 1500), puncte de viață. Vitezele sunt în px/s.
import type { BuildKind, Res } from '../sim/state'

export const BALANCE = {
  core: { hp: 400 },                         // puncte de viață ale nucleului
  start: { crystal: 20, metal: 0 },          // resursele de la începutul partidei
  hero: {
    r: 13,                                   // raza eroului, px
    speed: 165,                              // viteza de mers, px/s
    hp: 60,                                  // viață la nivelul 1
    hpPerLevel: 20,                          // viață în plus la fiecare nivel
    dmg: 10,                                 // puterea loviturii (undei) la nivelul 1
    dmgPerLevel: 6,                          // putere în plus a loviturii (undei) la fiecare nivel
    reach: 58,                               // bătaia undei, px
    strikeEvery: 0.45,                       // secunde între două unde
    arc: 1.25,                               // deschiderea arcului undei, radiani
    push: 140,                               // impulsul dat unui dușman obișnuit, px/s
    pushBrute: 60,                           // impulsul dat unui bruta, px/s
    pushDamping: 7,                          // cât de repede se stinge impulsul, 1/s
    regenWait: 3,                            // secunde fără lovituri primite până începe vindecarea
    regen: 4,                                // viață recăpătată pe secundă
    respawn: 5,                              // secunde până reapare după ce cade
    maxLevel: 5,                             // nivelul maxim al eroului
    deadzone: 0.01,                          // sub această lungime a comenzii, eroul stă pe loc
    faceLock: 0.25,                          // secunde după o undă în care privirea nu urmează mersul
    edge: 20,                                // distanța minimă dintre erou și marginea hărții, px
    puffR: 26,                               // raza norișorului când eroul cade, px
  },
  node: {
    crystal: { amount: 8, every: 0.3, regrow: 18, r: 9 }, // cristal: bucăți, secunde între bucăți, secunde până crește la loc, raza px
    metal: { amount: 6, every: 0.42, regrow: 24, r: 14 }, // metal: aceleași câmpuri
    reach: 16,                               // cât de aproape de margine trebuie să fie eroul ca să strângă, px
  },
  turret: {
    range: 190,                              // bătaia turelei, px
    every: 0.8,                              // secunde între două focuri
    dmgBase: 6,                              // raza la nivelul 1
    dmgPerLevel: 5,                          // rază în plus la fiecare nivel
    maxLevel: 5,                             // nivelul maxim al turelei
    shotSpeed: 420,                          // viteza proiectilului, px/s
    r: 14,                                   // raza turelei, px
    arrive: 6,                               // la cât de aproape de țintă (peste un pas) raza a ajuns, px
  },
  collector: { every: [1.6, 1.0, 0.7], maxLevel: 3, r: 18 }, // secunde între două bucăți de cristal, pe nivel; nivel maxim; raza px
  mine: { every: [2.4, 1.5, 1.0], maxLevel: 3, r: 18 },      // la fel, pentru metal
  repair: { every: 0.1, heal: 5 },           // secunde între două reparații; viață dată nucleului la fiecare
  pay: {
    every: 0.035,                            // secunde între două unități plătite la un cerc
    dwell: 0.35,                             // secunde de stat în cerc până începe plata
    restAfterLevel: 0.7,                     // pauză după ce un nivel s-a încheiat, secunde
  },
  foe: {
    firstAt: 10,                             // secunda primei apariții
    chase: 90,                               // la ce distanță de erou un dușman îl urmărește, px
    hitCoreEvery: 1,                         // secunde între loviturile în nucleu
    hitHeroEvery: 0.8,                       // secunde între loviturile în erou
    stopCore: 1,                             // cât de departe de nucleu se oprește un dușman, px
    stopHero: 2,                             // cât de departe de erou se oprește un dușman, px
    pushFloor: 0.01,                         // sub atât (unități pe secundă) împinsul se consideră stins
    firstHit: 0.4,                           // secunde până la prima lovitură după ce a ajuns
    grunt: { r: 10, speed: 46, dmg: 3 },     // dușmanul obișnuit: raza px, viteza px/s, lovitura
    brute: { r: 15, speed: 30, dmg: 9, hpTimes: 4, every: 7, after: 120 }, // bruta: raza, viteza, lovitura, de câte ori mai multă viață, la a câta apariție, după câte secunde
  },
  stick: { r: 48, dead: 0.14, full: 0.7 },   // joystick: raza în pixeli de ecran; sub 14% din cursă eroul stă; la 70% din cursă are viteza maximă
  fx: { textLife: 0.9, puffLife: 0.3, puffPad: 6 }, // cât trăiesc textele plutitoare și norișorii, secunde; cât adaugă norișorul unui dușman la raza lui, px
} as const

// Costul de a AJUNGE la nivelul dat (nu cel de a-l păstra).
const COLLECTOR_COST = [{ crystal: 25, metal: 0 }, { crystal: 40, metal: 15 }, { crystal: 60, metal: 35 }] as const
const MINE_COST = [{ crystal: 35, metal: 0 }, { crystal: 45, metal: 20 }, { crystal: 60, metal: 40 }] as const

export function cost(kind: BuildKind, level: number): Record<Res, number> {
  if (kind === 'turret') return { crystal: 20 + 15 * (level - 1), metal: 15 * (level - 1) }    // cristal 20 + 15(n−1), metal 15(n−1)
  if (kind === 'hero') return { crystal: 25 + 15 * (level - 2), metal: 10 + 15 * (level - 2) } // nivelurile 2–5
  const table = kind === 'collector' ? COLLECTOR_COST : MINE_COST
  const row = table[level - 1]
  if (!row) throw new Error(`nivel fără cost: ${kind} ${level}`)
  return { crystal: row.crystal, metal: row.metal }
}

export function turretDamage(level: number): number {
  return BALANCE.turret.dmgBase + BALANCE.turret.dmgPerLevel * (level - 1)
}

/** Secunde între două apariții de dușmani, la momentul t al partidei. */
export function spawnEvery(t: number): number {
  return Math.max(0.6, 5 / (1 + t / 90))
}

/** Viața unui dușman obișnuit care apare la momentul t. */
export function foeHp(t: number): number {
  return 14 * (1 + t / 80)
}
