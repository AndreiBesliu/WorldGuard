# World Guard, tema de spațiu. Plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jocul arată ca varianta „Orbită” (planetă, nave, cristale, asteroizi), iar codul folosește numele noi, fără nicio schimbare de reguli, de cifre sau de mișcare.

**Architecture:** Întâi se fixează, pe codul de azi, o partidă de probă cu cifre măsurate și timpul de desen. Apoi vine redenumirea, care trebuie să lase partida de probă neschimbată. Abia după aceea se schimbă ce se vede: tot ce ține de aspect trece într-un modul `src/render/orbit/`, în spatele interfeței `Skin`, iar `world.ts` păstrează ce e la fel în orice aspect.

**Tech Stack:** TypeScript 7, Vite 8, Vitest 5, Canvas 2D, fără dependențe de rulare. Fontul titlului vine din `@fontsource/exo-2`. Playwright (deja pe mașina de lucru) pentru proba din browser.

**Spec:** [`docs/superpowers/specs/2026-11-17-tema-spatiu-design.md`](../specs/2026-11-17-tema-spatiu-design.md), aprobat de Andrei pe 2026-11-18. Referința de aspect: [`docs/machete-tema-spatiu.html`](../../machete-tema-spatiu.html), varianta 1 (obiectul `ORBIT` și funcțiile lui ajutătoare). Unde macheta și specul diferă, câștigă specul.

**De la ce pornește.** Ramura `ccr-a5a7e643-gpwbh0`, commit `62f8080`: codul fazei 1 de pe `main` (`c2bfc36`) plus documente. 79 de teste în 15 fișiere, `npm run smoke` cu 9 verificări. Măsurat la planificare, pe 2026-11-18:

- partida de probă din Task 1 trece pe codul de azi cu cifrele scrise acolo;
- timpul de desen cu 150 de dușmani a ieșit 5,42 și 5,63 ms pe cadru în două rulări;
- `@fontsource/exo-2` 5.3.0 are `latin-800.css` și `latin-ext-800.css`, literele românești și cifre de lățime egală sub `font-variant-numeric: tabular-nums`.

## Global Constraints

- Nicio schimbare de reguli, de cifre sau de așezare a hărții. Orice diferență de comportament față de azi e o greșeală.
- Fluxurile de numere aleatoare ale simulării își păstrează numele: `'harta'` și `'aparitie-N'`.
- Cheia recordului rămâne `wg.v1.record`.
- `src/sim/` rămâne fără DOM, fără `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`. Cifrele de joc stau doar în `src/data/`. Textele stau doar în `src/ui/strings.ts`. Desenul doar citește starea.
- Ce se desenează de multe ori pe cadru (nave, raze, resurse, clădiri) e din forme pline și linii: fără gradient, fără decupaj, fără umbră estompată. Planeta are voie cu gradient și decupaj. Cerul se pictează o singură dată.
- Mișcările care apar doar în desen se calculează din `s.t` și din stare. Nu scriu în stare și nu au memorie proprie.
- Nicio dependență de rulare în `package.json`. Niciun apel de rețea în joc.
- Aspectul nu copiază alt joc. Singura referință e pagina noastră cu machete.
- Nu se construiesc: aspectul „Colonie”, un comutator între aspecte, misiunile, iconița aplicației, sunetul.
- Stilul codului, ca în `src/sim/rng.ts`: fără `;`, ghilimele simple, 2 spații, identificatori în engleză, comentarii în română.
- Înainte de fiecare commit: `npm run check` verde. Fiecare task adaugă rânduri la intrarea sesiunii din `DEVLOG.md`. Fișierele se stagează explicit, niciodată `git add -A`.
- Commit-urile merg pe ramura `ccr-a5a7e643-gpwbh0` și se încheie cu cele două rânduri de atribuire ale sesiunii. Împinsul pe GitHub îl face cel care conduce execuția.

## Review Focus

1. **Planeta atacată din toate părțile.** Cu zeci de nave lipite de ea, inelul de viață rămâne vizibil, peste nave. Test de ordine a straturilor în Task 3, plus captura `05-test.png`.
2. **Viață zero, sub prag sau peste maxim.** Inelul e gol la zero, întreg la plin și nu desenează nimic ciudat între ele. Test `shieldSpan` în Task 3.
3. **Turelă fără nicio navă în bătaie, sau cu o navă doborâtă mai aproape decât una vie.** Țeava arată în afară, respectiv spre nava vie. Teste `turretAim` în Task 3.
4. **Resursă golită.** Ciotul crește la loc de la nimic la întreg, fără salturi, și o resursă plină nu arată a ciot. Test `regrown` în Task 3.
5. **Literele românești și cifrele în fontul nou.** „Planetă”, „Turelă”, „Mină” se desenează în Exo 2, nu într-un font de rezervă, iar ceasul nu tremură. Verificarea 4 din proba din browser, în Task 4.

---

### Task 1: Plasa de dinainte

Pe codul de azi, fără nicio redenumire: partida de probă cu cifrele ei și măsurătoarea timpului de desen.

**Files:**
- Create: `src/sim/golden.test.ts`
- Modify: `src/main.ts`, `scripts/smoke.cjs`, `DEVLOG.md`

**Interfaces:**
- Consumes: `createGame`, `step`, `hurtHero`, `padOf` (existente).
- Produces:

```ts
// src/main.ts, doar cu ?debug=1
window.__wg.drawMs(frames: number): number   // media, în ms pe cadru, a `frames` cadre desenate unul după altul din starea de acum
```

După fiecare cadru, `drawMs` citește un pixel din canvas, ca desenul să fie dus la capăt înainte de cadrul următor.

`npm run smoke` tipărește în plus, după verificarea 9, rândul `SMOKE INFO: desen cu 150 de dușmani: <x.xx> ms pe cadru`. E informativ, nu o verificare, și nu schimbă numărul de verificări.

- [ ] **Step 1: Scrie partida de probă**

Creează `src/sim/golden.test.ts` cu exact acest conținut. Turul și cifrele au fost rulate la planificare pe codul de azi.

