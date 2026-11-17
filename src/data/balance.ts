// Toate cifrele de echilibru ale jocului. Un număr de gameplay scris în altă parte e o greșeală.
// Unități: secunde, pixeli de lume (lumea e 1100 × 1500), puncte de viață. Vitezele sunt în px/s.
import type { BuildKind, Res } from '../sim/state'

export const BALANCE = {
  castle: { hp: 400 },                       // puncte de viață ale castelului
  start: { wood: 20, stone: 0 },             // resursele de la începutul partidei
  hero: {
    r: 13,                                   // raza eroului, px
    speed: 165,                              // viteza de mers, px/s
    hp: 60,                                  // viață la nivelul 1
    hpPerLevel: 20,                          // viață în plus la fiecare nivel
    dmg: 10,                                 // lovitura la nivelul 1
    dmgPerLevel: 6,                          // lovitură în plus la fiecare nivel
    reach: 58,                               // bătaia loviturii, px
    swingEvery: 0.45,                        // secunde între două lovituri
    arc: 1.25,                               // deschiderea arcului loviturii, radiani
    push: 140,                               // impulsul dat unui dușman obișnuit, px/s
    pushBrute: 60,                           // impulsul dat unui bruta, px/s
    pushDamping: 7,                          // cât de repede se stinge impulsul, 1/s
    regenWait: 3,                            // secunde fără lovituri primite până începe vindecarea
    regen: 4,                                // viață recăpătată pe secundă
    respawn: 5,                              // secunde până reapare după ce cade
    maxLevel: 5,                             // nivelul maxim al eroului
  },
  node: {
    wood: { amount: 8, every: 0.3, regrow: 18, r: 9 },    // copac: bucăți, secunde între bucăți, secunde până crește la loc, raza px
    stone: { amount: 6, every: 0.42, regrow: 24, r: 14 }, // stâncă: aceleași câmpuri
    reach: 16,                               // cât de aproape de margine trebuie să fie eroul ca să taie, px
  },
  tower: {
    range: 190,                              // bătaia turnului, px
    every: 0.8,                              // secunde între două focuri
    dmgBase: 6,                              // lovitura la nivelul 1
    dmgPerLevel: 5,                          // lovitură în plus la fiecare nivel
    maxLevel: 5,                             // nivelul maxim al turnului
    shotSpeed: 420,                          // viteza proiectilului, px/s
    r: 14,                                   // raza turnului, px
  },
  camp: { every: [1.6, 1.0, 0.7], maxLevel: 3, r: 18 },     // secunde între două bucăți de lemn, pe nivel; nivel maxim; raza px
  quarry: { every: [2.4, 1.5, 1.0], maxLevel: 3, r: 18 },   // la fel, pentru piatră
  repair: { every: 0.1, heal: 5 },           // secunde între două reparații; viață dată castelului la fiecare
  pay: {
    every: 0.035,                            // secunde între două unități plătite la un cerc
    dwell: 0.35,                             // secunde de stat în cerc până începe plata
    restAfterLevel: 0.7,                     // pauză după ce un nivel s-a încheiat, secunde
  },
  foe: {
    firstAt: 10,                             // secunda primei apariții
    chase: 90,                               // la ce distanță de erou un dușman îl urmărește, px
    hitCastleEvery: 1,                       // secunde între loviturile în castel
    hitHeroEvery: 0.8,                       // secunde între loviturile în erou
    firstHit: 0.4,                           // secunde până la prima lovitură după ce a ajuns
    grunt: { r: 10, speed: 46, dmg: 3 },     // dușmanul obișnuit: raza px, viteza px/s, lovitura
    brute: { r: 15, speed: 30, dmg: 9, hpTimes: 4, every: 7, after: 120 }, // bruta: raza, viteza, lovitura, de câte ori mai multă viață, la a câta apariție, după câte secunde
  },
  fx: { textLife: 0.9, puffLife: 0.3 },      // cât trăiesc textele plutitoare și norișorii, secunde
} as const

// Costul de a AJUNGE la nivelul dat (nu cel de a-l păstra).
const CAMP_COST = [{ wood: 25, stone: 0 }, { wood: 40, stone: 15 }, { wood: 60, stone: 35 }] as const
const QUARRY_COST = [{ wood: 35, stone: 0 }, { wood: 45, stone: 20 }, { wood: 60, stone: 40 }] as const

export function cost(kind: BuildKind, level: number): Record<Res, number> {
  if (kind === 'tower') return { wood: 20 + 15 * (level - 1), stone: 15 * (level - 1) }   // lemn 20 + 15(n−1), piatră 15(n−1)
  if (kind === 'hero') return { wood: 25 + 15 * (level - 2), stone: 10 + 15 * (level - 2) } // nivelurile 2–5
  const table = kind === 'camp' ? CAMP_COST : QUARRY_COST
  const row = table[level - 1]
  if (!row) throw new Error(`nivel fără cost: ${kind} ${level}`)
  return { wood: row.wood, stone: row.stone }
}

export function towerDamage(level: number): number {
  return BALANCE.tower.dmgBase + BALANCE.tower.dmgPerLevel * (level - 1)
}

/** Secunde între două apariții de dușmani, la momentul t al partidei. */
export function spawnEvery(t: number): number {
  return Math.max(0.6, 5 / (1 + t / 90))
}

/** Viața unui dușman obișnuit care apare la momentul t. */
export function foeHp(t: number): number {
  return 14 * (1 + t / 80)
}
