// Lumea care ține minte (GDD §9.1, stratul C): o planetă de regiuni, fiecare regiune o partidă, iar terenul fiecărei
// regiuni păstrează ce i-ai făcut și evoluează după ceasul lumii.
//
// Persistența e cea din GDD: nu se salvează harta, ci doar planeta (seed + versiunea generatorului) și, pe fiecare
// regiune, JURNALUL DE EDITĂRI (hexagon, ce s-a făcut, ora lumii). Terenul de oricând = generatorul + editările +
// timpul scurs, recalculat identic. Totul aici e determinist, ca restul nucleului: aceeași lume dă aceeași hartă pe
// orice mașină, iar o partidă se poate verifica rejucând-o din (seed, teren, jurnal).

import type { Terraform } from '../data/economie'
import { EVOLUTIE, LUME } from '../data/lume'
import type { Terrain } from '../data/terrain'
import { newGame, type GameState, type Start } from './game'
import { distance, hexesInRadius, key, type Hex } from './hex'
import { generateMap } from './map'
import { fail, ok, type Result } from './result'
import { createRng } from './rng'

/** O terraformare care a rămas pe teren: unde, ce, și la ce oră a lumii. */
export interface Editare {
  readonly hex: string
  readonly actiune: Terraform
  /** Ceasul lumii (tick-uri jucate pe planetă) când s-a făcut. */
  readonly la: number
}

export interface StareRegiune {
  readonly salvata: boolean
  /** Câte partide s-au jucat aici (câștigate, pierdute sau părăsite). */
  readonly partide: number
  readonly editari: readonly Editare[]
}

/** Ce se salvează: tot ce trebuie ca lumea să se refacă identic. */
export interface Lume {
  readonly schema: 1
  readonly planeta: { readonly seed: number; readonly versiune: number }
  /** Ceasul lumii: tick-urile jucate pe planetă, adunate din toate partidele (GDD: ceasul personal = timpul jucat). */
  readonly ceas: number
  /** Starea regiunilor atinse, după cheia hexagonului lor pe planetă. Cele neatinse lipsesc. */
  readonly regiuni: Readonly<Record<string, StareRegiune>>
}

/** O regiune a planetei: poziția pe planetă și seed-ul hărții ei. Se calculează din planetă, nu se salvează. */
export interface Regiune {
  readonly cheie: string
  readonly hex: Hex
  readonly nume: string
  readonly seed: number
  /** Inima planetei: ultima regiune, cu bossul ei (GDD §9.1). */
  readonly inima: boolean
}

export type Acces = 'salvata' | 'accesibila' | 'blocata'

/** Numele regiunilor din inel, după direcția lor față de inimă (hexagoane „cu vârful în sus”). */
const NUME: Readonly<Record<string, string>> = {
  '0,0': 'Inima planetei',
  '-1,0': 'Ținutul de vest',
  '0,-1': 'Ținutul de nord-vest',
  '1,-1': 'Ținutul de nord-est',
  '1,0': 'Ținutul de est',
  '0,1': 'Ținutul de sud-est',
  '-1,1': 'Ținutul de sud-vest',
}

/** Regiunile planetei, în ordinea fixă a hexagoanelor. Fiecare are seed-ul ei, din fluxul ei. */
export function planetRegions(seed: number): Regiune[] {
  return hexesInRadius(LUME.raza).map((h) => {
    const cheie = key(h)
    const rng = createRng(seed, `planeta/regiune/${cheie}`)
    return { cheie, hex: h, nume: NUME[cheie] ?? `Regiunea ${cheie}`, seed: Math.floor(rng.next() * 2 ** 31), inima: h.q === 0 && h.r === 0 }
  })
}

export function newWorld(seed: number): Lume {
  return { schema: 1, planeta: { seed, versiune: LUME.versiuneGenerator }, ceas: 0, regiuni: {} }
}

const stareOf = (l: Lume, cheie: string): StareRegiune => l.regiuni[cheie] ?? { salvata: false, partide: 0, editari: [] }

/** Câte regiuni din jurul inimii sunt salvate. */
export function savedRing(l: Lume): number {
  return planetRegions(l.planeta.seed).filter((r) => !r.inima && stareOf(l, r.cheie).salvata).length
}

/**
 * Se poate juca o regiune? Regiunea de start, da; celelalte din inel, când au o vecină salvată; inima, când sunt
 * salvate `LUME.pentruInima` regiuni din jur. O regiune salvată se poate juca din nou (te întorci pe ea).
 */
export function regionAccess(l: Lume, cheie: string): Acces {
  const regiuni = planetRegions(l.planeta.seed)
  const r = regiuni.find((x) => x.cheie === cheie)
  if (!r) return 'blocata'
  if (stareOf(l, cheie).salvata) return 'salvata'
  if (r.inima) return savedRing(l) >= LUME.pentruInima ? 'accesibila' : 'blocata'
  if (cheie === key(LUME.start)) return 'accesibila'
  const vecinaSalvata = regiuni.some((x) => !x.inima && distance(x.hex, r.hex) === 1 && stareOf(l, x.cheie).salvata)
  return vecinaSalvata ? 'accesibila' : 'blocata'
}

/** Planeta e salvată când i-a fost salvată inima. */
export function planetSaved(l: Lume): boolean {
  return planetRegions(l.planeta.seed).some((r) => r.inima && stareOf(l, r.cheie).salvata)
}

