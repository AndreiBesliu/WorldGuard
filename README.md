# World Guard

Aperi o planetă cu o navă: un joc web pentru telefon, văzut de sus, cu tema de spațiu. Strângi cristale
și metal și decizi unde le investești — turele, colector, mină, nivelul navei sau repararea planetei — în
timp ce navele dușmane vin tot mai des. Scorul e cât reziști.
**Stare:** faza 1 e publicată pe GitHub Pages (pornit pe 17.11.2026, https://andreibesliu.github.io/WorldGuard/), iar
Andrei a încercat-o pe telefonul lui, un Samsung Galaxy A54 („se simte ok până aici”). Tema de spațiu e în cod
(18.11.2026), iar Andrei a încercat-o pe telefon în aceeași zi: „pe telefon, totul arată super bine”. Planul 2 e în cod
(18.11.2026): pauza, reluarea unei partide întrerupte, ecranul aprins, instalarea pe telefon și jocul fără internet; e publicat
(pull request-ul #14), dar Andrei nu l-a încercat încă pe telefon. Planul 3 e în cod (18.11.2026): plasa pentru dificultate și
reechilibrarea a două cifre (propuneri, până le vede Andrei în joc). Nava cu module e în cod (20.11.2026), pe ramură, în pull request-ul #15 (ciornă, neîmbinat, care ține și faza 3): experiență înainte de nivel, alegere din trei oferte la fiecare nivel, nouă module; cifrele ei sunt propuneri, până le vede Andrei în joc. „Explorează galaxia” (21.11.2026), al doilea mod, cu rezerva și atelierul, e în cod pe aceeași ramură și în același pull request (#15, ciornă, neîmbinat); cifrele lui sunt propuneri, în afară de cele șapte hotărâri ale lui Andrei din `docs/GDD.md`. Jocul publicat pe GitHub Pages are fazele 1, tema și 2. Proba lui pe telefon va acoperi fazele 2 și 3, nava cu module și zborul împreună; nimic din etapele de pe ramură n-a fost încercat încă de el pe telefon, iar cele două cifre de la „Test de viteză” (tema nouă și nava cu module, acum cu cele trei arme la treapta 3 trăgând) lipsesc încă.

```bash
npm install
npm run dev      # http://localhost:5180
npm run check    # typecheck + teste + build cu service worker + jocul într-un singur fișier (poarta înainte de commit; CI rulează același lucru)
npm run smoke    # proba în browser (Playwright, 44 de verificări); nu face parte din `check`
npm run single   # dist-single/world-guard.html: tot jocul într-un singur fișier, fără nicio referință în afară
npm run balance  # tabelul jucătorilor automați (120 de partide, ~15 s), plus rândul „Amestec cu toate întăririle”, cifra unui zbor condus de script, măsurată pe loc, și câte astfel de zboruri costă tot atelierul; cu `-- --raze` și pentru razele de apărare 80 și 160 (~40 s)
npm run icons    # desenează din nou pictogramele PNG din public/icons/icon.svg (doar când se schimbă desenul)
```

**Instalare pe telefon:** deschide jocul în Chrome, apoi din meniul cu trei puncte alege „Adaugă pe ecranul de pornire”
(sau „Instalează aplicația”). Jocul pornește apoi pe tot ecranul, cu pictograma lui. După prima deschidere merge și fără
internet. O versiune nouă se descarcă în fundal și apare după ce jocul e închis de tot și deschis din nou, niciodată în mijlocul
unei partide; o reîncărcare a paginii în aceeași filă o păstrează pe cea veche.

**Pauză și reluare:** butonul din bandă (sau Escape) pune pauză; jocul pune singur pauză când ieși din el. Partida pusă pe
pauză rămâne în telefon: la următoarea deschidere, „Continuă partida” o reia de unde a rămas. Cât se joacă, ecranul rămâne aprins.

**Cum se joacă (conform designului):** nava se mișcă cu un joystick care apare unde atingi ecranul
(pe calculator: WASD sau săgețile). Strânge singură cristale și metal de lângă cristale și asteroizi, lovește singură
navele dușmane din apropiere și plătește stând pe cercurile punctate de pe hartă. Partida se termină când cade planeta; scorul e timpul rezistat, iar recordul rămâne în telefon.

**Nava, experiența și modulele:** fiecare navă dușmană doborâtă dă experiență navei. Când bara din banda de sus e plină (inelul și „Nivel 3 gata”), cercul navei de pe hartă se aprinde și își arată prețul; plătești stând pe el, ca la celelalte cercuri, și urci un nivel. Jocul se oprește atunci și apare un panou cu trei oferte: un modul nou sau o treaptă în plus la unul pe care îl ai. Atingi una (sau apeși 1, 2 sau 3 pe calculator) și jocul pornește mai departe. Sunt nouă module de trei feluri: arme (Undă, Laser, Rachete), corp (Blindaj, Scut, Reparator) și utilitare (Motor, Magnet, Releu), fiecare cu trei trepte; nava are 2 locuri la început și 6 la nivelul 9, care e cel maxim. O partidă întreruptă cât alegi se reia în aceeași alegere. Partidele salvate înainte de nava cu module nu se mai pot continua.

**Plasa pentru dificultate:** `npm run balance` joacă, fără browser, șase jucători automați (Nimic, Amestec, Doar navă, Fără navă, Fără economie, Fără turele; ultimii doi doar tipăriți, fără limită; cei fără turele iau Releul doar dacă nu au altă ofertă, propunere) pe câte 20 de semințe și tipărește cât rezistă fiecare; testele din `src/bots/net.test.ts` păzesc limitele din design și fac `npm run check` să pice când o cifră de joc le strică. Tabelul măsurat, limitele și ce nu vede plasa sunt în `docs/GDD.md`, la „Plasa pentru dificultate”. Zgomotul tabelului, măsurat la faza 3: o schimbare mică de cifre mișcă „Amestec” cu până la ±10 s și procentele cu până la 3 puncte; altă mașină, cu cam ±2 s și sub un punct. Jucătorii automați nu intră în joc.

**Test de viteză:** butonul de pe cartonașul de start pornește o partidă cu 150 de nave dușmane mereu pe hartă și
planeta și nava mereu întregi (fără nave noi în afara celor 150), cu nava la nivelul 3 și cele trei arme (Undă, Laser, Rachete) la treapta 3, trăgând tot
timpul (propunere; experiența nu se strânge, deci nu apar niveluri și panou), și arată în bandă câte cadre pe secundă desenează telefonul, plus cea mai mică valoare de la pornire (`min`). Nu atinge recordul și nu salvează nimic. Din test se iese cu pauză, apoi „Partidă nouă” sau „Înapoi la start” (sau reîncărcând pagina).

**Semne în adresă:** `?seed=7` fixează sămânța (aceeași partidă la fiecare pornire); `?debug=1` pune în fereastră
`window.__wg` (starea jocului, faza cu `phase()`, `run(secunde)` și `drawMs(cadre)`, timpul mediu de desen pe cadru în ms), folosit de proba din browser;
`npm run smoke` tipărește din el două rânduri `SMOKE INFO` cu timpul de desen pe cadru cu cele 150 de nave dușmane așezate
în jurul planetei (în vedere, ca desenul să nu le sară): o dată cu nava testului de viteză (cele trei arme la treapta 3) și o dată cu toate cele nouă module la treapta 3,
cu raze de laser, rachete în zbor și explozii în cadru.

**„Explorează galaxia” (în lucru, pe ramură):** al doilea mod, un zbor de trei minute văzut de sus, în care nava înaintează și trage
singură, iar tu o ferești de focul dușman conducând-o cu degetul (nava face mișcarea degetului, de 1,2 ori mai mare; pe calculator,
săgețile sau WASD). Cartonașul de start are cele două moduri, „Apără planeta” și „Explorează galaxia”, rezerva și sectorul ales cu − și +
(de la 1 până la cel mai departe explorat plus unu, cel mult 999; se propune cel mai departe explorat plus unu). Cartonașele de pauză și de final
ale apărării au „Înapoi la start”: din pauză partida rămâne salvată și se reia cu „Continuă partida”, iar după final „Apără planeta” pornește o
partidă nouă. Câmpul zborului stă lipit de banda de sus, deci dușmanii ies de sub ea; pe un ecran înalt cerul în plus rămâne dedesubt.
În zbor, banda de sus arată ce a strâns zborul (doar semnul și cifra), viețile navei, drumul prin sector (care devine viața navei de elită), modulele cu treptele lor și pauza; sub ea, un rând scurt spune
ce ai cules. Pauza zborului are cartonașul ei („Zbor în pauză”, „Continuă”, „Renunță la zbor”); la sfârșit: „Sector explorat” sau „Nava a
fost doborâtă”, ce ai adus, rezerva, „Sectorul următor” sau „Încă un zbor” și „Înapoi la start”. Ce s-a strâns trece în rezervă exact o dată
(la pauză și la sfârșit). Un zbor nu atinge partida de apărare salvată și nici recordul. Atelierul (butonul „Atelier” de pe cartonașul de start și de la sfârșitul
zborului) e un panou peste cartonașul de unde s-a deschis: rezerva, cinci întăriri (Carenă, Armament, Colectare, Planetă, Arsenal de pornire) cu treptele ca
puncte și butonul cu prețul treptei următoare, stins când rezerva nu ajunge, „La plafon” când nu mai sunt trepte; o apăsare cumpără o treaptă și o
salvează pe loc, iar „Înapoi” arată din nou cartonașul, cu rezerva nouă. Nu se deschide în timpul unei partide, al unui zbor sau al unei pauze;
partidele și zborurile pornite după o cumpărătură pornesc cu întăririle noi. Fără nicio întărire, apărarea planetei e exact cea de dinainte (o păzește `src/bots/golden.test.ts`), iar jucătorii automați joacă mereu fără întăriri. Regulile și cifrele zborului sunt în `docs/GDD.md`. Cu `?debug=1&zbor=N` zborul pornește direct, în sectorul N. Cu `?debug=1`, `window.__wg` are și `mode()`, `flight()`,
`runFlight(secunde)`, `flightDrawMs(cadre)` și `flightField()`; proba din browser tipărește un rând `SMOKE INFO` cu timpul de desen al zborului
în clipa cea mai plină.

Designul: [`docs/GDD.md`](docs/GDD.md). Regulile proiectului: [`CLAUDE.md`](CLAUDE.md).
Jocul vechi (tower defense pe hexagoane) a rămas la commit-ul `ec73b9e`.
