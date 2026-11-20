# World Guard, faza 3: plasa pentru dificultate și reechilibrarea. Plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O comandă arată cât rezistă cinci jucători automați, testele pică atunci când dificultatea iese din limitele din design, iar cifrele jocului sunt aduse în acele limite, cu rezervă.

**Architecture:** Jucătorii automați stau într-un folder nou, `src/bots/`, în afara jocului livrat: citesc starea simulării și întorc direcția joystickului, nimic altceva. Toți cei care investesc au aceeași purtare (apără planeta, apoi cumpără), iar diferența dintre ei e doar lista a ceea ce au voie să cumpere. Reechilibrarea schimbă doar cifre din `src/data/balance.ts`; regulile din `src/sim/` și forma stării nu se ating.

**Tech Stack:** TypeScript 7, Vite 8, Vitest 5, fără dependențe noi. Comanda tabelului rulează în Node, dintr-un build Vite de tip `ssr`.

**Spec:** `docs/GDD.md`, secțiunile „Plasa pentru dificultate”, „Scopuri pentru v1” (6 și 7), „Anti-scopuri” (primul) și „Când e gata v1”. La „Lăsat constructorului”: cum sunt scriși jucătorii automați și cifrele de echilibru.

**De la ce pornește.** `main` e la `676b1c9`: fazele 1 și 2 și tema de spațiu, publicate. `npm run check` are 143 de teste, `npm run smoke` are 20 de verificări. Andrei a cerut, pe 18.11.2026, să mergem mai departe fără să aștepte proba lui pe telefon.

## Ce a arătat explorarea (18.11.2026)

Înainte de plan am scris jucători automați de aruncat și i-am rulat pe 20 de semințe, cu cifrele de azi. Codul e în afara repo-ului: `/tmp/claude-0/-home-user/a770b5cb-4161-5755-a9f6-d4a7bd9dedf3/scratchpad/spike/bots.ts`. E referință de purtare pentru Task 1, nu cod de copiat orbește.

| Jucător | Mediana | Min | Max | Limita din design |
| --- | --- | --- | --- | --- |
| Nimic | 66 s | 59 | 82 | 60–130 s: în limită, la 6 s de margine |
| Amestec | 368 s | 341 | 401 | 240–360 s: peste limită |
| Doar navă | 240 s | 213 | 277 | cel mult 75% din Amestec: 65% |
| Fără navă | 329 s | 304 | 386 | cel mult 90% din Amestec: 89%, la margine |
| Fără economie | 289 s | 259 | 311 | fără limită |

Ce am mai aflat:

- **Fără apărat intenționat, jucătorii automați sunt proști.** „Amestec” care doar strânge și cumpără ține 86 s. De aceea toți cei care investesc apără planeta: lasă totul când o navă dușmană e la mai puțin de 120 de centrul planetei.
- **Tabelul depinde de raza de apărare.** Cu raza 80, „Fără navă” (332 s) bate „Amestec” (307 s). Cu 120 și 160, „Amestec” e în față (368 și 384 s). Raza din plasă e 120; celelalte două se tipăresc, ca informație.
- **„Doar navă” rămâne la nivelul 2 al navei**, fiindcă fără turele e ținută mereu lângă planetă și nu mai ajunge la metal. O navă de nivelul 5 primită pe gratis din prima secundă ține 358 s, aproape cât „Amestec”: plafonul navei e sus, dar drumul până la el nu se poate plăti.
- **Pârghia din design (grupuri simultane din părți opuse) nu ajută.** Încercată cu același număr total de nave: grupuri de 2 + 2 nu schimbă nimic (66% și 88%), iar grupuri de 3 + 3 fac jocul mai ușor (Amestec 413 s) și duc „Fără navă” la 100%, fiindcă lovitura navei prinde tot grupul deodată. Pârghia nu se construiește; rămâne notată în design ca încercată.
- **O partidă se simulează repede.** Tabelul întreg (100 de partide) durează cam 10 s.
- **Jucătorul de aruncat plătea din greșeală** când se oprea pe un cerc în timpul unei lupte. Cei adevărați nu au voie să stea pe un cerc care nu e ținta lor.

