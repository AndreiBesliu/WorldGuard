# CLAUDE.md — World Guard

Faptele stabile și regulile proiectului. Se încarcă la fiecare sesiune.

## Ce e
**World Guard** — un joc de spațiu pentru telefon, cu **două moduri**. Pentru Andrei, deocamdată; nimic nu se construiește acum pentru o publicare.
- **Apără planeta** (genul: „castle defense”, cum l-a numit Andrei), văzut de sus. O navă condusă cu joystick strânge cristale și metal și le
  investește: turele, colector, mină, nivelul navei, repararea planetei. Dușmanii (nave) vin continuu și tot mai des; scorul e cât reziști. În cod,
  rolurile păstrează numele `hero` (nava) și `foe` (dușmanul); planeta e `core`, resursele `crystal` și `metal`, cercurile `turret`, `collector`, `mine`.
  Nava e **cu module** (20.11.2026): strânge experiență din navele dușmane doborâte, iar la fiecare nivel plătit jocul stă pe loc și jucătorul alege
  una din trei oferte (un modul nou sau o treaptă în plus); nouă module de trei feluri (arme, corp, utilitare), locuri de la 2 la 6, nivel maxim 9.
- **Explorează galaxia** (21.11.2026): un zbor de trei minute într-un câmp în picioare; nava înaintează și trage singură, jucătorul o conduce cu degetul și
  o ferește de focul dușman, culege module peste care zboară și ajunge la o navă de elită. Ce strânge trece într-o **rezervă** păstrată între partide, din care
  cumperi în **atelier** cinci întăriri cu plafon; ele contează și la zbor, și la apărare. În cod: `flight` (zborul), `profile` (rezerva), `ups` (întăririle).

- Designul complet: [`docs/GDD.md`](docs/GDD.md) (în conflict cu prototipul, câștigă documentul).
- Tema de spațiu, aspectul „Orbită” și numele din cod: [`docs/superpowers/specs/2026-11-17-tema-spatiu-design.md`](docs/superpowers/specs/2026-11-17-tema-spatiu-design.md)
  (macheta: [`docs/machete-tema-spatiu.html`](docs/machete-tema-spatiu.html); varianta 3, „Colonie”, e doar pentru misiuni speciale de mai târziu).
- Prototipul de aruncat, referință de **comportament**: [`docs/prototip.html`](docs/prototip.html). Aspectul lui e cel vechi (castel, turnuri, copaci); nu mai e referință de aspect.
- Planul fazei 1: [`docs/superpowers/plans/2026-11-17-world-guard-faza-1.md`](docs/superpowers/plans/2026-11-17-world-guard-faza-1.md).
- Nava cu module (aprobată de Andrei pe 20.11.2026): [`docs/superpowers/specs/2026-11-20-nava-cu-module-design.md`](docs/superpowers/specs/2026-11-20-nava-cu-module-design.md),
  planul [`docs/superpowers/plans/2026-11-20-world-guard-nava-cu-module.md`](docs/superpowers/plans/2026-11-20-world-guard-nava-cu-module.md),
  macheta [`docs/machete-nava-cu-module.html`](docs/machete-nava-cu-module.html).
- „Explorează galaxia” (aprobat de Andrei pe 21.11.2026): [`docs/superpowers/specs/2026-11-21-exploreaza-galaxia-design.md`](docs/superpowers/specs/2026-11-21-exploreaza-galaxia-design.md),
  planul [`docs/superpowers/plans/2026-11-21-world-guard-exploreaza-galaxia.md`](docs/superpowers/plans/2026-11-21-world-guard-exploreaza-galaxia.md),
  macheta [`docs/machete-exploreaza-galaxia.html`](docs/machete-exploreaza-galaxia.html); prototipul de aruncat, reper de purtare:
  [`docs/prototip-explorare.html`](docs/prototip-explorare.html). Regulile și cifrele lui, și hotărârile, sunt și în `docs/GDD.md`.
- Istoria lucrului: [`DEVLOG.md`](DEVLOG.md).
- Jocul vechi (tower defense pe hexagoane) e la commit-ul `ec73b9e`. Andrei poate pune eticheta:
  `git tag hex-td-v0.0.1 ec73b9e && git push origin hex-td-v0.0.1`.

