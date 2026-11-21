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

**Task 5 — Instalare și joc fără internet.**
- `public/manifest.webmanifest` (numele, `lang: ro`, `display: fullscreen`, `orientation: portrait`, `theme_color` și `background_color` = `--edge`, `#05071a`) și `public/icons/`: `icon.svg` (planeta cu oceanul și trei continente, inelul-scut gros, un satelit mic, pe culoarea cerului; tot desenul în cercul de 80% din mijloc) și PNG-urile 192, 512 și `maskable` 512, scrise de `scripts/make-icons.cjs` (`npm run icons`) cu Chromium-ul din Playwright. Văzută la 48 px, pictograma se citește: discul albastru cu verde și inelul deschis.
- `index.html`: `theme-color`, `manifest`, `icon`. `src/app/sw.ts` înregistrează `./sw.js` și înghite refuzul; `main.ts` îl cheamă doar sub `if (__WG_SW__)`, cu `import.meta.env.PROD`. Sub `if`, pagina într-un singur fișier pierde apelul cu totul; cu `__WG_SW__ && PROD` ca argument, `./sw.js` rămânea în pachetul ei.
- `scripts/sw-template.js` + `scripts/build-sw.mjs`: după `vite build`, lista fișierelor din `dist` (fără `sw.js`; `index.html` ca `./`) și versiunea (12 caractere din SHA-256 peste nume și conținut) intră în `dist/sw.js`. Fără `skipWaiting`: versiunea nouă se activează la următoarea pornire. Scripturi noi: `bundle` (`vite build` + `build-sw`), folosit de `build`, `check` și `smoke`; `icons`. `ci.yml` are `permissions: contents: read`. `single-file.mjs` verifică în plus că fragmentul nu are manifest, pictograme, `theme-color` sau `sw.js`.
- Proba din browser: verificările 17 (manifestul și cele trei pictograme, `image/png`), 18 (service worker-ul activ, controlează pagina, cache-ul `wg-…` are exact fișierele din `dist` fără `sw.js`) și 19 (fără rețea: după reîncărcare cartonașul de start se vede, după „Începe” canvasul e desenat, iar toate răspunsurile vin din service worker).
- Ce a picat și de ce: cu șablonul din plan, verificarea 19 pica. Pagina venea din cache, dar JS-ul și CSS-ul nu (`net::ERR_FAILED`). `vite preview` trimite `Vary: Origin`; cererile puse în cache la instalare nu au `Origin`, iar scriptul de modul și foaia de stil sunt cerute de pagină cu `Origin`, deci `cache.match` le refuza. Reparația, hotărâtă de cel care conduce: `ignoreVary: true` la `match` (cache-ul ține doar fișierele noastre, cu adrese exacte), fixată de testul șablonului; planul spune acum același lucru. Fără reparație, același lucru s-ar fi întâmplat pe orice server care trimite un `Vary` pe care cererile paginii nu îl îndeplinesc.
- Măsurat: `build-sw: 24 fișiere în cache (625992 octeți)`, versiunea `066af263b17b` (fonturile, ca `.woff2` și `.woff`, iau cea mai mare parte; pictogramele PNG: 298 981 octeți). O salvare: 24 473 de caractere cu 150 de dușmani (Task 1). `dist-single/world-guard.html`: 414 504 octeți, fără `sw.js`. `SMOKE INFO`: 8,77 ms pe cadru. `npm run check` pe un checkout fără `dist/`: 131 de teste trec; `SMOKE OK (19 verificări)`.

**Rămâne:**
- [ ] proba fazei 2 pe telefonul lui Andrei: instalarea din Chrome, jocul fără internet după prima deschidere, pauza automată și „Continuă partida”, ecranul aprins;
- [ ] planul 3: plasa pentru dificultate și reechilibrarea.

**Reparațiile de după recenzia finală.**
- Recenzia întregii ramuri a găsit trei lucruri mai mari, reparate aici: (1) service worker-ul nou își lua fișierele prin cache-ul HTTP al browserului, deci două versiuni publicate la scurt timp una de alta puteau pune în cache-ul celei noi pagina veche, care cere fișiere ce nu mai există; acum la instalare fișierele se cer cu `cache: 'reload'`. Măsurat cu un server care trimite `Cache-Control: max-age=600`: fără reparație, la instalarea versiunii noi au ajuns la server 2 cereri, fără `GET /`, iar cache-ul nou ținea pagina veche; cu reparația, 25 de cereri, cu `GET /`, iar cache-ul nou ține pagina nouă. (2) Butoanele erau legate doar de `click`, pe care browserul nu-l dă pentru al doilea deget: pauza nu răspundea cât celălalt deget ținea joystickul. Acum toate butoanele jocului trec prin `src/ui/tap.ts`: la atingere pornesc la ridicarea degetului deasupra butonului (primul sau al doilea deget), cu mausul și tastatura la `click`, o singură dată pe gest. (3) `unpackSave` compara doar cheile de sus; acum compară și cheile navei, ale planetei, ale fiecărui cerc (cu ce s-a plătit în el) și ale fiecărui nod.
- Mărunte: butonul de pauză ascuns rămâne în așezare (invizibil, de neatins, scos din tabulare), deci banda nu mai sare între 67 și 84 px la pauză, reluare și final (măsurat: 84 px în toate fazele); `sw.ts` prinde și citirea lui `navigator.serviceWorker`; un test leagă culoarea de margine din pagină, manifest și stiluri; teste noi pentru pauza după final și pentru citirea care lasă salvarea pe loc; README, comentariile și planul aduse la zi.
- Proba din browser are 20 de verificări: a 20-a ține joystickul cu un deget și atinge pauza, apoi „Continuă”, cu al doilea. Pe codul de dinainte (butoane legate doar de `click`) pică: faza rămâne `playing`.
- De știut: în testul de viteză, „Partidă nouă” de pe cartonașul de pauză înlocuiește și o partidă obișnuită salvată dinainte, la fel ca „Partidă nouă” de pe cartonașul de start.
- Pentru planul 3: orice câmp nou în stare urcă `SAVE_VERSION`. Testul amprentei din `save.test.ts` („forma stării s-a schimbat: urcă SAVE_VERSION și adu amprenta la zi”) o cere singur.
- Măsurat: `npm run check` pe un checkout fără `dist/`: 143 de teste trec; `SMOKE OK (20 verificări)`; `SMOKE INFO`: 9,59 ms pe cadru; `build-sw: 24 fișiere în cache (626866 octeți)`; `dist-single/world-guard.html`: 415 361 octeți, fără `sw.js`.
- [ ] de adăugat la proba lui Andrei pe telefon: pauza apăsată cu cealaltă mână cât conduce nava; o versiune nouă apare abia după ce jocul e închis de tot (o reîncărcare în aceeași filă o păstrează pe cea veche); cum arată banda cu butonul de pauză.

## 18.11.2026 — Faza 3

**Explorarea, înainte de plan** (jucători de aruncat, în afara repo-ului; tabelul întreg e în `docs/superpowers/plans/2026-11-18-world-guard-faza-3.md`): Nimic 66 s, Amestec 368 s, Doar navă 240 s, Fără navă 329 s, Fără economie 289 s (medianele pe 20 de semințe, cu apărarea la 120 de centrul planetei; acolo cercul de reparat nu era ocolit).

**Task 1 — Jucătorii automați.**
- `src/bots/`, în afara jocului livrat (nimic din `main.ts` nu-l importă; `dist/` nu are niciun nume de purtare). `policy.ts`: cele cinci purtări (`POLICIES`, cu `label` în română), `bought`, `nextPad` (categoriile pe rând, cea fără nimic de cumpărat e sărită), `chooseGoal` (luptă cu nava dușmană cea mai apropiată de centru dacă e la mai puțin de `GUARD = 120`; altfel plătește dacă stocul acoperă ce a rămas, altfel strânge resursa care lipsește mai mult; cu nimic de cumpărat, acasă). `nav.ts`: `createNav` (drept spre țintă; după 24 de pași fără apropiere de 1 px, 30 de pași de ocolire, cu partea schimbată la fiecare blocaj; o țintă mutată cu peste 40 px șterge memoria) și `offForeignPad` (de pe orice cerc care nu e ținta de plată, inclusiv cel de reparat, iese dinspre centru). `bot.ts`: `createBot`, un `Nav` pe jucător. `run.ts`: `playOne`, `median`, `measure`, `measureAll`, `SEEDS` = 1…20, `RUN_CAP` = 900 s.
- Jucătorii doar citesc starea (testat cu `JSON.stringify` înainte și după). Niciunul nu plătește la un cerc care nu e `nextPad` în acel pas și niciunul nu repară planeta: testat pas cu pas pe toate cele 20 de semințe și toate cele cinci purtări, într-un singur parcurs al celor 100 de partide (care verifică și ce a cumpărat fiecare la sfârșit).
- Reparația de după recenzie: prima variantă ieșea de pe un cerc străin doar când ar fi stat pe loc, dar simularea plătește după 0,35 s petrecute în cerc, și în mers. Recenzia a găsit plăți parțiale la cercuri străine și pași în care viața planetei creștea (de pildă „Amestec”, sămânța 1, la 94 s, în turela (425, 669); „Doar navă”, sămânța 8, la 130,8 s, la reparat). Acum (`slipOff` din `nav.ts`), din primul pas numărat (`dwell > 0`) pe un cerc străin nava iese pe o diagonală: jumătate dinspre centru, jumătate de-a lungul marginii, în partea în care voia să meargă; măsurat pe cele 100 de partide, cel mai lung șir de pași numărați pe un cerc străin are 4 pași (0,067 s), iar plata ar porni abia după 21. Tot atunci: memoria mersului se șterge când distanța până la țintă sare cu mai mult de un pas al navei (reapariția acasă), iar când nava se depărtează de țintă (o navă dușmană care fuge), apropierea se măsoară de acolo; înainte, amândouă porneau ocoliri fără motiv.
- Disciplina: `src/sim/discipline.test.ts` citește acum și fișierele din `src/bots/` (aceeași `violations`, titlurile spun folderul). Nu există un `src/bots/discipline.test.ts`: importat dintr-un fișier de test, `violations` i-ar fi înregistrat testele a doua oară.
- Măsurat după reparație, cu un script de aruncat (`measureAll()`, raza 120, 20 de semințe):

