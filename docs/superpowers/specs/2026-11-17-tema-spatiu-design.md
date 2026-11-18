# World Guard: tema de spațiu

Scris pe 2026-11-17. Stare: aprobat de Andrei pe 2026-11-18.

Jocul își schimbă haina: în loc de castel, turnuri, copaci și stânci, apar o planetă, nave, cristale și asteroizi. Regulile, cifrele și mișcarea rămân exact cele de azi. Odată cu haina se schimbă și numele din cod, ca jocul și codul să vorbească aceeași limbă.

Acest document completează [`docs/GDD.md`](../../GDD.md). După ce schimbarea e construită, GDD-ul e adus la zi și rămâne sursa pentru reguli; documentul de față rămâne sursa pentru cum arată tema.

## Intenția

Andrei joacă acum un joc de apărat o planetă și îi place lumea aceea mai mult decât cea cu castel. Vrea ca World Guard să arate așa: planetă, spațiu, nave și resurse cosmice. A cerut o schimbare de estetică, nu de joc. În cuvintele lui: „Nu vreau inerție sau zbor real.”

## Cine a hotărât ce

**Hotărât de Andrei pe 2026-11-17. Nu se redeschide fără el.**

1. Tema jocului devine planetă, spațiu, nave și resurse cosmice.
2. Se schimbă doar estetica. Fără inerție, fără zbor real: nava se mișcă exact ca eroul de azi.
3. Aspectul jocului este varianta 1, „Orbită”, din pagina cu machete.
4. Varianta 3, „Colonie”, e păstrată pentru misiuni speciale.
5. Se schimbă și numele din cod, nu doar ce se vede (abordarea 2 de mai jos).

**Propus de Claude, văzut de Andrei pe pagina cu machete și lăsat neschimbat.**

- Numele de pe ecran: Planetă, Navă, cristale, metal, Turelă, Colector, Mină (tabelul din „Textele”).
- Viața planetei se vede ca inel în jurul ei, în locul barei de deasupra castelului.

**Hotărât de Claude, nevăzut încă de Andrei.**

- Misiunile speciale sunt un proiect separat, după v1, cu designul lui. Aici doar se notează ideea.
- Tema se construiește înaintea fazei 2.
- Numele din cod sunt alese să se potrivească și variantei „Colonie” (tabelul din „Numele din cod”).
- Fontul titlului și al cifrelor devine Exo 2.
- Cum se verifică faptul că regulile n-au fost atinse (secțiunea „Cum se verifică”), inclusiv că testul „aceeași partidă” e temporar.
- Inelul-scut se desenează peste nave, ca să rămână vizibil când planeta e atacată.
- Câmpurile loviturii primesc nume fără sabie, iar câmpul `walk` dispare din stare.

## Scopuri

1. Jocul arată ca varianta „Orbită” din [`docs/machete-tema-spatiu.html`](../../machete-tema-spatiu.html).
2. Toate textele de pe ecran folosesc numele noi.
3. Niciun cuvânt al temei vechi nu rămâne în cod: nici în nume, nici în comentarii, nici în numele testelor.
4. Aceeași sămânță și aceleași comenzi dau aceeași partidă ca înainte de schimbare, pas cu pas.
5. Desenul aspectului stă într-un singur loc, ca un al doilea aspect să se poată adăuga mai târziu fără a atinge regulile.

## Ne-scopuri

- Orice schimbare de reguli, de cifre sau de așezare a hărții.
- Inerție, viraj, zbor. Nava pornește și se oprește pe loc, ca eroul de azi.
- Misiunile speciale și aspectul „Colonie”. Macheta lui rămâne în repo doar ca referință.
- Un comutator între aspecte.
- Sunet, feluri noi de nave, iconița aplicației. Iconița o face faza 2, direct pe tema nouă.
- Mutarea desenului pe PixiJS.

## Anti-scopuri

Schimbarea a eșuat, chiar dacă merge tehnic, dacă:

- **Arată ca alt joc.** Tema e comună multor jocuri; aspectul, navele și numele altui joc nu se copiază. Referința e pagina noastră cu machete, nimic altceva.
- **Se citește mai greu decât azi.** Nava ta, navele dușmane, cristalele și asteroizii trebuie deosebite dintr-o privire pe telefon. Cele două resurse diferă și prin formă, nu doar prin culoare.
- **Merge mai încet decât azi.** Ținta rămâne cea din GDD: 60 de cadre pe secundă cu 150 de dușmani pe telefonul lui Andrei.
- **Se joacă altfel.** Orice diferență de comportament față de azi e o greșeală, nu o îmbunătățire.

