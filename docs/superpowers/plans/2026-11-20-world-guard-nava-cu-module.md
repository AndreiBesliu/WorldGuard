# World Guard, nava cu module. Plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nava strânge experiență, urcă niveluri plătite la cercul ei și, la fiecare nivel, jucătorul alege un modul din trei oferte, cu jocul pe pauză; modulele (arme, corp, utilitare) schimbă cum luptă și cum arată nava.

**Architecture:** Experiența, modulele și oferta deschisă fac parte din starea simulării; cât o ofertă e deschisă, `step` nu schimbă nimic, iar alegerea intră printr-o comandă separată, `choose`. Cifrele modulelor stau în `src/data/`. Panoul de alegere e HTML peste canvas, ca celelalte cartonașe. Jucătorii automați aleg după liste fixe, iar plasa pentru dificultate rămâne poarta: fiecare task care schimbă echilibrul o lasă trecând.

**Tech Stack:** TypeScript 7, Vite 8, Vitest 5, Canvas 2D, fără dependențe de rulare. Playwright (deja pe mașină) pentru proba din browser.

**Spec:** `docs/superpowers/specs/2026-11-20-nava-cu-module-design.md` (aprobat de Andrei pe 2026-11-20). Machetele: `docs/machete-nava-cu-module.html`. Regulile de azi: `docs/GDD.md`.

**De la ce pornește.** Ramura `ccr-a5a7e643-gpwbh0` e la `429fb7d`: fazele 1–3 și designul acestei etape. `npm run check` are 232 de teste (cu plasa), `npm run smoke` are 20 de verificări. Tabelul de azi (`npm run balance`, raza 120): Nimic 66 s · Amestec 335 s · Doar navă 221 s (66,1%) · Fără navă 250 s (74,8%) · Fără economie 256 s.

## Global Constraints

- Nicio dependență nouă. `src/sim/` rămâne determinist și fără DOM: fără `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`; hazardul vine din `createRng(seed, 'nume-flux')`.
- Starea e din date simple și trece prin JSON neschimbată: fără câmpuri opționale, fără `null` în afara lui `offer`, fără zero negativ. `SAVE_VERSION` devine 2 în Task 1 și rămâne 2; orice câmp nou adus de un task ulterior aduce la zi amprenta din `src/app/save.test.ts`.
- Un număr de joc scris în afara `src/data/` e o greșeală. Toate textele pentru jucător stau în `src/ui/strings.ts`, în română.
- Cât o ofertă e deschisă (`s.offer !== null`), `step` nu schimbă nimic din stare.
- Ofertele depind doar de sămânța partidei, de nivelul navei și de modulele ei.
- Nu se schimbă: harta și cercurile, joystickul, viteza navei fără Motor, și felul în care se simte Unda la treapta 1 (raza 58, o lovitură la 0,45 s, arcul 1,25 rad, împinsul 140 / 60).
- Limitele plasei sunt cele din `src/bots/limits.ts` și nu se slăbesc. Niciun test nu se sare și nu se dezactivează. `npm run check` (cu plasa) e verde la sfârșitul fiecărui task.
- Pe canvas: fără `shadowBlur` și fără `ctx.filter`; gradient și decupaj doar în `src/render/orbit/scene.ts`. Încețoșarea panoului se face în CSS.
- `src/bots/` nu ajunge în jocul livrat și doar citește starea (alegerea ofertei o face rularea, prin `choose`).
- Stilul codului, ca în `src/sim/rng.ts`: fără `;`, ghilimele simple, 2 spații, identificatori în engleză, comentarii în română cu diacritice întregi.
- Cuvintele temei vechi nu apar, nici ca identificatori: wood, stone, castle, tower, camp, quarry, swing, slash, blade, walk, ground, grass, dirt, rock, pine, trunk; castel, turn, lemn, piatră, copac, stâncă, tăietor, carieră, iarbă, teren, zid, sabie, steag, puiet.
- Fișierele cu diacritice și accente grave se editează cu unealta de editat fișiere, niciodată cu `sed`, `perl` sau heredoc.
- Înainte de fiecare commit: `npm run check` verde. Fiecare task adaugă rânduri la o intrare „20.11.2026 — Nava cu module” din `DEVLOG.md` (Task 1 o creează). Fișierele se stagează explicit, niciodată `git add -A`. Împinsul pe GitHub îl face cel care conduce execuția.
- Cifrele noi sunt propuneri până le vede Andrei în joc; așa se scriu în `DEVLOG.md`.

## Review Focus

1. **Jocul e închis cu oferta deschisă.** La reluare apare aceeași alegere, cu aceleași oferte, iar partida continuă identic cu una neîntreruptă. Teste în Task 1 și Task 4.
2. **O atingere rătăcită alege un modul.** Degetul ridicat de pe joystick deasupra unei oferte nu alege nimic. Test în Task 4.
3. **Nu mai e nimic de oferit.** Cu locurile pline și toate modulele la treapta 3, nivelul nu deschide panoul; cu mai puțin de trei lucruri posibile, ofertele sunt câte se pot. Teste în Task 1.
4. **Experiența și plata la margini.** Cercul navei nu primește nimic sub prag; experiența în plus trece la nivelul următor; două niveluri gata se plătesc pe rând. Teste în Task 1.
5. **Tragerile fără țintă și loviturile în același pas.** Racheta a cărei țintă dispare lovește zona de la ultimul punct știut; scutul oprește o singură lovitură când vin două în același pas; nava doborâtă nu trage. Teste în Task 2.

