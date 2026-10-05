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

---

## 04.10.2026 — Felia 2: turnurile de bază și țintirea

**Cerut de owner:** „continua” — felia următoare din listă. Cele două întrebări de la felia 1 (bossul,
limita de ocoluri) n-au primit încă răspuns; am păstrat ce era: boss la 5, 10 și 15, ocoluri nelimitate.

**Făcut:**
- `src/data/towers.ts`:
  - 4 turnuri, fiecare cu un rol venit doar din cifre (stările lor vin în felia 3):

    | turn | aur | daună | rază | lovește la | rol |
    |---|---|---|---|---|---|
    | Fizic | 55 | 40 | 2 | 1,5 s | lovitură grea, trece de armură |
    | Foc | 60 | 9 | 2 | 0,25 s | lovituri dese, slab contra armurii |
    | Frig | 55 | 12 | 1 | 0,4 s | toți inamicii de lângă el (zonă) |
    | Fulger | 70 | 36 | 3 | 1,2 s | bătaie lungă |

  - 4 moduri de țintire: primul, ultimul, cel mai puternic, cel mai slab;
  - `AUR_START` = 120.
- `src/data/enemies.ts`: `armura` (blindat 8, boss 5, restul 0) și `aur` la ucidere (2–12; bossul 100).
- `src/data/terrain.ts`: `permiteTurn` (pe apă nu se construiește).
- `src/sim/game.ts`:
  - decizii noi:
    - `turn`: doar în pregătire, costă aur;
    - `tintire`: și în timpul valului, cu tick-ul ei în jurnal;
  - `checkBuild` întoarce motivul refuzului; aceeași funcție alimentează previzualizarea;
  - ordinea unui tick: mers → apariții → turnurile lovesc, în ordinea id-urilor (un inamic ucis nu mai
    e țintă) → cei uciși lasă aur → sfârșitul valului;
  - armura scade din fiecare lovitură, dar trece mereu cel puțin 1;
  - turnurile încep fiecare val încărcate;
  - raza = distanța pe grilă până la hexagonul de drum pe care stă inamicul;
  - egalitățile la țintire se rup după progres, apoi după id.
- `src/sim/path.ts`: drumul nu trece prin turnuri (parametrul `blocked`), cu motiv în refuz.
- `src/render/canvas.ts`:
  - turnurile, câte o formă pe tip;
  - raza la hover;
  - fantoma turnului, cu X când nu se poate construi;
  - loviturile: o linie, sau un inel la turnul de zonă;
  - bara de viață.
- `src/main.ts`:
  - mouse-ul face ce trebuie după ce e sub el: drum = ocol, hexagon liber = turn, turn = schimbă ținta;
  - 4–7 aleg turnul;
  - Z anulează orice decizie din pregătirea curentă;
  - `window.wg.state` doar în `npm run dev`. Am verificat că lipsește din build.
- 11 teste noi, 59 în total:
  - construcția și refuzurile, fiecare cu motivul exact;
  - drumul care nu trece prin turnuri;
  - regula fiecărui mod de țintire și ruperea egalităților;
  - raza egală cu distanța pe grilă;
  - schimbarea țintei în timpul valului, reprodusă de replay;
  - armura;
  - cadența exactă a loviturilor;
  - aurul egal cu recompensa celor uciși;
  - turnul de zonă, cu mai multe ținte deodată;
  - turnurile țin baza mai mult, iar partida iese identic de două ori.
- Verificat în browser (Chromium headless), fără erori în consolă:
  - fantoma și raza;
  - refuzul pe apă;
  - schimbarea țintei și anularea ei cu Z;
  - valul 1 curățat (20/20 vieți, aurul 10 + 8 × 6 = 58);
  - trei valuri jucate din clicuri, cu ocoluri și turnuri.

**Măsurat — și a schimbat cifrele.**

Botul folosit: pune turnuri pe hexagonul liber care acoperă cel mai mult drum, cheltuiește tot aurul,
alternează tipurile (sau folosește unul singur). Când are voie la ocoluri, ia primul +3 găsit de la
mijlocul drumului spre capete. 20 de hărți (seed 1–20).