```ts
// SCHELĂ pentru tema de spațiu: aceeași partidă, înainte și după redenumire. Se șterge la sfârșitul lucrării.
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { createGame, type GameState, type Input, type PadKind, type Res } from './state'
import { hurtHero } from './hero'
import { step } from './step'
import { padOf } from './testkit'

const STILL: Input = { x: 0, y: 0 }
const MARK_EVERY = 1200          // pași: un semn la fiecare 20 s de joc
const r6 = (v: number): number => Math.round(v * 1e6) / 1e6

interface Tour { s: GameState; marks: number[][]; seen: { shot: boolean; down: boolean; brute: boolean; gathered: number; repaired: boolean } }

/** Cifrele unui moment al partidei, în ordine fixă și fără niciun nume al temei. */
function mark(s: GameState): number[] {
  const h = s.hero
  return [
    s.tick, s.castle.hp, s.wood, s.stone, s.kills,
    h.x, h.y, h.hp, h.lvl, h.dead ? 1 : 0,
    ...s.pads.map((p) => p.lvl),
    s.foes.length, s.foes.reduce((a, f) => a + f.hp, 0), s.foes.reduce((a, f) => a + f.x + f.y, 0),
    s.shots.length, s.spawnN, s.nextId, s.nodes.reduce((a, n) => a + n.left, 0),
  ].map(r6)
}

function tick(t: Tour, input: Input): void {
  step(t.s, input)
  if (t.s.shots.length > 0) t.seen.shot = true
  if (t.s.hero.dead) t.seen.down = true
  if (t.s.foes.some((f) => f.brute)) t.seen.brute = true
  if (t.s.tick % MARK_EVERY === 0) t.marks.push(mark(t.s))
}

/** Merge spre (x, y) până ajunge la sub `near` px sau trec `max` secunde. */
function go(t: Tour, x: number, y: number, near = 3, max = 15): void {
  for (let i = 0; i < max * 60; i++) {
    const dx = x - t.s.hero.x, dy = y - t.s.hero.y, d = Math.hypot(dx, dy)
    if (d < near) return
    tick(t, { x: dx / d, y: dy / d })
  }
}

function stay(t: Tour, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) tick(t, STILL)
}

function stayUntil(t: Tour, done: () => boolean, max: number): void {
  for (let i = 0; i < max * 60 && !done(); i++) tick(t, STILL)
}

/** Stă pe al i-lea cerc de felul dat până ajunge la nivelul cerut. */
function build(t: Tour, kind: PadKind, i: number, lvl: number): void {
  const p = padOf(t.s, kind, i)
  go(t, p.x, p.y)
  stayUntil(t, () => (kind === 'hero' ? t.s.hero.lvl : p.lvl) >= lvl, 15)
}

/** Merge la cea mai apropiată resursă plină de felul dat și strânge două secunde. */
function gather(t: Tour, type: Res): void {
  const h = t.s.hero
  const n = t.s.nodes.filter((q) => q.type === type && q.left > 0)
    .sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0]!
  go(t, n.x, n.y, BALANCE.node[type].r + BALANCE.hero.r + 4)
  stay(t, 2)
  if (n.left < BALANCE.node[type].amount) t.seen.gathered += 1
}

function tour(): Tour {
  const t: Tour = { s: createGame(7), marks: [], seen: { shot: false, down: false, brute: false, gathered: 0, repaired: false } }
  const s = t.s
  s.wood = 600; s.stone = 600
  stay(t, 40)                                    // fără apărare, primii dușmani ajung la castel și îl lovesc
  for (let i = 0; i < 4; i++) build(t, 'tower', i, 2)
  build(t, 'camp', 0, 1)
  build(t, 'quarry', 0, 1)
  build(t, 'hero', 0, 2)
  gather(t, 'wood')
  gather(t, 'stone')
  go(t, 470, 800)
  stayUntil(t, () => s.t >= 130, 200)
  hurtHero(s, 1e9)                               // doborât pe loc, ca să treacă și prin reapariție
  stayUntil(t, () => !s.hero.dead, 10)
  const repair = padOf(s, 'repair'), hurt = s.castle.hp
  go(t, repair.x, repair.y)
  stay(t, 2)
  t.seen.repaired = s.castle.hp > hurt
  stayUntil(t, () => s.t >= 200, 200)
  return t
}

// Măsurate pe 2026-11-18 pe codul dinaintea redenumirii (commit 62f8080, regulile de pe main c2bfc36).
// Rândurile nu se ating: după redenumire trebuie să iasă aceleași cifre.
const MARKS: number[][] = [
  [1200, 400, 600, 600, 0, 464, 756, 60, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 49.580417, 4129.328906, 0, 3, 3, 400],
  [2400, 385, 600, 600, 3, 464, 756, 60, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 96.824583, 5673.647233, 0, 8, 8, 400],
  [3600, 343, 392, 540, 11, 674.162962, 918.99608, 60, 1, 0, 2, 2, 2, 1, 0, 0, 0, 0, 3, 59.764167, 2776.039751, 0, 14, 14, 400],
  [4800, 343, 313, 539, 19, 470.213976, 797.454804, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 2, 54.839167, 2430.225618, 0, 21, 21, 387],
  [6000, 343, 325, 548, 26, 470.213976, 797.454804, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 3, 92.376667, 4728.506866, 0, 29, 29, 395],
  [7200, 343, 338, 556, 34, 470.213976, 797.454804, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 4, 136.925833, 4547.5139, 0, 38, 38, 395],
  [8400, 400, 350, 552, 43, 549.389203, 849.332385, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 5, 296.744583, 8492.211044, 0, 48, 48, 395],
  [9600, 400, 363, 559, 51, 549.389203, 849.332385, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 7, 375.5375, 9340.04661, 1, 58, 58, 395],
  [10800, 400, 375, 567, 63, 549.389203, 849.332385, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 7, 566.173333, 8721.949231, 1, 70, 70, 395],
  [12000, 400, 388, 571, 73, 549.389203, 849.332385, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 9, 640.235833, 12752.549271, 1, 82, 82, 395],
]

describe('aceeași partidă, înainte și după redenumire', () => {
  it('turul trece prin tot ce au regulile', () => {
    const { s, seen } = tour()
    for (let i = 0; i < 4; i++) expect(padOf(s, 'tower', i).lvl).toBe(2)
    expect(padOf(s, 'camp').lvl).toBe(1)
    expect(padOf(s, 'quarry').lvl).toBe(1)
    expect(s.hero.lvl).toBe(2)
    expect(seen).toEqual({ shot: true, down: true, brute: true, gathered: 2, repaired: true })
    expect(s.hero.slashT).toBeGreaterThan(0)
    expect(s.kills).toBeGreaterThan(20)
    expect(s.mode).toBe('playing')
  })
  it('cifrele partidei sunt cele măsurate înainte de redenumire', () => {
    expect(tour().marks).toEqual(MARKS)
  })
})
```

- [ ] **Step 2: Rulează-o pe codul de azi**

Run: `npx vitest run src/sim/golden.test.ts`
Expected: `Tests  2 passed (2)`.

Dacă un rând din `MARKS` nu se potrivește, oprește-te și raportează. Nu remăsura și nu modifica rândurile: ar însemna că regulile de sub tine nu sunt cele măsurate la planificare.