## Comenzi
```bash
npm run dev        # Vite, http://localhost:5180
npm run check      # typecheck + teste + bundle + single — ASTA e poarta înainte de commit (28 s, măsurat)
npm test           # Vitest
npm run bundle     # vite build + scripts/build-sw.mjs (scrie dist/sw.js); `build` = tsc + bundle
npm run build
npm run smoke      # proba în browser (Playwright instalat pe mașină); nu face parte din `check`
npm run single     # dist-single/world-guard.html: tot jocul într-un singur fișier (pentru încercat pe telefon); face parte din `check`, ca să pice când construirea lui pică
npm run balance    # tabelul jucătorilor automați (120 de partide, ~15 s) și rândul zborului; `-- --raze` adaugă razele de apărare 80 și 160 (~40 s); doar afișează
npm run icons      # pictogramele PNG din public/icons/icon.svg (doar când se schimbă desenul; PNG-urile se comit)
```

## Arhitectura
- `src/sim/` — **nucleul de joc, determinist, fără DOM.** Tot ce contează pentru reguli stă aici.
  `state.ts` (starea, `DT`, `EPS`, tipurile), `step.ts` (un pas de 1/60 s, în ordine: ceas, erou, cercuri, luptă, dușmani),
  `hero.ts` (mers, cu Motorul; coliziuni, reapariție, strâns, cu Magnetul; viața maximă, cu Blindajul; refacerea vieții, cu Reparatorul; Scutul care oprește o lovitură, `hurtHero`), `pads.ts` (cercurile de investit: plată, nivele, producție, reparat),
  `combat.ts` (armele navei: Unda, Laserul, Rachetele cu explozia lor; tragerea turelelor, grăbită de Releu; razele și rachetele în zbor; `nearestFoeWithin` e regula de țintire, folosită și de desen), `foes.ts` (apariții, mers, atac, despărțire),
  `mods.ts` (nava cu module: `tierOf`, `slotsAt`, `xpNeed`, `heroReady`, `heroPadView` pentru cele trei stări ale cercului navei, `makeOffer` și `choose` pentru oferte, `offerFits` care potrivește o ofertă cu nava, folosit și la citirea salvării),
  `boost.ts` (întăririle din atelier la apărare: `hullHp`, `armsFactor`, `reachFactor`, `coreMaxHp`; le citește doar din `s.ups`, pus la `createGame`),
  `rng.ts` (aleatorul cu fluxuri numite), `result.ts` (verificări cu motiv), `testkit.ts` (ajutoare de test),
  plus testele de lângă fiecare (`*.test.ts`, între ele `discipline.test.ts` și `run.test.ts`, care măsoară partida întreagă).
- `src/flight/` — **regulile zborului „Explorează galaxia”, deterministe, fără DOM**, separate de apărare (din `src/sim/` ia doar `rng.ts` și `DT`, `EPS`, `NEVER` din `state.ts`).
  `state.ts` (starea unui zbor: date simple, ținte prin `id`; `createFlight(seed, sector, ups)`), `step.ts` (un pas de 1/60 s; după ce zborul s-a încheiat,
  `down` sau `explored`, nu mai schimbă nimic), `ship.ts` (condusul, loviturile, Scutul, strânsul, Magnetul), `arsenal.ts` (Tunul, Laserul, Rachetele),
  `foes.ts` (cele cinci feluri de dușmani și asteroizii: apariții, mers, foc, pradă), `pickups.ts` (ce lasă transportul și cum se culege), `testkit.ts`,
  plus testele de lângă fiecare.
- `src/data/` — cifrele (`balance.ts`; `modules.ts`: cele nouă module, felurile, treptele și cifrele lor; `flight.ts`: tot ce ține de zbor, mărimea câmpului,
  modulele din zbor, dușmanii, sectoarele (`sectorScale`) și plafonul lor (`sectorCap`, 999, propunere); `workshop.ts`: cele cinci întăriri, plafoanele și prețurile (`upPrice`)) și așezarea lumii
  (`layout.ts`: hartă, nucleu, grupuri de resurse, cercuri, vederea de referință, pragul de viață scăzută).
  **Un număr de gameplay scris în afara lui `src/data/` e o greșeală.**