## Constrângeri

- Regulile din `CLAUDE.md` rămân: simulare deterministă și fără DOM, cifrele de joc doar în `src/data/`, textele doar în `src/ui/strings.ts`, desenul doar citește starea.
- Fluxurile de numere aleatoare ale simulării își păstrează numele (`'harta'`, `'aparitie-N'`). De ele depind harta și aparițiile, deci și scopul 4.
- Recordul lui Andrei rămâne: cheia `wg.v1.record` nu se schimbă.
- Fără apeluri de rețea în joc. Fonturile vin din pachete, ca azi.
- Tot ce se desenează de multe ori pe cadru (nave, raze, resurse, clădiri) e din forme pline și linii: fără gradient, fără decupaj și fără umbră estompată per obiect. Planeta e una singură și are voie cu gradient și decupaj. Cerul se pictează o singură dată, ca terenul de azi.

## Aspectul „Orbită”

Referința pentru forme și culori este varianta 1 din [`docs/machete-tema-spatiu.html`](../../machete-tema-spatiu.html) (obiectul `ORBIT` și funcțiile lui ajutătoare). Aceeași pagină e publicată la https://claude.ai/artifact/KGofW3Q4GmnxT1Zx73wvtN. Unde macheta și documentul diferă, câștigă documentul.

Macheta e desenată la mărimile din joc: planeta are raza castelului, nava pe a eroului, navele dușmane pe ale dușmanilor de azi. Mărimile de coliziune nu se schimbă.

| Azi | În „Orbită” | Cum se desenează |
|---|---|---|
| Terenul cu iarbă | Cerul | Fond albastru-închis, pete de nebuloasă, stele mărunte și câteva sclipiri. Pictat o dată pe toată harta. |
| Linia de copaci întunecați de pe margine | Marginea lumii | O bandă care se întunecă spre margine, de aceeași lățime ca azi, ca să se vadă de unde vin navele. |
| Castelul | Planeta | Disc cu ocean, continente care alunecă încet, calotă, nori, umbră pe o parte și o dungă de lumină pe cealaltă. În jur, o aură de atmosferă. |
| Bara de viață de deasupra castelului | Inelul-scut | Un inel subțire în jurul planetei. Partea aprinsă arată câtă viață a rămas. Sub pragul de viață scăzută ia culoarea dușmanilor. La lovitură, inelul și planeta clipesc. |
| Steagul castelului | Un satelit mic | Un punct care dă ocol planetei. |
| Eroul | Nava ta | Săgeată galbenă cu aripi și cabină, întoarsă încotro privește eroul. Flacără la motor doar când se mișcă. Fără legănatul de mers. |
| Lovitura cu sabia | Unda navei | Același arc ca azi, în alb-albăstrui. Sabia care crește cu nivelul dispare; nivelul se vede din punctele de deasupra, ca azi. |
| Copacii (lemn) | Cristale | Trei țăndări verzi-turcoaz pe un bolovan mic și închis. Se micșorează pe măsură ce sunt strânse. Golite, rămâne un ciot care crește la loc în același ritm ca puietul de azi. |
| Stâncile (piatră) | Asteroizi | Bolovan colțuros violet-cenușiu, cu un crater și trei fulgi deschiși de metal. Se rotește încet. Golit, rămân câteva fărâme. |
| Turnul | Turela | Disc metalic cu două panouri solare și o țeavă. Țeava arată spre cea mai apropiată navă dușmană din raza turelei; când nu e niciuna, arată dinspre planetă în afară. Numărul nivelului stă în mijloc, ca azi. |
| Tăietorii | Colectorul | Cutie metalică rotunjită cu o dungă în culoarea cristalelor, o antenă-farfurie, o grămăjoară de cristale alături și o dronă mică ce îi dă ocol. Punctele de nivel deasupra, ca azi. |
| Cariera | Mina | La fel ca colectorul, cu dunga și grămăjoara în culoarea metalului. |
| Săgețile | Raze | Liniuță albă-albăstruie cu un halou lat și străveziu. |
| Dușmanul obișnuit | Navă invadatoare | Forma de săgeată de azi, roșie, cu cabină închisă la culoare și flacără portocalie la motor. |
| Bruta | Navă grea | Mai lată, cu două gheare în spate, roșu-închis cu contur roșu. |
| Umbrele de sub obiecte | Nimic | În spațiu nu există sol, deci umbrele dispar. |
| Cercurile de investit | La fel | Cercuri punctate, cu același nume și cost dedesubt. Semnul din mijloc: țintă pentru turelă, romb pentru colector, hexagon pentru mină, săgeată de navă pentru navă, plus pentru reparat. |
| Pătrățelele de cost | Jetoane cu formă | Romb pentru cristale, hexagon pentru metal, și pe hartă, și în banda de sus, și pe cartonașul de start. |
| Indicatorul spre castel | Indicatorul spre planetă | Același inel cu săgeată; înăuntru, un disc mic de planetă în locul castelului. |

