# World Guard, faza 1: jocul jucabil. Plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jocul din prototip ia locul celui vechi din repo-ul WorldGuard și poate fi jucat pe telefonul lui Andrei, cu simularea testată și separată de desenat.

**Architecture:** Simularea (`src/sim/`) e TypeScript fără browser: o stare din date simple, avansată cu un pas fix de 1/60 s de `step(state, input)`. Cifrele stau în `src/data/`. Desenatul (`src/render/`, Canvas 2D) doar citește starea. Comenzile (`src/input/`) produc un vector de direcție, iar `src/main.ts` leagă totul printr-o buclă cu acumulator.

**Tech Stack:** TypeScript 7, Vite 8, Vitest 5 (deja în repo, verificate: `npm run check` trece pe codul vechi). Canvas 2D. Nicio dependență de rulare. Fonturile vin din pachetele `@fontsource/alfa-slab-one` și `@fontsource/rubik`, ca devDependencies.

**Spec:** `docs/GDD.md` (intră în repo în Task 1). Referința vizuală și de comportament: `docs/prototip.html`. Unde diferă, câștigă spec-ul.

**Ce acoperă planul.** Spec-ul fixează ordinea: întâi jocul jucabil pe telefon, apoi pauza, instalarea și reluarea, la urmă plasa pentru dificultate. Sunt trei planuri. Acesta e primul. Celelalte două se scriu după verificarea pe telefon, fiindcă rezultatul ei le poate schimba (de exemplu trecerea la PixiJS). Faza 1 pregătește totuși terenul lor: starea trece prin JSON neschimbată și simularea rulează fără browser.

## Global Constraints

- Nicio dependență de rulare în `package.json`. Desenat pe Canvas 2D.
- Niciun apel de rețea în timpul jocului. Fonturile sunt în pachet.
- `src/sim/` nu atinge DOM-ul și nu folosește `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`. Hazardul vine din `createRng(seed, flux)`. `src/sim/discipline.test.ts` păzește asta și rămâne neschimbat.
- Un număr de joc scris în afara `src/data/` e o greșeală.
- Starea partidei e din date simple: fără funcții, fără referințe între obiecte. Trebuie să treacă prin `JSON.parse(JSON.stringify(s))` și să continue identic.
- Pas fix de 1/60 s. Cel mult 5 pași pe cadru, restul se aruncă.
- Scara: `max(înălțimea ecranului / 880, lățimea / 1100)`. Telefon vertical, un singur deget.
- Interfața e în română. Toate textele stau în `src/ui/strings.ts`.
- Stilul codului, ca în `src/sim/rng.ts`: fără `;`, ghilimele simple, 2 spații, identificatori în engleză, comentarii în română.
- Înainte de fiecare commit: `npm run check` verde. Fiecare task adaugă câteva rânduri la intrarea sesiunii din `DEVLOG.md`. Fișierele se stagează explicit, niciodată `git add -A`.
- Toate commit-urile merg pe ramura de lucru `ccr-a5a7e643-gpwbh0` (sau pe cea impusă de sesiune). Istoria nu se rescrie. Fiecare task se încheie cu `git push`.
- Nu intră aici: pauza, instalarea, reluarea partidei, jucătorii automați, reechilibrarea.

## Review Focus

1. **Al doilea deget pe ecran.** Un al doilea deget nu fură și nu blochează joystickul; ridicarea primului oprește eroul. Test în Task 6.
2. **Întoarcerea după o pauză lungă a telefonului.** Un cadru care vine după minute nu derulează jocul înainte și nu dărâmă castelul dintr-odată. Test în Task 6.
3. **Stocare refuzată sau stricată.** Fără `localStorage`, sau cu gunoi în el, jocul pornește și recordul e 0. Test în Task 8.
4. **Ecran rotit, redimensionat sau cu mărime zero.** Scara rămâne un număr finit și pozitiv, iar camera nu iese din hartă. Test în Task 7.
5. **Geometrie degenerată.** Eroul aflat exact pe centrul unui obstacol, punctul de reapariție pus pe un cerc, cercuri suprapuse: fără `NaN`, fără plată nedorită. Teste în Task 1 și Task 2.

---

### Task 1: Înlocuirea și starea de pornire

**Files:**
- Delete: `src/data/terrain.ts`, `src/render/canvas.ts`, `src/sim/game.ts`, `src/sim/hex.ts`, `src/sim/map.ts`, `src/sim/path.ts` și testele lor (`game`, `hex`, `map`, `path`)
- Păstrate neatinse: `src/sim/rng.ts`, `src/sim/rng.test.ts`, `src/sim/result.ts`, `src/sim/discipline.test.ts`
- Replace: `docs/GDD.md`, `CLAUDE.md`, `README.md`, `src/main.ts`, `index.html`
- Modify: `DEVLOG.md` (se adaugă o intrare), `package.json`
- Create: `docs/prototip.html`, `docs/superpowers/plans/2026-11-17-world-guard-faza-1.md`, `src/data/balance.ts`, `src/data/layout.ts`, `src/sim/state.ts`, `src/sim/step.ts`, `src/sim/testkit.ts`
- Test: `src/data/balance.test.ts`, `src/sim/state.test.ts`

**Interfaces:**
- Consumes: `createRng(seed: number, stream: string): Rng` din `src/sim/rng.ts`.
- Produces: tipurile și funcțiile de mai jos. Toate task-urile următoare se sprijină pe ele.

```ts
// src/sim/state.ts
export const DT = 1 / 60
export const EPS = 1e-9          // cronometrele se compară cu `<= EPS`, nu cu `<= 0`
export const NEVER = -9          // „nu s-a întâmplat încă”, pentru câmpurile …T de afișare
export type Res = 'wood' | 'stone'
export type BuildKind = 'tower' | 'camp' | 'quarry' | 'hero'
export type PadKind = BuildKind | 'repair'
export interface Input { x: number; y: number }                    // lungime ≤ 1
export interface ResNode { type: Res; x: number; y: number; left: number; regrowAt: number; shakeT: number; tilt: number; shape: number[] }
export interface Pad { kind: PadKind; x: number; y: number; bx: number; by: number; lvl: number; paid: Record<Res, number>; dwell: number; payT: number; flip: boolean; cool: number; prodT: number; popT: number }
export interface Hero { x: number; y: number; face: number; hp: number; lvl: number; dead: boolean; respawnT: number; swingT: number; gatherT: number; slashT: number; slashA: number; hurtT: number; walk: number; moved: boolean }
export interface Foe { id: number; x: number; y: number; r: number; hp: number; maxHp: number; speed: number; dmg: number; brute: boolean; atkT: number; kx: number; ky: number; a: number; hitT: number; lungeT: number }
export interface Shot { x: number; y: number; tx: number; ty: number; a: number; targetId: number; dmg: number }   // targetId = -1 după moartea țintei
export type Fx =
  | { kind: 'gain'; res: Res; x: number; y: number; t0: number }
  | { kind: 'level'; what: BuildKind; lvl: number; x: number; y: number; t0: number }
  | { kind: 'heroDown'; x: number; y: number; t0: number }
  | { kind: 'puff'; r: number; x: number; y: number; t0: number }
export interface GameState {
  seed: number; mode: 'playing' | 'over'; tick: number; t: number   // t = tick * DT
  wood: number; stone: number; kills: number
  castle: { hp: number; hitT: number }
  hero: Hero; nodes: ResNode[]; pads: Pad[]; foes: Foe[]; shots: Shot[]; fx: Fx[]
  spawnT: number; spawnN: number; nextId: number
}
export function createGame(seed: number): GameState

// src/sim/step.ts
export function step(s: GameState, input: Input): void   // nu face nimic dacă s.mode === 'over'

// src/sim/testkit.ts — ajutoare pentru teste (și, mai târziu, pentru jucătorii automați)
export function quietGame(seed?: number): GameState      // createGame fără noduri și fără apariții (spawnT = 1e9)
export function stepFor(s: GameState, seconds: number, input?: Input): void   // Math.round(seconds * 60) pași
export function heroAt(s: GameState, x: number, y: number): void
export function addNode(s: GameState, type: Res, x: number, y: number): ResNode
export function padOf(s: GameState, kind: PadKind, i?: number): Pad            // al i-lea cerc de felul dat

// src/data/balance.ts
export function cost(kind: BuildKind, level: number): Record<Res, number>     // costul pentru a AJUNGE la `level`
export function towerDamage(level: number): number
export function spawnEvery(t: number): number
export function foeHp(t: number): number
```

- [ ] **Step 1: Ramura și eticheta jocului vechi**

```bash
git checkout -b ccr-a5a7e643-gpwbh0 origin/main
git tag hex-td-v0.0.1 origin/main        # azi commit-ul ec73b9e
git push origin hex-td-v0.0.1
```