Cifrele jucătorilor adevărați vor ieși puțin altfel (în explorare, cercul de reparat nu era ocolit). Limitele și țintele de mai jos se verifică pe cei adevărați.

## Global Constraints

- Nicio dependență nouă în `package.json`. `src/bots/` nu e importat de `src/main.ts` și nu ajunge în jocul livrat.
- `src/sim/` nu se schimbă: nicio regulă nouă, niciun câmp nou în stare, `SAVE_VERSION` rămâne 1. Dacă o schimbare în `src/sim/` pare de neocolit, oprește-te și raportează.
- Un număr de joc scris în afara `src/data/` e o greșeală. Constantele jucătorilor automați (raza de apărare, distanțele de oprire) nu sunt cifre de joc și stau în `src/bots/`.
- `src/bots/` e determinist, ca `src/sim/`: fără `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`. Aceeași sămânță dă aceeași partidă pe orice mașină.
- Jucătorii automați doar citesc starea și întorc un `Input`. Nu scriu nimic în stare.
- Nu se schimbă felul în care se simte nava, aprobat de Andrei: viteza, raza loviturii, arcul, împinsul, ritmul loviturii, joystickul. Nu se schimbă harta și așezarea cercurilor.
- Limitele din plasă sunt cele din `docs/GDD.md` și nu se slăbesc ca să treacă. Niciun test nu se sare și nu se dezactivează.
- Stilul codului, ca în `src/sim/rng.ts`: fără `;`, ghilimele simple, 2 spații, identificatori în engleză, comentarii în română cu diacritice întregi.
- Cuvintele temei vechi nu apar în ce se scrie, nici ca identificatori: wood, stone, castle, tower, camp, quarry, swing, slash, blade, walk, ground, grass, dirt, rock, pine, trunk; castel, turn, lemn, piatră, copac, stâncă, tăietor, carieră, iarbă, teren, zid, sabie, steag, puiet.
- Textele cu diacritice și cu accente grave se editează cu unealta de editat fișiere, niciodată cu `sed`, `perl` sau heredoc.
- Înainte de fiecare commit: `npm run check` verde. Fiecare task adaugă rânduri la intrarea „18.11.2026 — Faza 3” din `DEVLOG.md`. Fișierele se stagează explicit, niciodată `git add -A`.
- Commit-urile merg pe ramura `ccr-a5a7e643-gpwbh0` și se încheie cu rândurile de atribuire ale sesiunii. Împinsul pe GitHub îl face cel care conduce execuția.

## Review Focus

1. **Un jucător automat rămas blocat după un obstacol.** Ar arăta ca o strategie slabă și ar strica tabelul fără nicio eroare. Așteptat: ajunge la orice cerc și la orice grup de resurse într-un timp mărginit. Teste în Task 1.
2. **Plata din greșeală pe un cerc străin.** „Fără navă” care se oprește pe cercul navei în timpul unei lupte ar cumpăra nivelul navei. Așteptat: la sfârșitul oricărei partide, fiecare jucător a cumpărat doar ce are voie. Teste în Task 1.
3. **Toate resursele de un fel sunt goale.** Așteptat: jucătorul merge la cea care crește prima și așteaptă acolo, fără eroare și fără împărțire la zero. Test în Task 1.
4. **O partidă care nu se mai termină.** După reechilibrare sau dintr-o greșeală, o strategie poate ține la nesfârșit. Așteptat: partida se oprește la plafonul de timp, iar tabelul arată asta. Teste în Task 1 și Task 2.
5. **Cifre care trec plasa dar strică jocul.** Un cost lipsă sau negativ, un nivel care nu se mai poate plăti. Așteptat: fiecare nivel al fiecărei clădiri are un cost întreg, pozitiv. Test în Task 3.

---

### Task 1: Jucătorii automați