Rămân cum sunt: banda de sus (cu numele noi), cartonașele, joystickul, textele plutitoare, cercul și numărătoarea de la reapariția navei, norișorii de la doborâre, barele de viață ale navei și ale dușmanilor.

Ordinea straturilor se schimbă într-un singur loc. Navele care atacă se opresc cu centrul la 65 sau 70 de unități de centrul planetei, adică exact pe inel, care e la 64. De aceea:

1. Cerul.
2. Cercurile de investit.
3. Planeta, cu aura ei. Nu mai intră în sortarea după înălțime: văzută de sus, în spațiu, nu acoperă nimic.
4. Resursele, clădirile, navele dușmane și nava ta, sortate ca azi.
5. Inelul-scut, peste nave. Rămâne mereu vizibil, iar navele care atacă par lipite de scut.
6. Razele și textele plutitoare, ca azi.

Mișcările care apar doar în desen (continentele, norii, satelitul, rotirea asteroizilor, drona, flăcările, țeava turelei) se calculează din timpul partidei și din stare. Nu scriu nimic în stare și nu au memorie proprie.

### Culorile, pe roluri

| Rol | Culoare |
|---|---|
| Cerul, sus și jos | `#0c1236`, `#090c26` |
| Nebuloase (străvezii) | `#3b2a86`, `#0f4a6a`, `#6a2a7a`, `#2a3aa0` |
| Stele | `#ffffff`, `#c9dcff`, `#ffe9c9` |
| Ocean, continente, umbra continentelor | `#2f7fd8`, `#4fc98a`, `#39b077` |
| Atmosfera și inelul-scut | `#78cdff`, `#8fe9ff` |
| Nava ta, conturul ei | `#ffcf4a`, `#b8860b` |
| Flacăra navei tale | `#8fe9ff`, `#ffffff` |
| Navele dușmane, cele grele, flacăra lor | `#ff4d6d`, `#a81f44`, `#ffb347` |
| Cristale: bază, lumină, umbră, bolovanul de dedesubt | `#4fe3c1`, `#a8f7e4`, `#22a58c`, `#343062` |
| Asteroizi: umbră, lumină, crater, fulgi de metal | `#5f5a86`, `#8d88b5`, `#4d4973`, `#e9e6ff` |
| Jetonul de metal | `#b3aee6` |
| Clădiri: corp, umbră, panouri solare | `#dfe6f7`, `#8a94b8`, `#3f73d9` |
| Raze: miez, halou | `#d8fbff`, `#8fe9ff` străveziu |
| Text, text stins, fond de noapte | `#f1f4ff`, `#9fa9c9`, `#060a1f` |
| Banda de sus și cartonașele | noaptea de mai sus, străvezie ca azi |

### Fonturile

Titlul, butoanele mari și cifrele din bandă trec de la Alfa Slab One la **Exo 2**, greutatea 800, cu diacritice românești. Pachetul `@fontsource/alfa-slab-one` iese, intră cel pentru Exo 2. Rubik rămâne fontul de interfață.

Cifrele ceasului și ale stocului nu au voie să tremure când se schimbă. Dacă Exo 2 nu are cifre de lățime egală, se rezolvă din CSS.

## Textele

| Azi | Nou |
|---|---|
| Castel | Planetă |
| Erou | Navă |
| lemn | cristale |
| piatră | metal |
| Turn | Turelă |
| Tăietori | Colector |
| Carieră | Mină |
| Repară castelul | Repară planeta |
| Eroul a căzut | Nava a fost doborâtă |
| Castelul a căzut | Planeta a căzut |
| Dușmani doborâți | Nave doborâte |
| Terenul de joc | Zona de joc |
| Ține degetul pe ecran și trage ca să miști eroul | Ține degetul pe ecran și trage ca să miști nava |
| Ține degetul pe ecran și trage. Eroul merge încotro tragi. | Ține degetul pe ecran și trage. Nava merge încotro tragi. |
| Stai lângă copaci și stânci ca să strângi lemn și piatră. | Stai lângă cristale și asteroizi ca să strângi cristale și metal. |
| Oprește-te pe un cerc punctat ca să investești în turnuri, tăietori, carieră sau erou. | Oprește-te pe un cerc punctat ca să investești în turele, colector, mină sau navă. |
| Eroul lovește singur ce e aproape. Partida ține până cade castelul. | Nava lovește singură ce e aproape. Partida ține până cade planeta. |