---

### Task 1: Experiența, pragul și mecanica ofertelor

Nimic nu se vede încă în joc în afara faptului că nivelul navei cere experiență. Lista modulelor care se pot oferi (`BALANCE.hero.offerPool`) rămâne goală până la Task 2, deci nicio ofertă nu se deschide într-o partidă.

**Files:**
- Create: `src/data/modules.ts`, `src/sim/mods.ts`, `src/sim/mods.test.ts`
- Modify: `src/sim/state.ts`, `src/sim/step.ts`, `src/sim/pads.ts`, `src/sim/foes.ts`, `src/data/balance.ts`, `src/app/save.ts` (`SAVE_VERSION`), `src/bots/policy.ts`, `src/bots/run.ts`, `DEVLOG.md`
- Test: `src/sim/mods.test.ts`, `src/sim/pads.test.ts`, `src/sim/foes.test.ts`, `src/sim/step.test.ts` sau `run.test.ts`, `src/app/save.test.ts` (amprenta), `src/bots/policy.test.ts`

**Interfaces:**
- Consumes: `createRng` (`src/sim/rng.ts`), `Result`, `ok`, `fail` (`src/sim/result.ts`), `cost` (`src/data/balance.ts`).
- Produces:

```ts
// src/data/modules.ts — doar date și tipuri
export type ModId = 'wave' | 'laser' | 'missile' | 'armor' | 'shield' | 'mender' | 'engine' | 'magnet' | 'relay'
export type ModKind = 'weapon' | 'body' | 'utility'
export const MAX_TIER = 3
export const MOD_KIND: Record<ModId, ModKind>
export const MOD_IDS: readonly ModId[]            // toate nouă, în ordinea de mai sus

// src/sim/state.ts
export interface Mod { id: ModId; tier: number; t: number }     // t: ceasul modulului (0 unde nu are)
export interface Offer { id: ModId; tier: number }              // tier 1 = modul nou; 2 sau 3 = întărire până la acea treaptă
// Hero capătă:  xp: number; mods: Mod[]          (pornește cu xp 0 și [{ id: 'wave', tier: 1, t: 0 }])
// GameState capătă:  offer: Offer[] | null       (pornește null)

// src/sim/mods.ts
export function tierOf(s: GameState, id: ModId): number         // 0 dacă nava nu are modulul
export function slotsAt(level: number): number                  // din BALANCE.hero.slots
export function xpNeed(level: number): number | null            // experiența pentru nivelul următor; null la nivelul maxim
export function heroReady(s: GameState): boolean                // sub nivelul maxim și cu xp >= pragul
export function makeOffer(s: GameState, pool?: readonly ModId[]): Offer[] | null   // implicit BALANCE.hero.offerPool; null dacă nu e nimic de oferit
export function choose(s: GameState, index: number): Result<Offer>
```

- `BALANCE.hero` capătă: `xpToLevel: [6, 10, 13, 16]` (pentru nivelurile 2–5; Task 2 o lungește), `slots: [2, 2, 3, 3, 4, 4, 5, 5, 6]` (pe nivel, de la 1), `offerPool: [] as ModId[]`. `BALANCE.foe` capătă `xp: { grunt: 1, brute: 4 }`. Nivelul maxim rămâne 5 și „+10 lovitură, +20 viață pe nivel” rămân neatinse în acest task.

**Regulile:**
- Experiența: în `src/sim/foes.ts`, acolo unde un dușman doborât urcă `kills`, urcă și `hero.xp` (1 sau 4), oricine l-a doborât și chiar dacă nava e doborâtă. La nivelul maxim experiența nu mai crește.
- Plata: cercul navei primește plată doar când `heroReady(s)`. Altfel se poartă ca un cerc fără nimic de cumpărat (`nextCost` întoarce `null`), iar `dwell` nu pornește plata.
- Nivelul: la terminarea plății, pragul se scade din `xp` (restul rămâne), nivelul urcă, viața se umple ca azi, apoi `s.offer = makeOffer(s)`.
- `step`: dacă `s.offer !== null`, iese imediat, înaintea oricărei schimbări (nici `tick`, nici `t`).
- `makeOffer`: candidații sunt, din `pool`, modulele pe care nava nu le are (doar dacă `mods.length < slotsAt(lvl)`), ca `{ id, tier: 1 }`, și modulele pe care le are sub `MAX_TIER`, ca `{ id, tier: tier + 1 }`. Unda (`wave`) poate fi întărită doar dacă e în `pool`. Se întorc cel mult trei, diferiți; dacă există cel puțin un candidat nou, cel puțin unul dintre cei aleși e nou; dacă există cel puțin o întărire, cel puțin unul e întărire. Ordinea și alegerea vin din `createRng(s.seed, 'oferta-' + s.hero.lvl)`. Fără candidați: `null`.
- `choose`: fără ofertă deschisă sau cu index în afara ei, `fail` cu motiv („nicio ofertă deschisă”, „ofertă inexistentă”) și starea neatinsă. Altfel pune modulul (`{ id, tier: 1, t: 0 }`) sau îi urcă treapta, pune `s.offer = null` și întoarce oferta aleasă.
- Jucătorii automați: în `src/bots/policy.ts`, categoria `hero` se sare când `!heroReady(s)` (altfel ar aștepta la un cerc care nu primește plată). În `src/bots/run.ts`, bucla din `playOne` devine: dacă `s.offer !== null`, `choose(s, 0)`; altfel `step(s, bot(s))`.