| Jucător | Mediana | Min | Max |
| --- | --- | --- | --- |
| Nimic | 65,6 s | 58,6 | 81,6 |
| Amestec | 372,2 s | 347,2 | 428,3 |
| Doar navă | 249,6 s | 230,9 | 282,9 |
| Fără navă | 331,8 s | 306,5 | 388,1 |
| Fără economie | 307,7 s | 272,6 | 365,1 |

  „Doar navă” e la 67,0% din „Amestec”, „Fără navă” la 89,1%. Cele 100 de partide durează împreună 12,4–13,3 s (două rulări). „Amestec”, sămânța 1: prima turelă la 1,42 s, 6 cumpărături la secunda 120. Mersul (harta adevărată, fără nave dușmane) ajunge la cercuri și grupuri în 18–51% din marginea de timp a testului, iar ocolind planeta în 55%. „Doar navă” se încheie cu nava la nivelul 2 pe semințele 1–3, ca în explorare.
- `npx vitest run src/bots src/sim/discipline.test.ts`: 70 de teste, 24,1 s; `src/bots` singur: 54 de teste, 23,0 s (aproape tot timpul e parcursul celor 100 de partide din `bot.test.ts`: 21,8 s sub Vitest, cu verificările pe fiecare pas, față de 12,4–13,3 s pentru aceleași partide în scriptul construit cu Vite). `npm run check`: 202 de teste trec (143 înainte).

**Task 2 — Tabelul și comanda lui.**
- `src/bots/limits.ts`: `LIMITS` (cele patru limite din design, ca date), `verdicts` (un verdict pe rând; limitele sunt închise; lipsa rândului „Amestec” aruncă o eroare) și `formatTable` (antet și un rând pe jucător, coloane aliniate; o mediană lipită de `RUN_CAP` se scrie „≥ 900 s”). `src/bots/table.ts` tipărește tabelul; cu `--raze` și pe cele pentru razele de apărare 80 și 160. Construit cu `vite.balance.config.ts` (build `ssr`, fără `public/`, în `dist-balance/`, ignorat de git). Testele din `limits.test.ts` merg pe rânduri făcute de mână: 10 teste, sub o secundă.
- `npm run balance` nu iese cu cod de eroare când o limită pică: e un afișaj. Limitele ca teste care pică build-ul vin în taskul următor. Durata, măsurată cu `time`: `npm run balance` 13,1 s, `npm run balance -- --raze` 40,1 s.
- Ieșirea întreagă a `npm run balance -- --raze` (partidele sunt deterministe; medianele pe 20 de semințe):

```
Raza de apărare 120
Jucător        Mediană      Min    Max    Limită             Verdict
Nimic          66 s         59 s   82 s   60–130 s           în limită
Amestec        372 s        347 s  428 s  240–360 s          ÎN AFARA LIMITEI
Doar navă      250 s (67%)  231 s  283 s  ≤ 75% din Amestec  în limită
Fără navă      332 s (89%)  307 s  388 s  ≤ 90% din Amestec  în limită
Fără economie  308 s        273 s  365 s  —                  fără limită

Raza de apărare 80
Jucător        Mediană       Min    Max    Limită             Verdict
Nimic          66 s          59 s   82 s   60–130 s           în limită
Amestec        331 s         229 s  370 s  240–360 s          în limită
Doar navă      238 s (72%)   207 s  281 s  ≤ 75% din Amestec  în limită
Fără navă      344 s (104%)  296 s  384 s  ≤ 90% din Amestec  ÎN AFARA LIMITEI
Fără economie  299 s         185 s  329 s  —                  fără limită

Raza de apărare 160
Jucător        Mediană      Min    Max    Limită             Verdict
Nimic          66 s         59 s   82 s   60–130 s           în limită
Amestec        390 s        361 s  420 s  240–360 s          ÎN AFARA LIMITEI
Doar navă      252 s (65%)  229 s  291 s  ≤ 75% din Amestec  în limită
Fără navă      328 s (84%)  310 s  359 s  ≤ 90% din Amestec  în limită
Fără economie  301 s         275 s  352 s  —                  fără limită
```

- Cifrele de azi (raza 120) coincid cu cele de la Task 1: „Amestec” e ÎN AFARA limitei (372 s față de 360), restul în limită. Raza 80 mută problema la „Fără navă”, raza 160 o lasă la „Amestec”, deci, propunere: cifrele jocului să se schimbe în taskul următor, nu raza jucătorilor.
- Nimic din `src/bots/` nu ajunge în joc: după `npm run bundle`, `grep -l "fara-economie" dist/assets/*.js` nu găsește nimic. `npm run check`: 214 teste trec.

**Task 3 — Reechilibrarea și plasa.**
- Plasa: `src/bots/net.test.ts` joacă o dată cele 100 de partide (`measureAll()`, raza 120) și are câte un test pe fiecare limită din design (mesajul arată valoarea și limita), unul că `verdicts` întoarce exact cinci verdicte, câte unul pe jucător, și unul că fiecare partidă s-a încheiat înainte de 900 s. Cu cifrele de dinainte pica doar „Amestec” („Amestec: 372 s, limita 240–360 s”); fișierul durează 17–22 s.
- `src/data/balance.test.ts`: costurile turelei, colectorului, minei (nivelurile 1 … maxim) și navei (2 … maxim) sunt întregi, cel puțin 0, cu suma peste 0; `spawnEvery(t)` e pozitiv și nu crește, `foeHp(t)` e pozitiv și nu scade, pentru t de la 0 la 600, pas 30. `src/bots/limits.test.ts`: trei cazuri care fixează că rotunjirea de afișare nu intră în comparație („Nimic” la 59,6 s se scrie „60 s” și pică; „Nimic” la 130,4 s pică; „Doar navă” la 75,4% se scrie „75%” și pică).
- **Propunere, până o vede Andrei** — două cifre schimbate în `src/data/balance.ts`:
  - `hero.dmgPerLevel` (lovitura navei în plus pe nivel): 6 → 10. Motivul: e singura pârghie a navei care a mișcat „Fără navă” față de „Amestec” fără să ridice „Doar navă” (viața pe nivel, vindecarea și reapariția n-au mișcat nimic, măsurat; ieftinirea nivelurilor ridica „Doar navă”).
  - `foeHp(t)` (viața dușmanului): 14 × (1 + t / 80) → 14 × (1 + t / 45). Motivul: așază „Amestec” în bandă. Pornirea (14) rămâne; crește doar termenul în timp: un dușman are 17,1 viață la 10 s (era 15,75), 28 la 45 s (era la 80 s), 107 la 300 s (era 66,5). „Nimic” nu s-a mișcat (65,6 s).
- Jurnalul încercărilor, pe scurt (mediane în secunde: Nimic / Amestec / Doar navă / Fără navă / Fără economie; procentele din „Amestec”): 48 de încercări, în valuri de câte patru, peste limita de 40 din brief (alegerea, încercarea 24, era deja făcută; celelalte au căutat mai multă margine și n-au găsit). Viața pe nivel 30, vindecarea 6 și reapariția 8 n-au mișcat „Amestec” deloc. Nivelurile navei mai ieftine ridică „Amestec” (412 s), dar și „Doar navă”; un nivel 3 care cere sub 25 de metal o duce pe „Doar navă” la nivelul 3 și peste 75%. Presiunea (viața dușmanilor, ritmul, nava grea) coboară „Amestec” mai repede decât „Doar navă”, care stă la nivelul 2 (măsurat pe 8 semințe) și, în încercările care mișcă presiunea dușmanilor cu `dmgPerLevel` între 8 și 12, se încheie la 205–235 s (în unele alte încercări a ținut 259–285 s); de aceea ținta de 70% cere „Amestec” de cel puțin 316 s, iar fereastra cu toate țintele e îngustă (316–330 s). Turele mai tari (pârghia 3) n-au dat o margine mai bună. Aleasă: lovitura +10 pe nivel și viața 14 × (1 + t / 45): 65,6 / 326,6 / 221,3 / 246,1 / 261,6; 67,7% / 75,4%.
- Tabelul de dinainte și cel de după (`npm run balance`, raza 120):

```
Înainte
Nimic          66 s         59 s   82 s   60–130 s           în limită
Amestec        372 s        347 s  428 s  240–360 s          ÎN AFARA LIMITEI
Doar navă      250 s (67%)  231 s  283 s  ≤ 75% din Amestec  în limită
Fără navă      332 s (89%)  307 s  388 s  ≤ 90% din Amestec  în limită
Fără economie  308 s        273 s  365 s  —                  fără limită

După
Nimic          66 s         59 s   82 s   60–130 s           în limită
Amestec        327 s        278 s  371 s  240–360 s          în limită
Doar navă      221 s (68%)  203 s  256 s  ≤ 75% din Amestec  în limită
Fără navă      246 s (75%)  235 s  278 s  ≤ 90% din Amestec  în limită
Fără economie  262 s        229 s  286 s  —                  fără limită
```

- După, `npm run balance -- --raze` (35,6 s), razele 80 și 160 (informație, nu țintă):

