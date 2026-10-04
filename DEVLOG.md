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

## 04.10.2026 — Felia 1: valurile și inamicii pe drum

**Cerut de owner:** „continuă tu aici cu prima felie” — primul punct din lista de mai sus: valurile și
inamicii care merg pe drum, pe o simulare cu tick fix, deterministă.

**Făcut:**
- `src/data/enemies.ts`: 5 tipuri de inamici (normal, rapid, blindat, roi, boss) și 15 valuri, ca date;
  `describeWave` dă rezumatul pentru previzualizare.
- `src/data/joc.ts`: `TICK_MS` 50 (20 de tick-uri pe secundă), `VIETI_BAZA` 20, `VITEZE_UI` 1×/2×/4×,
  `MILI_HEX` 1000.
- `src/sim/game.ts`:
  - faze: `pregatire` → `val` → `pregatire` / `castigat` / `pierdut`;
  - `step` (un tick), `spawnSchedule`, `pathLength`;
  - jurnalul ține acum tick-ul fiecărei decizii (`LoggedDecision`), iar `replay(seed, jurnal, panaLaTick)`
    rulează timpul dintre decizii și se poate opri la orice tick, inclusiv în mijlocul unui val;
  - ordinea într-un tick: inamicii existenți merg, iar cei ajunși la bază iau vieți; apoi apar cei
    programați (pornesc de la intrare și se mișcă din tick-ul următor); apoi se verifică pierderea și
    sfârșitul valului;
  - un ocol în timpul valului e refuzat cu motiv („drumul se modelează doar între valuri”). Refuzul vine
    din simulare; UI-ul doar îl afișează.
- `src/render/canvas.ts`: inamicii, interpolați între centrele hexagoanelor și între două tick-uri.
- `src/main.ts`:
  - bucla pe pas fix: `requestAnimationFrame` adună timp real (plafon 250 ms pe cadru) și rulează câte
    tick-uri încap;
  - Spațiu = pornește valul; F = viteză; P = pauză; R = de la capăt; N = hartă nouă;
  - Z anulează doar ocolurile din pregătirea curentă (replay fără ultima decizie, până la tick-ul curent).
- `index.html`: favicon gol — singura eroare din consolă era un 404 pe `/favicon.ico`.
- 15 teste noi, 48 în total:
  - datele valurilor;
  - programul de apariție;
  - un inamic ajunge la bază exact după `ceil(lungime / viteză)` tick-uri;
  - progresul crește strict;
  - un drum mai lung ține valul mai mult;
  - fazele și refuzurile, cu motivul exact;
  - pierderea, identică la două rulări;
  - replay la mijlocul valurilor;
  - anularea unui ocol după un val jucat;
  - poziții întregi.
- Verificat în browser (Chromium headless), fără erori în consolă:
  - pregătirea, cu previzualizarea ocolului;
  - valul pe drum la 4×;
  - refuzul ocolului în timpul valului;
  - după valul 1: Vieți 12/20;
  - căderea bazei în valul 2.

**Măsurat:**
- **Drumul inițial are 19 hexagoane pe toate cele 40 de hărți (seed 1–40):** capetele sunt fixe, iar drumul
  de pornire e drept.
- **Fără turnuri și fără ocoluri, baza cade în valul 2 pe toate cele 40 de hărți**, la tick-ul 1210
  (60,5 s la 1×). Valul 1 ia 8 vieți, valul 2 încă 14.
- **Durata valurilor cu vieți infinite, pe seed 2026:**

  | drum | durata unui val | 15 valuri, la 1× |
  |---|---|---|
  | inițial, 19 hexagoane | 22–66 s | 10,7 min |
  | lungit la maxim (21 de ocoluri lacome, 75 de hexagoane) | 73–222 s | 36,5 min |

  Ținta din GDD §4 e 20–30 de minute pe partidă, deci plaja măsurată o cuprinde. Cât din timpul ăsta e
  „mort” (inamici care doar merg) se poate judeca abia cu turnuri.

**Propuneri ale mele, nedecise:**
- toate cifrele din `enemies.ts` și `joc.ts` (viață, viteze, compoziția valurilor, 20 de vieți, 20 de
  tick-uri pe secundă) — scrise de mână, de echilibrat după ce există turnuri;
- Z nu dă înapoi un val jucat, ci doar ocolurile din pregătirea curentă;
- bossul e deocamdată doar un inamic mare și lent: 2000 de viață, ia 10 vieți. Mecanica lui vine cu felia
  draftului.

**Întrebări pentru owner:**
- **GDD-ul se contrazice despre boss:**
  - §4 spune „boss la valurile 5, 10 și 15”;
  - §10 spune „boss la valurile 5 și 10”.

  Am implementat 5, 10 și 15, după §4.
- **Ocolurile sunt acum nelimitate între valuri.** GDD §5 spune „la fiecare val aplici o bucată aleasă din
  trei”; limita vine cu draftul (felia 7). Fără limită, drumul poate fi lungit de la 19 la 75 de hexagoane
  înainte de primul val. Dacă vrei limita mai devreme, e ieftin de adus.

**Rămâne:** felia 2 — turnurile de bază și țintirea. Restul listei din intrarea anterioară rămâne
neschimbat.