**Files:**
- Create: `src/bots/policy.ts`, `src/bots/nav.ts`, `src/bots/bot.ts`, `src/bots/run.ts`
- Test: `src/bots/policy.test.ts`, `src/bots/nav.test.ts`, `src/bots/bot.test.ts`, `src/bots/run.test.ts`, `src/bots/discipline.test.ts`
- Modify: `DEVLOG.md`

**Interfaces:**
- Consumes: `createGame`, `GameState`, `Input`, `Pad`, `ResNode`, `Foe` din `src/sim/state.ts`; `step` din `src/sim/step.ts`; `BALANCE`, `cost` din `src/data/balance.ts`; `CORE`, `HOME`, `PAD_R` din `src/data/layout.ts`; `violations` din `src/sim/discipline.test.ts`; ajutoarele din `src/sim/testkit.ts`.
- Produces:

```ts
// policy.ts
export type BotName = 'nimic' | 'amestec' | 'doar-nava' | 'fara-nava' | 'fara-economie'
export type Category = 'turret' | 'economy' | 'hero'
export interface Policy { name: BotName; label: string; still: boolean; buy: readonly Category[] }
export const POLICIES: readonly Policy[]   // în ordinea tabelului din design
export const GUARD = 120                    // raza de apărare în jurul centrului planetei, px
export function bought(s: GameState): number
export function nextPad(s: GameState, buy: readonly Category[]): Pad | null
export type Goal =
  | { kind: 'none' }
  | { kind: 'fight'; foe: Foe }
  | { kind: 'pay'; pad: Pad }
  | { kind: 'gather'; node: ResNode; pad: Pad }
  | { kind: 'home' }
export function chooseGoal(s: GameState, p: Policy, guard?: number): Goal

// nav.ts
export interface Nav { toward(s: GameState, x: number, y: number, stop: number): Input }
export function createNav(): Nav
export function offForeignPad(s: GameState, target: Pad | null): Input | null

// bot.ts
export type Bot = (s: GameState) => Input
export function createBot(p: Policy, guard?: number): Bot

// run.ts
export const RUN_CAP = 900
export const SEEDS: readonly number[]      // 1 … 20
export interface Row { name: BotName; label: string; times: number[]; median: number; min: number; max: number }
export function playOne(p: Policy, seed: number, cap?: number, guard?: number): GameState
export function median(xs: readonly number[]): number
export function measure(p: Policy, guard?: number): Row
export function measureAll(guard?: number): Row[]
```

**Cele cinci purtări** (`POLICIES`, cu `label` în română, ca în design):

| `name` | `label` | `still` | `buy` |
| --- | --- | --- | --- |
| `nimic` | Nimic | `true` | `[]` |
| `amestec` | Amestec | `false` | `['turret', 'economy', 'hero']` |
| `doar-nava` | Doar navă | `false` | `['hero']` |
| `fara-nava` | Fără navă | `false` | `['turret', 'economy']` |
| `fara-economie` | Fără economie | `false` | `['turret', 'hero']` |

**Ce cumpără, pe rând** (`bought`, `nextPad`):
- `bought(s)` = nivelul navei minus 1, plus suma nivelurilor turelelor, colectorului și minei.
- Rândul e al categoriei `buy[bought(s) % buy.length]`. Dacă acea categorie nu mai are nimic de cumpărat, se ia următoarea din listă care are; dacă niciuna, `null`.
- Din categorie se alege: la `turret`, turela cu nivelul cel mai mic sub maxim (la egalitate, prima din `s.pads`); la `economy`, dintre colector și mină, cel cu nivelul mai mic sub maxim (la egalitate, colectorul); la `hero`, cercul navei, cât nava e sub nivelul maxim.