- [ ] **Step 1: Testele, întâi.** Scrie-le și arată că pică.
  - `mods.test.ts`: `slotsAt` pentru nivelurile 1–9 dă 2, 2, 3, 3, 4, 4, 5, 5, 6; `xpNeed(1)` este 6 și `xpNeed(5)` este `null`; `heroReady` e fals la xp 5 și adevărat la 6; `tierOf` dă 1 pentru `wave` și 0 pentru `laser` pe o partidă nouă.
  - `makeOffer` cu `pool = MOD_IDS`, pe o navă de nivelul 2 doar cu Unda: trei oferte diferite, cel puțin una nouă, cel puțin o întărire (a Undei); aceeași stare dă de două ori aceleași oferte; alt `seed` sau alt nivel dă, pe 20 de semințe, cel puțin două rezultate diferite. Cu locurile pline: nicio ofertă nouă. Cu locurile pline și toate modulele la treapta 3: `null` (Review Focus 3). Cu un singur candidat: o singură ofertă. Cu `pool` gol: `null`.
  - `choose`: pune modulul nou cu treapta 1; urcă treapta la întărire; închide oferta; fără ofertă sau cu index 3 întoarce `fail` și nu schimbă starea (`JSON.stringify` egal).
  - `step` cu oferta deschisă: după 120 de pași, `JSON.stringify(s)` e neschimbat; după `choose`, următorul pas urcă `tick`.
  - Reluarea (Review Focus 1): o partidă cu ofertă deschisă trecută prin `JSON.parse(JSON.stringify(s))`, apoi `choose(…, 1)` și 600 de pași, dă aceeași stare ca partida neîntreruptă.
  - `foes.test.ts`: un dușman doborât de o turelă dă 1 experiență, unul greu 4; și cu nava doborâtă; la nivelul maxim experiența nu crește.
  - `pads.test.ts` (Review Focus 4): cu resurse destule și xp 5, zece secunde pe cercul navei nu plătesc nimic și nu schimbă stocul; cu xp 6 nivelul se plătește, xp devine 0; cu xp 20 la nivelul 1, după plată xp e 14 și cercul primește imediat plata pentru nivelul 3 (prag 10), fără al doilea nivel în aceeași plată; după plată, cu `offerPool` gol, `s.offer` e `null`.
  - `save.test.ts`: `SAVE_VERSION` e 2, amprenta are `hero.xp`, `hero.mods[].id/tier/t` și `offer` (cu o ofertă deschisă în starea reprezentativă, ca tipul elementelor să intre în amprentă); o salvare cu versiunea 1 e respinsă cu „altă versiune”.
  - `policy.test.ts`: `nextPad` pentru `amestec` sare peste cercul navei când xp e sub prag și îl alege când pragul e atins.
- [ ] **Step 2: Rulează-le.** `npx vitest run src/sim src/app/save.test.ts src/bots/policy.test.ts`. Așteptat: FAIL.
- [ ] **Step 3: Scrie codul**, cu semnăturile și regulile de mai sus.
- [ ] **Step 4: Rulează testele taskului, apoi plasa.** `npx vitest run src/bots/net.test.ts`. Pragul de experiență întârzie nivelurile navei, deci tabelul se mișcă. Dacă o limită pică, ai voie să schimbi doar `xpToLevel`; cel mult 8 încercări cu `npm run balance`, notate. Dacă nu iese, raportează BLOCKED cu tabelul.
- [ ] **Step 5: `DEVLOG.md`**: intrarea nouă „20.11.2026 — Nava cu module”, cu ce s-a făcut, tabelul de dinainte și de după, cifrele alese (propuneri).
- [ ] **Step 6: `npm run check`, apoi commit.**

```bash
git add src/data/modules.ts src/sim/mods.ts src/sim/mods.test.ts src/sim/state.ts src/sim/step.ts src/sim/pads.ts src/sim/foes.ts src/data/balance.ts src/app/save.ts src/app/save.test.ts src/bots/policy.ts src/bots/run.ts DEVLOG.md
git commit -m "Nava cu module: experiența, pragul și mecanica ofertelor"
```

(Adaugă la `git add` testele atinse.)

---

### Task 2: Cele nouă module

Modulele capătă efecte, lista de oferit se umple, nivelul navei merge până la 9, iar lovitura nu mai crește cu nivelul. De aici jocul chiar se schimbă.

**Files:**
- Modify: `src/data/modules.ts`, `src/data/balance.ts`, `src/sim/state.ts`, `src/sim/hero.ts`, `src/sim/combat.ts`, `src/sim/pads.ts`, `src/sim/mods.ts`, `src/app/session.ts`, `src/bots/policy.ts`, `src/bots/run.ts`, `src/render/world.ts` sau `src/render/orbit/things.ts` (doar cât să nu se strice desenul cu câmpurile noi), `DEVLOG.md`
- Test: `src/sim/mods.test.ts`, `src/sim/combat.test.ts`, `src/sim/hero.test.ts`, `src/sim/run.test.ts`, `src/app/save.test.ts`, `src/app/session.test.ts`, `src/bots/bot.test.ts`, `src/data/balance.test.ts`

**Interfaces:**
- Consumes: tot ce a produs Task 1.
- Produces:

