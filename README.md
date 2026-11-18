# World Guard

Aperi o planetă cu o navă: un joc web pentru telefon, văzut de sus, cu tema de spațiu. Strângi cristale
și metal și decizi unde le investești — turele, colector, mină, nivelul navei sau repararea planetei — în
timp ce navele dușmane vin tot mai des. Scorul e cât reziști.
**Stare:** faza 1 e publicată pe GitHub Pages (pornit pe 17.11.2026, https://andreibesliu.github.io/WorldGuard/), iar
Andrei a încercat-o pe telefonul lui, un Samsung Galaxy A54 („se simte ok până aici”). Tema de spațiu e în cod
(18.11.2026), iar Andrei a încercat-o pe telefon în aceeași zi: „pe telefon, totul arată super bine”. Urmează pauza, instalarea și reluarea (planul 2).

```bash
npm install
npm run dev      # http://localhost:5180
npm run check    # typecheck + teste + build (poarta înainte de commit; CI rulează același lucru)
npm run smoke    # proba în browser (Playwright, 9 verificări); nu face parte din `check`
npm run single   # dist-single/world-guard.html: tot jocul într-un singur fișier, fără nicio referință în afară
```

**Cum se joacă (conform designului):** nava se mișcă cu un joystick care apare unde atingi ecranul
(pe calculator: WASD sau săgețile). Strânge singură cristale și metal de lângă cristale și asteroizi, lovește singură
navele dușmane din apropiere și plătește stând pe cercurile punctate de pe hartă. Partida se termină când cade planeta; scorul e timpul rezistat, iar recordul rămâne în telefon.

**Test de viteză:** butonul de pe cartonașul de start pornește o partidă cu 150 de nave dușmane mereu pe hartă și
planeta și nava mereu întregi (fără nave noi în afara celor 150), și arată în bandă câte cadre pe secundă desenează telefonul, plus cea mai mică valoare de la pornire (`min`). Nu atinge recordul. Din test se iese doar reîncărcând pagina.

**Semne în adresă:** `?seed=7` fixează sămânța (aceeași partidă la fiecare pornire); `?debug=1` pune în fereastră
`window.__wg` (starea jocului, `run(secunde)` și `drawMs(cadre)`, timpul mediu de desen pe cadru în ms), folosit de proba din browser;
`npm run smoke` tipărește din el un rând `SMOKE INFO` cu timpul de desen pe cadru cu cele 150 de nave dușmane așezate
în jurul planetei (în vedere, ca desenul să nu le sară).

Designul: [`docs/GDD.md`](docs/GDD.md). Regulile proiectului: [`CLAUDE.md`](CLAUDE.md).
Jocul vechi (tower defense pe hexagoane) a rămas la commit-ul `ec73b9e`.