**Ce face la fiecare pas** (`chooseGoal`, în ordinea asta):
1. `p.still` sau nava doborâtă: `none`.
2. Dacă există o navă dușmană vie la mai puțin de `guard` de centrul planetei: `fight` cu cea mai apropiată de centru.
3. `nextPad` e `null`: `home`.
4. Dacă resursele din stoc acoperă ce a rămas de plătit la cerc (costul nivelului următor minus `paid`): `pay`.
5. Altfel `gather`: resursa care lipsește mai mult (la egalitate, cristalul); nodul nevid de acel fel cel mai aproape de navă; dacă toate sunt goale, cel cu `regrowAt` cel mai mic.

**Cum se mișcă** (`createBot`, cu un singur `Nav` pe jucător):
- `fight`: spre nava dușmană, oprit la `BALANCE.hero.reach × 0,7 + foe.r` de centrul ei.
- `pay`: spre centrul cercului, oprit la `PAD_R × 0,4`.
- `gather`: spre nod, oprit la `raza nodului + raza navei + BALANCE.node.reach − 4`.
- `home`: spre `HOME`, oprit la 6.
- Când ar sta pe loc și e la cel mult `PAD_R + 3` de centrul unui cerc care nu e ținta lui de plată (oricare, inclusiv cel de reparat), iese din cerc pe direcția dinspre centru (`offForeignPad`). Niciun jucător automat nu repară planeta.
- `Nav.toward`: direcția e vectorul unitate spre țintă. Dacă distanța până la țintă n-a scăzut cu cel puțin 1 px în ultimii 24 de pași, urmează 30 de pași de ocolire (90% perpendicular pe direcție, 10% înainte), cu partea schimbată la fiecare blocaj. O țintă nouă (mutată cu peste 40 px de la un pas la altul) șterge ce ținea minte. Metoda de ocolire e la alegerea ta, cât timp testele de ajuns trec.

**Rularea** (`run.ts`): `playOne` face `createGame(seed)`, un `createBot` nou și pași până când partida se termină sau `s.t >= cap`. `median` e media celor două din mijloc la un număr par. `measure` rulează `SEEDS` și întoarce timpii în ordinea semințelor.

- [ ] **Step 1: Testele, întâi.** Scrie-le pe toate și arată că pică (modulele nu există).

`policy.test.ts`:
- pe o partidă nouă, `nextPad` pentru `amestec` e prima turelă; cu prima turelă la nivelul 1, e colectorul; apoi cercul navei; apoi a doua turelă (nivelul cel mai mic, prima din listă);
- o categorie fără nimic de cumpărat e sărită (toate turelele la maxim: `amestec` trece la economie); cu totul la maxim, `null`;
- `bought` pe o stare cu nava de nivelul 3, turele 2-1-0-0, colector 1, mină 0 este 6;
- `chooseGoal`: o navă dușmană la 100 de centru dă `fight`, chiar dacă plata e acoperită; la `GUARD + 50` nu; dintre două, cea mai apropiată de centru;
- lipsă 5 cristale și 10 metal: `gather` pe cel mai apropiat asteroid nevid; cu toți asteroizii goi, pe cel cu `regrowAt` cel mai mic (Review Focus 3);
- stoc suficient: `pay` pe cercul lui `nextPad`; `nimic`: `none`; nava doborâtă: `none`; `doar-nava` cu nava la nivelul maxim: `home`.

`nav.test.ts` (pe `createGame(1)` cu `s.spawnT = 1e9`, adică harta adevărată fără nave dușmane) (Review Focus 1):
- din `HOME`, nava condusă cu `toward` ajunge la fiecare dintre cele 8 cercuri (oprire `PAD_R × 0,4`) în cel mult `distanța / 165 × 1,6 + 2` secunde;
- la fel pentru primul nod din fiecare dintre cele 9 grupuri de resurse (oprirea de la `gather`);
- de la (550, 900) la (550, 600), cu planeta exact pe drum, ajunge în aceeași margine;
- după ce a ajuns la o țintă și primește una nouă, primul pas e exact vectorul unitate spre ea (fără ocolire rămasă);
- `offForeignPad`: nava în centrul cercului navei, cu altă țintă, primește o direcție nenulă; la 10 px de centru, direcția e dinspre centru; cu acel cerc ca țintă, `null`; în afara oricărui cerc, `null`.