```
Raza de apărare 80
Nimic          66 s         59 s   82 s   60–130 s           în limită
Amestec        299 s        212 s  321 s  240–360 s          în limită
Doar navă      216 s (72%)  189 s  281 s  ≤ 75% din Amestec  în limită
Fără navă      249 s (83%)  231 s  271 s  ≤ 90% din Amestec  în limită
Fără economie  252 s        205 s  294 s  —                  fără limită

Raza de apărare 160
Nimic          66 s         59 s   82 s   60–130 s           în limită
Amestec        314 s        211 s  364 s  240–360 s          în limită
Doar navă      234 s (75%)  213 s  266 s  ≤ 75% din Amestec  în limită
Fără navă      250 s (80%)  231 s  275 s  ≤ 90% din Amestec  în limită
Fără economie  263 s        235 s  298 s  —                  fără limită
```

  La raza 160, „Doar navă” e la 74,5% (măsurat cu mediana nerotunjită: 234,3 / 314,4), adică la o jumătate de punct de limita din design: o rază de apărare mai largă ar pica plasa.
- Țintele (raza 120): toate ies. Nimic 65,6 s (ținta 62–125); Amestec 326,6 s (270–330, la 3,4 s de margine); Doar navă 67,7% (cel mult 70); Fără navă 75,4% (cel mult 85); Fără economie 261,6 s, sub „Amestec”.
- Testele aduse la zi (doar valoarea așteptată): `balance.test.ts` (`foeHp(45)` = 28), `src/sim/foes.test.ts` (viața primului dușman, 14 × (1 + 10 / 45)), `src/sim/pads.test.ts` (lovitura la nivelul 2: 20). Din `src/sim/run.test.ts` a ieșit testul „fără niciun gest, nucleul cade după aproximativ un minut”: limita lui e acum în plasă, pe 20 de semințe. `docs/GDD.md`, „Cifrele de pornire”: rândurile „Navă” (+10 pe nivel) și „Viața dușmanului”.
- `npm run check`: 224 de teste trec; `npm test` durează 20 s (Vitest: 19,8 s). `npm run smoke`: „SMOKE OK (20 verificări)”.

**Task 4 — Documentele.**
- `docs/GDD.md`: antetul; „Cifrele de pornire” a devenit „Cifrele jocului” (cele de după reechilibrare; cele ale prototipului sunt aici); „Plasa pentru dificultate” are acum cum sunt făcuți jucătorii automați, comanda, tabelul măsurat, razele 80 și 160, ce e fragil, limita „Doar navă” adusă la zi (cu jucători care apără era îndeplinită; peste limită era „Amestec”) și pârghia cu grupuri din părți opuse, încercată în explorare și neconstruită; „Cine a hotărât ce”, sub „Hotărât de Claude, nevăzut încă de Andrei”: purtarea jucătorilor, cele două cifre și pârghia nefolosită; „Ce a arătat prototipul” trimite la măsurătorile noi. `CLAUDE.md`: comanda `npm run balance`, `src/bots/` la „Arhitectura”, „Stare” și „Urmează”. `README.md`: starea și paragraful „Plasa pentru dificultate”.
- Cum se simte schimbarea (propunere, până o vede Andrei în joc): spre minutul 5 un dușman are 107 viață (înainte 66,5), iar nava de nivelul 5 lovește cu 50 (înainte 34); primul minut e neschimbat.
- Cifrele de azi, rulate din nou (`npm run balance -- --raze`; `npm run check`: 224 de teste trec): raza 120: Nimic 66 s, Amestec 327 s, Doar navă 221 s (68%), Fără navă 246 s (75%), Fără economie 262 s, toate în limită; raza 80: Amestec 299 s, Doar navă 72%, Fără navă 83%; raza 160: Amestec 314 s, Doar navă 75% (74,5% nerotunjit), Fără navă 80%.
- **Ce e fragil:** „Amestec” e la 33 s de limita de sus (360 s). La raza de apărare 160, „Doar navă” e la 74,5%, la o jumătate de punct de limită. Tabelul depinde de cum sunt scriși jucătorii automați: toți apără la 120 de centrul planetei, niciunul nu repară.
- Cu faza 3, lista „Scopuri pentru v1” din design e acoperită în cod; ce urmează are nevoie de hotărârea lui Andrei.

**Reparațiile de după recenzia finală.**
- Ce a găsit recenzia întregii ramuri (verdict: gata de îmbinare, cu reparații), pe scurt:
  1. Nava se înțepenea între o clădire construită și cercul ei: ieșitul de pe un cerc străin o scotea pe raza cercului, adică în clădire. „Fără economie” pierdea 51 s pe cele 20 de partide în colțul primei turele. Cel mai lung șir de pași pe un cerc străin era 12 („Fără navă”, sămânța 14), nu 4 cum scrie mai sus la Task 1: cifra aceea era de dinaintea reechilibrării. Regula „nicio plată la un cerc străin” cădea la două din 24 de cifre vecine (lovitura navei +11 pe nivel; turela la 0,9 s).
  2. Documentele spuneau despre „Doar navă” și despre scopul 7 mai mult decât arată plasa.
  3. Propunerea pentru Andrei nu spunea ce face reechilibrarea cu turelele.
- Mersul, reparat (`src/bots/nav.ts`): un cerc străin construit și clădirea lui sunt un singur obstacol, segmentul de la centrul cercului la clădire (`fromPad`). Lângă el (la 34 px de segment), nava nu mai intră spre el, ci merge de-a lungul marginii, pe o parte aleasă la primul pas și păstrată până se depărtează (`createSkirt`; fără partea păstrată, cu ținta chiar în spatele laturii, nava stătea pe loc). Ieșitul de pe cerc (`offForeignPad`, `slipOff`) pleacă și el din segment, deci în colț iese într-o parte. Cercurile fără clădire (al navei, cel de reparat) și cele neconstruite se poartă ca înainte; ținta de plată nu e niciodată obstacol.
- Teste noi, scrise înaintea codului și văzute picând pe codul vechi: mersul cu jucătorul întreg pe lângă o turelă construită (pe codul vechi nu ajungea deloc la cristalul de dincolo) și pe lângă un colector construit (pe codul vechi călca 12 pași pe cercul colectorului), ocolitul pe aceeași parte și ieșitul din colț; în `bot.test.ts`, cel mult 10 pași la rând pe un cerc străin care numără (pe codul vechi: 12 și 11 pași la „Fără navă”).
- Măsurat după reparație: cel mai lung șir pe un cerc străin are 2 pași, pe toate cele 80 de partide ale jucătorilor care se mișcă și în toate cele 24 de schimbări mici de cifre ale recenziei; regula „nicio plată la un cerc străin, niciun reparat” ține în toate 24, inclusiv cele două care cădeau. Timpul pierdut în colț: 0 s la toți (înainte 51 s la „Fără economie”, 5 s la „Amestec”, 1 s la „Fără navă”).
- Mărunțișuri: tabelul scrie partea din „Amestec” cu o zecimală (de pildă „75,4%”); `net.test.ts` cere `toBe(true)`; `src/sim/discipline.test.ts` verifică acum că nimic din `src/` din afara `src/bots/` nu importă din el; comentariile de la lovitura turelei din `balance.ts` spuneau „raza” (nicio cifră schimbată).
- Tabelul de după (`npm run balance -- --raze`; cu el, tabelele de mai sus din această intrare sunt istorie):

```
Raza de apărare 120
Jucător        Mediană        Min    Max    Limită             Verdict
Nimic          66 s           59 s   82 s   60–130 s           în limită
Amestec        335 s          297 s  357 s  240–360 s          în limită
Doar navă      221 s (66,1%)  203 s  256 s  ≤ 75% din Amestec  în limită
Fără navă      250 s (74,8%)  235 s  273 s  ≤ 90% din Amestec  în limită
Fără economie  256 s          231 s  293 s  —                  fără limită

Raza de apărare 80
Jucător        Mediană        Min    Max    Limită             Verdict
Nimic          66 s           59 s   82 s   60–130 s           în limită
Amestec        299 s          270 s  324 s  240–360 s          în limită
Doar navă      216 s (72,3%)  189 s  281 s  ≤ 75% din Amestec  în limită
Fără navă      246 s (82,4%)  223 s  267 s  ≤ 90% din Amestec  în limită
Fără economie  255 s          220 s  303 s  —                  fără limită

Raza de apărare 160
Jucător        Mediană        Min    Max    Limită             Verdict
Nimic          66 s           59 s   82 s   60–130 s           în limită
Amestec        317 s          288 s  371 s  240–360 s          în limită
Doar navă      234 s (73,9%)  213 s  266 s  ≤ 75% din Amestec  în limită
Fără navă      251 s (79,2%)  227 s  267 s  ≤ 90% din Amestec  în limită
Fără economie  266 s          245 s  312 s  —                  fără limită
```

  Nerotunjit, la raza 120: 65,6 / 334,7 / 221,3 / 250,5 / 255,8 s. „Amestec” iese puțin peste ținta de rezervă a planului (330 s); limita din design (360 s) ține. `src/data/balance.ts` n-a fost atins în afara celor două comentarii.
