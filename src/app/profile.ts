// Profilul jucătorului: rezerva de resurse, sectorul cel mai departe explorat și treptele atelierului. Fără DOM și fără stocare
// (stocarea e în `storage.ts`); fiecare regulă întoarce un profil nou, iar cel primit rămâne neatins.
import { FLIGHT } from '../data/flight'
import { MAX_UPS, NO_UPS, UP_IDS, WORKSHOP, upPrice, type Cost, type UpId, type Ups } from '../data/workshop'
import { fail, ok, type Result } from '../sim/result'

export const PROFILE_VERSION = 1

export interface Profile { crystal: number; metal: number; sector: number; ups: Ups }   // sector = cel mai departe explorat, 0 = niciunul

export function emptyProfile(): Profile {
  return { crystal: 0, metal: 0, sector: 0, ups: { ...NO_UPS } }
}

export function packProfile(p: Profile): string {
  return JSON.stringify({ v: PROFILE_VERSION, crystal: p.crystal, metal: p.metal, sector: p.sector, ups: p.ups })
}

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
const sameKeys = (o: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(o).sort().join() === [...keys].sort().join()

export function unpackProfile(text: string | null | undefined): Result<Profile> {
  if (text === null || text === undefined || text === '') return fail('lipsă')
  let o: unknown
  try { o = JSON.parse(text) } catch { return fail('stricat') }
  if (!isObject(o) || typeof o.v !== 'number') return fail('stricat')
  if (o.v !== PROFILE_VERSION) return fail('altă versiune')
  if (!sameKeys(o, ['v', 'crystal', 'metal', 'sector', 'ups']) || !isObject(o.ups) || !sameKeys(o.ups, UP_IDS)) return fail('altă formă')
  if (!isCount(o.crystal) || !isCount(o.metal) || !isCount(o.sector)) return fail('număr greșit în rezervă sau în sector')
  if (o.sector > FLIGHT.sectorCap) return fail('sector peste plafon')
  const ups = o.ups
  for (const id of UP_IDS) {
    const t = ups[id]
    if (!isCount(t) || t > MAX_UPS[id]) return fail(`treaptă greșită la ${id}`)
  }
  return ok({ crystal: o.crystal, metal: o.metal, sector: o.sector, ups: { ...(ups as Record<UpId, number>) } })
}

/** Prețul treptei următoare, dacă se poate cumpăra; altfel motivul. */
export function canBuy(p: Profile, id: UpId): Result<Cost> {
  if (p.ups[id] >= WORKSHOP[id].max) return fail('la plafon')
  const price = upPrice(id, p.ups[id] + 1)
  if (p.crystal < price.crystal) return fail('prea puține cristale')
  if (p.metal < price.metal) return fail('prea puțin metal')
  return ok(price)
}

/** Profil nou, cu o treaptă în plus la `id` și prețul scăzut din rezervă. */
export function buy(p: Profile, id: UpId): Result<Profile> {
  const price = canBuy(p, id)
  if (!price.ok) return fail(price.reason)
  return ok({ ...p, crystal: p.crystal - price.value.crystal, metal: p.metal - price.value.metal, ups: { ...p.ups, [id]: p.ups[id] + 1 } })
}

/** Adaugă în rezervă ce s-a adus dintr-un zbor; o valoare negativă sau nefinită se ignoră (nimic nu se schimbă), una cu zecimale se rotunjește în jos. */
export function bank(p: Profile, haul: Cost): Profile {
  const good = (n: number): boolean => Number.isFinite(n) && n >= 0
  if (!good(haul.crystal) || !good(haul.metal)) return p
  return { ...p, crystal: p.crystal + Math.floor(haul.crystal), metal: p.metal + Math.floor(haul.metal) }
}

/** Sectorul cel mai departe explorat nu coboară niciodată; un sector care nu e număr întreg nenegativ, sau e peste plafon, se ignoră. */
export function markExplored(p: Profile, sector: number): Profile {
  if (!isCount(sector) || sector > FLIGHT.sectorCap || sector <= p.sector) return p
  return { ...p, sector }
}
