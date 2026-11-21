# World Guard, „Explorează galaxia”: plan de construcție

> **Pentru cine execută:** SUB-SKILL OBLIGATORIU: superpowers:subagent-driven-development (recomandat) sau superpowers:executing-plans, task cu task. Pașii au căsuțe (`- [ ]`) pentru urmărire.

**Scop:** un al doilea mod de joc, în care nava zboară trei minute printr-un sector, culege arme și module din zbor și aduce acasă resurse; resursele se strâng într-o rezervă păstrată între partide și se cheltuie într-un atelier pe întăriri care contează și la apărarea planetei.

**Arhitectură:** zborul e un al doilea joc lângă primul: regulile lui stau în `src/flight/`, cifrele în `src/data/flight.ts`, desenul în `src/render/flight/`. Apărarea (`src/sim/`) capătă un singur lucru nou: întăririle cu care a pornit partida, ținute în stare. Cele două se ating prin profilul jucătorului (`src/app/profile.ts`: rezerva, întăririle, sectorul) și prin `src/main.ts`, care știe ce mod e pe ecran.

**Unelte:** TypeScript, Vite, Vitest (fără DOM simulat), Canvas 2D, Playwright pentru proba din browser. Nicio dependență nouă.

**Spec:** [`docs/superpowers/specs/2026-11-21-exploreaza-galaxia-design.md`](../specs/2026-11-21-exploreaza-galaxia-design.md) (aprobat de Andrei pe 21.11.2026). Machete: [`docs/machete-exploreaza-galaxia.html`](../../machete-exploreaza-galaxia.html). Reper de purtare: [`docs/prototip-explorare.html`](../../prototip-explorare.html) (cod de aruncat: se citește, nu se copiază).

## Constrângeri globale

- Regulile zborului respectă disciplina din `src/sim/`: pas fix de 1/60 s, fără DOM, fără `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`; hazard doar prin `createRng(seed, 'nume-flux')`; aceeași sămânță și aceleași comenzi dau aceeași stare; starea e date simple și trece prin `JSON.parse(JSON.stringify(f))` continuând identic (fără referințe între obiecte: o țintă se ține prin `id`).
- Regulile zborului nu depind de mărimea ecranului.
- Cifrele de joc stau în `src/data/`; textele pentru jucător în `src/ui/strings.ts`, în română.
- Pe canvas: doar forme pline și linii, culorile din `palette.ts`; fără `shadowBlur`, fără `ctx.filter`; gradient și decupaj doar unde le îngăduie `src/render/discipline.test.ts`.
- Fără nicio întărire, o partidă de apărare e identică pas cu pas cu cea de azi. `LIMITS` din `src/bots/limits.ts` nu se ating.
- 60 de cadre pe secundă pe telefonul de referință în clipa cea mai plină a unui zbor.
- Tot ce e cifră, formă sau așezare nouă se scrie în documente ca „propunere”. Hotărârile lui Andrei sunt cele șapte din spec.
- Niciun cuvânt al temei vechi în cod sau documente (lista e în `constraints.md` al execuției); în zbor, bolovanii se numesc `asteroid`.
- După fiecare task: `npm run check` verde, intrare în `DEVLOG.md`, un commit cu fișiere stagate explicit.

## Ce urmărește recenzia

Cinci lucruri pe care specul le presupune și care pot lovi un jucător; fiecare are testul lui în taskul care deține codul.

1. **Degetul ridicat și pus din nou, sau un al doilea deget, în timpul zborului:** nava nu sare; contează doar mișcarea degetului care conduce. (Task 5)
2. **Pagina ascunsă sau închisă în mijlocul zborului, apoi redeschisă:** ce s-a strâns ajunge în rezervă exact o dată; un zbor reluat din pauză și terminat adaugă doar restul. (Task 5)
3. **Profil stricat sau alterat în stocare** (rezervă negativă, treaptă peste plafon, `NaN`, câmpuri lipsă, altă versiune): jocul pornește cu profil gol, fără excepție; nicio cumpărare nu lasă rezerva negativă. (Task 1)
4. **Partidă de apărare salvată înainte de etapă** (versiunea 2): se reia, fără întăriri; o salvare cu întăriri peste plafon e respinsă. (Task 2)
5. **Ecrane de 360 × 640 și telefoane înalte:** tot câmpul zborului se vede sub bandă, iar o atingere scăpată în atelier nu cumpără de două ori. (Task 6, Task 8)

---

### Task 1: Rezerva și atelierul, ca date și reguli

**Fișiere:** creezi `src/data/workshop.ts`, `src/app/profile.ts` și testele lor; schimbi `src/app/storage.ts` și testul lui; `DEVLOG.md`.