Restul textelor rămân: World Guard, Începe, Test de viteză, Ai rezistat, Record, Record nou, Încă o partidă, „nivel N”, „nivel maxim”, „1 = +5 viață”, „+1”.

## Numele din cod

Numele noi descriu rolul, nu aspectul, ca să se potrivească și cu „Colonie”, unde ce aperi e o bază, nu o planetă.

| Azi | Nou | Unde apare |
|---|---|---|
| `wood` | `crystal` | tipul `Res`, câmpul din stare, `paid`, `BALANCE.node`, costuri, texte, clase și id-uri din pagină |
| `stone` | `metal` | la fel |
| `castle`, `CASTLE` | `core`, `CORE` | starea, `BALANCE`, așezarea, pagina; și numele compuse (`hitCastleEvery` devine `hitCoreEvery`, `stopCastle` devine `stopCore`, `castleHp` devine `coreHp`) |
| `tower` | `turret` | `PadKind`, `BALANCE`, `towerDamage` devine `turretDamage` |
| `camp` | `collector` | `PadKind`, `BALANCE`, tabelul de costuri |
| `quarry` | `mine` | `PadKind`, `BALANCE`, tabelul de costuri |
| `swingT`, `swingEvery` | `strikeT`, `strikeEvery` | starea navei, `BALANCE.hero`: cât mai e până la următoarea lovitură |
| `slashT`, `slashA` | `waveT`, `waveA` | starea navei: când și încotro a pornit ultima undă, pentru desen |
| `walk` | dispare | starea navei: hrănea doar legănatul de mers, care nu mai există |

Rămân neschimbate, fiindcă descriu deja un rol: `hero`, `foe`, `grunt`, `brute`, `shot`, `node`, `pad`, `repair`, `fx`, `moved`. Pe ecran, `hero` e „Navă”. În comentarii, „erou”, „dușman” și „brută” pot rămâne, ca nume ale acelor roluri.

Scoaterea lui `walk` e singura schimbare din stare care nu e o redenumire. Nu schimbă comportamentul: nimic din reguli nu îl citește.

Comentariile și numele testelor, care sunt în română, trec și ele pe cuvintele noi: nucleu sau planetă în loc de castel, turelă, colector, mină, cristale, metal, rază, cer, undă.

### Cuvintele temei vechi

Lista de mai jos e cea pe care o caută verificarea „niciun nume vechi”, fără deosebire între litere mari și mici, inclusiv în nume compuse.

- În engleză: `wood`, `stone`, `castle`, `tower`, `camp`, `quarry`, `swing`, `slash`, `blade`, `walk`, și numele de culori `ground`, `grass`, `dirt`, `rock`, `pine`, `trunk`.
- În română: castel, turn (cu formele lui), lemn, piatră, copac, stâncă, tăietor, carieră, iarbă, teren, zid, sabie, steag, puiet.
- „Săgeată” rămâne permis doar pentru formă și pentru indicatorul spre planetă. Proiectilele sunt „raze”. Asta se verifică citind, nu căutând.

Cuvinte care doar conțin unul din listă nu se pun la socoteală (de pildă `background`).

Variabilele de culoare din CSS primesc nume pe roluri, fără cuvinte ale temei vechi (azi se numesc `--pine`, `--trunk`, `--dirt` și altele asemenea).

Forma stării salvate se schimbă odată cu numele câmpurilor. Azi nu se salvează nicio partidă, deci nu se pierde nimic; faza 2, care aduce salvarea, pornește direct cu numele noi.

## Unde stă aspectul

Tot ce ține de „Orbită” pe canvas stă într-un singur modul din `src/render/`, în spatele unei interfețe: cerul, planeta, resursele, clădirile, navele, razele, forma jetoanelor și discul din indicatorul spre planetă. `world.ts` păstrează ce ar fi la fel în orice aspect: ordinea straturilor, săritul peste ce nu se vede, cercurile, etichetele, barele și textele plutitoare.

Nu se construiește un al doilea aspect și nici un comutator. Împărțirea există ca „Colonie” să fie, mai târziu, un al doilea modul și nu o rescriere.

## Abordări

