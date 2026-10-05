# CLAUDE.md — World Guard

Faptele stabile și regulile proiectului. Se încarcă la fiecare sesiune.

## Ce e
**World Guard** (nume de lucru; jucătorii sunt **Guardians**) — un tower defense roguelite pe hexagoane,
în care modelezi pământul unor planete vii, iar ele țin minte ce le-ai făcut. Țintă: joc comercial
pe Steam; acum, **prototip în browser, pentru desktop** (decis 05.10.2026: telefonul nu se optimizează).

- Designul complet: [`docs/GDD.md`](docs/GDD.md), inclusiv registrul deciziilor (§14).
- Tabla de design (FigJam): https://www.figma.com/board/OKHd5kH7tHWGhDcRH7GQP5
- Istoria lucrului: [`DEVLOG.md`](DEVLOG.md).

## Comenzi
```bash
npm run dev        # Vite, http://localhost:5180
npm run check      # typecheck + teste + build — ASTA e poarta înainte de commit
npm test           # Vitest
npm run build
```

## Publicare (Firebase Hosting, proiectul `worldguard-910f1`)
- **Nu se publică de mână.** `.github/workflows/publicare.yml`:
  - la fiecare PR: `npm run check`, apoi o **previzualizare** pe canalul `pr-<număr>` (ține 30 de zile); linkul
    apare ca un comentariu pe PR — fiecare felie e un checkpoint jucabil;
  - la push pe `main` (unirea unui PR): aceeași verificare, apoi **live**; manual, tot doar de pe `main`.
- Cere secretul `FIREBASE_SERVICE_ACCOUNT` în GitHub (cheia JSON a unui cont de serviciu). Fără el, verificarea
  rulează și publicarea e sărită cu un avertisment.
- Jocul afișează în colț ce build rulează (`__BUILD__`: commit, ramură, oră), pus de Vite din `BUILD_SHA` /
  `BUILD_REF`. Configurația web Firebase (`apiKey` etc.) **nu** e în cod: jocul nu folosește încă SDK-ul.
- Regula comună a proiectelor lui Andrei (test + live, publicarea live doar de owner, cu confirmare și jurnal)
  se aplică din clipa în care apare un backend. Până atunci: previzualizările țin loc de „test”, iar live-ul
  pleacă doar din `main`, adică doar după ce owner-ul unește un PR.

## Arhitectura
- `src/sim/` — **nucleul de joc, determinist, fără DOM.** Hartă, traseu, decizii, valuri și inamici,
  turnuri și țintire, stări și reacții (`reactions.ts`). Tot ce contează pentru reguli stă aici.
  `testkit.ts` are ajutoarele testelor (`must`, `firstDetour`, `startWave`, `runWave`).
- `src/data/` — cifrele și regulile de conținut (teren, ocoluri, inamici și valuri, turnuri, stări și reacții,
  constantele partidei).
  **Un număr de gameplay scris direct în cod e o greșeală**: îl muți în `src/data/`.
- `src/render/` — desenarea hărții pe Canvas 2D. Citește starea, nu o modifică.
  - `canvas.ts`: straturile, de jos în sus — teren, drum, fantome, grupuri, turnuri, inamici, lovituri, efecte.
  - `terrain.ts`: fundalul și plăcile, desenate o dată într-un canvas ascuns, ținut pe hartă (`WeakMap`) și pe
    aranjament. Terraformarea face o hartă nouă, deci cache-ul se reface singur. Decorul vine dintr-un hash al
    hexagonului, nu din aleator.
  - `fx.ts`: particule, fulgere, scuturarea ecranului. `main.ts` (`stepEffects`) le pornește din diferența dintre
    două stări: reacțiile, morțile, scăpările la bază, loviturile. Aici `Math.random` e voie: e doar desen, iar
    simularea nu-l vede.
  - **Nu crea gradienți la fiecare cadru** (`createRadialGradient` per inamic și fundalul pe tot ecranul triplau
    costul desenului, DEVLOG felia 7): desenează forma în coordonate locale și refolosește gradientul din
    `gradient(ctx, cheie, …)`.
- `src/sim/lume.ts` — lumea care ține minte (GDD §9.1): planeta, regiunile, accesul, terenul care rămâne și evoluează
  după ceasul lumii, salvarea (verificată la citire). Determinist, sub aceleași reguli ca nucleul. Se salvează DOAR
  planeta (seed + versiunea generatorului) și jurnalul editărilor fiecărei regiuni; terenul de oricând se recalculează
  (`regionTerrain`). **Doar o partidă câștigată lasă urme** (decis de owner); una pierdută sau părăsită doar
  înaintează ceasul. O partidă pe o regiune pornește cu `newGame(seed, start)` — `start` = terenul regiunii și dacă e
  inima (al cărei ultim val, `VAL_INIMA`, are Paznicul inimii) —, iar `replay` primește același `start`. Valul unei
  partide se ia prin `waveAt`, nu din `WAVES` direct.
  `src/ui/planeta.ts` e ecranul planetei; `main.ts` ține lumea în `localStorage` (`worldguard.lume`).
