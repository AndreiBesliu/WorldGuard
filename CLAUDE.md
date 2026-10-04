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
- `src/sim/` — **nucleul de joc, determinist, fără DOM.** Hartă, traseu, decizii, (mai târziu) valuri,
  turnuri, reacții. Tot ce contează pentru reguli stă aici.
- `src/data/` — cifrele și regulile de conținut (teren, ocoluri, mai târziu turnuri, inamici).
  **Un număr de gameplay scris direct în cod e o greșeală**: îl muți în `src/data/`.
- `src/render/` — desenarea pe Canvas 2D. Citește starea, nu o modifică.
- `src/main.ts` — input și legătura dintre ele.

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
- **Următorul:** prototipul 1 din GDD §10, felie cu felie (vezi DEVLOG).