- `src/app/` — lipiciul fără desen și fără reguli: `loop.ts` (acumulatorul: pași fixi din timpul cadrului, cel mult 5 pe cadru),
  `flags.ts` (`?seed=`, `?debug=1` și `?zbor=N` (doar cu `?debug=1`) din adresă), `storage.ts` (recordul în `localStorage`, cheia `wg.v1.record`, partida salvată:
  `saveGame`, `loadGame`, `clearGame`, cheia `wg.v1.save`, și profilul: `loadProfile`, `saveProfile`, cheia `wg.v1.profile`; orice eroare = fără record,
  fără reluare; profilul ultim scris se ține și în memorie cât e pagina deschisă, iar `loadProfile` îl dă pe acela când stocarea nu se poate citi sau
  ultima scriere n-a ajuns în ea, altfel citește stocarea, deci o scriere din altă filă se vede), `save.ts` (salvarea ca text,
  cu versiune, verificată la citire; `SAVE_VERSION` = 3, iar una de versiunea 2 se primește ca „fără întăriri”; oferta deschisă, de cel mult `OFFERS` elemente, e verificată cu `offerFits`; nivelul navei, experiența, numărul de module față de locuri și treptele întăririlor sunt verificate și ele), `profile.ts` (profilul: rezerva de cristale și metal, sectorul cel mai departe explorat, treptele atelierului; `canBuy`, `buy`, `bank`, `markExplored`, `packProfile` și `unpackProfile` verificat la citire; fiecare regulă întoarce un profil nou), `flightSession.ts` (sesiunea unui zbor, fără DOM și fără stocare: fazele `ready | playing | paused | over`, `start`, `pause`, `unpause`, `advance`, `quit`; trece în rezervă prin `deps.bank` doar diferența de la ultima trecere, deci exact o dată), `session.ts` (fazele `ready | playing | paused | over`, `choose(i)` pentru alegerea unei oferte, `leave()` pentru „Înapoi la start” din pauză sau de la final, când se salvează și când se șterge partida,
  întreținerea testului de viteză, unde nava pornește cu `STRESS_SHIP` din `src/data/balance.ts`: nivelul 3, Unda, Laserul și Rachetele la treapta 3), `wake.ts` (ecranul aprins cât se joacă), `sw.ts` (înregistrează `./sw.js`; un refuz e înghițit).
- `public/` — `manifest.webmanifest` (instalarea; `theme_color` e `--edge`) și `icons/` (`icon.svg`, sursa, și PNG-urile 192, 512 și
  `maskable` 512, făcute din el de `scripts/make-icons.cjs`). `src/env.d.ts` declară `__WG_SW__` (pus de `vite.config.ts` la `true`,
  de `vite.single.config.ts` la `false`: pagina într-un singur fișier nu are service worker).
- `src/bots/` — plasa pentru dificultate: șase jucători automați (patru cu limite: Nimic, Amestec, Doar navă, Fără navă; doi doar tipăriți: Fără economie, Fără turele) care joacă partide întregi pe simulare. **Nu intră în jocul livrat** (`main.ts` nu-l importă) și e păzit de aceeași disciplină ca `src/sim/` (`src/sim/discipline.test.ts` îl citește și pe el): fără ceas și fără hazard global, doar citește starea.
  `policy.ts` (cele șase purtări, `POLICIES`, lista de preferințe `prefer` și `pickOffer` pentru alegerea modulului, unde purtările fără turele iau Releul ultimul, și alegerea țintei: luptă, plată, strâns, acasă; `heldPad` ține plata începută), `nav.ts` (mersul drept spre țintă, cu ocolire când nu se mai apropie, ieșirea de pe cercurile străine și ocolitul unui cerc străin construit împreună cu clădirea lui, ca un singur obstacol), `bot.ts` (`createBot`: starea în, `Input` afară), `run.ts` (`playOne`, `playStep` care alege oferta la nevoie, `measure`, `measureAll`; `SEEDS` = 1…20, `RUN_CAP` = 900 s),
  `limits.ts` (limitele din design ca date, `verdicts`, `formatTable` cu coloanele de nivel), `table.ts` (tipărește tabelul pentru `npm run balance`; construit cu `vite.balance.config.ts` în `dist-balance/`, ignorat de git) și `net.test.ts` (limitele ca teste: joacă o dată cele 120 de partide și are un test pe fiecare limită; durează cam 20 s).
  Jucătorii joacă **mereu fără întăriri**; `LIMITS` nu se ating. `golden.test.ts` fixează trei partide întregi („Amestec”, semințele 1–3) din codul de dinaintea întăririlor:
  fără nicio întărire, apărarea e cea de azi, pas cu pas; testul nu se schimbă. `flightYield.ts` (nava condusă de un script, care stă jos și nu poate fi lovită, dă cât aduce un zbor în
  sectorul 1, măsurat pe loc; nicio cifră scrisă de mână) și `flightYield.test.ts` (doar că măsurătoarea e deterministă și că nava ajunge la capătul sectorului) — nu e jucător
  automat și nu păzește nimic: nici dificultatea zborului, nici prețurile. Ținta de preț (tot atelierul în vreo 30 de zboruri) se judecă la reglaj, din tabel.
  Tabelul mai are trei rânduri doar tipărite: „Amestec, cu toate întăririle la plafon”, rândul zborului și „Atelierul la plafon” (câte zboruri ca al scriptului costă toate întăririle, pe resursa care cere mai multe).