- Ce măsoară plasa și ce nu (remăsurat după repararea mersului; amănuntele în `docs/GDD.md`, „Ce e fragil”): „Doar navă” cumpără o singură dată (nivelul 2, la secunda 18, în 19 din 20 de partide); în ultima treime toți luptă în 88–95% din pași, iar „Amestec” termină cu 117–164 de cristale necheltuite; raza 120 dă cel mai mic procent pentru „Doar navă” dintre 11 raze între 80 și 200; o purtare la fel de rezonabilă (nava plecată la peste 200 de planetă se întoarce abia la două nave dușmane) dă 76,7%, peste limită. Scopul 7 din design e deci păzit pentru acești cinci jucători automați, nu acoperit în general.
- Ce face reechilibrarea cu turelele (propunere pentru Andrei): în „Amestec”, nava dă 71,6% din toată lovitura (înainte 61,1%); o turelă de nivelul 1 are nevoie de 18 trageri (14,4 s) pentru un dușman de la minutul 5 (înainte 12, adică 9,6 s); „doar turele” ține 79% din „Amestec” (înainte 90%), „fără turele” 82% (înainte 79%). Direcția e spre anti-scopul „Devine joc de acțiune”, iar plasa nu are un rând care s-o vadă.
- „Primul minut e neschimbat”, scris mai sus, e prea tare: „Nimic” e identic pe toate cele 20 de semințe, dar la secunda 60 un dușman are 32,7 viață în loc de 24,5, deci nava de nivelul 1 are nevoie de 4 lovituri în loc de 3.
- `npm run check`: 232 de teste trec; `npm test` durează 23,4 s. `npm run smoke`: „SMOKE OK (20 verificări)”.
- De știut pentru Andrei:
  - Îmbinarea în `main` publică jocul, deci cele două cifre noi ajung pe telefonul lui.
  - Recordul din telefon rămâne cel făcut cu cifrele mai ușoare (cheia `wg.v1.record` nu se schimbă), iar „Amestec” ține acum cu 12% mai puțin.
  - Trecerea în fugă prin centrul unui cerc durează 0,34 s, iar plata pornește la 0,35 s: e regula din faza 1, dar e la limită față de anti-scopul „Cheltui fără să vrei”. Propunere pentru mai târziu.
  - Propunere pentru mai târziu: două rânduri doar tipărite în tabel, „Doar navă, cu nivelul 3 din prima secundă” (plafonul navei) și „Fără turele”, ca tabelul să arate ce nu vede azi.

**Rămâne:**
- [ ] proba lui Andrei pe telefon pentru fazele 2 și 3 împreună: instalarea, jocul fără internet, pauza apăsată cu cealaltă mână, reluarea, ecranul aprins și cum se simte dificultatea nouă (cele două cifre schimbate sunt propuneri);
- [ ] cele două cifre de la „Test de viteză” (cadre pe secundă și `min`), niciodată notate;
- [ ] hotărârea lui Andrei despre ce vine după v1.

## 20.11.2026 — Nava cu module

Designul: `docs/superpowers/specs/2026-11-20-nava-cu-module-design.md`, aprobat de Andrei pe 20.11.2026. Planul: `docs/superpowers/plans/2026-11-20-world-guard-nava-cu-module.md`.

**Task 1 — Experiența, pragul și mecanica ofertelor.**
- `src/data/modules.ts`: cele nouă module ca date (`ModId`, `MOD_KIND`, `MOD_IDS`, `MAX_TIER = 3`, `OFFERS = 3`).
- Starea: nava are `xp` și `mods` (pornește cu 0 și cu Unda la treapta 1), partida are `offer` (null sau ofertele deschise).
- `src/sim/mods.ts`: `tierOf`, `slotsAt`, `xpNeed`, `heroReady`, `makeOffer`, `choose`.
  - `makeOffer` dă cel mult trei oferte diferite, cu cel puțin una nouă și cel puțin o întărire când există. Ele vin din fluxul `oferta-<nivel>`, deci depind doar de sămânță, de nivel și de modulele navei.
  - Cât o ofertă e deschisă, `step` nu schimbă nimic.
- Experiența și nivelul:
  - Un dușman doborât dă experiență navei, oricine l-a doborât și chiar cu nava doborâtă (1 pentru unul obișnuit, 4 pentru unul greu); la nivelul maxim, nimic.
  - Cercul navei primește plată doar când pragul e atins. La nivel, pragul se scade din experiență, iar restul rămâne. O plată urcă un singur nivel.
- În joc, singurul lucru schimbat la sfârșitul taskului e că nivelul navei cere experiență. Lista modulelor de oferit (`BALANCE.hero.offerPool`) e goală până la Task 2, deci nicio ofertă nu se deschide.
- Salvarea: `SAVE_VERSION` 2 (o partidă salvată cu versiunea 1 nu se mai continuă). `null` e primit doar la `offer`. O ofertă salvată trebuie să fie o listă nevidă de `{ id, tier }`, cu un modul cunoscut și o treaptă 1–3; altfel „altă formă”.
- Jucătorii automați:
  - Categoria „navă” se sare cât pragul nu e atins.
  - **Regula nouă a jucătorilor automați, schimbată cu bună știință față de faza 3:** pentru o purtare care cumpără nava, când nava e gata de nivel și stocul acoperă ce a rămas de plătit la cercul ei, cercul navei e ținta de plată, oricare ar fi rândul categoriilor. Plata trece și înaintea luptei (`nextPad` și `chooseGoal` din `src/bots/policy.ts`). Fără ea, „Doar navă” atingea pragul pe la secunda 45–49, lupta aproape tot restul partidei și rămânea la nivelul 1 pe 6 din 20 de semințe.
  - Când se deschide o ofertă, rularea (`playOne`) alege prima ofertă; jucătorii automați doar citesc starea.
  - Verificarea de sfârșit din `src/bots/bot.test.ts` („Doar navă” la nivelul 2 pe fiecare sămânță) devine „pe cel puțin 15 din 20”. Măsurat cu regula nouă: 3 semințe (6, 10, 18) rămân la nivelul 1 din lipsă de resurse, nu de timp. Cât nava e gata, stocul nu atinge niciodată prețul nivelului 2 (cel mult 24 de cristale și 8 de metal, față de 25 și 10).
- **Propunere, până o vede Andrei:** pragurile pentru nivelurile 2–5 sunt 6, 10, 13 și 16, cifrele de pornire din design, neschimbate. Un dușman obișnuit dă 1 experiență, unul greu 4.
- Tabelul de dinainte (`npm run balance`, raza 120): Nimic 66 s · Amestec 335 s · Doar navă 221 s (66,1%) · Fără navă 250 s (74,8%) · Fără economie 256 s.
- Tabelul de după:

```
Raza de apărare 120
Jucător        Mediană        Min    Max    Limită             Verdict
Nimic          66 s           59 s   82 s   60–130 s           în limită
Amestec        349 s          326 s  385 s  240–360 s          în limită
Doar navă      223 s (64,0%)  183 s  250 s  ≤ 75% din Amestec  în limită
Fără navă      250 s (71,8%)  235 s  273 s  ≤ 90% din Amestec  în limită
Fără economie  317 s          287 s  343 s  —                  fără limită
```

  Nerotunjit: 65,6 / 348,8 / 223,2 / 250,5 / 317,4 s. „Amestec” e acum cu 11 s sub limita de 360.
- `npm run check`: 262 de teste trec (232 înainte).

**Task 2 — Cele nouă module.**
- Modulele au efecte. Cifrele lor stau în `MODS` (`src/data/modules.ts`), pe trepte; lista de oferit (`BALANCE.hero.offerPool`) are acum toate nouă modulele, deci fiecare nivel plătit deschide o ofertă.
  - Unda: lovitura 10 / 16 / 24, arcul 1,25 / 1,6 / 2,0 rad; raza, ritmul și împinsul neschimbate. La treapta 1 face exact ce făcea nava de nivelul 1 (test pe cinci dușmani).
  - Laserul (rază 170, o tragere la 0,9 s) lovește pe loc cel mai apropiat dușman și lasă efectul `beam`. Rachetele (rază 200, una la 2,4 s, 240 px/s) lovesc la sosire toți dușmanii din zona de 50 și lasă `blast`; cu ținta doborâtă în zbor, explodează la ultimul punct știut. Razele turelelor rămân `bolt`, fără zonă (`Shot.kind`, `Shot.blast`).
  - Blindajul adaugă viață maximă (și la viața de acum, când e ales). Scutul încărcat oprește o lovitură întreagă (efectul `block`) și se reface. Reparatorul înlocuiește așteptarea și ritmul refacerii. Motorul înmulțește viteza. Magnetul înlocuiește distanța de strâns și scurtează timpul între bucăți. Releul împarte timpul dintre trageri al turelelor cu corpul la cel mult 220 de nava vie.
  - Nava doborâtă nu trage cu nicio armă, iar ceasurile armelor ei nu curg. Ceasul scutului curge și atunci. Ordinea în pas: unda, laserul, rachetele, turelele.
  - Efectele noi trăiesc 0,12 s (`beam`), 0,3 s (`blast`) și 0,25 s (`block`) (`BALANCE.fx`); desenul lor vine la Task 6. Până atunci desenul le sare, fără să scrie vreun text.
- Nivelul navei merge până la 9 (pragurile 6, 10, 13, 16, 20, 24, 28, 34); un nivel dă 10 viață (era 20) și nu mai dă lovitură: `BALANCE.hero.dmg` și `dmgPerLevel` nu mai există.
- `choose` refuză, cu motiv și fără să atingă starea, o ofertă care nu se potrivește cu nava (modul nou deja pe navă, fără loc liber, treaptă care nu e cea de acum plus unu). Salvarea verifică și modulele navei.
- Trecător, până la panoul de alegere (Task 4): în aplicație, o ofertă deschisă se alege singură, prima.
- Jucătorii automați aleg oferta după o listă de preferințe, aceeași pentru toate purtările: Laser, Blindaj, Releu, Undă, Rachete, Scut, Reparator, Motor, Magnet (`pickOffer`). Testele care rulează jucătorii automați pas cu pas aleg și ele oferta, ca rularea.
- **Propuneri, până le vede Andrei în joc:** cifrele modulelor din design și listele de preferințe, neschimbate; pragurile nivelurilor 6–9 (20, 24, 28, 34), din design. Plasa a trecut cu cifrele de pornire, fără vreo încercare de reglaj, deci reglajul rămâne pentru Task 3.
- Tabelul de după (`npm run balance`, raza 120):

```
Raza de apărare 120
Jucător        Mediană        Min    Max    Limită             Verdict
Nimic          66 s           59 s   82 s   60–130 s           în limită
Amestec        300 s          242 s  348 s  240–360 s          în limită
Doar navă      192 s (64,0%)  179 s  226 s  ≤ 75% din Amestec  în limită
Fără navă      250 s (83,6%)  235 s  273 s  ≤ 90% din Amestec  în limită
Fără economie  279 s          232 s  316 s  —                  fără limită
```

  Nerotunjit: 65,6 / 299,7 / 191,9 / 250,5 / 278,9 s. „Fără navă” s-a apropiat de limita lui (83,6% din 90%), fiindcă „Amestec” a scăzut cu 49 s.
