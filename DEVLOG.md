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

---

## 05.10.2026 (2) — Ocolul e obligatoriu, iar jocul refuză ocolul peste un turn

**Decis de owner** (răspunsuri la întrebările din intrarea anterioară):
1. Turnul din calea ocolului: „jocul refuză plasarea pe traseu”.
2. Rambursarea: fără răspuns. Nu mai contează: nu se ridică nimic, deci nu e nimic de rambursat.
3. Ocolul nefolosit: „ocolul se folosește obligatoriu”.

**Cum am înțeles primul răspuns:** un ocol care ar trece peste un turn e refuzat, cu motiv, cum era în felia 2.
Owner-ul răspunsese înainte „turnul nu blochează”, pe care îl aplicasem ca „ocolul trece și ridică turnul”;
răspunsul nou îl precizează, iar ridicarea cu aurul înapoi dispare. Dacă owner-ul a vrut altceva, se schimbă
ușor înapoi.

**Făcut:**
- **Turnul blochează ocolul:**
  - `path.ts` revine la forma din felia 2 (hexagoane blocate în căutarea și validarea ocolurilor);
  - `towerKeys` intră ca hexagoane blocate în `insertDetour`, `optionsAround` și `detourPossible`;
  - variantele de ocol care ar trece peste un turn nici nu mai apar în previzualizare;
  - s-au scos ridicarea, rambursarea (`RAMBURSARE_OCOL`) și X-urile din previzualizare.
- **Ocolul e obligatoriu:**
  - `checkStartWave` refuză pornirea valului cât timp ocolul pregătirii n-a fost pus: „pune întâi ocolul
    acestui val — e obligatoriu”;
  - excepția (propunere): dacă pe drum nu mai încape niciun ocol (`detourPossible`), valul pornește fără el,
    altfel partida s-ar bloca. Se poate ajunge acolo prin teren sau prin turnuri care blochează tot;
  - cu un upgrade de mai multe ocoluri, toate sunt obligatorii (propunere);
  - rândul de sus spune „valul pornește după ocol” și „ocol obligatoriu 0/1”.
- `src/sim/testkit.ts`: ajutoare pentru teste (`must`, `firstDetour`, `startWave`, `runWave`). Cu ocolul
  obligatoriu, testele care porneau valul direct pun acum întâi ocolul.
- `docs/GDD.md` (§5, §14) și `CLAUDE.md`, cu deciziile.
- Teste: 68.
  - **Noi:**
    - valul nu pornește fără ocol, cu motivul exact;
    - pe o hartă fără loc de ocol, valul pornește;
    - când turnurile blochează toate ocolurile rămase, valul pornește;
    - cu limita crescută, toate ocolurile sunt obligatorii.
  - **Testul ocolului prin turn** cere refuzul cu motiv. Refuzul nu consumă ocolul pregătirii, iar varianta
    nu mai apare.
  - **Jocul aleator** pune ocolul obligatoriu ocolind turnurile și numără de câte ori turnurile i-au luat o
    variantă; testul de replay cere ca asta să se fi întâmplat.
- **Mutații reintroduse într-o copie** — toate prinse de teste:
  - turnul nu mai blochează;
  - ocolul nu mai e obligatoriu;
  - fără ieșire când nu încape niciun ocol;
  - `detourPossible` ignoră turnurile (prins doar după testul nou cu turnurile care blochează tot);
  - fără limita de un ocol;
  - valul resetează limita crescută.
- **Verificat în browser**, fără erori în consolă:
  - Spațiu fără ocol arată refuzul cu motiv;
  - un turn lângă drum scade variantele de ocol de acolo de la 7 la 5, fără niciuna prin turn;
  - după ocol, valul pornește.

**Măsurat** — botul din felia 2, pe regulile finale, 20 de hărți. Rezultatele sunt identice cu coloana
„1 ocol pe val” din felia 2, fiindcă botul punea deja un ocol ori de câte ori se putea:

| strategie | rezultat |
|---|---|
| toate turnurile, pe rând | câștigă 19/20 (9–20 vieți); una cade în valul 5 |
| doar Fizic | câștigă 20/20 (6–20 vieți) |
| doar Fulger | câștigă 20/20 (9–17 vieți) |
| Frig + Fulger | câștigă 20/20 (15–20 vieți) |
| Fizic + Foc | câștigă 16/20; 4 cad în valul 5 |
| doar Frig | cade în valul 10 |
| doar Foc | cade în valul 5–9 |

- Pregătiri în care nu mai încăpea niciun ocol: 0–3 la 20 de partide (din circa 300 de pregătiri) — rare,
  spre final.
- Durata: 8–14 minute la 1×.

**Rămâne:** felia 3 — stările și reacțiile (pe etichete), plus terenul în reacții.

---

## 05.10.2026 (3) — Felia 3: stările și reacțiile, pe etichete, plus terenul în reacții

**Cerut de owner:** „continuă cu felia 3”.