- `src/render/` — desenarea pe Canvas 2D. Citește starea, nu o modifică. `canvas.ts` (mărimea, ordinea straturilor; singurul care numește
  aspectul și pictează cerul o dată, împărțit cu desenul zborului prin `sky()`), `camera.ts` (scara ecranului și urmărirea navei), `world.ts` (tot ce e în coordonate de lume și ar fi la fel
  în orice aspect: straturile, săritul peste ce nu se vede, cercurile, etichetele, barele, textele plutitoare),
  `overlay.ts` (indicatorul spre planetă și joystickul, în coordonate de ecran), `palette.ts` (culorile citite o dată din variabilele CSS),
  `skin.ts` (interfața `Skin`: formele de pe canvas care diferă de la un aspect la altul, între ele nava cu modulele ei în `hero`, racheta în `shot`,
  raza laserului în `beam` și explozia în `blast`; culorile stau în `palette.ts` și în `ui.css`), `draw.ts` (primitivele de desen), `derive.ts` (ce citește desenul din
  stare, fără DOM: `turretAim`, `shieldSpan`, `regrown`, `fade`, `shieldReady`, `blockGlow`, `blastReach`), `orbit/` (aspectul „Orbită”, singura implementare a lui `Skin`: `index.ts`;
  `scene.ts` — cerul și planeta, **singurul loc cu gradient și decupaj**; `things.ts` — resurse, clădiri, nave (a ta cu formele modulelor și inelul Scutului), raze, rachete, explozii, doar forme pline și linii).
  `world.ts` desenează stratul razelor peste inelul planetei: exploziile, raza laserului, apoi rachetele și razele turelelor.
  Testele: `derive.test.ts`, `world.test.ts` (ordinea straturilor; `drawWorld` cu `ORBIT` peste o stare bogată, și peste una cu toate cele nouă module, nu schimbă starea),
  `discipline.test.ts` (fără `shadowBlur`; gradient de orice fel, decupaj și `ctx.filter` doar în `orbit/scene.ts`; `paintSky()` chemat doar din `canvas.ts`; citește și `flight/`), `palette.test.ts`
  (culorile `#rgb` lăsate de micșorarea CSS-ului la build, aduse la `#rrggbb`) și `camera.test.ts`. `ground.ts` nu mai există. Mișcările doar de desen (continente, nori, satelit, flăcări, țeava turelei)
  se calculează din timpul partidei și din stare; nu scriu nimic în stare.
  `flight/` — desenul zborului („Explorează galaxia”), în stilul „Orbită”: `canvas.ts` (`createFlightRenderer`: mărimea canvasului, `fitField` — câmpul de
  390 × 680 lipit de bandă, deci dușmanii ies de sub ea, la scara cea mai mare la care încape întreg, cu o fâșie dedesubt sau fâșii în lături, umplute după desen cu culoarea paginii (`outsideField`), deci ce iese din câmp nu se vede —, și bucata din mijloc a cerului
  apărării, împrumutat prin `sky()` de la desenatorul din `render/canvas.ts`: cerul se pictează o singură dată, pentru amândouă), `scene.ts` (stelele care curg, forme pline după `f.t`, și ordinea straturilor în `drawFlight`, cu aspectul `FlightLook` dat ca
  argument), `things.ts` (formele: nava ta cu vârful în sus și modulele pe ea, cele cinci feluri de dușmani cu vârful în jos, focul dușman rotund și
  portocaliu, lucrurile de cules ca pătrate cu chenar în culoarea felului, resursele ca la apărare, raze, rachete, explozii; `FLIGHT_LOOK`). Efectele se
  citesc după timpul zborului (`f.t − e.t0`), deci după sfârșit rămân înghețate. Testele (`things.test.ts`, `scene.test.ts`, `canvas.test.ts`) cer ca
  fiecare fel de lucru din stare să fie chiar desenat, nu doar să nu arunce.
