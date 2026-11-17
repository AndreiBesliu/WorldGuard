# CLAUDE.md — World Guard

Faptele stabile și regulile proiectului. Se încarcă la fiecare sesiune.

## Ce e
**World Guard** — un joc de apărat castelul, văzut de sus, pentru telefon. Un erou condus cu joystick
strânge lemn și piatră și le investește: turnuri, tăietori, carieră, nivelul eroului, repararea castelului.
Dușmanii vin continuu și tot mai des; scorul e cât reziști. Pentru Andrei, deocamdată; nimic nu se
construiește acum pentru o publicare.

- Designul complet: [`docs/GDD.md`](docs/GDD.md) (în conflict cu prototipul, câștigă documentul).
- Prototipul de aruncat, referință pentru aspect și comportament: [`docs/prototip.html`](docs/prototip.html).
- Planul fazei 1: [`docs/superpowers/plans/2026-11-17-world-guard-faza-1.md`](docs/superpowers/plans/2026-11-17-world-guard-faza-1.md).
- Istoria lucrului: [`DEVLOG.md`](DEVLOG.md).
- Jocul vechi (tower defense pe hexagoane) e la commit-ul `ec73b9e`. Andrei poate pune eticheta:
  `git tag hex-td-v0.0.1 ec73b9e && git push origin hex-td-v0.0.1`.

## Comenzi
```bash
npm run dev        # Vite, http://localhost:5180
npm run check      # typecheck + teste + build — ASTA e poarta înainte de commit
npm test           # Vitest
npm run build
npm run smoke      # proba în browser (Playwright instalat pe mașină); nu face parte din `check`
npm run single     # dist-single/world-guard.html: tot jocul într-un singur fișier (pentru încercat pe telefon)
```

## Arhitectura
- `src/sim/` — **nucleul de joc, determinist, fără DOM.** Tot ce contează pentru reguli stă aici.
  `state.ts` (starea, `DT`, `EPS`, tipurile), `step.ts` (un pas de 1/60 s, în ordine: ceas, erou, cercuri, luptă, dușmani),
  `hero.ts` (mers, coliziuni, reapariție, strâns), `pads.ts` (cercurile de investit: plată, nivele, producție, reparat),
  `combat.ts` (lovitura eroului, tragerea turnurilor, săgeți), `foes.ts` (apariții, mers, atac, despărțire),
  `rng.ts` (aleatorul cu fluxuri numite), `result.ts` (verificări cu motiv), `testkit.ts` (ajutoare de test),
  plus testele de lângă fiecare (`*.test.ts`, între ele `discipline.test.ts` și `run.test.ts`, care măsoară partida întreagă).
- `src/data/` — cifrele (`balance.ts`) și așezarea lumii (`layout.ts`: hartă, castel, grupuri de resurse, cercuri,
  vederea de referință, pragul de viață scăzută). **Un număr de gameplay scris în afara lui `src/data/` e o greșeală.**
- `src/app/` — lipiciul fără desen și fără reguli: `loop.ts` (acumulatorul: pași fixi din timpul cadrului, cel mult 5 pe cadru),
  `flags.ts` (`?seed=` și `?debug=1` din adresă), `storage.ts` (recordul în `localStorage`; orice eroare = fără record).
- `src/render/` — desenarea pe Canvas 2D. Citește starea, nu o modifică. `canvas.ts` (mărimea, ordinea straturilor),
  `camera.ts` (scara ecranului și urmărirea eroului), `ground.ts` (terenul, pictat o dată), `world.ts` (tot ce e în coordonate de lume;
  sare peste ce e în afara ecranului), `overlay.ts` (indicatorul spre castel și joystickul, în coordonate de ecran),
  `palette.ts` (culorile citite o dată din variabilele CSS).
- `src/input/` — comenzile: `joystick.ts` (logica joystickului, fără DOM, testată), `bind.ts` (singurul cu DOM: pointer și taste).
- `src/ui/` — textele (în română, într-un singur modul `strings.ts`), banda de sus (`hud.ts`), cartonașele de start și de final
  (`cards.ts`), formatul ceasului (`format.ts`) și stilurile (`ui.css`).
- `src/main.ts` — legătura dintre ele: trei stări (start, joc, final), bucla de cadre, testul de viteză.
- `scripts/` — `smoke.cjs` (proba în browser cu Playwright, 9 verificări, capturi în `smoke-out/`) și `single-file.mjs`
  (`npm run single`: tot jocul într-un singur fișier HTML, în `dist-single/`).
- `.github/workflows/` — `ci.yml` (`npm run check` la fiecare pull request) și `deploy.yml` (publică pe GitHub Pages la push pe `main`).

## Reguli dure în `src/sim/`
Păzite de `src/sim/discipline.test.ts` (care are și o probă negativă).
- **Fără `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`.** Aleatorul vine din
  `createRng(seed, 'nume-flux')` (`rng.ts`), câte un flux numit pe sistem — altfel o tragere în plus
  într-un loc mută tot ce urmează în altul.
- **Pas fix de 1/60 s** (`DT`), indiferent de ecran. Aceeași sămânță și aceleași comenzi dau aceeași stare.
- **Starea trece prin JSON.** `GameState` e date simple: fără funcții, fără referințe între obiecte.
  `JSON.parse(JSON.stringify(s))` trebuie să continue identic — pe asta stă reluarea unei partide întrerupte.
- **O verificare întoarce motivul, nu doar „nu”** (`Result` din `result.ts`).
- Fără DOM și fără rețea în simulare.

## Cum se lucrează
- După fiecare felie: `npm run check` verde → intrare în `DEVLOG.md` → commit. Stagează explicit
  fișierele, **nu** `git add -A` (owner-ul rulează sesiuni paralele pe proiecte diferite).
- **Verificare proporțională.** Teste pe logica de joc (reguli, determinism, replay). Fără infrastructură
  de verificare înaintea unui joc jucabil — lecția de la Kinstead: întâi aflăm dacă e distractiv.
- **Designul e al owner-ului (Andrei).** Ce propui tu se marchează „propunere” până decide el.
  Deciziile luate stau în `docs/GDD.md`, secțiunea „Cine a hotărât ce”; nu le redeschide fără el.
- Măsoară înainte să afirmi: o cifră care ajunge într-o decizie se măsoară, nu se estimează.
- Când va exista backend: regula comună a proiectelor lui Andrei — instanță de **test** și **live**,
  publicarea pe live doar de owner, cu confirmare și jurnal.

## Stare
- **Faza 1, în cod (17.11.2026):** jocul e jucabil: erou cu joystick, strâns resurse, cercuri de investit,
  dușmani, luptă, turnuri, desenat pe Canvas 2D, cartonașe de start și de final cu record local, „Test de viteză”.
  `npm run check` (77 de teste) și `npm run smoke` (9 verificări) trec. CI rulează `check` la fiecare pull request;
  `deploy.yml` publică pe GitHub Pages la push pe `main`; `npm run single` dă varianta într-un singur fișier.
- **Nefăcut încă:** eticheta `hex-td-v0.0.1`, pornirea GitHub Pages din setările repo-ului și verificarea pe telefonul
  lui Andrei (Samsung Galaxy A54) — toate ale lui Andrei.
- **Urmează:** planul 2 (pauză, instalare pe telefon, joc fără internet, reluarea unei partide întrerupte) și planul 3
  (plasa pentru dificultate și reechilibrarea).