`bot.test.ts` (Review Focus 2):
- `playOne` pe semințele 1, 2, 3 pentru fiecare purtare: `fara-nava` se încheie cu nava la nivelul 1; `doar-nava` cu toate turelele, colectorul și mina la 0; `fara-economie` cu colectorul și mina la 0; `nimic` cu `s.hero.moved === false`; niciuna nu a reparat (viața planetei nu crește niciodată de la un pas la altul: verifică în buclă, pe sămânța 1);
- `amestec`, sămânța 1: prima turelă e la nivelul 1 înainte de secunda 8; la secunda 120 `bought(s) >= 4`;
- un jucător automat nu scrie în stare: pentru aceeași stare, `JSON.stringify(s)` e același înainte și după `bot(s)`.

`run.test.ts`:
- `playOne(amestec, 5)` de două ori dă același `JSON.stringify`;
- `playOne(p, 1, 30)` se oprește la `s.t >= 30` cu partida încă în joc (Review Focus 4);
- `median([3, 1, 2])` este 2, `median([4, 1, 3, 2])` este 2,5;
- `SEEDS` are 20 de valori diferite; `measure(nimic)` are 20 de timpi, cu `min <= median <= max`.

`discipline.test.ts`: fiecare fișier `.ts` din `src/bots/` care nu e test trece de `violations` (importat din `../sim/discipline.test`).

- [ ] **Step 2: Rulează-le și arată că pică.** `npx vitest run src/bots`. Așteptat: FAIL, modulele lipsesc.
- [ ] **Step 3: Scrie cele patru module**, cu semnăturile de mai sus.
- [ ] **Step 4: Rulează testele.** `npx vitest run src/bots`. Așteptat: PASS. Notează cât durează.
- [ ] **Step 5: Măsoară și notează.** Cu un script de aruncat în afara repo-ului (sau cu un test temporar pe care îl ștergi), tipărește mediana, minimul și maximul fiecărei purtări pe cele 20 de semințe și timpul total. Trece cifrele în `DEVLOG.md`, la o intrare nouă „18.11.2026 — Faza 3”, lângă cele din explorare.
- [ ] **Step 6: `npm run check`, apoi commit.**

```bash
git add src/bots DEVLOG.md
git commit -m "Faza 3: jucătorii automați"
```

---

### Task 2: Tabelul și comanda lui

**Files:**
- Create: `src/bots/limits.ts`, `src/bots/table.ts`, `vite.balance.config.ts`
- Test: `src/bots/limits.test.ts`
- Modify: `package.json` (scriptul `balance`), `.gitignore` (`dist-balance/`), `README.md`, `DEVLOG.md`

**Interfaces:**
- Consumes: `Row`, `measureAll`, `RUN_CAP` din `src/bots/run.ts`; `BotName` din `src/bots/policy.ts`.
- Produces:

```ts
// limits.ts
export const LIMITS = {
  nimic: { min: 60, max: 130 },        // secunde, pe mediană
  amestec: { min: 240, max: 360 },     // secunde, pe mediană
  doarNava: 0.75,                      // cel mult atât din mediana „Amestec”
  faraNava: 0.9,                       // cel mult atât din mediana „Amestec”
} as const
export interface Verdict { name: BotName; label: string; ok: boolean | null; limit: string; value: string }
export function verdicts(rows: readonly Row[]): Verdict[]   // un verdict pe rând, în ordinea rândurilor; ok === null înseamnă „fără limită”
export function formatTable(rows: readonly Row[]): string
```

