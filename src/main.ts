// Prototipul 1: controlerul — bucla pe pas fix, mouse-ul, tastele și legătura dintre simulare, hartă și interfață.
//
// Mouse-ul face lucruri diferite după ce e sub el:
//   - un hexagon de drum (în pregătire) = ocol: +1/+2/+3 = cu cât se lungește drumul, variantă = următoarea,
//     click = pui ocolul. Un ocol pe val, obligatoriu înainte de val; nu poate trece peste un turn;
//   - un hexagon liber = turnul ales (cărțile de jos sau tastele 4–7), click = îl construiești (doar în pregătire);
//   - un turn = cifrele lui și ale grupului din care face parte; click = îl alegi. Pentru turnul de sub mouse (sau
//     cel ales): T = schimbă ținta, C = combină grupul / îl separă (și în timpul valului). Esc = renunți la alegere.
// După fiecare val: draftul, 1 carte din 3 (click pe ea sau 8 / 9 / 0); valul următor pornește abia după alegere.
// Uneltele de teren (Q canal, W deal, E arzi pădurea, M mină pe filon) înlocuiesc turnul ales: click pe un loc liber
// face terraformarea (cu pământ) sau sapă mina (cu aur).
// Tot ce se face din taste se face și din butoanele interfeței (src/ui/hud.ts).
// Seed-ul se poate da în URL: ?seed=123
//
// Bucla: requestAnimationFrame adună timp real și rulează câte tick-uri fixe (TICK_MS) încap. Viteza din UI
// doar înmulțește timpul adunat — simularea nu știe de ea, deci un replay iese identic la orice viteză.

import { CARDS, cardTower, type CardEffect, type CardId } from './data/draft'
import { ECONOMIE, TERRAFORM_TYPES, TERRAFORMARI, type Terraform } from './data/economie'
import { describeWave, ENEMIES, TRAITS, WAVES } from './data/enemies'
import { MILI_HEX, TICK_MS, VIETI_BAZA, VITEZE_UI } from './data/joc'
import { ELEMENT_NAMES, REACTION_RULES, REACTIONS, STATES, TAG_NAMES, type ReactionType } from './data/reactions'
import { TERRAIN } from './data/terrain'
import { COMBINARE, TARGET_MODES, TARGET_NAMES, TOWERS, TOWER_TYPES, type ArmorCombo, type TowerType } from './data/towers'
import { decisionPan, decisionSound, stareFundal, stepCues } from './audio/cues'
import { Sunet } from './audio/sunet'
import { NIVELURI_SUNET } from './data/sunete'
import { stepEvents, type StepEvent } from './events'
import type { Terrain } from './data/terrain'
import { LUME } from './data/lume'
import {
  commitRun,
  decodeWorld,
  encodeWorld,
  newWorld,
  planetRegions,
  planetSaved,
  regionAccess,
  regionAmphibians,
  regionOf,
  regionTerrain,
  savedRing,
  settleRun,
  startRun,
  type Lume,
  type PartidaSalvata,
} from './sim/lume'
import { createPlanetScreen, type PlanetView } from './ui/planeta'
import { generateMap } from './sim/map'
import { draw, fitLayout, hexToPixel, pixelToHex, resetRenderCaches, type Layout, type Overlay } from './render/canvas'
import { Fx, toWorld } from './render/fx'
import {
  applyDecision,
  armorCombos,
  checkBuild,
  checkCombine,
  checkDetourAllowed,
  checkMine,
  checkStartWave,
  checkTerraform,
  combinedContacts,
  detourLimit,
  detourPossible,
  fingerprint,
  groupOf,
  groupReload,
  incompatiblePair,
  isCombined,
  naturalAmphibians,
  newGame,
  pathLength,
  replay,
  step,
  towerCost,
  towerDamage,
  towerKeys,
  towerRange,
  towerReload,
  waveHealth,
  waveAt,
  waveIncome,
  type Decision,
  type GameState,
  type Start,
  type Tower,
} from './sim/game'
import { distance, fromKey, key, type Hex } from './sim/hex'
import { optionsAround, type DetourOption } from './sim/path'
import { createHud, type HudView, type Row, type TowerAction } from './ui/hud'

const canvas = document.getElementById('joc') as HTMLCanvasElement
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

const params = new URLSearchParams(location.search)
/** Partida liberă: cu `?seed=` în URL, o singură hartă, fără planetă (și pentru scripturile de verificare). */
const liber = params.has('seed')
let seed = Number(params.get('seed') ?? '2026') || 2026
let state: GameState = newGame(seed)
/** Lumea care ține minte (GDD §9.1); lipsește în partida liberă. */
let lume: Lume | undefined
/** Regiunea pe care se joacă acum și terenul cu care a pornit partida (rejucarea, la „anulează”, pornește din el). */
let regiune: { cheie: string; start: Start } | undefined
/** Regiunea arătată pe ecranul planetei. */
let regiuneAleasa: string | undefined
/** O părăsire a partidei care așteaptă confirmarea (a doua apăsare, în câteva secunde). */
let confirmare: { act: 'restart' | 'new'; pana: number } | undefined
let extra = 2
let optionIndex = 0
let turnAles: TowerType = 'fizic'
/** Unealta de teren aleasă, dacă e una: atunci click pe un loc liber terraformează sau sapă o mină, nu construiește. */
let unealta: Terraform | 'mina' | undefined
/** Hexagonul de sub mouse (oricare), și — dacă e un hexagon de drum care se poate înlocui — indicele lui. */
let hoverHex: Hex | undefined
let hovered: number | undefined
let options: DetourOption[] = []
/** Turnul ales cu click (id), ca butoanele lui din panou să rămână la îndemână când mouse-ul pleacă de pe hartă. */
let selected: number | undefined

/** Tastele cărților din draft, în ordinea ofertei. */
const CARD_KEYS = ['8', '9', '0']
/** Tastele terraformărilor, în ordinea din `TERRAFORM_TYPES` (canal, deal, arde). */
const TOOL_KEYS = ['Q', 'W', 'E']
let lastDraftShown = false

let vitezaIndex = 0
let paused = false
let acumulat = 0
let last = performance.now()

// Reacțiile de pe hartă (doar desen): textele care urcă și se sting, și anunțul primei descoperiri, cu un scurt
// freeze-frame (GDD §6). Timpul de aici e al ecranului, nu al simulării — simularea nu știe de ele.
const POPUP_MS = 900
const FREEZE_MS = 600
let popups: { text: string; culoare: string; progres: number; la: number }[] = []
let freezeUntil = 0

// Sunetul (doar ieșire, ca desenul): volumul ales se ține minte în browser, între sesiuni.
const CHEIE_SUNET = 'worldguard.sunet'
function nivelSalvat(): number {
  try {
    const v = Number(localStorage.getItem(CHEIE_SUNET))
    return (NIVELURI_SUNET as readonly number[]).includes(v) && localStorage.getItem(CHEIE_SUNET) !== null ? v : 1
  } catch {
    return 1
  }
}
const sunet = new Sunet(nivelSalvat())
const CHEIE_FUNDAL = 'worldguard.fundal'
try {
  sunet.fundalPornit = localStorage.getItem(CHEIE_FUNDAL) !== '0'
} catch {
  // Fără spațiu de stocare: fundalul pornește.
}

function toggleFundal(): void {
  sunet.fundalPornit = !sunet.fundalPornit
  try {
    localStorage.setItem(CHEIE_FUNDAL, sunet.fundalPornit ? '1' : '0')
  } catch {
    // Alegerea ține doar sesiunea asta.
  }
}