- [ ] **Step 2: Scoate jocul vechi**

`git rm` pe fișierele de la „Delete”. `src/main.ts` devine un ciot care doar importă `createGame` și scrie în consolă starea de pornire, ca build-ul să aibă intrare până la Task 7.

- [ ] **Step 3: Documentele**

- `docs/GDD.md`: designul nou, exportat ca Markdown din documentul „World Guard: designul primei versiuni”. Fișierul îl dă sesiunea care orchestrează.
- `docs/prototip.html`: prototipul, copiat neschimbat, cu un comentariu HTML pe primul rând: „Prototip de aruncat. Referință pentru aspect și comportament, nu cod de refolosit ca atare.”
- `docs/superpowers/plans/2026-11-17-world-guard-faza-1.md`: planul ăsta.
- `CLAUDE.md`, rescris, cu aceleași secțiuni ca azi: ce e (joc de apărat castelul cu un erou, pentru telefon, pentru Andrei deocamdată), comenzi, arhitectura (`src/sim`, `src/data`, `src/render`, `src/input`, `src/ui`, `src/main.ts`), regulile dure din `src/sim` (fără regula jurnalului de decizii; cu regula „starea trece prin JSON”), cum se lucrează (neschimbat), stare.
- `README.md`: ce e jocul, cele trei comenzi, cum se joacă.
- `DEVLOG.md`: o intrare nouă, datată, care spune ce s-a cerut (jocul nou ia locul celui vechi), unde se găsește jocul vechi (eticheta `hex-td-v0.0.1`) și ce s-a păstrat.
- `package.json`: versiunea `0.1.0`, descrierea „World Guard — aperi castelul cu un erou (joc web pentru telefon)”.
- `index.html`: titlul devine „World Guard”.

- [ ] **Step 4: Scrie testele care pică**

```ts
// src/data/balance.test.ts
it('costurile din spec', () => {
  expect(cost('tower', 1)).toEqual({ wood: 20, stone: 0 })
  expect(cost('tower', 3)).toEqual({ wood: 50, stone: 30 })
  expect(cost('tower', 5)).toEqual({ wood: 80, stone: 60 })
  expect([1, 2, 3].map((l) => cost('camp', l))).toEqual([{ wood: 25, stone: 0 }, { wood: 40, stone: 15 }, { wood: 60, stone: 35 }])
  expect([1, 2, 3].map((l) => cost('quarry', l))).toEqual([{ wood: 35, stone: 0 }, { wood: 45, stone: 20 }, { wood: 60, stone: 40 }])
  expect(cost('hero', 2)).toEqual({ wood: 25, stone: 10 })
  expect(cost('hero', 5)).toEqual({ wood: 70, stone: 55 })
})
it('curbele din spec', () => {
  expect([towerDamage(1), towerDamage(5)]).toEqual([6, 26])
  expect([spawnEvery(0), spawnEvery(90), spawnEvery(1e6)]).toEqual([5, 2.5, 0.6])
  expect([foeHp(0), foeHp(80)]).toEqual([14, 28])
})

// src/sim/state.test.ts
it('starea de pornire', () => {
  const s = createGame(1)
  expect(s).toMatchObject({ mode: 'playing', tick: 0, t: 0, wood: 20, stone: 0, kills: 0, spawnT: 10, spawnN: 0 })
  expect(s.castle.hp).toBe(400)
  expect(s.hero).toMatchObject({ x: 464, y: 756, hp: 60, lvl: 1, dead: false })
  expect([s.foes, s.shots, s.fx]).toEqual([[], [], []])
})
it('resursele: 35 de copaci și 20 de stânci, pline, în grupurile lor', () => {
  const s = createGame(1)
  for (const c of CLUSTERS) {
    const inside = s.nodes.filter((n) => n.type === c.type && Math.hypot(n.x - c.x, n.y - c.y) <= c.rad + 1e-6)
    expect(inside.length).toBe(c.n)
  }
  expect(s.nodes.filter((n) => n.type === 'wood').every((n) => n.left === 8)).toBe(true)
  expect(s.nodes.filter((n) => n.type === 'stone').every((n) => n.left === 6)).toBe(true)
  for (const a of s.nodes) for (const b of s.nodes) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(36)
})
it('harta e aceeași la orice sămânță', () => {
  expect(createGame(1).nodes).toEqual(createGame(2).nodes)
})
it('cercurile din spec', () => {
  const at = createGame(1).pads.map((p) => [p.kind, p.x, p.y, p.bx, p.by])
  expect(at).toEqual([
    ['tower', 425, 669, 425, 625], ['tower', 675, 669, 675, 625], ['tower', 425, 919, 425, 875], ['tower', 675, 919, 675, 875],
    ['camp', 300, 776, 300, 730], ['quarry', 650, 438, 650, 392], ['hero', 550, 600, 550, 600], ['repair', 550, 850, 550, 850],
  ])
})
it('geometrie: cercurile nu se ating, nu acoperă resurse, iar reapariția nu cade pe un cerc', () => {
  const s = createGame(1)
  for (const a of s.pads) {
    for (const b of s.pads) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(2 * PAD_R)
    for (const n of s.nodes) expect(Math.hypot(a.x - n.x, a.y - n.y)).toBeGreaterThan(PAD_R + BALANCE.node[n.type].r)
    expect(Math.hypot(a.x - HOME.x, a.y - HOME.y)).toBeGreaterThan(PAD_R + BALANCE.hero.r)
  }
})
it('un pas înseamnă 1/60 s, iar o partidă terminată nu mai avansează', () => {
  const s = createGame(1)
  step(s, { x: 0, y: 0 })
  expect([s.tick, s.t]).toEqual([1, 1 / 60])
  s.mode = 'over'
  step(s, { x: 0, y: 0 })
  expect(s.tick).toBe(1)
})
```

- [ ] **Step 5: Rulează testele și vezi că pică**

Run: `npx vitest run src/data src/sim/state.test.ts`
Expected: FAIL, modulele `balance`, `layout`, `state`, `step` nu există.

- [ ] **Step 6: Scrie `src/data/balance.ts` și `src/data/layout.ts`**

Fiecare cifră primește un comentariu de o linie, în română, cu unitatea ei.

```ts
// src/data/balance.ts
export const BALANCE = {
  castle: { hp: 400 },
  start: { wood: 20, stone: 0 },
  hero: { r: 13, speed: 165, hp: 60, hpPerLevel: 20, dmg: 10, dmgPerLevel: 6, reach: 58, swingEvery: 0.45, arc: 1.25,
          push: 140, pushBrute: 60, pushDamping: 7, regenWait: 3, regen: 4, respawn: 5, maxLevel: 5 },
  node: { wood: { amount: 8, every: 0.3, regrow: 18, r: 9 }, stone: { amount: 6, every: 0.42, regrow: 24, r: 14 }, reach: 16 },
  tower: { range: 190, every: 0.8, dmgBase: 6, dmgPerLevel: 5, maxLevel: 5, shotSpeed: 420, r: 14 },
  camp: { every: [1.6, 1.0, 0.7], maxLevel: 3, r: 18 },
  quarry: { every: [2.4, 1.5, 1.0], maxLevel: 3, r: 18 },
  repair: { every: 0.1, heal: 5 },
  pay: { every: 0.035, dwell: 0.35, restAfterLevel: 0.7 },
  foe: { firstAt: 10, chase: 90, hitCastleEvery: 1, hitHeroEvery: 0.8, firstHit: 0.4,
         grunt: { r: 10, speed: 46, dmg: 3 }, brute: { r: 15, speed: 30, dmg: 9, hpTimes: 4, every: 7, after: 120 } },
  fx: { textLife: 0.9, puffLife: 0.3 },
} as const
// cost: tower n → lemn 20 + 15(n−1), piatră 15(n−1); hero n (2–5) → lemn 25 + 15(n−2), piatră 10 + 15(n−2);
//       camp și quarry → tabelele din testul de mai sus
// spawnEvery(t) = max(0.6, 5 / (1 + t / 90));  foeHp(t) = 14 × (1 + t / 80);  towerDamage(l) = 6 + 5(l − 1)

// src/data/layout.ts
export const WORLD = { w: 1100, h: 1500 }
export const CASTLE = { x: 550, y: 750, r: 54 }
export const HOME = { x: 464, y: 756 }        // unde stă eroul la început și unde reapare
export const PAD_R = 28
export const LAYOUT_SEED = 7
export const NODE_GAP = 36
export const CLUSTERS = [
  { type: 'wood', x: 300, y: 640, n: 6, rad: 62 }, { type: 'wood', x: 810, y: 900, n: 6, rad: 62 },
  { type: 'wood', x: 180, y: 230, n: 8, rad: 78 }, { type: 'wood', x: 420, y: 1300, n: 8, rad: 78 },
  { type: 'wood', x: 900, y: 330, n: 7, rad: 72 }, { type: 'stone', x: 560, y: 400, n: 4, rad: 50 },
  { type: 'stone', x: 980, y: 640, n: 5, rad: 56 }, { type: 'stone', x: 150, y: 1050, n: 6, rad: 62 },
  { type: 'stone', x: 900, y: 1330, n: 5, rad: 56 },
] as const
// PADS: cele 8 rânduri din testul „cercurile din spec”, în aceeași ordine
```