- `verdicts`: limitele sunt închise (60 și 130 trec; 75% fix trece). `value` e mediana în secunde întregi, iar la „Doar navă” și „Fără navă” și procentul din „Amestec”. Lipsa rândului „Amestec” aruncă o eroare cu mesaj.
- `formatTable`: un rând de antet și câte un rând pe jucător, cu eticheta, mediana, minimul, maximul, limita și „în limită”, „ÎN AFARA LIMITEI” sau „fără limită”. O mediană egală cu `RUN_CAP` se scrie „≥ 900” (Review Focus 4).
- `table.ts`: tipărește `formatTable(measureAll())`. Cu argumentul `--raze`, tipărește și tabelele pentru razele de apărare 80 și 160, cu un titlu fiecare. Iese mereu cu codul 0: e un afișaj, limitele le păzesc testele.
- `vite.balance.config.ts`: `publicDir: false`, `logLevel: 'warn'`, `build: { ssr: 'src/bots/table.ts', outDir: 'dist-balance', emptyOutDir: true }`.
- `package.json`: `"balance": "vite build --config vite.balance.config.ts && node dist-balance/table.js"`.

- [ ] **Step 1: Testul, întâi** (`limits.test.ts`, cu rânduri făcute de mână):
  - toate în limită: cinci verdicte, primele patru `ok === true`, al cincilea `null`;
  - „Nimic” la 59 și la 131: `false`; la 60 și la 130: `true`;
  - „Amestec” la 361: `false`; „Doar navă” la 76% din „Amestec”: `false`, la 75%: `true`; „Fără navă” la 91%: `false`, la 90%: `true`;
  - fără rândul „Amestec”: aruncă;
  - `formatTable`: conține fiecare etichetă, „ÎN AFARA LIMITEI” pentru un rând picat, „≥ 900” pentru o mediană de 900.
- [ ] **Step 2: Rulează-l și arată că pică.** `npx vitest run src/bots/limits.test.ts`.
- [ ] **Step 3: Scrie `limits.ts`, `table.ts`, configul și scriptul.**
- [ ] **Step 4: Rulează.** `npx vitest run src/bots/limits.test.ts` trece; `npm run balance` tipărește tabelul; `npm run balance -- --raze` tipărește trei tabele. `git status` nu arată `dist-balance/`. `npm run bundle` nu pune nimic din `src/bots/` în `dist` (caută `fara-economie` în `dist/assets/*.js`: nicio potrivire).
- [ ] **Step 5: Documente.** În `DEVLOG.md`, ieșirea întreagă a `npm run balance -- --raze` cu cifrele de azi și timpul comenzii. În `README.md`, comanda, lângă celelalte.
- [ ] **Step 6: `npm run check`, apoi commit.**

```bash
git add src/bots/limits.ts src/bots/limits.test.ts src/bots/table.ts vite.balance.config.ts package.json .gitignore README.md DEVLOG.md
git commit -m "Faza 3: tabelul jucătorilor automați și comanda lui"
```

---

### Task 3: Reechilibrarea și plasa

**Files:**
- Create: `src/bots/net.test.ts`
- Modify: `src/data/balance.ts`, `src/data/balance.test.ts`, `src/sim/run.test.ts`, alte teste care fixează o cifră schimbată, `docs/GDD.md` (doar tabelul „Cifrele de pornire”), `DEVLOG.md`

**Interfaces:**
- Consumes: `measureAll` din `src/bots/run.ts`; `verdicts`, `LIMITS` din `src/bots/limits.ts`.
- Produces: `src/bots/net.test.ts`, cu limitele ca teste; cifrele noi din `BALANCE`.

**Ținta.** Limitele din design sunt cele din `LIMITS` și le păzește testul. Reechilibrarea țintește mai strâns, ca o schimbare mică de mai târziu să nu pice plasa:

| Jucător | Limita (testul) | Ținta reechilibrării |
| --- | --- | --- |
| Nimic | 60–130 s | 62–125 s |
| Amestec | 240–360 s | 270–330 s |
| Doar navă | cel mult 75% din Amestec | cel mult 70% |
| Fără navă | cel mult 90% din Amestec | cel mult 85% |
| Fără economie | fără limită | sub mediana „Amestec” (doar de notat) |