**Interfețe (produce):**
```ts
// src/data/workshop.ts
export type UpId = 'hull' | 'arms' | 'reach' | 'core' | 'kit'      // Carenă, Armament, Colectare, Planetă, Arsenal de pornire
export type Ups = Readonly<Record<UpId, number>>                    // treapta fiecărei întăriri, 0 = necumpărată
export const UP_IDS: readonly UpId[]
export const NO_UPS: Ups
export const MAX_UPS: Ups                                           // toate la plafon: 4, 5, 3, 4, 3
export interface Cost { crystal: number; metal: number }
export const WORKSHOP: { hull: { max: 4; hp: 6; hits: readonly number[] }; arms: { max: 5; dmg: 0.04 }; reach: { max: 3; reach: 0.1 }; core: { max: 4; hp: 0.05 }; kit: { max: 3; mods: readonly (readonly ('laser' | 'missile' | 'shield')[])[] } }  // plus `base` și `grow` la fiecare
export function upPrice(id: UpId, level: number): Cost              // prețul treptei `level` (1…max)
// src/app/profile.ts — fără DOM, fără stocare
export interface Profile { crystal: number; metal: number; sector: number; ups: Ups }   // sector = cel mai departe explorat, 0 = niciunul
export function emptyProfile(): Profile
export function packProfile(p: Profile): string
export function unpackProfile(text: string | null | undefined): Result<Profile>
export function canBuy(p: Profile, id: UpId): Result<Cost>          // prețul treptei următoare; altfel motivul
export function buy(p: Profile, id: UpId): Result<Profile>          // profil nou; cel vechi rămâne neatins
export function bank(p: Profile, haul: Cost): Profile
export function markExplored(p: Profile, sector: number): Profile
// src/app/storage.ts
export const PROFILE_KEY = 'wg.v1.profile'
export function loadProfile(store?: Store | null): Profile          // lipsă, stricat sau stocare blocată: profil gol; nu aruncă
export function saveProfile(p: Profile, store?: Store | null): void
```

**Cifre (propuneri):** `hits` = `[0, 0, 1, 1, 2]` (lovituri în plus în zbor, pe treapta Carenei); `kit.mods` = `[[], ['laser'], ['laser', 'missile'], ['laser', 'missile', 'shield']]`; prețul treptei = baza × `grow`^(treapta − 1), rotunjit la 5: Carenă 60 cristale și 10 metal, ×1,7; Armament 80 și 15, ×1,6; Colectare 50 și 0, ×1,8; Planetă 70 și 20, ×1,7; Arsenal 120 și 30, ×2.

- [ ] **Pasul 1, testele întâi.** `workshop.test.ts`: `upPrice('hull', 1)` = `{ crystal: 60, metal: 10 }`, prețul crește cu treapta, e multiplu de 5; `MAX_UPS` e egal cu `max` al fiecăreia. `profile.test.ts`: dus-întors `unpackProfile(packProfile(p))`; respinse, fiecare cu testul lui: text care nu e JSON, altă versiune, rezervă negativă, `NaN`, număr neîntreg, treaptă peste plafon, treaptă negativă, întărire lipsă, sector negativ; `buy` scade exact prețul și urcă o treaptă, refuză la plafon și cu rezervă prea mică, iar profilul primit rămâne neschimbat; `bank` cu valori negative sau nefinite nu schimbă nimic; `markExplored` nu coboară sectorul. `storage.test.ts`: `loadProfile` dă profil gol pentru lipsă, conținut stricat și stocare care aruncă; `saveProfile` apoi `loadProfile` dă același profil.
- [ ] **Pasul 2.** `npx vitest run src/data/workshop.test.ts src/app/profile.test.ts src/app/storage.test.ts`. Așteptat: FAIL (modulele lipsesc).
- [ ] **Pasul 3.** Scrii codul. `unpackProfile` întoarce motivul, ca `unpackSave`.
- [ ] **Pasul 4.** Aceeași comandă: PASS. `npm run check`.
- [ ] **Pasul 5.** `DEVLOG.md`, commit: „Explorează galaxia: rezerva și atelierul, ca reguli”.

---

### Task 2: Întăririle la apărarea planetei

**Fișiere:** creezi `src/sim/boost.ts`, `src/bots/golden.test.ts`; schimbi `src/sim/state.ts`, `src/sim/hero.ts`, `src/sim/combat.ts`, `src/sim/pads.ts`, `src/app/save.ts`, `src/app/session.ts`, `src/ui/hud.ts`, `src/render/orbit/scene.ts`, `src/render/overlay.ts`, `src/bots/run.ts`, `src/bots/limits.ts`, `src/bots/table.ts`, `src/main.ts`, testele lor; `DEVLOG.md`.

**Interfețe:**
- Consumă: `Ups`, `NO_UPS`, `MAX_UPS`, `WORKSHOP` (Task 1).
- Produce:
```ts
// src/sim/state.ts
interface GameState { /* … */ ups: Ups }                           // întăririle cu care a pornit partida
export function createGame(seed: number, ups: Ups = NO_UPS): GameState
// src/sim/boost.ts
export function coreMaxHp(s: GameState): number                    // 400 × (1 + 0,05 × ups.core)
export function armsFactor(s: GameState): number                   // 1 + 0,04 × ups.arms
export function reachFactor(s: GameState): number                  // 1 + 0,1 × ups.reach
// src/app/session.ts
interface SessionDeps { /* … */ ups(): Ups }                        // partida obișnuită pornește cu ele; testul de viteză, cu NO_UPS
// src/bots/run.ts
export function playTimed(p: Policy, seed: number, cap?: number, guard?: number, ups?: Ups): Timed
```

