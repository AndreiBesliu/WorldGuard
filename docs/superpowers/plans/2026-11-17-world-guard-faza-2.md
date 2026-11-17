# World Guard, faza 2: pauză, instalare, reluare. Plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jocul se poate pune pe pauză, se instalează pe ecranul de pornire al telefonului, merge fără internet, ține ecranul aprins și reia o partidă întreruptă de telefon.

**Architecture:** Stările aplicației (start, joc, pauză, final) ies din `src/main.ts` într-un modul fără DOM, `src/app/session.ts`, care hotărăște și când se salvează și când se șterge partida. Salvarea e starea simulării trecută prin JSON, cu versiune, verificată la citire. Jocul fără internet vine dintr-un service worker scris de mână, generat la build cu lista fișierelor din `dist`.

**Tech Stack:** TypeScript 7, Vite 8, Vitest 5, Canvas 2D, fără dependențe de rulare. Playwright (deja pe mașina de lucru) pentru proba din browser și pentru generarea pictogramelor.

**Spec:** `docs/GDD.md`, secțiunile „Ce e nou față de prototip” (punctele 1, 2, 3, 6, 7), „Scopuri pentru v1” (2, 3, 8) și „Când e gata v1”.

**De la ce pornește.** Faza 1 e pe `main` (commit `c2bfc36`) și publicată pe GitHub Pages. Andrei a încercat-o pe Samsung Galaxy A54 și a spus că se simte în regulă. Planul presupune că desenatul rămâne pe Canvas 2D. Dacă „Test de viteză” arată sub 60 de cadre pe secundă, mutarea pe PixiJS primește planul ei și trece înaintea Task-ului 4, singurul care atinge desenatul.

## Global Constraints

- Nicio dependență de rulare în `package.json`. Niciun apel de rețea în timpul jocului.
- `src/sim/` rămâne fără DOM, fără `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`. Un număr de joc scris în afara `src/data/` e o greșeală.
- Starea partidei e din date simple și trece prin JSON neschimbată. Nu conține zero negativ, pe care JSON l-ar schimba în zero.
- Cât e pauză, simularea nu avansează.
- Salvarea are versiune și se șterge la sfârșitul partidei sau la o partidă nouă. O salvare cu altă versiune se aruncă fără eroare.
- Dacă telefonul refuză stocarea, jocul merge fără record și fără reluare. Nicio eroare de stocare nu oprește jocul.
- O versiune nouă a jocului se activează la următoarea pornire, niciodată în mijlocul unei partide.
- Testul de viteză nu salvează nimic, nu șterge nimic și nu atinge recordul.
- Interfața e în română. Toate textele stau în `src/ui/strings.ts`.
- Stilul codului, ca în `src/sim/rng.ts`: fără `;`, ghilimele simple, 2 spații, identificatori în engleză, comentarii în română.
- Înainte de fiecare commit: `npm run check` verde. Fiecare task adaugă rânduri la intrarea sesiunii din `DEVLOG.md`. Fișierele se stagează explicit, niciodată `git add -A`.
- Commit-urile merg pe ramura `ccr-a5a7e643-gpwbh0` și se încheie cu cele două rânduri de atribuire ale sesiunii. Fiecare task se încheie cu `git push`.
- Nu intră aici: plasa pentru dificultate, reechilibrarea, sunetul, iPhone-ul, butonul „înapoi” tratat ca pauză (salvarea la ieșirea din pagină îl acoperă).

## Review Focus

1. **Telefonul închide aplicația lăsată în fundal.** La redeschidere, partida se poate continua din clipa în care a fost ascunsă. Teste în Task 3 și Task 4.
2. **Salvare stricată sau de la altă versiune.** Cartonașul de start nu oferă reluarea, nu apare nicio eroare, iar salvarea proastă e ștearsă. Teste în Task 1 și Task 2.
3. **Stocare plină sau blocată în clipa pauzei.** Pauza merge oricum și jocul se poate continua. Teste în Task 2 și Task 3.
4. **Fără rețea, sau cu o versiune nouă apărută între timp.** Jocul pornește din ce are telefonul, iar fișierele nu se schimbă sub o partidă în curs. Teste în Task 5.
5. **Testul de viteză lângă o partidă salvată.** Pornirea sau pauza testului nu strică salvarea, iar o partidă reluată nu ajunge niciodată în modul de test. Teste în Task 3.

---

### Task 1: Starea, gata de salvat

**Files:**
- Create: `src/app/save.ts`
- Modify: `src/data/balance.ts`, `src/sim/foes.ts`
- Test: `src/app/save.test.ts`, `src/sim/foes.test.ts`