- `src/input/` — comenzile: `joystick.ts` (logica joystickului, fără DOM, testată), `drag.ts` (condusul cu degetul din zbor, fără DOM, testat), `bind.ts` (singurul cu DOM: pointer și taste; la apărare leagă joystickul, în zbor degetul, cu pozițiile împărțite la scara câmpului; `pickIndex`, fără DOM și testată, spune ce ofertă aleg tastele 1–3; `flightKeys` dă mișcarea tastelor în zbor, `FLIGHT.drive.keys` = 255 de unități pe secundă după înmulțirea regulilor cu 1,2).
- `src/ui/` — textele (în română, într-un singur modul `strings.ts`, fixate de `strings.test.ts`), banda de sus (`hud.ts`: `shipRow` fără DOM dă rândul navei, cu inelul de experiență, după `heroPadView` din `src/sim/mods.ts`, citit și de cercul navei de pe canvas; banda are aceeași înălțime în start, joc, pauză, panou și final, iar în testul de viteză e mai înaltă cu rândul fps, verificarea 26 din proba din browser), locurile navei (`slots.ts`, aceleași în bandă și în panou),
  banda din zbor (`flightHud.ts`: `flightRow` fără DOM — ce a strâns zborul, viețile, drumul prin sector care devine viața navei de elită, modulele cu treptele
  lor și rândul „ai cules”, cât efectul `took` trăiește după timpul zborului și doar cât zborul e în curs (nu în pauză, nu la sfârșit) —;
  cristalele și metalul doar cu semnul și cifra, ca la 360 px să încapă și 7 vieți, verificarea 42 —, iar `createFlightHud` o pune în locul benzii apărării cât `mode` e `'flight'`,
  cu aceeași înălțime în zbor, în pauza lui și la sfârșit, verificarea 32; rândul „ai cules” stă sub bandă, în afara așezării),
  cartonașele (`cards.ts`): de start (cele două moduri, „Apără planeta” și „Explorează galaxia”, rezerva, sectorul ales cu − și +, prin `stepSector`, fără DOM,
  de la 1 până la cel mai departe explorat plus unu, cel mult `sectorCap`, cu `firstSector` și `sectorAfter` pentru sectorul propus, și „Continuă partida”), de pauză și de final ale apărării (fiecare cu „Înapoi la start”), de pauză („Zbor în pauză”) și de sfârșit
  ale zborului, cu butonul „Atelier” pe cel de start și pe cel de sfârșit; atelierul (`shop.ts`: `shopView` fără DOM — rezerva și cele cinci rânduri cu
  treptele, prețul treptei următoare și starea `buy | poor | max` —, `createShop` în pagină: rândurile se refac doar când profilul s-a schimbat,
  fiecare buton ține „generația” lui, deci cele de dinainte de o refacere sau de un `hide` nu mai cumpără, focusul de la deschidere stă pe panou, nu pe un buton);
  panoul de alegere de la un nivel nou al navei
  (`choice.ts`: `choiceView` fără DOM, `createChoice` în pagină; la deschidere focusul stă pe cartonaș, nu pe o ofertă, și nicio alegere nu trece
  în primele `CHOICE_GRACE_MS` = 400 ms, propunere; pictogramele modulelor sunt `<symbol>` în `index.html`), apăsarea butoanelor (`tap.ts`: la atingere, la ridicarea
  degetului deasupra butonului, și pentru al doilea deget; cu mausul și tastatura, la `click`; o singură pornire pe gest), formatul ceasului (`format.ts`) și stilurile (`ui.css`; variabilele de culoare au nume pe roluri,
  fontul titlului e Exo 2).
- `src/main.ts` — legătura dintre ele: nu ține stări, le ia din sesiuni (apărarea și zborul); alege modul de joc (`mode`), arată cartonașele și ține
  singurul ciclu de cadre; pauza (buton, Escape, pagina ascunsă, `pagehide`), în fiecare mod doar pe al lui; ecranul aprins, înregistrarea service worker-ului
  (doar în build, cu `__WG_SW__`). `src/flightMode.ts` — legarea zborului, fără ciclu de cadre: sesiunea lui (`src/app/flightSession.ts`), care trece în profil
  (`bank`, `markExplored`) ce aduce, exact o dată; banda lui; sectorul ales și cel de după un zbor încheiat. Un zbor pornește de pe cartonașul de start,
  de pe cartonașul lui de sfârșit sau cu `?debug=1&zbor=N` (sectorul N), niciodată peste o partidă de apărare în curs, și nu atinge partida de apărare
  salvată, nici recordul. `src/workshopMode.ts` — legarea atelierului: `buyStep` citește profilul din stocare, îl verifică și îl cumpără cu `buy`,
  salvează și întoarce profilul nou (nimic nu se scade dintr-un profil ținut în memorie); `main.ts` deschide atelierul doar de pe cartonașul de start sau
  de la sfârșitul zborului (altfel nu face nimic), ascunde cartonașul cât panoul e pe ecran, iar „Înapoi” îl arată din nou cu rezerva de după cumpărături.
  „Înapoi la start” (`home`) vine din zbor și din pauza sau finalul apărării: scoate apărarea din pauză (`leave`), citește din nou partida salvată și
  stinge ecranul aprins; după prima partidă din pagină, „Apără planeta” pornește cu sămânță nouă (cu `?seed=`, tot aceea). Când scara câmpului se
  schimbă (ecranul rotit), degetul ținut pe ecran e lăsat (`input.release()`), ca nava să nu sară. Cu `?debug=1`, `window.__wg` are `state()`,
  `phase()`, `run(secunde)` și `drawMs(cadre)`, iar pentru zbor `mode()`, `flight()`, `runFlight(secunde)`, `flightDrawMs(cadre)` și `flightField()`
  (câmpul pe ecran, în px).