function cycleSound(): void {
  const i = (NIVELURI_SUNET as readonly number[]).indexOf(sunet.volum)
  sunet.volum = NIVELURI_SUNET[(i + 1) % NIVELURI_SUNET.length] ?? 1
  try {
    localStorage.setItem(CHEIE_SUNET, String(sunet.volum))
  } catch {
    // Fără spațiu de stocare (fereastră privată, blocat): volumul ține doar sesiunea asta.
  }
  sunet.play('clic')
}

const hud = createHud({
  startWave: () => act(startWave),
  togglePause: () => act(() => (paused = !paused)),
  cycleSpeed: () => act(() => (vitezaIndex = (vitezaIndex + 1) % VITEZE_UI.length)),
  cycleSound: () => act(cycleSound),
  toggleFundal: () => act(toggleFundal),
  undo: () => act(undo),
  restart: () => act(restartKey),
  newMap: () => act(newKey),
  selectTower: (tip) => act(() => selectTower(tip)),
  selectTool: (id) => act(() => (unealta = id as Terraform | 'mina')),
  setExtra: (n) => act(() => setExtra(n)),
  nextVariant: () => act(nextVariant),
  towerAction: (a, id) => act(() => towerAction(a, id)),
  pickCard: (id) => act(() => decide({ tip: 'alege', carte: id as CardId })),
})
let layout: Layout = fitLayout(state.map.radius, hud.mapArea())

/** O acțiune din interfață sau din taste: o aplică, apoi recalculează ce e sub mouse și redesenează. */
function act(fn: () => void): void {
  fn()
  syncHover()
  render()
}