```ts
// src/data/modules.ts
export const MODS: { … }   // cifrele pe trepte, vezi tabelul; index 0 = treapta 1
// src/sim/state.ts
// Shot capătă:  kind: 'bolt' | 'missile'; blast: number     (turela: 'bolt', 0)
// Fx capătă:    { kind: 'beam'; x; y; tx; ty; t0 } | { kind: 'blast'; r; x; y; t0 } | { kind: 'block'; x; y; t0 }
// src/bots/policy.ts
// Policy capătă:  prefer: readonly ModId[]
export function pickOffer(s: GameState, p: Policy): number      // indexul ofertei alese
// src/app/session.ts — trecător, până la Task 4: în `advance`, o ofertă deschisă se alege singură (prima)
```

**Cifrele de pornire** (în `MODS`; se reglează la Task 3):

| Modul | Treptele 1 / 2 / 3 |
| --- | --- |
| `wave` | lovitură 10 / 16 / 24; arc 1,25 / 1,6 / 2,0 rad; raza, ritmul și împinsul rămân cele din `BALANCE.hero` |
| `laser` | rază 170; o tragere la 0,9 s; lovitură 14 / 22 / 32 |
| `missile` | rază 200; una la 2,4 s; viteză 240/s; zonă 50; lovitură 12 / 18 / 26 |
| `armor` | +30 / +60 / +100 viață maximă |
| `shield` | se reface în 6 / 4,5 / 3 s |
| `mender` | refacerea pornește după 2 / 1,5 / 1 s fără lovituri; 6 / 9 / 12 viață pe secundă |
| `engine` | viteză × 1,12 / 1,22 / 1,30 |
| `magnet` | distanța de strâns 40 / 60 / 80; timpul între bucăți × 0,8 / 0,65 / 0,5 |
| `relay` | turelele la cel mult 220 de navă; timpul între trageri ÷ 1,2 / 1,35 / 1,5 |

`BALANCE.hero`: `maxLevel: 9`, `xpToLevel: [6, 10, 13, 16, 20, 24, 28, 34]` (primele patru rămân cele alese la Task 1), `hpPerLevel: 10`, `offerPool` = toate nouă; `dmg` și `dmgPerLevel` dispar (lovitura Undei vine din `MODS.wave`).

**Regulile:**
- `wave`: lovitura și arcul după treaptă; restul neschimbat. `heroDamage(s)` întoarce lovitura Undei de acum.
- `laser`: când ceasul lui ajunge la zero și există un dușman viu la cel mult `rază` (de la centrul navei la marginea dușmanului), lovește pe loc cel mai apropiat și lasă un efect `beam`. Fără țintă, așteaptă cu ceasul la zero.
- `missile`: la fel ca ținta laserului, dar pleacă un `Shot` cu `kind: 'missile'`. La sosire, sau când ținta a dispărut și ajunge la ultimul punct știut, lovește toți dușmanii vii din `zonă` și lasă un efect `blast` (Review Focus 5). Razele turelelor rămân `bolt`, fără zonă.
- `armor`: viața maximă crește; la luarea modulului sau a treptei, viața de acum crește cu diferența.
- `shield`: când e încărcat (`t` la zero), prima lovitură primită e oprită cu totul: nicio viață pierdută, `hurtT` neatins, efect `block`, iar ceasul pornește. Două lovituri în același pas: prima oprită, a doua intră.
- `mender`: înlocuiește `regenWait` și `regen` din `BALANCE.hero` cât nava are modulul.
- `engine`: înmulțește viteza. `magnet`: înlocuiește `BALANCE.node.reach` și scurtează timpul între bucăți.
- `relay`: o turelă al cărei corp e la cel mult 220 de nava vie trage cu timpul dintre trageri împărțit. Se aplică la tragere.
- Nava doborâtă nu trage cu nicio armă; ceasurile armelor nu curg cât e doborâtă.
- Armele pot trage în același pas. Ordinea în pas: unda, laserul, rachetele, apoi turelele.
- `pickOffer`: parcurge `p.prefer` în ordine și alege prima ofertă cu acel `id`; dacă niciuna nu e pe listă, 0. Listele, aceleași pentru toate purtările care cumpără nava: `['laser', 'armor', 'relay', 'wave', 'missile', 'shield', 'mender', 'engine', 'magnet']`. `playOne` alege cu `pickOffer`.
- Sesiunea: cât nu există panoul, `advance` alege singură prima ofertă, înaintea pașilor. E trecător și se scoate la Task 4; scrie asta în comentariu.

- [ ] **Step 1: Testele, întâi** (cu `quietGame`, `addFoe`, `heroAt` din `src/sim/testkit.ts`; modulele se pun direct în `s.hero.mods`).
  - Fiecare modul, la fiecare treaptă, face ce spune tabelul: lovitura și arcul Undei; laserul lovește doar cel mai apropiat din rază și lasă `beam`; racheta zboară, lovește toți din zonă și lasă `blast`; `heroMaxHp` cu blindaj; scutul oprește o lovitură și se reface după timpul treptei; reparatorul; viteza cu motor (distanța parcursă în 1 s); magnetul strânge de la 40 și nu de la 41, cu ritmul lui; releul scurtează timpul dintre două trageri ale unei turele aflate la 200 de navă și nu al uneia la 240.
  - Unda la treapta 1 dă exact ce dădea înainte nava de nivelul 1 (aceeași lovitură, aceiași dușmani atinși, același împins) pe un aranjament fix de cinci dușmani.
  - Review Focus 5: racheta a cărei țintă e doborâtă în zbor lovește zona de la ultimul punct; două lovituri în același pas cu scutul încărcat: una oprită, una primită; nava doborâtă nu trage timp de `respawn` secunde, deși are dușmani în rază.
  - Nivelul: la nivelul 9 `xpNeed` e `null`; un nivel dă 10 viață maximă; `cost('hero', n)` e întreg și pozitiv pentru 2…9.
  - `run.test.ts`: aceeași sămânță cu aceleași comenzi și aceleași alegeri dă aceeași stare (testul existent, cu nava pusă să urce două niveluri și să aleagă); un pas cu 150 de dușmani și cu nava purtând cele trei arme la treapta 3 durează în medie sub 1 ms.
  - `save.test.ts`: amprenta adusă la zi (`shots[].kind`, `shots[].blast`, cele trei efecte noi).
  - `session.test.ts`: cu o ofertă deschisă, `advance` o închide și partida merge mai departe.
  - `bot.test.ts`: `pickOffer` alege după listă; parcursul pe toate semințele rămâne verde (regulile cercurilor străine), iar `fara-nava` se încheie cu nava la nivelul 1 și doar cu Unda.