**Reguli (din spec):** Carena dă navei +6 viață pe treaptă (în `heroMaxHp`). Armamentul înmulțește lovitura Undei, a Laserului și a Rachetelor, nu și pe a turelelor; fără rotunjire. Colectarea înmulțește distanța de la care nava strânge, cu și fără Magnet. Planeta: viața planetei și plafonul reparației sunt `coreMaxHp(s)` peste tot unde azi e `BALANCE.core.hp` (stare, reparat, bandă, inelul planetei, indicatorul, testul de viteză). `SAVE_VERSION` devine 3; o salvare cu versiunea 2 se primește și capătă `ups: NO_UPS`; la versiunea 3, `ups` cu o treaptă neîntreagă, negativă sau peste plafon dă „altă formă”. În `main.ts`, `ups` vine deocamdată din `loadProfile().ups`.

- [ ] **Pasul 1, testul care fixează purtarea de azi, ÎNAINTE de orice schimbare.** `src/bots/golden.test.ts`: joacă `playOne(POLICIES.amestec, seed)` pe semințele 1, 2 și 3 și compară cu valori scrise literal `t`, `kills`, `crystal`, `metal`, `hero.lvl`, `hero.hp`, `core.hp` și modulele navei. Valorile se iau rulând pe codul de acum; testul trece. Commit separat: „Explorează galaxia: partida de apărare, fixată înaintea întăririlor”.
- [ ] **Pasul 2, testele noi.** `boost.test.ts`: cu `MAX_UPS`, `coreMaxHp` = 480, `armsFactor` = 1,2, `reachFactor` = 1,3, `heroMaxHp` = 84 la nivelul 1; cu `NO_UPS`: 400, 1, 1, 60. Teste de purtare: Unda de treapta 1 lovește cu 12 la Armament 5; planeta reparată nu trece de `coreMaxHp`; nava strânge un cristal aflat la 1,25 × distanța de azi doar cu Colectare 3. `save.test.ts`: versiunea 2 se citește cu `ups` zero; versiunea 3 dus-întors cu `MAX_UPS`; treaptă peste plafon respinsă; amprenta formei stării adusă la zi. `session.test.ts`: `start(seed, false)` folosește `deps.ups()`, `start(seed, true)` nu.
- [ ] **Pasul 3.** `npx vitest run src/sim src/app`. Așteptat: FAIL la testele noi.
- [ ] **Pasul 4.** Scrii codul.
- [ ] **Pasul 5.** `npm run check`: `golden.test.ts` trece neschimbat, plasa (`net.test.ts`) trece cu `LIMITS` neatinse.
- [ ] **Pasul 6, rândul nou din tabel.** `npm run balance` tipărește, sub tabel, un rând de informație: „Amestec, cu toate întăririle la plafon: N s (+P% față de Amestec)”. Nu are limită și nu intră în `verdicts`. Dacă P trece de 25, te oprești cu DONE_WITH_CONCERNS și cifrele: plafoanele le hotărăște cel care conduce.
- [ ] **Pasul 7.** `DEVLOG.md` (cu rândul măsurat), commit: „Explorează galaxia: întăririle la apărarea planetei”.

---

### Task 3: Regulile zborului — nava, tunul, dușmanii, sfârșitul

**Fișiere:** creezi `src/data/flight.ts`, `src/flight/state.ts`, `src/flight/step.ts`, `src/flight/ship.ts`, `src/flight/foes.ts` și testele lor; schimbi `src/sim/discipline.test.ts` (acoperă și `src/flight`); `DEVLOG.md`.

**Interfețe:**
- Consumă: `Ups`, `NO_UPS`, `WORKSHOP` (Task 1); `createRng`, `Result` din `src/sim/`.
- Produce:
```ts
// src/data/flight.ts
export type FlightModId = 'gun' | 'laser' | 'missile' | 'shield' | 'magnet'
export type FlightFoeKind = 'drone' | 'weaver' | 'gunship' | 'cargo' | 'elite'
export const FLIGHT: { field: { w: 390; h: 680 }; sectorSecs: 170; eliteDelay: 2.5; lootSecs: 3.4; /* nava, condusul, tunul, dușmanii, focul, asteroizii, resursele */ }
export function sectorScale(n: number): { hp: number; pace: number; elite: number; loot: number }
// src/flight/state.ts
export interface FlightInput { dx: number; dy: number }             // mișcarea cerută de la pasul trecut, în unități de câmp, înainte de înmulțirea cu 1,2
export interface FlightFoe { id: number; kind: FlightFoeKind; x: number; y: number; r: number; hp: number; maxHp: number; hitT: number /* … */ }
export interface FlightState {
  seed: number; sector: number; ups: Ups; mode: 'flying' | 'explored' | 'down'; tick: number; t: number
  ship: { x: number; y: number; hp: number; maxHp: number; inv: number; mods: Record<FlightModId, number> /* … */ }
  foes: FlightFoe[]; shots: { x: number; y: number; vx: number; vy: number }[]; bolts: { x: number; y: number; vx: number }[]
  asteroids: { x: number; y: number; r: number; rot: number; hp: number; hitT: number; shape: number[] }[]
  drops: { kind: 'crystal' | 'metal'; x: number; y: number }[]
  fx: FlightFx[]; crystal: number; metal: number; kills: number; eliteId: number /* −1 până apare */
}
export function createFlight(seed: number, sector: number, ups?: Ups): FlightState
export function eliteOf(f: FlightState): FlightFoe | null
export function sectorProgress(f: FlightState): number               // 0…1, drumul până la nava de elită
// src/flight/step.ts
export function stepFlight(f: FlightState, input: FlightInput): void
```

