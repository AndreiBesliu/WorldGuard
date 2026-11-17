# World Guard

Aperi castelul cu un erou: un joc web pentru telefon, văzut de sus. Strângi lemn și piatră și decizi
unde le investești — turnuri, tăietori, carieră, nivelul eroului sau repararea castelului — în timp ce
dușmanii vin tot mai des. Scorul e cât reziști.
**Stare:** faza 1, în lucru. Deocamdată există doar starea de pornire; jocul nu se vede încă pe ecran.

```bash
npm install
npm run dev      # http://localhost:5180
npm run check    # typecheck + teste + build
```

**Cum se joacă (conform designului):** eroul se mișcă cu un joystick care apare unde atingi ecranul
(pe calculator: WASD sau săgețile). Strânge singur lemn și piatră de lângă copaci și stânci, lovește singur
dușmanii din apropiere și plătește stând pe cercurile punctate de pe jos. Partida se termină când cade castelul.

Designul: [`docs/GDD.md`](docs/GDD.md). Regulile proiectului: [`CLAUDE.md`](CLAUDE.md).
Jocul vechi (tower defense pe hexagoane) a rămas la commit-ul `ec73b9e`.