- [ ] **Step 7: Scrie `state.ts`, `step.ts` și `testkit.ts`**

`createGame` așază nodurile cu `createRng(LAYOUT_SEED, 'harta')`, nu cu sămânța partidei. Pentru fiecare grup: unghi `next() * 2π`, distanță `sqrt(next()) * rad`, respinge punctul dacă e la mai puțin de `NODE_GAP` de un nod existent, până la 400 de încercări pe grup. Stâncile primesc `shape` din 7 valori `0.78 + next() * 0.3`; copacii primesc `[]`. Toate câmpurile `…T` de afișare pornesc de la `NEVER`. `step` crește `tick`, pune `t = tick * DT` și deocamdată nu face altceva.

- [ ] **Step 8: Rulează testele și poarta**

Run: `npm run check`
Expected: PASS. Testul de disciplină găsește `rng`, `result`, `state`, `step`, `testkit`.

- [ ] **Step 9: Commit, push, pull request**

```bash
git add docs CLAUDE.md README.md DEVLOG.md package.json index.html src
git commit -m "World Guard: jocul nou ia locul celui vechi; starea de pornire"
git push -u origin ccr-a5a7e643-gpwbh0
```

Se deschide un pull request ca draft. Descrierea spune că jocul vechi rămâne la eticheta `hex-td-v0.0.1`.

---

### Task 2: Eroul: mers, coliziuni, strâns, viață

**Files:**
- Create: `src/sim/hero.ts`
- Modify: `src/sim/step.ts`
- Test: `src/sim/hero.test.ts`

**Interfaces:**
- Consumes: tot ce produce Task 1.
- Produces:

```ts
// src/sim/hero.ts
export function heroMaxHp(s: GameState): number      // 60 + 20 × (nivel − 1)
export function heroDamage(s: GameState): number     // 10 + 6 × (nivel − 1)
export function updateHero(s: GameState, input: Input): void   // reapariție, mers, coliziuni, refacere, strâns
export function hurtHero(s: GameState, dmg: number): void      // la 0: dead, respawnT = 5, Fx 'heroDown' și 'puff'
```

`step` cheamă `updateHero`, apoi readuce la plin nodurile cu `left === 0` și `t >= regrowAt`.

- [ ] **Step 1: Scrie testele care pică**

```ts
const still = { x: 0, y: 0 }
it('merge cu 165 pe secundă, proporțional cu comanda', () => {
  const s = quietGame(); heroAt(s, 700, 1200)
  stepFor(s, 1, { x: 1, y: 0 })
  expect(s.hero.x).toBeCloseTo(865, 6); expect(s.hero.y).toBeCloseTo(1200, 6)
  stepFor(s, 1, { x: 0, y: -0.5 })
  expect(s.hero.y).toBeCloseTo(1117.5, 6)
})
it('rămâne în hartă și în afara castelului', () => {
  const s = quietGame(); heroAt(s, 1090, 1200)
  stepFor(s, 1, { x: 1, y: 0 }); expect(s.hero.x).toBe(1080)
  heroAt(s, 550, 650); stepFor(s, 2, { x: 0, y: 1 })
  expect(Math.hypot(s.hero.x - 550, s.hero.y - 750)).toBeGreaterThanOrEqual(67 - 1e-6)
  expect(s.hero.y).toBeLessThan(750)
})
it('pus exact pe centrul unui obstacol, iese fără NaN', () => {
  const s = quietGame(); const n = addNode(s, 'stone', 300, 300)
  for (const [x, y] of [[550, 750], [n.x, n.y]] as const) {
    heroAt(s, x, y); stepFor(s, 0.1)
    expect(Number.isFinite(s.hero.x) && Number.isFinite(s.hero.y)).toBe(true)
  }
  expect(Math.hypot(s.hero.x - 300, s.hero.y - 300)).toBeGreaterThanOrEqual(27 - 1e-6)
})
it('strânge lemn bucată cu bucată, iar copacul crește la loc', () => {
  const s = quietGame(); const n = addNode(s, 'wood', 300, 300); heroAt(s, 268, 300)   // 10 unități de margine
  stepFor(s, 1 / 60); expect([s.wood, n.left]).toEqual([21, 7])
  stepFor(s, 2.6); expect([s.wood, n.left]).toEqual([28, 0])
  expect(s.fx.some((f) => f.kind === 'gain' && f.res === 'wood')).toBe(true)
  heroAt(s, 700, 1200)                                     // pleacă, altfel îl taie din nou când crește
  stepFor(s, 17); expect(n.left).toBe(0)
  stepFor(s, 1.5); expect(n.left).toBe(8)
})
it('piatra vine la 0,42 s, iar de la 17 unități nu vine nimic', () => {
  const s = quietGame(); addNode(s, 'stone', 300, 300); heroAt(s, 300 - 14 - 13 - 10, 300)
  stepFor(s, 1); expect(s.stone).toBe(3)
  const far = quietGame(); addNode(far, 'wood', 300, 300); heroAt(far, 300 - 9 - 13 - 17, 300)
  stepFor(far, 2); expect(far.wood).toBe(20)
})
it('doborât, nu se mișcă și nu strânge; reapare lângă castel, întreg', () => {
  const s = quietGame(); addNode(s, 'wood', 300, 300); heroAt(s, 268, 300)
  hurtHero(s, 999)
  expect(s.hero).toMatchObject({ dead: true, respawnT: 5 })
  expect(s.fx.some((f) => f.kind === 'heroDown')).toBe(true)
  stepFor(s, 4.9, { x: 1, y: 0 }); expect([s.hero.x, s.wood]).toEqual([268, 20])
  stepFor(s, 0.3); expect(s.hero).toMatchObject({ dead: false, x: 464, y: 756, hp: 60 })
})
it('își reface 4 viață pe secundă după 3 s fără lovituri', () => {
  const s = quietGame(); heroAt(s, 700, 1200); hurtHero(s, 30)
  stepFor(s, 2.9); expect(s.hero.hp).toBe(30)
  stepFor(s, 2.1); expect(s.hero.hp).toBeCloseTo(38, 0)
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/sim/hero.test.ts`
Expected: FAIL, `hero.ts` nu există.

- [ ] **Step 3: Scrie `src/sim/hero.ts`**

Ordinea din `updateHero`: reapariția dacă e doborât (și atât); altfel mers, coliziuni, refacere, strâns. Coliziunile sunt cerc pe cerc și împing eroul pe normală: castelul (54), nodurile cu `left > 0` (9 sau 14), clădirile cu `lvl > 0` (turn 14, tabără și carieră 18), apoi marginea hărții la 20 de unități. La distanță zero, eroul e împins pe axa x. Strânsul ia cel mai apropiat nod aflat la cel mult 16 unități de margine. `gatherT` scade la fiecare pas, se oprește la 0 și se reîncarcă doar când s-a strâns ceva, deci prima bucată vine imediat. `face` urmează direcția de mers, mai puțin în primele 0,25 s după o lovitură.

- [ ] **Step 4: Rulează testele și poarta**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit și push**

```bash
git add src/sim/hero.ts src/sim/hero.test.ts src/sim/step.ts DEVLOG.md
git commit -m "Eroul: mers, coliziuni, strâns, viață"
git push
```

---

### Task 3: Cercurile: plată, niveluri, producție, reparat

**Files:**
- Create: `src/sim/pads.ts`
- Modify: `src/sim/step.ts`
- Test: `src/sim/pads.test.ts`

**Interfaces:**
- Consumes: Task 1; `heroMaxHp` din Task 2.
- Produces:

```ts
// src/sim/pads.ts
export function levelOf(s: GameState, p: Pad): number                        // pentru 'hero' e nivelul eroului
export function nextCost(s: GameState, p: Pad): Record<Res, number> | null   // null la 'repair' și la nivel maxim
export function updatePads(s: GameState): void                               // plată, terminarea nivelului, producție, reparat
```

- [ ] **Step 1: Scrie testele care pică**