**Reguli și cifre (din spec, secțiunile „Zborul”, „Dușmanii”, „Resursele”):**
- Condusul: mișcarea cerută se înmulțește cu 1,2 și se adună într-un rest pe care nava îl consumă cu cel mult 1100 de unități pe secundă; la marginea câmpului restul pe acea axă se pierde (întoarcerea se simte imediat). Marginile: 18 unități în lături, 30% din înălțime sus, 34 de unități jos.
- Viața: 5 lovituri, plus `WORKSHOP.hull.hits[ups.hull]`; punctul de lovit are raza 6; 1,2 s fără lovituri după una primită. A cincea lovitură: `mode = 'down'` în același pas.
- Tunul, treapta 1: două proiectile drept înainte la 0,11 s, lovitură 4 × (1 + 0,04 × ups.arms), viteză 780.
- Dușmanii, asteroizii, focul lor, ce lasă în urmă, ritmul aparițiilor, liniștea de la jumătate, creșterea vieții până la ×1,8: cifrele din tabelele specului și, unde specul tace, cele din prototip. Transportul nu apare în taskul ăsta.
- Nava de elită apare la `sectorSecs + eliteDelay`; după ce cade, zborul mai ține `lootSecs`, apoi `mode = 'explored'`. Nu există limită de timp.
- Resursele vin spre navă de la 85 × (1 + 0,1 × ups.reach) și se culeg la 22.
- Sectorul n: `sectorScale` (propunere): viața ×(1 + 0,25(n − 1)), ritmul ×max(0,6; 0,94^(n − 1)), viața elitei ×(1 + 0,35(n − 1)), ce lasă în urmă ×(1 + 0,2(n − 1)). Viteza și forma focului nu se schimbă.

- [ ] **Pasul 1, testele întâi:** aceeași sămânță și aceleași comenzi dau aceeași stare după 3000 de pași; starea trecută prin JSON la fiecare 50 de pași continuă identic; nava nu iese din margini oricât i se cere; o mișcare de 100 de unități cerută într-un pas se face în mai mulți pași, cu 1,2 × 100 în total; după oprirea la margine, o mișcare înapoi mișcă nava în același pas; un proiectil dușman pe punctul navei ia o viață, iar al doilea în 1,2 s nu ia nimic; a cincea lovitură dă `down`; cu nava de elită doborâtă, `mode` devine `explored` după 3,4 s, nu înainte; fără lovituri primite, nava de elită apare la 172,5 s; un dușman nu trage când e la mai puțin de 110 unități deasupra navei sau sub 62% din înălțime; `sectorScale(1)` e tot 1; în sectorul 3 o dronă are mai multă viață decât în sectorul 1; disciplina (`discipline.test.ts`) acoperă `src/flight`.
- [ ] **Pasul 2.** `npx vitest run src/flight src/sim/discipline.test.ts`. Așteptat: FAIL.
- [ ] **Pasul 3.** Scrii codul. Fluxurile de hazard au nume proprii, cu prefixul `zbor-`.
- [ ] **Pasul 4.** PASS, apoi `npm run check`.
- [ ] **Pasul 5.** `DEVLOG.md`, commit: „Explorează galaxia: regulile zborului”.

---

### Task 4: Armele și modulele culese din zbor

**Fișiere:** creezi `src/flight/arsenal.ts`, `src/flight/pickups.ts`, `src/bots/flightYield.ts` și testele lor; schimbi `src/data/flight.ts`, `src/flight/state.ts`, `src/flight/step.ts`, `src/flight/foes.ts`, `src/bots/table.ts`, `src/data/workshop.ts` (doar dacă măsurătoarea cere alte prețuri); `DEVLOG.md`.

**Interfețe:**
- Consumă: tot ce produce Task 3.
- Produce:
```ts
// src/flight/state.ts
type FlightFx = /* … */ | { kind: 'took'; what: FlightModId | 'repair' | 'maxed'; tier: number; t0: number } | { kind: 'beam'; /* … */ } | { kind: 'blast'; /* … */ } | { kind: 'block'; /* … */ }
interface FlightState { /* … */ picks: { kind: FlightModId | 'repair'; x: number; y: number }[]; missiles: { x: number; y: number; vx: number; vy: number; targetId: number }[] }
// src/flight/pickups.ts
export function take(f: FlightState, kind: FlightModId | 'repair'): void
// src/bots/flightYield.ts
export function flightYield(sector: number, seeds: readonly number[]): { crystal: number; metal: number }   // medianele unui zbor condus de script
```

**Reguli și cifre (din spec, „Armele și modulele din zbor”):** tabelul celor cinci module, cu cele trei trepte; modulul cules a doua oară urcă o treaptă; la treapta 3, culegerea dă 5 cristale și efectul `maxed`; Scutul nou e încărcat din prima clipă; transportul apare la 14–18 s (primul la secunda 5), nu trage, iar doborât lasă un modul: de cele mai multe ori unul pe care nava nu îl are, iar când nava e lovită, uneori o reparație; modulul coboară cu 62 de unități pe secundă, nu e atras de Magnet și se culege la 27 de unități; reparația dă o viață, fără să treacă de maxim; Arsenalul de pornire pune la start modulele din `WORKSHOP.kit.mods[ups.kit]`, la treapta 1; Armamentul înmulțește și Laserul, și Rachetele; racheta își ține ținta prin `id` și, dacă ținta dispare, ia cel mai apropiat dușman.

