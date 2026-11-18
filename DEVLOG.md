# DEVLOG — World Guard

Jurnal append-only. Fiecare sesiune adaugă o intrare: ce s-a cerut, ce s-a făcut, ce s-a măsurat,
ce a rămas.

---

## 04.10.2026 — Design, scanarea pieței și pasul 0 al prototipului

**Cerut de owner:** un tower defense; discuție de design întâi; prototip în browser; țintă comercială.
Designul s-a făcut într-o sesiune cloud, cu tabla FigJam
(https://www.figma.com/board/OKHd5kH7tHWGhDcRH7GQP5) și trei scanări de piață
(concurenți direcți, sisteme de combinații, piața TD pe Steam), plus două despre meta-progresie
(hărți persistente, dificultate opțională). Rezultatul: `docs/GDD.md` v0.1.

**Făcut (pasul 0):**
- schelet TypeScript + Vite + Vitest, zero dependențe de runtime;
- `src/sim/`:
  - `hex.ts`: coordonate axiale, vecini, linie;
  - `rng.ts`: aleator determinist pe fluxuri numite;
  - `map.ts`: hartă din seed, cu teren în pete coerente și capete fixe;
  - `path.ts`: ocolurile și regula „drumul nu se atinge singur”;
  - `game.ts`: jurnalul deciziilor, replay, amprentă;
- `src/render/canvas.ts` și `src/main.ts`: harta, drumul și previzualizarea ocolului, cu interacțiune;
- 33 de teste, inclusiv:
  - determinism;
  - replay prin JSON;
  - 60 de ocoluri aleatoare pe 10 hărți, cu invariantele verificate la fiecare pas;
  - proba negativă a disciplinei.

**Măsurat — și a schimbat mecanica:**
- **Primul model a fost respins de propriile teste.** Prima variantă insera ocolul între doi vecini de pe
  drum. Cu regula „drumul nu se atinge singur”, pe un drum drept nu încăpea niciun ocol mai lung de +1:
  capetele ocolului ajung mereu vecine între ele.
- **Modelul nou:** o bucată **înlocuiește** o porțiune de 1–3 hexagoane cu un ocol mai lung, ca atunci
  când tragi de o sfoară.
- **Pe drum drept:**
  - porțiunea 1 permite doar +1;
  - porțiunea 2 permite +1 și +2;
  - porțiunea 3 permite +1, +2 și +3.

  De aici vine `INSERARE.portiuneMaxima = 3`.
- **Joc aleator:** 60 de încercări, pe 40 de hărți. Reușesc minim 5, mediana 24, maxim 35. Testul
  păzește min ≥ 3 pe hartă și mediana ≥ 15.

**Rămâne (prototipul 1, GDD §10), în ordinea propusă:**
- [ ] valurile și inamicii care merg pe drum (simulare pe tick fix, deterministă);
- [ ] turnurile de bază și țintirea;
- [ ] stările pe inamici și reacțiile (pe etichete), plus terenul în reacții;
- [ ] vecinătatea între turnuri;
- [ ] economia: aur cu dobândă, pământ;
- [ ] terraformarea: canal, deal, arde;
- [ ] draftul 1 din 3 între valuri, apoi bossul;
- [ ] HUD minim, plus previzualizarea valului.

---

## 17.11.2026 — Jocul nou ia locul celui vechi; starea de pornire (faza 1, task 1)

**Cerut de owner:** un joc de apărat castelul pentru telefon, în care un erou strânge resurse și le
investește; el ia locul tower defense-ului pe hexagoane din repo. Designul: `docs/GDD.md` (aprobat 17.11.2026).

**Jocul vechi:** rămâne la commit-ul `ec73b9e` (părintele ramurii asta). Eticheta `hex-td-v0.0.1` nu s-a
putut pune din sesiune; Andrei o poate pune singur: `git tag hex-td-v0.0.1 ec73b9e && git push origin hex-td-v0.0.1`.

**Păstrat:** scheletul (TypeScript, Vite, Vitest, poarta `npm run check`), `src/sim/rng.ts`,
`src/sim/rng.test.ts`, `src/sim/result.ts`, `src/sim/discipline.test.ts`, regulile de lucru.
**Scos:** harta pe hexagoane, drumul, jurnalul de decizii, desenatul și testele lor; regula „orice acțiune
e o decizie în jurnal” (la un joc cu joystick ar însemna direcția la fiecare pas). Rămâne determinismul.

**Făcut:**
- `docs/GDD.md` înlocuit; `docs/prototip.html` și planul fazei 1 adăugate;
- `src/data/balance.ts` (cifrele și curbele) și `src/data/layout.ts` (lume, castel, grupuri de resurse, cercuri);
- `src/sim/state.ts` (tipurile și `createGame`), `step.ts` (doar ceasul), `testkit.ts`;
- `src/main.ts` ciot, ca build-ul să aibă intrare până la Task 7.

**Rămâne:** task-urile 2–9 din planul fazei 1 (erou, cercuri, dușmani, luptă, desen, interfață).

**Task 2 — eroul (`src/sim/hero.ts`):** mers (165 px/s, proporțional cu comanda), coliziuni cerc pe cerc
(castel, resurse cu `left > 0`, turnuri/tabere/cariere construite, marginea la 20), strâns la cel mult 16 px
de margine (prima bucată imediat), refacere 4/s după 3 s, cădere și reapariție după 5 s lângă castel;
`step` readuce resursele epuizate la plin. Cifrele noi (zonă moartă 0,01, blocarea privirii 0,25 s după
lovitură, marginea 20, norișorul de 26) stau în `BALANCE.hero`. Măsurat: 8 teste în `hero.test.ts`.

**Task 3 — cercurile (`src/sim/pads.ts`):** plata începe după 0,35 s de stat în cerc (centrul eroului la cel mult
`PAD_R`), o unitate la 0,035 s, lemn și piatră alternând; la terminarea nivelului `paid` se golește, urmează
pauza de 0,7 s (deci ~1,05 s până la plata următoare), iar efectul `level` apare la clădire (la erou, la cerc).
Tabăra și cariera produc singure (`prodT` pornește de la intervalul nivelului 1 la prima construire); reparatul
schimbă o piatră pe 5 viață și se oprește la plin. Eroul doborât nu plătește. Nicio cifră nouă în `BALANCE`.
Măsurat: 11 teste în `pads.test.ts`.

**Task 4 — dușmanii (`src/sim/foes.ts`):** apariție pe perimetru din fluxul `aparitie-N` (fiecare al 7-lea, după 120 s, e bruta),
mers spre castel sau spre erou (sub 90 px), atac 1 s în castel / 0,8 s în erou, impuls amortizat, o trecere de despărțire pe pas,
scoaterea celor doborâți (`kills`, norișor) și sfârșitul partidei când castelul cade; `step` curăță și `fx` bătrâne. Cifră nouă:
`BALANCE.fx.puffPad` (6). Două teste din plan au fost corectate: marginea se verifică în clipa apariției (după 0,1 s dușmanul a
mers deja ~4 px), iar pragul de despărțire e 15, nu 19 (o trecere pe pas lasă o mică suprapunere într-o mulțime înghesuită, măsurat 18–19 din 20).

**Task 5 — lupta (`src/sim/combat.ts`):** lovitura eroului la 0,45 s (toți dușmanii din rază și din arcul de 1,25 rad în jurul celui mai
apropiat, impuls 140 / 60 pe bruta), turnurile trag la 0,8 s în cel mai apropiat din 190 px, săgețile zboară cu 420 px/s spre poziția de acum
a țintei și lovesc la un pas + 6 px; `updateCombat` stă între `updatePads` și `updateFoes`. Cifre noi în `BALANCE`: `tower.arrive` (6),
`foe.stopCastle` (1), `foe.stopHero` (2) — ultimele două erau literale în `foes.ts`. Măsurat: partida fără niciun gest cade la
71,3 / 62,0 / 65,1 / 60,5 / 64,9 s (semințile 1–5; prototipul a avut 94 s); un pas cu 150 de dușmani sub 1 ms.
Corectură Task 5: „94 s” din plan era o singură rulare norocoasă. Măsurat la 60 de pași/s: prototipul 67–88 s (fără erou 58–72 s), simularea nouă
60,5–72,2 s pe semințele 1–8 (fără erou 54–58 s). Cauza, verificată: în prototip un dușman ajuns singur la zid putea rămâne la ~1,4e-14 de distanța de
oprire și nu lovea niciodată (12 din 40 de încercări); la noi comparația cu `EPS` îl face să lovească mereu, cum cere specificația. Jocul nou e deci
puțin mai aspru (fără apărare, castelul cade în ~56 s, nu în ~64 s), iar limitele testului „fără niciun gest” au fost corectate pe baza măsurătorii.

**Task 6 — bucla și comenzile (`src/app/loop.ts`, `src/input/`):** `advance` scoate pași de 1/60 s din acumulator (cel mult 5 pe cadru, restul se aruncă; cu `EPS` la comparație), 600 de pași la 10 s pe 30/60/90/120/144 fps. Joystickul: rază 48 px, zonă moartă 14%, viteză maximă la 70% din cursă, baza urmează degetul; al doilea deget e ignorat; tastele WASD/săgeți normalizate pe diagonală. Cifre noi: `BALANCE.stick` (`r`, `dead`, `full`). `bind.ts` (singurul cu DOM) nu are test unitar; îl acoperă smoke-testul din browser. Măsurat: 7 teste în `loop.test.ts` și `joystick.test.ts`.

**Task 7 — pagina și desenatul (`index.html`, `src/ui/`, `src/render/`):** pagina completă (`lang="ro"`, `viewport-fit=cover`, banda și cartonașele își adaugă singure `env(safe-area-inset-*)`, canvasul cu `touch-action: none`), toate textele în `STR`, fonturile din `@fontsource` (Alfa Slab One 400; Rubik 400/500/700; latin și latin-ext), fără nicio cerere în afara `localhost`. Desenatul e portat din prototip, fără `Math.random()` (terenul vine din fluxul `iarba`); toate mărimile care oglindesc o regulă se citesc din `BALANCE` și `layout`. `main.ts` rulează jocul fără comenzi, cartonașele rămân ascunse. Măsurat: 3 teste în `camera.test.ts`; `npm run smoke` dă `SMOKE OK (3 verificări)` la 390 × 780, iar capturat arată ca prototipul.

**Task 8 — interfața și legarea (`src/ui/`, `src/app/`, `src/main.ts`):** jocul e jucabil: cartonașul de start, joystickul, banda (lemn, piatră, ceas, viața castelului, roșu sub 35% și o secundă după lovitură), cartonașul de final cu recordul (`localStorage`, `wg.v1.record`, orice eroare de stocare = fără record), „Încă o partidă” cu sămânță nouă, testul de viteză (150 de dușmani, castel mereu plin, fps pe ferestre de 0,5 s, fără record) și `window.__wg` doar cu `?debug=1`. Parcate din revizuiri: `advance` tratează NaN ca 0; `bind.ts` ignoră butoanele secundare, ia captura doar dacă joystickul a luat pointerul și lasă tastele cu Ctrl/Meta/Alt; `smoke.cjs` pornește vite direct, refuză un port ocupat și oprește sigur serverul; cheie `data-str` lipsă aruncă; test de cameră pe vedere 0 × 0. Măsurat: `SMOKE OK (9 verificări)`; la verificarea 7, partida cu eroul mutat ~0,5 s la stânga cade la 1:00 (60,8 s pe sămânța 7; cu eroul mers 1 s, 56 s, sub limita de 1:00), deci gestul din probă e o singură mișcare, apoi ținut 500 ms.
Proba din browser, verificarea 7: limita de timp corectată la 0:50–2:10, fiindcă „1:00” din plan era anterioară măsurătorii că un castel fără apărare cade în 54–72 s.

**Task 9 — verificare automată, publicare, joc pe telefon:** `.github/workflows/ci.yml` rulează `npm run check` la fiecare pull request; `deploy.yml` (la push pe `main` și manual) rulează același `check`, care se încheie cu `vite build`, încarcă `dist` și îl publică pe GitHub Pages (acțiuni: checkout și setup-node v7, upload-pages-artifact și deploy-pages v5, cele mai noi majore găsite cu `git ls-remote --tags`). Proba din browser nu e în CI. `npm run single` (`vite.single.config.ts` + `scripts/single-file.mjs`) scrie `dist-single/world-guard.html`: un fragment (titlu, `claude:viewport-fit-sides`, un `<style>` cu fonturile ca `data:`, conținutul lui `<body>`, un `<script type="module">`), fără `<html>`/`<head>`/`<body>`/`<!doctype>`; scriptul se oprește dacă lipsește `index.html`, dacă nu e exact un script și o foaie de stil sau dacă a rămas vreun `src=`/`href=`/`url()` spre un fișier. Documente: `README.md` (comenzi, cum se joacă, testul de viteză, `?seed=` și `?debug=1`), „Stare” din `CLAUDE.md`; propoziția „GDD §14” din `CLAUDE.md` trimite acum la „Cine a hotărât ce” din `docs/GDD.md`.

**Măsurat (Task 9):**
- fără niciun gest, castelul cade la 71,3 / 62,0 / 65,1 / 60,5 / 64,9 s (semințile 1–5, Task 5);
- un pas cu 150 de dușmani: 0,45 / 0,40 / 0,47 ms (medie pe 6000 de pași, trei serii, sămânța 7, în Node pe mașina de dezvoltare, nu pe telefon; cu aceeași umplere la 150 ca în testul de viteză, castel mereu plin; măsurat cu un test Vitest temporar, șters);
- build-ul: `dist` are JS 28,9 kB (28 922 octeți) și CSS 6,7 kB (6 739 octeți), plus fonturile ca fișiere; `dist-single/world-guard.html` are 400 182 octeți (cam 391 kB, sub limita de 2 MB; fonturile ca `data:` ocupă aproape tot);
- `world-guard.html` încadrat într-o pagină minimă și deschis din `file://` în Chromium (Playwright, 390 × 780): nicio eroare în consolă, o singură cerere (fișierul însuși), cartonașul arată „World Guard”, iar după „Începe” canvasul e desenat.

**Valul de reparații după revizuirea întregii ramuri:**
- `separate()` (`src/sim/foes.ts`) a recăpătat pre-verificarea cu dreptunghiul din prototip: perechile depărtate sar peste `hypot`. Rezultatele simulării nu s-au schimbat (toate testele existente verzi, fără nicio editare). Măsurat cu un test Vitest temporar (șters), scenariul din `run.test.ts` (150 de dușmani, sămânța 1, 600 de pași, cinci serii): înainte 0,59 / 0,54 / 0,47 / 0,39 / 0,39 ms pe pas, după 0,16 / 0,14 / 0,08 / 0,08 / 0,08 ms.
- Comanda de mers e limitată la lungimea 1 în simulare (`updateHero`): `{ x: 3, y: 4 }` o secundă dă 165 de unități, nu 825; test nou în `hero.test.ts`.
- Camera primește `pași × DT`, nu timpul cadrului afișat, cât timp se joacă: pe ecran de 120 Hz eroul nu mai tremură (poziția lui pe ecran nu se schimbă la cadrele fără pas și nu merge niciodată înapoi). Test nou în `camera.test.ts`, la 60 / 90 / 120 / 144 Hz; cu timpul cadrului, același test pică (4,71 față de 5,09 px între două cadre). Prețul acceptat: mișcarea se actualizează de 60 de ori pe secundă și pe ecran de 120 Hz.
- Testul de viteză e un instrument de măsură: eroul rămâne mereu viu (cel doborât e readus pe loc), dușmanii noi nu mai apar de la sine (numărul rămâne exact 150), banda arată și cea mai mică valoare („TEST · 58 fps · min 41”), iar `README.md` spune că din test se iese reîncărcând pagina. Proba din browser (verificarea 9) cere acum și „min”.
- Cartonașele: `overflow-y: auto` pe `.veil` și `margin: auto` pe card, deci pe 915 × 356 cartonașul de start (471 px) se derulează cu degetul până la „Test de viteză” (verificat în Chromium cu atingeri reale: derulare, apăsare pe ambele butoane). `touch-action: pan-y` pe `html`, `body` și `.veil` oprește ciupitul de zoom pe toată pagina, iar `overscroll-behavior: none` e acum și pe `html`. Ciupitul în sine nu a putut fi simulat; s-a verificat valoarea calculată.
- Bucla de cadre își programează cadrul următor primul, deci o excepție într-un cadru nu o mai oprește (eroarea ajunge tot în consolă).
- Desenatul sare peste noduri, clădiri, dușmani, cercuri, săgeți și efecte din afara ecranului (margine 160 px de lume), iar `alpha()` ține minte rezultatele. Capturile din `smoke-out/` arată la fel ca înainte.
- Cifre care oglindesc reguli: arcul loviturii desenat vine din `BALANCE.hero.arc` (era 1,2 față de 1,25), pragul de viață scăzută e `LOW_FRAC` în `layout.ts` (era scris în două locuri), iar `viewScale` folosește `WORLD.w` și `VIEW_H` (880, mutat în `layout.ts`).
- `scripts/smoke.cjs`: mesajul fără Playwright spune că trebuie să meargă `require('playwright')`. `CLAUDE.md`: secțiunea „Arhitectura” descrie acum tot ce e în `src/` și `scripts/`.

**Rămâne:**
- [ ] eticheta `hex-td-v0.0.1` pe commit-ul `ec73b9e` (o poate pune doar Andrei; comanda e în `CLAUDE.md`);
- [ ] pornirea GitHub Pages din setările repo-ului, cu sursa „GitHub Actions” (doar Andrei);
- [ ] verificarea pe telefonul lui Andrei (Samsung Galaxy A54): cum se simte și câte cadre pe secundă dă „Test de viteză”;
- [ ] planul 2: pauză, instalare pe telefon și joc fără internet, reluarea unei partide întrerupte;
- [ ] planul 3: plasa pentru dificultate și reechilibrarea (investiția doar în erou ține azi la fel de mult ca a construi);
- [ ] jocul e puțin mai aspru decât prototipul, fiindcă dușmanii ajunși la zid lovesc mereu; de văzut la verificarea pe telefon dacă viața castelului trebuie mărită.

## 18.11.2026 — Tema de spațiu

**Cerut:** jocul își schimbă tema din castel în spațiu și numele din cod, fără nicio schimbare de reguli (designul: `docs/superpowers/specs/2026-11-17-tema-spatiu-design.md`).

**Task 1, plasa de dinainte** (pe codul de azi, fără nicio redenumire):
- `src/sim/golden.test.ts`: o partidă de probă (sămânța 7, 200 s de joc, cu construit, strâns, doborârea eroului și reparat) cu 10 rânduri de cifre măsurate; după redenumire trebuie să iasă aceleași. E schelă și se șterge în Task 5.
- `window.__wg.drawMs(frames)` (doar cu `?debug=1`): media, în ms pe cadru, a unor cadre desenate unul după altul, cu citirea unui pixel după fiecare ca desenul să fie dus la capăt. `npm run smoke` tipărește `SMOKE INFO: desen cu 150 de dușmani` (mediana a cinci serii de 200 de cadre); nu e verificare, deci rămân 9.
- **Timpul de desen dinainte:** 5,70 / 5,76 / 5,61 ms pe cadru în trei rulări de `npm run smoke`; cea din mijloc, 5,70 ms, e valoarea de comparat. Mașina: Linux `6.18.44-fc-v595` (`uname -r`), Chromium fără ecran din Playwright.

**Task 2, numele din cod** (fără schimbare de reguli sau de aspect):
- `wood` → `crystal`, `stone` → `metal`, `castle` → `core`, `tower` → `turret`, `camp` → `collector`, `quarry` → `mine`, `swing*` → `strike*`, `slash*` → `wave*`; în `src/sim/`, `src/data/`, `src/main.ts`, testele lor, `index.html`, `src/ui/hud.ts`, cheile din `src/ui/strings.ts` și numele de clase din `src/ui/ui.css`. Valorile textelor din `strings.ts` au rămas cele vechi (le schimbă Task 4). Comentariile și numele testelor au trecut pe cuvintele noi.
- Câmpul `walk` a dispărut din `Hero`, din `createGame` și din `updateHero`; odată cu el, legănatul de mers (`bob`) din `src/render/world.ts`, singurul lui cititor. Eroul nu mai urcă și coboară ușor la mers (singura schimbare vizibilă). Fiindcă `drawHero` nu mai citea comanda, `input` a ieșit și din `drawWorld` și din `renderer.frame` (cerut de compilare).
- **Partida de probă:** `src/sim/golden.test.ts` dă aceleași zece rânduri de cifre; rândurile din `MARKS` nu au fost atinse (`git diff` pe ele: 0 linii). 81 de teste trec; `npm run smoke`: `SMOKE OK (9 verificări)`.

**Task 3, aspectul „Orbită” pe canvas** (fără schimbare de reguli; textele de pe ecran rămân cele vechi, le schimbă Task 4):
- Tot ce ține de aspect stă în spatele interfeței `Skin` (`src/render/skin.ts`), cu o singură implementare, `ORBIT` (`src/render/orbit/`): `scene.ts` (cerul pictat o dată din fluxul `'cer'`, planeta, inelul-scut, discul din indicator; singurul fișier cu gradient și decupaj) și `things.ts` (cristale, asteroizi, turela, colectorul și mina, navele, razele, semnele cercurilor, jetoanele romb și hexagon; doar forme pline și linii). `src/render/canvas.ts` e singurul loc care numește aspectul. `src/render/ground.ts` s-a șters; umbrele de sub obiecte au dispărut.
- Straturile: cercurile, planeta, apoi resursele, clădirile și navele sortate după `y` (fiecare cu bara ei), inelul-scut peste nave, apoi reapariția, razele și textele. Păzit de `src/render/world.test.ts`.
- `src/render/derive.ts` (fără DOM): `turretAim`, `shieldSpan`, `regrown`. Regula de țintire a turelei e acum o singură funcție, `nearestFoeWithin` din `src/sim/combat.ts`, folosită și de `fireTurrets`, și de desen; partida de probă dă aceleași cifre. `src/render/discipline.test.ts` refuză `shadowBlur` peste tot și gradientul sau decupajul în afara lui `orbit/scene.ts`.
- `input` s-a întors în calea de desen (`renderer.frame(s, input, stick, frameDt)`, `drawWorld(ctx, s, input, v, skin)`): flacăra navei apare doar când comanda e peste `BALANCE.hero.deadzone`.
- Culorile din `:root` (`src/ui/ui.css`) au nume pe roluri (`--sky`, `--crystal`, `--hull`, …); `src/render/palette.ts` le citește pe toate până la `--night`.
- **Măsurat:** 91 de teste trec (81 + 5 + 2 + 3); `npm run smoke`: `SMOKE OK (9 verificări)`. Timpul de desen cu 150 de dușmani: 6,41 / 6,22 / 6,46 ms pe cadru în trei rulări, mediana 6,41 ms, față de 5,70 ms înainte (+12 %, sub pragul de un sfert), aceeași mașină.

**Task 4, pagina: texte, jetoane, font** (fără schimbare de reguli):
- Valorile din `src/ui/strings.ts` au trecut pe tema de spațiu (Turelă, Colector, Mină, Navă, „Repară planeta”, „Planeta a căzut”, „Nave doborâte”, „Zona de joc”, regulile de pe cartonașul de start); `src/ui/strings.test.ts` (4 teste) le fixează și refuză cuvintele temei vechi.
- Fontul titlului: `@fontsource/alfa-slab-one` ieșit, `@fontsource/exo-2` (dev, ^5.3.0) intrat, la grosimea 800 (`latin` și `latin-ext`); `--font-display` e „Exo 2”, „Rubik”, system-ui. Jetonul de cristal e romb, cel de metal hexagon (`clip-path`), ca pe canvas.
- `scripts/smoke.cjs`: verificarea 4 cere acum și cele două fețe „Exo 2” încărcate, și cifre de lățime egală (`1111` și `0000` în `#clock`: 49,609375 / 49,609375 px); verificarea 7 așteaptă „Planeta a căzut”; captura `01-teren.png` e acum `01-cer.png`.
- **Măsurat:** 95 de teste trec; `npm run smoke`: `SMOKE OK (9 verificări)`, desen cu 150 de dușmani 6,25 ms pe cadru. `dist-single/world-guard.html`: 409938 octeți.

**Task 5, încheierea** (fără schimbare de reguli):
- **Timpul de desen, înainte și după** (aceeași mașină, `uname -r` = `6.18.44-fc-v595`, Chromium fără ecran, 150 de dușmani, `npm run smoke`, trei rulări):
  înainte 5,70 / 5,76 / 5,61 ms (mijloc 5,70); după 6,30 / 6,06 / 6,24 ms (mijloc 6,24). Raport 6,24 / 5,70 = 1,09 (+9 %), sub pragul de 1,25, deci
  nicio formă nu s-a simplificat. Măsurătorile intermediare: 6,41 ms (Task 3), 6,25 ms (Task 4).
- **Căutarea numelor vechi** (`src`, `scripts`, `index.html`, fără deosebire între litere mari și mici):
  - cuvintele englezești (`wood|stone|castle|tower|quarry|swing|slash|blade|grass|\bcamp|\bwalk|\bground|\bdirt|\brock|\bpine|\btrunk`): nicio linie;
  - cuvintele românești (`castel|\bturn|lemn|piatr|pietr|copac|stânc|tăietor|carier|iarb|\bteren|\bzid|\bsabi|steag|\bpuie`): o singură linie,
    `src/ui/strings.test.ts:26`, lista de cuvinte pe care testul „niciun text nu mai pomenește tema veche” le refuză în `STR` (cuvintele sunt datele
    testului, nu un nume din joc); lăsată ca atare, fiindcă fără ele testul nu mai are ce căuta;
  - `săge`: o singură linie, `src/render/orbit/things.ts:189`, comentariul „țintă, romb, hexagon, săgeată de navă sau plus” (o formă, nu un proiectil).
- **Schela ștearsă.** Ultimul rând din `MARKS` din `src/sim/golden.test.ts` (momentul 12000, la 200 s):
  `[12000, 400, 388, 571, 73, 549.389203, 849.332385, 80, 2, 0, 2, 2, 2, 2, 1, 1, 0, 0, 9, 640.235833, 12752.549271, 1, 82, 82, 395]`.
  Rulat o ultimă dată după toată lucrarea: `npx vitest run src/sim/golden.test.ts`, 2 teste trecute, adică aceleași zece rânduri ca măsurate pe codul
  dinaintea redenumirii. Fișierul s-a șters; rămân 93 de teste. `drawMs` și rândul `SMOKE INFO` rămân.
- **Documente aduse la zi:** `docs/GDD.md` (cuvinte, nu cifre; cele cinci hotărâri ale lui Andrei din spec, ca 9–13; misiunile speciale la „Ce ar putea veni după v1”),
  `CLAUDE.md`, `README.md`, planul fazei 2 (numele din Task 2, iconița ca planeta cu inelul ei).

**Rămâne (tema de spațiu):**
- [ ] verificarea pe telefonul lui Andrei (Samsung Galaxy A54): arată ca varianta „Orbită”, deosebește dintr-o privire nava, navele dușmane, cristalele și asteroizii, și câte cadre pe secundă dă „Test de viteză” (cifrele de pe A54 pentru aspectul vechi lipsesc, deci se notează măcar cele noi);
- [ ] misiunile speciale, cu aspectul „Colonie”: proiect separat, după v1, cu designul lui.

**Valul de reparații de după recenzia finală** (fără schimbare de reguli, de cifre sau de așezare):
- **Timpul de desen, remăsurat cu navele în vedere.** Cifrele de mai sus (5,70 ms înainte, 6,24 ms după, și cele intermediare de la Task 3 și Task 4)
  măsurau un cadru fără nave în vedere: la 1,5 s după pornirea testului de viteză toate cele 150 sunt încă la marginea hărții, iar desenul le sare.
  Ele compară cerul, cercurile și planeta, nu navele. `scripts/smoke.cjs` așază acum, într-un singur `page.evaluate`, cele 150 de nave în jurul
  planetei (nava `i` la unghiul `i × 2,399963` rad și la raza `70 + (i % 5) × 28`, deci între 70 și 182 de centrul `550, 750`), face captura
  `05-test.png` și apoi măsoară; rândul e `SMOKE INFO: desen cu 150 de nave în jurul planetei: <x.xx> ms pe cadru`.
  Aceeași mașină (`uname -r` = `6.18.44-fc-v595`, Chromium fără ecran), `npm run smoke` de trei ori, aceeași așezare:
  înainte (commit `0dc0ad0`, aspectul vechi, într-un arbore de lucru temporar, șters la sfârșit) 7,71 / 8,21 / 7,90 ms (mijloc 7,90);
  după 9,03 / 9,88 / 8,79 ms (mijloc 9,03). Raport 9,03 / 7,90 = 1,14 (+14 %), sub pragul de 1,25, deci nicio formă nu se simplifică.
- **`alpha()` și culorile scurte.** La build, CSS-ul micșorat scrie `--star: #fff`, iar `alpha('#fff', 0.8)` ieșea `rgba(0,15,255,0.8)`: dunga de pe
  discul din indicatorul spre planetă era albastră în jocul construit (corectă doar în `npm run dev`). `hex6()` din `src/render/palette.ts` aduce `#rgb`
  la `#rrggbb`, aplicată în `palette()` și în `alpha()`; `src/render/palette.test.ts` (2 teste) o fixează. Dunga din `coreIcon` e acum o umbră din
  `night`, străvezie, pe partea din dreapta-jos a discului, ca să se vadă și pe tonul `ink`, și pe tonul `foe`; verificat cu o captură din build.
- Teste noi pentru desen: fișierele desenului trebuie găsite de `discipline.test.ts`, al cărui tipar prinde și `createConicGradient` și `ctx.filter = …`
  (cu probă negativă); ordinea straturilor fixează și cercurile sub planetă; `drawWorld` cu `ORBIT` peste o stare bogată (nava vie și, separat,
  doborâtă) nu aruncă și lasă `JSON.stringify(s)` neschimbat. Aspectul lasă `globalAlpha` cum l-a găsit (contract scris în `skin.ts`); cercul de bătaie
  al turelei își pune singur `lineCap`. 99 de teste trec; `npm run smoke`: `SMOKE OK (9 verificări)`.
- Comentarii și documente: turela trage raze (`balance.ts`, coloana de comentarii realiniată), „turela”, „bătaia ei”, „îl strânge”; `LOW_FRAC` colorează
  și inelul planetei; GDD-ul spune „marginea ei” și „bariere”; starea proiectului spusă drept (Pages pornit pe 17.11.2026, faza 1 încercată pe A54,
  designul temei aprobat pe 18.11.2026) în `README.md`, `CLAUDE.md`, `docs/GDD.md`, spec și planul fazei 2.
- Câmpul `tilt` din `ResNode` nu mai are cititor (e mereu 0). A rămas în stare, fiindcă designul temei îngăduie o singură schimbare de stare care nu e
  redenumire; de hotărât înainte ca faza 2 să fixeze forma salvării.
- De întrebat pe Andrei la proba pe telefon: se citesc jetoanele de 11 px din bandă? se citește inelul când planeta e atacată fără oprire (clipește
  aproape tot timpul)?
- Rândul din `src/ui/strings.test.ts` care înșiră cuvintele temei vechi e singura potrivire a căutării finale și rămâne: e chiar paza care le refuză în texte.

**Proba pe telefon (18.11.2026).** Andrei a încercat tema pe telefonul lui, din varianta într-un singur fișier construită din commit-ul
`4ec9120`, și a spus: „pe telefon, totul arată super bine, poți continua”. Cu asta, tema se îmbină în `main` (pull request-ul #13).
- Cifrele de la „Test de viteză” cu tema nouă nu le-a spus; rămân de aflat înaintea fazei 2, care presupune că desenatul rămâne pe Canvas 2D.
- Cele două întrebări de aspect (jetoanele de 11 px din bandă, inelul sub atac fără oprire) n-au primit răspuns separat; „totul arată super bine” le acoperă deocamdată.
- În `docs/GDD.md`, „Înainte de construcție”: cele două lucruri care erau ale lui Andrei (accesul de scriere și GitHub Pages) sunt amândouă bifate.

## 18.11.2026 — Faza 2

**Task 1 — Starea, gata de salvat.**
- `src/app/save.ts`: `packSave` scrie `{ v: SAVE_VERSION, state }`, `unpackSave` întoarce `Result` cu motivul (`lipsă`, `stricată`, `altă versiune`, `partidă terminată`, `altă formă`). Nu atinge stocarea.
- `BALANCE.foe.pushFloor = 0.01`: împinsul dușmanilor, după amortizare, sub această valoare devine exact `0` (fără rest, fără zero negativ). Niciun test existent nu s-a schimbat.
- `ResNode` pierde `tilt` (mereu 0, fără cititor); `addNode` din `testkit.ts` și `createGame` nu îl mai scriu.
- Măsurat: salvarea cu 150 de dușmani are 24 473 de caractere (pragul testului: 100 000). Testul „continuă identic” (30, 90, 150, 240 s) și cel fără zero negativ trec fără alte reparații în simulare. 107 teste trec.

**Task 2 — Partida în stocarea telefonului.**
- `src/app/storage.ts`: `SAVE_KEY = 'wg.v1.save'`, `saveGame`, `loadGame`, `clearGame`; toate prind orice eroare de stocare. `loadGame` șterge o salvare respinsă de `unpackSave` (stricată, altă versiune, altă formă). `Store` capătă `removeItem`.
- `saveIfRecord`: un `secs` care nu e finit nu atinge nimic și întoarce recordul vechi cu `isNew: false`. Cheia recordului și comportamentul pentru numere obișnuite sunt neschimbate.
- `main.ts` nu e atins; legarea în pagină e Task 4.

**Task 3 — Sesiunea și ecranul aprins.**
- `src/app/session.ts`: stările `ready | playing | paused | over` fără DOM, cu `start`, `resume`, `pause`, `unpause`, `advance`. Salvarea, ștergerea și recordul vin prin `SessionDeps`. Partida nouă cheamă `clearGame`; pauza cheamă `saveGame` (o eroare nu oprește pauza); finalul cheamă `clearGame` și `saveIfRecord`. Testul de viteză nu atinge nimic și își ține harta la `STRESS_FOES`. `STRESS_FOES` e acum și în `session.ts`, și în `main.ts`; Task 4 îl scoate din `main.ts`.
- `src/app/wake.ts`: `createWake(nav)` cu `on`/`off`; cere o singură dată, lasă la oprire (și când răspunsul sosește după oprire), un refuz sau lipsa sprijinului nu aruncă.
- `main.ts` neschimbat. 124 de teste trec (12 noi).

**Task 4 — Pauza și reluarea pe ecran.**
- `index.html`: butonul `#pause` (două bare din CSS) în rândul planetei din bandă, cartonașul `#pauseVeil` („Pauză”, „Ai rezistat până acum”, „Continuă”, „Partidă nouă”) și `#continue` pe cartonașul de start („Continuă partida · m:ss”; atunci `#start` spune „Partidă nouă”). Textele noi sunt în `strings.ts`, fixate de un test nou.
- `src/main.ts` nu mai ține stări: le ia din `createSession`. Pauza: butonul, Escape, pagina ascunsă și `pagehide`; ieșirea din joc lasă ecranul aprins (`wake.off()`), fiecare intrare în joc îl cere din nou (`wake.on()`). Cât partida nu e în curs, se desenează doar o secundă după o schimbare, o redimensionare sau la revenirea în pagină. `STRESS_FOES` și întreținerea testului de viteză au ieșit din `main.ts`; `window.__wg` capătă `phase()`, iar `state()` e starea sesiunii.
- `src/render/canvas.ts`: `refresh()` aruncă cerul pictat; se cheamă singur la `contextrestored` și din `main.ts` la revenirea în pagină.
- Butonul de pauză: ținta are 44 × 44 px. Pe primul rând al benzii, o coloană în plus ieșea din ecran (măsurat la 360 px: butonul de la x 389 la 433 în testul de viteză), de aceea stă în rândul planetei, iar ceasul acoperă și coloana lui. Măsurat la 360 px cu 999 de cristale și 999 de metal: ceasul iese cu 6 px în marginea interioară a benzii (înainte de task: 5 px), butonul rămâne în bandă. Banda e cu 17 px mai înaltă. Textul „TEST · fps” din testul de viteză, care înainte ieșea din bandă la 390 px, acum încape.
- `npm run smoke`: 16 verificări (7 noi: butonul și cartonașul de pauză, „Continuă”, pauza la pagina ascunsă, „Continuă partida” după reîncărcare, „Partidă nouă” din pauză, finalul șterge salvarea, testul de viteză nu salvează). Pagina ascunsă simulată în Chromium fără ecran a pus pauză și a salvat. 125 de teste trec.
