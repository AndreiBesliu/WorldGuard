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