1. **Doar haina.** Se schimbă desenul, culorile, textele și fontul; numele din cod rămân. E cel mai puțin de lucru și regulile rămân neatinse, dar codul ar zice „lemn” unde ecranul zice „cristale”.
2. **Haina și numele din cod.** Ca la 1, plus redenumirea în tot codul. Numele vechi apar în 23 din cele 45 de fișiere de cod (măsurat pe 2026-11-17), cu regulile și testele lor. Munca e mecanică și păzită de teste.
3. **Două haine de pe acum.** „Orbită” și „Colonie”, cu un comutator. E cel mai mult de lucru, iar „Colonie” n-are unde să fie folosită până nu există misiuni.

**Andrei a ales 2.** Motivul recomandării: redenumirea e cea mai ieftină acum, cât jocul e mic și nu salvează încă partide, iar sesiunile viitoare citesc un cod care se potrivește cu jocul.

## Cum se verifică

- **Aceeași partidă, înainte și după.** Înainte de orice redenumire, un test nou joacă o partidă cu comenzi scrise dinainte și ține minte cifrele ei la câteva momente: timpul, viața nucleului, stocul, poziția, viața și nivelul navei, nivelul fiecărui cerc, câte nave au fost doborâte, câte sunt pe hartă și suma vieților lor. Partida trebuie să treacă prin tot: strâns din ambele resurse, plătit pe fiecare fel de cerc, turele care trag, nava care lovește și e doborâtă, o navă grea. Cifrele se măsoară pe codul de azi și se scriu în test. După redenumire, testul trebuie să dea aceleași cifre; în el se schimbă doar numele. Testul e schelă: la sfârșitul lucrării se șterge, iar ultimele lui cifre se trec în `DEVLOG.md`. Păstrat, ar trebui remăsurat la fiecare schimbare voită de reguli sau de cifre, începând cu faza 2.
- **Niciun nume vechi.** O căutare a listei din „Cuvintele temei vechi” prin `src/`, `scripts/` și `index.html` nu mai găsește nimic. Se face o dată, la sfârșit, și rezultatul se trece în `DEVLOG.md`; nu devine test permanent.
- **`npm run check` și `npm run smoke` trec.** Proba din browser așteaptă „Planeta a căzut”. Capturile ei se refac și se compară din ochi cu macheta.
- **Viteza desenului.** Cu 150 de nave pe hartă, timpul mediu de desenare al unui cadru se măsoară în browserul de test înainte și după, pe aceeași mașină. Dacă după e cu peste un sfert mai mare decât înainte, se simplifică formele desenate de multe ori. Pragul de un sfert e propunerea lui Claude.
- **Pe telefon.** Andrei joacă o partidă și rulează „Test de viteză”. Cifrele lui de pe A54 pentru aspectul de azi lipsesc încă, deci se notează măcar cele noi.

## Documente de adus la zi

- `docs/GDD.md`: hotărârile de mai sus intră în „Cine a hotărât ce”; regulile și cifrele folosesc numele noi; misiunile speciale intră la „Ce ar putea veni după v1”.
- `CLAUDE.md`: descrierea jocului, arhitectura, starea.
- `DEVLOG.md`: intrarea lucrării.
- `docs/superpowers/plans/2026-11-17-world-guard-faza-2.md`: numele din text și din exemplele de cod; iconița aplicației se descrie pe tema nouă.
- `docs/prototip.html` rămâne neatins, ca referință pentru comportament. Aspectul lui e cel vechi.

## Misiunile speciale

Idee a lui Andrei, pentru după v1: partide de alt fel, pe suprafața planetei, cu aspectul „Colonie”. Ce e o misiune, cum ajungi la ea și cum se termină nu s-a discutat. Va avea designul ei. Macheta aspectului e varianta 3 din pagina cu machete.

## Lăsat constructorului

- Numele și împărțirea fișierelor din `src/render/`, cât timp aspectul stă într-un singur modul.
- Numele variabilelor de culoare.
- Formele exacte, cât timp jocul seamănă dintr-o privire cu macheta.
- Cum arată marginea lumii și fărâmele unui asteroid golit.
- Dacă turela clipește când trage.
- Comenzile partidei din testul „aceeași partidă”.
- Cum se obțin jetoanele cu formă în banda de sus și pe cartonașe.

## Când e gata

- Tot ce e în „Cum se verifică” e făcut, cu cifrele măsurate scrise în `DEVLOG.md`.
- Andrei joacă pe telefon și spune că arată ca varianta 1 și că deosebește dintr-o privire nava lui, navele dușmane, cristalele și asteroizii.