- **Prima trecere avea o strategie dominantă:** Fizic singur câștiga pe toate cele 20 de hărți **fără
  niciun ocol**, iar Fulger singur cădea în valul 2 (Frig singur, la fel, pe 18 din 20). Am scumpit și
  încetinit Fizicul și am întărit Fulgerul și Frigul (cifrele din tabelul de mai sus). Rezultatul, cu
  cifrele finale:

  | strategie | fără ocoluri | 1 ocol pe val | ocoluri nelimitate |
  |---|---|---|---|
  | doar Fizic | cade în valul 3–4 | câștigă 20/20 (6–20 vieți) | câștigă 20/20 (20 vieți) |
  | doar Foc | cade în valul 4 | cade în valul 5–9 | — |
  | doar Frig | cade în valul 7–10 | cade în valul 10 (bossul) | — |
  | doar Fulger | cade în valul 3 | câștigă 20/20 (9–17 vieți) | — |
  | Frig + Fulger | — | câștigă 20/20 (15–20 vieți) | — |
  | toate, pe rând | cade în valul 4–5 | câștigă 19/20 (9–20 vieți) | câștigă 20/20 (20 vieți) |

- **Ce spune tabelul:**
  - **fără ocoluri nu se câștigă** cu nicio strategie: drumul e jumătate din apărare, cum cere pilonul 1;
  - **cu ocoluri nelimitate, totul câștigă fără să piardă o viață.** E încă un argument pentru limita de
    ocoluri;
  - **cu un ocol pe val, Fizic și Fulger câștigă și singure.** Contracarările (stări, valuri cu trăsături)
    vin din felia 3.
- **Echilibrul e pe muchie de cuțit:**
  - viață ×1,3 pe toate valurile → majoritatea partidelor cad la bossul din valul 5, chiar cu toate
    turnurile și cu un ocol pe val;
  - aurul vine doar din inamici uciși, deci o scăpare devreme se rostogolește;
  - bossul din valul 5 e un zid.
- **Durata, cu un ocol pe val:** 8–12 minute la 1×; cu ocoluri nelimitate, 9–25 de minute. Ținta din GDD
  §4 e 20–30 de minute, deci valurile sunt prea scurte. Se reglează din compoziția valurilor, după draft și
  economie.

**Propuneri ale mele, nedecise:**
- toate cifrele de mai sus;
- armura ca valoare fixă scăzută din fiecare lovitură, cu minimum 1;
- turnurile se construiesc doar între valuri; ținta se schimbă oricând;
- drumul nu trece prin turnuri: un turn pus devreme îți blochează ocolurile de mai târziu;
- pe filon se poate construi;
- se pornește cu 120 de aur; turnurile încep fiecare val încărcate.

**Întrebări pentru owner:**
- Rămân cele două de la felia 1 (bossul la 5, 10 și 15 sau la 5 și 10; limita de ocoluri). Măsurătoarea de
  acum le face mai urgente:
  - fără limită de ocoluri, jocul nu se poate pierde cu turnuri puse cu cap;
  - bossul din valul 5 decide singur majoritatea partidelor.
- E bine ca drumul să nu poată trece prin turnuri? Alternativa: ocolul mută sau dărâmă turnul.

**Rămâne:** felia 3 — stările și reacțiile (pe etichete), plus terenul în reacții, inclusiv dealul cu
rază mai mare (GDD §5). Balansul serios vine după draft și economie.

---

## 05.10.2026 — Deciziile owner-ului: un ocol pe val, turnul nu blochează, bossul la 5, 10 și 15

**Decis de owner** (răspunsuri la întrebările din feliile 1 și 2):
- „1 ocol pe val, cu posibilitatea de upgrade mai târziu”;
- „Bossul vine la valurile 5, 10 și 15” — e așa din felia 1; am corectat contradicția din GDD §10;
- „turnul nu blochează”.

**Făcut:**
- **Un ocol pe val:**
  - `INSERARE.peVal` = 1, dar limita stă în stare (`GameState.ocoluriPeVal`): acolo o vor crește
    upgrade-urile de mai târziu;
  - `ocoluriFolosite` se golește când pornește valul;
  - `checkDetourAllowed` dă motivul refuzului („ocolul acestui val e deja pus — următorul vine după val”),
    același în simulare și în UI;
  - Z redă dreptul la ocol, prin replay.
- **Turnul nu blochează:**
  - `path.ts` revine la forma din felia 1 (fără hexagoane blocate);
  - ce se întâmplă cu turnul din cale n-a fost decis. Propunerea mea: ocolul îl ridică și dă aurul înapoi
    (`RAMBURSARE_OCOL` = 1). Alternativa din întrebarea pusă era mutarea lui;
  - previzualizarea pune un X pe turnurile care s-ar ridica și scrie cât aur se întoarce.
