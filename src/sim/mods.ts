// Modulele navei ca date: experiența și pragul nivelului, locurile, ofertele de la un nivel nou și alegerea uneia.
// Ce face fiecare modul în luptă nu stă aici.
import { BALANCE } from '../data/balance'
import { atTier, MAX_TIER, MODS, OFFERS, type ModId } from '../data/modules'
import { fail, ok, type Result } from './result'
import { createRng } from './rng'
import type { GameState, Mod, Offer } from './state'

/** Modulul de pe navă, cu ceasul lui; undefined dacă nava nu îl are. */
export function modOf(s: GameState, id: ModId): Mod | undefined {
  return s.hero.mods.find((m) => m.id === id)
}

/** Treapta modulului pe navă; 0 dacă nava nu îl are. */
export function tierOf(s: GameState, id: ModId): number {
  return modOf(s, id)?.tier ?? 0
}

/** Câte module încap pe navă la nivelul dat. */
export function slotsAt(level: number): number {
  const slots = BALANCE.hero.slots
  return slots[Math.min(Math.max(level, 1), slots.length) - 1]!
}

/** Experiența cerută pentru nivelul de după `level`; null la nivelul maxim. */
export function xpNeed(level: number): number | null {
  if (level >= BALANCE.hero.maxLevel) return null
  return BALANCE.hero.xpToLevel[level - 1] ?? null
}

/** Nava e sub nivelul maxim și are experiența pentru nivelul următor. */
export function heroReady(s: GameState): boolean {
  const need = xpNeed(s.hero.lvl)
  return need !== null && s.hero.xp >= need
}

/**
 * Ofertele pentru nivelul la care a ajuns nava: module noi (cât are locuri libere) și întăriri (sub treapta maximă), doar din `pool`.
 * Cel mult `OFFERS`, diferite; cel puțin una nouă dacă există, cel puțin o întărire dacă există. null dacă nu e nimic de oferit.
 * Hazardul vine dintr-un flux al nivelului, deci ofertele depind doar de sămânță, de nivel și de modulele navei.
 */
export function makeOffer(s: GameState, pool: readonly ModId[] = BALANCE.hero.offerPool): Offer[] | null {
  const free = s.hero.mods.length < slotsAt(s.hero.lvl)
  const fresh: Offer[] = free ? pool.filter((id) => tierOf(s, id) === 0).map((id) => ({ id, tier: 1 })) : []
  const ups: Offer[] = pool
    .filter((id) => tierOf(s, id) > 0 && tierOf(s, id) < MAX_TIER)
    .map((id) => ({ id, tier: tierOf(s, id) + 1 }))
  if (fresh.length + ups.length === 0) return null
  const rng = createRng(s.seed, 'oferta-' + s.hero.lvl)
  const take = (from: Offer[]): Offer => from.splice(rng.int(from.length), 1)[0]!
  const out: Offer[] = []
  if (fresh.length > 0) out.push(take(fresh))
  if (ups.length > 0) out.push(take(ups))
  const rest = [...fresh, ...ups]
  while (out.length < OFFERS && rest.length > 0) out.push(take(rest))
  for (let i = out.length - 1; i > 0; i--) {   // ordinea pe panou: amestecată, ca nou și întărirea să nu stea mereu sus
    const j = rng.int(i + 1)
    const x = out[i]!; out[i] = out[j]!; out[j] = x
  }
  return out
}

/**
 * Alege oferta cu indexul dat: pune modulul nou sau îi urcă treapta, apoi închide oferta.
 * Refuză, fără să atingă starea, o ofertă care nu se potrivește cu nava (ar putea veni dintr-o salvare stricată):
 * un modul nou pe care nava îl are deja sau pentru care nu are loc, ori o întărire care nu e exact treapta de acum plus unu.
 * Blindajul ales adaugă și la viața de acum diferența de viață maximă.
 */
export function choose(s: GameState, index: number): Result<Offer> {
  if (s.offer === null) return fail('nicio ofertă deschisă')
  const o = Number.isInteger(index) ? s.offer[index] : undefined
  if (!o) return fail('ofertă inexistentă')
  const m = modOf(s, o.id), now = m?.tier ?? 0
  if (o.tier === 1 && m) return fail('modul deja pe navă')
  if (o.tier === 1 && s.hero.mods.length >= slotsAt(s.hero.lvl)) return fail('niciun loc liber')
  if (o.tier !== now + 1 || o.tier > MAX_TIER) return fail('treaptă nepotrivită')
  if (m) m.tier = o.tier
  else s.hero.mods.push({ id: o.id, tier: 1, t: 0 })
  if (o.id === 'armor' && !s.hero.dead) {
    s.hero.hp += atTier(MODS.armor.hp, o.tier) - (now > 0 ? atTier(MODS.armor.hp, now) : 0)
  }
  s.offer = null
  return ok({ id: o.id, tier: o.tier })
}
