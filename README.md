# World Guard

Aperi o planetă cu o navă: un joc web pentru telefon, văzut de sus, cu tema de spațiu. Strângi cristale
și metal și decizi unde le investești — turele, colector, mină, nivelul navei sau repararea planetei — în
timp ce navele dușmane vin tot mai des. Scorul e cât reziști.
**Stare:** faza 1 e publicată pe GitHub Pages (pornit pe 17.11.2026, https://andreibesliu.github.io/WorldGuard/), iar
Andrei a încercat-o pe telefonul lui, un Samsung Galaxy A54 („se simte ok până aici”). Tema de spațiu e în cod
(18.11.2026), iar Andrei a încercat-o pe telefon în aceeași zi: „pe telefon, totul arată super bine”. Planul 2 e în cod
(18.11.2026): pauza, reluarea unei partide întrerupte, ecranul aprins, instalarea pe telefon și jocul fără internet; urmează
proba lui pe telefon, apoi planul 3 (plasa pentru dificultate și reechilibrarea).

```bash
npm install
npm run dev      # http://localhost:5180
npm run check    # typecheck + teste + build cu service worker (poarta înainte de commit; CI rulează același lucru)
npm run smoke    # proba în browser (Playwright, 19 verificări); nu face parte din `check`
npm run single   # dist-single/world-guard.html: tot jocul într-un singur fișier, fără nicio referință în afară
npm run icons    # desenează din nou pictogramele PNG din public/icons/icon.svg (doar când se schimbă desenul)
```

**Instalare pe telefon:** deschide jocul în Chrome, apoi din meniul cu trei puncte alege „Adaugă pe ecranul de pornire”
(sau „Instalează aplicația”). Jocul pornește apoi pe tot ecranul, cu pictograma lui. După prima deschidere merge și fără
internet. O versiune nouă se descarcă în fundal și apare la următoarea pornire a jocului, niciodată în mijlocul unei partide.

**Pauză și reluare:** butonul din bandă (sau Escape) pune pauză; jocul pune singur pauză când ieși din el. Partida pusă pe
pauză rămâne în telefon: la următoarea deschidere, „Continuă partida” o reia de unde a rămas. Cât se joacă, ecranul rămâne aprins.

**Cum se joacă (conform designului):** nava se mișcă cu un joystick care apare unde atingi ecranul
(pe calculator: WASD sau săgețile). Strânge singură cristale și metal de lângă cristale și asteroizi, lovește singură
navele dușmane din apropiere și plătește stând pe cercurile punctate de pe hartă. Partida se termină când cade planeta; scorul e timpul rezistat, iar recordul rămâne în telefon.

**Test de viteză:** butonul de pe cartonașul de start pornește o partidă cu 150 de nave dușmane mereu pe hartă și
planeta și nava mereu întregi (fără nave noi în afara celor 150), și arată în bandă câte cadre pe secundă desenează telefonul, plus cea mai mică valoare de la pornire (`min`). Nu atinge recordul. Din test se iese doar reîncărcând pagina.

**Semne în adresă:** `?seed=7` fixează sămânța (aceeași partidă la fiecare pornire); `?debug=1` pune în fereastră
`window.__wg` (starea jocului, faza cu `phase()`, `run(secunde)` și `drawMs(cadre)`, timpul mediu de desen pe cadru în ms), folosit de proba din browser;
`npm run smoke` tipărește din el un rând `SMOKE INFO` cu timpul de desen pe cadru cu cele 150 de nave dușmane așezate
în jurul planetei (în vedere, ca desenul să nu le sară).

Designul: [`docs/GDD.md`](docs/GDD.md). Regulile proiectului: [`CLAUDE.md`](CLAUDE.md).
Jocul vechi (tower defense pe hexagoane) a rămas la commit-ul `ec73b9e`.