**Interfaces:**
- Consumes: `GameState`, `createGame` (`src/sim/state.ts`), `step`, `Result`, `ok`, `fail` (`src/sim/result.ts`).
- Produces:

```ts
// src/app/save.ts
export const SAVE_VERSION = 1
export function packSave(s: GameState): string                              // JSON: { v: SAVE_VERSION, state: s }
export function unpackSave(text: string | null | undefined): Result<GameState>
// src/data/balance.ts
// BALANCE.foe.pushFloor = 0.01   — sub atât (unități pe secundă) împinsul se consideră stins
```

- [ ] **Step 1: Scrie testele care pică**

```ts
// src/sim/foes.test.ts (se adaugă)
it('împinsul se stinge de tot: după 3 s e exact zero, nu un rest și nu un zero negativ', () => {
  const s = quietGame(); heroAt(s, 100, 100); const f = addFoe(s, 550, 300, { kx: -140, ky: 90 })
  stepFor(s, 3)
  expect(Object.is(f.kx, 0) && Object.is(f.ky, 0)).toBe(true)
})

// src/app/save.test.ts
const script = (steps: number): Input[] => {
  const r = createRng(99, 'comenzi-test'); const out: Input[] = []; let d: Input = { x: 0, y: 0 }
  for (let i = 0; i < steps; i++) {
    if (i % 120 === 0) { const a = r.next() * Math.PI * 2; d = { x: Math.cos(a), y: Math.sin(a) } }
    out.push(d)
  }
  return out
}
const busy = (secs: number): GameState => {          // o partidă plină: turnuri care trag, erou care umblă, castel care nu cade
  const s = createGame(11)
  for (const p of s.pads) if (p.kind === 'tower') p.lvl = 2
  s.castle.hp = 1e9
  for (const i of script(secs * 60)) step(s, i)
  return s
}
const negZero = (v: unknown): boolean =>
  typeof v === 'number' ? Object.is(v, -0) : v !== null && typeof v === 'object' && Object.values(v).some(negZero)

it.each([30, 90, 150, 240])('salvată la %i s și reluată, partida continuă identic', (at) => {
  const a = busy(at); const r = unpackSave(packSave(a))
  expect(r.ok).toBe(true); if (!r.ok) return
  const b = r.value
  for (const i of script((at + 30) * 60).slice(at * 60)) { step(a, i); step(b, i) }
  expect(b).toEqual(a)
})
it('starea nu conține zero negativ', () => {
  for (const at of [30, 150, 240]) expect(negZero(busy(at))).toBe(false)
})
it('respinge ce nu e o salvare bună și spune de ce', () => {
  const good = packSave(busy(5))
  const tweak = (f: (o: any) => void): string => { const o = JSON.parse(good); f(o); return JSON.stringify(o) }
  const why = (t: string | null): string => { const r = unpackSave(t); return r.ok ? 'ok' : r.reason }
  expect(why(good)).toBe('ok')
  expect([why(null), why('')]).toEqual(['lipsă', 'lipsă'])
  expect([why('abc'), why('{}'), why('[]'), why('null')]).toEqual(['stricată', 'stricată', 'stricată', 'stricată'])
  expect(why(tweak((o) => { o.v = SAVE_VERSION + 1 }))).toBe('altă versiune')
  expect(why(tweak((o) => { o.state.mode = 'over' }))).toBe('partidă terminată')
  expect(why(tweak((o) => { o.state.pads.pop() }))).toBe('altă formă')
  expect(why(tweak((o) => { delete o.state.hero }))).toBe('altă formă')
  expect(why(tweak((o) => { o.state.hero.x = null }))).toBe('altă formă')
})
it('o salvare cu 150 de dușmani rămâne mică', () => {
  const s = quietGame(); s.tick = 12000; s.t = 200
  for (let i = 0; i < 150; i++) spawnFoe(s)
  expect(packSave(s).length).toBeLessThan(100_000)
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/app/save.test.ts src/sim/foes.test.ts`
Expected: FAIL, `save.ts` nu există; testul cu împinsul pică fiindcă restul nu ajunge la zero.

- [ ] **Step 3: Stinge împinsul mic în `src/sim/foes.ts`**

După amortizare, `kx` și `ky` cu valoare absolută sub `BALANCE.foe.pushFloor` devin `0`. Niciun test existent nu se schimbă.

- [ ] **Step 4: Scrie `src/app/save.ts`**

`unpackSave` respinge, în ordinea asta:

| Motiv | Când |
|---|---|
| `'lipsă'` | textul e `null`, `undefined` sau gol |
| `'stricată'` | nu e JSON, sau nu e un obiect cu `v` număr și `state` obiect |
| `'altă versiune'` | `v !== SAVE_VERSION` |
| `'partidă terminată'` | `state.mode !== 'playing'` |
| `'altă formă'` | cheile lui `state` nu sunt exact cele ale lui `createGame(0)`; sau `nodes` ori `pads` au altă lungime decât acolo; sau undeva în `state`, la orice adâncime, e un `null` |