- `src/events.ts` — ce s-a întâmplat într-un pas (lovituri, reacții, loviți, uciși, scăpați, apăruți, sfârșitul
  valului), citit din starea de dinainte și cea de după. Pur. Din el se hrănesc și efectele de pe ecran, și sunetul:
  **nu deduce evenimente a doua oară în altă parte**.
- `src/audio/` — sunetul, sintetizat prin Web Audio din rețetele din `src/data/sunete.ts` (niciun fișier audio).
  `cues.ts` (eveniment sau decizie → sunet și poziție în stereo) și `gate.ts` (câte repetiții și câte voci) sunt pure
  și testate; `synth.ts` și `sunet.ts` ating Web Audio. Contextul real se face la primul gest al jucătorului.
  Ca la `render/`, `Math.random` e voie aici: e doar ieșire.
- `src/ui/` — interfața HTML peste hartă (bare, panou, cărți, notificări). Nu citește starea: primește o vedere
  gata calculată (`HudView`) și trimite înapoi acțiuni (`HudActions`).
- `src/main.ts` — input și legătura dintre ele (controlerul). În `npm run dev` expune `window.wg` (starea, doar citire;
  poziția pe ecran a unui hexagon; motorul de sunet), pentru verificările în browser; blocul e sub
  `import.meta.env.DEV`, deci lipsește din build.

## Reguli dure în `src/sim/`
Păzite de `src/sim/discipline.test.ts` (care are și o probă negativă).
- **Fără `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`.** Aleatorul vine din
  `createRng(seed, 'nume-flux')` (`rng.ts`), câte un flux numit pe sistem — altfel o tragere în plus
  într-un loc mută tot ce urmează în altul, iar replay-urile nu se mai reproduc.
- **Orice acțiune a jucătorului e o `Decision` în jurnal** și trece prin `applyDecision`. Starea se
  reconstruiește identic din `(seed, jurnal)` — pe asta stau meta-progresia, verificarea partidelor pe
  server și datele de playtest. Nicio schimbare de stare pe lângă jurnal.
- **O verificare întoarce motivul, nu doar „nu”** (`Result` din `result.ts`). Din asta iese panoul „De ce nu?”.
- **Terenul e separat de traseu.** Traseul și turnurile se reiau la fiecare partidă; terenul unei
  regiuni persistă între partide (vezi GDD §9.1, implementat în felia 9). Nu amesteca cele două. De aici și regula
  „drumul vechi”: linia dreaptă intrare–bază nu se terraformează (`isOldRoad`), fiindcă drumul se reface pe ea.
- **Schimbi generatorul de hărți? Crește `LUME.versiuneGenerator`.** Planetele salvate își refac terenul din seed:
  un generator schimbat pe tăcute le-ar muta pădurile și apele de sub editările vechi.

## Mecanica de traseu (implementată)
Capete fixe (intrare `I`, bază `B`). O bucată înlocuiește o porțiune de 1–3 hexagoane cu un ocol mai lung
cu +1..+3. Drumul nu are voie să se atingă singur (două hexagoane de drum neconsecutive nu pot fi vecine).
Măsurat: pe drum drept, un ocol de +k cere o porțiune de cel puțin k hexagoane — de aici `portiuneMaxima: 3`.
- **Un ocol pe val, obligatoriu** (decis de owner, 05.10.2026). Limita pornește de la `INSERARE.peVal` = 1,
  dar stă în stare (`GameState.ocoluriPeVal`), ca upgrade-urile de mai târziu să o poată crește.
  `ocoluriFolosite` se golește când pornește valul. `checkDetourAllowed` (se mai poate pune?) și
  `checkStartWave` (poate porni valul?) dau motivul refuzului — simularea și UI-ul îl folosesc pe același.
  Propunere: dacă pe drum nu mai încape niciun ocol (`detourPossible`), valul pornește fără el.
- **Ocolul nu poate trece peste un turn** (decis de owner, 05.10.2026): jocul îl refuză, cu motiv.
  `towerKeys` intră ca hexagoane blocate în `insertDetour`, `optionsAround` și `detourPossible`.
  (Owner-ul spusese întâi „turnul nu blochează”; „jocul refuză plasarea pe traseu” l-a precizat.)