- [ ] **Step 3: Adaugă `drawMs` la `window.__wg`**

În `src/main.ts`, în blocul `if (flags.debug)` și în declarația `Window.__wg`. Fiecare cadru se desenează cu `renderer.frame(s, still, null, 0)`, urmat de `getImageData(0, 0, 1, 1)` pe contextul canvasului.

- [ ] **Step 4: Tipărește timpul de desen din proba din browser**

În `scripts/smoke.cjs`, imediat după verificarea 9 (testul de viteză e pornit și are 150 de dușmani):

```js
    const draws = []
    for (let i = 0; i < 5; i++) draws.push(await page.evaluate(() => window.__wg.drawMs(200)))
    draws.sort((a, b) => a - b)
    console.log(`SMOKE INFO: desen cu 150 de dușmani: ${draws[2].toFixed(2)} ms pe cadru`)
```

- [ ] **Step 5: Măsoară timpul de dinainte**

Run: `npm run smoke`, de trei ori.
Expected: de fiecare dată `SMOKE OK (9 verificări)` și un rând `SMOKE INFO`. Notează cele trei valori. Cea din mijloc e „timpul de desen dinainte”. Notează și mașina: ieșirea lui `uname -r`.

- [ ] **Step 6: Jurnal și commit**

Deschide în `DEVLOG.md` intrarea `## 18.11.2026 — Tema de spațiu` cu: ce s-a cerut (specul), cele trei valori de la Step 5 și mașina, faptul că partida de probă e schelă și se șterge în Task 5.

Run: `npm run check`
Expected: 81 de teste trecute, build reușit.

```bash
git add src/sim/golden.test.ts src/main.ts scripts/smoke.cjs DEVLOG.md
git commit -m "Tema de spațiu, pasul 1: partida de probă și timpul de desen, pe codul de azi"
```

---

### Task 2: Numele din cod

Redenumirea, fără să se schimbe nimic din ce se vede. După task jocul arată tot ca azi, dar codul vorbește cu numele noi.

**Files:**
- Modify: `src/sim/state.ts`, `src/sim/step.ts`, `src/sim/hero.ts`, `src/sim/pads.ts`, `src/sim/combat.ts`, `src/sim/foes.ts`, `src/sim/testkit.ts`, `src/data/balance.ts`, `src/data/layout.ts`, `src/main.ts`, `src/ui/strings.ts`, `src/ui/hud.ts`, `src/ui/ui.css` (doar numele de clase), `index.html`
- Modify, cât cere compilarea: `src/render/world.ts`, `src/render/overlay.ts`, `src/render/camera.ts`
- Test: `src/sim/golden.test.ts`, `src/sim/state.test.ts`, `src/sim/hero.test.ts`, `src/sim/pads.test.ts`, `src/sim/combat.test.ts`, `src/sim/foes.test.ts`, `src/sim/run.test.ts`, `src/data/balance.test.ts`, `src/render/camera.test.ts`

**Interfaces:**
- Consumes: partida de probă din Task 1.
- Produces (toate taskurile următoare folosesc numele acestea):

```ts
// src/sim/state.ts
export type Res = 'crystal' | 'metal'
export type BuildKind = 'turret' | 'collector' | 'mine' | 'hero'
export type PadKind = BuildKind | 'repair'
// Hero: swingT -> strikeT, slashT -> waveT, slashA -> waveA; câmpul `walk` dispare
// GameState: wood -> crystal, stone -> metal, castle -> core   (core: { hp: number; hitT: number })

// src/data/balance.ts
// BALANCE.castle -> BALANCE.core            BALANCE.start: { crystal: 20, metal: 0 }
// BALANCE.hero.swingEvery -> strikeEvery    BALANCE.node: { crystal: {...}, metal: {...}, reach }
// BALANCE.tower -> BALANCE.turret           BALANCE.camp -> BALANCE.collector     BALANCE.quarry -> BALANCE.mine
// BALANCE.foe.hitCastleEvery -> hitCoreEvery, BALANCE.foe.stopCastle -> stopCore
// CAMP_COST -> COLLECTOR_COST, QUARRY_COST -> MINE_COST
export function cost(kind: BuildKind, level: number): Record<Res, number>
export function turretDamage(level: number): number      // era towerDamage

// src/data/layout.ts
export const CORE = { x: 550, y: 750, r: 54 }             // era CASTLE
```

În pagină:

- `src/ui/strings.ts`: cheile `wood`, `stone`, `castle` devin `crystal`, `metal`, `core`; cheile lui `pad` urmează `PadKind`. Valorile rămân cele de azi până în Task 4.
- `index.html` și `src/ui/hud.ts`: id-urile `wood`, `stone`, `castleFill`, `castleHp` devin `crystal`, `metal`, `coreFill`, `coreHp`.
- `index.html` și `src/ui/ui.css`: clasele `chip-wood`, `chip-stone`, `castle` devin `chip-crystal`, `chip-metal`, `core`. Atributele `data-str` urmează cheile din `STR`.

Corespondența e una la una și păstrează ordinea: unde azi e `wood` vine `crystal`, unde e `stone` vine `metal`. În `src/sim/pads.ts`, `RES` rămâne în aceeași ordine (`['crystal', 'metal']`), iar alternarea la plată păstrează sensul: `p.flip ? 'metal' : 'crystal'`. Colectorul produce `crystal`, mina produce `metal`, reparatul consumă `metal`.

Funcțiile interne cu nume de sabie sau de turn se redenumesc și ele: `swing` devine `strike`, `fireTowers` devine `fireTurrets`.

- [ ] **Step 1: Redenumește tipurile și datele**

Schimbă `src/sim/state.ts`, `src/data/balance.ts` și `src/data/layout.ts` după blocul „Produces”. În `createGame` și în `layNodes` valorile rămân aceleași, doar numele se schimbă.

- [ ] **Step 2: Urmează erorile de tipuri până la zero**

Run: `npm run typecheck`
Expected la început: erori în fișierele din lista „Files”. Repară-le doar prin redenumire, fișier cu fișier, până când comanda nu mai tipărește nimic.

În `src/render/` se schimbă doar ce cere compilarea. Numele de funcții și comentariile de acolo rămân pentru Task 3.

- [ ] **Step 3: Scoate `walk`**

Câmpul dispare din `Hero`, din `createGame` și din `updateHero`. În `src/render/world.ts` dispare legănatul de mers (`bob`), care era singurul lui cititor. În `src/sim/hero.test.ts` dispare `walk: 0` din așteptare; `moved` rămâne.

- [ ] **Step 4: Adu comentariile și numele testelor pe cuvintele noi**