Un `null` în stare înseamnă un număr care nu a fost finit la scriere.

Dacă testul „continuă identic” sau cel cu zero negativ pică din cauza unui zero negativ rămas în stare, sursa se repară în simulare, la locul unde apare, adunând `+ 0`. Fiecare asemenea loc se trece în raport. Testele nu se slăbesc.

- [ ] **Step 5: Rulează testele și poarta**

Run: `npm run check`
Expected: PASS

- [ ] **Step 6: Commit și push**

```bash
git add src/app/save.ts src/app/save.test.ts src/sim/foes.ts src/sim/foes.test.ts src/data/balance.ts DEVLOG.md
git commit -m "Starea, gata de salvat: salvare cu versiune și verificare la citire"
git push
```

---

### Task 2: Partida în stocarea telefonului

**Files:**
- Modify: `src/app/storage.ts`
- Test: `src/app/storage.test.ts`

**Interfaces:**
- Consumes: `packSave`, `unpackSave` (Task 1).
- Produces:

```ts
// src/app/storage.ts
export const SAVE_KEY = 'wg.v1.save'
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>           // capătă removeItem
export function saveGame(s: GameState, store?: Store | null): void
export function loadGame(store?: Store | null): GameState | null             // o salvare respinsă e ștearsă
export function clearGame(store?: Store | null): void
// saveIfRecord: un `secs` care nu e finit nu atinge nimic și întoarce { record: <cel vechi>, isNew: false }
```

Ca până acum: fără al doilea argument se folosește stocarea paginii, iar `null` înseamnă „fără stocare”.

- [ ] **Step 1: Scrie testele care pică**

Ajutoarele `mem` și `broken` din fișierul de test capătă `removeItem` (`broken` aruncă și acolo).

```ts
it('partida salvată se citește la fel', () => {
  const st = mem(); const s = createGame(3); for (let i = 0; i < 600; i++) step(s, { x: 1, y: 0 })
  saveGame(s, st)
  expect(loadGame(st)).toEqual(s)
})
it('fără salvare, fără stocare sau cu stocare care aruncă: nicio partidă și nicio eroare', () => {
  const s = createGame(3)
  expect(loadGame(mem())).toBeNull(); expect(loadGame(null)).toBeNull(); expect(loadGame(broken)).toBeNull()
  expect(() => { saveGame(s, broken); saveGame(s, null); clearGame(broken); clearGame(null) }).not.toThrow()
})
it('o salvare stricată sau de la altă versiune e aruncată și ștearsă', () => {
  for (const junk of ['abc', '{}', JSON.stringify({ v: 999, state: {} })]) {
    const st = mem({ [SAVE_KEY]: junk })
    expect(loadGame(st)).toBeNull()
    expect(st.getItem(SAVE_KEY)).toBeNull()
  }
})
it('ștergerea scoate salvarea și lasă recordul', () => {
  const st = mem(); saveIfRecord(120, st); saveGame(createGame(3), st)
  clearGame(st)
  expect([loadGame(st), readRecord(st)]).toEqual([null, 120])
})
it('un timp care nu e număr nu devine record', () => {
  const st = mem(); saveIfRecord(120, st)
  expect(saveIfRecord(NaN, st)).toEqual({ record: 120, isNew: false })
  expect(saveIfRecord(Infinity, st)).toEqual({ record: 120, isNew: false })
  expect(readRecord(st)).toBe(120)
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/app/storage.test.ts`
Expected: FAIL, `saveGame`, `loadGame`, `clearGame`, `SAVE_KEY` nu există.

- [ ] **Step 3: Scrie funcțiile în `src/app/storage.ts`**

Toate trei prind orice eroare de stocare, ca `readRecord`. Testele vechi de record rămân neschimbate, în afară de cele două ajutoare.

- [ ] **Step 4: Rulează testele și poarta**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit și push**

```bash
git add src/app/storage.ts src/app/storage.test.ts DEVLOG.md
git commit -m "Partida se păstrează în stocarea telefonului"
git push
```

---

### Task 3: Sesiunea și ecranul aprins

**Files:**
- Create: `src/app/session.ts`, `src/app/wake.ts`
- Test: `src/app/session.test.ts`, `src/app/wake.test.ts`

**Interfaces:**
- Consumes: `createGame`, `step`, `spawnFoe`, `heroMaxHp`, `BALANCE`, `Input`, `GameState`.
- Produces:

```ts
// src/app/session.ts
export const STRESS_FOES = 150                 // se mută aici din main.ts
export type Phase = 'ready' | 'playing' | 'paused' | 'over'
export interface SessionDeps {
  saveGame(s: GameState): void
  clearGame(): void
  saveIfRecord(secs: number): { record: number; isNew: boolean }
}
export interface OverInfo { secs: number; record: number; isNew: boolean; kills: number }
export interface Session {
  readonly phase: Phase
  readonly s: GameState
  readonly stress: boolean
  start(seed: number, stress: boolean): void   // partidă nouă
  resume(saved: GameState): void               // continuă o partidă salvată
  pause(): boolean                             // true dacă a trecut acum în pauză
  unpause(): boolean
  advance(steps: number, input: Input): OverInfo | null
}
export function createSession(deps: SessionDeps, seed: number): Session

// src/app/wake.ts
export interface WakeNav { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }
export function createWake(nav: WakeNav): { on(): void; off(): void }
```

Regulile sesiunii:

| Apel | Din ce stare | Ce face |
|---|---|---|
| `createSession` | | `ready`, cu `createGame(seed)` pe teren |
| `start(seed, false)` | oricare | partidă nouă, `playing`; cheamă `clearGame()` |
| `start(seed, true)` | oricare | test de viteză, `playing`, `spawnT = 1e9`; nu atinge salvarea |
| `resume(saved)` | oricare | `s = saved`, `stress = false`, `playing` |
| `pause()` | `playing` | `paused`; în afara testului cheamă `saveGame(s)`; o eroare din `saveGame` nu împiedică pauza |
| `unpause()` | `paused` | `playing` |
| `advance(steps, input)` | `playing` | rulează pașii; în test, după fiecare pas, completează terenul la `STRESS_FOES` dușmani și aduce castelul și eroul la viață maximă; dacă `s.mode === 'over'`, chiar și cu zero pași, trece în `over` |

La trecerea în `over`: în afara testului cheamă `clearGame()` și `saveIfRecord(Math.floor(s.t))`; în test întoarce `{ record: secs, isNew: false }` fără să atingă nimic. În orice altă stare decât `playing`, `advance` nu face nimic și întoarce `null`.

- [ ] **Step 1: Scrie testele care pică**

