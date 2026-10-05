// Lumea care ține minte (GDD §9.1, stratul C): o planetă de regiuni, fiecare regiune o partidă, iar terenul fiecărei
// regiuni păstrează ce i-ai făcut și evoluează după ceasul lumii.
//
// Persistența e cea din GDD: nu se salvează harta, ci doar planeta (seed + versiunea generatorului) și, pe fiecare
// regiune, JURNALUL DE EDITĂRI (hexagon, ce s-a făcut, ora lumii). Terenul de oricând = generatorul + editările +
// timpul scurs, recalculat identic. Totul aici e determinist, ca restul nucleului: aceeași lume dă aceeași hartă pe
// orice mașină, iar o partidă se poate verifica rejucând-o din (seed, teren, jurnal).

import type { Terraform } from '../data/economie'
import { AMFIBII, EVOLUTIE, LUME } from '../data/lume'
import type { Terrain } from '../data/terrain'
import type { Modificatori } from '../data/modificatori'
import { naturalRoadsideWater, newGame, replay, type GameState, type LoggedDecision, type Start } from './game'
import { distance, hexesInRadius, key, type Hex } from './hex'
import { generateMap } from './map'
import { checkModifiers, threat } from './modificatori'
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
  /**
   * Cea mai mare Amenințare (suma treptelor modificatorilor) cu care s-a câștigat aici (GDD §9.2, felia 11). Lipsește
   * până la primul câștig cu modificatori. Sigiliul regiunii se calculează din ea (`sealOf`), deci se dă o singură dată
   * pe prag.
   */
  readonly amenintare?: number
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

/** Ultima editare a fiecărui hexagon editat al regiunii. */
function lastEdits(l: Lume, cheie: string): Map<string, Editare> {
  const ultima = new Map<string, Editare>()
  for (const e of stareOf(l, cheie).editari) ultima.set(e.hex, e)
  return ultima
}

/** Terenul pe care regiunea îl are acum din partidele de dinainte: doar hexagoanele editate (ultima editare câștigă). */
export function regionTerrain(l: Lume, cheie: string): Map<string, Terrain> {
  return new Map([...lastEdits(l, cheie)].map(([h, e]) => [h, evolvedTerrain(e, l.ceas)]))
}

/** Canalele săpate pe regiune care sunt încă apă: cele colmatate sau acoperite de altă editare nu mai contează. */
export function dugCanals(l: Lume, cheie: string): number {
  return [...lastEdits(l, cheie).values()].filter((e) => e.actiune === 'canal' && evolvedTerrain(e, l.ceas) === 'apa').length
}

/** Câți amfibi aduc canalele săpate în fiecare val al regiunii (GDD §9.1: „regiunea reacționează”). */
export function regionAmphibians(l: Lume, cheie: string): number {
  return Math.min(AMFIBII.maxim, dugCanals(l, cheie) * AMFIBII.peCanal)
}

export function regionOf(l: Lume, cheie: string): Regiune | undefined {
  return planetRegions(l.planeta.seed).find((r) => r.cheie === cheie)
}

/**
 * O partidă nouă pe regiune: harta ei, cu terenul pe care i l-au lăsat partidele de dinainte; pe inimă, cu valul ei.
 * Modificatorii de dificultate se aleg doar la revenire, pe o regiune salvată (GDD §9.2). `start` e ce trebuie dat și
 * rejucării (`replay`).
 */
export function startRun(l: Lume, cheie: string, modificatori: Modificatori = {}): Result<{ state: GameState; start: Start }> {
  const r = regionOf(l, cheie)
  if (!r) return fail(`nu există regiunea ${cheie}`)
  const acces = regionAccess(l, cheie)
  if (acces === 'blocata') return fail(r.inima ? `inima se deschide după ${LUME.pentruInima} regiuni salvate` : 'regiunea se deschide după ce salvezi o vecină')
  const ales = Object.keys(modificatori).length > 0
  if (ales && acces !== 'salvata') return fail('modificatorii se aleg la revenire, după ce salvezi regiunea')
  const m = checkModifiers(modificatori, naturalRoadsideWater(r.seed))
  if (!m.ok) return fail(m.reason)
  const start: Start = { teren: regionTerrain(l, cheie), inima: r.inima, amfibii: regionAmphibians(l, cheie), ...(ales ? { modificatori: m.value } : {}) }
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
  // Amenințarea se ține doar din câștiguri și doar cea mai mare: un prag se atinge o singură dată.
  const amenintare = Math.max(vechi.amenintare ?? 0, castigata ? threat(final.modificatori) : 0)
  const noi: Editare[] = []
  if (castigata) for (const { la, d } of final.jurnal) if (d.tip === 'teren') noi.push({ hex: d.hex, actiune: d.actiune, la: l.ceas + la })
  return {
    ...l,
    ceas: l.ceas + Math.max(1, final.tick),
    regiuni: {
      ...l.regiuni,
      [cheie]: {
        salvata: vechi.salvata || castigata,
        partide: vechi.partide + 1,
        editari: [...vechi.editari, ...noi],
        ...(amenintare > 0 ? { amenintare } : {}),
      },
    },
  }
}

/** O partidă rămasă la jumătate (pagina închisă în timpul ei): regiunea, modificatorii, deciziile și tick-ul la care a rămas. */
export interface PartidaSalvata {
  readonly cheie: string
  readonly tick: number
  readonly jurnal: readonly LoggedDecision[]
  /** Lipsește la partidele salvate înainte de felia 11 (= fără modificatori). */
  readonly modificatori?: Modificatori
}

/**
 * Reface o partidă rămasă la jumătate și o socotește jucată (`commitRun`). Pornește exact ca la `startRun` — terenul,
 * inima, amfibii —, deci rejucarea iese identică cu partida de atunci: lumea nu s-a mișcat între timp, fiindcă o
 * partidă neîncheiată nu i-a dat încă nimic. Rejucarea o și verifică: o înregistrare stricată sau modificată se refuză.
 */
export function settleRun(l: Lume, p: PartidaSalvata): Result<{ lume: Lume; final: GameState }> {
  const r = startRun(l, p.cheie, p.modificatori ?? {})
  if (!r.ok) return fail(r.reason)
  let final: GameState
  try {
    final = replay(r.value.state.seed, p.jurnal, p.tick, r.value.start)
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e))
  }
  return ok({ lume: commitRun(l, p.cheie, final), final })
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
    if (r.amenintare !== undefined && (!intreg(r.amenintare) || !r.salvata)) return fail(`amenințarea regiunii ${k} e stricată`)
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