/** Terenul unui hexagon editat, la ora `acum` a lumii: etapa ultimei editări, după cât timp a trecut de la ea. */
export function evolvedTerrain(e: Editare, acum: number): Terrain {
  const etape = EVOLUTIE[e.actiune]
  let t = (etape[0] as { teren: Terrain }).teren
  for (const etapa of etape) if (acum - e.la >= etapa.dupa) t = etapa.teren
  return t
}

/** Terenul pe care regiunea îl are acum din partidele de dinainte: doar hexagoanele editate (ultima editare câștigă). */
export function regionTerrain(l: Lume, cheie: string): Map<string, Terrain> {
  const ultima = new Map<string, Editare>()
  for (const e of stareOf(l, cheie).editari) ultima.set(e.hex, e)
  return new Map([...ultima].map(([h, e]) => [h, evolvedTerrain(e, l.ceas)]))
}

export function regionOf(l: Lume, cheie: string): Regiune | undefined {
  return planetRegions(l.planeta.seed).find((r) => r.cheie === cheie)
}

/**
 * O partidă nouă pe regiune: harta ei, cu terenul pe care i l-au lăsat partidele de dinainte; pe inimă, cu valul ei.
 * `start` e ce trebuie dat și rejucării (`replay`).
 */
export function startRun(l: Lume, cheie: string): Result<{ state: GameState; start: Start }> {
  const r = regionOf(l, cheie)
  if (!r) return fail(`nu există regiunea ${cheie}`)
  const acces = regionAccess(l, cheie)
  if (acces === 'blocata') return fail(r.inima ? `inima se deschide după ${LUME.pentruInima} regiuni salvate` : 'regiunea se deschide după ce salvezi o vecină')
  const start: Start = { teren: regionTerrain(l, cheie), inima: r.inima }
  return ok({ state: newGame(r.seed, start), start })
}

/**
 * Partida s-a terminat (sau a fost părăsită). Se socotește jucată, iar ceasul lumii înaintează cu cât s-a jucat — cel
 * puțin un tick, ca „de la partida următoare” (`dupa: 1` în `EVOLUTIE`) să fie adevărat oricând. **Doar o partidă
 * câștigată lasă urme pe teren** (decis de owner, 05.10.2026), cu ora lumii la care s-a făcut fiecare, și tot doar ea
 * salvează regiunea. Editările vin din jurnal, deci o decizie anulată (Z) nu rămâne.
 */
export function commitRun(l: Lume, cheie: string, final: GameState): Lume {
  const vechi = stareOf(l, cheie)
  const castigata = final.faza === 'castigat'
  const noi: Editare[] = []
  if (castigata) for (const { la, d } of final.jurnal) if (d.tip === 'teren') noi.push({ hex: d.hex, actiune: d.actiune, la: l.ceas + la })
  return {
    ...l,
    ceas: l.ceas + Math.max(1, final.tick),
    regiuni: {
      ...l.regiuni,
      [cheie]: { salvata: vechi.salvata || castigata, partide: vechi.partide + 1, editari: [...vechi.editari, ...noi] },
    },
  }
}

// --- Salvarea --------------------------------------------------------------------------------------------------

/** Lumea, ca text (JSON). */
export function encodeWorld(l: Lume): string {
  return JSON.stringify(l)
}

const ACTIUNI: readonly string[] = Object.keys(EVOLUTIE)
const intreg = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0

/** Lumea din text, verificată câmp cu câmp: o salvare stricată sau dintr-o versiune necunoscută se refuză, cu motiv. */
export function decodeWorld(text: string): Result<Lume> {
  let v: unknown
  try {
    v = JSON.parse(text)
  } catch {
    return fail('salvarea nu e JSON')
  }
  const o = v as Partial<Lume> | null
  if (!o || typeof o !== 'object') return fail('salvarea nu e un obiect')
  if (o.schema !== 1) return fail(`schema necunoscută: ${String(o.schema)}`)
  if (!o.planeta || !intreg(o.planeta.seed) || !intreg(o.planeta.versiune)) return fail('planeta lipsește sau e stricată')
  if (o.planeta.versiune > LUME.versiuneGenerator) return fail(`planeta e dintr-o versiune mai nouă a generatorului (${o.planeta.versiune})`)
  if (!intreg(o.ceas)) return fail('ceasul lumii e stricat')
  if (!o.regiuni || typeof o.regiuni !== 'object') return fail('regiunile lipsesc')
  const chei = new Set(planetRegions(o.planeta.seed).map((r) => r.cheie))
  for (const [k, r] of Object.entries(o.regiuni)) {
    if (!chei.has(k)) return fail(`regiune necunoscută: ${k}`)
    if (typeof r?.salvata !== 'boolean' || !intreg(r.partide) || !Array.isArray(r.editari)) return fail(`regiunea ${k} e stricată`)
    const harta = generateMap(regionOf(o as Lume, k)?.seed ?? 0).map.terrain
    for (const e of r.editari as unknown[]) {
      const ed = e as Partial<Editare> | null
      if (!ed || typeof ed.hex !== 'string' || !harta.has(ed.hex) || !ACTIUNI.includes(ed.actiune ?? '') || !intreg(ed.la) || ed.la > (o.ceas ?? 0)) {
        return fail(`o editare din regiunea ${k} e stricată`)
      }
    }
  }
  return ok(o as Lume)
}