```ts
// src/app/session.test.ts
const still = { x: 0, y: 0 }
const deps = () => {
  const calls: string[] = []; const saved: GameState[] = []
  return { calls, saved, d: {
    saveGame: (s: GameState) => { calls.push('save'); saved.push(s) },
    clearGame: () => { calls.push('clear') },
    saveIfRecord: (secs: number) => { calls.push('record ' + secs); return { record: secs, isNew: true } },
  } }
}
it('pornește pe cartonașul de start și nu avansează singură', () => {
  const { d } = deps(); const x = createSession(d, 5)
  expect([x.phase, x.s.seed, x.stress]).toEqual(['ready', 5, false])
  expect(x.advance(10, still)).toBeNull(); expect(x.s.tick).toBe(0)
})
it('o partidă nouă șterge salvarea veche; testul de viteză n-o atinge', () => {
  const a = deps(); const x = createSession(a.d, 5); x.start(7, false)
  expect([x.phase, x.s.seed, a.calls]).toEqual(['playing', 7, ['clear']])
  const b = deps(); const y = createSession(b.d, 5); y.start(7, true)
  expect([y.phase, y.stress, y.s.spawnT, b.calls]).toEqual(['playing', true, 1e9, []])
})
it('pauza salvează o singură dată starea de acum și oprește simularea', () => {
  const { d, calls, saved } = deps(); const x = createSession(d, 5); x.start(7, false); x.advance(60, still)
  expect(x.pause()).toBe(true); expect(x.pause()).toBe(false)
  expect([x.phase, calls, saved[0] === x.s]).toEqual(['paused', ['clear', 'save'], true])
  expect(x.advance(60, still)).toBeNull(); expect(x.s.tick).toBe(60)
  expect(x.unpause()).toBe(true); expect(x.unpause()).toBe(false)
  x.advance(60, still); expect(x.s.tick).toBe(120)
})
it('pauza nu există pe cartonașul de start și nici după final', () => {
  const { d } = deps(); const x = createSession(d, 5)
  expect([x.pause(), x.unpause()]).toEqual([false, false])
})
it('dacă salvarea aruncă, pauza tot are loc', () => {
  const { d } = deps(); d.saveGame = () => { throw new Error('plin') }
  const x = createSession(d, 5); x.start(7, false)
  expect(x.pause()).toBe(true); expect(x.phase).toBe('paused')
})
it('testul de viteză: teren plin, nimeni nu cade, nimic nu se salvează', () => {
  const { d, calls } = deps(); const x = createSession(d, 5); x.start(7, true)
  x.advance(600, still)
  expect([x.s.foes.length, x.s.castle.hp, x.s.hero.dead, x.s.mode]).toEqual([STRESS_FOES, BALANCE.castle.hp, false, 'playing'])
  x.pause()
  expect(calls).toEqual([])
})
it('la căderea castelului: final, salvarea ștearsă, recordul întrebat o dată', () => {
  const { d, calls } = deps(); const x = createSession(d, 5); x.start(7, false)
  x.s.castle.hp = 0; x.s.mode = 'over'; x.s.tick = 4321; x.s.t = 4321 / 60; x.s.kills = 9
  expect(x.advance(0, still)).toEqual({ secs: 72, record: 72, isNew: true, kills: 9 })
  expect([x.phase, calls]).toEqual(['over', ['clear', 'clear', 'record 72']])
  expect(x.advance(5, still)).toBeNull()
})
it('o partidă reluată continuă de unde era și nu e niciodată test de viteză', () => {
  const { d } = deps(); const x = createSession(d, 5); x.start(7, true)
  const saved = createGame(9); for (let i = 0; i < 300; i++) step(saved, still)
  x.resume(saved)
  expect([x.phase, x.stress, x.s === saved]).toEqual(['playing', false, true])
  x.advance(60, still); expect(x.s.tick).toBe(360)
})

// src/app/wake.test.ts
const fake = (fail = false) => {
  const log: string[] = []
  const nav: WakeNav = { wakeLock: { request: async () => { log.push('cere'); if (fail) throw new Error('refuzat'); return { release: async () => { log.push('lasă') } } } } }
  return { log, nav }
}
const settle = () => new Promise((r) => setTimeout(r, 0))
it('fără sprijin din partea telefonului nu face nimic și nu aruncă', () => {
  const w = createWake({}); expect(() => { w.on(); w.off() }).not.toThrow()
})
it('cere o singură dată, lasă la oprire și poate cere din nou', async () => {
  const { log, nav } = fake(); const w = createWake(nav)
  w.on(); w.on(); await settle(); expect(log).toEqual(['cere'])
  w.off(); await settle(); expect(log).toEqual(['cere', 'lasă'])
  w.on(); await settle(); expect(log).toEqual(['cere', 'lasă', 'cere'])
})
it('oprit înainte să primească răspunsul, lasă blocarea când sosește', async () => {
  const { log, nav } = fake(); const w = createWake(nav)
  w.on(); w.off(); await settle()
  expect(log).toEqual(['cere', 'lasă'])
})
it('un refuz nu aruncă nimic', async () => {
  const { log, nav } = fake(true); const w = createWake(nav)
  w.on(); await settle(); w.off(); await settle()
  expect(log).toEqual(['cere'])
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/app/session.test.ts src/app/wake.test.ts`
Expected: FAIL, modulele nu există.

- [ ] **Step 3: Scrie `session.ts` și `wake.ts`**

Niciunul nu atinge `window` sau `document`. `main.ts` nu se schimbă în task-ul ăsta.

- [ ] **Step 4: Rulează testele și poarta**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit și push**

```bash
git add src/app/session.ts src/app/session.test.ts src/app/wake.ts src/app/wake.test.ts DEVLOG.md
git commit -m "Sesiunea (start, joc, pauză, final) și ecranul aprins"
git push
```

---

### Task 4: Pauza și reluarea pe ecran

**Files:**
- Modify: `index.html`, `src/ui/ui.css`, `src/ui/strings.ts`, `src/ui/cards.ts`, `src/main.ts`, `src/render/canvas.ts`, `scripts/smoke.cjs`

**Interfaces:**
- Consumes: `createSession`, `Phase`, `OverInfo` (Task 3); `createWake` (Task 3); `saveGame`, `loadGame`, `clearGame`, `saveIfRecord` (Task 2).
- Produces:

```ts
// src/ui/cards.ts
export function createCards(doc: Document, on: {
  start(): void; continue(): void; stress(): void; again(): void; pause(): void; resume(): void; fresh(): void
}): {
  showStart(saved: { secs: number } | null): void
  showPause(secs: number): void
  showOver(r: OverInfo): void
  hide(): void                       // joc în curs: niciun cartonaș, butonul de pauză la vedere
}
// src/render/canvas.ts — createRenderer capătă:
//   refresh(): void                 // aruncă terenul pictat; următorul cadru îl pictează din nou
// src/main.ts — window.__wg capătă:
//   phase(): Phase
```

- [ ] **Step 1: Scrie verificările noi în `scripts/smoke.cjs`**

