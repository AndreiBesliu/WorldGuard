# CLAUDE.md — World Guard

Faptele stabile și regulile proiectului. Se încarcă la fiecare sesiune.

## Ce e
**World Guard** — un joc de apărat o planetă (genul: „castle defense”, cum l-a numit Andrei; tema e de spațiu), văzut de sus,
pentru telefon. O navă condusă cu joystick strânge cristale și metal și le investește: turele, colector, mină,
nivelul navei, repararea planetei. Dușmanii (nave) vin continuu și tot mai des; scorul e cât reziști. Pentru Andrei,
deocamdată; nimic nu se construiește acum pentru o publicare. În cod, rolurile păstrează numele `hero` (nava) și `foe`
(dușmanul); planeta e `core`, resursele `crystal` și `metal`, cercurile `turret`, `collector`, `mine`.

- Designul complet: [`docs/GDD.md`](docs/GDD.md) (în conflict cu prototipul, câștigă documentul).
- Tema de spațiu, aspectul „Orbită” și numele din cod: [`docs/superpowers/specs/2026-11-17-tema-spatiu-design.md`](docs/superpowers/specs/2026-11-17-tema-spatiu-design.md)
  (macheta: [`docs/machete-tema-spatiu.html`](docs/machete-tema-spatiu.html); varianta 3, „Colonie”, e doar pentru misiuni speciale de mai târziu).
- Prototipul de aruncat, referință de **comportament**: [`docs/prototip.html`](docs/prototip.html). Aspectul lui e cel vechi (castel, turnuri, copaci); nu mai e referință de aspect.
- Planul fazei 1: [`docs/superpowers/plans/2026-11-17-world-guard-faza-1.md`](docs/superpowers/plans/2026-11-17-world-guard-faza-1.md).
- Istoria lucrului: [`DEVLOG.md`](DEVLOG.md).
- Jocul vechi (tower defense pe hexagoane) e la commit-ul `ec73b9e`. Andrei poate pune eticheta:
  `git tag hex-td-v0.0.1 ec73b9e && git push origin hex-td-v0.0.1`.

## Comenzi
```bash
npm run dev        # Vite, http://localhost:5180
npm run check      # typecheck + teste + build — ASTA e poarta înainte de commit
npm test           # Vitest
npm run build
npm run smoke      # proba în browser (Playwright instalat pe mașină); nu face parte din `check`
npm run single     # dist-single/world-guard.html: tot jocul într-un singur fișier (pentru încercat pe telefon)
```

## Arhitectura
- `src/sim/` — **nucleul de joc, determinist, fără DOM.** Tot ce contează pentru reguli stă aici.
  `state.ts` (starea, `DT`, `EPS`, tipurile), `step.ts` (un pas de 1/60 s, în ordine: ceas, erou, cercuri, luptă, dușmani),
  `hero.ts` (mers, coliziuni, reapariție, strâns), `pads.ts` (cercurile de investit: plată, nivele, producție, reparat),
  `combat.ts` (unda navei, tragerea turelelor, raze; `nearestFoeWithin` e regula de țintire, folosită și de desen), `foes.ts` (apariții, mers, atac, despărțire),
  `rng.ts` (aleatorul cu fluxuri numite), `result.ts` (verificări cu motiv), `testkit.ts` (ajutoare de test),
  plus testele de lângă fiecare (`*.test.ts`, între ele `discipline.test.ts` și `run.test.ts`, care măsoară partida întreagă).
- `src/data/` — cifrele (`balance.ts`) și așezarea lumii (`layout.ts`: hartă, nucleu, grupuri de resurse, cercuri,
  vederea de referință, pragul de viață scăzută). **Un număr de gameplay scris în afara lui `src/data/` e o greșeală.**
- `src/app/` — lipiciul fără desen și fără reguli: `loop.ts` (acumulatorul: pași fixi din timpul cadrului, cel mult 5 pe cadru),
  `flags.ts` (`?seed=` și `?debug=1` din adresă), `storage.ts` (recordul în `localStorage`; orice eroare = fără record).
- `src/render/` — desenarea pe Canvas 2D. Citește starea, nu o modifică. `canvas.ts` (mărimea, ordinea straturilor; singurul care numește
  aspectul și pictează cerul o dată), `camera.ts` (scara ecranului și urmărirea navei), `world.ts` (tot ce e în coordonate de lume și ar fi la fel
  în orice aspect: straturile, săritul peste ce nu se vede, cercurile, etichetele, barele, textele plutitoare),
  `overlay.ts` (indicatorul spre planetă și joystickul, în coordonate de ecran), `palette.ts` (culorile citite o dată din variabilele CSS),
  `skin.ts` (interfața `Skin`: tot ce diferă de la un aspect la altul), `draw.ts` (primitivele de desen), `derive.ts` (ce citește desenul din
  stare, fără DOM: `turretAim`, `shieldSpan`, `regrown`), `orbit/` (aspectul „Orbită”, singura implementare a lui `Skin`: `index.ts`;
  `scene.ts` — cerul și planeta, **singurul loc cu gradient și decupaj**; `things.ts` — resurse, clădiri, nave, raze, doar forme pline și linii).
  Testele: `derive.test.ts`, `world.test.ts` (ordinea straturilor), `discipline.test.ts` (fără `shadowBlur`; gradient și decupaj doar în
  `orbit/scene.ts`) și `camera.test.ts`. `ground.ts` nu mai există. Mișcările doar de desen (continente, nori, satelit, flăcări, țeava turelei)
  se calculează din timpul partidei și din stare; nu scriu nimic în stare.
