# CLAUDE.md — World Guard

Faptele stabile și regulile proiectului. Se încarcă la fiecare sesiune.

## Ce e
**World Guard** (nume de lucru; jucătorii sunt **Guardians**) — un tower defense roguelite pe hexagoane,
în care modelezi pământul unor planete vii, iar ele țin minte ce le-ai făcut. Țintă: joc comercial
pe Steam; acum, **prototip în browser**.

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

## Arhitectura
- `src/sim/` — **nucleul de joc, determinist, fără DOM.** Hartă, traseu, decizii, valuri și inamici,
  turnuri și țintire; (mai târziu) reacții. Tot ce contează pentru reguli stă aici.
- `src/data/` — cifrele și regulile de conținut (teren, ocoluri, inamici și valuri, turnuri, constantele
  partidei).
  **Un număr de gameplay scris direct în cod e o greșeală**: îl muți în `src/data/`.
- `src/render/` — desenarea pe Canvas 2D. Citește starea, nu o modifică.
- `src/main.ts` — input și legătura dintre ele. În `npm run dev` expune `window.wg.state` (doar citire),
  pentru verificările în browser; blocul e sub `import.meta.env.DEV`, deci lipsește din build.

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
  regiuni persistă între partide (vezi GDD §9.1). Nu amesteca cele două.

## Mecanica de traseu (implementată)
Capete fixe (intrare `I`, bază `B`). O bucată înlocuiește o porțiune de 1–3 hexagoane cu un ocol mai lung
cu +1..+3. Drumul nu are voie să se atingă singur (două hexagoane de drum neconsecutive nu pot fi vecine).
Măsurat: pe drum drept, un ocol de +k cere o porțiune de cel puțin k hexagoane — de aici `portiuneMaxima: 3`.

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
  tick-ul ei). **Drumul nu trece prin turnuri.**
- Ordinea unui tick: inamicii merg → apar cei noi → turnurile lovesc, în ordinea id-urilor (un inamic ucis nu
  mai e țintă) → cei uciși lasă aur → sfârșitul valului sau al partidei.
- Raza = distanța pe grilă până la hexagonul de drum pe care stă inamicul (cel mai apropiat centru).
  Egalitățile la țintire se rup după progres, apoi după id. Armura scade din fiecare lovitură, minimum 1.
- O verificare de construcție (`checkBuild`) dă motivul refuzului; aceeași funcție alimentează previzualizarea.

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
  aur din inamicii uciși, drumul ocolește turnurile. Cifrele, măsurate cu un bot. 59 de teste.
- **Următorul:** felia 3 — stările și reacțiile (pe etichete), plus terenul în reacții (vezi DEVLOG).