Se adaugă după verificarea 9, în stilul celor existente. Pagina ascunsă se simulează punând `document.visibilityState` pe `'hidden'` cu `Object.defineProperty` și trimițând `visibilitychange`; la revenire, la fel cu `'visible'`.

10. După „Începe”, butonul `#pause` se vede. Apăsat, apare cartonașul de pauză cu „Continuă” și „Partidă nouă”, `__wg.phase()` e `'paused'`, iar ceasul arată același text și după 700 ms.
11. „Continuă” ascunde cartonașul, iar după 1,2 s ceasul a înaintat.
12. Pagina ascunsă în timpul jocului: la revenire cartonașul de pauză e pe ecran și `localStorage['wg.v1.save']` există.
13. După `page.reload()`, cartonașul de start arată „Continuă partida · m:ss” cu timpul salvat, iar butonul de start spune „Partidă nouă”. După „Continuă partida”, ceasul pornește de la timpul salvat și lemnul e cel de dinainte.
14. „Partidă nouă” din pauză pornește o partidă cu ceasul sub 0:02, iar `localStorage['wg.v1.save']` nu mai există.
15. Pauză, „Continuă”, apoi `__wg.run(200)`: apare cartonașul de final și salvarea nu mai există. După reîncărcare, cartonașul de start nu are „Continuă partida”, iar butonul spune „Începe”.
16. Testul de viteză, pus pe pauză, nu lasă nicio salvare.

La final: `SMOKE OK (16 verificări)`.

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npm run smoke`
Expected: verificarea 10 pică, butonul `#pause` nu există.

- [ ] **Step 3: Pagina și textele**

- `index.html`: în bandă, un buton `#pause` cu `data-str-aria="pause"`, desenat din CSS (două bare). Banda nu primește atingeri, deci butonul le cere explicit. Un cartonaș `#pauseVeil` cu titlu, timpul de până acum și butoanele `#resume` și `#fresh`. Pe cartonașul de start, deasupra lui `#start`, un buton `#continue`, ascuns când nu e nimic de reluat.
- `src/ui/strings.ts`, cu tip: `pause: 'Pauză'`, `pauseTitle: 'Pauză'`, `pauseSoFar: 'Ai rezistat până acum'`, `resume: 'Continuă'`, `fresh: 'Partidă nouă'`, `continueSaved: (time) => \`Continuă partida · ${time}\``.
- `src/ui/cards.ts`: `showStart(saved)` arată `#continue` cu timpul salvat și pune pe `#start` textul „Partidă nouă”; fără salvare, `#continue` e ascuns și `#start` spune „Începe”. Butonul `#pause` se vede doar când nu e niciun cartonaș.

- [ ] **Step 4: Leagă sesiunea în `src/main.ts`**

`main.ts` nu mai ține stări: le ia din `createSession`. Legături:

- La pornire: `loadGame()`; cartonașul de start primește timpul salvat sau `null`.
- `#continue` → `resume(saved)`. `#start` și `#again` → `start(sămânță, false)`. `#stress` → `start(sămânță, true)`. `#pause` și tasta Escape → `pause()`, apoi cartonașul de pauză. `#resume` și Escape în pauză → `unpause()`. `#fresh` → `start(sămânță nouă, false)`.
- Pauză automată: la `visibilitychange` cu pagina ascunsă și la `pagehide`, `pause()`; dacă a întors `true`, apare cartonașul de pauză.
- Ecranul aprins: `wake.on()` la fiecare intrare în `playing`, `wake.off()` la fiecare ieșire.
- Pe cadru: `session.advance(pași, input.read())`; dacă întoarce un `OverInfo`, apare cartonașul de final.
- Desenatul la cerere: se desenează fiecare cadru cât e `playing`. În rest, doar o secundă după o schimbare de stare, o redimensionare sau un `refresh()`. Banda se sincronizează în aceleași cadre.
- La revenirea în pagină: `renderer.refresh()`, ceasul cadrelor se reia de la zero.
- `STRESS_FOES` și întreținerea testului de viteză dispar din `main.ts` (sunt în sesiune). Măsurarea cadrelor rămâne.

- [ ] **Step 5: `refresh()` în `src/render/canvas.ts`**

`refresh()` pune terenul pictat pe `null`. Se cheamă și singur la evenimentul `contextrestored` al canvasului.

- [ ] **Step 6: Rulează poarta și proba în browser**

Run: `npm run check && npm run smoke`
Expected: `SMOKE OK (16 verificări)`. Uită-te la capturile noi (cartonașul de pauză, cartonașul de start cu „Continuă partida”): textele au diacritice întregi și nimic nu iese din ecran la 390 de pixeli lățime.

- [ ] **Step 7: Commit și push**