**Făcut:**
- `src/data/reactions.ts`:
  - **Stările:**
    - arde (6 daune la 0,5 s, 3 s, trece de armură);
    - ud (3 s);
    - răcit („înghețat parțial” din GDD: −25% viteză, 2 s);
    - înghețat (oprit, 0,75 s);
    - uns cu ulei (10 s).
  - **Elementele:** impact, foc, frig, fulger, apă.
  - **Regulile, scrise pe etichete** (GDD §6):
    - explozie: foc pe inflamabil; 50 de daune în jur; unșii de alături explodează și ei, în lanț;
    - abur: foc pe ud, sau apă pe cel care arde; se sting amândouă;
    - dezgheț: foc pe rece (gheața se topește, flacăra prinde), sau frig pe cel care arde (se sting);
    - îngheț: frig pe ud; înghețat de tot în loc de răcit;
    - spargere: impact pe fragil; daună ×3; consumă gheața;
    - electrocutare: fulger pe ud; sare la cel mult 2 inamici uzi de alături, cu 35% din daună.
- `src/sim/reactions.ts`:
  - motorul (`applyContact`): întâi regulile, apoi dauna atingerii (după armură), apoi starea lăsată, dacă
    n-a fost blocată sau înlocuită;
  - stările trec cu un tick (`tickStates`);
  - viteza (`enemySpeed`): se aplică încetinirea cea mai mare, nu se adună.
- **Turnurile au element și stare:** Fizic = impact, Foc = foc (lasă arde), Frig = frig (lasă răcit),
  Fulger = fulger.
- **Terenul:**
  - apa udă inamicul o dată, când intră pe un hexagon de drum vecin cu ea. Pe hartă, hexagoanele astea au un
    contur albastru;
  - dealul dă rază +1 și cere 20 de aur în plus la construcție (propunere: „cu un cost”, ca să nu fie
    evident cel mai bun).
- **Starea partidei:** `reactii` numără reacțiile (cronică, playtest; intră în amprentă), iar `evenimente`
  păstrează reacțiile ultimului tick, doar pentru desen.
- **UI:**
  - stările pe inamici: inel pentru răcit și înghețat, puncte pentru restul;
  - numele reacției apare pe hartă și se stinge;
  - la prima reacție de un fel în partidă: anunț („Reacție nouă: Îngheț (frig pe ud) — …”) și un
    freeze-frame de 0,6 s, doar pe ecran (GDD §6);
  - descrierea turnului spune ce lasă și în ce reacții intră;
  - rândul de sus numără reacțiile partidei.
- **Teste: 86** — 17 noi pentru reacții, plus verificarea de disciplină a lui `reactions.ts` (fără ceas și
  fără aleator global).
  - Fiecare reacție, pe inamici construiți în test, inclusiv ce NU trebuie să se întâmple: vecinul uscat
    nu e electrocutat, uleiul de departe nu explodează, răcitul nu se sparge.
  - Arsura prin armură; încetinirea.
  - Apa udă exact la intrarea pe hexagon și nu se reîmprospătează cât inamicul stă pe loc.
  - Apa + frig nu țin inamicii prinși la nesfârșit.
  - Dealul.
  - Stările și reacțiile intră în amprentă.
  - Testul de replay cere ca partidele aleatoare să aibă cel puțin 3 tipuri de reacții.
- **Mutații reintroduse într-o copie** (12): toate prinse, cu o excepție echivalentă. „Încetinirile se
  adună” dă același rezultat pe datele de acum, pentru că singura încetinire parțială e răcitul. Două dintre
  ele („apa udă la fiecare tick”, „stările nu intră în amprentă”) au fost prinse abia după două teste noi.
- **Verificat în browser**, fără erori în consolă:
  - conturul albastru de lângă apă;
  - inelul frigului;
  - textul „Îngheț” pe hartă;
  - anunțul primei reacții;
  - rezumatul reacțiilor sus.

**Măsurat — și a schimbat cifrele.** Botul din feliile anterioare (ocolul obligatoriu, turnurile pe locurile
cu cea mai multă acoperire), 20 de hărți.

- **Prima trecere avea două strategii dominante:**
  - doar Frig și doar Fulger câștigau 20/20, aproape fără să piardă vieți (9.000 de înghețuri, respectiv
    33.000 de electrocutări);
  - jucătorul aleator din teste, care în felia 2 cădea la valurile 3–7, câștiga toate partidele.

  Cauza: apa e aproape peste tot lângă drum (de exemplu, 15 din 20 de hexagoane de drum pe seed 2026), deci
  aproape toți inamicii sunt uzi.
- **Am încercat 9 variante** (B–J: limita și procentul lanțului, durata înghețului și a udului, încetinirea,
  dauna Frigului, viața valurilor ×1,1/×1,25). Pârghia care a contat a fost **Frigul**: încetinirea continuă
  îi ajută pe toți ceilalți. Am ales varianta H:
  - Frig: daună 8, răcit −25%, îngheț 0,75 s;
  - electrocutare: cel mult 2 inamici în plus, cu 35% din daună;
  - udul rămâne după electrocutare, cum spune GDD-ul.

  Rezultatul:

  | strategie | felia 2 (regulile finale) | felia 3 |
  |---|---|---|
  | doar Fizic | 20/20 (6–20 vieți) | 18/20 (1–20 vieți) |
  | doar Foc | cade în valul 5–9 | 0/20, cade în valul 5–9 |
  | doar Frig | cade în valul 10 | 0/20, cade în valul 7–10 |
  | doar Fulger | 20/20 (9–17 vieți) | 20/20 (7–20 vieți) |
  | Fizic + Foc | 16/20 | 15/20 |
  | Frig + Fulger | 20/20 (15–20 vieți) | 20/20 (14–20 vieți) |
  | Frig + Fizic | — | 20/20 (10–20 vieți) |
  | toate, pe rând | 19/20 | 14/20 |