## Timpul (implementat)
- Simularea merge pe **tick fix** (`TICK_MS` = 50 ms, 20 pe secundă) și **doar în timpul unui val**. Între
  valuri (faza `pregatire`) timpul stă pe loc: atunci se modelează drumul.
- Pozițiile sunt **întregi**, în mili-hexagoane (`MILI_HEX` = 1000) de-a lungul drumului; vitezele sunt în
  mili-hexagoane pe tick. Fără virgulă mobilă în stare, ca replay-ul să iasă identic pe orice mașină.
- Fiecare decizie din jurnal are tick-ul ei (`LoggedDecision.la`). `replay(seed, jurnal, panaLaTick)`
  rulează simularea până la fiecare decizie, o aplică, apoi continuă până la tick-ul cerut.
- Viteza din UI (1×/2×/4×) și pauza sunt **doar în `main.ts`**: rulează mai multe sau mai puține tick-uri
  pe cadru. Simularea nu știe de ele. Desenul interpolează între tick-uri (`Overlay.alpha`), starea nu.

## Turnurile (implementat)
- Se construiesc **doar în pregătire**, cu aur; ținta se schimbă **oricând** (decizia intră în jurnal cu
  tick-ul ei). Ocolul nu poate trece peste un turn (vezi mai sus).
- Ordinea unui tick: inamicii merg → apar cei noi → turnurile lovesc, în ordinea id-urilor (un inamic ucis nu
  mai e țintă) → cei uciși lasă aur → sfârșitul valului sau al partidei.
- Raza = distanța pe grilă până la hexagonul de drum pe care stă inamicul (cel mai apropiat centru).
  Egalitățile la țintire se rup după progres, apoi după id. Armura scade din fiecare lovitură, minimum 1.
- O verificare de construcție (`checkBuild`) dă motivul refuzului; aceeași funcție alimentează previzualizarea.

## Stările și reacțiile (implementat)
- **Regulile se scriu pe etichete, nu pe perechi** (GDD §6), în `src/data/reactions.ts`: o regulă spune ce se
  întâmplă când un *element* (lovitura unui turn: impact, foc, frig, fulger; sau terenul: apă, ulei) atinge un inamic
  care poartă o stare cu o anumită *etichetă*. O stare nouă cu eticheta „inflamabil” explodează la foc fără cod nou.
- Motorul e `applyContact` din `src/sim/reactions.ts`: întâi regulile (în ordinea din date), apoi dauna
  atingerii (după armură), apoi starea pe care o lasă, dacă nicio regulă n-a blocat-o sau n-a înlocuit-o.
- Ordinea unui tick: inamicii merg (încetinirea cea mai mare se aplică, nu se adună) → apar cei noi → stările
  trec cu un tick (arsura lovește și trece de armură) → terenul (apa udă, uleiul unge — **o dată, când intră** pe un
  hexagon de drum vecin; un hexagon vecin cu amândouă dă amândouă atingerile, în ordinea din `TERRAIN`) → turnurile
  lovesc → cei uciși lasă aur → sfârșitul valului.
- **Uleiul se găsește pe hartă** (decis de owner, 05.10.2026): bălți generate pe fluxul lor (`harta/ulei`), la cel
  puțin `MAP_GEN.departareBalta` de drumul inițial — la început nimic nu e uns; un ocol spre baltă o aduce lângă drum.
- **Focul și frigul sunt incompatibile** (decis de owner, 05.10.2026): se anulează pe inamic (dezgheț) și nu se
  combină în același grup (`COMBINARE.incompatibile`).
- `GameState.reactii` numără reacțiile (date pentru cronică și playtest) și intră în amprentă;
  `GameState.evenimente` sunt reacțiile ultimului tick, doar pentru desen.
- Dealul: rază +1 și +20 aur la construcție (`towerRange`, `towerCost`) — propunere.

## Grupurile de turnuri (implementat)
Decis de owner (05.10.2026), înlocuiește bonusurile de vecinătate: turnurile lipite fac un **grup**, iar grupul se
comută **individual ↔ combinat**; combinat = **un singur turn**.
- Grupurile nu se țin în stare: `towerGroups` le calculează din turnuri (vecini la un hexagon, din aproape în
  aproape). În stare e doar `Tower.combinat`, cu regula: **toate turnurile unui grup au aceeași valoare, iar un turn
  singur are `false`**. `applyDecision` o păstrează la fiecare schimbare (`withMode`); testul de replay o verifică.
- Decizia `combina` (`checkCombine` dă motivul refuzului) se poate lua și în timpul valului. Combinarea ia ținta
  liderului (cel mai mic id) și cea mai lungă reîncărcare din grup — fără lovitură gratuită.