```bash
git add index.html src/ui/ui.css src/ui/strings.ts src/ui/cards.ts src/main.ts src/render/canvas.ts scripts/smoke.cjs DEVLOG.md
git commit -m "Pauză cu buton și automată, reluarea partidei, ecran aprins"
git push
```

---

### Task 5: Instalare și joc fără internet

**Files:**
- Create: `public/manifest.webmanifest`, `public/icons/icon.svg`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `scripts/make-icons.cjs`, `scripts/sw-template.js`, `scripts/build-sw.mjs`, `src/app/sw.ts`, `src/env.d.ts`
- Modify: `index.html`, `src/main.ts`, `vite.config.ts`, `vite.single.config.ts`, `package.json`, `.github/workflows/ci.yml`, `scripts/smoke.cjs`, `scripts/single-file.mjs`, `README.md`, `CLAUDE.md`, `DEVLOG.md`
- Test: `src/app/pwa.test.ts`, `src/app/sw.test.ts`

**Interfaces:**
- Produces:

```ts
// src/app/sw.ts
export function registerServiceWorker(nav: { serviceWorker?: { register(url: string): Promise<unknown> } }, enabled: boolean): void
// src/env.d.ts
declare const __WG_SW__: boolean      // true în build-ul obișnuit, false în cel într-un singur fișier
```

```json
// package.json, scripts
"bundle": "vite build && node scripts/build-sw.mjs",
"build": "tsc --noEmit && npm run bundle",
"check": "npm run typecheck && npm run test && npm run bundle",
"smoke": "npm run bundle && node scripts/smoke.cjs",
"icons": "node scripts/make-icons.cjs"
```

- [ ] **Step 1: Scrie testele care pică**

```ts
// src/app/pwa.test.ts — citește fișierele așa cum ajung la telefon
const read = (p: string) => readFileSync(join(process.cwd(), p))
it('manifestul are ce cere instalarea', () => {
  const m = JSON.parse(read('public/manifest.webmanifest').toString('utf8'))
  expect(m).toMatchObject({ name: 'World Guard', short_name: 'World Guard', lang: 'ro', start_url: './', scope: './', display: 'fullscreen', orientation: 'portrait' })
  expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/); expect(m.background_color).toBe(m.theme_color)
  expect(m.icons).toEqual([
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ])
})
it('pictogramele sunt PNG-uri de mărimea declarată', () => {
  for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512]] as const) {
    const b = read('public/icons/' + file)
    expect(b.subarray(1, 4).toString('latin1')).toBe('PNG')
    expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([size, size])
  }
})
it('pagina trimite la manifest și la pictogramă', () => {
  const html = read('index.html').toString('utf8')
  expect(html).toContain('rel="manifest" href="./manifest.webmanifest"')
  expect(html).toContain('name="theme-color"')
})
it('service worker-ul nu sare peste așteptare și are locurile de umplut la build', () => {
  const t = read('scripts/sw-template.js').toString('utf8')
  expect(t).not.toMatch(/skipWaiting/)
  expect(t).toContain('__VERSION__'); expect(t).toContain('__FILES__')
})

// src/app/sw.test.ts
it('înregistrează ./sw.js doar când e pornit și doar dacă browserul știe', async () => {
  const urls: string[] = []; const nav = { serviceWorker: { register: async (u: string) => { urls.push(u) } } }
  registerServiceWorker(nav, false); registerServiceWorker({}, true); expect(urls).toEqual([])
  registerServiceWorker(nav, true); expect(urls).toEqual(['./sw.js'])
})
it('un refuz la înregistrare nu aruncă', async () => {
  const nav = { serviceWorker: { register: async () => { throw new Error('refuzat') } } }
  expect(() => registerServiceWorker(nav, true)).not.toThrow()
  await new Promise((r) => setTimeout(r, 0))
})
```

- [ ] **Step 2: Rulează și vezi că pică**

Run: `npx vitest run src/app/pwa.test.ts src/app/sw.test.ts`
Expected: FAIL, fișierele nu există.

- [ ] **Step 3: Manifestul, pictogramele, pagina**

- `public/icons/icon.svg`: castelul din joc văzut de sus (zidul rotund cu creneluri, turnul din mijloc, steagul auriu) pe culoarea terenului. `scripts/make-icons.cjs` îl desenează cu Playwright la 192 și 512 de pixeli și scrie cele trei PNG-uri. Varianta `maskable` ține desenul în cercul din mijloc, de 80% din latură, cu fundal plin până la margini. PNG-urile se comit; scriptul se rulează doar când se schimbă desenul.
- `public/manifest.webmanifest`: câmpurile din test; `theme_color` e valoarea lui `--edge` din `src/ui/ui.css`.
- `index.html`: `<link rel="manifest" href="./manifest.webmanifest">`, `<meta name="theme-color">` cu aceeași culoare, `<link rel="icon" href="./icons/icon-192.png">`.