- `scripts/` — `smoke.cjs` (proba în browser cu Playwright, 45 de verificări, capturi în `smoke-out/`, plus rânduri `SMOKE INFO` cu timpul de
  desen pe cadru cu cele 150 de nave dușmane ale testului de viteză așezate în jurul planetei, ca să fie în vedere, din `window.__wg.drawMs`:
  o dată cu nava testului de viteză (`STRESS_SHIP`: cele trei arme la treapta 3), o dată cu toate cele nouă module la treapta 3 și armele trăgând; capturile `10-nava-module.png` (mărită),
  `11-explozie.png`, `12-nava-la-scara.png`, `13-banda-rachete.png` și `14-panou-rachete.png` nu sunt verificări; verificările 27–29 sunt ale zborului (degetul,
  câmpul întreg, lipit de bandă, la 360 × 640, 390 × 780 și 412 × 892, pauza la pagina ascunsă), cu un rând `SMOKE INFO` pentru desenul zborului în clipa cea mai plină (cu
  lucruri de cules, resurse, un nor și o lovitură oprită de Scut în cadru) și capturile `15-zbor.png`, `15-zbor-360.png` și `16-zbor-elita.png`; verificările
  30–34 sunt drumul întreg de pe cartonașe (cartonașul de start, zborul pornit de pe el cu banda lui și condusul cu al doilea deget, degetul pus din nou și
  `pointercancel`, zborul dus la capăt și rezerva, ce s-a strâns ajunge în rezervă exact o dată, partida de apărare salvată rămâne), cu capturile
  `17-start.png`, `18-banda-zbor.png` și `19-sfarsit-zbor.png`, și la 360 × 640 (`-360`); verificările 35–37 sunt ale atelierului (se deschide de pe start,
  o apăsare cumpără, două apăsări repezi cumpără una sau două după rezervă; întăririle ajung la apărare și la zbor, de pe start și de după un zbor; un profil
  stricat de mână dă start cu rezerva 0), cu capturile `20-atelier.png`, `20-atelier-360.png` și `21-dupa-atelier.png`; verificările 38–41 sunt drumul
  înapoi la start din apărare (de la final, apoi un zbor; din pauză, la 360 × 640, cu cele trei butoane încăpând, apoi „Continuă partida” reia aceeași
  partidă; din pauză, apoi atelierul; fără `?seed=`, partida de după întoarcere are altă sămânță), 42 e banda zborului la 360 cu 151 / 52, 7 vieți și cinci
  module, 43 ecranul rotit cu degetul pe el, 44 stocarea refuzată (accesul sau scrierea aruncă: rezerva și atelierul tot merg), 45 rândul fps al testului de viteză care nu rămâne după
  „Înapoi la start” și „Continuă partida”, cu capturile
  `15-zbor-412.png`, `22-final-aparare.png`, `23-pauza-aparare-360.png` și `24-banda-zbor-360-7-vieti.png`; merge doar pe Linux și macOS),
  `single-file.mjs` (`npm run single`: tot jocul într-un singur fișier HTML, în `dist-single/`, care începe cu `<meta charset="utf-8">`, ca diacriticele să fie
  bune și deschis de mână; lipsa lui pică `npm run single`, deci și `check`),
  `sw-template.js` și `build-sw.mjs` (service worker-ul scris de mână; după `vite build`, `build-sw.mjs` pune în el lista fișierelor din
  `dist` și o versiune din SHA-256-ul lor și scrie `dist/sw.js`; o versiune nouă se activează la următoarea pornire, niciodată în timpul
  unei partide) și `make-icons.cjs` (`npm run icons`).