- Un turn nou lângă un grup combinat intră în grup; dacă îl leagă de turnuri individuale sau aduce Foc lângă Frig,
  tot grupul unit trece pe individual (nu rămâne combinat pe ascuns).
- În `step`, grupul combinat trage o dată, la rândul liderului: o țintă din reuniunea razelor, lovită pe rând de
  atingerile din `combinedContacts` (cifrele în `COMBINARE`, `src/data/towers.ts`). Ținta se schimbă pentru tot grupul.
- **Armura** (decis de owner, 05.10.2026): combinarea singură nu trece de ea. O atingere combinată poartă `lovituri`
  (de câte ori ar fi lovit turnurile separat), iar armura se scade de atâtea ori. Doar combinațiile din
  `COMBINARE.armura` o străpung (`penetrare`) sau o ignoră; dauna din reacții rămâne o lovitură separată.
- UI-ul nu dublează regulile: previzualizarea „în ce grup intră turnul ăsta” aplică decizia pe o copie a stării.

## Draftul și bossul (implementat)
Felia 5, aleasă de owner (05.10.2026). Cărțile sunt date (`src/data/draft.ts`), efectele lor le aplică `applyDecision`.
- **Oferta** (`draftOffer`) se face în `step`, când se încheie un val, pe fluxul `draft/<val>`: `DRAFT.marime` cărți,
  dintre care `DRAFT.dinAfara` pentru tipuri de turn pe care jucătorul nu le are. Relicvele luate nu mai apar.
  Stă în stare (`GameState.oferta`); valul nu pornește până nu e aleasă una (`checkStartWave`).
- **Decizia `alege`** (`checkPick` dă motivul refuzului). Efectele: turn gratuit (`gratuite`, `towerCost` = 0, se
  consumă la construcție); îmbunătățiri pe tip (`imbunatatiri`, procente adunate → `towerDamage`, `towerReload`; le
  folosesc și turnul singur, și `combinedContacts`); relicve (`ocoluriPeVal`, `vieti`); traseu (`ocoluriBonus`, doar în
  pregătirea curentă). Limita de ocoluri e `detourLimit` = `ocoluriPeVal + ocoluriBonus`.
- **„Trage cu p% mai des”** = cadența × (100 + p)/100, deci reîncărcarea × 100/(100 + p): cărțile se adună fără să
  ajungă vreodată la zero.
- **Dificultatea crește cu draftul:** viața unui inamic e `enemyHealth(tip, val)` = a tipului × multiplicatorul
  valului × (1 + `CRESTERE_VIATA` × val / 100), pe întregi. Simularea, bara de viață și previzualizarea o folosesc pe
  aceeași; nu înmulți `WAVES[i].viata` direct.
- **Trăsăturile** (`TRAITS`, `src/data/enemies.ts`) stau pe grupurile din valuri și trec pe inamic la apariție
  (`Enemy.trasaturi`). Imunitatea e în motorul reacțiilor: `applyState` nu aplică o stare la care inamicul e imun, deci
  nici reacțiile care pornesc de la ea nu mai au loc.

## Economia (implementat)
Felia 6, decisă de owner (05.10.2026). Cifrele în `src/data/economie.ts`.
- **La sfârșitul fiecărui val** (`step`, odată cu draftul): `waveIncome` = dobânda (procent din aur, cu plafon) și
  pământul (al valului + câte unul pe mină). Ce a adus stă în `GameState.venit`, doar pentru interfață.
- **Decizia `mina`** (`checkMine`): pe un filon liber, cu aur; hexagonul ei nu mai ține un turn (`checkBuild`).
- **Decizia `teren`** (`checkTerraform`): canal / deal / arde, cu pământ, doar în pregătire, nu pe drum, turn sau mină.
  Harta e imuabilă: terraformarea face o hartă nouă (`{ ...map, terrain }`), deci cache-urile pe hartă se refac singure.
- **Pădurea în flăcări** (`jar`) e un teren cu atingere de foc: drumul vecin aprinde inamicii, iar uleiul + foc =
  explozie, prin aceleași reguli ale reacțiilor. Nicio regulă nouă în motor.

## Cum se lucrează
- După fiecare felie: `npm run check` verde → intrare în `DEVLOG.md` → commit. Stagează explicit
  fișierele, **nu** `git add -A` (owner-ul rulează sesiuni paralele pe proiecte diferite).
- **Verificare proporțională.** Teste pe logica de joc (reguli, determinism, replay). Fără infrastructură
  de verificare înaintea unui joc jucabil — lecția de la Kinstead: întâi aflăm dacă e distractiv.