**Măsurătoarea (din spec, „Atelierul”):** `flightYield` conduce nava cu un script simplu (se plimbă dintr-o parte în alta, nu poate fi lovită, culege ce întâlnește) pe sectorul 1, pe semințele 1…10. `npm run balance` tipărește rândul „Zbor, sectorul 1, navă condusă de script: C cristale, M metal”. Ținte de reglaj pentru prețuri: cea mai ieftină întărire costă cel mult cât aduce un zbor; toate la plafon costă cât 25–35 de asemenea zboruri. Dacă prețurile din Task 1 nu intră în ținte, le schimbi în `src/data/workshop.ts` (și testul lor) și spui în raport ce ai schimbat.

- [ ] **Pasul 1, testele întâi:** `take` pe fiecare modul: treapta 0 → 1 → 2 → 3, apoi +5 cristale și treapta rămâne 3; Tunul are 2, 3 și 5 proiectile pe salvă; Laserul lovește cel mai apropiat dușman din 300 de unități cu 14 / 22 / 32 și lasă un efect `beam`; racheta lovește tot pe o rază de 50 cu 12 / 18 / 26; Scutul oprește o lovitură (viața neschimbată, efect `block`), nu o oprește pe a doua venită înainte de 6 s, o oprește după; cu Magnet 3 o resursă vine de la 220 de unități; un modul nu vine spre navă nici cu Magnet 3; reparația la viață plină nu schimbă nimic; `ups.kit = 3` pornește zborul cu Laser, Rachete și Scut la treapta 1; un transport doborât lasă exact un lucru de cules; determinismul și dus-întorsul prin JSON din Task 3 trec cu toate modulele la treapta 3 și cu rachete în zbor; `flightYield(1, …)` e determinist; testul țintelor de preț.
- [ ] **Pasul 2.** `npx vitest run src/flight src/bots`. Așteptat: FAIL.
- [ ] **Pasul 3.** Scrii codul.
- [ ] **Pasul 4.** PASS, `npm run check`, `npm run balance` (lipești rândul nou în raport).
- [ ] **Pasul 5.** `DEVLOG.md` (cu cifra măsurată și prețurile, ca propuneri), commit: „Explorează galaxia: armele și modulele culese din zbor”.

---

### Task 5: Sesiunea zborului și condusul cu degetul

**Fișiere:** creezi `src/app/flightSession.ts`, `src/input/drag.ts` și testele lor; `DEVLOG.md`.

**Interfețe:**
- Consumă: `createFlight`, `stepFlight`, `FlightState`, `FlightInput`; `Cost`, `Ups`.
- Produce:
```ts
// src/app/flightSession.ts — fără DOM și fără stocare
export interface FlightDeps { ups(): Ups; bank(haul: Cost): void; explored(sector: number): void }
export interface FlightOver { explored: boolean; sector: number; crystal: number; metal: number; kills: number; secs: number; mods: Record<FlightModId, number> }
export interface FlightSession {
  readonly phase: 'ready' | 'playing' | 'paused' | 'over'
  readonly f: FlightState
  start(seed: number, sector: number): void
  pause(): boolean                                                   // trece în rezervă ce s-a strâns până acum
  unpause(): boolean
  advance(steps: number, input: FlightInput): FlightOver | null       // mișcarea merge întreagă la primul pas
}
export function createFlightSession(deps: FlightDeps): FlightSession
// src/input/drag.ts — fără DOM
export interface Drag { on: boolean; id: number; x: number; y: number; dx: number; dy: number }
export function newDrag(): Drag
export function dragDown(d: Drag, id: number, x: number, y: number): void
export function dragMove(d: Drag, id: number, x: number, y: number): void
export function dragUp(d: Drag, id: number): void
export function dragTake(d: Drag): FlightInput                        // mișcarea strânsă de la ultima citire; o golește
```

**Reguli:** sesiunea ține minte cât din ce s-a strâns a trecut deja în rezervă și dă mai departe doar diferența: la pauză (și pagina ascunsă cheamă pauza), la `down` și la `explored`. La `explored` cheamă și `deps.explored(sector)`. Coordonatele din `drag.ts` sunt în unități de câmp; împărțirea la scara ecranului o face cine leagă (Task 6).

- [ ] **Pasul 1, testele întâi.** `flightSession.test.ts`: zbor terminat fără pauză → `bank` chemat o dată, cu tot; pauză la jumătate, apoi sfârșit → două chemări a căror sumă e totalul; două pauze la rând fără nimic strâns între ele → a doua nu cheamă `bank`; pauză și niciun sfârșit (pagina închisă) → rezerva are ce s-a strâns până la pauză; `explored` cheamă `deps.explored` cu sectorul, `down` nu; `advance` cu 3 pași dă mișcarea doar primului; `advance` pe pauză nu face niciun pas. `drag.test.ts`: degetul pus nu mișcă nimic (`dragTake` = 0, 0); mișcat cu (30, −10) dă (30, −10) o dată, apoi (0, 0); ridicat și pus în alt loc nu dă nicio mișcare; al doilea deget, cât primul conduce, e ignorat și la apăsare, și la mișcare, și la ridicare; mișcarea strânsă în două cadre fără citire se adună.
- [ ] **Pasul 2.** `npx vitest run src/app/flightSession.test.ts src/input/drag.test.ts`. Așteptat: FAIL.
- [ ] **Pasul 3.** Scrii codul.
- [ ] **Pasul 4.** PASS, `npm run check`.
- [ ] **Pasul 5.** `DEVLOG.md`, commit: „Explorează galaxia: sesiunea zborului și condusul cu degetul”.