```ts
const on = (s: GameState, p: Pad) => heroAt(s, p.x, p.y)
it('plata începe abia după 0,35 s și construiește turnul din 20 de lemne', () => {
  const s = quietGame(); const p = padOf(s, 'tower'); on(s, p)
  stepFor(s, 0.3); expect([s.wood, p.paid.wood]).toEqual([20, 0])
  stepFor(s, 1); expect([s.wood, p.lvl, p.paid.wood]).toEqual([0, 1, 0])
  expect(s.fx.some((f) => f.kind === 'level' && f.what === 'tower' && f.lvl === 1)).toBe(true)
})
it('trecutul în fugă prin mijlocul cercului nu costă nimic, oricum ar cădea pașii', () => {
  for (let off = 0; off < 2.75; off += 0.25) {
    const s = quietGame(); const p = padOf(s, 'tower'); heroAt(s, p.x - 40 - off, p.y)
    stepFor(s, 0.6, { x: 1, y: 0 })
    expect([s.wood, p.paid.wood]).toEqual([20, 0])
  }
})
it('plata parțială rămâne în cerc', () => {
  const s = quietGame(); s.wood = 5; const p = padOf(s, 'tower'); on(s, p)
  stepFor(s, 1); expect([s.wood, p.paid.wood, p.lvl]).toEqual([0, 5, 0])
  heroAt(s, 700, 1200); stepFor(s, 1); expect(p.paid.wood).toBe(5)
})
it('fără resurse nu se întâmplă nimic și nimic nu scade sub zero', () => {
  const s = quietGame(); s.wood = 0; const p = padOf(s, 'tower'); on(s, p)
  stepFor(s, 2); expect([s.wood, s.stone, p.paid]).toEqual([0, 0, { wood: 0, stone: 0 }])
})
it('după un nivel urmează o pauză de aproximativ o secundă', () => {
  const s = quietGame(); s.wood = 500; s.stone = 500; const p = padOf(s, 'tower'); on(s, p)
  while (p.lvl === 0) step(s, { x: 0, y: 0 })
  stepFor(s, 0.9); expect(p.paid).toEqual({ wood: 0, stone: 0 })
  stepFor(s, 0.4); expect(p.paid.wood + p.paid.stone).toBeGreaterThan(0)
})
it('nivelul 2 de turn ia exact 35 de lemne și 15 pietre', () => {
  const s = quietGame(); s.wood = 500; s.stone = 500; const p = padOf(s, 'tower'); p.lvl = 1; on(s, p)
  while (p.lvl === 1) step(s, { x: 0, y: 0 })
  expect([s.wood, s.stone]).toEqual([465, 485])
})
it('la nivel maxim nu se mai cheltuie', () => {
  const s = quietGame(); s.wood = 500; s.stone = 500; const p = padOf(s, 'tower'); p.lvl = 5; on(s, p)
  stepFor(s, 2); expect([s.wood, s.stone, nextCost(s, p)]).toEqual([500, 500, null])
})
it('nivelul eroului dă viață și lovitură', () => {
  const s = quietGame(); s.wood = 25; s.stone = 10; s.hero.hp = 12; on(s, padOf(s, 'hero'))
  stepFor(s, 2); expect([s.hero.lvl, s.hero.hp, heroDamage(s)]).toEqual([2, 80, 16])
})
it('tabăra și cariera produc singure', () => {
  const s = quietGame(); heroAt(s, 700, 1200)
  const c = padOf(s, 'camp'); c.lvl = 1; c.prodT = 1.6       // ca imediat după construire
  const q = padOf(s, 'quarry'); q.lvl = 2; q.prodT = 1.5
  stepFor(s, 16.2); expect([s.wood, s.stone]).toEqual([30, 10])   // 10 lemne la 1,6 s; 10 pietre la 1,5 s
})
it('reparatul schimbă o piatră pe 5 viață și se oprește la plin', () => {
  const s = quietGame(); s.stone = 10; s.castle.hp = 380; on(s, padOf(s, 'repair'))
  stepFor(s, 1.5); expect([s.castle.hp, s.stone]).toEqual([400, 6])
})
it('un erou doborât nu plătește', () => {
  const s = quietGame(); const p = padOf(s, 'tower'); on(s, p); hurtHero(s, 999)
  stepFor(s, 2); expect(s.wood).toBe(20)
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/sim/pads.test.ts`
Expected: FAIL, `pads.ts` nu există.

- [ ] **Step 3: Scrie `src/sim/pads.ts`**

Trei lucruri pe care testele nu le fixează singure:

- Așteptarea se verifică înainte de a fi crescută: `if (p.dwell < BALANCE.pay.dwell) { p.dwell += DT; continue }`. Altfel o trecere prin mijloc poate plăti o bucată.
- Când eroul nu e pe cerc, un `dwell` pozitiv revine la 0, iar unul negativ (pauza de după nivel) urcă spre 0 cu `DT` pe pas. La terminarea unui nivel, `dwell = -restAfterLevel` și `paid` se golește.
- Dacă și lemnul, și piatra mai sunt de plătit și jucătorul le are pe amândouă, bucățile alternează prin `p.flip`.

Terminarea nivelului: `popT = s.t`, un `Fx` de fel `'level'` deasupra clădirii (sau deasupra cercului, pentru erou). La erou, `hp` urcă la noul maxim. La tabără și carieră, `prodT` pornește de la intervalul nivelului 1.

- [ ] **Step 4: Rulează testele și poarta**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit și push**

```bash
git add src/sim/pads.ts src/sim/pads.test.ts src/sim/step.ts DEVLOG.md
git commit -m "Cercurile: plată, niveluri, producție, reparat"
git push
```

---

### Task 4: Dușmanii și sfârșitul partidei

**Files:**
- Create: `src/sim/foes.ts`
- Modify: `src/sim/step.ts`, `src/sim/testkit.ts`
- Test: `src/sim/foes.test.ts`

**Interfaces:**
- Consumes: Task 1; `hurtHero` din Task 2.
- Produces:

```ts
// src/sim/foes.ts
export function makeFoe(s: GameState, x: number, y: number, brute: boolean): Foe   // îl adaugă în s.foes, cu id din s.nextId++
export function spawnFoe(s: GameState): void       // următorul din șir, pe marginea hărții
export function hurtFoe(s: GameState, f: Foe, dmg: number): void
export function updateFoes(s: GameState): void     // apariții, mers, atac, împins, despărțire, scoaterea celor doborâți
// src/sim/testkit.ts
export function addFoe(s: GameState, x: number, y: number, over?: Partial<Foe>): Foe
```

`step` cheamă `updateFoes` după `updatePads`, apoi curăță `fx` mai vechi decât `BALANCE.fx` și, dacă `castle.hp <= 0`, pune `hp = 0` și `mode = 'over'`.

- [ ] **Step 1: Scrie testele care pică**

```ts
const idle = (seed: number, secs: number) => { const s = createGame(seed); stepFor(s, secs); return s }
it('primul dușman apare la 10 s, pe margine, cu cifrele din spec', () => {
  expect(idle(1, 9.9).foes).toEqual([])
  const f = idle(1, 10.1).foes[0]!
  expect(f.x === 0 || f.x === 1100 || f.y === 0 || f.y === 1500).toBe(true)
  expect(f).toMatchObject({ r: 10, speed: 46, dmg: 3, brute: false })
  expect(f.maxHp).toBeCloseTo(14 * (1 + 10 / 80), 1)
})
it('aceeași sămânță dă aceiași dușmani; altă sămânță, alții', () => {
  expect(idle(5, 60).foes).toEqual(idle(5, 60).foes)
  expect(idle(5, 60).foes).not.toEqual(idle(6, 60).foes)
})
it('fiecare al 7-lea, după 120 s, e greu', () => {
  const s = quietGame(); s.tick = 121 * 60; s.t = 121; s.spawnN = 6
  spawnFoe(s)
  expect(s.foes[0]).toMatchObject({ brute: true, r: 15, speed: 30, dmg: 9 })
  expect(s.foes[0]!.maxHp).toBeCloseTo(4 * foeHp(121), 6)
  const early = quietGame(); early.spawnN = 6; spawnFoe(early); expect(early.foes[0]!.brute).toBe(false)
})
it('merge la zid, se oprește și lovește castelul cu 3 pe secundă', () => {
  const s = quietGame(); heroAt(s, 100, 100); const f = addFoe(s, 550, 400)
  stepFor(s, 8); expect(Math.hypot(f.x - 550, f.y - 750)).toBeCloseTo(65, 0)
  const hp = s.castle.hp; stepFor(s, 3); expect(hp - s.castle.hp).toBe(9)
})
it('urmărește eroul aflat la mai puțin de 90 de unități și îl lovește când îl atinge', () => {
  const s = quietGame(); heroAt(s, 300, 300); const f = addFoe(s, 385, 300)
  stepFor(s, 0.3); expect(f.x).toBeLessThan(375)            // vine spre erou; încă e în afara loviturii lui
  const t = quietGame(); heroAt(t, 300, 300); addFoe(t, 320, 300, { atkT: 0 })
  stepFor(t, 1 / 60); expect(t.hero.hp).toBe(57)
  const far = quietGame(); heroAt(far, 300, 300); const g = addFoe(far, 400, 300)
  stepFor(far, 1); expect(g.x).toBeGreaterThan(400)        // la 100 de unități îl ignoră și pleacă spre castel
})
it('nu se suprapun și nu intră în castel', () => {
  const s = quietGame(); heroAt(s, 100, 100)
  for (let i = 0; i < 30; i++) addFoe(s, 550, 500)
  stepFor(s, 12)
  for (const a of s.foes) {
    expect(Number.isFinite(a.x + a.y)).toBe(true)
    expect(Math.hypot(a.x - 550, a.y - 750)).toBeGreaterThanOrEqual(64 - 0.01)
    for (const b of s.foes) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(19)
  }
})
it('un dușman fără viață e scos și numărat', () => {
  const s = quietGame(); heroAt(s, 100, 100); const f = addFoe(s, 550, 400)
  hurtFoe(s, f, 999); stepFor(s, 1 / 60)
  expect([s.foes.length, s.kills]).toEqual([0, 1])
  expect(s.fx.some((x) => x.kind === 'puff')).toBe(true)
})
it('partida se termină când cade castelul', () => {
  const s = quietGame(); heroAt(s, 100, 100); s.castle.hp = 3; addFoe(s, 550, 686)
  stepFor(s, 2); expect([s.mode, s.castle.hp]).toEqual(['over', 0])
  const t = s.tick; stepFor(s, 1); expect(s.tick).toBe(t)
})
it('starea trece prin JSON și continuă identic', () => {
  const a = idle(3, 40); const b: GameState = JSON.parse(JSON.stringify(a))
  stepFor(a, 30); stepFor(b, 30)
  expect(b).toEqual(a)
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/sim/foes.test.ts`
Expected: FAIL, `foes.ts` nu există.