- La sfârșitul partidei, mediana pe 20 de semințe: „Amestec” ajunge la nivelul 4 (designul țintește 6–8 într-o partidă bună), „Doar navă” la nivelul 2. Se reglează la Task 3.
- `npm run check`: 296 de teste trec (262 înainte). `npm run smoke`: 20 de verificări.

**Task 3 — Reglajul și tabelul: oprit, așteaptă o hotărâre despre jucătorii automați.**
- În cod (commit-ul acesta, doar teste, nicio cifră schimbată):
  - `src/sim/run.test.ts`: testul de viteză cu cele trei arme la treapta 3 așază acum cei 150 de dușmani lângă navă (inele între 30 și 165 px, viață mare, nava cu viață mare), deci armele trag tot timpul. În cei 600 de pași s-au tras, măsurat, 23 de unde, 12 raze de laser și 5 explozii de rachetă; testul cere cel puțin cât dau ritmurile lor în 10 s (22, 11 și 4). Limita de 1 ms pe pas rămâne și se măsoară doar pe `step`.
  - Efectele îmbătrânite: teste noi pentru `blast` (`combat.test.ts`) și `block` (`hero.test.ts`), ca cel pentru `beam`.
  - `src/data/balance.test.ts`: treptele fiecărui modul sunt strict mai bune de la una la alta, pe cifra lor principală (12 liste).
- **Ce oprește taskul.** Rândul nou „Fără turele” (`buy: ['economy', 'hero']`), cu cifrele de azi neschimbate, pică testul de partidă întreagă din `src/bots/bot.test.ts` („nicio plată la un cerc care nu e ținta în acel pas”): sămânța 16, la 41,93 s, nava plătește nivelul 2 al colectorului; un dușman doborât duce experiența la 6, nava devine gata de nivel, stocul (36 cristale, 11 metal) acoperă prețul, iar regula din Task 1 („nivelul gata se plătește înaintea luptei și a rândului”) mută ținta pe cercul navei cât nava încă stă pe colector; urmează 3 plăți la colector în afara țintei (41,97–42,03 s). Aceeași potrivire apare la „Amestec” sau „Fără turele” la toate cele 9 seturi de cifre de reglaj trecute prin acest test, inclusiv unul cu prețul navei de azi. Purtarea e înghețată pentru acest task, deci n-am atins-o: hotărârea e a celui care conduce.
- **Propunerea de reglaj, neaplicată** (încercarea 31 din 31; măsurată cu purtarea de azi, în copii de lucru): prețul navei la nivelul n cristale 15 + 5 × (n − 2), metal 5 × (n − 2) (azi 25 + 15 × (n − 2) și 10 + 15 × (n − 2)); viața dușmanului 14 × (1 + t / 35) (azi t / 45); pragurile 6, 9, 11, 13, 20, 24, 28, 34 (azi 6, 10, 13, 16, …); Unda 10 / 14 / 19 (azi 10 / 16 / 24); Laserul 14 / 19 / 24 (azi 14 / 22 / 32); Releul 1,3 / 1,55 / 1,8 (azi 1,2 / 1,35 / 1,5); Magnetul 50 / 75 / 100 px (azi 40 / 60 / 80). Cu ea: Nimic 65,6 s · Amestec 292,0 s · Doar navă 190,6 s (65,3%) · Fără navă 222,0 s (76,0%) · Fără economie 267,1 s · Fără turele 216,0 s; la „Amestec” nivelul 7 la sfârșit, nivelul 2 la 46,9 s, nivelul 5 la 144,8 s. Toate țintele ies; testul de mai sus pică („Amestec”, semințele 2 și 3; „Fără turele”, 10 și 16).
- Proba cu trei liste `prefer` pe propunere („Amestec”): armele întâi 295,1 s, corpul întâi 258,9 s, utilitarele întâi 272,5 s; cea mai mare diferență, 14,0%. Modulele de corp nu valorează nimic pentru jucătorii automați: cu Blindaj, Scut și Reparator mult mai tari, „corpul întâi” iese la fel la secundă (pe semințele 1–5 nava e lovită de 13–27 de ori într-o partidă și nu cade niciodată).
- Jurnalul încercărilor și amănuntele: raportul taskului, `.superpowers/sdd/2026-11-20-world-guard-nava-cu-module/task-3-report.md`.
- `npm run check`: 299 de teste trec. `npm run smoke`: „SMOKE OK (20 verificări)”.

**Rămâne:**
- [ ] hotărârea despre regula „nivelul gata se plătește întâi”, care mută ținta în mijlocul unei plăți la alt cerc; apoi rândul „Fără turele”, coloanele de nivel (gata, în afara commit-ului) și reglajul.

**Task 3, după hotărârea celui care conduce (R7) — regula nouă a jucătorilor automați, rândul nou și reglajul.**
- **Regula nouă a jucătorilor automați, „jucătorul automat își termină plata începută”** (`heldPad` în `src/bots/policy.ts`, prima regulă din `nextPad`): dacă nava vie stă pe un cerc de cumpărat (nu cel de reparat) pe care plata curge (`dwell` la prag, nava în `PAD_R`), cercul mai are ceva de plătit pentru nivelul următor și stocul mai poate plăti măcar o unitate din ce a rămas, acel cerc rămâne ținta. Altfel, regulile de până acum, în ordine: nivelul gata și plătibil al navei, apoi rândul categoriilor. În `chooseGoal`, cu o plată ținută la alt cerc decât al navei, nivelul gata o așteaptă, iar lupta trece înaintea ei, ca înainte; plata nivelului navei trece, ca înainte, înaintea luptei.
  - Prima mea variantă oprea și plata nivelului navei în fața luptei: „Amestec” cădea de la 299,7 la 266,0 s, pe aproape toate semințele (sămânța 3: la 60,17 s, în mijlocul plății nivelului 2, nava pleca să lupte). Reparată; testul „ținută la o turelă, plata cedează în fața luptei; ținută la cercul navei gata, nu” o fixează.
  - Cu cifrele de dinainte de reglaj, tabelul e identic cu cel de la Task 2 la cele cinci purtări vechi (66 / 300 / 192 / 250 / 279 s), iar parcursul din `bot.test.ts` trece pe toate cele 20 de semințe × șase purtări.
  - Teste noi în `src/bots/policy.test.ts`, văzute picând întâi (trei din ele) pe regula veche: nava devine gata la mijlocul plății unei turele, iar ținta rămâne turela până la sfârșitul nivelului; plata ținută se oprește când stocul nu mai poate plăti nimic; nava trece pragul fără să fie plătibilă, iar ținta rămâne cercul plătit; cu `dwell` sub prag nu se ține nimic; cercul de reparat nu e ținut niciodată.
- **Rândul „Fără turele”** (`buy: ['economy', 'hero']`, ultimul, fără limită) și trei coloane de informație: nivelul navei la sfârșit și secundele nivelurilor 2 și 5 (mediane; „—” dacă pe cel puțin jumătate din semințe nivelul n-a fost atins). `playTimed` în `src/bots/run.ts`; `Row` capătă `level`, `lvl2At`, `lvl5At`.
- Tabelul de dinainte (regula nouă, cifrele de dinainte de reglaj, `npm run balance`):

```
Jucător        Mediană        Min    Max    Limită             Verdict      Nivel  Nivel 2  Nivel 5
Nimic          66 s           59 s   82 s   60–130 s           în limită    1      —        —
Amestec        300 s          242 s  348 s  240–360 s          în limită    4      61 s     —
Doar navă      192 s (64,0%)  179 s  226 s  ≤ 75% din Amestec  în limită    2      93 s     —
Fără navă      250 s (83,6%)  235 s  273 s  ≤ 90% din Amestec  în limită    1      —        —
Fără economie  279 s          232 s  316 s  —                  fără limită  3      61 s     —
Fără turele    214 s          173 s  267 s  —                  fără limită  4      49 s     —
```

- **Propuneri, până le vede Andrei în joc** (înainte → după, motivul):
  - prețul navei la nivelul n: cristale 25 + 15 × (n − 2) → 15 + 5 × (n − 2); metal 10 + 15 × (n − 2) → 5 × (n − 2). La „Amestec”, după nivelul 2, experiența era gata cu mult înaintea plății (nivelul 4 gata la 116,6 s, plătit la 232,2 s): ritmul nivelurilor îl țineau resursele. Metalul 0 la nivelul 2 aduce nivelul 2 de pe la 53 s pe la 45–48 s.
  - pragurile nivelurilor 3–5: 10, 13, 16 → 9, 11, 13 (restul neschimbate). Cu prețul mic, nivelul 5 era legat de experiență, plătit pe la 165 s, la marginea țintei de 170; acum la 145 s.
  - viața dușmanului: 14 × (1 + t / 45) → 14 × (1 + t / 33). Nava mai ieftină ducea „Amestec” la 349,5 s, peste ținta de 335.
  - Releul: × 1,2 / 1,35 / 1,5 → × 1,3 / 1,55 / 1,8; Magnetul: 40 / 60 / 80 → 50 / 75 / 100 px. Ridică lista „utilitarele întâi” (Magnetul singur: 269,4 → 272,9 s, măsurat în încercări); Releul se vede și în „Amestec”.
  - Armele au rămas cum le-a dat designul (Unda 10 / 16 / 24, Laserul 14 / 22 / 32, Rachetele 12 / 18 / 26), ca să crească vizibil de la o treaptă la alta. O variantă cu armele slăbite (Unda 10 / 14 / 19, Laserul 14 / 19 / 24) scădea diferența dintre liste sub 15%, dar numai prin arme mai slabe; n-am ales-o.
  - Încercate și puse la loc, fiindcă n-au avut efect: Blindaj, Scut, Reparator mai tari; Motorul mai tare; Rachetele mai slabe.