**Pârghiile, în ordinea în care se încearcă.** Toate sunt cifre din `src/data/balance.ts`.
1. Nava ca investiție: costul nivelurilor navei, `hpPerLevel`, `dmgPerLevel`, `regen`, `regenWait`, `respawn`. Asta mișcă „Fără navă” față de „Amestec”.
2. Presiunea dușmanilor: constantele din `spawnEvery` și `foeHp`, cifrele navei grele. Asta așază „Amestec” în bandă. „Nimic” e la 6 s de limita de jos, deci primul minut trebuie să rămână cum e: umblă la termenii de creștere în timp, nu la valorile de pornire.
3. Turelele și economia: lovitura, ritmul și costul turelelor, ritmul și costul colectorului și al minei, resursele de pornire, viața planetei.

**Ce nu se atinge** (vezi și Global Constraints): viteza navei, `reach`, `arc`, `push`, `pushBrute`, `strikeEvery`, joystickul, harta, așezarea cercurilor, orice din `src/sim/`, purtarea jucătorilor automați din `src/bots/` (dacă găsești acolo o greșeală, raporteaz-o; n-o repara în tăcere). Nu se construiește pârghia cu grupuri din părți opuse (vezi „Ce a arătat explorarea”).

**Cum se caută.**
- O încercare înseamnă: schimbi cifre, rulezi `npm run balance`, notezi tabelul. Ține un jurnal al încercărilor (ce ai schimbat, cele cinci mediane, cele două procente).
- Schimbă cât mai puține cifre și cât mai puțin. O cifră schimbată fără efect măsurat se pune la loc.
- Cel mult 40 de încercări. Dacă țintele nu ies, oprește-te la cea mai bună încercare care trece limitele din design și raportează ce ține pe loc; dacă nici limitele nu ies, raportează BLOCKED cu jurnalul.
- La sfârșit rulează și `npm run balance -- --raze` și notează cele trei tabele. Razele 80 și 160 sunt informație, nu țintă.

- [ ] **Step 1: Testul plasei, întâi.** `src/bots/net.test.ts`, cu `{ timeout: 120_000 }`: un singur `measureAll()` pentru tot fișierul, apoi câte un test pe limită, din `verdicts` (`ok !== false`), cu mesajul care arată valoarea și limita. Plus un test că fiecare partidă s-a încheiat sub `RUN_CAP`.
- [ ] **Step 2: Rulează-l cu cifrele de azi.** `npx vitest run src/bots/net.test.ts`. Notează ce pică și ce trece, și cât durează. (În explorare pica doar „Amestec”.)
- [ ] **Step 3: Testul costurilor** (Review Focus 5), în `src/data/balance.test.ts`: pentru `turret`, `collector`, `mine` (nivelurile 1 … maxim) și `hero` (2 … maxim), `cost` dă numere întregi, cel puțin 0, cu suma mai mare ca 0; `spawnEvery(t)` e pozitiv și nu crește cu `t`; `foeHp(t)` e pozitiv și nu scade cu `t`, pentru `t` din 0 în 0, 600, pas 30.
- [ ] **Step 4: Caută cifrele**, după regulile de mai sus.
- [ ] **Step 5: Adu la zi testele care fixează cifre schimbate.** Doar valoarea așteptată, acolo unde testul repetă o cifră din design (`balance.test.ts` și altele asemenea). Un test de logică nu se slăbește. Din `src/sim/run.test.ts` scoate testul „fără niciun gest, nucleul cade după aproximativ un minut”: limita lui e acum în plasă, pe 20 de semințe.
- [ ] **Step 6: Adu la zi tabelul „Cifrele de pornire” din `docs/GDD.md`**: doar rândurile ale căror cifre s-au schimbat, cu valoarea nouă. Titlul secțiunii și restul documentului rămân pentru Task 4.
- [ ] **Step 7: Rulează tot.** `npx vitest run src/bots/net.test.ts` trece; `npm run check` e verde (spune numărul de teste și cât a durat `npm test`); `npm run smoke` trece cu 20 de verificări.
- [ ] **Step 8: `DEVLOG.md`**: fiecare cifră schimbată, înainte și după, cu motivul; tabelul de dinainte și cel de după; cele trei tabele cu razele; jurnalul încercărilor, pe scurt; ce ținte au ieșit și ce nu.
- [ ] **Step 9: Commit.**

