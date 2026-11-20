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
npm run check      # typecheck + teste + bundle — ASTA e poarta înainte de commit
npm test           # Vitest
npm run bundle     # vite build + scripts/build-sw.mjs (scrie dist/sw.js); `build` = tsc + bundle
npm run build
npm run smoke      # proba în browser (Playwright instalat pe mașină); nu face parte din `check`
npm run single     # dist-single/world-guard.html: tot jocul într-un singur fișier (pentru încercat pe telefon)
npm run balance    # tabelul jucătorilor automați (100 de partide, ~13 s); `-- --raze` adaugă razele de apărare 80 și 160 (~35 s); doar afișează
npm run icons      # pictogramele PNG din public/icons/icon.svg (doar când se schimbă desenul; PNG-urile se comit)
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
  `flags.ts` (`?seed=` și `?debug=1` din adresă), `storage.ts` (recordul în `localStorage`, cheia `wg.v1.record`, și partida salvată:
  `saveGame`, `loadGame`, `clearGame`, cheia `wg.v1.save`; orice eroare = fără record și fără reluare), `save.ts` (salvarea ca text,
  cu versiune, verificată la citire), `session.ts` (fazele `ready | playing | paused | over`, când se salvează și când se șterge partida,
  întreținerea testului de viteză), `wake.ts` (ecranul aprins cât se joacă), `sw.ts` (înregistrează `./sw.js`; un refuz e înghițit).
- `public/` — `manifest.webmanifest` (instalarea; `theme_color` e `--edge`) și `icons/` (`icon.svg`, sursa, și PNG-urile 192, 512 și
  `maskable` 512, făcute din el de `scripts/make-icons.cjs`). `src/env.d.ts` declară `__WG_SW__` (pus de `vite.config.ts` la `true`,
  de `vite.single.config.ts` la `false`: pagina într-un singur fișier nu are service worker).
- `src/bots/` — plasa pentru dificultate: cinci jucători automați care joacă partide întregi pe simulare. **Nu intră în jocul livrat** (`main.ts` nu-l importă) și e păzit de aceeași disciplină ca `src/sim/` (`src/sim/discipline.test.ts` îl citește și pe el): fără ceas și fără hazard global, doar citește starea.
  `policy.ts` (cele cinci purtări, `POLICIES`, și alegerea țintei: luptă, plată, strâns, acasă), `nav.ts` (mersul drept spre țintă, cu ocolire când nu se mai apropie, ieșirea de pe cercurile străine și ocolitul unui cerc străin construit împreună cu clădirea lui, ca un singur obstacol), `bot.ts` (`createBot`: starea în, `Input` afară), `run.ts` (`playOne`, `measure`, `measureAll`; `SEEDS` = 1…20, `RUN_CAP` = 900 s),
  `limits.ts` (limitele din design ca date, `verdicts`, `formatTable`), `table.ts` (tipărește tabelul pentru `npm run balance`; construit cu `vite.balance.config.ts` în `dist-balance/`, ignorat de git) și `net.test.ts` (limitele ca teste: joacă o dată cele 100 de partide și are un test pe fiecare limită; durează cam 20 s).