- **Ce spune tabelul:**
  - **combinațiile contează:** Frig singur pierde, dar Frig + Fulger și Frig + Fizic câștigă;
  - **Focul e slab:** apa îl stinge (abur), frigul îl anulează (dezgheț), iar reacția lui bună, explozia, n-are
    încă ulei (vezi întrebările);
  - **amestecul la întâmplare pierde mai des** (14/20): focul și frigul se anulează de 16.800 de ori.
    Plasarea contează, cum vrea designul;
  - **Fulger singur câștigă încă**, dar a câștigat și în felia 2, fără reacții. Problema e dificultatea
    generală, nu reacțiile; se reglează odată cu economia și draftul.
- Durata: 3–15 minute la 1×.

**Propuneri ale mele, nedecise:**
- toate cifrele stărilor și reacțiilor;
- arsura trece de armură (rolul focului contra blindaților);
- apa udă o dată pe hexagon, la intrare. Altfel înghețul se reface la nesfârșit;
- dealul: +1 rază pentru +20 aur;
- freeze-frame-ul de 0,6 s la prima reacție.

**Întrebări pentru owner:**
- **De unde vine uleiul?** Niciun turn de bază nu unge inamicii, deci explozia (imaginea GIF-ului din
  GDD §1) nu se poate produce încă. Variante: un turn al cincilea, o trăsătură a unor valuri (inamici care vin
  unși), terenul (smoală), o carte din draft.
- **Apa e prea des lângă drum?** Pe hărțile de acum, aproape tot drumul e lângă apă, deci reacțiile cu apă
  sunt automate, nu o alegere de plasare. Cu mai puțină apă (generatorul de hartă), porțiunile ude ar deveni
  locuri căutate, iar canalele din felia 6 ar conta.
- **Focul și frigul se anulează reciproc** (GDD: „focul anulează udul și frigul”). În joc asta înseamnă că două
  turnuri puse prost se sabotează. E dorit așa?

**Rămâne:** felia 4 — vecinătatea între turnuri.

---

## 05.10.2026 (4) — Publicare pe Firebase Hosting, la fiecare checkpoint

**Cerut de owner:** „vreau să-l publicăm în Firebase și să-i facem update acolo la fiecare checkpoint”. Proiectul
Firebase: `worldguard-910f1` (Blaze), cu o aplicație Web înregistrată.

**Făcut:**
- `firebase.json` (publică `dist/`; fișierele din `assets/` cu cache lung, `index.html` fără cache) și
  `.firebaserc` (`default` și `live` = `worldguard-910f1`).
- `.github/workflows/publicare.yml` — primul CI al repo-ului:
  - **verificare** la fiecare PR și la push pe `main`: `npm ci`, `npm run check`;
  - **previzualizare** la fiecare PR, pe canalul `pr-<număr>` (30 de zile), cu linkul comentat pe PR;
  - **live** la push pe `main` sau manual, doar de pe `main`, în mediul GitHub `live`, unde se poate cere mai
    târziu o aprobare;
  - fără secretul `FIREBASE_SERVICE_ACCOUNT`, publicarea e sărită cu un avertisment, iar verificarea rulează;
  - intrările workflow-ului trec prin `env:`, niciodată direct în `run:` (regula proiectelor lui Andrei).
- **Amprenta build-ului în colțul paginii:** commit, ramură și ora build-ului (`__BUILD__`, din `BUILD_SHA` și
  `BUILD_REF`). „Ce e publicat” se vede dintr-o privire.
- **Configurația web Firebase nu intră în cod.** Jocul nu folosește SDK-ul (nici Analytics); o adăugăm când apare
  un backend.

**Verificat:**
- build-ul de producție, servit static ca de Firebase, arată „build f5c2184 · claude/felia-3-reactii · …”, n-are
  hook-ul de dev și nici erori în consolă;
- workflow-ul se citește ca YAML valid, cu cele trei joburi și condițiile lor.

Publicarea propriu-zisă se verifică la primul run din GitHub Actions; de aici nu se poate.

**De făcut de owner** (o singură dată): secretul `FIREBASE_SERVICE_ACCOUNT` în GitHub. Cheia se generează în
Firebase → Project settings → Service accounts → Generate new private key, iar fișierul JSON nu se pune în repo.