- [ ] **Step 3: Scrie `src/sim/foes.ts`**

- **Apariția.** `spawnT` scade cu `DT`; cât e `<= EPS`, apare un dușman și se adaugă `spawnEvery(s.t)`. `spawnFoe` crește `spawnN`, apoi ia locul din `createRng(s.seed, 'aparitie-' + s.spawnN)`: un punct uniform pe perimetru (`u = next() * 2 * (w + h)`, desfăcut pe laturile sus, dreapta, jos, stânga). Nu există stare ascunsă de hazard, deci nu e nimic de salvat în plus.
- **Mersul.** Ținta e eroul dacă e viu și la mai puțin de 90 de unități, altfel castelul. Dușmanul se oprește la `castle.r + f.r + 1` de centrul castelului, sau la `f.r + hero.r + 2` de erou. Oprit, `atkT` scade; la `<= EPS` lovește și se reîncarcă cu 1 s (castel) sau 0,8 s (erou). `atkT` pornește de la 0,4. Lovitura în castel pune `castle.hitT = s.t`.
- **Împinsul.** `kx, ky` se adaugă la poziție și se sting cu `exp(-pushDamping * DT)` pe pas.
- **Despărțirea.** Perechile care se suprapun sunt împinse egal în părți opuse; doi dușmani în același punct sunt despărțiți pe axa x. La urmă, cine a ajuns în castel e scos pe normală.
- **Scoaterea.** Cei cu `hp <= 0` nu mai acționează în pasul curent; la sfârșitul lui sunt scoși, `kills` crește și apare un `Fx` de fel `'puff'`.

- [ ] **Step 4: Rulează testele și poarta**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit și push**

```bash
git add src/sim/foes.ts src/sim/foes.test.ts src/sim/step.ts src/sim/testkit.ts DEVLOG.md
git commit -m "Dușmanii și sfârșitul partidei"
git push
```

---

### Task 5: Lupta: turnuri, săgeți, lovitura eroului

**Files:**
- Create: `src/sim/combat.ts`
- Modify: `src/sim/step.ts`
- Test: `src/sim/combat.test.ts`, `src/sim/run.test.ts`

**Interfaces:**
- Consumes: `heroDamage` (Task 2), `hurtFoe`, `addFoe` (Task 4), `towerDamage` (Task 1).
- Produces: `export function updateCombat(s: GameState): void` în `src/sim/combat.ts`: lovitura eroului, tragerea turnurilor, zborul săgeților.

Ordinea finală din `step`: `tick` și `t`, `updateHero`, `updatePads`, `updateCombat`, `updateFoes`, creșterea la loc a nodurilor, curățarea `fx`, sfârșitul partidei.

- [ ] **Step 1: Scrie testele care pică**

```ts
// src/sim/combat.test.ts
const tower = (s: GameState, lvl = 1) => { const p = padOf(s, 'tower'); p.lvl = lvl; return p }
const dummy = (s: GameState, x: number, y: number) => addFoe(s, x, y, { hp: 1000, maxHp: 1000, speed: 0, dmg: 0 })
it('turnul trage la 0,8 s, cu 6 pe săgeată', () => {
  const s = quietGame(); heroAt(s, 100, 100); const p = tower(s); const f = dummy(s, p.bx + 100, p.by)
  stepFor(s, 1 / 60); expect(s.shots).toHaveLength(1)
  stepFor(s, 4.5); expect(f.hp).toBe(1000 - 6 * 6)
})
it('nivelul 3 lovește cu 16; la 191 de unități nu trage', () => {
  const s = quietGame(); heroAt(s, 100, 100); const p = tower(s, 3); const f = dummy(s, p.bx + 100, p.by)
  stepFor(s, 0.5); expect(f.hp).toBe(984)
  const far = quietGame(); heroAt(far, 100, 100); const q = tower(far); dummy(far, q.bx - 191, q.by)
  stepFor(far, 2); expect(far.shots).toEqual([])
})
it('alege cel mai apropiat dușman, iar săgeata rămasă fără țintă dispare', () => {
  const s = quietGame(); heroAt(s, 100, 100); const p = tower(s)
  const near = dummy(s, p.bx + 50, p.by); const other = dummy(s, p.bx + 120, p.by)
  stepFor(s, 1 / 60); expect(s.shots[0]!.targetId).toBe(near.id)
  near.hp = 0; stepFor(s, 1.2)             // a doua săgeată pleacă la 0,8 s, spre celălalt
  expect(s.shots.every((x) => x.targetId !== near.id)).toBe(true)
  expect(other.hp).toBe(1000 - 6)        // prima săgeată, rămasă fără țintă, nu l-a atins
})
it('eroul lovește singur la 0,45 s și împinge', () => {
  const s = quietGame(); heroAt(s, 300, 300); const f = dummy(s, 340, 300)
  stepFor(s, 1 / 60); expect(f.hp).toBe(990)
  stepFor(s, 0.1); expect(f.x).toBeGreaterThan(341)
  stepFor(s, 0.4); expect(f.hp).toBe(980)
})
it('lovește doar în arcul din jurul celui mai apropiat', () => {
  const s = quietGame(); heroAt(s, 300, 300)
  const front = dummy(s, 340, 300); const side = dummy(s, 335, 320); const back = dummy(s, 255, 300)
  stepFor(s, 1 / 60)
  expect([front.hp, side.hp, back.hp]).toEqual([990, 990, 1000])
})
it('dincolo de raza loviturii nu lovește; doborât, nu lovește', () => {
  const s = quietGame(); heroAt(s, 300, 300); const f = dummy(s, 300 + 58 + 10 + 1, 300)
  stepFor(s, 1); expect(f.hp).toBe(1000)
  const d = quietGame(); heroAt(d, 300, 300); const g = dummy(d, 340, 300); hurtHero(d, 999)
  stepFor(d, 1); expect(g.hp).toBe(1000)
})

// src/sim/run.test.ts — proprietăți ale partidei întregi
it('fără niciun gest, castelul cade între 60 și 130 s', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const s = createGame(seed)
    while (s.mode === 'playing' && s.t < 200) step(s, { x: 0, y: 0 })
    expect(s.t).toBeGreaterThan(60); expect(s.t).toBeLessThan(130)
  }
})
it('aceeași sămânță cu aceleași comenzi dă aceeași stare', () => {
  const play = () => {
    const s = createGame(11); const r = createRng(99, 'comenzi-test'); let dir = { x: 0, y: 0 }
    for (let i = 0; i < 7200 && s.mode === 'playing'; i++) {
      if (i % 120 === 0) { const a = r.next() * Math.PI * 2; dir = { x: Math.cos(a), y: Math.sin(a) } }
      step(s, dir)
    }
    return JSON.stringify(s)
  }
  expect(play()).toBe(play())
})
it('un pas cu 150 de dușmani durează în medie sub 1 ms', () => {
  const s = quietGame(); s.tick = 200 * 60; s.t = 200
  for (let i = 0; i < 150; i++) spawnFoe(s)
  s.castle.hp = 1e9
  const t0 = performance.now(); for (let i = 0; i < 600; i++) step(s, { x: 1, y: 0 })
  expect((performance.now() - t0) / 600).toBeLessThan(1)
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/sim/combat.test.ts src/sim/run.test.ts`
Expected: FAIL, `combat.ts` nu există.