---

### Task 6: Zborul pe ecran

**Fișiere:** creezi `src/render/flight/canvas.ts`, `src/render/flight/things.ts` (și `scene.ts` dacă ajută) cu testele lor; schimbi `src/input/bind.ts`, `src/main.ts`, `src/app/flags.ts`, `src/render/discipline.test.ts`, `scripts/smoke.cjs`, `README.md`, `CLAUDE.md`, `DEVLOG.md`.

**Interfețe:**
- Consumă: `FlightState`, `eliteOf`; `createFlightSession`; `Drag` și funcțiile lui.
- Produce:
```ts
// src/render/flight/canvas.ts
export function createFlightRenderer(canvas: HTMLCanvasElement): {
  resize(hudBottom: number): void
  frame(f: FlightState, frameDt: number): void                       // citește starea, nu o scrie
  refresh(): void
  scale(): number                                                    // pixeli de ecran pe unitate de câmp
}
// src/app/flags.ts: `?zbor=N` pornește direct un zbor în sectorul N (doar împreună cu `?debug=1`)
// window.__wg capătă: mode(): 'defense' | 'flight', flight(): FlightState, runFlight(seconds: number): void, flightDrawMs(frames: number): number
```

**Cum arată:** formele din prototip, trecute în stilul jocului („Orbită”): nava ta cu vârful în sus și cu modulele vizibile pe ea, dușmanii cu vârful în jos, transportul gri cu o dungă, focul dușman rotund și portocaliu cu miez deschis, modulul de cules ca pătrat cu chenar în culoarea felului și cu pictograma lui, cristalul și metalul ca la apărare, cerul care curge în jos. Câmpul stă sub banda de sus, lipit de marginea de jos a ecranului, și se vede întreg; pe ecrane mai înalte se vede cer în plus deasupra, iar pe unul prea scund câmpul se micșorează cu totul și rămân fâșii de cer în lături. Regulile nu se schimbă niciodată după ecran. Dacă `FLIGHT.field.h` = 680 (propunere) se dovedește nepotrivit pe telefonul de referință, îl schimbi în date și spui în raport. Banda de sus și cartonașele noi vin la Task 7: aici zborul pornește doar cu `?debug=1&zbor=1`, iar la sfârșit se întoarce la cartonașul de start.

- [ ] **Pasul 1, testele întâi:** desenul peste o stare bogată (toate felurile de dușmani, toate modulele la treapta 3, rachete, raze, explozii, lucruri de cules) nu schimbă starea și nu aruncă; la fel peste starea de la pornire și peste una cu nava doborâtă; `src/render/discipline.test.ts` acoperă și `src/render/flight/`.
- [ ] **Pasul 2.** `npx vitest run src/render`. Așteptat: FAIL.
- [ ] **Pasul 3.** Scrii desenul, apoi legarea în `main.ts`: un singur ciclu de cadre, cu modul de joc ales; în zbor, degetul conduce prin `drag.ts` (mișcarea împărțită la `scale()`), tastele dau 255 de unități pe secundă; pauza (Escape, pagina ascunsă) merge și în zbor. Dacă `main.ts` trece de vreo 320 de rânduri, scoți legarea zborului într-un fișier al ei și spui asta în raport.
- [ ] **Pasul 4, proba din browser** (`scripts/smoke.cjs`), verificări noi: 27: cu `?debug=1&zbor=1` pagina e în zbor și nava se mișcă după o tragere cu degetul, de 1,2 ori cât degetul; 28: câmpul se vede întreg sub bandă la 360 × 640 și la 390 × 780 (măsurat în pixeli); 29: pagina ascunsă pune zborul pe pauză și nicio eroare nu apare în consolă. Rând `SMOKE INFO` nou: timpul de desen al zborului în clipa cea mai plină (toate modulele la treapta 3, sfârșit de sector). Capturi: `15-zbor.png`, `16-zbor-elita.png`. Așteptat: `SMOKE OK (29 verificări)`.
- [ ] **Pasul 5.** Te uiți la capturi, la 360 și la 390 lățime, lângă prototip: se deosebesc dintr-o privire focul dușman, modulul de cules și resursele? Spui în raport ce ai văzut.
- [ ] **Pasul 6.** `README.md`, `CLAUDE.md`, `DEVLOG.md`; `npm run check`, `npm run smoke`; commit: „Explorează galaxia: zborul pe ecran”.

---

### Task 7: Banda din zbor și cartonașele

**Fișiere:** creezi `src/ui/flightHud.ts` cu testul lui; schimbi `index.html`, `src/ui/ui.css`, `src/ui/cards.ts`, `src/ui/strings.ts`, `src/ui/hud.ts` (dacă împart bucăți), `src/main.ts`, testele lor, `scripts/smoke.cjs`, `README.md`, `CLAUDE.md`, `DEVLOG.md`.

