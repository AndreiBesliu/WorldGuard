# World Guard

Aperi castelul cu un erou: un joc web pentru telefon, văzut de sus. Strângi lemn și piatră și decizi
unde le investești — turnuri, tăietori, carieră, nivelul eroului sau repararea castelului — în timp ce
dușmanii vin tot mai des. Scorul e cât reziști.
**Stare:** faza 1 e gata în cod: jocul se joacă pe telefon și pe calculator, cu record local. Încă nu a fost
încercat pe telefonul lui Andrei; urmează pauza, instalarea și reluarea (planul 2).

```bash
npm install
npm run dev      # http://localhost:5180
npm run check    # typecheck + teste + build (poarta înainte de commit; CI rulează același lucru)
npm run smoke    # proba în browser (Playwright, 9 verificări); nu face parte din `check`
npm run single   # dist-single/world-guard.html: tot jocul într-un singur fișier, fără nicio referință în afară
```

**Cum se joacă (conform designului):** eroul se mișcă cu un joystick care apare unde atingi ecranul
(pe calculator: WASD sau săgețile). Strânge singur lemn și piatră de lângă copaci și stânci, lovește singur
dușmanii din apropiere și plătește stând pe cercurile punctate de pe jos. Partida se termină când cade castelul; scorul e timpul rezistat, iar recordul rămâne în telefon.

**Test de viteză:** butonul de pe cartonașul de start pornește o partidă cu 150 de dușmani mereu pe teren și
castelul și eroul mereu pe picioare (fără dușmani noi în afara celor 150), și arată în bandă câte cadre pe secundă desenează telefonul, plus cea mai mică valoare de la pornire (`min`). Nu atinge recordul. Din test se iese doar reîncărcând pagina.

**Semne în adresă:** `?seed=7` fixează sămânța (aceeași partidă la fiecare pornire); `?debug=1` pune în fereastră
`window.__wg` (starea jocului și `run(secunde)`), folosit de proba din browser.

Designul: [`docs/GDD.md`](docs/GDD.md). Regulile proiectului: [`CLAUDE.md`](CLAUDE.md).
Jocul vechi (tower defense pe hexagoane) a rămas la commit-ul `ec73b9e`.