- [ ] **Step 2: Rulează-le.** Așteptat: FAIL.
- [ ] **Step 3: Scrie codul.**
- [ ] **Step 4: Plasa.** `npx vitest run src/bots/net.test.ts`. Dacă o limită pică, ai voie să schimbi: cifrele din `MODS`, `xpToLevel`, costul nivelului navei și împărțitorul din `foeHp`. Cel mult 15 încercări cu `npm run balance`, notate; alege cea mai mică schimbare care trece. Reglajul adevărat e Task 3. Dacă nu iese, raportează BLOCKED cu tabelul și încercările.
- [ ] **Step 5: `npm run smoke`** trece cu 20 de verificări (desenul nu are voie să se strice din cauza câmpurilor noi; desenul modulelor vine la Task 6).
- [ ] **Step 6: `DEVLOG.md`**, apoi `npm run check` și commit.

```bash
git commit -m "Nava cu module: cele nouă module și efectele lor"
```

(Cu fișierele atinse, stagate explicit.)

---

### Task 3: Reglajul și tabelul

**Files:**
- Modify: `src/data/balance.ts`, `src/data/modules.ts`, `src/bots/policy.ts`, `src/bots/run.ts`, `src/bots/limits.ts`, `src/bots/table.ts`, testele care fixează cifre schimbate, `docs/GDD.md` (doar tabelul de cifre), `DEVLOG.md`
- Test: `src/bots/limits.test.ts`, `src/bots/net.test.ts`, `src/bots/run.test.ts`, `src/data/balance.test.ts`

**Interfaces:**
- Consumes: `measureAll`, `Row`, `verdicts`, `formatTable`.
- Produces: `BotName` capătă `'fara-turele'` (purtarea „Fără turele”: `buy: ['economy', 'hero']`, ultimul rând, fără limită); `Row` capătă `level` (mediana nivelului navei la sfârșit), `lvl2At` și `lvl5At` (mediana secundei la care nava a atins nivelul 2, respectiv 5; `RUN_CAP` dacă nu l-a atins); tabelul le tipărește ca informație.

**Ținta** (limita din design e cea testată; ținta e mai strânsă, pentru rezervă):

| Jucător | Limita (testul) | Ținta reglajului |
| --- | --- | --- |
| Nimic | 60–130 s | 62–125 s |
| Amestec | 240–360 s | 270–335 s |
| Doar navă | cel mult 75% din Amestec | cel mult 70% |
| Fără navă | cel mult 90% din Amestec | cel mult 85% |
| Fără economie, Fără turele | fără limită | sub mediana „Amestec” (de notat) |
| Ritmul nivelurilor la „Amestec” | fără limită | nivelul 2 între secundele 25 și 60; nivelul 5 între 90 și 170; la sfârșit, nivelul 6–8 |

**Ce se poate regla:** orice cifră din `src/data/balance.ts` și `src/data/modules.ts`. **Ce nu:** cele din Global Constraints (harta, cercurile, joystickul, viteza navei fără Motor, Unda de treapta 1), purtarea jucătorilor automați în afara rândului nou și a listelor `prefer`, orice regulă din `src/sim/`. Fiecare treaptă a unui modul rămâne mai bună decât cea dinainte.

**Cum se caută:** ca la faza 3. O încercare = schimbi cifre, rulezi `npm run balance`, notezi. Schimbă cât mai puține cifre; o cifră fără efect măsurat se pune la loc. Cel mult 60 de încercări. Anti-scopul de urmărit: niciun modul să nu fie răspunsul evident. De aceea, la sfârșit, rulează tabelul „Amestec” cu trei liste `prefer` diferite (armele întâi; corpul întâi; utilitarele întâi) și notează medianele: dacă una bate celelalte cu peste 15%, mai reglează sau raportează. Dacă țintele nu ies, oprește-te la cea mai bună încercare care trece limitele și raportează ce ține pe loc; dacă nici limitele nu ies, BLOCKED cu jurnalul.