**Interfețe:**
- Consumă: `FlightSession`, `FlightOver`, `Profile`, `loadProfile`, `saveProfile`, `bank`, `markExplored`.
- Produce:
```ts
// src/ui/flightHud.ts
export interface FlightRow { crystal: number; metal: number; hits: number; maxHits: number; elite: boolean; frac: number; label: string; mods: { id: FlightModId; tier: number }[]; toast: string }
export function flightRow(f: FlightState): FlightRow                // fără DOM
export function createFlightHud(doc: Document): { sync(f: FlightState): void; show(on: boolean): void }
// src/ui/cards.ts — cartonașul de start și cel de la sfârșitul zborului
showStart(o: { saved: { secs: number } | null; profile: Profile; sector: number }): void
showFlightOver(r: FlightOver, profile: Profile): void
// callback-uri noi: defend(), explore(sector: number), sector(delta: -1 | 1), next(), home()
```

**Ce se vede** (machetele 1, 3 și 4): cartonașul de start cu „Apără planeta”, „Explorează galaxia” și sectorul ales cu − și + (de la 1 până la cel mai departe explorat plus unu), rândul cu rezerva; cele patru rânduri de reguli de azi dispar. În zbor, banda arată ce a strâns zborul, viețile, drumul prin sector (care devine viața navei de elită), modulele ca pictograme cu treptele lor și pauza; un rând scurt spune ce ai cules. La sfârșit: „Sector explorat” sau „Nava a fost doborâtă”, ce ai adus, cât are rezerva, „Sectorul următor” sau „Încă un zbor”, „Înapoi la start”. Butonul „Atelier” apare în ambele locuri, dar deocamdată e ascuns: îl aprinde Task 8. Banda are aceeași înălțime în zbor și pe cartonașele lui. Un zbor nu șterge partida de apărare salvată.

**Pauza în zbor** are cartonașul ei: „Zbor în pauză”, ce ai strâns până acum, „Continuă” și „Renunță la zbor”. Renunțarea încheie zborul fără sector explorat și duce la cartonașul de start; ce s-a strâns e deja în rezervă, de la pauză.

**Textele noi** (toate în `strings.ts`, cel mult 28 de caractere pe rând unde stau într-un buton sau în bandă): „Apără planeta”, „Explorează galaxia”, „Sectorul N”, „Rezerva”, „Atelier”, „Sector explorat”, „Nava a fost doborâtă”, „Ai adus acasă”, „Ai apucat să strângi”, „Sectorul următor”, „Încă un zbor”, „Înapoi la start”, „Zbor în pauză”, „Ai strâns până acum”, „Renunță la zbor”, „Elită”, „Tun”, „Reparație · +1 viață”, „{nume} · nou”, „{nume} · treapta {n}”, „{nume} e la maxim · +5 cristale”, plus rândurile de explicație ale celor două moduri din macheta 1.

- [ ] **Pasul 1, testele întâi:** `flightRow`: la pornire arată Tunul la treapta 1, 5 vieți, drumul 0; cu nava de elită pe ecran, `elite` e adevărat și `frac` e viața ei; `toast` e textul ultimului lucru cules cât e proaspăt, apoi gol; textele noi în `strings.test.ts`; alegerea sectorului nu coboară sub 1 și nu trece de cel mai departe explorat plus unu.
- [ ] **Pasul 2.** `npx vitest run src/ui`. Așteptat: FAIL.
- [ ] **Pasul 3.** Scrii codul. DOM-ul se atinge doar când o valoare s-a schimbat, ca în banda de azi.
- [ ] **Pasul 4, proba din browser,** verificări noi: 30: cartonașul de start are cele două moduri, rezerva 0 și sectorul 1, iar + nu trece de 1; 31: „Explorează galaxia” pornește un zbor, banda arată 5 vieți și Tunul; un modul dat prin `window.__wg` apare în bandă cu treapta lui; 32: zborul dus la capăt arată „Sector explorat” cu ce s-a adus, rezerva de pe cartonașul de start a crescut cu exact atât, iar sectorul propus e 2; 33: pagina reîncărcată în mijlocul unui zbor, după o pauză, are în rezervă ce se strânsese, o singură dată, iar „Renunță la zbor” duce la cartonașul de start fără să schimbe rezerva; 34: „Continuă partida” de la apărare e tot acolo după un zbor. Verificările vechi care apăsau „Începe” se aduc la numele nou al butonului, fără să fie slăbite. Capturi: `17-start.png`, `18-banda-zbor.png`, `19-sfarsit-zbor.png`. Așteptat: `SMOKE OK (34 verificări)`.
- [ ] **Pasul 5.** Te uiți la capturi lângă machete, la 360 și la 390 lățime: totul încape, nimic nu se suprapune.
- [ ] **Pasul 6.** Documentele, `npm run check`, `npm run smoke`, commit: „Explorează galaxia: banda din zbor și cartonașele”.

---

### Task 8: Atelierul pe ecran

**Fișiere:** creezi `src/ui/shop.ts` cu testul lui; schimbi `index.html`, `src/ui/ui.css`, `src/ui/cards.ts`, `src/ui/strings.ts`, `src/main.ts`, testele lor, `scripts/smoke.cjs`, `README.md`, `CLAUDE.md`, `DEVLOG.md`.

**Interfețe:**
- Consumă: `Profile`, `canBuy`, `buy`, `upPrice`, `UP_IDS`, `WORKSHOP`, `saveProfile`.
- Produce:
```ts
// src/ui/shop.ts
export interface ShopRow { id: UpId; name: string; text: string; level: number; max: number; price: Cost | null; state: 'buy' | 'poor' | 'max' }
export function shopView(p: Profile): { crystal: number; metal: number; rows: ShopRow[] }   // fără DOM
export function createShop(doc: Document, onBuy: (id: UpId) => void, onBack: () => void): { show(p: Profile): void; hide(): void; readonly open: boolean }
```