În `src/sim/`, `src/data/`, `src/main.ts` și în testele lor: nucleu sau planetă în loc de castel, turelă, colector, mină, cristale, metal, rază în loc de săgeată, undă în loc de lovitură cu sabia. „Erou”, „dușman” și „brută” pot rămâne.

- [ ] **Step 5: Redenumește în partida de probă, fără să atingi cifrele**

În `src/sim/golden.test.ts` se schimbă numele din `mark`, `tour` și din așteptări (`'turret'`, `'collector'`, `'mine'`, `s.crystal`, `s.metal`, `s.core`, `waveT`) și cuvintele din comentarii. Rândurile din `MARKS` rămân literă cu literă.

Run: `git diff -- src/sim/golden.test.ts | grep -cE '^[-+]  \['`
Expected: `0`.

- [ ] **Step 6: Verifică**

Run: `npm run check`
Expected: 81 de teste trecute, între ele cele două din `golden.test.ts`.

Run: `grep -rnEi "wood|stone|castle|tower|quarry|swing|slash|\bcamp|\bwalk" src/sim src/data src/app src/input src/ui/strings.ts src/ui/hud.ts src/ui/cards.ts src/main.ts index.html`
Expected: nicio linie.

Run: `grep -rnEi "castel|\bturn|lemn|piatr|pietr|copac|stânc|tăietor|carier|\bzid|\bsabi" src/sim src/data src/app src/input src/main.ts`
Expected: nicio linie.

Run: `npm run smoke`
Expected: `SMOKE OK (9 verificări)`. Jocul arată încă precum cel vechi.

- [ ] **Step 7: Jurnal și commit**

```bash
git add src/sim src/data src/main.ts src/ui/strings.ts src/ui/hud.ts src/ui/ui.css index.html src/render/world.ts src/render/overlay.ts src/render/camera.ts src/render/camera.test.ts DEVLOG.md
git commit -m "Tema de spațiu, pasul 2: numele din cod; partida de probă dă aceleași cifre"
```

Înainte de commit, `git status --short` trebuie să arate doar fișiere din lista de mai sus.

---

### Task 3: Aspectul „Orbită” pe canvas

**Files:**
- Create: `src/render/skin.ts`, `src/render/draw.ts`, `src/render/derive.ts`, `src/render/orbit/index.ts`, `src/render/orbit/scene.ts`, `src/render/orbit/things.ts`
- Modify: `src/render/world.ts`, `src/render/canvas.ts`, `src/render/overlay.ts`, `src/render/palette.ts`, `src/ui/ui.css` (blocul de culori din `:root` și regulile care le folosesc)
- Delete: `src/render/ground.ts`
- Test: `src/render/derive.test.ts`, `src/render/world.test.ts`, `src/render/discipline.test.ts`

**Interfaces:**
- Consumes: numele din Task 2.
- Produces:

```ts
// src/render/skin.ts
/** Un aspect al jocului: tot ce se desenează altfel de la o temă la alta. Citește starea, nu o scrie. */
export interface Skin {
  /** Fondul lumii, pictat o singură dată, la mărimea WORLD. */
  paintSky(): HTMLCanvasElement
  /** Nucleul fără inel: aura, corpul și satelitul. Se desenează sub toate obiectele. */
  core(ctx: CanvasRenderingContext2D, s: GameState): void
  /** Inelul de viață al nucleului. Se desenează peste nave. */
  shield(ctx: CanvasRenderingContext2D, s: GameState): void
  node(ctx: CanvasRenderingContext2D, s: GameState, n: ResNode): void
  building(ctx: CanvasRenderingContext2D, s: GameState, p: Pad): void
  foe(ctx: CanvasRenderingContext2D, s: GameState, f: Foe): void
  hero(ctx: CanvasRenderingContext2D, s: GameState, input: Input): void
  shot(ctx: CanvasRenderingContext2D, sh: Shot): void
  /** Semnul din mijlocul unui cerc de investit. */
  glyph(ctx: CanvasRenderingContext2D, kind: PadKind, x: number, y: number): void
  /** Jetonul unei resurse, într-un pătrat de 10 px cu mijlocul laturii stângi în (x, y). */
  chip(ctx: CanvasRenderingContext2D, res: Res, x: number, y: number): void
  /** Nucleul în mic, pentru indicatorul de la marginea ecranului; (x, y) e centrul. */
  coreIcon(ctx: CanvasRenderingContext2D, x: number, y: number, tone: string): void
}

// src/render/orbit/index.ts
export const ORBIT: Skin

// src/render/derive.ts — fără DOM
/** Unghiul țevii: spre cea mai apropiată navă vie aflată mai aproape decât bătaia turelei; fără țintă, dinspre nucleu în afară. */
export function turretAim(s: GameState, p: Pad): number
/** Cât din inel e aprins, în radiani: 0 la viață zero sau sub, 2π la viață plină sau peste. */
export function shieldSpan(hp: number, max: number): number
/** Cât a crescut la loc o resursă golită, de la 0 la 1; 1 pentru una care nu e golită. */
export function regrown(n: ResNode, t: number): number

// src/render/world.ts
export function drawWorld(ctx: CanvasRenderingContext2D, s: GameState, input: Input, v: Visible, skin: Skin): void
// src/render/overlay.ts
export function drawOverlay(ctx: CanvasRenderingContext2D, s: GameState, cam: Cam, view: View, stick: Stick | null, skin: Skin): void
```

`src/render/draw.ts` ține primitivele folosite și de `world.ts`, și de aspect: `disc`, `poly`, `seg`, `rr`. `src/render/canvas.ts` e singurul loc care numește aspectul (`import { ORBIT } from './orbit'`) și îl dă mai departe.

- [ ] **Step 1: Scrie testele pentru ce citește desenul din stare**