- [ ] **Step 1: Testele, întâi:** `limits.test.ts` (rândul „Fără turele” are `ok === null`; tabelul îl tipărește și tipărește nivelul și cele două secunde), `net.test.ts` (șase verdicte, în ordinea din `POLICIES`), `run.test.ts` (`measure` întoarce `level`, `lvl2At`, `lvl5At`), `balance.test.ts` (treptele fiecărui modul sunt strict mai bune de la una la alta, pe cifra lor principală).
- [ ] **Step 2: Rulează-le.** Așteptat: FAIL.
- [ ] **Step 3: Rândul nou și coloanele de informație.**
- [ ] **Step 4: Caută cifrele.**
- [ ] **Step 5: Adu la zi testele care fixează cifre schimbate** (doar valoarea așteptată) și rândurile schimbate din tabelul de cifre al `docs/GDD.md`.
- [ ] **Step 6: Rulează tot:** `npm run check`, `npm run smoke`, `npm run balance -- --raze`.
- [ ] **Step 7: `DEVLOG.md`**: fiecare cifră schimbată, înainte și după, cu motivul (propuneri); tabelele; cele trei liste `prefer`; jurnalul încercărilor pe scurt; ce ținte au ieșit. Commit.

```bash
git commit -m "Nava cu module: reglajul cifrelor și rândurile noi din tabel"
```

---

### Task 4: Panoul de alegere

**Files:**
- Create: `src/ui/choice.ts`, `src/ui/choice.test.ts`
- Modify: `index.html`, `src/ui/ui.css`, `src/ui/strings.ts`, `src/ui/strings.test.ts`, `src/ui/cards.ts`, `src/app/session.ts`, `src/app/session.test.ts`, `src/main.ts`, `src/input/bind.ts` (tastele 1–3), `scripts/smoke.cjs`, `README.md`, `CLAUDE.md` (numărul de verificări), `DEVLOG.md`

**Interfaces:**
- Consumes: `choose`, `Offer`, `Mod`, `slotsAt`, `MOD_KIND`, `MAX_TIER`; `onTap` (`src/ui/tap.ts`); `createCards` (`src/ui/cards.ts`).
- Produces:

```ts
// src/app/session.ts
// Session capătă:  choose(index: number): boolean     // false dacă nu e nicio ofertă deschisă sau indexul e greșit
// alegerea automată din Task 2 dispare; în testul de viteză, `keepStressed` ține `s.hero.xp` la 0

// src/ui/choice.ts — fără DOM în partea de date
export interface OfferView { name: string; kind: string; tag: string; lines: string[]; pips: number; tone: ModKind }
export interface ChoiceView { level: number; slots: ('weapon' | 'body' | 'utility' | 'free' | 'locked')[]; offers: OfferView[] }
export function choiceView(s: GameState): ChoiceView | null     // null fără ofertă deschisă
export function createChoice(doc: Document, onPick: (index: number) => void): { show(v: ChoiceView): void; hide(): void; readonly open: boolean }
```

**Cum arată și cum se poartă** (referința: macheta „Pauză, panou pe mijloc” din `docs/machete-nava-cu-module.html`):
- Un văl peste tot ecranul, cu fundalul încețoșat (`backdrop-filter`, cu prefixul `-webkit-`) și întunecat; unde încețoșarea nu există, rămâne doar întunecat. În mijloc, un panou cu „Nivel {n}”, „Alege un modul”, locurile navei ca pătrate mici și ofertele ca rânduri late, una sub alta: pictogramă, nume, felul și „nou” sau „întărire”, cel mult două rânduri de text, trei puncte (umplute până la treapta la care ajunge). Sub ele: „Jocul stă pe loc cât alegi.”
- Culoarea felului: arma `--hero`, corpul `--shield`, utilitarul `--metal`.
- Fiecare rând e un `button`, legat cu `onTap`. O atingere care a început în afara rândului nu îl pornește (Review Focus 2). Tastele 1, 2, 3 aleg ofertele; focusul merge pe primul rând la deschidere.
- Butonul de pauză e ascuns cât panoul e deschis, ca la celelalte cartonașe. Escape nu închide panoul.
- `main.ts`: după `session.advance`, dacă `session.s.offer` e deschisă și faza e `playing`, arată panoul o singură dată; la alegere cheamă `session.choose(i)`, ascunde panoul și jocul merge. Cât panoul e deschis, joystickul e lăsat (direcția zero) și nu pornește din atingeri pe panou.
- Pagina ascunsă cu panoul deschis: pauza automată salvează partida cu oferta în ea. La întoarcere se vede cartonașul de pauză; „Continuă” duce la panou. După reîncărcare, „Continuă partida” duce tot la panou.
- Textele (toate în `strings.ts`): numele celor nouă module, rândurile lor pentru „nou” și pentru „întărire” (tabelul din spec, secțiunea „Textele”), „Alege un modul”, „Nivel {n}”, „Armă”, „Corp”, „Utilitar”, „Nou”, „Întărire”, „Treapta {t} din 3”, „Jocul stă pe loc cât alegi.”.

- [ ] **Step 1: Testele, întâi.**
  - `choice.test.ts`: `choiceView` pe o stare cu trei oferte (una nouă de armă, o întărire, una nouă utilitară) dă numele, eticheta felului, „Nou” sau „Întărire”, rândurile de text (cel mult două, fiecare de cel mult 28 de caractere), punctele (1 pentru nou, treapta la întărire) și locurile (ocupate cu felul lor, libere, iar următorul loc care se deschide ca `locked`); fără ofertă, `null`. `createChoice` cu un document fals sau cu elemente minime: `show` pune trei rânduri, o apăsare pe al doilea cheamă `onPick(1)` o singură dată, `hide` îl închide.
  - `strings.test.ts`: fiecare modul are nume și rânduri; niciun rând nu trece de 28 de caractere; cuvintele interzise lipsesc.
  - `session.test.ts`: `choose` întoarce `false` fără ofertă; cu ofertă, o închide și `advance` merge mai departe; cu oferta deschisă, `advance` nu schimbă `s.t`; `pause()` cu oferta deschisă salvează o stare cu `offer` în ea; în testul de viteză experiența rămâne 0 după 200 de dușmani doborâți.
  - Review Focus 2, în `tap.test.ts` sau `choice.test.ts`: `pointerup` de atingere pe un rând fără `pointerdown` pe el nu cheamă nimic.