- Tabelul de după (`npm run balance -- --raze`, 45,6 s):

```
Raza de apărare 120
Jucător        Mediană        Min    Max    Limită             Verdict      Nivel  Nivel 2  Nivel 5
Nimic          66 s           59 s   82 s   60–130 s           în limită    1      —        —
Amestec        306 s          249 s  350 s  240–360 s          în limită    7      48 s     145 s
Doar navă      199 s (65,0%)  173 s  223 s  ≤ 75% din Amestec  în limită    2      47 s     —
Fără navă      219 s (71,6%)  198 s  235 s  ≤ 90% din Amestec  în limită    1      —        —
Fără economie  278 s          203 s  309 s  —                  fără limită  4      45 s     —
Fără turele    235 s          176 s  279 s  —                  fără limită  7      48 s     140 s

Raza de apărare 80
Nimic          66 s           59 s   82 s   60–130 s           în limită    1      —        —
Amestec        290 s          236 s  313 s  240–360 s          în limită    7      48 s     143 s
Doar navă      188 s (65,0%)  169 s  227 s  ≤ 75% din Amestec  în limită    2      48 s     —
Fără navă      215 s (74,2%)  191 s  231 s  ≤ 90% din Amestec  în limită    1      —        —
Fără economie  268 s          201 s  304 s  —                  fără limită  5      45 s     156 s
Fără turele    225 s          166 s  251 s  —                  fără limită  6,5    48 s     141 s

Raza de apărare 160
Nimic          66 s           59 s   82 s   60–130 s           în limită    1      —        —
Amestec        300 s          260 s  339 s  240–360 s          în limită    7      45 s     152 s
Doar navă      193 s (64,2%)  169 s  232 s  ≤ 75% din Amestec  în limită    2      47 s     —
Fără navă      221 s (73,5%)  193 s  234 s  ≤ 90% din Amestec  în limită    1      —        —
Fără economie  275 s          208 s  307 s  —                  fără limită  4      45 s     —
Fără turele    236 s          170 s  288 s  —                  fără limită  7      47 s     141 s
```

  Nerotunjit, la raza 120: 65,6 / 305,9 / 198,8 / 219,0 / 277,6 / 234,7 s; la „Amestec”, nivelul 2 la 47,9 s, nivelul 5 la 145,3 s.
- Țintele (raza 120): toate ies. Nimic 65,6 s (62–125); Amestec 305,9 s (270–335); Doar navă 65,0% (cel mult 70); Fără navă 71,6% (cel mult 85); Fără economie 277,6 s și Fără turele 234,7 s, sub „Amestec”; la „Amestec”, nivelul 7 la sfârșit (6–8), nivelul 2 la 47,9 s (25–60), nivelul 5 la 145,3 s (90–170).
- **Proba cu trei liste `prefer`** („Amestec”, cifrele de după): armele întâi (laser, missile, wave, armor, shield, mender, relay, engine, magnet) 303,7 s; corpul întâi (armor, shield, mender, laser, missile, wave, relay, engine, magnet) 250,5 s; utilitarele întâi (relay, engine, magnet, laser, missile, wave, armor, shield, mender) 266,5 s; lista din cod 305,9 s. **Armele bat corpul cu 21,2% și utilitarele cu 14,0%:** peste pragul de 15% din brief, raportat ca atare. Lista din cod a rămas cea de dinainte.
- **Pentru Andrei: modulele de corp nu valorează nimic pentru jucătorii automați.** Pe semințele 1–5, cu lista din cod, nava e lovită de 20–39 de ori într-o partidă de 262–350 s și nu e doborâtă niciodată; cu „corpul întâi”, de 10–40 de ori, tot fără nicio cădere. Cu Blindaj, Scut și Reparator mult mai tari (40 / 80 / 130 viață; 5 / 3,5 / 2 s; 1,5 / 1 / 0,5 s și 8 / 12 / 16 pe secundă), „corpul întâi” urcă doar de la 250,5 la 252,8 s. Jucătorii luptă lângă planetă, iar unda îi împinge pe dușmani; ce le lipsește e lovitura, nu viața. Purtarea n-am schimbat-o ca să repar asta.
- Regula de mers la cifre vecine: parcursul din `bot.test.ts` (toate semințele × șase purtări) trece pe setul ales și pe 9 seturi vecine (viața t / 32 și t / 34; prețul navei cu metal 6 și 4 pe nivel, cu cristale 20 la nivelul 2; pragurile 6, 10, 12, 14, …; Releul 1,25 / 1,5 / 1,75; ritmul 5 / (1 + t / 85); fără Magnetul nou). Două seturi pică altă regulă a lui, „cel mult 10 pași pe un cerc străin”: viața t / 35 și Releul 1,25 / 1,5 / 1,75 cu t / 35. În ambele, „Fără turele”, sămânța 17, la 113,92 s, nava stă 11 pași pe cercul navei în drum spre mină, la câteva pași după ce și-a plătit acolo nivelul; nu plătește nimic acolo (plata ar porni după 21 de pași). E o margine a mersului, nu a regulii noi; de aceea am ales t / 33.
- Testele aduse la zi (doar valoarea așteptată): `balance.test.ts` (prețul navei, `foeHp(33)` = 28), `foes.test.ts`, `mods.test.ts` (pragurile), `pads.test.ts` (prețul nivelurilor 2 și 3), `combat.test.ts` (Releul: 48 / 37 / 31 / 27 de pași), `hero.test.ts` (Magnetul). În `policy.test.ts`, două teste cereau „lipsește metal la nivelul 2”, iar nivelul 2 nu mai cere metal. „Lipsă 5 cristale și 10 metal” trece la nivelul 4 (25 cristale și 10 metal, cu 20 de cristale în stoc), deci are aceleași lipsuri ca înainte. „Cu toți asteroizii goi” trece la nivelul 3. `docs/GDD.md`, „Cifrele jocului”: prețul navei, pragurile, viața dușmanului, Releul și Magnetul.
- Jurnalul încercărilor, pe scurt: 31 de încercări înainte de hotărâre și încă 18 seturi de cifre după (setul ales, vecinii lui), plus probele `prefer`; amănuntele sunt în raportul taskului.
- `npm run check`: 310 teste trec; `npm test` durează cam 32 s. `npm run smoke`: „SMOKE OK (20 verificări)”, 9,73 ms pe cadru la desenul cu 150 de nave.
- [x] hotărârea despre plata începută: luată (R7) și pusă în cod în acest commit.

**Task 3, reparațiile după recenzie (R8).**
- `policy.test.ts`: „lipsă 5 cristale și 10 metal” are din nou lipsurile 5 și 10 (nava la nivelul 4). Am adăugat „lipsă 10 cristale și 5 metal: strânge cristal”. Fără el, comparația `missM > missC` putea deveni `missM > 0` fără ca vreun test să pice: am verificat, testul refăcut trece și cu greșeala. Cu greșeala, testul nou pică; iar cu `missC > 0 ? 'crystal' : 'metal'`, pică testul refăcut.
- Plata ținută (`heldPad`) ține doar un cerc dintr-o categorie pe care purtarea o cumpără: turela pentru `turret`, colectorul și mina pentru `economy`, cercul navei pentru `hero`. Testul nou a picat întâi pe codul de dinainte. Tabelul nu s-a mișcat.
- `bot.test.ts`: la sfârșitul partidei, „Fără turele” are toate turelele la nivelul 0.
- **Magnetul pus la loc, la 40 / 60 / 80 px.** Cu celelalte cifre alese, „Amestec” cu lista „utilitarele întâi” ține 268,6 s cu 40 / 60 / 80 și 266,5 s cu 50 / 75 / 100: niciun câștig. Testul Magnetului și `docs/GDD.md` sunt aduse înapoi. Tabelul nu se schimbă (66 / 306 / 199 (65,0%) / 219 (71,6%) / 278 / 235 s).
- Proba `prefer` cu cifrele finale: armele întâi 303,7 s, corpul întâi 250,5 s (+21,2%), utilitarele întâi 268,6 s (+13,1%).
- `npm run check`: 312 teste trec.

**Task 4 — Panoul de alegere.**
- La un nivel plătit, jocul stă și apare panoul pe mijlocul ecranului (`src/ui/choice.ts`, `#choiceVeil` în `index.html`): „Nivel n”, „Alege un modul”, locurile navei ca pătrate mici (ocupate în culoarea felului, libere punctate, lacăt la următorul care se deschide) și ofertele ca rânduri late, una sub alta: pictogramă, nume, „Armă · Nou” sau „Corp · Întărire”, cel mult două rânduri de text și trei puncte până la treapta la care ajunge. Dedesubt: „Jocul stă pe loc cât alegi.”. Culoarea felului: arma `--hero`, corpul `--shield`, utilitarul `--metal`. Pictogramele sunt cele din machetă, ca `<symbol>` în `index.html`.
- Fundalul (canvasul și banda de sus) se vede încețoșat și întunecat: `backdrop-filter: blur(5px)` (și cu `-webkit-`) pe văl, peste un văl de 50%. Unde browserul nu are încețoșarea, vălul e de 78%: fundalul se vede doar întunecat.
- Rândurile sunt butoane legate cu `onTap` și sunt făcute din nou la fiecare deschidere: o atingere începută înainte de panou (pe canvas, cu joystickul) nu are cum să aleagă. Tastele 1, 2, 3 aleg; focusul merge pe primul rând. Escape nu închide panoul; butonul de pauză e ascuns cât e deschis; joystickul e lăsat.
- Alegerea automată trecătoare din Task 2 a dispărut. `session.choose(i)` întoarce `false` fără partidă în curs, fără ofertă, cu un index greșit sau când simularea refuză oferta; panoul rămâne atunci deschis. În testul de viteză, experiența rămâne 0.
- Regula „oferta se potrivește cu nava” stă acum într-un singur loc, `offerFits` (`src/sim/mods.ts`), folosit de `choose` și de citirea salvării: o salvare cu o ofertă pe care `choose` ar refuza-o e respinsă cu „altă formă”, altfel partida ar sta pe loc pentru totdeauna.
- Pagina ascunsă cu panoul deschis: pauza salvează partida cu oferta; „Continuă” și „Continuă partida” după reîncărcare duc la același panou.
- Proba din browser are patru verificări noi (21–24) și captura `08-alegere.png`.
- `npm run check`: 326 de teste trec (312 înainte). `npm run smoke`: „SMOKE OK (24 verificări)”.