- `src/render/` — desenarea pe Canvas 2D. Citește starea, nu o modifică. `canvas.ts` (mărimea, ordinea straturilor; singurul care numește
  aspectul și pictează cerul o dată), `camera.ts` (scara ecranului și urmărirea navei), `world.ts` (tot ce e în coordonate de lume și ar fi la fel
  în orice aspect: straturile, săritul peste ce nu se vede, cercurile, etichetele, barele, textele plutitoare),
  `overlay.ts` (indicatorul spre planetă și joystickul, în coordonate de ecran), `palette.ts` (culorile citite o dată din variabilele CSS),
  `skin.ts` (interfața `Skin`: formele de pe canvas care diferă de la un aspect la altul, între ele nava cu modulele ei în `hero`, racheta în `shot`,
  raza laserului în `beam` și explozia în `blast`; culorile stau în `palette.ts` și în `ui.css`), `draw.ts` (primitivele de desen), `derive.ts` (ce citește desenul din
  stare, fără DOM: `turretAim`, `shieldSpan`, `regrown`, `fade`, `shieldReady`, `blockGlow`, `blastReach`), `orbit/` (aspectul „Orbită”, singura implementare a lui `Skin`: `index.ts`;
  `scene.ts` — cerul și planeta, **singurul loc cu gradient și decupaj**; `things.ts` — resurse, clădiri, nave (a ta cu formele modulelor și inelul Scutului), raze, rachete, explozii, doar forme pline și linii).
  `world.ts` desenează stratul razelor peste inelul planetei: exploziile, raza laserului, apoi rachetele și razele turelelor.
  Testele: `derive.test.ts`, `world.test.ts` (ordinea straturilor; `drawWorld` cu `ORBIT` peste o stare bogată, și peste una cu toate cele nouă module, nu schimbă starea),
  `discipline.test.ts` (fără `shadowBlur`; gradient de orice fel, decupaj și `ctx.filter` doar în `orbit/scene.ts`), `palette.test.ts`
  (culorile `#rgb` lăsate de micșorarea CSS-ului la build, aduse la `#rrggbb`) și `camera.test.ts`. `ground.ts` nu mai există. Mișcările doar de desen (continente, nori, satelit, flăcări, țeava turelei)
  se calculează din timpul partidei și din stare; nu scriu nimic în stare.
- `src/input/` — comenzile: `joystick.ts` (logica joystickului, fără DOM, testată), `bind.ts` (singurul cu DOM: pointer și taste; `pickIndex`, fără DOM și testată, spune ce ofertă aleg tastele 1–3).
- `src/ui/` — textele (în română, într-un singur modul `strings.ts`, fixate de `strings.test.ts`), banda de sus (`hud.ts`: `shipRow` fără DOM dă rândul navei, cu inelul de experiență, după `heroPadView` din `src/sim/mods.ts`, citit și de cercul navei de pe canvas; banda are aceeași înălțime în start, joc, pauză, panou și final, iar în testul de viteză e mai înaltă cu rândul fps, verificarea 26 din proba din browser), locurile navei (`slots.ts`, aceleași în bandă și în panou),
  cartonașele de start (cu „Continuă partida”), de pauză și de final (`cards.ts`), panoul de alegere de la un nivel nou al navei
  (`choice.ts`: `choiceView` fără DOM, `createChoice` în pagină; la deschidere focusul stă pe cartonaș, nu pe o ofertă, și nicio alegere nu trece
  în primele `CHOICE_GRACE_MS` = 400 ms, propunere; pictogramele modulelor sunt `<symbol>` în `index.html`), apăsarea butoanelor (`tap.ts`: la atingere, la ridicarea
  degetului deasupra butonului, și pentru al doilea deget; cu mausul și tastatura, la `click`; o singură pornire pe gest), formatul ceasului (`format.ts`) și stilurile (`ui.css`; variabilele de culoare au nume pe roluri,
  fontul titlului e Exo 2).
- `src/main.ts` — legătura dintre ele: nu ține stări, le ia din sesiune; pauza (buton, Escape, pagina ascunsă), bucla de cadre,
  ecranul aprins, înregistrarea service worker-ului (doar în build, cu `__WG_SW__`). Cu `?debug=1`, `window.__wg` are `state()`,
  `phase()`, `run(secunde)` și `drawMs(cadre)`.