- `.github/workflows/` — `ci.yml` (`npm run check` la fiecare pull request, cu `permissions: contents: read`) și `deploy.yml` (publică pe GitHub Pages la push pe `main`).

## Reguli dure în `src/sim/` și `src/flight/`
Păzite de `src/sim/discipline.test.ts` (care are și o probă negativă). Testul citește fișierele din `src/sim/`, `src/flight/` și `src/bots/` și refuză
`Math.random()`, `Date.now()`, `new Date()` și `performance.now()`; același test cere ca nimic din afara lui `src/bots/` să nu importe din el. „Fără DOM”
și „starea trece prin JSON” sunt reguli ale lui `src/flight/` la fel ca ale lui `src/sim/`, dar nu le citește vreun test de sursă: le păzesc testele zborului
(dus-întors prin JSON, aceeași sămânță și aceleași comenzi dau aceeași stare).
- **Fără `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`.** Aleatorul vine din
  `createRng(seed, 'nume-flux')` (`rng.ts`), câte un flux numit pe sistem — altfel o tragere în plus
  într-un loc mută tot ce urmează în altul.
- **Pas fix de 1/60 s** (`DT`), indiferent de ecran. Aceeași sămânță și aceleași comenzi dau aceeași stare.
- **Starea trece prin JSON.** `GameState` e date simple: fără funcții, fără referințe între obiecte.
  `JSON.parse(JSON.stringify(s))` trebuie să continue identic — pe asta stă reluarea unei partide întrerupte.
- **O verificare întoarce motivul, nu doar „nu”** (`Result` din `result.ts`).
- **Cât o ofertă e deschisă (`s.offer !== null`), `step` nu schimbă nimic din stare**: simularea stă pe loc până se alege. Alegerea e comanda separată `choose` (`mods.ts`), nu direcția joystickului. Ofertele depind doar de sămânță, de nivel și de modulele navei (fluxul `oferta-<nivel>`).
- Fără DOM și fără rețea în simulare.
- **Fără nicio întărire, apărarea e cea de azi, pas cu pas.** Întăririle se țin în starea partidei (`s.ups`), iar regulile le citesc doar de acolo, prin `src/sim/boost.ts`;
  `src/bots/golden.test.ts` o păzește și nu se schimbă. Ce ține de întăriri nu intră în `LIMITS` și jucătorii automați joacă fără ele.
- **Zborul nu atinge apărarea:** un zbor nu șterge partida salvată și nu schimbă recordul; ce a strâns trece în rezervă exact o dată (`flightSession.ts`).
- Cifrele zborului și ale atelierului stau doar în `src/data/flight.ts` și `src/data/workshop.ts`; textele, doar în `src/ui/strings.ts`.

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
- **Faza 1, în cod (17.11.2026):** jocul e jucabil: navă cu joystick, strâns resurse, cercuri de investit,
  dușmani, luptă, turele, desenat pe Canvas 2D, cartonașe de start și de final cu record local, „Test de viteză”.
  CI rulează `check` la fiecare pull request; `deploy.yml` publică pe GitHub Pages la push pe `main`;
  `npm run single` dă varianta într-un singur fișier.
- **Tema de spațiu, în cod (18.11.2026):** planetă, nave, cristale și asteroizi în locul castelului; numele din cod, textele și fontul
  sunt cele noi, regulile și cifrele neschimbate. Designul temei a fost aprobat de Andrei pe 18.11.2026.
- **Publicat:** Andrei a pornit GitHub Pages pe 17.11.2026; faza 1 e la https://andreibesliu.github.io/WorldGuard/ și a încercat-o
  pe telefonul lui (Samsung Galaxy A54): „se simte ok până aici”.
- **Tema, încercată pe telefon:** Andrei a încercat tema de spațiu pe telefonul lui pe 18.11.2026: „pe telefon, totul arată super bine”.
  Cifrele de la „Test de viteză” cu tema nouă nu le-a spus încă.
