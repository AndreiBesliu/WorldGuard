# World Guard

Tower defense roguelite pe hexagoane: modelezi pământul unor planete vii, iar ele țin minte ce le-ai făcut.
**Stare:** prototip în browser — feliile 1–5: valuri, turnuri, reacții, grupuri de turnuri, draftul și bossul.
Fiecare PR are un link de previzualizare; `main` se publică pe Firebase Hosting.

```bash
npm install
npm run dev      # http://localhost:5180
npm run check    # typecheck + teste + build
```

**Cum se joacă:** apără baza `B` de inamicii care pleacă din `I`. Înainte de fiecare val pui **un ocol**
(obligatoriu), construiești turnuri și pornești valul.
- **Pe drum:** `1` / `2` / `3` = cu cât se lungește drumul, `Tab` = altă variantă, click = pui ocolul.
- **Pe un loc liber:** `4`–`7` (sau cărțile de jos) alegi turnul, click = îl construiești.
- **Pe un turn:** click = îl alegi. `T` = schimbă ținta, `C` = combină grupul (turnurile lipite) într-un singur
  turn sau îl separă, `Esc` = renunți la alegere. Aceleași butoane sunt și în panoul din dreapta.
- **După fiecare val:** alegi 1 carte din 3 (click sau `8` / `9` / `0`): un turn gratuit, o îmbunătățire, o relicvă
  sau un ocol în plus. Valul următor pornește abia după alegere.
- `Spațiu` pornește valul, `P` pauză, `F` viteza, `Z` anulezi ultima decizie din pregătire, `R` de la capăt,
  `N` hartă nouă. Seed fix: `?seed=123` în URL.
- **Terenul contează:** apa de lângă drum udă inamicii, bălțile de ulei îi ung (focul îi aprinde: explozie),
  dealul dă rază. Focul și frigul sunt incompatibile.
- **Bossii** (valurile 5, 10, 15) au trăsături care îi fac imuni la unele stări: uscat, neclintit, ignifug. Le vezi în
  previzualizarea valului.

Designul: [`docs/GDD.md`](docs/GDD.md). Regulile proiectului: [`CLAUDE.md`](CLAUDE.md).