function relayout(): void {
  layout = fitLayout(state.map.radius, hud.mapArea())
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.floor(innerWidth * dpr)
  canvas.height = Math.floor(innerHeight * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  render()
  relayout()
  render()
}

function refreshOptions(): void {
  // Turnurile blochează ocolurile, deci variantele care ar trece peste ele nici nu apar.
  options = hovered === undefined ? [] : optionsAround(state.map, state.path, hovered, extra, towerKeys(state))
  if (optionIndex >= options.length) optionIndex = 0
}

/**
 * Recalculează ce e sub mouse după orice schimbare (mișcare, decizie, anulare, hartă nouă) și variantele de ocol.
 * Ecranul trebuie să arate mereu exact ce ar face un clic acolo.
 */
function syncHover(): void {
  const idx = hoverHex === undefined ? -1 : state.path.findIndex((p) => key(p) === key(hoverHex as Hex))
  // Hexagonul de sub mouse face parte din porțiunea înlocuită; capetele fixe nu se pot înlocui.
  const next = idx > 0 && idx < state.path.length - 1 ? idx : undefined
  if (next !== hovered) optionIndex = 0
  hovered = next
  refreshOptions()
}

const towerAt = (h: Hex | undefined): Tower | undefined =>
  h === undefined ? undefined : state.turnuri.find((t) => t.hex === key(h))

const seconds = (ticks: number): string => `${((ticks * TICK_MS) / 1000).toFixed(2).replace(/0$/, '').replace('.', ',')} s`

/** Ocolul previzualizat: doar când se poate pune unul acum (în pregătire, sub limita pe val). */
const shownDetour = (): DetourOption | undefined => (checkDetourAllowed(state).ok ? options[optionIndex] : undefined)

// --- Texte din date (nicio cifră ascunsă) -------------------------------------------------------------------

/** Ce lasă turnul pe inamic și în ce reacții intră. */
function reactionsOf(tip: TowerType): Row[] {
  const info = TOWERS[tip]
  const seen = new Set<string>()
  const parts: string[] = []
  for (const r of REACTION_RULES) {
    const k = `${r.tip}/${r.eticheta}`
    if (r.element !== info.element || seen.has(k)) continue
    seen.add(k)
    parts.push(`${REACTIONS[r.tip].nume} pe ${TAG_NAMES[r.eticheta]}`)
  }
  const rows: Row[] = []
  if (info.aplica) rows.push({ k: 'Lasă', v: `${STATES[info.aplica].nume.toLowerCase()}, ${seconds(STATES[info.aplica].durata)}` })
  if (parts.length) rows.push({ k: 'Reacții', v: parts.join(' · ') })
  return rows
}

/** Rândurile cu cifrele unui turn: ale tipului, și cum le schimbă terenul (dealul) și cărțile din draft. */
function statRows(tip: TowerType, hex: string): Row[] {
  const info = TOWERS[tip]
  const raza = towerRange(state, tip, hex)
  const dauna = towerDamage(state, tip)
  const reincarcare = towerReload(state, tip)
  return [
    { k: 'Daună', v: dauna === info.dauna ? `${info.dauna}` : `${info.dauna} → ${dauna} (cărți)`, ton: dauna > info.dauna ? 'up' : undefined },
    { k: 'Rază', v: raza === info.raza ? `${info.raza}` : `${info.raza} → ${raza} (deal)`, ton: raza > info.raza ? 'up' : undefined },
    {
      k: 'O lovitură la',
      v: reincarcare === info.reincarcare ? seconds(info.reincarcare) : `${seconds(info.reincarcare)} → ${seconds(reincarcare)} (cărți)`,
      ton: reincarcare < info.reincarcare ? 'up' : undefined,
    },
  ]
}

const perSecond = (dauna: number, ticks: number): string => ((dauna * 1000) / (ticks * TICK_MS)).toFixed(1).replace('.', ',')

/** Numele unei combinații de armură, pe turnuri: „Fizic + Foc”. */
const comboTowers = (c: ArmorCombo): string =>
  TOWER_TYPES.filter((t) => c.elemente.includes(TOWERS[t].element))
    .map((t) => TOWERS[t].nume)
    .join(' + ')

const comboEffect = (c: ArmorCombo): string => (c.ignora ? 'ignoră armura' : `străpunge ${c.penetrare} armură`)

/** Cum ar trage grupul combinat: lovitura pe elemente, cadența, dauna pe secundă față de turnurile separate, armura. */
function combinedRows(grup: readonly Tower[]): Row[] {
  const tipuri = grup.map((t) => t.tip)
  const lovitura = combinedContacts(tipuri, state.imbunatatiri)
  const R = groupReload(tipuri, state.imbunatatiri)
  const total = lovitura.reduce((n, c) => n + c.dauna, 0)
  const separat = tipuri.reduce((n, t) => n + towerDamage(state, t) / towerReload(state, t), 0)
  const elemente = new Set(tipuri.map((t) => TOWERS[t].element)).size
  const bonus = COMBINARE.bonusPeElement * Math.min(elemente - 1, COMBINARE.elementeInPlus)
  const combos = armorCombos(tipuri)
  const lovituri = lovitura.reduce((n, c) => n + (c.lovituri ?? 1), 0)
  const armura: Row = combos.length
    ? { k: 'Armura', v: combos.map((c) => `${c.nume}: ${comboEffect(c)}`).join(' · '), ton: 'up' }
    : { k: 'Armura', v: `se scade la fiecare lovitură (de ${lovituri} ori)` }
  return [
    { k: 'Lovitura', v: lovitura.map((c) => `${ELEMENT_NAMES[c.element]} ${c.dauna}`).join(' → ') },
    { k: 'O lovitură la', v: `${seconds(R)} (cel mai lent)` },
    { k: 'Pe secundă', v: `${perSecond(total, R)} (separat: ${perSecond(separat, 1)})`, ton: total / R > separat ? 'up' : total / R < separat ? 'down' : undefined },
    ...(bonus > 0 ? [{ k: 'Bonus', v: `+${bonus}% (${elemente} elemente)`, ton: 'up' as const }] : []),
    armura,
  ]
}

/** Numele turnurilor dintr-un grup, cu id-urile lor: „Fizic #1 + Fulger #3”. */
const groupNames = (grup: readonly Tower[]): string => grup.map((t) => `${TOWERS[t.tip].nume} #${t.id}`).join(' + ')

/** Butoanele unui turn în panou: ținta și comutarea grupului, cu motivul când nu se pot folosi. */
function towerButtons(t: Tower, grup: readonly Tower[]): NonNullable<HudView['context']['butoane']> {
  const combinat = isCombined(grup)
  const tinta = TOWERS[t.tip].zona && !combinat ? 'lovește toți inamicii din rază — nu are țintă de ales' : undefined
  const comb = checkCombine(state, t.id, !combinat)
  return [
    { act: 'tinta', id: t.id, text: 'Schimbă ținta', tasta: 'T', motiv: tinta },
    { act: 'combina', id: t.id, text: combinat ? 'Separă grupul' : 'Combină grupul', tasta: 'C', activ: combinat, motiv: comb.ok ? undefined : comb.reason },
  ]
}

/** Vederea unui turn: cifrele lui, grupul din care face parte și ce poți face cu ele. */
function towerView(t: Tower): { view: HudView['context']; overlay: Partial<Overlay> } {
  const info = TOWERS[t.tip]
  const grup = groupOf(state.turnuri, t.id)
  const combinat = isCombined(grup)
  const cercuri = (combinat ? grup : [t]).map((m) => ({ hex: fromKey(m.hex), raza: towerRange(state, m.tip, m.hex) }))
  const overlay: Partial<Overlay> = { range: { cercuri, culoare: combinat ? '#f5d76e' : info.culoare } }
  const butoane = towerButtons(t, grup)
  if (combinat) {
    return {
      view: {
        titlu: `Grup combinat · ${grup.length} turnuri`,
        ton: 'ok',
        randuri: [{ k: 'Turnuri', v: groupNames(grup) }, ...combinedRows(grup), { k: 'Ținta', v: TARGET_NAMES[t.tintire] }],
        nota: 'Un singur turn: o lovitură, la o singură țintă, din razele tuturor turnurilor. Elementele lovesc pe rând.',
        butoane,
      },
      overlay,
    }
  }
  const rows: Row[] = [...statRows(t.tip, t.hex), { k: 'Ținta', v: info.zona ? 'toți inamicii din rază' : TARGET_NAMES[t.tintire] }, ...reactionsOf(t.tip)]
  let nota = 'Pune un turn lângă el ca să faci un grup — grupul se poate combina într-un singur turn.'
  if (grup.length >= 2) {
    rows.push({ k: 'Grup', v: `${groupNames(grup)} — trag individual` })
    const pereche = incompatiblePair(grup.map((m) => m.tip))
    if (pereche) nota = `${TOWERS[pereche[0]].nume} și ${TOWERS[pereche[1]].nume} sunt incompatibile: grupul ăsta nu se poate combina.`
    else {
      rows.push(...combinedRows(grup).map((r) => ({ ...r, k: `Combinat · ${r.k.toLowerCase()}` })))
      nota = 'C = combină grupul într-un singur turn.'
    }
  }
  return { view: { titlu: `${info.nume} #${t.id}`, randuri: rows, nota, butoane }, overlay }
}

// --- Vederea interfeței ---------------------------------------------------------------------------------------

/** Ce e sub mouse: cifrele turnului, previzualizarea construcției, ocolul — sau ce se poate face. */
function contextView(): { view: HudView['context']; overlay: Partial<Overlay> } {
  const t = towerAt(hoverHex)
  if (t) return towerView(t)
  if (hovered !== undefined) {
    const allowed = checkDetourAllowed(state)
    if (!allowed.ok) return { view: { titlu: 'Ocol', ton: 'bad', randuri: [], nota: `Nu se poate: ${allowed.reason}` }, overlay: {} }
    if (options.length === 0) {
      return {
        view: { titlu: `Ocol +${extra} — nu încape aici`, ton: 'bad', randuri: [], nota: 'Apă, filon, un turn în cale, marginea hărții sau drumul s-ar atinge singur. Încearcă alt număr sau alt loc.' },
        overlay: {},
      }
    }
    return {
      view: {
        titlu: `Ocol +${extra}`,
        ton: 'ok',
        randuri: [
          { k: 'Varianta', v: `${optionIndex + 1} din ${options.length}` },
          { k: 'Drumul', v: `${state.path.length} → ${state.path.length + extra} hexagoane`, ton: 'up' },
        ],
        nota: 'Click = pune ocolul · Tab sau ⇥ = altă variantă',
      },
      overlay: {},
    }
  }
  if (unealta !== undefined && hoverHex !== undefined && state.map.terrain.has(key(hoverHex)) && !state.path.some((h) => key(h) === key(hoverHex as Hex))) {
    return toolView(unealta, hoverHex)
  }
  if (hoverHex !== undefined && state.map.terrain.has(key(hoverHex)) && !state.path.some((h) => key(h) === key(hoverHex as Hex))) {
    const hex = key(hoverHex)
    const info = TOWERS[turnAles]
    const r = checkBuild(state, turnAles, hex)
    const teren = state.map.terrain.get(hex)
    const costRow: Row = { k: 'Cost', v: `${towerCost(state, turnAles, hex)} aur${teren && TERRAIN[teren].costTurn ? ` (pe ${TERRAIN[teren].nume.toLowerCase()}: +${TERRAIN[teren].costTurn})` : ''}` }
    const atingere = teren === undefined ? undefined : TERRAIN[teren].atingere
    const terenRow: Row[] = teren && atingere ? [{ k: 'Teren', v: `${TERRAIN[teren].nume}: inamicii de pe drumul vecin devin ${STATES[atingere.aplica].nume.toLowerCase()}` }] : []
    // Grupul în care ar intra: îl spune chiar simularea, aplicând decizia pe o copie (nicio regulă dublată aici).
    // Copia are aur din belșug, ca grupul să se vadă și când turnul încă nu se poate plăti.
    const after = applyDecision({ ...state, aur: Number.MAX_SAFE_INTEGER }, { tip: 'turn', turn: turnAles, hex })
    const groupRows: Row[] = []
    let ghostLinks: Overlay['ghostLinks'] = []
    if (after.ok) {
      const nou = after.value.turnuri.at(-1) as Tower
      const grup = groupOf(after.value.turnuri, nou.id)
      const combinat = isCombined(grup)
      const at = fromKey(hex)
      ghostLinks = state.turnuri.filter((n) => distance(fromKey(n.hex), at) === 1).map((n) => ({ to: fromKey(n.hex), combinat }))
      if (combinat) groupRows.push({ k: 'Grup', v: `intră în grupul combinat (${grup.length} turnuri)`, ton: 'up' })
      else if (grup.length >= 2) {
        groupRows.push({ k: 'Grup', v: `${grup.length} turnuri, trag individual` })
        if (state.turnuri.some((n) => n.combinat && grup.some((m) => m.id === n.id))) {
          const pereche = incompatiblePair(grup.map((m) => m.tip))
          groupRows.push({
            k: 'Atenție',
            v: pereche
              ? `${TOWERS[pereche[0]].nume} și ${TOWERS[pereche[1]].nume} sunt incompatibile: grupul combinat de lângă trece pe individual`
              : 'leagă grupul combinat de turnuri individuale: tot grupul trece pe individual (C îl combină la loc)',
            ton: 'down',
          })
        }
      }
    }
    return {
      view: {
        titlu: r.ok ? `Construiește ${info.nume}` : `${info.nume} aici: nu se poate`,
        ton: r.ok ? 'ok' : 'bad',
        randuri: [costRow, ...terenRow, ...statRows(turnAles, hex), ...groupRows, ...reactionsOf(turnAles)],
        nota: r.ok ? `${info.descriere}. Click = construiește.` : r.reason,
      },
      overlay: {
        ghost: { hex: hoverHex, tip: turnAles, ok: r.ok },
        range: r.ok ? { cercuri: [{ hex: hoverHex, raza: towerRange(state, turnAles, hex) }], culoare: info.culoare } : undefined,
        ghostLinks,
      },
    }
  }
  const ales = state.turnuri.find((x) => x.id === selected)
  if (ales) return towerView(ales)
  return {
    view: {
      titlu: 'Ce poți face',
      randuri: [
        { k: 'Mouse pe drum', v: 'ocolul valului' },
        { k: 'Pe un loc liber', v: 'construiești turnul ales' },
        { k: 'Pe un turn', v: 'click = îl alegi; T = ținta' },
        { k: 'Turnuri lipite', v: 'fac un grup; C = combinat' },
        { k: 'După fiecare val', v: 'alegi 1 carte din 3 (8 / 9 / 0)' },
        { k: 'Q / W / E', v: 'canal, deal, arzi pădurea (cu pământ)' },
        { k: 'M pe un filon', v: 'mină: pământ la fiecare val' },
        { k: 'S / B', v: 'sunetul (tare, încet, oprit) / fundalul muzical' },
        ...COMBINARE.armura.map((c) => ({ k: `Combinat ${comboTowers(c)}`, v: `${c.nume}: ${comboEffect(c)}` })),
      ],
      nota:
        'Ocolul e obligatoriu înainte de fiecare val. Uleiul de pe hartă unge inamicii: du drumul pe lângă el cu un ocol, apoi aprinde-i cu Foc. Focul și Frigul sunt incompatibile — se anulează și nu se combină. Pe planetă, cenușa de lângă apă devine noroi (încetinește), iar canalele săpate aduc amfibi.',
    },
    overlay: {},
  }
}

/** Ce ar face unealta de teren pe hexagonul de sub mouse: costul, efectul, și dacă se poate. */
function toolView(u: Terraform | 'mina', h: Hex): { view: HudView['context']; overlay: Partial<Overlay> } {
  const hex = key(h)
  const teren = state.map.terrain.get(hex)
  const acum: Row = { k: 'Terenul', v: teren ? TERRAIN[teren].nume : '—' }
  if (u === 'mina') {
    const r = checkMine(state, hex)
    return {
      view: {
        titlu: r.ok ? 'Sapă o mină' : 'Mină aici: nu se poate',
        ton: r.ok ? 'ok' : 'bad',
        randuri: [{ k: 'Cost', v: `${ECONOMIE.mina.costAur} aur` }, acum, { k: 'Aduce', v: `+${ECONOMIE.pamant.peMina} pământ la fiecare val` }],
        nota: r.ok ? 'Click = sapă mina. Pe ea nu se mai poate construi.' : r.reason,
      },
      overlay: { mineGhost: { hex: h, ok: r.ok } },
    }
  }
  const info = TERRAFORMARI[u]
  const r = checkTerraform(state, u, hex)
  return {
    view: {
      titlu: r.ok ? info.nume : `${info.nume} aici: nu se poate`,
      ton: r.ok ? 'ok' : 'bad',
      randuri: [{ k: 'Cost', v: `${info.costPamant} pământ (ai ${state.pamant})` }, acum, { k: 'Devine', v: TERRAIN[info.in].nume }],
      nota: r.ok ? `${info.descriere[0]?.toUpperCase()}${info.descriere.slice(1)}. Click = ${info.verb}.` : r.reason,
    },
    overlay: { terraform: { hex: h, teren: info.in, ok: r.ok } },
  }
}

function waveView(): HudView['wave'] {
  const w = waveAt(state, state.val)
  if (state.faza === 'castigat' || state.faza === 'pierdut' || !w) return { titlu: 'Partida s-a încheiat', randuri: [], nota: '' }
  // Un rând pe tip și trăsături: bossii cu trăsături diferite apar separat, cu ce-i face imuni.
  const rows = new Map<string, { nume: string; culoare: string; numar: number; boss: boolean; trasaturi?: string }>()
  for (const g of w.grupuri) {
    const k = `${g.tip}|${(g.trasaturi ?? []).join('+')}`
    const prev = rows.get(k)
    if (prev) prev.numar += g.numar
    else {
      const names = (g.trasaturi ?? []).map((t) => TRAITS[t].nume).join(', ')
      rows.set(k, {
        nume: names ? `${ENEMIES[g.tip].nume} · ${names}` : ENEMIES[g.tip].nume,
        culoare: ENEMIES[g.tip].culoare,
        numar: g.numar,
        boss: g.tip === 'boss' || g.tip === 'paznic',
        trasaturi: g.tip === 'paznic' ? 'pulsul: naște roiuri acolo unde e; dacă ajunge la bază, ia toate viețile' : g.trasaturi?.map((t) => TRAITS[t].descriere).join('; '),
      })
    }
  }
  const randuri = [...rows.values()]
  const venit = waveIncome(state)
  const laSfarsit = `la sfârșit: +${venit.aur} aur dobândă, +${venit.pamant} pământ`
  const hp = waveHealth(state.val)
  const viata = hp === 1 ? '' : `viață ×${String(Math.round(hp * 100) / 100).replace('.', ',')}`
  if (state.faza === 'val') {
    return {
      titlu: `Valul ${state.val + 1} e pe drum`,
      randuri,
      nota: [`${state.inamici.length} pe hartă, ${state.deGenerat.length} mai vin`, viata, laSfarsit].filter(Boolean).join(' · '),
    }
  }
  return { titlu: `Valul următor: ${state.val + 1} din ${WAVES.length}`, randuri, nota: [viata, laSfarsit].filter(Boolean).join(' · ') }
}

function codexView(): HudView['codex'] {
  return (Object.keys(REACTIONS) as ReactionType[]).map((r) => ({
    nume: REACTIONS[r].nume,
    reteta: [...new Set(REACTION_RULES.filter((x) => x.tip === r).map((x) => `${ELEMENT_NAMES[x.element]} pe ${TAG_NAMES[x.eticheta]}`))].join(' · '),
    efect: REACTIONS[r].efect,
    numar: state.reactii[r] ?? 0,
    culoare: REACTIONS[r].culoare,
  }))
}

/** Cum se numește felul unei cărți în interfață. */
const cardKind = (e: CardEffect): string => ({ turn: 'Turn', imbunatatire: 'Îmbunătățire', relicva: 'Relicvă', traseu: 'Traseu' })[e.tip]

function draftView(): HudView['draft'] {
  if (state.faza !== 'pregatire' || state.oferta.length === 0) return undefined
  const owned = new Set(state.turnuri.map((t) => t.tip))
  return {
    titlu: `Alege o carte — 1 din ${state.oferta.length}. Valul ${state.val + 1} pornește după alegere.`,
    carti: state.oferta.map((id, i) => {
      const t = cardTower(id)
      return {
        id,
        nume: CARDS[id].nume,
        fel: cardKind(CARDS[id].efect),
        descriere: CARDS[id].descriere,
        tasta: CARD_KEYS[i] ?? '',
        dinAfara: t !== undefined && owned.size > 0 && !owned.has(t),
      }
    }),
  }
}

function cartiView(): HudView['carti'] {
  const counts = new Map<CardId, number>()
  for (const id of state.carti) counts.set(id, (counts.get(id) ?? 0) + 1)
  return [...counts].map(([id, numar]) => ({ nume: CARDS[id].nume, fel: `${cardKind(CARDS[id].efect)}: ${CARDS[id].descriere}`, numar }))
}

function ocolView(): HudView['ocol'] {
  const done = `${state.ocoluriFolosite}/${detourLimit(state)}`
  const variante = options.length > 0 && checkDetourAllowed(state).ok ? `${optionIndex + 1}/${options.length}` : '—'
  if (state.faza !== 'pregatire') return { stare: 'doar între valuri', extra, variante: '—', activ: false }
  if (!checkDetourAllowed(state).ok) return { stare: `pus (${done})`, extra, variante: '—', activ: false }
  if (!detourPossible(state)) return { stare: 'nu mai încape niciunul', extra, variante: '—', activ: false }
  return { stare: `obligatoriu (${done})`, extra, variante, activ: true }
}

function finalView(): HudView['final'] {
  const total = Object.values(state.reactii).reduce((n, x) => n + (x ?? 0), 0)
  const r = regiune && lume ? regionOf(lume, regiune.cheie) : undefined
  // Pe o regiune: înapoi pe planetă (partida se socotește, terenul rămâne) sau încă o partidă aici.
  const butoane: NonNullable<HudView['final']>['butoane'] = r
    ? [
        { act: 'new', text: 'Înapoi pe planetă', tasta: 'N', primar: true },
        { act: 'restart', text: 'Reia regiunea', tasta: 'R' },
      ]
    : [
        { act: 'restart', text: '⟳ Aceeași hartă', tasta: 'R', primar: true },
        { act: 'new', text: 'Hartă nouă', tasta: 'N' },
      ]
  if (state.faza === 'castigat') {
    const titlu = r ? (r.inima ? 'Ai salvat planeta' : `Ai salvat ${r.nume.replace('Ținutul', 'ținutul')}`) : 'Ai apărat lumea'
    return { titlu, text: `Toate cele ${WAVES.length} valuri, cu ${state.vieti} vieți rămase și ${total} reacții.`, castigat: true, butoane }
  }
  if (state.faza === 'pierdut') {
    const rest = r ? ' Doar partidele câștigate lasă urme pe teren.' : ''
    return { titlu: 'Baza a căzut', text: `În valul ${state.val + 1} din ${WAVES.length}, după ${total} reacții.${rest}`, castigat: false, butoane }
  }
  return undefined
}

function render(): void {
  const context = contextView()
  const chosen = shownDetour()
  const lastDecision = state.jurnal.at(-1)
  const start = checkStartWave(state)
  hud.update({
    regiune: regiune && lume ? regionOf(lume, regiune.cheie)?.nume : undefined,
    val: `Val ${Math.min(state.val + 1, WAVES.length)}/${WAVES.length}`,
    boss: (waveAt(state, state.val)?.grupuri ?? []).some((g) => g.tip === 'boss' || g.tip === 'paznic'),
    vieti: state.vieti,
    vietiMax: Math.max(VIETI_BAZA, state.vieti),
    aur: state.aur,
    pamant: state.pamant,
    drum: state.path.length,
    faza: state.faza,
    fazaText: { pregatire: 'Pregătire', val: paused ? 'Pauză' : 'Val în desfășurare', castigat: 'Câștigat', pierdut: 'Pierdut' }[state.faza],
    start: start.ok ? { ok: true } : { ok: false, motiv: start.reason },
    paused,
    speed: VITEZE_UI[vitezaIndex] ?? 1,
    sunet: sunet.volum,
    fundal: sunet.fundalPornit,
    canUndo: state.faza === 'pregatire' && lastDecision !== undefined && lastDecision.la === state.tick,
    towers: TOWER_TYPES.map((tip, i) => ({
      tip,
      nume: TOWERS[tip].nume,
      cost: TOWERS[tip].cost,
      gratuit: state.gratuite[tip] ?? 0,
      culoare: TOWERS[tip].culoare,
      forma: TOWERS[tip].forma,
      tasta: String(i + 4),
      ales: tip === turnAles && unealta === undefined,
      accesibil: (state.gratuite[tip] ?? 0) > 0 || state.aur >= TOWERS[tip].cost,
    })),
    unelte: [
      ...TERRAFORM_TYPES.map((u, i) => ({
        id: u,
        nume: TERRAFORMARI[u].nume,
        cost: `⬢ ${TERRAFORMARI[u].costPamant}`,
        tasta: TOOL_KEYS[i] ?? '',
        ales: unealta === u,
        accesibil: state.pamant >= TERRAFORMARI[u].costPamant,
        culoare: TERRAIN[TERRAFORMARI[u].in].culoare,
      })),
      {
        id: 'mina',
        nume: 'Mină',
        cost: `◆ ${ECONOMIE.mina.costAur}`,
        tasta: 'M',
        ales: unealta === 'mina',
        accesibil: state.aur >= ECONOMIE.mina.costAur,
        culoare: TERRAIN.filon.culoare,
      },
    ],
    ocol: ocolView(),
    wave: waveView(),
    draft: draftView(),
    carti: cartiView(),
    context: context.view,
    codex: codexView(),
    debug: `seed ${seed} · tick ${state.tick} · ${state.jurnal.length} decizii · amprentă ${fingerprint(state)}`,
    final: finalView(),
  })
  // Banda draftului apare și dispare: harta își recalculează locul.
  const draftShown = state.faza === 'pregatire' && state.oferta.length > 0
  if (draftShown !== lastDraftShown) {
    lastDraftShown = draftShown
    relayout()
  }
  const now = performance.now()
  draw(ctx, state, layout, {
    now,
    fx,
    flash,
    start: chosen?.start,
    span: chosen?.span,
    preview: chosen?.hexes,
    alpha: state.faza === 'val' && !paused ? Math.min(1, acumulat / TICK_MS) : 0,
    ...context.overlay,
    selected: selectedTower() ? fromKey((selectedTower() as Tower).hex) : undefined,
    popups: popups.map((p) => ({ text: p.text, culoare: p.culoare, progres: p.progres, varsta: (now - p.la) / POPUP_MS })),
  })
}

// --- Efectele (doar desen) ------------------------------------------------------------------------------------

/** Efectele de scurtă durată și când a fost lovit ultima oară fiecare inamic (ca să clipească). */
const fx = new Fx()
const flash = new Map<number, number>()

/** Unde e pe ecran un punct de pe drum (progres în mili-hexagoane), în unități de hexagon pentru efecte. */
function worldAt(st: GameState, progres: number): { x: number; y: number } {
  const idx = Math.min(st.path.length - 1, Math.floor(progres / MILI_HEX))
  const frac = (progres % MILI_HEX) / MILI_HEX
  const a = hexToPixel(st.path[idx] as Hex, layout)
  const b = hexToPixel((st.path[idx + 1] ?? st.path[idx]) as Hex, layout)
  return toWorld({ x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac }, layout)
}

/**
 * Evenimentele unui pas (`events.ts`), ca efecte: reacțiile (explozii, gheață, abur, fulgere între inamicii
 * electrocutați), inamicii uciși (cu aurul lor) sau ajunși la bază, și cine a fost lovit (clipește alb).
 */
function stepEffects(evs: readonly StepEvent[], before: GameState, after: GameState, now: number): void {
  let lastBolt: { x: number; y: number } | undefined
  for (const ev of evs) {
    if (ev.tip === 'reactie') {
      const w = worldAt(after, ev.progres)
      if (ev.reactie === 'explozie') fx.explozie(w, now)
      else if (ev.reactie === 'abur') fx.abur(w, now)
      else if (ev.reactie === 'dezghet') fx.dezghet(w, now)
      else if (ev.reactie === 'inghet') fx.inghet(w, now)
      else if (ev.reactie === 'spargere') fx.spargere(w, now)
      else if (ev.reactie === 'electrocutare') {
        if (lastBolt) fx.fulger(lastBolt, w, now)
        lastBolt = w
      }
    } else if (ev.tip === 'lovit') flash.set(ev.inamic, now)
    else if (ev.tip === 'puls') fx.puls(worldAt(after, ev.progres), now)
    else if (ev.tip === 'scapat') fx.baza(worldAt(before, pathLength(before)), now)
    else if (ev.tip === 'ucis') fx.moarte(worldAt(before, ev.inamic.progres), ENEMIES[ev.inamic.tip].culoare, ENEMIES[ev.inamic.tip].aur, now)
  }
  if (flash.size > 300) {
    const alive = new Set(after.inamici.map((e) => e.id))
    for (const id of flash.keys()) if (!alive.has(id)) flash.delete(id)
  }
}

/** Un refuz: notificarea cu motivul, și sunetul lui. */
function refuz(text: string): void {
  hud.toast(text)
  sunet.play('refuz')
}

// --- Acțiuni --------------------------------------------------------------------------------------------------

/** Aplică decizia; refuzul (cu motivul lui, venit din simulare) apare ca notificare. */
function decide(d: Decision): boolean {
  const r = applyDecision(state, d)
  if (!r.ok) {
    refuz(`Nu se poate: ${r.reason}`)
    return false
  }
  state = r.value
  saveRun()
  sunet.play(decisionSound(d), { pan: decisionPan(d, state) })
  // Ce se vede: praf unde s-a construit sau s-a modelat terenul, anunțul unui val nou.
  const now = performance.now()
  if (d.tip === 'turn' || d.tip === 'mina') fx.praf(toWorld(hexToPixel(fromKey(d.hex), layout), layout), now)
  if (d.tip === 'teren') fx.praf(toWorld(hexToPixel(fromKey(d.hex), layout), layout), now, d.actiune === 'canal' ? 'rgba(120, 170, 220, 0.7)' : d.actiune === 'arde' ? 'rgba(255, 140, 60, 0.7)' : undefined)
  if (d.tip === 'pornesteVal') {
    const w = waveAt(state, state.val)
    const bossi = (w?.grupuri ?? []).filter((g) => g.tip === 'boss')
    const paznic = (w?.grupuri ?? []).some((g) => g.tip === 'paznic') ? ' · și Paznicul inimii' : ''
    const sub = bossi.length
      ? `Boss · ${bossi.map((g) => (g.trasaturi ?? []).map((t) => TRAITS[t].nume).join(', ')).join(' · ')}${paznic}`
      : w
        ? describeWave(w)
        : ''
    hud.banner(`Valul ${state.val + 1} din ${WAVES.length}`, sub)
  }
  return true
}

const selectedTower = (): Tower | undefined => state.turnuri.find((t) => t.id === selected)

/** Ținta sau modul grupului, pentru turnul `id` — sau, din taste, pentru cel de sub mouse ori cel ales. */
function towerAction(a: TowerAction, id?: number): void {
  if (a === 'deselecteaza') {
    selected = undefined
    return
  }
  const t = id !== undefined ? state.turnuri.find((x) => x.id === id) : (towerAt(hoverHex) ?? selectedTower())
  if (!t) {
    refuz('Alege întâi un turn: click pe el, sau ține mouse-ul deasupra.')
    return
  }
  if (a === 'tinta') {
    const i = TARGET_MODES.indexOf(t.tintire)
    decide({ tip: 'tintire', turn: t.id, mod: TARGET_MODES[(i + 1) % TARGET_MODES.length] ?? 'primul' })
  } else {
    decide({ tip: 'combina', turn: t.id, activ: !isCombined(groupOf(state.turnuri, t.id)) })
  }
}

function selectTower(tip: TowerType): void {
  turnAles = tip
  unealta = undefined
}

function startWave(): void {
  if (decide({ tip: 'pornesteVal' })) acumulat = 0
}

function undo(): void {
  // Se anulează doar ce s-a hotărât în pregătirea curentă: o decizie luată la tick-ul de acum.
  const lastDecision = state.jurnal.at(-1)
  if (state.faza === 'pregatire' && lastDecision !== undefined && lastDecision.la === state.tick) {
    state = replay(seed, state.jurnal.slice(0, -1), state.tick, regiune?.start)
    saveRun()
  } else {
    refuz('Nu e nimic de anulat: se anulează doar deciziile din pregătirea curentă — un val jucat nu se dă înapoi.')
  }
}

function setExtra(n: number): void {
  extra = n
  optionIndex = 0
}

function nextVariant(): void {
  if (options.length > 0) optionIndex = (optionIndex + 1) % options.length
}

/** R (și butonul ⟳): pe o regiune, încă o partidă pe ea; în partida liberă, aceeași hartă de la capăt. */
function restartKey(): void {
  if (regiune) leaveRegion('restart')
  else restart(seed)
}

/** N (și butonul lui): pe o regiune, înapoi pe planetă; în partida liberă, o hartă nouă. */
function newKey(): void {
  if (regiune) leaveRegion('new')
  else restart(seed + 1)
}

function restart(newSeed: number): void {
  seed = newSeed
  resetRun(newGame(seed))
}

/** O partidă nouă din starea dată: tot ce ține de partida veche (alegeri, efecte, cache-uri) se uită. */
function resetRun(s: GameState): void {
  state = s
  selected = undefined
  acumulat = 0
  paused = false
  popups = []
  fx.clear()
  flash.clear()
  resetRenderCaches()
}

// --- Planeta (GDD §9.1) ----------------------------------------------------------------------------------------

const CHEIE_LUME = 'worldguard.lume'
const CHEIE_ARHIVA = 'worldguard.planete'
/** Partida în desfășurare pe o regiune: deciziile ei, ca o pagină închisă la jumătate să nu ocolească lumea. */
const CHEIE_PARTIDA = 'worldguard.partida'

/** O partidă deschisă și lăsată fără nimic făcut nu se socotește. */
const neinceputa = (s: GameState): boolean => s.tick === 0 && !s.jurnal.some((x) => x.d.tip === 'teren')

/** Ține minte partida de pe regiune (la fiecare decizie și la sfârșitul fiecărui val). */
function saveRun(): void {
  if (!regiune) return
  try {
    if (neinceputa(state)) localStorage.removeItem(CHEIE_PARTIDA)
    else localStorage.setItem(CHEIE_PARTIDA, JSON.stringify({ cheie: regiune.cheie, tick: state.tick, jurnal: state.jurnal }))
  } catch {
    // Fără spațiu de stocare: partida ține doar cât e pagina deschisă.
  }
}

/**
 * O partidă rămasă neterminată (pagina închisă în timpul ei) se socotește jucată, ca una părăsită: se rejoacă din
 * deciziile ei, pe terenul regiunii, iar ce i-a făcut terenului rămâne. Rejucarea o și verifică: o înregistrare
 * stricată sau modificată nu ajunge în lume.
 */
function settleUnfinishedRun(): void {
  if (!lume) return
  let text: string | null = null
  try {
    text = localStorage.getItem(CHEIE_PARTIDA)
    localStorage.removeItem(CHEIE_PARTIDA)
  } catch {
    return
  }
  if (text === null) return
  try {
    const p = JSON.parse(text) as PartidaSalvata
    const r = regionOf(lume, p.cheie)
    if (!r) throw new Error(`regiune necunoscută: ${p.cheie}`)
    const refacuta = settleRun(lume, p)
    if (!refacuta.ok) throw new Error(refacuta.reason)
    const { final } = refacuta.value
    lume = refacuta.value.lume
    saveWorld()
    const urme = final.faza === 'castigat' ? 'câștigată: ce ai făcut terenului a rămas' : 'jucată, fără urme pe teren (doar câștigurile lasă urme)'
    window.setTimeout(() => hud.toast(`Partida neterminată din ${r.nume.replace('Ținutul', 'ținutul')} s-a socotit ${urme}.`, 'info'), 500)
  } catch (e) {
    window.setTimeout(() => hud.toast(`Partida neterminată nu s-a putut reface (${e instanceof Error ? e.message : String(e)}); s-a renunțat la ea.`), 500)
  }
}

/** Seed-ul unei planete noi: din `?planeta=` (pentru verificări), altfel aleator (doar aici, nu în simulare). */
function seedNou(): number {
  return Number(params.get('planeta')) || (crypto.getRandomValues(new Uint32Array(1))[0] ?? 1) >>> 1
}

/** Lumea salvată în browser, sau una nouă. O salvare stricată se păstrează deoparte, nu se șterge. */
function loadWorld(): Lume {
  try {
    const text = localStorage.getItem(CHEIE_LUME)
    if (text !== null) {
      const r = decodeWorld(text)
      if (r.ok) return r.value
      localStorage.setItem(`${CHEIE_LUME}.stricata`, text)
      window.setTimeout(() => hud.toast(`Salvarea lumii nu s-a putut citi (${r.reason}); a rămas deoparte, iar planeta e nouă.`), 500)
    }
  } catch {
    // Fără spațiu de stocare: lumea ține doar sesiunea asta.
  }
  return newWorld(seedNou())
}

function saveWorld(): void {
  if (!lume) return
  try {
    localStorage.setItem(CHEIE_LUME, encodeWorld(lume))
  } catch {
    hud.toast('Lumea nu s-a putut salva în browser: progresul ține doar până închizi pagina.')
  }
}

/** Ceasul lumii, pentru oameni: „1 h 12 min”. */
function formatCeas(tickuri: number): string {
  const min = Math.floor((tickuri * TICK_MS) / 60_000)
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`
}

const planetName = (s: number): string => `Planeta ${(s % 0xffff).toString(16).toUpperCase().padStart(4, '0')}`

function planetView(l: Lume): PlanetView {
  const regiuni = planetRegions(l.planeta.seed)
  const acces = (k: string): ReturnType<typeof regionAccess> => regionAccess(l, k)
  const aleasa = regiuneAleasa ?? regiuni.find((r) => acces(r.cheie) === 'accesibila')?.cheie ?? key(LUME.start)
  const r = regionOf(l, aleasa)
  let detalii: PlanetView['aleasa']
  if (r) {
    const st = l.regiuni[r.cheie]
    const teren = regionTerrain(l, r.cheie)
    // Terenul de pe hartă, nu doar etapa editării: cenușa de lângă apă e deja noroi.
    const din = regionAmphibians(l, r.cheie)
    const partida = newGame(r.seed, { teren, amfibii: din })
    const harta = partida.map
    const naturali = naturalAmphibians(generateMap(r.seed).map, partida.path)
    const numar = new Map<Terrain, number>()
    for (const k of teren.keys()) {
      const t = harta.terrain.get(k)
      if (t) numar.set(t, (numar.get(t) ?? 0) + 1)
    }
    const surse = [naturali > 0 ? `apa de lângă drum: ${naturali}` : '', din > 0 ? `canalele săpate: ${din}` : ''].filter(Boolean).join(', ')
    const randuri = [
      teren.size > 0
        ? `Terenul schimbat: ${[...numar].map(([t, n]) => `${n} × ${TERRAIN[t].nume.toLowerCase()}`).join(', ')}`
        : 'Terenul e neatins.',
      ...(partida.amfibii > 0
        ? [`Amfibi în fiecare val, de la al treilea: ${partida.amfibii} (${surse}). Apa nu-i udă, îi grăbește.`]
        : []),
      `Partide jucate aici: ${st?.partide ?? 0}`,
      ...(r.inima ? ['Ultima regiune: cine îi salvează inima salvează planeta.'] : []),
    ]
    const a = acces(r.cheie)
    const pornire = startRun(l, r.cheie)
    detalii = {
      cheie: r.cheie,
      nume: r.nume,
      stare: a === 'salvata' ? 'Salvată — te poți întoarce oricând' : a === 'accesibila' ? 'Se poate apăra' : 'Încă închisă',
      randuri,
      motiv: pornire.ok ? undefined : pornire.reason,
      harta,
      editate: [...teren.keys()],
    }
  }
  return {
    titlu: planetName(l.planeta.seed),
    subtitlu: `ceasul lumii: ${formatCeas(l.ceas)} jucate · ${savedRing(l) + (planetSaved(l) ? 1 : 0)} din ${regiuni.length} regiuni salvate`,
    salvata: planetSaved(l),
    regiuni: regiuni.map((g) => ({ cheie: g.cheie, nume: g.nume, q: g.hex.q, r: g.hex.r, acces: acces(g.cheie), inima: g.inima, aleasa: g.cheie === aleasa })),
    aleasa: detalii,
  }
}

const planeta = createPlanetScreen({
  alege: (k) => {
    regiuneAleasa = k
    showPlanet()
  },
  joaca: () => playRegion(),
  planetaNoua: () => {
    if (!lume || !planetSaved(lume)) return
    // Planeta salvată rămâne în arhivă (harta galaxiei vine mai târziu); lumea pornește pe o planetă nouă.
    try {
      const arhiva = JSON.parse(localStorage.getItem(CHEIE_ARHIVA) ?? '[]') as unknown[]
      localStorage.setItem(CHEIE_ARHIVA, JSON.stringify([...arhiva, { seed: lume.planeta.seed, ceas: lume.ceas }]))
    } catch {
      // Arhiva nu e esențială.
    }
    lume = newWorld(seedNou())
    regiuneAleasa = undefined
    saveWorld()
    showPlanet()
  },
})

function showPlanet(): void {
  if (lume) planeta.show(planetView(lume))
}

/** Pornește o partidă pe regiunea aleasă (sau pe `cheie`). */
function playRegion(dorita?: string): void {
  if (!lume) return
  const cheie = dorita ?? regiuneAleasa ?? planetView(lume).aleasa?.cheie
  if (!cheie) return
  const r = startRun(lume, cheie)
  if (!r.ok) {
    refuz(`Nu se poate: ${r.reason}`)
    return
  }
  regiune = { cheie, start: r.value.start }
  regiuneAleasa = cheie
  seed = r.value.state.seed
  resetRun(r.value.state)
  planeta.hide()
  relayout()
  render()
  const info = regionOf(lume, cheie)
  const partide = lume.regiuni[cheie]?.partide ?? 0
  hud.banner(info?.nume ?? cheie, partide > 0 ? `Partida ${partide + 1} aici — terenul își amintește` : 'Prima partidă aici')
}

/**
 * Părăsește regiunea: înapoi pe planetă (`new`) sau încă o partidă pe ea (`restart`). Partida de acum se socotește
 * jucată — ce i-ai făcut terenului rămâne, iar ceasul lumii înaintează —, altfel o terraformare încercată și apoi
 * „anulată” prin repornire ar ocoli lumea care ține minte. O partidă în desfășurare cere a doua apăsare.
 */
function leaveRegion(act: 'restart' | 'new'): void {
  if (!lume || !regiune) return
  const terminata = state.faza === 'castigat' || state.faza === 'pierdut'
  const gol = neinceputa(state)
  if (!terminata && !gol) {
    const acum = performance.now()
    if (!confirmare || confirmare.act !== act || acum > confirmare.pana) {
      confirmare = { act, pana: acum + 3000 }
      hud.toast(`Apasă încă o dată ${act === 'new' ? 'N' : 'R'}: partida se socotește pierdută, deci ce ai făcut terenului nu rămâne.`)
      return
    }
  }
  confirmare = undefined
  const cheie = regiune.cheie
  if (!gol) {
    lume = commitRun(lume, cheie, state)
    saveWorld()
  }
  regiune = undefined
  try {
    localStorage.removeItem(CHEIE_PARTIDA)
  } catch {
    // nimic de șters
  }
  if (act === 'restart') playRegion(cheie)
  else showPlanet()
}

/** După un pas: reacțiile lui devin texte pe hartă, iar o reacție văzută prima dată în partidă — anunț + pauză scurtă. */
function noteReactions(before: GameState, now: number): void {
  for (const ev of state.evenimente) {
    popups.push({ text: REACTIONS[ev.tip].nume, culoare: REACTIONS[ev.tip].culoare, progres: ev.progres, la: now })
  }
  if (popups.length > 60) popups = popups.slice(-60)
  for (const r of Object.keys(REACTIONS) as ReactionType[]) {
    if ((before.reactii[r] ?? 0) === 0 && (state.reactii[r] ?? 0) > 0) {
      const rule = REACTION_RULES.find((x) => x.tip === r)
      const reteta = rule ? ` (${ELEMENT_NAMES[rule.element]} pe ${TAG_NAMES[rule.eticheta]})` : ''
      hud.announce(`Reacție nouă: ${REACTIONS[r].nume}${reteta} — ${REACTIONS[r].efect}`)
      sunet.play('descoperire')
      freezeUntil = now + FREEZE_MS
    }
  }
}

function frame(now: number): void {
  const dt = Math.min(250, now - last)
  last = now
  if (planeta.visible) {
    // Pe ecranul planetei nu curge nicio partidă și nu se desenează harta; fundalul muzical e cel calm.
    sunet.fundal('pregatire')
    requestAnimationFrame(frame)
    return
  }
  popups = popups.filter((p) => now - p.la < POPUP_MS)
  if (state.faza === 'val' && !paused && now >= freezeUntil) {
    acumulat += dt * (VITEZE_UI[vitezaIndex] ?? 1)
    while (acumulat >= TICK_MS && state.faza === 'val' && now >= freezeUntil) {
      const before = state
      state = step(state)
      acumulat -= TICK_MS
      noteReactions(before, now)
      const evs = stepEvents(before, state)
      stepEffects(evs, before, state, now)
      for (const c of stepCues(evs, before)) sunet.play(c.sunet, { pan: c.pan })
    }
    if (state.faza !== 'val') {
      // Valul s-a terminat (sau partida): timpul se oprește, drumul se poate modela din nou.
      acumulat = 0
      saveRun()
      syncHover()
      if (state.faza === 'pregatire' && state.venit) {
        hud.toast(`Valul ${state.val} s-a încheiat: dobândă +${state.venit.aur} aur, +${state.venit.pamant} pământ`, 'info')
      }
    }
  }
  // Desenul rulează la fiecare cadru, și între valuri: apa, jarul, drumul și efectele se mișcă tot timpul.
  render()
  sunet.fundal(stareFundal(state))
  requestAnimationFrame(frame)
}

// --- Intrări --------------------------------------------------------------------------------------------------

canvas.addEventListener('mousemove', (e) => {
  const h = pixelToHex(e.clientX, e.clientY, layout)
  const moved = hoverHex === undefined || key(hoverHex) !== key(h)
  hoverHex = h
  if (moved) {
    syncHover()
    render()
  }
})

canvas.addEventListener('mouseleave', () => {
  hoverHex = undefined
  syncHover()
  render()
})

canvas.addEventListener('click', () => {
  const t = towerAt(hoverHex)
  if (t) {
    selected = selected === t.id ? undefined : t.id
  } else if (hovered !== undefined) {
    const allowed = checkDetourAllowed(state)
    const chosen = options[optionIndex]
    if (!allowed.ok) refuz(`Nu se poate: ${allowed.reason}`)
    else if (!chosen) refuz(`Nu există ocol de +${extra} aici. Încearcă alt număr sau alt loc.`)
    else decide({ tip: 'ocol', start: chosen.start, span: chosen.span, hexuri: chosen.hexes.map(key) })
  } else if (hoverHex !== undefined && state.map.terrain.has(key(hoverHex))) {
    const hex = key(hoverHex)
    if (unealta === 'mina') decide({ tip: 'mina', hex })
    else if (unealta !== undefined) decide({ tip: 'teren', actiune: unealta, hex })
    else decide({ tip: 'turn', turn: turnAles, hex })
  }
  syncHover()
  render()
})

window.addEventListener('keydown', (e) => {
  if (planeta.visible) {
    // Pe ecranul planetei: Enter joacă regiunea aleasă; sunetul și fundalul merg ca peste tot.
    let fn: (() => void) | undefined
    if (e.key === 'Enter') fn = () => playRegion()
    else if (e.key === 's' || e.key === 'S') fn = cycleSound
    else if (e.key === 'b' || e.key === 'B') fn = toggleFundal
    if (fn) {
      e.preventDefault()
      fn()
    }
    return
  }
  const towerKey = ['4', '5', '6', '7'].indexOf(e.key)
  let fn: (() => void) | undefined
  if (e.key === ' ') fn = startWave
  else if (e.key === 'f' || e.key === 'F') fn = () => (vitezaIndex = (vitezaIndex + 1) % VITEZE_UI.length)
  else if (e.key === 'p' || e.key === 'P') fn = () => (paused = !paused)
  else if (e.key === 's' || e.key === 'S') fn = cycleSound
  else if (e.key === 'b' || e.key === 'B') fn = toggleFundal
  else if (e.key === '1' || e.key === '2' || e.key === '3') fn = () => setExtra(Number(e.key))
  else if (towerKey >= 0) fn = () => selectTower(TOWER_TYPES[towerKey] ?? turnAles)
  else if (TOOL_KEYS.includes(e.key.toUpperCase())) fn = () => (unealta = TERRAFORM_TYPES[TOOL_KEYS.indexOf(e.key.toUpperCase())])
  else if (e.key === 'm' || e.key === 'M') fn = () => (unealta = 'mina')
  else if (e.key === 'Tab') fn = nextVariant
  else if (e.key === 'z' || e.key === 'Z') fn = undo
  else if (e.key === 'r' || e.key === 'R') fn = restartKey
  else if (e.key === 'n' || e.key === 'N') fn = newKey
  else if (e.key === 't' || e.key === 'T') fn = () => towerAction('tinta')
  else if (e.key === 'c' || e.key === 'C') fn = () => towerAction('combina')
  else if (e.key === 'Escape') fn = () => towerAction('deselecteaza')
  else if (CARD_KEYS.includes(e.key)) {
    const carte = state.oferta[CARD_KEYS.indexOf(e.key)]
    fn = () => (carte !== undefined ? decide({ tip: 'alege', carte }) : refuz('Nu e nicio carte de ales acum — draftul vine după fiecare val.'))
  }
  if (!fn) return
  e.preventDefault()
  act(fn)
})

// Ce build rulează (commit, ramură, oră) — în colțul paginii, ca versiunea publicată să se vadă dintr-o privire.
const versiune = document.createElement('div')
versiune.id = 'versiune'
versiune.textContent = `build ${__BUILD__.sha.slice(0, 7)}${__BUILD__.ref ? ` · ${__BUILD__.ref}` : ''} · ${__BUILD__.at.slice(0, 16).replace('T', ' ')} UTC`
document.body.append(versiune)

// Doar în `npm run dev`: starea, lumea, poziția pe ecran a unui hexagon și motorul de sunet, pentru consolă și
// scripturile de verificare.
// Vite scoate blocul din build-ul de producție.
if (import.meta.env.DEV) {
  Object.assign(window, {
    wg: {
      get state(): GameState {
        return state
      },
      get lume(): Lume | undefined {
        return lume
      },
      sunet,
      px: (k: string): [number, number] => {
        const p = hexToPixel(fromKey(k), layout)
        return [p.x, p.y]
      },
    },
  })
}

// Browserele lasă pagina să cânte abia după un gest al jucătorului: primul click sau prima tastă pornește sunetul.
for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, () => sunet.unlock(), { capture: true })

window.addEventListener('resize', resize)
resize()
// Fără `?seed=`, jocul pornește pe planetă (lumea salvată în browser, sau una nouă).
if (!liber) {
  lume = loadWorld()
  settleUnfinishedRun()
  showPlanet()
}
requestAnimationFrame(frame)
