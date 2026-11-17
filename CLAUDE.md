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
```

## Arhitectura
- `src/sim/` — **nucleul de joc, determinist, fără DOM.** Starea (`state.ts`), pasul de 1/60 s (`step.ts`),
  ajutoare de test (`testkit.ts`), aleatorul (`rng.ts`). Tot ce contează pentru reguli stă aici.
- `src/data/` — cifrele (`balance.ts`) și așezarea lumii (`layout.ts`).
  **Un număr de gameplay scris în afara lui `src/data/` e o greșeală.**
- `src/render/` — desenarea pe Canvas 2D. Citește starea, nu o modifică. (Urmează.)
- `src/input/` — joystick și taste. (Urmează.)
- `src/ui/` — texte (în română, într-un singur modul `strings.ts`) și ecrane. (Urmează.)
- `src/main.ts` — legătura dintre ele. Deocamdată un ciot.

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
  Deciziile luate stau în GDD §14; nu le redeschide fără el.
- Măsoară înainte să afirmi: o cifră care ajunge într-o decizie se măsoară, nu se estimează.
- Când va exista backend: regula comună a proiectelor lui Andrei — instanță de **test** și **live**,
  publicarea pe live doar de owner, cu confirmare și jurnal.

## Stare
- **v0.1.0 (17.11.2026):** jocul nou ia locul celui vechi. Sunt gata tipurile și starea de pornire
  (`createGame`), cifrele de echilibru, așezarea lumii și un `step` care doar numără timpul.
- **Următorul:** eroul, cercurile de investit, dușmanii, lupta, desenatul și interfața — task-urile 2–9
  din planul fazei 1.
