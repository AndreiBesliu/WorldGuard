// Salvarea partidei: starea trecută prin JSON, cu versiune, verificată la citire. Nu atinge stocarea (asta e în alt modul).
import { fail, ok, type Result } from '../sim/result'
import { createGame, type GameState } from '../sim/state'

export const SAVE_VERSION = 1

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
  const keys = (r: Record<string, unknown>): string => Object.keys(r).sort().join()
  const len = (r: Record<string, unknown>, k: string): number => (Array.isArray(r[k]) ? (r[k] as unknown[]).length : -1)
  if (keys(state) !== keys(ref) || len(state, 'nodes') !== len(ref, 'nodes') || len(state, 'pads') !== len(ref, 'pads') || hasNull(state)) {
    return fail('altă formă')
  }
  return ok(state as unknown as GameState)
}