- `src/input/` — comenzile: `joystick.ts` (logica joystickului, fără DOM, testată), `bind.ts` (singurul cu DOM: pointer și taste).
- `src/ui/` — textele (în română, într-un singur modul `strings.ts`, fixate de `strings.test.ts`), banda de sus (`hud.ts`),
  cartonașele de start și de final (`cards.ts`), formatul ceasului (`format.ts`) și stilurile (`ui.css`; variabilele de culoare au nume pe roluri,
  fontul titlului e Exo 2).
- `src/main.ts` — legătura dintre ele: trei stări (start, joc, final), bucla de cadre, testul de viteză.
- `scripts/` — `smoke.cjs` (proba în browser cu Playwright, 9 verificări, capturi în `smoke-out/`, plus un rând `SMOKE INFO` cu timpul de
  desen la 150 de nave dușmane, din `window.__wg.drawMs`) și `single-file.mjs`
  (`npm run single`: tot jocul într-un singur fișier HTML, în `dist-single/`).
- `.github/workflows/` — `ci.yml` (`npm run check` la fiecare pull request) și `deploy.yml` (publică pe GitHub Pages la push pe `main`).

## Reguli dure în `src/sim/`
Păzite de `src/sim/discipline.test.ts` (care are și o probă negativă).
- **Fără `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`.** Aleatorul vine din
  `createRng(seed, 'nume-flux')` (`rng.ts`), câte un flux numit pe sistem — altfel o tragere în plus
  într-un loc mută tot ce urmează în altul.
- **Pas fix de 1/60 s** (`DT`), indiferent de ecran. Aceeași sămânță și aceleași comenzi dau aceeași stare.
- **Starea trece prin JSON.** `GameState` e date simple: fără funcții, fără referințe între obiecte.
  `JSON.parse(JSON.stringify(s))` trebuie să continue identic — pe asta stă reluarea unei partide întrerupte.
- **O verificare întoarce motivul, nu doar „nu”** (`Result` din `result.ts`).
- Fără DOM și fără rețea în simulare.

## Cum se lucrează
- După fiecare felie: `npm run check` verde → intrare în `DEVLOG.md` → commit. Stagează explicit
  fișierele, **nu** `git add -A` (owner-ul rulează sesiuni paralele pe proiecte diferite).
- **Verificare proporțională.** Teste pe logica de joc (reguli, determinism, replay). Fără infrastructură
  de verificare înaintea unui joc jucabil — lecția de la Kinstead: întâi aflăm dacă e distractiv.
- **Designul e al owner-ului (Andrei).** Ce propui tu se marchează „propunere” până decide el.
  Deciziile luate stau în `docs/GDD.md`, secțiunea „Cine a hotărât ce”; nu le redeschide fără el.
- Măsoară înainte să afirmi: o cifră care ajunge într-o decizie se măsoară, nu se estimează.
- Când va exista backend: regula comună a proiectelor lui Andrei — instanță de **test** și **live**,
  publicarea pe live doar de owner, cu confirmare și jurnal.

## Stare
- **Faza 1, în cod (17.11.2026):** jocul e jucabil: navă cu joystick, strâns resurse, cercuri de investit,
  dușmani, luptă, turele, desenat pe Canvas 2D, cartonașe de start și de final cu record local, „Test de viteză”.
  CI rulează `check` la fiecare pull request; `deploy.yml` publică pe GitHub Pages la push pe `main`;
  `npm run single` dă varianta într-un singur fișier.
- **Tema de spațiu, în cod (18.11.2026):** planetă, nave, cristale și asteroizi în locul castelului; numele din cod, textele și fontul
  sunt cele noi, regulile și cifrele neschimbate. `npm run check` (93 de teste) și `npm run smoke` (9 verificări) trec. Schela „aceeași
  partidă” a fost ștearsă; cifrele ei de la sfârșit sunt în `DEVLOG.md`. Timpul de desen cu 150 de nave: vezi `DEVLOG.md`.
- **Nefăcut încă:** eticheta `hex-td-v0.0.1`, pornirea GitHub Pages din setările repo-ului și verificarea pe telefonul
  lui Andrei (Samsung Galaxy A54), inclusiv că arată ca varianta „Orbită” și că deosebește dintr-o privire nava lui, navele
  dușmane, cristalele și asteroizii — toate ale lui Andrei.
- **Urmează:** planul 2 (pauză, instalare pe telefon, joc fără internet, reluarea unei partide întrerupte) și planul 3
  (plasa pentru dificultate și reechilibrarea).