`src/render/derive.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../data/balance'
import { CORE } from '../data/layout'
import { addFoe, addNode, padOf, quietGame } from '../sim/testkit'
import { regrown, shieldSpan, turretAim } from './derive'

describe('ce citește desenul din stare', () => {
  it('turela fără țintă arată dinspre nucleu în afară', () => {
    const s = quietGame(), p = padOf(s, 'turret', 0)
    expect(turretAim(s, p)).toBeCloseTo(Math.atan2(p.by - CORE.y, p.bx - CORE.x), 9)
  })
  it('turela arată spre cea mai apropiată navă vie din bătaie', () => {
    const s = quietGame(), p = padOf(s, 'turret', 0)
    addFoe(s, p.bx, p.by + 150)                       // vie, la 150
    addFoe(s, p.bx + 60, p.by, { hp: 0 })             // mai aproape, dar doborâtă
    addFoe(s, p.bx - 100, p.by)                       // vie, la 100: cea mai apropiată
    expect(turretAim(s, p)).toBeCloseTo(Math.PI, 9)
  })
  it('o navă aflată exact la marginea bătăii nu e țintă', () => {
    const s = quietGame(), p = padOf(s, 'turret', 0)
    addFoe(s, p.bx + BALANCE.turret.range, p.by)
    expect(turretAim(s, p)).toBeCloseTo(Math.atan2(p.by - CORE.y, p.bx - CORE.x), 9)
  })
  it('inelul: gol la viață zero sau sub, întreg la viață plină sau peste', () => {
    expect(shieldSpan(0, 400)).toBe(0)
    expect(shieldSpan(-5, 400)).toBe(0)
    expect(shieldSpan(400, 400)).toBeCloseTo(2 * Math.PI, 9)
    expect(shieldSpan(500, 400)).toBeCloseTo(2 * Math.PI, 9)
    expect(shieldSpan(100, 400)).toBeCloseTo(Math.PI / 2, 9)
  })
  it('resursa golită crește la loc de la 0 la 1', () => {
    const s = quietGame(), n = addNode(s, 'crystal', 300, 300), grow = BALANCE.node.crystal.regrow
    expect(regrown(n, 5)).toBe(1)                     // plină
    n.left = 0; n.regrowAt = 10 + grow
    expect(regrown(n, 10)).toBe(0)
    expect(regrown(n, 10 + grow / 2)).toBeCloseTo(0.5, 9)
    expect(regrown(n, 10 + grow + 3)).toBe(1)
  })
})
```

Run: `npx vitest run src/render/derive.test.ts`
Expected: FAIL, modulul `./derive` nu există.

- [ ] **Step 2: Scrie `src/render/derive.ts`**

`turretAim` alege ținta cu aceeași regulă ca `fireTurrets` din `src/sim/combat.ts`: viață peste `EPS`, distanța de la `(p.bx, p.by)` strict mai mică decât `BALANCE.turret.range`, cea mai apropiată.

Run: `npx vitest run src/render/derive.test.ts`
Expected: 5 teste trecute.

- [ ] **Step 3: Scrie testul pentru ordinea straturilor**

`src/render/world.test.ts`:

```ts
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { addFoe, addNode, padOf, quietGame } from '../sim/testkit'
import type { Skin } from './skin'
import { drawWorld } from './world'

beforeAll(() => {
  vi.stubGlobal('document', { documentElement: {} })
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#123456' }))
})

/** Un context care înghite orice apel; measureText dă o lățime fixă. */
function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({}, {
    get: (_t, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => undefined),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D
}

function recorder(): { skin: Skin; calls: string[] } {
  const calls: string[] = []
  const note = (name: string) => (): void => { calls.push(name) }
  const skin: Skin = {
    paintSky: () => { throw new Error('cerul nu se pictează din drawWorld') },
    core: note('core'), shield: note('shield'), node: note('node'), building: note('building'), foe: note('foe'),
    hero: note('hero'), shot: note('shot'), glyph: note('glyph'), chip: note('chip'), coreIcon: note('coreIcon'),
  }
  return { skin, calls }
}

describe('ordinea straturilor', () => {
  it('nucleul sub obiecte, inelul peste nave, razele peste inel', () => {
    const s = quietGame()
    addNode(s, 'crystal', 500, 700)
    padOf(s, 'turret', 0).lvl = 1
    addFoe(s, 560, 690); addFoe(s, 540, 820)          // una deasupra nucleului pe ecran, una dedesubt
    s.shots.push({ x: 500, y: 700, tx: 560, ty: 690, a: 0, targetId: -1, dmg: 1 })
    const { skin, calls } = recorder()
    drawWorld(fakeCtx(), s, { x: 0, y: 0 }, { l: 0, t: 0, r: 1100, b: 1500 }, skin)
    const first = (n: string): number => calls.indexOf(n), last = (n: string): number => calls.lastIndexOf(n)
    expect(calls.filter((c) => c === 'core')).toHaveLength(1)
    expect(calls.filter((c) => c === 'shield')).toHaveLength(1)
    expect(calls.filter((c) => c === 'foe')).toHaveLength(2)
    for (const n of ['node', 'building', 'foe', 'hero']) {
      expect(first('core')).toBeLessThan(first(n))
      expect(last(n)).toBeLessThan(first('shield'))
    }
    expect(first('shield')).toBeLessThan(first('shot'))
  })
  it('ce nu se vede nu se desenează', () => {
    const s = quietGame()
    addFoe(s, 1000, 1400)
    const { skin, calls } = recorder()
    drawWorld(fakeCtx(), s, { x: 0, y: 0 }, { l: 300, t: 500, r: 700, b: 1000 }, skin)
    expect(calls).not.toContain('foe')
    expect(calls).toContain('core')
  })
})
```

Run: `npx vitest run src/render/world.test.ts`
Expected: FAIL, `./skin` nu există.

- [ ] **Step 4: Pune culorile temei în `src/ui/ui.css` și în `src/render/palette.ts`**

Blocul de culori din `:root` devine acesta. Variabilele vechi dispar toate, în afară de `--edge`, `--hero`, `--hero-shade`, `--foe`, `--foe-shade`, `--ink`, `--ink-soft`, `--night`, `--panel`, `--veil`, `--track`, `--line`, care rămân cu valori noi.

```css
  --sky: #0c1236; --sky-deep: #090c26; --edge: #05071a;
  --nebula-a: #3b2a86; --nebula-b: #0f4a6a; --nebula-c: #6a2a7a; --nebula-d: #2a3aa0;
  --star: #ffffff; --star-cool: #c9dcff; --star-warm: #ffe9c9;
  --ocean: #2f7fd8; --land: #4fc98a; --land-shade: #39b077;
  --air: #78cdff; --shield: #8fe9ff;
  --hero: #ffcf4a; --hero-shade: #b8860b; --jet: #8fe9ff;
  --foe: #ff4d6d; --foe-shade: #a81f44; --foe-jet: #ffb347; --foe-glass: #3a0c1e;
  --crystal: #4fe3c1; --crystal-lift: #a8f7e4; --crystal-shade: #22a58c; --crystal-base: #343062;
  --ore: #8d88b5; --ore-shade: #5f5a86; --ore-pit: #4d4973; --ore-fleck: #e9e6ff;
  --metal: #b3aee6;
  --hull: #dfe6f7; --hull-shade: #8a94b8; --hull-dark: #1a2147; --solar: #3f73d9; --solar-line: #9cc0ff;
  --bolt: #d8fbff;
  --ink: #f1f4ff; --ink-soft: #9fa9c9; --night: #060a1f;
  --panel: rgba(6, 10, 31, .86); --veil: rgba(6, 10, 31, .55);
  --track: rgba(241, 244, 255, .16); --line: rgba(241, 244, 255, .14);
```