- `scripts/` — `smoke.cjs` (proba în browser cu Playwright, 26 de verificări, capturi în `smoke-out/`, plus rânduri `SMOKE INFO` cu timpul de
  desen pe cadru cu cele 150 de nave dușmane ale testului de viteză așezate în jurul planetei, ca să fie în vedere, din `window.__wg.drawMs`:
  o dată cu nava fără module, o dată cu toate cele nouă module la treapta 3 și armele trăgând; capturile `10-nava-module.png` (mărită),
  `11-explozie.png`, `12-nava-la-scara.png`, `13-banda-rachete.png` și `14-panou-rachete.png` nu sunt verificări; merge doar pe Linux și macOS), `single-file.mjs` (`npm run single`: tot jocul într-un singur fișier HTML, în `dist-single/`),
  `sw-template.js` și `build-sw.mjs` (service worker-ul scris de mână; după `vite build`, `build-sw.mjs` pune în el lista fișierelor din
  `dist` și o versiune din SHA-256-ul lor și scrie `dist/sw.js`; o versiune nouă se activează la următoarea pornire, niciodată în timpul
  unei partide) și `make-icons.cjs` (`npm run icons`).
- `.github/workflows/` — `ci.yml` (`npm run check` la fiecare pull request, cu `permissions: contents: read`) și `deploy.yml` (publică pe GitHub Pages la push pe `main`).

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
  sunt cele noi, regulile și cifrele neschimbate. `npm run check` (99 de teste) și `npm run smoke` (9 verificări) trec. Schela „aceeași
  partidă” a fost ștearsă; cifrele ei de la sfârșit sunt în `DEVLOG.md`. Timpul de desen cu 150 de nave așezate în jurul
  planetei (rândul `SMOKE INFO`): vezi `DEVLOG.md`. Designul temei a fost aprobat de Andrei pe 18.11.2026.
- **Publicat:** Andrei a pornit GitHub Pages pe 17.11.2026; faza 1 e la https://andreibesliu.github.io/WorldGuard/ și a încercat-o
  pe telefonul lui (Samsung Galaxy A54): „se simte ok până aici”.
- **Tema, încercată pe telefon:** Andrei a încercat tema de spațiu pe telefonul lui pe 18.11.2026: „pe telefon, totul arată super bine”.
  Cifrele de la „Test de viteză” cu tema nouă nu le-a spus încă.
- **Faza 2, în cod și publicată (18.11.2026, pull request-ul #14):** pauza (buton, Escape, automată la ieșirea din pagină), salvarea partidei în
  telefon și „Continuă partida”, ecranul aprins cât se joacă, instalarea pe ecranul de pornire și jocul fără internet (service worker generat la build).
  Neîncercată încă de Andrei pe telefon: pe 18.11.2026 a cerut să se meargă mai departe fără să aștepte proba; o va face când se strâng mai multe lucruri.
- **Faza 3, în cod (18.11.2026):** plasa pentru dificultate (`src/bots/`, `npm run balance`, limitele din design ca teste în `src/bots/net.test.ts`) și reechilibrarea a două cifre, **propuneri până le vede Andrei în joc**: lovitura navei +10 pe nivel (era +6) și viața dușmanului 14 × (1 + t / 45) (era t / 80). Spre minutul 5 un dușman are 107 viață (înainte 66,5), nava de nivelul 5 lovește cu 50 (înainte 34); în primul minut nava de nivelul 1 are nevoie de 4 lovituri pe dușman în loc de 3. Plasa: cinci jucători automați joacă partide întregi pe 20 de semințe, iar testele pică dacă dificultatea iese din limitele designului; tabelul măsurat, ce nu vede plasa și ce face reechilibrarea cu turelele sunt în `docs/GDD.md`, la „Plasa pentru dificultate” și „Cine a hotărât ce”. `npm run check`: 232 de teste trec; `npm run smoke`: 20 de verificări.
- **Nefăcut încă:** eticheta `hex-td-v0.0.1` — a lui Andrei; proba lui pe telefon pentru fazele 2 și 3 împreună (instalarea, jocul fără internet, pauza, reluarea, ecranul aprins, cum se simte dificultatea nouă).
- **Urmează:** lista „Scopuri pentru v1” din design e în cod după faza 3; scopul 7 („nicio strategie care ignoră o direcție nu bate un amestec”) e păzit pentru acești cinci jucători automați, nu acoperit în general (vezi „Ce e fragil” în `docs/GDD.md`). Ce vine mai departe are nevoie de hotărârea lui Andrei.