- **Designul e al owner-ului (Andrei).** Ce propui tu se marchează „propunere” până decide el.
  Deciziile luate stau în GDD §14; nu le redeschide fără el.
- Măsoară înainte să afirmi: o cifră care ajunge într-o decizie se măsoară, nu se estimează.
- Când va exista backend: regula comună a proiectelor lui Andrei — instanță de **test** și **live**,
  publicarea pe live doar de owner, cu confirmare și jurnal.

## Stare
- **v0.0.1 (04.10.2026):** schelet + harta pe hexagoane + traseul cu ocoluri + jurnalul deciziilor.
  33 de teste.
- **Felia 1 (04.10.2026):** valurile și inamicii pe drum, pe tick fix: 15 valuri, 5 tipuri de inamici,
  vieți, faze (pregătire → val → pregătire / câștigat / pierdut), viteză și pauză în UI. 48 de teste.
- **Felia 2 (04.10.2026):** 4 turnuri de bază (fizic, foc, frig, fulger), 4 moduri de țintire, armură,
  aur din inamicii uciși. Cifrele, măsurate cu un bot.
- **Deciziile owner-ului (05.10.2026):** un ocol pe val, obligatoriu (cu loc pentru upgrade); ocolul nu poate
  trece peste un turn; boss la valurile 5, 10 și 15. 68 de teste.
- **Felia 3 (05.10.2026):** stările (arde, ud, răcit, înghețat, uns) și 6 reacții pe etichete (explozie, abur,
  dezgheț, îngheț, spargere, electrocutare); apa udă, dealul dă rază. Anunț la prima reacție, cu freeze-frame.
  Cifrele, măsurate cu botul. 86 de teste.
- **Publicare (05.10.2026):** Firebase Hosting `worldguard-910f1` — previzualizare la fiecare PR, live la `main`.
- **Felia 4 (05.10.2026):** grupurile de turnuri (individual sau combinat), bălțile de ulei pe hartă, interfața
  HTML nouă (bare, panou, cărți, butoane pentru tot). Armura la lovitura combinată: se scade pe lovituri, doar
  unele combinații o străpung sau o ignoră. 107 teste.
- **Felia 5 (05.10.2026):** draftul 1 din 3 după fiecare val (turn gratuit, îmbunătățiri, relicve, traseu) și bossul
  cu trăsături (uscat, neclintit, ignifug); viața crește cu 20% pe val, Fulger 36 → 30 (măsurat). 123 de teste.
- **Răspunsurile owner-ului la felia 5 (05.10.2026):** un singur tip cu toate cărțile pe el e un build bun (rămâne);
  partida se lungește prin mai multe valuri: 25, cu boss la fiecare al cincilea (20 și 25 sunt propunerea mea).
- **Felia 6 (05.10.2026):** economia — dobânda, pământul, minele pe filoane și terraformarea (canal, deal, arzi
  pădurea). 133 de teste. Răspunsurile owner-ului: pământ de start (3), terraformarea rămâne cum e.
- **Felia 7 (05.10.2026):** finisarea vizuală, tot din forme simple: terenul cu decor și animații, turnurile care se
  întorc spre țintă, inamicii după tip, cu stările pe ei, loviturile după turn, efectele reacțiilor, anunțul valului.
  Panoul și banda draftului se așază după barele măsurate. 133 de teste (simularea e neatinsă).
- **Răspunsurile owner-ului la felia 7 (05.10.2026):** scuturarea ecranului rămâne; prototipul e pentru desktop.
- **Felia 8 (05.10.2026):** sunetul, sintetizat fără fișiere: loviturile pe turn, reacțiile, morțile, bossul, baza,
  valul, deciziile, refuzurile; stereo după hartă; volumul pe S. Evenimentele pasului (`src/events.ts`), comune pentru
  efecte și sunet. Fundalul muzical discret (decis de owner): acorduri lungi după starea jocului, tasta B. 154 de teste.
- **Felia 9 (05.10.2026):** meta-progresia, stratul C — planeta cu 7 regiuni, terenul care ține minte (jurnalul
  editărilor) și evoluează după ceasul lumii (cenușă, puieți, canale colmatate), ecranul planetei, salvarea în browser.
  Fără `?seed=`, jocul pornește pe planetă. 168 de teste.
- **Răspunsurile owner-ului la felia 9 (05.10.2026):** bossul inimii (Paznicul inimii: mai greu, iar pulsul lui naște
  roiuri); doar partidele câștigate lasă urme pe teren. 173 de teste.
- **Următorul:** de ales cu owner-ul (vezi DEVLOG).