**Notă:** PR-urile feliilor sunt stivuite (#1 → #2 → #3). Workflow-ul e în ramura feliei 3, deci previzualizările
pornesc de la PR #3 și de la feliile care vin peste el. Live-ul pleacă după ce stiva ajunge în `main`.

---

## 05.10.2026 (5) — Felia 4: grupurile de turnuri, uleiul pe hartă, interfața nouă

**Cerut de owner:**
- „continuă cu felia 4” și „vreau și un bump în UI”;
- „vreau să pot pune turnuri unul lângă altul și să creez sinergie în felul ăsta, care poate fi toggled on sau
  off”. Precizat: „turnurile conectate ori se comportă ca turnuri individuale, ori ca un turn combinat din cele
  conectate”, iar dintre variante a ales **„un singur turn”**;
- răspunsurile la întrebările din felia 3: „uleiul se găsește pe hartă, nu e prea multă apă, focul și frigul
  sunt incompatibile”.

**Decizia owner-ului înlocuiește un rând din GDD:** „reacții pe inamic + bonusuri de vecinătate; fuziunea mai
târziu” devine „reacții pe inamic + grupuri de turnuri, individual sau combinat”. Bonusurile de vecinătate
(aure, vecinătăți negative) pe care le începusem le-am scos înainte de commit, ca să nu rămână două mecanici care
se bat cap în cap. Registrul din GDD §14 le marchează pe amândouă.

**Făcut — grupurile:**
- `towerGroups`: turnurile vecine, de orice tip, legate din aproape în aproape. Grupurile nu se țin în stare, se
  calculează; în stare e doar `Tower.combinat`, cu regula „un grup are un singur mod, un turn singur e individual”.
- Decizia `combina` (`{ turn, activ }`), cu motiv la refuz:
  - un turn fără vecini nu are ce combina;
  - grupul e deja în modul cerut;
  - **Foc și Frig sunt incompatibile** — un grup cu amândouă nu se combină.
  Se poate lua și în timpul valului; combinarea ia ținta liderului (cel mai mic id) și cea mai lungă reîncărcare
  din grup, deci comutarea nu dă o lovitură gratuită.
- **Lovitura combinată** (`combinedContacts`, cifrele în `COMBINARE`):
  - o singură țintă, aleasă din reuniunea razelor turnurilor;
  - fiecare turn contribuie cu dauna pe care ar fi dat-o singur într-o reîncărcare a grupului, adică a celui mai
    lent turn;
  - +15% pentru fiecare element diferit peste primul, cel mult 3;
  - elementele lovesc pe rând: fulger → frig → impact → foc. Fulgerul sare pe inamicii uzi, frigul îngheață
    udul, impactul sparge gheața, focul la urmă aprinde uleiul.
  Exemplu: Fizic + Fulger = fulger 51 → impact 46, la 1,5 s; 64,7 daune pe secundă, față de 56,7 separat.
- **Turn nou lângă un grup combinat:** intră în grup și îi ia ținta. Dacă leagă grupul de turnuri individuale,
  sau aduce Frig lângă Foc, tot grupul unit trece pe individual. Panoul avertizează înainte de construcție.
- Ținta unui grup combinat se schimbă pentru tot grupul. Un Frig dintr-un grup combinat nu mai lovește în zonă:
  grupul are o singură țintă.

**Făcut — uleiul:**
- Teren nou, **baltă de ulei**: nu e drum, nu se construiește pe ea. Unge inamicii care intră pe un hexagon de
  drum vecin, cum îi udă apa.
- Generarea (`placeOil`, pe fluxul ei, `harta/ulei`, ca restul hărții să nu se schimbe):
  - 2 bălți de cel mult 3 hexagoane;
  - centrul la exact 2 hexagoane de drumul inițial, restul la cel puțin 2;
  - bălțile la cel puțin 5 hexagoane una de alta.
- `pathContacts` dă acum **toate** atingerile unui hexagon de drum. Unul vecin și cu apa, și cu uleiul udă și
  unge; înainte se lua doar primul teren găsit.
- **Măsurat pe 200 de hărți:**
  - fiecare are cel puțin o baltă (170 au 6 hexagoane de ulei);
  - la început, niciun hexagon de drum nu e lângă ulei;
  - pe 196 de hărți, un singur ocol poate duce drumul lângă ulei;
  - pe 199, cele două bălți sunt separate.
- Apa rămâne cum era („nu e prea multă apă”). Focul și frigul se anulează pe inamic, ca până acum
  („incompatibile”).

**Făcut — interfața (`src/ui/`):**
- Interfață HTML peste hartă:
  - bara de sus: valul, viețile cu bară, aurul, lungimea drumului, faza, plus butoane pentru pornire, pauză,
    viteză, anulare, restart și hartă nouă;
  - bara de jos: cărțile turnurilor, cu iconiță, cost și tastă, plus ocolul (+1/+2/+3 și varianta);
  - panoul din dreapta: valul următor, ce e sub mouse, codexul reacțiilor (necunoscutele ca „? ? ?”);
  - refuzurile apar ca notificări, prima reacție ca anunț, iar finalul partidei pe un ecran cu „Aceeași hartă”
    și „Hartă nouă”.
- **Tot ce se face din taste se face și din butoane.** Harta ocupă spațiul rămas între bare și panou. Sub 960 px
  panoul se ascunde și harta ia tot ecranul.
- **Turnurile:** click alege turnul; panoul rămâne pe el și după ce mouse-ul pleacă de pe hartă, cu butoanele
  „Schimbă ținta (T)” și „Combină / Separă grupul (C)”. `Esc` renunță. Un buton care nu se poate folosi apare
  dezactivat, cu motivul de la simulare.
- **Pe hartă:**
  - legături aurii și contur auriu = grup combinat; legături subțiri = grup individual;
  - raza unui grup combinat e reuniunea razelor;
  - fantoma unui turn nou arată, cu linii punctate, grupul în care ar intra;
  - conturul de pe drum e albastru lângă apă și maro-auriu lângă ulei;
  - bălțile au luciu, ca să nu se confunde cu alt teren închis.
- Panoul unui grup spune lovitura pe elemente, cadența, dauna pe secundă față de turnurile separate și bonusul.
  Pentru un grup individual arată și cum ar fi combinat. Previzualizarea „în ce grup intră” aplică decizia pe o
  copie a stării, deci regulile nu sunt dublate în UI.

**Făcut — CI:** acțiunile GitHub sunt pe versiunile care rulează pe Node 24 (checkout v7, setup-node v7,
upload-artifact v7, download-artifact v8). Am verificat `runs.using` în `action.yml`-ul fiecărei versiuni, iar
notele de versiune n-au nimic care să atingă workflow-ul nostru (`pull_request`, fără `pull_request_target`).
Rezultatul se vede la primul run al PR-ului.

**Teste: 104** (de la 86):
- `groups.test.ts`, 15 teste: grupurile, comutarea și jurnalul, refuzurile, Foc + Frig, turnul nou lângă un grup
  combinat (intră / punte / incompatibil), cifrele loviturii, o singură țintă, reuniunea razelor, cadența celui mai
  lent chiar când liderul e mai rapid, Frig fără zonă, comutarea în val fără lovitură gratuită, amprenta;
- uleiul: generarea pe 200 de hărți, apa și uleiul pe același hexagon (în listă și în simulare), explozia
  produsă de uleiul de pe hartă;
- partidele aleatoare din testul de replay fac acum și grupuri, și comutări în pregătire și în val. Testul cere să
  fi fost combinat măcar un grup și verifică regula grupurilor la final.

**Mutații reintroduse într-o copie (23):** toate prinse. Patru au trecut la prima rundă și au cerut teste noi:
- reîncărcarea liderului în loc de a celui mai lent;
- grupul combinat dacă un singur turn e combinat (echivalentă cât timp regula grupurilor ține; acum o prinde un
  test direct);
- doar prima atingere de teren;
- bălțile fără distanță între ele.

**Măsurat — botul**, 20 de hărți (cu bălțile de ulei), ocolul obligatoriu, turnurile pe rând. Câștiguri din 20:

| strategie | răsfirat (ca în felia 3) | lipite, individual | lipite, combinat | ocol spre ulei, răsfirat | ocol spre ulei, lipite, combinat |
|---|---|---|---|---|---|
| doar Fizic | 17 | 18 | 8 | — | — |
| doar Foc | 7 | 6 | **20** | **19** | 19 |
| doar Frig | 0 | 0 | 7 | — | — |
| doar Fulger | 20 | 20 | 20 | — | — |
| Fizic + Foc | 16 | 16 | 12 | 10 | 9 |
| Frig + Fulger | 20 | 20 | 20 | — | — |
| Frig + Fizic | 20 | 20 | 14 | — | — |
| Fizic + Fulger | 17 | 16 | 16 | — | — |
| toate, pe rând | 14 | 13 | 13 | 13 | 10 |

- **Combinarea e o alegere, nu un upgrade:**
  - ajută turnurile cu lovituri multe și mici, fiindcă o lovitură mare trece de armură. Foc combinat: 9 × n
    daune, minus armura o singură dată;
  - strică turnurile grele: Fizic combinat irosește dauna pe inamici mici și pierde țintele multiple;
  - Frig combinat își pierde zona, dar câștigă lovituri mari (de la 0/20 la 7/20).
- **Uleiul îi dă Focului rolul** care-i lipsea în felia 3: cu un ocol spre baltă, Foc singur trece de la 7/20 la
  19/20, cu 6.257 de explozii în 20 de partide.
- Botul care caută uleiul alege ocolul după ulei, nu după lungime, deci strategiile care nu folosesc uleiul
  pierd drum (Fizic + Foc: 10/20).
- În „toate, pe rând”, doar 7 din 54 de grupuri s-au putut combina: celelalte aveau Foc și Frig.
- **De urmărit:** Foc combinat câștigă 20/20, cum câștigă și Fulger singur din felia 2. Problema e tot dificultatea
  generală (vezi felia 3). Dacă o luăm înaintea ei, pârghia e armura: s-ar scădea pentru fiecare turn din grup,
  nu o dată pe lovitură.

**Verificat în browser** (seed 2026, fără erori în consolă):
- ocolul spre baltă și conturul maro-auriu de pe drumul uns;
- Foc + Fizic lipite: fantoma arată „2 turnuri, trag individual”;
- click pe Foc, apoi butonul „Combină grupul” din panou: legăturile și conturul devin aurii, iar panoul arată
  „fizic 46 → foc 62, 72,0 pe secundă (separat 62,7), +15%”;
- Frig lângă grup: „Foc și Frig sunt incompatibile: grupul combinat de lângă trece pe individual” (și când aurul
  nu ajunge);
- valul: ambele turnuri ale grupului lovesc aceeași țintă (citit din stare), iar uleiul dă o explozie. Linia
  loviturii nu s-a văzut: un inamic din valul 1 moare dintr-o lovitură combinată (108 daune la 100 de viață), iar
  desenul trage linii doar spre inamicii vii, ca până acum. De îmbunătățit la desen, nu la reguli;
- la 900 px lățime, panoul dispare și harta ocupă tot.

**Propuneri ale mele, nedecise:**
- cifrele combinării: +15% pe element, plafonul de 3, suma daunelor la cadența celui mai lent;
- ordinea elementelor într-o lovitură combinată;
- un Frig combinat își pierde zona;
- turnul nou care leagă grupul de turnuri individuale (sau aduce Frig lângă Foc) lasă grupul unit pe individual;
- „incompatibile” înseamnă și „nu se combină în același grup”;
- bălțile: câte, cât de mari, cât de departe de drum.

**Întrebări pentru owner:**
1. **Combinarea trece de armură:** o lovitură mare în loc de multe mici. Ăsta e rolul pe care îl vrei pentru
   grupul combinat (contra blindaților și a bossului)? Sau armura se scade pentru fiecare turn din grup?
2. **„Focul și frigul sunt incompatibile”**: am aplicat-o și la grupuri — un grup cu amândouă nu se combină.
   Corect?
3. **Ce urmează:** draftul și bossul (GDD §10), sau economia (dobânda și pământul)?

---

## 05.10.2026 (6) — Răspunsurile owner-ului la felia 4: armura la lovitura combinată

**Răspunsuri:**
1. La „combinarea trece de armură, e dorit?”: **„unele combinații cresc armor piercing sau fac bypass”**. Deci
   combinarea singură nu trece de armură; anumite combinații o străpung sau o ignoră.
2. „Un grup cu Foc și Frig nu se combină”: **da**. E decis acum, nu mai e propunere.
3. „Ce urmează: draftul și bossul, sau economia?”: „da”. Întrebarea era „sau-sau”, deci încă nu știu care
   urmează. Am întrebat din nou.

**Făcut:**
- `Contact` are două câmpuri noi:
  - `lovituri`: de câte ori se scade armura;
  - `penetrare`: câtă armură nu contează (`Infinity` = deloc).
  `damageAfterArmor` scade armura o dată pe lovitură, cu minimum 1 pe lovitură.
- O atingere combinată poartă loviturile pe care le-ar fi dat turnurile ei separat într-o reîncărcare a grupului,
  rotunjite la cel mai apropiat întreg (Fulger 30/24 → 1, Frig 30/8 → 4, Foc 30/5 → 6). Dauna din reacții
  (explozia, lanțul electrocutării) rămâne o lovitură separată.
- `COMBINARE.armura`, propunere: **Fizic + Foc = „Fier încins”**, ignoră armura; **Fizic + Frig = „Metal fragil”**,
  străpunge 5. Pe elemente, nu pe tipuri, ca regulile reacțiilor. Mai multe combinații se adună, iar ignorarea
  câștigă.
- Panoul unui grup are rândul „Armura”: combinația care se aplică sau „se scade la fiecare lovitură (de n ori)”.
  Ajutorul listează combinațiile.

**Teste: 107** (3 noi, plus datele combinațiilor de armură):
- armura pe lovituri și străpungerea, unitar;
- doi Foc combinați fac unui blindat cât doi Foc separați (2 daune);
- Fier încins: 108 daune unui blindat, față de 52 fără ea;
- Metal fragil: 65, față de 42.

Șapte mutații pe codul nou, toate prinse.

**Măsurat — botul, strategiile combinate**, aceleași 20 de hărți. Câștiguri din 20:

| strategie (lipite, combinat) | înainte (combinarea trecea de armură) | acum |
|---|---|---|
| doar Foc | 20 | **10** |
| doar Frig | 7 | **0** |
| doar Fizic | 8 | 8 |
| doar Fulger | 20 | 20 |
| Fizic + Foc (Fier încins) | 12 | 12 |
| Frig + Fizic (Metal fragil) | 14 | 14 |
| Frig + Fulger | 20 | 20 |
| Fizic + Fulger | 16 | 16 |
| doar Foc, cu ocol spre ulei | 19 | 19 |

- Focul combinat nu mai câștigă orice: rămâne mai bun decât Focul individual (10 față de 6), dar armura
  blindaților îl oprește.
- Combinațiile de armură țin la nivel cele două amestecuri, Fizic + Foc și Fizic + Frig.
- Uleiul rămâne drumul Focului: 19/20 cu un ocol spre baltă.

**Verificat în browser** (fără erori în consolă):
- grupul Foc + Fizic arată „Armura: Fier încins: ignoră armura”, înainte și după combinare;
- ajutorul listează cele două combinații.

**Propuneri ale mele, nedecise:** care combinații și cu cât (Fier încins, Metal fragil); rotunjirea loviturilor
la cel mai apropiat întreg.

**Întrebare pentru owner:** ce urmează, **draftul și bossul** (GDD §10) sau **economia** (dobânda și pământul)?

---

## 05.10.2026 (7) — Felia 5: draftul 1 din 3 și bossul cu trăsături

**Cerut de owner:** la „ce urmează?”, a ales **draftul și bossul**.

**Făcut — draftul** (GDD §4: „val → recompense → alegi 1 din 3 cărți → modelezi harta → val”):
- **Cărțile, ca date** (`src/data/draft.ts`): 15, de patru feluri, ca în GDD. Tot ce e mai jos e propunerea mea:
  - **turn gratuit**, câte unul pe tip: următorul turn de tipul ăla nu costă nimic, nici pe deal;
  - **îmbunătățiri**, două pe tip: +25% daună, sau trage cu 20% mai des. Se adună de la o carte la alta. „Mai des” e
    cadența × 1,2, deci reîncărcarea × 100/120: cinci cărți dublează cadența, n-o duc la zero;
  - **relicve**, o dată pe partidă: **Cartograful** dă +1 ocol în fiecare pregătire. E upgrade-ul de ocoluri decis
    pe 05.10, iar toate ocolurile rămân obligatorii. **Bastionul** dă +5 vieți;
  - **traseu**: „Ocol în plus”, un ocol în plus doar în pregătirea aceea.
- **Oferta** se face când se încheie un val. Are 3 cărți diferite, pe fluxul ei (`draft/<val>`), deci un replay o
  reface identic. **2 sunt din stilul tău** (tipurile pe care le ai, relicvele, traseul) și **1 din afara lui** (GDD §6).
  Relicvele luate nu mai apar.
- **Decizia `alege`**, cu motiv la refuz. **Valul nu pornește până nu alegi.** Alegerea se poate anula cu Z, ca
  orice decizie din pregătire.
- Starea nouă (`oferta`, `carti`, `gratuite`, `imbunatatiri`, `ocoluriBonus`) intră în amprentă.

**Făcut — bossul:**
- **Trăsături** pe grupurile din valuri (`TRAITS`), care îl fac pe inamic imun la stări. Imunitatea e în motorul
  reacțiilor: o stare oprită nu mai pornește nici reacțiile ei. E ideea din GDD §6, „valuri cu trăsături care
  contracarează anumite etichete”. Propunerea:
  - **uscat** (bossul valului 5): nu se udă, deci nici îngheț, nici electrocutare;
  - **neclintit** (bossul valului 10): frigul nu-l încetinește și nu-l îngheață;
  - **ignifug** (unul din cei doi bossi ai valului 15, celălalt fiind uscat și neclintit): nu ia foc și nu se unge.
- Trăsăturile apar în previzualizarea valului (cu ce înseamnă) și deasupra bossului pe hartă.

**Interfața:**
- Banda draftului apare sub bara de sus, cu 3 cărți. Fiecare carte are felul ei (cele din afara stilului au chenar
  punctat), nume, efect și tasta (8 / 9 / 0); se alege și cu click. Harta își face loc sub bandă.
- Butonul de pornire arată motivul („alege întâi o carte din draft”).
- Cartea de turn gratuit arată „gratuit” în locul prețului. Turnurile îmbunătățite arată „40 → 50 (cărți)”.
- Panoul are secțiunea „Cărțile tale”.

**Teste: 123** (de la 107):
- `draft.test.ts`, 10 teste:
  - **oferta:** nu există la început; după un val are 3 cărți diferite; după ultimul val, nimic. E deterministă și
    are mereu exact o carte din afara stilului. Relicvele luate nu mai apar. Datele cărților sunt verificate;
  - **alegerea:** valul nu pornește fără ea; refuzurile au motiv; cartea intră în jurnal;
  - **efectele:** turnul gratuit (și pe deal; prețul revine după), îmbunătățirile care se adună (și într-un grup
    combinat, și în val, inclusiv reîncărcarea după lovitură), Cartograful, Ocol în plus, Bastionul;
  - **amprenta:** include starea nouă.
- `boss.test.ts`, 5 teste:
  - trăsăturile bossilor din fiecare val;
  - uscat (fără ud, deci fără îngheț și fără electrocutare), neclintit (viteza nu scade), ignifug (fără arsură și fără
    explozie);
  - bossul apare în val cu trăsăturile lui, care intră în amprentă.
- Partidele aleatoare din testul de replay aleg acum și cărți. Testul cere să apară decizia `alege` și să iasă
  identic la replay.
- `waves.test.ts`: viața crește cu valul după formulă, nu scade niciodată de la un val la altul, iar inamicii apar
  cu viața asta.

**Mutații reintroduse într-o copie (18):** toate prinse. Două au trecut la prima rundă și au cerut un test mai strict:
reîncărcarea îmbunătățită ignorată după lovitură, și grupul combinat care ignoră îmbunătățirile.

**Măsurat — botul, și a schimbat cifrele.** 20 de hărți, ocolul obligatoriu, turnurile pe rând, iar după fiecare
val o carte. Botul alege cărțile în două feluri:
- **bine**: întâi îmbunătățiri pentru tipurile lui, apoi turnurile lui gratuite, apoi relicve, apoi traseul;
- **la întâmplare**.

- **Pe valurile de dinainte, draftul făcea jocul prea ușor.** Cu cărți alese bine, aproape orice strategie câștiga
  20/20, chiar și doar Frig, care fără draft pierdea tot. Cu cărți la întâmplare, la fel. La dificultatea aceea nici
  trăsăturile bossului nu schimbau nimic.
- **Variante încercate:**
  - viața valurilor × (1 + k·i), cu k = 0,1 / 0,15 / 0,2;
  - Fulger cu daună 30 sau cu reîncărcare 30.
- **Alese (propunere):**
  - **`CRESTERE_VIATA` = 20% pe val**, peste multiplicatorul fiecărui val. Ultimul boss are 19.760 de vieți;
  - **Fulger cu 30 de daune în loc de 36.** La 36, Fulger singur câștiga 20/20 chiar cu cărți la întâmplare.

**Rezultatul, pe datele din commit.** Câștiguri din 20:

| strategie (răsfirat) | cărți alese bine | cărți la întâmplare | felia 4, fără draft |
|---|---|---|---|
| doar Fizic | 20 | 13 | 17 |
| doar Foc | 18 | 7 | 7 |
| doar Frig | 7 | 0 | 0 |
| doar Fulger | 19 | 11 | 20 |
| Fizic + Foc | 16 | 7 | 16 |
| Frig + Fulger | 20 | 6 | 20 |
| Frig + Fizic | 20 | 7 | 20 |
| Fizic + Fulger | 13 | 3 | 17 |
| toate, pe rând | 5 | 5 | 14 |

- **Alegerea din draft contează.** Aceeași strategie, cu cărți bune față de cărți la întâmplare: Frig + Fizic
  20 față de 7, Frig + Fulger 20 față de 6, Fizic + Foc 16 față de 7.
- **Un singur tip cu toate cărțile pe el e un „build” puternic:** Fizic 20/20, Fulger 19/20. Împrăștierea pe toate
  patru tipurile pierde (5/20), mai ales că Foc și Frig se anulează.
- **Trăsăturile bossului contracarează strategiile cu frig.** Măsurat la valuri +20%, cu Fulger la 36, cu și fără
  trăsături:
  - Frig singur câștigă 7/20 cu trăsături și 18/20 fără;
  - viețile pierdute la valurile cu boss, cu trăsături față de fără: Frig + Fulger 30 față de 10, Frig + Fizic 90 față
    de 60;
  - Fizic și Fulger nu sunt afectate, cum trebuie: trăsăturile țintesc stările.
- **Grupuri combinate** (cărți bune): Foc 20, Fizic 18, Frig + Fizic 18, Frig + Fulger 17, Fizic + Foc 16, Frig 2.
  **Cu un ocol spre ulei:** Foc singur câștigă 19/20.
- **Durata, la 1×:** mediana e 10–11 minute, maximul 18–23. Înainte era 5–10 minute. Ținta din GDD e 20–30.

**Verificat în browser**, pe datele finale, jucând până la valul 6 (fără erori în consolă):
- banda draftului după fiecare val, cu cartea din afara stilului marcată; alegerea cu click;
- Cartograful dă 2 ocoluri pe pregătire, iar Ocol în plus încă unul;
- valul 5 arată în previzualizare „Boss · Uscat — nu poate fi udat…” și „viață ×2,16”; bossul are eticheta
  deasupra, pe hartă;
- panoul arată „Cărțile tale”, cu numărul de exemplare.

Testul de replay cu partide întregi are acum o limită de 30 s. Cât timp botul rula în paralel, a depășit o dată
limita implicită de 5 s; singur trece în aproximativ 2,4 s.

**Propuneri ale mele, nedecise:**
- cărțile și cifrele lor;
- oferta de 2 cărți din stil + 1 din afară;
- alegerea obligatorie înainte de val;
- trăsăturile bossilor și ce val primește ce;
- creșterea vieții cu 20% pe val;
- Fulger la 30 de daune.

**Întrebări pentru owner:**
1. **Un singur tip, cu toate cărțile pe el, câștigă** (Fizic 20/20). E un „build” bun de roguelite, sau vrei ca
   aceeași îmbunătățire luată de mai multe ori să dea tot mai puțin?
2. **Partidele durează încă puțin:** mediana e 10–11 minute la 1×, ținta e 20–30. Variante: mai multe valuri, valuri
   mai lungi, sau inamici mai lenți.
3. **Felia următoare e economia** (dobânda la aur, pământul, filonul)?

---

## 05.10.2026 (8) — Răspunsurile owner-ului la felia 5: build-ul pe un tip rămâne, mai multe valuri

**Răspunsuri:**
1. „Un singur tip, cu toate cărțile pe el, câștigă — e un build bun?”: **„build bun”**. Rămâne cum e.
2. „Partidele durează puțin: cum le lungim?”: **„mai multe valuri”**.
3. „Felia următoare e economia?”: **„da”**.

**Făcut:**
- **25 de valuri în loc de 15.** Valurile 16–25 sunt scrise de mână, după tiparul primelor 15: mai mulți inamici,
  multiplicatorul vieții de la 2,75 la 4,1.
- **Boss la fiecare al cincilea val.** La 5, 10 și 15 e decizia owner-ului; la 20 și 25 e propunerea mea:
  - valul 20: un boss ignifug și neclintit;
  - valul 25: trei bossi, unul uscat, unul neclintit, unul ignifug.
- **De la valul 16, trăsături și pe grupurile obișnuite** (propunere), ca o singură combinație să nu țină până la
  capăt: rapizi neclintiți (val 18), roi uscat (val 21), normali ignifugi (val 23).

**Măsurat — botul, cu 25 de valuri.** Am încercat creșterea vieții de 20%, 12% și 6% pe val. Am păstrat 20%:
proporțiile de câștig rămân cele din felia 5, iar durata ajunge în țintă.

| strategie | cărți alese bine | cărți la întâmplare |
|---|---|---|
| doar Fizic | 20 | 11 |
| doar Foc | 18 | 5 |
| doar Frig | 7 | 0 |
| doar Fulger | 19 | 11 |
| Fizic + Foc | 15 | 2 |
| Frig + Fulger | 20 | 4 |
| Frig + Fizic | 19 | 3 |
| Fizic + Fulger | 13 | 2 |
| toate, pe rând | 4 | 2 |

- **Durata partidelor câștigate**, în timp de joc la 1×: 12–29 de minute, mediana 19 (cu cărți alese bine). Cu
  cărți la întâmplare: 20–41 de minute, mediana 28. Înainte, cu 15 valuri, mediana era 10–11 minute.
- **Timpul de pregătire nu e inclus:** simularea stă pe loc cât construiești și alegi. Cu o jumătate de minut de
  pregătire pe val, o partidă reală ajunge la 30 de minute sau peste. Ținta din GDD e 20–30.
- **Unde se pierde, cu cărți bune:** mai ales la valurile cu boss (10 pierderi la valul 10, 4 la 15) și la început
  (valurile 3–5). Cu cărți la întâmplare se pierde și la ultimul val, cel cu trei bossi (12 pierderi).
- Cu 12% sau 6% pe val, aproape orice câștigă din nou (doar Frig: 18/20, respectiv 19/20).

**Teste: 123**, aceleași, actualizate: 25 de valuri, boss la 5, 10, 15, 20 și 25.