- `docs/GDD.md` (§5, §10, §14) și `CLAUDE.md`, cu deciziile.
- Teste: 65.
  - Noi: 4 pentru limită (al doilea ocol refuzat, dreptul revine după val, Z îl redă, limita din stare
    poate fi crescută și rămâne după val). Testul cu blocarea a devenit testul ridicării cu aur înapoi.
    Plus două, după recenzie (vezi mai jos): un ocol peste mai multe turnuri de tipuri diferite, și amprenta
    care deosebește stările după o ridicare.
  - Jocul aleator din `game.test.ts` joacă acum **partide întregi**: un ocol pe pregătire, turnuri care
    acoperă drumul, o schimbare de țintă la un tick oarecare în fiecare val. Replay-ul trebuie să iasă
    identic, cu toate cele patru tipuri de decizii, iar măcar un ocol trebuie să fi ridicat un turn.
  - Testul „jurnal de pe alt seed” construiește acum precis un ocol valid pe harta 11 care trece prin apă
    pe harta 12, cu mesajul exact. Vechiul test depindea de unde cădea jocul aleator: o variantă
    intermediară a jocului aleator, din timpul rescrierii, a produs un jurnal care se aplica întreg și pe
    harta 12, iar testul a picat. Cu varianta finală, vechiul test ar fi trecut din nou, dar tot din noroc.
- Verificat în browser, fără erori în consolă:
  - previzualizarea cu turnul ridicat;
  - ridicarea, cu aurul înapoi (65 → 120);
  - refuzul celui de-al doilea ocol, cu motiv;
  - Z readuce și drumul și turnul;
  - după val, dreptul la ocol revine.

**Măsurat** — botul din felia 2, pe regulile noi (un ocol pe val e impus acum de joc), 20 de hărți:

| strategie | rezultat |
|---|---|
| toate turnurile, pe rând | câștigă 20/20 (1–20 vieți) |
| doar Fizic | câștigă 20/20 (8–20 vieți) |
| doar Fulger | câștigă 20/20 (7–17 vieți) |
| Frig + Fulger | câștigă 20/20 (15–20 vieți) |
| Fizic + Foc | câștigă 17/20; 3 cad în valul 5 |
| doar Frig | cade în valul 10 |
| doar Foc | cade în valul 5–7 |
| toate, fără ocoluri | cade în valul 4–5 |

- Față de felia 2, unde drumul ocolea turnurile, rezultatele sunt aproape identice; amestecul trece de la
  19/20 la 20/20.
- **Ocolurile botului au ridicat multe turnuri:** până la 78 în 20 de partide (doar Fizic), fiindcă botul
  pune turnurile exact pe unde trece drumul. Cu aurul dat înapoi integral, un ocol e și o mutare gratuită
  de turn.
- Durata: 8–14 minute la 1×.

**Recenzie adversarială** (4 recenzori pe dimensiuni diferite, apoi câte un sceptic pe fiecare constatare):
8 constatări, 6 confirmate, toate reparate înainte de commit:
- amprenta nu includea `urmatorulTurn`: după o ridicare, două stări cu viitor diferit aveau aceeași amprentă.
  Acum intră și `urmatorulTurn`, și `urmatorulId`;
- UI: după Z, Spațiu, R sau N, previzualizarea de sub mouse dispărea, iar un clic putea pune ocolul și ridica
  turnuri nevăzute. Acum `syncHover` recalculează ce e sub mouse după orice schimbare;
- niciun test nu acoperea un ocol peste mai multe turnuri sau rambursarea pentru alt tip decât primul turn din
  listă — testul nou le acoperă;
- documentația trecea „ocolul ridică turnul” drept decizia owner-ului; e propunere;
- o justificare falsă în intrarea asta (corectată mai sus).

Am reintrodus pe rând, într-o copie, defectele găsite (plus „turnul blochează din nou” și „fără limită”):
toate cele 7 sunt prinse de teste.

**Propuneri ale mele, nedecise:**
- turnul din calea ocolului se ridică (nu se mută);
- tot aurul înapoi pentru turnul ridicat;
- ocolul nefolosit nu se păstrează pentru valul următor.

**Întrebări pentru owner:**
- Turnul din calea ocolului: se ridică, cu aurul înapoi (acum), sau se mută?
- Dacă se ridică: tot aurul (acum) sau o parte, ca ocolul să nu fie o mutare gratuită de turn?
- Ocolul nefolosit: se pierde (acum) sau se adună de la un val la altul?

**Rămâne:** felia 3 — stările și reacțiile (pe etichete), plus terenul în reacții.