- [ ] **Step 2: Rulează-le.** Așteptat: FAIL.
- [ ] **Step 3: Scrie codul.**
- [ ] **Step 4: Proba din browser**, verificări noi la sfârșitul `scripts/smoke.cjs` (starea se pregătește prin `window.__wg.state()`, ca în verificările existente: experiență și resurse destule, nava pe cercul ei):
  - 21: după plata nivelului apare panoul cu trei rânduri, butonul de pauză nu se vede, iar `s.t` nu crește timp de o secundă;
  - 22: atingerea celui de-al doilea rând închide panoul, `s.t` crește din nou, nava are modulul ales;
  - 23: cu panoul deschis, pagina reîncărcată și „Continuă partida” arată panoul cu aceleași trei nume (Review Focus 1);
  - 24: degetul pus pe canvas și ridicat deasupra unui rând nu alege nimic (atingeri prin CDP, ca la verificarea 20).
  - Captură nouă `08-alegere.png`. La final: `SMOKE OK (24 verificări)`; `README.md` și `CLAUDE.md` spun 24.
- [ ] **Step 5: Uită-te la `08-alegere.png`** lângă machetă: panoul pe mijloc, fundalul încețoșat și întunecat, trei rânduri, textul întreg în rânduri.
- [ ] **Step 6: `DEVLOG.md`, `npm run check`, `npm run smoke`, commit.**

```bash
git commit -m "Nava cu module: panoul de alegere"
```

---

### Task 5: Banda de sus și cercul navei

**Files:**
- Modify: `index.html`, `src/ui/ui.css`, `src/ui/hud.ts`, `src/ui/strings.ts`, `src/render/world.ts`, `src/render/derive.ts` (dacă ajută), testele lor, `scripts/smoke.cjs`, `README.md`, `CLAUDE.md`, `DEVLOG.md`

**Interfaces:**
- Consumes: `heroReady`, `xpNeed`, `slotsAt`, `MOD_KIND`; `ChoiceView['slots']` (aceeași funcție de locuri ca în panou: scoate-o într-un loc comun dacă nu e deja).
- Produces: `STR.xpOf(a, b)` („experiență {a}/{b}”), `STR.levelReady(n)` („Nivel {n} gata”), `STR.levelMax` („Nivel maxim”).

**Cum arată** (referința: macheta „Totul în banda de sus” și secțiunea „Când bara e plină”):
- Banda capătă al treilea rând: numărul nivelului într-un inel care se umple cu experiența spre pragul următor; lângă el, locurile navei ca pătrate mici (pictograma felului în cele ocupate, contur punctat la cele libere, lacăt la următorul loc care se deschide); la dreapta, „experiență 14/40”. Când pragul e atins: inelul plin, în culoarea navei, și textul „Nivel 4 gata”. La nivelul maxim: „Nivel maxim”.
- Banda are aceeași înălțime în toate fazele (și pe cartonașul de start), ca să nu sară canvasul. DOM-ul se atinge doar când o valoare s-a schimbat, ca până acum.
- Cercul navei, pe canvas: cât nu e gata, sub nume scrie „experiență 14/40” în locul prețului; când e gata, cercul e aprins (inel plin în culoarea navei, fără gradient și fără `shadowBlur`) și arată prețul; la nivelul maxim, textul de azi pentru nivel maxim.
- În testul de viteză rândul rămâne, cu experiența 0.

- [ ] **Step 1: Testele, întâi:** ce citește desenul din stare pentru cercul navei, ca funcție fără DOM (trei stări: `wait` cu `a` și `b`, `ready`, `max`); `drawWorld` peste o stare cu nava gata nu schimbă starea (testul existent din `world.test.ts`, cu starea nouă); textele noi în `strings.test.ts`; banda: o funcție fără DOM care dă din stare ce arată rândul (nivel, fracția inelului între 0 și 1, locurile, textul).
- [ ] **Step 2: Rulează-le.** Așteptat: FAIL.
- [ ] **Step 3: Scrie codul.**
- [ ] **Step 4: Proba din browser**, verificări noi: 25: banda arată nivelul 1, două locuri (unul ocupat, unul liber) plus lacătul, și „experiență 0/…”; după experiență peste prag, „Nivel 2 gata”; 26: înălțimea benzii e aceeași pe cartonașul de start, în joc, în pauză și cu panoul deschis. Capturile `03-joc.png` și `08-alegere.png` refăcute. `SMOKE OK (26 verificări)`; documentele spun 26.
- [ ] **Step 5: Uită-te la capturi** lângă machetă, la lățimile 360 și 390: rândul al treilea încape, nimic nu se suprapune, cu 2 și cu 6 locuri.
- [ ] **Step 6: `DEVLOG.md`, `npm run check`, `npm run smoke`, commit.**

```bash
git commit -m "Nava cu module: banda de sus și cercul navei"
```

---

### Task 6: Nava și tragerile pe canvas

**Files:**
- Modify: `src/render/skin.ts`, `src/render/world.ts`, `src/render/orbit/things.ts`, `src/render/derive.ts`, `src/render/palette.ts` (dacă trebuie o culoare nouă, din variabilele CSS existente), testele lor, `scripts/smoke.cjs`, `DEVLOG.md`