**Task 4, finisajul după recenzie (R10) — ca jucătorul să nu aleagă fără să vrea.**
- Focusul de la deschidere stă pe cartonașul panoului (`#choiceCard`, `tabindex="-1"`, fără contur), nu pe prima ofertă, cum era până acum. Pe telefon focusul pus din cod rămânea `:focus-visible`, iar inelul alb făcea prima ofertă să pară aleasă deja; un Enter sau Spațiu apăsat din reflex o alegea. Acum Tab duce la prima ofertă, unde conturul se vede; tastele 1–3 merg ca înainte.
- **Propunere:** panoul nu primește alegeri în primele 400 ms de la deschidere (`CHOICE_GRACE_MS` în `src/ui/choice.ts`). Jucătorul care stă pe cercul navei ca să plătească pune des degetul pe ecran ca să plece exact când apare panoul; apăsarea aceea ar începe pe un rând. Poarta e una singură (`tryPick`) și prin ea trec atingerea, clicul (și cel de la tastatură) și tastele 1–3. Contează când a ÎNCEPUT apăsarea: una pornită înăuntrul ferestrei nu alege nici dacă degetul se ridică după. Ceasul e al interfeței (`performance.now`, dat ca parametru, ca testele să-l conducă); simularea n-a fost atinsă.
- Tastele 1–3: maparea e acum o funcție fără DOM, `pickIndex` (`src/input/bind.ts`), testată în `bind.test.ts` (tasta ținută și Ctrl, Alt sau Meta nu aleg).
- Proba din browser: verificarea 21 face o atingere pe un rând imediat după deschidere (la 188 ms, măsurat cu poarta scoasă, când alegea) și apasă Enter și Spațiu; nimic nu e ales. Verificările 21–24 așteaptă fereastra înainte să aleagă. Comentariul verificării 24 spune ce dovedește și ce nu.
- `npm run check`: 336 de teste trec (326 înainte). `npm run smoke`: „SMOKE OK (24 verificări)”.

**Task 5 — Banda de sus și cercul navei.**
- Banda are un al treilea rând (`#ship`): nivelul într-un inel care se umple cu experiența spre pragul următor, locurile navei și, la dreapta, „experiență 14/40”. Cu pragul atins, inelul e plin, în culoarea navei, iar textul e „Nivel 4 gata”; la nivelul maxim, „Nivel maxim”. Ce arată rândul iese dintr-o funcție fără DOM, `shipRow` (`src/ui/hud.ts`); DOM-ul se atinge doar când o valoare s-a schimbat.
- Locurile, aceleași în bandă și în panoul de alegere: `src/ui/slots.ts` (`shipSlots` fără DOM, `slotElement` pentru pagină). Un loc ocupat arată acum pictograma modulului, în culoarea felului (în panou era un pătrat de culoare); `ChoiceView['slots']` poartă `{ kind, id }`. La 20 px pe ecran (pictograma de 14 px) pictogramele se citesc, inclusiv la 360 px lățime, cu 6 locuri.
- Cercul navei pe canvas, trei stări (`heroPadView` în `src/sim/mods.ts`, lângă `heroReady`): cât experiența nu ajunge, sub nume scrie „experiență 14/40” în locul prețului (înainte scria, greșit, „nivel maxim”, și cercul era stins); gata, cercul e aprins (inel plin și umplere în culoarea navei, fără gradient și fără `shadowBlur`) și arată prețul; la nivelul maxim, „Navă · nivel maxim”.
- Înălțimea benzii: aceeași în start, joc, pauză, panou deschis și final; în testul de viteză e mai înaltă exact cu rândul „TEST · fps”, ca înainte de etapă (rândul fps nu ține loc în afara testului). Măsurat la 360 px lățime: 122 px în start și în joc, 138 px în testul de viteză. Verificarea 26 măsoară în pixeli, cere faza fiecărei măsurători (`window.__wg.phase()` și cartonașul sau panoul vizibil), cere cele cinci înălțimi egale (sub 0,5 px) și testul mai înalt cu cel mult rândul fps plus distanța dintre rânduri, măsurate în pagină; în testul de viteză rândul navei arată „experiență 0/…”.
- Culoarea inelului de experiență e o **propunere**: alb cât se umple, galben (`--hero`) la „gata” și la nivelul maxim. Macheta aleasă de Andrei îl avea galben tot timpul.
- Texte noi, doar în `src/ui/strings.ts`: `STR.xpOf`, `STR.levelReady`, `STR.levelMax`.
- Proba din browser: verificările 25 (rândul navei, „Nivel 2 gata”) și 26 (înălțimea benzii); capturile `03-joc.png`, `08-alegere.png` și `09-banda-gata.png`. `npm run smoke`: „SMOKE OK (26 verificări)”.

**Task 6 — Modulele și tragerile pe canvas.**
- Fiecare modul adaugă navei o formă (`src/render/orbit/things.ts`, în `hero`): Laserul o țeavă albă în bot, cu vârful albastru; Rachetele două cutii albe pe aripi, cu vârful portocaliu; Blindajul un contur alb, gros, în jurul corpului; Scutul un inel subțire în jurul navei cât e încărcat; Reparatorul un plus albastru în cabină; Motorul o duză în coadă și un jet care arde și pe loc, mai lung în mers; Magnetul o potcoavă pe aripa stângă; Releul un punct între două unde pe aripa dreaptă. Unda nu are formă: e arma de la început. Treapta, fără text: țeava, cutiile, jetul și brațele plusului se lungesc, conturul, inelul și cele două unde ale Releului se îngroașă, potcoava crește. Nava fără Motor are în mers exact jetul de dinainte (fixat de un test în `world.test.ts`); Motorul îl mută la duză și îl lungește. Formele și mărimile sunt **propuneri**.
- Tragerile: raza laserului e o linie de la marginea navei la țintă, cu halou, care se stinge în `BALANCE.fx.beamLife` (0,12 s); racheta e un corp mic, alb, cu vârf și jet portocaliu; explozia e un disc portocaliu străveziu și un inel galben care cresc de la 30% din zonă până la zona întreagă și se sting în `blastLife`; când Scutul oprește o lovitură, inelul clipește alb și se lărgește puțin, în `blockLife`. Duratele erau deja în `BALANCE.fx`, iar curățarea efectelor bătrâne și testele ei existau din Taskurile 2 și 3 (`combat.test.ts`: „raza de lumină dispare din efecte după durata ei”).
- `Skin` capătă `beam(ctx, fx, age)` și `blast(ctx, fx, age)`; `shot` desenează racheta după `sh.kind`. `world.ts` le cheamă în stratul razelor, peste inelul planetei: exploziile, raza laserului, apoi rachetele și razele turelelor (racheta se vede peste raza care țintește aceeași navă). Ce citește desenul din stare stă în `derive.ts`: `fade`, `shieldReady`, `blockGlow`, `blastReach`. Fără culori noi: totul vine din variabilele CSS existente.
- Pictograma Rachetelor din `index.html` (bandă și panou) e redesenată: o rachetă subțire, culcată pe diagonală, cu două aripioare și o flacără, în locul formei drepte care la 14 px semăna cu un clopoțel.
- Proba din browser rămâne la 26 de verificări. Rândul `SMOKE INFO` e acum două: aceeași rulare, aceleași 150 de nave în jurul planetei, nava fără module și apoi cu toate cele nouă module la treapta 3 (stare forțată: pe navă încap șase), cu armele trăgând din simulare și cu numărul razelor, rachetelor și exploziilor din cadru tipărit alături. Patru rulări cu codul din commit: 8,83 / 9,32; 11,05 / 9,63; 10,03 / 10,11; 10,07 / 9,91 ms pe cadru (fără / cu module), deci între −13% și +6%. Cu o formă mai veche a desenului, aceeași măsurătoare a dat o dată +24% (8,87 / 10,96) și altă dată −6%: diferența e în zgomotul mașinii, nu în desenul modulelor.
- Capturi noi: `10-nava-module.png` (mărită: nava legitimă cu Unda, Laser, Rachete, Blindaj, Motor și Magnet la treptele 1 și 3, și celelalte trei, Scut, Reparator și Releu, la treptele 1 și 3), `11-explozie.png` (explozie, rază de laser și rachetă în zbor, trase de simulare), `12-nava-la-scara.png` (aceleași nave la scara jocului), `13-banda-rachete.png` și `14-panou-rachete.png` (pictograma nouă).
- `npm run check`: 353 de teste trec (345 înainte). `npm run smoke`: „SMOKE OK (26 verificări)”.

**Task 6, finisajul după recenzie.**
- Jetul navei fără Motor e iar cel de dinainte de module (vârfurile `-13 − 9·fl` și `-9 − 5·fl`); testul nou din `world.test.ts` fixează punctele căii. Cu Motorul, jetul pornește de la duză și se lungește cu treapta.
- `world.test.ts` fixează și ordinea din stratul razelor: explozii, raza laserului, rachete. Comentariile lui `ship` și `blastReach` spun ce face codul. `ship` nu mai face un tablou nou pe cadru.
- `npm run check`: 354 de teste trec. `npm run smoke`: „SMOKE OK (26 verificări)”; `SMOKE INFO` 9,17 / 9,50 ms pe cadru (fără / cu module).