- [ ] **Step 3: Scrie `src/sim/combat.ts`**

- **Lovitura eroului.** `swingT` scade la fiecare pas. La `<= EPS`, dacă există un dușman cu marginea la cel mult `reach`, eroul lovește toți dușmanii aflați în `reach` și la cel mult `arc` radiani de direcția celui mai apropiat. Fiecare primește `heroDamage` și un impuls de 140 (60 pentru cei grei) dinspre erou. Apoi `swingT = swingEvery`, `slashT = s.t`, `slashA` și `face` iau unghiul loviturii. Fără țintă, `swingT` rămâne la 0 și eroul lovește în pasul în care apare una.
- **Turnurile.** Pentru fiecare cerc de turn cu `lvl > 0`: `cool` scade; la `<= EPS` trage în cel mai apropiat dușman viu aflat la mai puțin de `range` de clădire (`bx, by`) și `cool = every`. Fără țintă, `cool = 0`.
- **Săgețile.** Zboară cu `shotSpeed` spre poziția curentă a țintei, căutată după `targetId`. Dacă ținta nu mai există sau nu mai are viață, `targetId = -1` și săgeata merge la ultimul punct știut, unde dispare. La mai puțin de un pas plus 6 unități de țintă, lovește prin `hurtFoe` și dispare.

- [ ] **Step 4: Rulează testele și poarta**

Run: `npm run check`
Expected: PASS. Dacă testul „între 60 și 130 s” pică, e o greșeală de portare (unități, ordine), nu un motiv de schimbat cifrele: compară cu `docs/prototip.html`, unde aceeași partidă a durat 94 s.

- [ ] **Step 5: Commit și push**

```bash
git add src/sim/combat.ts src/sim/combat.test.ts src/sim/run.test.ts src/sim/step.ts DEVLOG.md
git commit -m "Lupta: turnuri, săgeți, lovitura eroului"
git push
```

---

### Task 6: Bucla și comenzile

**Files:**
- Create: `src/app/loop.ts`, `src/input/joystick.ts`, `src/input/bind.ts`
- Test: `src/app/loop.test.ts`, `src/input/joystick.test.ts`

**Interfaces:**
- Consumes: `DT`, `Input` din Task 1.
- Produces:

```ts
// src/app/loop.ts
export const MAX_STEPS = 5
export function advance(acc: number, frameDt: number): { steps: number; acc: number }
// src/input/joystick.ts
export const STICK_R = 48
export interface Stick { on: boolean; id: number; bx: number; by: number; x: number; y: number }
export function newStick(): Stick
export function stickDown(j: Stick, id: number, x: number, y: number): void
export function stickMove(j: Stick, id: number, x: number, y: number): void
export function stickUp(j: Stick, id: number): void
export function stickVector(j: Stick): Input
export function keysVector(down: ReadonlySet<string>): Input      // coduri: KeyW/A/S/D și ArrowUp/Left/Down/Right
// src/input/bind.ts
export function bindInput(canvas: HTMLCanvasElement, enabled: () => boolean): { stick: Stick; read(): Input; release(): void }
```

- [ ] **Step 1: Scrie testele care pică**

```ts
// src/app/loop.test.ts
it('un cadru de 1/60 s dă un pas; restul rămâne în acumulator', () => {
  expect(advance(0, 1 / 60).steps).toBe(1)
  const a = advance(0, 0.008); expect(a).toEqual({ steps: 0, acc: 0.008 })
  expect(advance(a.acc, 0.009).steps).toBe(1)
})
it('cel mult 5 pași pe cadru, iar restul se aruncă: și după o secundă, și după zece minute', () => {
  expect(advance(0, 1)).toEqual({ steps: 5, acc: 0 })
  expect(advance(0, 600)).toEqual({ steps: 5, acc: 0 })
  expect(advance(0, -1)).toEqual({ steps: 0, acc: 0 })
})
it('zece secunde înseamnă 600 de pași la orice număr de cadre', () => {
  for (const fps of [30, 60, 90, 120, 144]) {
    let acc = 0, steps = 0
    for (let i = 0; i < fps * 10; i++) { const r = advance(acc, 1 / fps); acc = r.acc; steps += r.steps }
    expect(Math.abs(steps - 600)).toBeLessThanOrEqual(1)
  }
})

// src/input/joystick.test.ts
const drag = (dx: number, dy = 0) => { const j = newStick(); stickDown(j, 1, 100, 100); stickMove(j, 1, 100 + dx, 100 + dy); return j }
it('sub 14% din cursă eroul stă; la 70% are viteza maximă', () => {
  expect(stickVector(drag(6))).toEqual({ x: 0, y: 0 })
  expect(stickVector(drag(16.8)).x).toBeCloseTo(0.5, 6)
  expect(stickVector(drag(33.6)).x).toBeCloseTo(1, 6)
  const v = stickVector(drag(30, 40)); expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 6); expect(v.y / v.x).toBeCloseTo(4 / 3, 6)
})
it('baza urmează degetul la o tragere lungă', () => {
  const j = drag(80); expect([j.bx, j.by]).toEqual([132, 100]); expect(stickVector(j)).toEqual({ x: 1, y: 0 })
})
it('al doilea deget nu fură și nu oprește joystickul', () => {
  const j = drag(40)
  stickDown(j, 2, 300, 300); stickMove(j, 2, 0, 0); stickUp(j, 2)
  expect([j.on, j.id]).toEqual([true, 1]); expect(stickVector(j).x).toBeCloseTo(1, 6)
  stickUp(j, 1); expect(stickVector(j)).toEqual({ x: 0, y: 0 })
})
it('tastele dau o direcție de lungime cel mult 1', () => {
  expect(keysVector(new Set(['KeyD']))).toEqual({ x: 1, y: 0 })
  const v = keysVector(new Set(['KeyW', 'ArrowRight'])); expect(v.x).toBeCloseTo(Math.SQRT1_2, 9); expect(v.y).toBeCloseTo(-Math.SQRT1_2, 9)
  expect(keysVector(new Set(['KeyA', 'KeyD']))).toEqual({ x: 0, y: 0 })
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/app src/input`
Expected: FAIL, modulele nu există.

- [ ] **Step 3: Scrie `loop.ts`, `joystick.ts` și `bind.ts`**

`advance` adună `max(0, frameDt)` la acumulator, scoate pași de `DT` cât se poate, iar dacă ar ieși mai mult de `MAX_STEPS` întoarce `{ steps: 5, acc: 0 }`. `bind.ts` leagă evenimentele de pointer ale canvasului (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, cu `setPointerCapture`) de funcțiile `stick…`, ține tastele apăsate într-un `Set`, blochează meniul contextual și întoarce din `read()` vectorul joystickului dacă e activ, altfel pe al tastelor. `pointerdown` e ignorat cât `enabled()` e fals. `release()` oprește joystickul și golește tastele; `bind.ts` îl cheamă singur la `blur` și la `visibilitychange`.

- [ ] **Step 4: Rulează testele și poarta**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit și push**

```bash
git add src/app src/input DEVLOG.md
git commit -m "Bucla cu pas fix și comenzile"
git push
```

---

### Task 7: Pagina și desenatul

**Files:**
- Create: `src/ui/ui.css`, `src/ui/strings.ts`, `src/render/palette.ts`, `src/render/camera.ts`, `src/render/ground.ts`, `src/render/world.ts`, `src/render/overlay.ts`, `src/render/canvas.ts`, `scripts/smoke.cjs`
- Replace: `index.html`, `src/main.ts`
- Modify: `package.json` (devDependencies de fonturi; scriptul `smoke`), `vite.config.ts` (`base: './'`), `.gitignore` (`smoke-out/`)
- Test: `src/render/camera.test.ts`

**Interfaces:**
- Consumes: `GameState` și restul din Task 1; `nextCost`, `levelOf` (Task 3); `heroMaxHp` (Task 2); `Stick`, `STICK_R` (Task 6).
- Produces:

```ts
// src/render/camera.ts
export interface View { w: number; h: number; scale: number; dpr: number; hudBottom: number }
export interface Cam { x: number; y: number }
export function viewScale(w: number, h: number): number
export function followCamera(cam: Cam, s: GameState, view: View, frameDt: number): void
// src/render/canvas.ts
export function createRenderer(canvas: HTMLCanvasElement): {
  resize(hudBottom: number): void
  frame(s: GameState, input: Input, stick: Stick | null, frameDt: number): void
}
// src/ui/strings.ts
export const STR: { … }      // toate textele; vezi Step 3
```