- [ ] **Step 4: Service worker-ul**

`scripts/sw-template.js`, întreg:

```js
// Generat la build: __VERSION__ și __FILES__ sunt înlocuite de scripts/build-sw.mjs.
// O versiune nouă așteaptă până se închide jocul: nu schimbă fișierele sub o partidă în curs.
const CACHE = 'wg-__VERSION__'
const FILES = __FILES__

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wg-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return
  e.respondWith((async () => {
    const c = await caches.open(CACHE)
    const hit = await c.match(e.request, { ignoreSearch: true })
    if (hit) return hit
    if (e.request.mode === 'navigate') { const page = await c.match('./'); if (page) return page }
    return fetch(e.request)
  })())
})
```

`scripts/build-sw.mjs` rulează după `vite build`: adună toate fișierele din `dist` în afară de `sw.js`, ca adrese relative (`'./'` pentru `index.html`, apoi `'./assets/…'`, `'./icons/…'`, `'./manifest.webmanifest'`), calculează versiunea din primele 12 caractere ale unui SHA-256 peste numele și conținutul lor, și scrie `dist/sw.js` din șablon. Tipărește câte fișiere a pus și versiunea.

`src/app/sw.ts` cheamă `register('./sw.js')` și înghite refuzul. `src/main.ts` îl cheamă cu `__WG_SW__ && import.meta.env.PROD`. `vite.config.ts` definește `__WG_SW__` ca `true`, iar `vite.single.config.ts` ca `false`: pagina privată nu are service worker.

`scripts/single-file.mjs` scoate din fragment legăturile spre manifest și spre pictogramă, care nu au rost în pagina privată; verificarea lui de referințe rămase trebuie să treacă în continuare.

În `.github/workflows/ci.yml` se adaugă `permissions: contents: read`.

- [ ] **Step 5: Verificările noi din `scripts/smoke.cjs`**

17. Manifestul se încarcă, iar cele trei pictograme răspund cu `image/png`.
18. Service worker-ul e activ și controlează pagina, iar cache-ul `wg-…` conține fiecare fișier din `dist` în afară de `sw.js`.
19. Fără rețea (`context.setOffline(true)`), după reîncărcare cartonașul de start se vede, iar după „Începe” canvasul e desenat. La sfârșit rețeaua se pornește la loc.

La final: `SMOKE OK (19 verificări)`. În capul fișierului, un rând care spune că scriptul merge doar pe Linux și macOS.

- [ ] **Step 6: Rulează tot**

Run: `npm run check && npm run smoke && npm run single`
Expected: toate trec. `dist/sw.js` există și nu mai conține `__VERSION__` sau `__FILES__`. `dist-single/world-guard.html` nu conține `sw.js`.

- [ ] **Step 7: Documentele**

`README.md`: cum se instalează pe telefon din Chrome, că merge fără internet după prima deschidere, că o versiune nouă apare la următoarea pornire, și comanda `npm run icons`. `CLAUDE.md`: fișierele noi la „Arhitectura”, comenzile noi, „Stare” la zi. `DEVLOG.md`: intrarea sesiunii se încheie cu ce s-a măsurat (mărimea unei salvări, numărul de fișiere din cache și mărimea lor) și cu ce rămâne, ca linii de bifat.

- [ ] **Step 8: Commit și push**

```bash
git add public scripts/make-icons.cjs scripts/sw-template.js scripts/build-sw.mjs scripts/single-file.mjs src/app/sw.ts src/app/sw.test.ts src/app/pwa.test.ts src/env.d.ts index.html src/main.ts vite.config.ts vite.single.config.ts package.json .github/workflows/ci.yml scripts/smoke.cjs README.md CLAUDE.md DEVLOG.md
git commit -m "Instalare pe telefon și joc fără internet"
git push
```

---

### Task 6: Proba pe telefonul lui Andrei

Nu e cod. După ce pull request-ul e unit și publicarea pe Pages a trecut, sesiunea care orchestrează îi cere lui Andrei, pe Samsung Galaxy A54:

1. să deschidă adresa jocului în Chrome și să aleagă „Instalează aplicația” din meniu;
2. să pornească jocul de pe ecranul de pornire, cu telefonul în mod avion, și să joace o partidă;
3. în timpul unei partide, să treacă în altă aplicație și înapoi: trebuie să găsească jocul pe pauză;
4. să închidă de tot aplicația în timpul unei partide și s-o redeschidă: trebuie să găsească „Continuă partida”;
5. să spună dacă ecranul s-a stins vreodată în timp ce juca.

Ce nu merge intră ca reparație înaintea planului 3.