**Încheierea etapei (Task 7 — documentele).**
- **Ce s-a livrat în etapă** (în cod pe ramură, în pull request-ul #15, ciornă, neîmbinat, care ține și faza 3; jocul publicat pe GitHub Pages are fazele 1, tema și 2): experiența navei înainte de nivel; cercul navei cu trei stări; panoul de alegere cu trei oferte, jocul stând pe loc cât alegi, cu fundal încețoșat; nouă module la trei trepte (Undă, Laser, Rachete, Blindaj, Scut, Reparator, Motor, Magnet, Releu) și locuri de la 2 la 6, până la nivelul 9; rândul navei în banda de sus; formele modulelor, raza laserului, racheta și explozia pe canvas; salvarea versiunea 2 cu oferta deschisă; jucători automați care aleg module, plătesc nivelul navei și își termină plata, plus purtarea „Fără turele” și coloanele de nivel din tabel; proba din browser la 26 de verificări. Documentele de azi: `docs/GDD.md`, `CLAUDE.md`, `README.md`.
- **Cifrele de la încheiere**, rulate pe codul din commit: `npm run check` — 36 de fișiere de test, 354 de teste trec; `npm run smoke` — „SMOKE OK (26 verificări)”, desenul cu 150 de nave în jurul planetei în jur de 9–10 ms pe cadru (9,90 ms nava fără module; 8,87 ms nava cu toate cele nouă module la treapta 3, trăgând; mașina are zgomot de cam ±10%); `npm run balance`, raza 120: Nimic 66 s · Amestec 306 s · Doar navă 199 s (65,0%) · Fără navă 219 s (71,6%) · Fără economie 278 s · Fără turele 235 s; „Amestec” la nivelul 7, nivelul 2 la 48 s și nivelul 5 la 145 s. Tabelul întreg e în `docs/GDD.md`, la „Plasa pentru dificultate”.
- **Ce din intrările de pe parcurs e propunere, nu fapt hotărât** (intrările vechi nu se rescriu; lista completă e și în `docs/GDD.md`, la „Cine a hotărât ce”): toate cifrele (pragurile de experiență, experiența pe dușman, prețul nivelului, cifrele celor nouă module, viața dușmanului 14 × (1 + t / 33)); cele 400 ms în care panoul nu primește alegeri și focusul pe cartonaș în loc de prima ofertă; inelul de experiență alb cât se umple și galben la „gata” (macheta îl avea galben tot timpul); înălțimea benzii (122 px la 360 px lățime, 138 px în testul de viteză); formele modulelor pe navă și culoarea exploziei; **ceasul Scutului care curge și cu nava doborâtă** (intrarea Taskului 2 îl scrie ca fapt; e o propunere); regulile noi ale jucătorilor automați (nivelul navei plătit întâi când e gata și sunt bani, plata începută se termină). Hotărâte de Andrei sunt doar cele din spec: experiență înainte de nivel, cartonaș din trei, pauză la alegere cu panou pe mijloc și fundal încețoșat, totul în banda de sus, arsenal de mai multe feluri și tot mai multe componente, și direcția etapelor următoare. Locurile 2→6 sunt propuse de Claude și acceptate de Andrei („e ok”, 19.11.2026), nu hotărârea lui (îndreptat în valul de reparații de după recenzie; cele două liste de propuneri acceptate sunt în spec și în `docs/GDD.md`).
- **Ce nu vede plasa:** Blindajul, Scutul și Reparatorul nu valorează aproape nimic pentru jucătorii automați (nava lor e lovită rar și nu cade); proba „Amestec” cu trei liste de preferințe: armele întâi 303,7 s, utilitarele întâi 268,6 s, corpul întâi 250,5 s. „Doar navă” rămâne la nivelul 2. Releul se citește slab la scara jocului, iar la treapta 3 unele forme de pe navă se ating.
- **Îndreptări din recenzii, făcute acum:** `docs/GDD.md` — rândul „Navă (eroul)” adus la cifrele din `src/data/balance.ts`, tabelul purtărilor cu „Fără turele”, zgomotul tabelului pe altă mașină „sub un punct”; `CLAUDE.md` — `mods.ts` în lista de la `src/sim/` și „în primul minut” devenit „spre secunda 60”.
- **Etapele următoare din spec** (dușmani de mai multe feluri și elite cu obiecte de adoptat; turele de mai multe feluri; tipuri de nave) nu sunt promise și cer fiecare designul ei, cu Andrei.
- [ ] proba lui Andrei pe telefon pentru fazele 2 și 3 și nava cu module împreună: instalarea, jocul fără internet, pauza apăsată cu cealaltă mână, reluarea, ecranul aprins, cum se simte dificultatea nouă, panoul de alegere (și cele 400 ms), banda mai înaltă, formele modulelor la scara jocului;
- [x] cele două cifre de la „Test de viteză” (cadre pe secundă și `min`), niciodată notate: pentru tema nouă și pentru nava cu toate modulele trăgând; înlocuită de restanța din intrarea valului de reparații de mai jos, fiindcă testul de viteză pornea nava doar cu Unda și cifra cu armele trăgând nu se putea lua pe telefon;
- [ ] hotărârea lui Andrei asupra propunerilor etapei: cifrele, cele 400 ms și focusul panoului, culoarea inelului de experiență, înălțimea benzii, formele modulelor, ceasul Scutului, regulile jucătorilor automați;
- [ ] de arătat lui Andrei: etichetele din lume se văd prin banda de sus (problemă veche, mai deasă cu banda mai înaltă); arcul de plată de pe cercul navei aprins are puțin contrast; Releul se citește slab și la treapta 3 unele forme de pe navă se ating (țeava Laserului și inelul Scutului, potcoava Magnetului și cutia Rachetei);
- [ ] hotărârea lui Andrei despre ce vine după nava cu module: dușmani de mai multe feluri și elite cu obiecte de adoptat; turele de mai multe feluri; tipuri de nave;
- [x] hotărârea despre regula „nivelul gata se plătește întâi”, care mută ținta în mijlocul unei plăți la alt cerc; apoi rândul „Fără turele”, coloanele de nivel (gata, în afara commit-ului) și reglajul: luată (R7); rândul, coloanele și reglajul sunt în cod din Task 3.

## 21.11.2026 — Nava cu module: reparațiile după recenzia întregii ramuri

Recenzia întregii ramuri n-a găsit nimic stricat în purtarea jocului; valul ăsta repară un test rămas slăbit, o cerință de măsurat pe telefon care nu se putea îndeplini, o alegere a jucătorilor automați care înclina tabelul, salvarea alterată și câteva rânduri de documente.
- **Testul „Doar navă” la nivelul 2, strâns la loc** (`src/bots/bot.test.ts`): pe fiecare sămânță, ca înainte de slăbirea la „15 din 20”; condiția slăbirii (semințe rămase la nivelul 1 din lipsă de resurse) nu mai există. Comentariile spun 120 de partide, nu 100.
- **„Test de viteză” cu armele trăgând** (`src/app/session.ts`, cifrele în `STRESS_SHIP` din `src/data/balance.ts`): nava pornește la nivelul 3 (trei locuri), cu Unda, Laserul și Rachetele la treapta 3 și viața plină; experiența rămâne 0, nu apar niveluri și panou, rămân 150 de nave dușmane. Partida obișnuită pornește ca înainte. **Propunere.** Rândul întâi din `SMOKE INFO` e acum cu nava asta (10,92 ms pe cadru; cu toate cele nouă module, 11,04 ms).
- **Releul la jucătorii fără turele** (`pickOffer` în `src/bots/policy.ts`): „Doar navă” și „Fără turele” îl iau doar dacă nu au altă ofertă; lista de preferințe e aceeași pentru toți. **Propunere.** `LIMITS` neatinse, plasa trece.
- **Salvarea alterată** (`src/app/save.ts`): respinsă, cu „altă formă”, când nivelul navei e în afara 1…9 sau neîntreg, experiența e negativă sau nu e număr finit, sunt mai multe module decât locuri sau oferta are mai mult de trei elemente. O partidă adevărată cu experiență peste prag sau la nivelul maxim e primită ca înainte.
- **Documente:** în `docs/GDD.md`, hotărârea 19 fără „locurile de la 2 la 6” (propus de Claude și acceptat de Andrei), lista nouă „Propus de Claude și acceptat de Andrei” cu cele două grupuri din spec, hotărârea 10 cu excepția Motorului; o singură schimbare la cifrele modulelor (Releul); introducerea la „Cifrele jocului”; zgomotul tabelului marcat ca istorie; ce fac armele cât nava e doborâtă, după cod; patru jucători cu limită și doi doar tipăriți; tabelul nou; de ce rămâne „Doar navă” la nivelul 2–3, plafonul navei singure, cât valorează turelele cu armele întâi și marginea `t / 35` la „Ce e fragil”. `CLAUDE.md` și `README.md` la zi; încheierea etapei de mai sus îndreptată la locurile 2→6.
- **Cifrele, rulate acum:** `npm run check` — 36 de fișiere de test, 364 de teste trec (354 înainte); `npm run smoke` — „SMOKE OK (26 verificări)”; `npm run balance`, raza 120: Nimic 66 s · Amestec 306 s · Doar navă 205 s (66,9%, nivelul 2,5 la mediană) · Fără navă 219 s (71,6%) · Fără economie 278 s · Fără turele 246 s (80,3%; înainte 235 s). Razele 80 și 160 și sondele cu un script de aruncat sunt în `docs/GDD.md`, la „Plasa pentru dificultate”.
- [ ] cele două cifre de la „Test de viteză” pe telefonul lui Andrei (cadre pe secundă și `min`), niciodată notate: pentru tema nouă și pentru nava cu module; acum testul de viteză pornește nava cu Unda, Laserul și Rachetele la treapta 3, trăgând tot timpul, lângă cele 150 de nave dușmane;
- [ ] hotărârea lui Andrei asupra celor două propuneri ale valului: încărcătura navei din „Test de viteză” și Releul luat ultimul de jucătorii automați fără turele.