- [ ] **Step 1: Scrie testele care pică**

```ts
// src/render/camera.test.ts
const view = (w: number, h: number): View => ({ w, h, scale: viewScale(w, h), dpr: 1, hudBottom: 0 })
it('scara din spec, finită și pozitivă la orice mărime', () => {
  expect(viewScale(390, 780)).toBeCloseTo(780 / 880, 9)
  expect(viewScale(1400, 800)).toBeCloseTo(1400 / 1100, 9)
  for (const [w, h] of [[0, 0], [0, 780], [390, 0], [NaN, NaN]] as const) {
    expect(viewScale(w, h)).toBeGreaterThan(0); expect(Number.isFinite(viewScale(w, h))).toBe(true)
  }
})
it('camera urmărește eroul, ținut puțin deasupra mijlocului, și nu iese din hartă', () => {
  const s = quietGame(); const cam = { x: 0, y: 0 }; const v = view(390, 780)
  heroAt(s, 550, 750); for (let i = 0; i < 300; i++) followCamera(cam, s, v, 1 / 60)
  expect(cam.x).toBeCloseTo(550, 0); expect(cam.y).toBeCloseTo(800, 0)
  heroAt(s, 20, 20); for (let i = 0; i < 300; i++) followCamera(cam, s, v, 1 / 60)
  expect(cam.x).toBeCloseTo(v.w / v.scale / 2 - 30, 0); expect(cam.y).toBeCloseTo(v.h / v.scale / 2 - 30, 0)
})
it('pe un ecran lat, unde harta încape toată pe lățime, camera rămâne lângă mijlocul ei', () => {
  const s = quietGame(); const cam = { x: 0, y: 0 }; const v = view(1400, 800); heroAt(s, 100, 750)
  for (let i = 0; i < 300; i++) followCamera(cam, s, v, 1 / 60)
  expect(cam.x).toBeGreaterThanOrEqual(519.9); expect(cam.x).toBeLessThanOrEqual(580.1)
  expect(cam.y).toBeCloseTo(800, 0)
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/render`
Expected: FAIL, `camera.ts` nu există.

- [ ] **Step 3: Pagina, textele, fonturile**

- `index.html` și `src/ui/ui.css`: structura și stilurile din `docs/prototip.html` (scena, canvasul, banda de sus, indiciul, cartonașele de start și de final, toate culorile ca variabile CSS pe `:root`). Elementele cu text sunt goale în HTML și se umplu din `STR`. Cartonașul de start nu mai are eticheta „Prototip de încercat”.
- `src/ui/strings.ts`: titlul „World Guard”; numele cercurilor (Turn, Tăietori, Carieră, Erou, Repară castelul); „{nume} nivel {n}”, „{nume} · nivel maxim”, „1 = +{n} viață”, „Eroul a căzut”; etichetele benzii (lemn, piatră, Castel); indiciul; cele patru rânduri de reguli, „Începe” și „Test de viteză” de pe cartonașul de start; textele cartonașului de final. Formulările sunt cele din prototip.
- Fonturile: `npm i -D @fontsource/alfa-slab-one @fontsource/rubik`, importate în `src/main.ts`: Alfa Slab One 400; Rubik 400, 500, 700; subseturile latin și latin-ext. Niciun `<link>` spre alt site.

- [ ] **Step 4: Desenatul**

Portează din `docs/prototip.html` funcțiile `makeGround`, `drawNode`, `drawCastle`, `drawBuilding`, `glyph`, `chipLine`, `drawPad`, `drawFoe`, `drawHero` și `render`, cu aceleași forme, culori, mărimi și aceeași ordine de desenare (sortare după `y`). Împărțirea:

| Fișier | Ce ține |
|---|---|
| `palette.ts` | citește o dată variabilele CSS de pe `:root`; `alpha(hex, a)` |
| `camera.ts` | `viewScale` (cu 1 ca valoare de rezervă), `followCamera` (ținta e eroul plus 50 în jos, sau `HOME` cât e doborât; netezire `1 - exp(-7 * frameDt)`; pe fiecare axă, centrul camerei rămâne între `vedere / 2 - 30` și `lume - vedere / 2 + 30`) |
| `ground.ts` | terenul, pictat o dată într-un canvas ascuns, cu `createRng(LAYOUT_SEED, 'iarba')` |
| `world.ts` | cercurile, nodurile, castelul, clădirile, dușmanii, eroul, săgețile, `fx` |
| `overlay.ts` | indicatorul spre castel și joystickul, în coordonate de ecran |
| `canvas.ts` | `createRenderer`: mărimea canvasului (`dpr` cel mult 2), camera, ordinea straturilor |

Diferențe față de prototip: textele vin din `STR`; `fx` are feluri, nu texte (`'gain'` arată „+1” în culoarea resursei, `'level'` arată numele și nivelul, `'heroDown'` arată textul lui, `'puff'` e inelul); joystickul se desenează din `Stick`; nu se folosește `Math.random()` nici aici.

`src/main.ts`, deocamdată: creează jocul, îl avansează fără comenzi prin `advance` și `step`, desenează fiecare cadru. Cartonașele rămân ascunse.

- [ ] **Step 5: Scrie `scripts/smoke.cjs`**

Scriptul pornește `vite preview --port 4180 --strictPort` pe build-ul existent, deschide pagina în Chromium prin Playwright la 390 × 780 cu atingere, și verifică:

1. nicio eroare în consolă și nicio excepție în pagină;
2. nicio cerere de rețea în afara `localhost` (ascultă evenimentul `request`);
3. canvasul e desenat: o probă de 64 × 64 de pixeli din mijloc are cel puțin 20 de culori diferite.

Salvează `smoke-out/01-teren.png`, tipărește `SMOKE OK (3 verificări)` și iese cu 0; la prima verificare picată tipărește care și iese cu 1. Oprește serverul la final. În `package.json`: `"smoke": "vite build && node scripts/smoke.cjs"`. Scriptul nu face parte din `npm run check`, fiindcă are nevoie de un Playwright instalat pe mașină.

- [ ] **Step 6: Rulează testele, poarta și proba în browser**

Run: `npm run check && npm run smoke`
Expected: `SMOKE OK (3 verificări)`. Deschide `smoke-out/01-teren.png` și compară cu prototipul: castelul în mijloc, cele opt cercuri cu numele și costurile lor, copaci și stânci, eroul lângă castel.

- [ ] **Step 7: Commit și push**

```bash
git add index.html src/ui src/render src/main.ts scripts/smoke.cjs package.json package-lock.json vite.config.ts .gitignore DEVLOG.md
git commit -m "Pagina și desenatul pe Canvas 2D"
git push
```

---

### Task 8: Interfața și legarea

**Files:**
- Create: `src/ui/format.ts`, `src/ui/hud.ts`, `src/ui/cards.ts`, `src/app/storage.ts`, `src/app/flags.ts`
- Modify: `src/main.ts`, `scripts/smoke.cjs`
- Test: `src/ui/format.test.ts`, `src/app/storage.test.ts`, `src/app/flags.test.ts`

**Interfaces:**
- Consumes: tot ce e mai sus.
- Produces:

```ts
// src/ui/format.ts
export function clock(seconds: number): string                       // 272.9 → '4:32'
// src/app/storage.ts
export const RECORD_KEY = 'wg.v1.record'
type Store = Pick<Storage, 'getItem' | 'setItem'>
export function readRecord(store?: Store | null): number             // secunde; 0 dacă lipsește, e stricat sau aruncă
export function saveIfRecord(secs: number, store?: Store | null): { record: number; isNew: boolean }
// src/app/flags.ts
export function parseFlags(search: string): { seed: number | null; debug: boolean }
// src/ui/hud.ts
export function createHud(doc: Document): { sync(s: GameState, o: { hint: boolean; fps: number | null }): void; bottom(): number }
// src/ui/cards.ts
export function createCards(doc: Document, on: { start(): void; stress(): void; again(): void }): {
  showStart(): void; showOver(r: { secs: number; record: number; isNew: boolean; kills: number }): void; hide(): void
}
```

- [ ] **Step 1: Scrie testele care pică**