- **Faza 2, în cod și publicată (18.11.2026, pull request-ul #14):** pauza (buton, Escape, automată la ieșirea din pagină), salvarea partidei în
  telefon și „Continuă partida”, ecranul aprins cât se joacă, instalarea pe ecranul de pornire și jocul fără internet (service worker generat la build).
  Neîncercată încă de Andrei pe telefon: pe 18.11.2026 a cerut să se meargă mai departe fără să aștepte proba; o va face când se strâng mai multe lucruri.
- **Faza 3, în cod (18.11.2026):** plasa pentru dificultate (`src/bots/`, `npm run balance`, limitele din design ca teste în `src/bots/net.test.ts`) și reechilibrarea a două cifre, **propuneri până le vede Andrei în joc**: lovitura navei +10 pe nivel (era +6) și viața dușmanului 14 × (1 + t / 45) (era t / 80). Spre minutul 5 un dușman are 107 viață (înainte 66,5), nava de nivelul 5 lovește cu 50 (înainte 34); spre secunda 60 nava de nivelul 1 are nevoie de 4 lovituri pe dușman în loc de 3. Plasa: cinci jucători automați (la faza 3) joacă partide întregi pe 20 de semințe, iar testele pică dacă dificultatea iese din limitele designului; tabelul măsurat, ce nu vede plasa și ce face reechilibrarea cu turelele sunt în `docs/GDD.md`, la „Plasa pentru dificultate” și „Cine a hotărât ce”.
- **Nava cu module, în cod pe ramură (20.11.2026, în pull request-ul #15, ciornă, neîmbinat, care ține și faza 3):** experiență înainte de nivel, panou de alegere cu trei oferte (jocul stă pe loc cât alegi), nouă module (Undă, Laser, Rachete, Blindaj, Scut, Reparator, Motor, Magnet, Releu) la trei trepte, locuri 2→6, nivel maxim 9, rândul navei în banda de sus, salvarea versiunea 2, jucători automați cu alegere de modul și purtarea „Fără turele”. Designul: `docs/superpowers/specs/2026-11-20-nava-cu-module-design.md`. După valul de reparații de după recenzie: în „Test de viteză” nava pornește la nivelul 3 cu Unda, Laserul și Rachetele la treapta 3, deci testul măsoară cadrele cu cele 150 de nave dușmane și cu armele trăgând (propunere); jucătorii fără turele iau Releul doar dacă nu au altă ofertă (propunere); salvarea respinge nivelul, experiența, modulele peste locuri și oferta peste `OFFERS` stricate. **Toate cifrele etapei și câteva alegeri de interfață sunt propuneri până le vede Andrei în joc** (lista e în `docs/GDD.md`, „Cine a hotărât ce”).
- **„Explorează galaxia”, în cod pe ramură (21.11.2026, în același pull request #15, ciornă, neîmbinat, care ține acum și faza 3 și nava cu module):** zborul, rezerva, atelierul și întăririle la apărare, cu cartonașele de start, de pauză și de sfârșit. **Ce e publicat pe GitHub Pages e tot faza 2; nimic din etapă (nici nava cu module, nici zborul) n-a fost încercat de Andrei pe telefon.** Cele șapte hotărâri ale lui sunt în `docs/GDD.md`; tot restul (cifrele zborului și ale atelierului, prețurile, formele, textele și câteva purtări hotărâte în construcție) e propunere, grupat acolo, la „Cine a hotărât ce”. Restanțele sunt linii de bifat (`- [ ]`) în `DEVLOG.md`.
- **Nefăcut încă:** eticheta `hex-td-v0.0.1` — a lui Andrei; proba lui pe telefon (fazele 2 și 3, nava cu module și zborul împreună: instalarea, jocul fără internet, pauza, reluarea, panoul de alegere, un zbor de trei minute cu module, greutatea sectorului 1, dacă prima întărire vine la timp, înălțimea câmpului de zbor); cifrele de la „Test de viteză”; hotărârea lui asupra propunerilor.
- **Urmează:** lista „Scopuri pentru v1” din design e în cod după faza 3; scopul 7 („nicio strategie care ignoră o direcție nu bate un amestec”) e păzit pentru acești jucători automați, nu acoperit în general (vezi „Ce e fragil” și „Ce nu vede plasa” în `docs/GDD.md`). Etapele următoare din spec (întâi dușmani de mai multe feluri, o singură dată pentru ambele moduri; apoi elite cu obiecte de adoptat, tipuri de turele, tipuri de nave) cer fiecare designul ei, cu Andrei.
- **Cifre măsurate:** numărul de teste, tabelul din `npm run balance` și rândurile zborului nu se țin aici, ca să nu rămână în urmă: ultimele sunt în `DEVLOG.md`,
  în cea mai nouă intrare. Aici rămân doar două, care descriu unelte și se aduc la zi cu ele: numărul de verificări din proba din browser (45) și cât durează
  `npm run check` (28 s), amândouă măsurate la retușarea de după recenzia de control a etapei (21.11.2026).