**Interfaces:**
- Consumes: `hero.mods`, `Shot.kind`, efectele `beam`, `blast`, `block`.
- Produces: `Skin` desenează modulele pe navă în `hero(...)`, racheta în `shot(...)`, și capătă `beam(ctx, fx, age)` și `blast(ctx, fx, age)`; `world.ts` le cheamă în stratul razelor.

**Ce se vede** (schița: secțiunea „Modulele se văd pe navă” din machete; forme simple, în stilul „Orbită”):
- Fiecare modul adaugă navei o formă: laserul o țeavă în față, rachetele două cutii pe aripi, blindajul un contur mai gros, scutul un inel subțire când e încărcat, reparatorul un semn mic, motorul un jet mai lung, magnetul și releul câte un semn mic. Treapta se vede discret (mărime sau număr de linii), fără text.
- Laserul: o linie scurtă de la navă la țintă, care se stinge în cam 0,12 s. Racheta: un corp mic, cu jet. Explozia: un cerc care crește până la zonă și se stinge. Scutul care oprește o lovitură: inelul clipește.
- Duratele de desen stau lângă celelalte cifre de prezentare (`BALANCE.fx`), iar efectele bătrâne dispar din stare ca `puff`.
- Doar forme pline și linii; fără gradient, fără `shadowBlur`, fără `ctx.filter`. Desenul nu scrie în stare.

- [ ] **Step 1: Testele, întâi:** `world.test.ts`: `drawWorld` peste o stare cu toate cele nouă module, o rachetă în zbor și câte un efect din fiecare fel nu schimbă starea și cheamă `beam` și `blast` în stratul razelor; `discipline.test.ts` rămâne verde; curățarea efectelor: un `beam` dispare din `s.fx` după durata lui.
- [ ] **Step 2: Rulează-le.** Așteptat: FAIL.
- [ ] **Step 3: Scrie codul.**
- [ ] **Step 4: Măsoară desenul.** În `scripts/smoke.cjs`, rândul `SMOKE INFO` măsoară de două ori în aceeași rulare, cu cele 150 de nave în jurul planetei: fără module și cu toate cele nouă la treapta 3 și cu armele trăgând. Tipărește amândouă cifrele. Dacă a doua e cu peste un sfert mai mare, spune-o în raport și caută de ce.
- [ ] **Step 5: Capturi** `09-nava-module.png` (nava cu toate modulele, mărită) și una cu o explozie; uită-te la ele lângă schiță.
- [ ] **Step 6: `DEVLOG.md`, `npm run check`, `npm run smoke`, commit.**

```bash
git commit -m "Nava cu module: modulele și tragerile pe canvas"
```

---

### Task 7: Documentele

**Files:**
- Modify: `docs/GDD.md`, `CLAUDE.md`, `README.md`, `DEVLOG.md`

- [ ] **Step 1: `docs/GDD.md`.** Data din antet. „Cine a hotărât ce”: hotărârile lui Andrei din spec (experiență înainte de nivel, cartonașe, pauză la alegere cu panoul pe mijloc și fundal încețoșat, banda de sus, direcția etapelor următoare), cu trimitere la spec; hotărârea 2 („totul e în timp real”) capătă excepția alegerii. „Regulile jocului”: nava (experiență, niveluri până la 9, locuri, module), investitul (cercul navei cu cele trei stări). „Cifrele jocului”: rândul navei, experiența, tabelul modulelor, cu cifrele de după Task 3. „Plasa pentru dificultate”: rândul „Fără turele”, coloanele de informație, tabelul măsurat acum, listele de preferințe. „Ce ar putea veni după v1”: etapele 2–4 din spec. Tot aici, îndreptarea rămasă de la faza 3: zgomotul tabelului pe altă mașină se scrie „sub un punct”, nu „±0,6 puncte”.
- [ ] **Step 2: `CLAUDE.md`.** „Ce e” (nava cu module, pe scurt), linkul spre spec, „Arhitectura” (`src/data/modules.ts`, `src/sim/mods.ts`, `src/ui/choice.ts`, ce s-a schimbat în `session.ts`, `hud.ts`, `skin.ts`, `src/bots/`), „Reguli dure” (simularea stă pe loc cât oferta e deschisă), „Stare”. Îndreptarea rămasă de la faza 3: „în primul minut” devine „spre secunda 60”.
- [ ] **Step 3: `README.md`.** Cum se joacă (experiența, nivelul, alegerea), starea, numărul de verificări.
- [ ] **Step 4: `DEVLOG.md`.** Încheierea intrării: ce s-a livrat, ce rămâne (proba lui Andrei pe telefon: fazele 2, 3 și nava cu module; cele două cifre de la „Test de viteză”).
- [ ] **Step 5: Verifică** numerele (teste, verificări, mediane, cifre de module) între documente și față de `npm run check`, `npm run smoke` și `npm run balance` rulate acum. Ce e propunere e scris ca propunere. Commit.

```bash
git add docs/GDD.md CLAUDE.md README.md DEVLOG.md
git commit -m "Nava cu module: documentele la zi"
```

---

## După plan

- Recenzia întregii ramuri, apoi pull request-ul adus la zi. Îmbinarea o cere Andrei.
- Proba lui pe telefon acoperă atunci fazele 2 și 3 și nava cu module.
- Etapa următoare din spec (dușmani de mai multe feluri și elite) primește designul ei.
