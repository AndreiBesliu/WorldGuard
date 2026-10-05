// Modificatorii de dificultate (GDD §9.2): ce valoare are o alegere, câtă Amenințare dă, ce sigiliu aduce, și dacă e
// o alegere validă. Datele sunt în `data/modificatori.ts`; efectele lor, în `game.ts` (valurile, viața, aurul, ocolul,
// raza) și la pornirea partidei (inundația).

import {
  INUNDATII_MINIM_APA,
  MODIFICATOR_IDS,
  MODIFICATORI,
  PRAGURI,
  type ModificatorId,
  type Modificatori,
  type Treapta,
} from '../data/modificatori'
import { fail, ok, type Result } from './result'

/** Treapta aleasă a modificatorului, dacă e ales. */
export function tierOf(m: Modificatori, id: ModificatorId): Treapta | undefined {
  const t = m[id]
  return t === undefined ? undefined : MODIFICATORI[id].trepte[t - 1]
}

/** Cifra treptei alese (0 dacă modificatorul nu e ales). */
export const modValue = (m: Modificatori, id: ModificatorId): number => tierOf(m, id)?.valoare ?? 0

/** Amenințarea: suma punctelor treptelor alese. */
export function threat(m: Modificatori): number {
  return MODIFICATOR_IDS.reduce((n, id) => n + (tierOf(m, id)?.amenintare ?? 0), 0)
}

/** Pragul cel mai înalt atins cu amenințarea dată (sigiliul lui), dacă e vreunul. */
export function sealOf(amenintare: number): (typeof PRAGURI)[number] | undefined {
  return PRAGURI.filter((p) => amenintare >= p.amenintare).at(-1)
}

/**
 * Ce modificatori se pot alege pe o hartă: toți, în afară de Sezonul inundațiilor, care cere apă naturală lângă drumul
 * vechi (`apaLangaDrum` hexagoane — vezi `roadsideWater`).
 */
export function availableModifiers(apaLangaDrum: number): Set<ModificatorId> {
  return new Set(MODIFICATOR_IDS.filter((id) => id !== 'inundatii' || apaLangaDrum >= INUNDATII_MINIM_APA))
}

/** De ce nu se poate alege modificatorul pe harta asta, dacă nu se poate. */
export function unavailableReason(id: ModificatorId, apaLangaDrum: number): string | undefined {
  if (availableModifiers(apaLangaDrum).has(id)) return undefined
  return `${MODIFICATORI[id].nume} cere cel puțin ${INUNDATII_MINIM_APA} hexagoane de apă lângă drum (aici: ${apaLangaDrum})`
}

/**
 * Verifică o alegere de modificatori (din interfață, din `?mod=` sau dintr-o partidă salvată): modificatori cunoscuți,
 * trepte care există, disponibili pe hartă. Întoarce alegerea în ordinea fixă, fără nimic în plus.
 */
export function checkModifiers(m: unknown, apaLangaDrum: number): Result<Modificatori> {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return fail('modificatorii nu sunt o listă de trepte')
  const o = m as Record<string, unknown>
  const out: Partial<Record<ModificatorId, number>> = {}
  for (const k of Object.keys(o)) if (!(MODIFICATOR_IDS as string[]).includes(k)) return fail(`modificator necunoscut: ${k}`)
  for (const id of MODIFICATOR_IDS) {
    const t = o[id]
    if (t === undefined) continue
    const n = MODIFICATORI[id].trepte.length
    if (typeof t !== 'number' || !Number.isInteger(t) || t < 1 || t > n) return fail(`${MODIFICATORI[id].nume} are ${n === 1 ? 'o singură treaptă' : `treptele 1–${n}`}, nu ${String(t)}`)
    const motiv = unavailableReason(id, apaLangaDrum)
    if (motiv) return fail(motiv)
    out[id] = t
  }
  return ok(out)
}

/** Alegerea, ca text scurt: „hoarde2,piele1” (ordinea fixă). Gol = fără modificatori. */
export function encodeModifiers(m: Modificatori): string {
  return MODIFICATOR_IDS.filter((id) => m[id] !== undefined)
    .map((id) => `${id}${m[id]}`)
    .join(',')
}

/** Textul scurt înapoi în alegere („hoarde2,piele1”), fără să verifice harta (asta face `checkModifiers`). */
export function parseModifiers(text: string): Result<Modificatori> {
  const out: Partial<Record<ModificatorId, number>> = {}
  for (const part of text.split(',').map((x) => x.trim()).filter(Boolean)) {
    const m = /^([a-z]+)(\d+)$/.exec(part)
    if (!m) return fail(`„${part}” nu e de forma nume + treaptă (de exemplu hoarde2)`)
    const id = m[1] as ModificatorId
    if (!(MODIFICATOR_IDS as string[]).includes(id)) return fail(`modificator necunoscut: ${m[1]}`)
    if (out[id] !== undefined) return fail(`${MODIFICATORI[id].nume} e ales de două ori — câte unul pe axă`)
    out[id] = Number(m[2])
  }
  return ok(out)
}
