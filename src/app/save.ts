// Salvarea partidei: starea trecută prin JSON, cu versiune, verificată la citire. Nu atinge stocarea (asta e în alt modul).
import { BALANCE } from '../data/balance'
import { MAX_TIER, MOD_IDS, OFFERS } from '../data/modules'
import { offerFits, slotsAt } from '../sim/mods'
import { fail, ok, type Result } from '../sim/result'
import { createGame, type GameState } from '../sim/state'

export const SAVE_VERSION = 2

export function packSave(s: GameState): string {
  return JSON.stringify({ v: SAVE_VERSION, state: s })
}

/** Un `null` oriunde în stare înseamnă un număr care nu era finit la scriere. */
function hasNull(v: unknown): boolean {
  if (v === null) return true
  return typeof v === 'object' && Object.values(v).some(hasNull)
}

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)

export function unpackSave(text: string | null | undefined): Result<GameState> {
  if (text === null || text === undefined || text === '') return fail('lipsă')
  let o: unknown
  try { o = JSON.parse(text) } catch { return fail('stricată') }
  if (!isObject(o) || typeof o.v !== 'number' || !isObject(o.state)) return fail('stricată')
  if (o.v !== SAVE_VERSION) return fail('altă versiune')
  const state = o.state
  if (state.mode !== 'playing') return fail('partidă terminată')
  const ref = createGame(0) as unknown as Record<string, unknown>
  const len = (r: Record<string, unknown>, k: string): number => (Array.isArray(r[k]) ? (r[k] as unknown[]).length : -1)
  // `offer` e singurul loc unde `null` e o valoare bună („nicio ofertă deschisă”); se verifică aparte.
  const { offer, ...rest } = state
  if (!sameKeys(state, ref) || len(state, 'nodes') !== len(ref, 'nodes') || len(state, 'pads') !== len(ref, 'pads') || hasNull(rest) || !goodOffer(offer)) {
    return fail('altă formă')
  }
  // Un nivel mai jos: nava, planeta, fiecare cerc (cu ce s-a plătit în el) și fiecare nod au cheile din partida nouă.
  const refPad = (ref.pads as Record<string, unknown>[])[0], refNode = (ref.nodes as Record<string, unknown>[])[0]
  const inner = sameKeys(state.hero, ref.hero) && sameKeys(state.core, ref.core) &&
    (state.pads as unknown[]).every((p) => sameKeys(p, refPad) && sameKeys((p as Record<string, unknown>).paid, refPad?.paid)) &&
    (state.nodes as unknown[]).every((n) => sameKeys(n, refNode)) && goodMods((state.hero as Record<string, unknown>).mods)
  if (!inner) return fail('altă formă')
  // Nava: nivelul întreg de la 1 la nivelul maxim, experiența un număr finit, nenegativ (surplusul peste prag e bun),
  // cel mult atâtea module câte locuri are nivelul.
  const game = state as unknown as GameState
  const h = game.hero
  if (!Number.isInteger(h.lvl) || h.lvl < 1 || h.lvl > BALANCE.hero.maxLevel) return fail('altă formă')
  if (typeof h.xp !== 'number' || !Number.isFinite(h.xp) || h.xp < 0) return fail('altă formă')
  if (h.mods.length > slotsAt(h.lvl)) return fail('altă formă')
  // O ofertă pe care `choose` ar refuza-o ar ține partida pe loc pentru totdeauna: panoul n-ar avea ce alege.
  if (game.offer !== null && !game.offer.every((e) => offerFits(game, e).ok)) return fail('altă formă')
  return ok(game)
}

/**
 * `null`, sau o listă nevidă de cel mult `OFFERS` oferte, cu exact cheile `id` (un modul cunoscut) și `tier` (întreg de la 1
 * la treapta maximă).
 */
function goodOffer(v: unknown): boolean {
  if (v === null) return true
  if (!Array.isArray(v) || v.length === 0 || v.length > OFFERS) return false   // o listă goală ar ține partida pe loc pentru totdeauna
  return v.every((e) => sameKeys(e, { id: 0, tier: 0 }) &&
    (MOD_IDS as readonly unknown[]).includes(e.id) && Number.isInteger(e.tier) && e.tier >= 1 && e.tier <= MAX_TIER)
}

/**
 * Modulele navei: o listă în care fiecare element are exact cheile `id` (un modul cunoscut), `tier` (întreg de la 1 la treapta
 * maximă) și `t` (număr finit), fără un modul de două ori și cu Unda printre ele.
 */
function goodMods(v: unknown): boolean {
  if (!Array.isArray(v)) return false
  const good = v.every((e) => sameKeys(e, { id: 0, tier: 0, t: 0 }) &&
    (MOD_IDS as readonly unknown[]).includes(e.id) && Number.isInteger(e.tier) && e.tier >= 1 && e.tier <= MAX_TIER &&
    typeof e.t === 'number' && Number.isFinite(e.t))
  const ids = v.map((e: { id: unknown }) => e?.id)
  return good && new Set(ids).size === ids.length && ids.includes('wave')
}

/** Amândouă sunt obiecte (nu liste) cu exact aceleași chei. */
function sameKeys(a: unknown, b: unknown): boolean {
  const keys = (r: Record<string, unknown>): string => Object.keys(r).sort().join()
  return isObject(a) && isObject(b) && keys(a) === keys(b)
}