`body` ia fondul `var(--sky)`; `.chip-crystal` și `.chip-metal` iau `var(--crystal)` și `var(--metal)`. În `src/render/palette.ts`, `NAMES` devine lista variabilelor de culoare de mai sus până la `night` inclusiv.

- [ ] **Step 5: Scrie aspectul și reașază `world.ts`**

Formele și proporțiile se iau din `docs/machete-tema-spatiu.html`: `ORBIT.bg`, `ORBIT.core`, `ORBIT.rock`, `ORBIT.tower`, `solidShip`, `solidFoe`, `solidCrystal`, `solidStation`, `bolt`, `shard`, `glyph`, `chip`, cu poligoanele `SHIP`, `GRUNT`, `BRUTE`. Culorile vin din `palette()`, nu din literalele machetei. Tabelele de mai jos spun ce macheta nu hotărăște, fiindcă ea arată o singură clipă.

`src/render/orbit/scene.ts` (singurul fișier cu gradient și decupaj):

| Ce | Cum |
|---|---|
| `paintSky` | Canvas de `WORLD.w × WORLD.h`. Aleatorul vine din `createRng(LAYOUT_SEED, 'cer')`. Gradient de sus în jos din `sky` în `sky-deep`; 12 pete de nebuloasă cu raza între 180 și 300; 1060 de stele; 32 de sclipiri; pe fiecare margine, banda de 90 px care se stinge în `edge`, cu geometria din `ground.ts` de azi. |
| `core` | Ca `ORBIT.core` fără inel: aură, ocean, continente, calotă, nori, umbră, dungă de lumină, satelit. Continentele alunecă cu `s.t * 2`, norii cu `s.t * 5`, satelitul are unghiul `s.t * 0.45`. Cât `s.t - s.core.hitT < 0.12`, planeta se luminează. |
| `shield` | Raza `CORE.r + 10`. Un inel întreg, stins, și peste el arcul aprins, de la `-π/2`, lung cât `shieldSpan(s.core.hp, BALANCE.core.hp)`. Culoarea e `shield`, sau `foe` când viața e sub `LOW_FRAC`. Cât `s.t - s.core.hitT < 0.12`, arcul e mai deschis. La întindere 0 nu se desenează niciun arc. |
| `coreIcon` | Disc cu raza 7 în culoarea `tone`, cu o dungă mică de lumină. |

`src/render/orbit/things.ts` (doar forme pline și linii):

| Ce | Cum |
|---|---|
| cristal | Raza `11 + 7 × n.left / amount`. Tresare ca azi cât `s.t - n.shakeT < 0.18`. Golit: ciot; noua țandără apare când `regrown(n, s.t)` trece de 0,45 și crește până la 1, cum crește azi copacul la loc. |
| asteroid | Raza `10 + 8 × n.left / amount`, forma din `n.shape`, rotit cu `s.t * 0.12 + n.x`. Golit: trei fărâme, ca azi. |
| turelă | Raza `BALANCE.turret.r`. Țeava la unghiul `turretAim(s, p)`. Numărul `p.lvl` în mijloc. Creșterea de la construire rămâne ca azi (`p.popT`, 0,25 s). |
| colector, mină | Aceeași stație. Dunga și grămăjoara au culoarea `crystal`, respectiv `metal`. `p.lvl` puncte deasupra. Drona are unghiul `s.t * 1.6 + p.bx`. |
| navă dușmană | Poligonul `GRUNT` sau `BRUTE` la raza `f.r`, rotit cu `f.a`. Avântul de 4 px cât `s.t - f.lungeT < 0.12` și clipirea în `ink` cât `s.t - f.hitT < 0.08`, ca azi. Flacăra pâlpâie după `s.t * 30 + f.id`. |
| nava ta | Poligonul `SHIP`, rotit cu `h.face`. Clipește în `ink` cât `s.t - h.hurtT < 0.1`. Flacăra apare doar când comanda e peste `BALANCE.hero.deadzone`. Unda: cât `s.t - h.waveT < 0.16`, arcul de azi, cu raza `BALANCE.hero.reach * 0.8`, în jurul lui `h.waveA`. |
| rază | La `(sh.x, sh.y)`, pe unghiul `sh.a`, lungă de 12. |
| semnul minei | Hexagon. Macheta nu îl are, fiindcă mina nu apare în scena ei; celelalte semne sunt în `glyph`. |

Umbrele de sub obiecte dispar cu totul: funcția `shade` de azi nu mai are urmaș în „Orbită”.

`src/render/world.ts` păstrează ce e comun: cercurile de investit cu titlu și cost (semnul și jetoanele le cere aspectului), barele de viață ale navei și ale dușmanilor, punctele de nivel ale navei, cercul și numărătoarea de la reapariție, textele plutitoare, norișorii, săritul peste ce nu se vede. Ordinea:

1. cercurile de investit;
2. `skin.core`, dacă nucleul e în vedere;
3. resursele, clădirile, navele dușmane și nava ta, sortate după `y` ca azi, fiecare urmată de bara ei;
4. `skin.shield`;
5. cercul de reapariție, razele, textele plutitoare.

`src/render/canvas.ts` ține cerul pictat în locul terenului și dă `ORBIT` lui `drawWorld` și lui `drawOverlay`. `src/render/overlay.ts` cere aspectului discul din indicator. `src/render/ground.ts` se șterge.

Run: `npx vitest run src/render`
Expected: testele din `derive.test.ts`, `world.test.ts` și `camera.test.ts` trec.

- [ ] **Step 6: Scrie testul de disciplină al desenului**

`src/render/discipline.test.ts` citește fișierele `.ts` din `src/render/` (fără teste), la fel cum `src/sim/discipline.test.ts` le citește pe ale simulării. Are funcția `offenders(files: Record<string, string>, pattern: RegExp, allowed?: string[]): string[]`, care întoarce fișierele în care apare tiparul și care nu sunt îngăduite. Căile sunt relative la `src/render/`.

```ts
  it('nicio umbră estompată în desen', () => {
    expect(offenders(files, /shadowBlur/)).toEqual([])
  })
  it('gradient și decupaj doar la cer și la nucleu', () => {
    expect(offenders(files, /createRadialGradient|createLinearGradient|\.clip\(/, ['orbit/scene.ts'])).toEqual([])
  })
  it('proba negativă: un fișier cu umbră estompată e prins', () => {
    expect(offenders({ 'x.ts': 'ctx.shadowBlur = 4' }, /shadowBlur/)).toEqual(['x.ts'])
  })
```