```bash
git add src/bots/net.test.ts src/data/balance.ts src/data/balance.test.ts src/sim/run.test.ts docs/GDD.md DEVLOG.md
git commit -m "Faza 3: reechilibrarea și limitele ca teste"
```

(Adaugă la `git add` orice alt test adus la zi la Step 5.)

---

### Task 4: Documentele

**Files:**
- Modify: `docs/GDD.md`, `CLAUDE.md`, `README.md`, `DEVLOG.md`

**Interfaces:**
- Consumes: ce au construit Task 1–3 și cifrele din `DEVLOG.md`.
- Produces: documentele proiectului la zi. Niciun fișier de cod nu se schimbă.

- [ ] **Step 1: `docs/GDD.md`.**
  - Data din antet: actualizat pe 2026-11-18 (tema de spațiu, plasa pentru dificultate).
  - „Cifrele de pornire” devine „Cifrele jocului”, cu o propoziție: sunt cifrele de după reechilibrarea din 18.11.2026; cele cu care s-a încheiat prototipul sunt în `DEVLOG.md`.
  - „Plasa pentru dificultate”: tabelul rămâne; sub el, cum sunt făcuți jucătorii automați (aceeași purtare, liste diferite de cumpărături; apără la 120 de centrul planetei; nu repară), comanda `npm run balance`, tabelul măsurat după reechilibrare și ce arată razele 80 și 160. Paragraful despre grupurile din părți opuse rămâne, cu o frază adăugată: a fost încercată în explorare, cu cifrele de acolo, și nu s-a construit. Propoziția „Limita «Doar navă» nu e îndeplinită de cifrele de pornire…” se aduce la zi: cu jucători care apără, era îndeplinită; peste limită era „Amestec”.
  - „Cine a hotărât ce”, la „Hotărât de Claude, nevăzut încă de Andrei”: purtarea jucătorilor automați; cifrele schimbate la reechilibrare (enumerate); pârghia cu grupurile, nefolosită.
  - „Ce a arătat prototipul”: o frază care trimite la măsurătorile noi.
- [ ] **Step 2: `CLAUDE.md`.** La „Comenzi”, `npm run balance`. La „Arhitectura”, `src/bots/` (ce e în fiecare fișier, că nu intră în jocul livrat, că e păzit de aceeași disciplină ca `src/sim/`). La „Stare”: faza 3 în cod, cu numărul de teste; „Urmează” fără planul 3.
- [ ] **Step 3: `README.md`.** Starea (planul 3 în cod) și un paragraf scurt „Plasa pentru dificultate”: ce arată comanda și ce păzesc testele.
- [ ] **Step 4: `DEVLOG.md`.** Încheierea intrării „18.11.2026 — Faza 3”: ce s-a livrat, ce rămâne (proba lui Andrei pe telefon: fazele 2 și 3; cum se simte dificultatea nouă).
- [ ] **Step 5: Verifică.** Numerele (teste, verificări, mediane) sunt aceleași în cele patru documente și se potrivesc cu `npm run check` și `npm run balance` rulate acum. Diacriticele sunt întregi. `npm run check` e verde.
- [ ] **Step 6: Commit.**

```bash
git add docs/GDD.md CLAUDE.md README.md DEVLOG.md
git commit -m "Faza 3: documentele la zi"
```

---

## După plan

- Recenzia întregii ramuri, apoi pull request către `main`. Îmbinarea o cere Andrei.
- Proba lui Andrei pe telefon acoperă atunci fazele 2 și 3 împreună.
- Cu faza 3, lista „Scopuri pentru v1” din design e acoperită în cod. Ce vine după v1 are nevoie de hotărârea lui Andrei.