**Ce se vede** (macheta 2): rezerva sus; câte un rând pe întărire, cu numele, ce face (un rând), treptele ca puncte și butonul cu prețul treptei următoare; butonul e stins când rezerva nu ajunge și scrie „La plafon” când nu mai sunt trepte; „Înapoi” duce de unde ai venit (cartonașul de start sau sfârșitul zborului). O apăsare cumpără o treaptă: profilul se salvează pe loc, iar rândurile se refac din profilul nou. Butoanele se leagă cu `onTap`, ca restul; o apăsare începută înainte să apară atelierul nu cumpără. Atelierul nu se poate deschide în timpul unei partide sau al unui zbor.

**Textele noi:** „Atelier”, „Întăriri care rămân”, „La plafon”, „Înapoi”, numele celor cinci întăriri (Carenă, Armament, Colectare, Planetă, Arsenal de pornire) și câte un rând pentru fiecare, din macheta 2; pentru Arsenal, rândul spune ce aduce treapta următoare.

- [ ] **Pasul 1, testele întâi:** `shopView` pe profil gol: cinci rânduri, toate `poor`; cu rezervă destulă: `buy` și prețul din `upPrice`; la plafon: `max` și `price` nul; o apăsare cheamă `onBuy` o singură dată (testul cu document fals, ca la `choice.test.ts`: `pointerup` și `click` fără `pointerdown` pe buton nu cumpără); după `hide`, butoanele vechi nu mai cumpără.
- [ ] **Pasul 2.** `npx vitest run src/ui`. Așteptat: FAIL.
- [ ] **Pasul 3.** Scrii codul și aprinzi butoanele „Atelier” de pe cartonașul de start și de la sfârșitul zborului.
- [ ] **Pasul 4, proba din browser,** verificări noi: 35: atelierul se deschide de pe cartonașul de start și are cinci rânduri; cu rezerva pusă prin stocare, o apăsare pe Carenă scade rezerva cu prețul și aprinde un punct; două apăsări repezi cumpără două trepte doar dacă rezerva ajunge pentru amândouă, altfel una; 36: după cumpărare, o partidă de apărare pornește cu nava la 66 de viață și un zbor cu Arsenalul 1 pornește cu Laserul; 37: profilul stricat de mână în stocare dă cartonașul de start cu rezerva 0, fără erori. Captură: `20-atelier.png`. Așteptat: `SMOKE OK (37 verificări)`.
- [ ] **Pasul 5.** Te uiți la captură lângă machetă, la 360 și la 390 lățime: cele cinci rânduri încap fără derulare la 360 × 640.
- [ ] **Pasul 6.** Documentele, `npm run check`, `npm run smoke`, commit: „Explorează galaxia: atelierul”.

---

### Task 9: Documentele și paza pentru jocul într-un singur fișier

**Fișiere:** schimbi `package.json`, `docs/GDD.md`, `CLAUDE.md`, `README.md`, `DEVLOG.md`.

- [ ] **Pasul 1.** `npm run check` rulează și `npm run single` (la sfârșit). Verifici că pică atunci când construirea într-un singur fișier pică: strici o clipă verificarea din `scripts/single-file.mjs`, vezi `check` roșu, pui la loc. Închizi în `DEVLOG.md`, ca linie bifată cu textul întreg, restanța despre `npm run single`.
- [ ] **Pasul 2, `docs/GDD.md`.** „Cine a hotărât ce”: cele șapte hotărâri ale lui Andrei din spec, lista „propus de Claude și acceptat” și lista propunerilor făcute în construcție (toate cifrele, formele, așezările, prețurile). Regulile și cifrele zborului, ale atelierului și ale întăririlor la apărare, citite din `src/data/`. La plasă: rândul „Amestec, cu toate întăririle la plafon” și rândul zborului condus de script, cu cifrele rulate acum. Etapele următoare din spec.
- [ ] **Pasul 3, `CLAUDE.md` și `README.md`.** Ce e (două moduri), arhitectura (`src/flight/`, `src/data/flight.ts`, `src/data/workshop.ts`, `src/app/profile.ts`, `src/app/flightSession.ts`, `src/input/drag.ts`, `src/render/flight/`, `src/ui/flightHud.ts`, `src/ui/shop.ts`), regula „fără întăriri, apărarea e cea de azi” și testul care o păzește, comenzile, starea.
- [ ] **Pasul 4.** Verifici fiecare cifră din documente față de `src/data/` și de `npm run check`, `npm run smoke`, `npm run balance` rulate acum. Ce e propunere e scris ca propunere. Restanțele rămân ca linii de bifat: proba lui Andrei pe telefon (un zbor de trei minute cu module, greutatea sectorului 1, dacă prima întărire vine la timp).
- [ ] **Pasul 5.** Commit: „Explorează galaxia: documentele la zi”.

---

## După plan

- Recenzia întregii ramuri, un singur val de reparații, apoi pull request-ul adus la zi. Îmbinarea o cere Andrei.
- O pagină privată cu jocul de pe ramură, ca Andrei să-l încerce pe telefon.
- Etapa următoare (dușmani de mai multe feluri, pentru amândouă modurile) își primește designul ei.