Run: `npx vitest run src/render/discipline.test.ts`
Expected: 3 teste trecute.

- [ ] **Step 7: Verifică și uită-te**

Run: `npm run check`
Expected: 91 de teste trecute (81 + 5 + 2 + 3), build reușit.

Run: `npm run smoke`
Expected: `SMOKE OK (9 verificări)` și rândul `SMOKE INFO`.

Deschide `smoke-out/03-joc.png` și `smoke-out/05-test.png` și pune-le lângă varianta 1 din machetă. În raport scrie ce diferă și timpul de desen față de cel din Task 1. Textele de pe ecran sunt încă cele vechi; se schimbă în Task 4.

- [ ] **Step 8: Jurnal și commit**

```bash
git add src/render src/ui/ui.css DEVLOG.md
git commit -m "Tema de spațiu, pasul 3: aspectul „Orbită” pe canvas, în spatele interfeței Skin"
```

`git add src/render` cuprinde și ștergerea lui `ground.ts`. Verifică înainte cu `git status --short` că în `src/render` nu e nimic străin.

---

### Task 4: Pagina: texte, jetoane, font, proba din browser

**Files:**
- Modify: `src/ui/strings.ts`, `src/ui/ui.css`, `src/main.ts`, `package.json`, `package-lock.json`, `scripts/smoke.cjs`
- Test: `src/ui/strings.test.ts`

**Interfaces:**
- Consumes: cheile din `STR` și clasele din Task 2, culorile din Task 3.
- Produces: textele din tabelul „Textele” al specului; `--font-display: "Exo 2", "Rubik", system-ui, sans-serif`.

- [ ] **Step 1: Scrie testul textelor**

`src/ui/strings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { STR } from './strings'

describe('textele temei de spațiu', () => {
  it('numele de pe cercuri și din bandă', () => {
    expect(STR.pad).toEqual({ turret: 'Turelă', collector: 'Colector', mine: 'Mină', hero: 'Navă', repair: 'Repară planeta' })
    expect([STR.crystal, STR.metal, STR.core]).toEqual(['cristale', 'metal', 'Planetă'])
    expect(STR.padLevel(STR.pad.turret, 3)).toBe('Turelă nivel 3')
    expect(STR.padMax(STR.pad.mine)).toBe('Mină · nivel maxim')
  })
  it('mesajele partidei', () => {
    expect(STR.heroDown).toBe('Nava a fost doborâtă')
    expect(STR.overTitle).toBe('Planeta a căzut')
    expect(STR.overKills).toBe('Nave doborâte')
    expect(STR.fieldLabel).toBe('Zona de joc')
  })
  it('regulile de pe cartonașul de start', () => {
    expect(STR.hint).toBe('Ține degetul pe ecran și trage ca să miști nava')
    expect(STR.ruleMove).toBe('Ține degetul pe ecran și trage. Nava merge încotro tragi.')
    expect(STR.ruleGather).toBe('Stai lângă cristale și asteroizi ca să strângi cristale și metal.')
    expect(STR.ruleInvest).toBe('Oprește-te pe un cerc punctat ca să investești în turele, colector, mină sau navă.')
    expect(STR.ruleFight).toBe('Nava lovește singură ce e aproape. Partida ține până cade planeta.')
  })
  it('niciun text nu mai pomenește tema veche', () => {
    const all = JSON.stringify(STR, (_k, v) => (typeof v === 'function' ? v('x', 1) : v)).toLowerCase()
    for (const w of ['castel', 'turn', 'lemn', 'piatr', 'copac', 'stânc', 'tăietor', 'carier', 'erou']) expect(all).not.toContain(w)
  })
})
```

Run: `npx vitest run src/ui/strings.test.ts`
Expected: FAIL la primul test, `'Turn'` în loc de `'Turelă'`.

- [ ] **Step 2: Schimbă textele**

În `src/ui/strings.ts` se schimbă doar valorile. Restul textelor rămân cum sunt.

Run: `npx vitest run src/ui/strings.test.ts`
Expected: 4 teste trecute.

- [ ] **Step 3: Schimbă fontul**

```bash
npm uninstall @fontsource/alfa-slab-one
npm install --save-dev @fontsource/exo-2@^5.3.0
```

În `src/main.ts`, cele două importuri Alfa Slab One devin `@fontsource/exo-2/latin-800.css` și `@fontsource/exo-2/latin-ext-800.css`. În `src/ui/ui.css`, `--font-display` ia valoarea din „Produces”, iar regulile care folosesc `var(--font-display)` trec la `font-weight: 800`. `font-variant-numeric: tabular-nums` rămâne pe cifre.

În `package.json`, `description` devine `World Guard — aperi planeta cu o navă (joc web pentru telefon)`.

- [ ] **Step 4: Dă formă jetoanelor din pagină**

În `src/ui/ui.css`: `.chip-crystal` e romb și `.chip-metal` e hexagon, amândouă cu `clip-path` și fără colțuri rotunjite. Celelalte jetoane rămân pătrățele rotunjite.

- [ ] **Step 5: Adu proba din browser la zi**

În `scripts/smoke.cjs`:

- verificarea 7 așteaptă „Planeta a căzut” (și în textul verificării);
- captura `01-teren.png` devine `01-cer.png`; cuvintele „teren” și „castel” din comentarii și din textele verificărilor trec pe cele noi;
- verificarea 4 cere în plus fontul și cifrele, cu rândurile de mai jos în locul lui `check(4, …)` de azi.