```ts
// src/ui/format.test.ts
it('ceasul', () => { expect([clock(0), clock(59.9), clock(60), clock(272.9), clock(3600)]).toEqual(['0:00', '0:59', '1:00', '4:32', '60:00']) })

// src/app/storage.test.ts
const mem = (init: Record<string, string> = {}) => { const m = { ...init }; return { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => { m[k] = v } } }
const broken = { getItem: () => { throw new Error('refuzat') }, setItem: () => { throw new Error('plin') } }
it('fără stocare, cu stocare care aruncă sau cu gunoi, recordul e 0 și jocul merge', () => {
  expect(readRecord(null)).toBe(0); expect(readRecord(broken)).toBe(0)
  for (const junk of ['', 'abc', '-5', 'NaN', '{}', '1e999']) expect(readRecord(mem({ [RECORD_KEY]: junk }))).toBe(0)
  expect(saveIfRecord(90, broken)).toEqual({ record: 90, isNew: true })
  expect(saveIfRecord(90, null)).toEqual({ record: 90, isNew: true })
})
it('ține doar recordul mai bun', () => {
  const s = mem()
  expect(saveIfRecord(120, s)).toEqual({ record: 120, isNew: true })
  expect(saveIfRecord(80, s)).toEqual({ record: 120, isNew: false })
  expect(readRecord(s)).toBe(120)
})

// src/app/flags.test.ts
it('semnele din adresă', () => {
  expect(parseFlags('')).toEqual({ seed: null, debug: false })
  expect(parseFlags('?seed=7&debug=1')).toEqual({ seed: 7, debug: true })
  expect(parseFlags('?seed=abc')).toEqual({ seed: null, debug: false })
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/ui src/app`
Expected: FAIL, modulele nu există.

- [ ] **Step 3: Scrie `format.ts`, `storage.ts`, `flags.ts`, `hud.ts`, `cards.ts`**

`hud.ts` și `cards.ts` leagă elementele din `index.html`, ca în prototip: banda arată lemnul, piatra, ceasul și viața castelului, se înroșește o secundă după o lovitură în castel, iar bara devine roșie sub 35%. DOM-ul se atinge doar când o valoare s-a schimbat. `fps`, când nu e `null`, apare lângă ceas ca „TEST · 58 fps”. Cartonașul de start are butonul „Începe” și, dedesubt, un buton discret „Test de viteză”.

- [ ] **Step 4: Leagă totul în `src/main.ts`**

- Aplicația are trei stări: `ready` (cartonașul de start peste terenul desenat), `playing`, `over`.
- Sămânța: `parseFlags(location.search).seed`, altfel `Date.now() >>> 0`. La „Încă o partidă”, o sămânță nouă.
- Pe cadru: `frameDt` din `requestAnimationFrame`; cât e `playing`, `advance` dă numărul de pași și fiecare pas primește `input.read()`. Apoi camera, desenatul și banda.
- Când `s.mode` devine `'over'`: `saveIfRecord(Math.floor(s.t))` și cartonașul de final.
- Indiciul se vede până la prima mișcare a eroului (`s.hero.moved`).
- **Testul de viteză.** Pornește o partidă în care, după fiecare cadru, dușmanii sunt completați la 150 cu `spawnFoe` și viața castelului e ținută la maxim. Banda arată numărul de cadre pe secundă, măsurat pe ferestre de o jumătate de secundă. Nu atinge recordul. Se iese reîncărcând pagina.
- Cu `?debug=1`, `window.__wg = { state: () => s, run(seconds) }`, unde `run` avansează partida fără comenzi. Fără semn, `__wg` nu există.

- [ ] **Step 5: Extinde `scripts/smoke.cjs`**

Pagina se deschide cu `?seed=7&debug=1`. Verificări noi, în ordine:

4. cartonașul de start se vede, cu titlul „World Guard”;
5. după „Începe”, o tragere cu degetul de la (200, 600) la (140, 600), ținută 500 ms, mută eroul cu peste 40 de unități la stânga (la dreapta e castelul), iar indiciul dispare;
6. după ridicarea degetului, eroul stă: `x` nu se mai schimbă în 300 ms;
7. `__wg.run(200)` duce partida la sfârșit: cartonașul de final arată „Castelul a căzut” și un timp între 1:00 și 2:10;
8. „Încă o partidă” pornește o partidă nouă, cu ceasul sub 0:02;
9. după reîncărcare și „Test de viteză”, starea are 150 de dușmani și banda arată „fps”.

Capturi: `02-start.png`, `03-joc.png`, `04-final.png`, `05-test.png`. La final: `SMOKE OK (9 verificări)`.

- [ ] **Step 6: Rulează testele, poarta și proba în browser**

Run: `npm run check && npm run smoke`
Expected: `SMOKE OK (9 verificări)`. Uită-te la cele cinci capturi: textele românești au diacriticele întregi, nimic nu iese din ecran la 390 de pixeli lățime.

- [ ] **Step 7: Commit și push**

```bash
git add src/ui src/app src/main.ts scripts/smoke.cjs DEVLOG.md
git commit -m "Interfața, recordul, testul de viteză și legarea jocului"
git push
```

---

### Task 9: Verificare automată, publicare, joc pe telefon

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `vite.single.config.ts`, `scripts/single-file.mjs`
- Modify: `package.json` (scriptul `single`), `.gitignore` (`dist-single/`), `README.md`, `CLAUDE.md`, `DEVLOG.md`

**Interfaces:**
- Consumes: build-ul din `npm run check`.
- Produces: `npm run single` scrie `dist-single/world-guard.html`, un singur fișier fără nicio referință în afara lui.

- [ ] **Step 1: Workflow-urile**

`ci.yml` rulează la `pull_request`: `actions/checkout`, `actions/setup-node` cu Node 22 și cache de npm, `npm ci`, `npm run check`.

`deploy.yml` rulează la `push` pe `main` și la `workflow_dispatch`, cu `permissions: { contents: read, pages: write, id-token: write }` și `concurrency: pages`. Un job `build` face aceiași pași și încarcă `dist` cu `actions/upload-pages-artifact`; un job `deploy`, în mediul `github-pages`, cheamă `actions/deploy-pages`.

Versiunile majore știute: `checkout@v4`, `setup-node@v4` (folosite azi în CncVectorStudio), `upload-pages-artifact@v3`, `deploy-pages@v4`. Înainte de commit, verifică pe paginile acțiunilor dacă există majore mai noi și folosește-le pe acelea.

- [ ] **Step 2: Varianta într-un singur fișier**

`vite.single.config.ts`: aceeași configurare, cu `build: { outDir: 'dist-single', assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false }`, ca fonturile să intre în CSS.

`scripts/single-file.mjs` citește `dist-single/index.html`, pune CSS-ul într-un `<style>` și JavaScript-ul într-un `<script type="module">` (cu `</script` din cod scris `<\/script`), apoi scrie `dist-single/world-guard.html` ca fragment: `<title>`, `<meta name="claude:viewport-fit-sides" content="cover">`, stilul, conținutul lui `<body>`, scriptul. Fără `<!doctype>`, `<html>`, `<head>`, `<body>`. Se oprește cu eroare dacă în rezultat a rămas vreun `src=` sau `href=` spre un fișier.

În `package.json`: `"single": "vite build --config vite.single.config.ts && node scripts/single-file.mjs"`.

- [ ] **Step 3: Verifică**

Run: `npm run check && npm run smoke && npm run single`
Expected: toate trec; `dist-single/world-guard.html` există și are sub 2 MB.

- [ ] **Step 4: Documentele**

`README.md`: comenzile (`dev`, `check`, `smoke`, `single`), cum se joacă, ce face „Test de viteză”, semnele `?seed=` și `?debug=1`. `CLAUDE.md`: secțiunea „Stare” spune ce există și că urmează planul 2 (pauză, instalare, reluare) și planul 3 (plasa pentru dificultate). `DEVLOG.md`: intrarea sesiunii se încheie cu ce s-a măsurat (timpul fără niciun gest pe cele cinci semințe, durata medie a unui pas cu 150 de dușmani, mărimea build-ului) și cu ce a rămas, ca linii de bifat.

- [ ] **Step 5: Commit și push**

```bash
git add .github vite.single.config.ts scripts/single-file.mjs package.json .gitignore README.md CLAUDE.md DEVLOG.md
git commit -m "Verificare la pull request, publicare pe Pages, variantă într-un singur fișier"
git push
```

- [ ] **Step 6: Jocul pe telefonul lui Andrei**

Sesiunea care orchestrează publică `dist-single/world-guard.html` ca pagină privată și îi dă lui Andrei linkul, cu trei lucruri de făcut pe Samsung A54:

1. să joace două-trei partide și să spună dacă se simte ca prototipul;
2. să pornească „Test de viteză”, să se plimbe un minut prin mulțime și să spună ce număr de cadre vede, cel mai mic și cel obișnuit;
3. să spună orice l-a încurcat.

Sub 60 de cadre pe secundă la testul de viteză înseamnă că planul 2 începe cu mutarea desenatului pe PixiJS. Pull request-ul rămâne draft până la răspunsul lui.