```js
    const faces = await page.evaluate(async () => (await document.fonts.load('800 20px "Exo 2"', 'Planetă șț')).map((f) => `${f.family.replace(/["']/g, '')}:${f.status}`))
    const fontOk = faces.length >= 2 && faces.every((f) => f === 'Exo 2:loaded')
    const digits = await page.evaluate(() => {
      const host = document.getElementById('clock')
      const width = (t) => { const e = document.createElement('span'); e.textContent = t; e.style.position = 'absolute'; host.appendChild(e); const w = e.getBoundingClientRect().width; e.remove(); return w }
      return [width('1111'), width('0000')]
    })
    check(4, 'cartonașul de start se vede, cu titlul „World Guard”, în Exo 2, cu cifre de lățime egală', (await page.locator('#startVeil').isVisible()) && title === 'World Guard' && fontOk && Math.abs(digits[0] - digits[1]) < 0.01, `titlu: „${title}”, fețe de font: ${faces.join(', ') || 'niciuna'}, cifre ${digits.join(' / ')}`)
```

Textul „Planetă șț” cere și literele de bază, și pe cele românești, deci trebuie să se încarce două fețe ale fontului. Dacă fontul lipsește cu totul, lista iese goală și verificarea pică.

- [ ] **Step 6: Verifică și uită-te**

Run: `npm run check`
Expected: 95 de teste trecute, build reușit.

Run: `npm run smoke`
Expected: `SMOKE OK (9 verificări)`.

Deschide `smoke-out/02-start.png` și `smoke-out/04-final.png`: titlul și cifrele sunt în fontul nou, regulile de pe cartonaș sunt cele noi, jetoanele din bandă sunt romb și hexagon.

Run: `npm run single && ls -l dist-single/world-guard.html`
Expected: fișierul există. Notează mărimea în `DEVLOG.md`.

- [ ] **Step 7: Jurnal și commit**

```bash
git add src/ui/strings.ts src/ui/strings.test.ts src/ui/ui.css src/main.ts package.json package-lock.json scripts/smoke.cjs DEVLOG.md
git commit -m "Tema de spațiu, pasul 4: textele, jetoanele și fontul paginii"
```

---

### Task 5: Încheierea: viteza, numele vechi, schela, documentele

**Files:**
- Delete: `src/sim/golden.test.ts`
- Modify: `docs/GDD.md`, `CLAUDE.md`, `README.md`, `DEVLOG.md`, `docs/superpowers/plans/2026-11-17-world-guard-faza-2.md`
- Modify, doar dacă o cere Step 1: `src/render/orbit/things.ts`

**Interfaces:**
- Consumes: „timpul de desen dinainte” din intrarea de jurnal a Task 1.
- Produces: nimic nou în cod.

- [ ] **Step 1: Compară timpul de desen**

Run: `npm run smoke`, de trei ori. Valoarea din mijloc e „timpul de desen de după”.

Dacă `uname -r` nu mai e cel notat în Task 1, mașina s-a schimbat și „dinainte” se remăsoară aici, pe commit-ul Task 1:

```bash
git worktree add ../wg-inainte <commit-ul Task 1>
(cd ../wg-inainte && npm ci && npm run smoke)     # de trei ori; valoarea din mijloc
git worktree remove --force ../wg-inainte
```

Dacă „după” e mai mare decât 1,25 × „dinainte”, simplifică formele desenate de multe ori, în ordinea asta, remăsurând după fiecare: cabina navelor dușmane, apoi flacăra lor, apoi haloul razelor. Scrie în `DEVLOG.md` ambele valori și ce s-a simplificat, dacă a fost cazul.

- [ ] **Step 2: Caută numele vechi**

Run: `grep -rnEi "wood|stone|castle|tower|quarry|swing|slash|blade|grass|\bcamp|\bwalk|\bground|\bdirt|\brock|\bpine|\btrunk" src scripts index.html`
Expected: nicio linie.

Run: `grep -rnEi "castel|\bturn|lemn|piatr|pietr|copac|stânc|tăietor|carier|iarb|\bteren|\bzid|\bsabi|steag|\bpuie" src scripts index.html`
Expected: nicio linie.

Run: `grep -rnEi "săge" src scripts index.html`
Expected: fiecare linie rămasă vorbește despre o formă sau despre indicatorul spre planetă, nu despre un proiectil. Citește-le pe toate.

Ce se găsește se repară prin redenumire. Rezultatul celor trei căutări se trece în `DEVLOG.md`.

- [ ] **Step 3: Șterge schela**

Rulează o ultimă dată `npx vitest run src/sim/golden.test.ts` (2 teste trecute). Trece în `DEVLOG.md` ultimul rând din `MARKS` și faptul că a ieșit la fel după toată lucrarea, apoi șterge `src/sim/golden.test.ts`. `drawMs` și rândul `SMOKE INFO` rămân.

- [ ] **Step 4: Adu documentele la zi**

`docs/GDD.md`:

- în „Cine a hotărât ce”, sub hotărârile lui Andrei, intră cele cinci din specul temei, cu data 2026-11-17 și cu trimiterea la spec;
- în „Regulile jocului”, „Cifrele de pornire” și în restul textului, cuvintele temei vechi trec pe cele noi, după tabelul „Textele” din spec; cifrele nu se ating;
- la „Ce ar putea veni după v1” intră misiunile speciale, cu aspectul „Colonie”;
- genul rămâne numit cum l-a numit Andrei („castle defense”), cu o propoziție că tema e de spațiu.

Celelalte:

- `CLAUDE.md`: „Ce e”, „Arhitectura” (modulele din `src/render/`, testele noi, dispariția lui `ground.ts`) și „Stare”; `docs/prototip.html` e numit referință de comportament, cu aspectul vechi.
- `README.md`: descrierea, „Cum se joacă”, „Test de viteză” și „Semne în adresă” (apare `drawMs`).
- `docs/superpowers/plans/2026-11-17-world-guard-faza-2.md`: numele din text și din exemplele de cod trec pe cele din Task 2; iconița aplicației se descrie ca planeta cu inelul ei, în culorile temei. `--edge` rămâne numele culorii de margine.
- `DEVLOG.md`: intrarea se încheie cu ce s-a măsurat și ce a rămas (proba pe telefon).

- [ ] **Step 5: Verifică și commit**

Run: `npm run check`
Expected: 93 de teste trecute (95 fără cele două ale schelei), build reușit.

Run: `npm run smoke`
Expected: `SMOKE OK (9 verificări)`.

```bash
git add -u src/sim/golden.test.ts
git add docs/GDD.md CLAUDE.md README.md DEVLOG.md docs/superpowers/plans/2026-11-17-world-guard-faza-2.md
git commit -m "Tema de spațiu, pasul 5: viteza măsurată, numele vechi căutate, schela ștearsă, documentele la zi"
```

Dacă Step 1 a schimbat `src/render/orbit/things.ts`, intră și el în commit.

---

### Task 6: Proba pe telefonul lui Andrei

Nu e un task de cod. Cel care conduce execuția face varianta într-un singur fișier (`npm run single`) și o pune pe pagina privată de încercat pe telefon, apoi îi cere lui Andrei:

- [ ] să joace o partidă și să spună dacă arată ca varianta 1 din machete;
- [ ] să spună dacă deosebește dintr-o privire nava lui, navele dușmane, cristalele și asteroizii;
- [ ] să spună dacă inelul planetei se vede când e atacată;
- [ ] să ruleze „Test de viteză” și să spună cele două cifre din bandă.

Ce spune se trece în `DEVLOG.md`. Dacă cifrele sunt sub 60, urmează discuția despre PixiJS din GDD, înaintea fazei 2.
