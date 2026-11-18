# World Guard: designul primei versiuni

Scris pe 2026-11-13, actualizat pe 2026-11-18 (tema de spațiu). Sursa: documentul „World Guard: designul primei versiuni”, aprobat de Andrei pe 2026-11-17.

Prima versiune este jocul din prototip făcut ca proiect adevărat: instalat pe telefon, jucabil fără internet, cu cifre ușor de reglat și cu o plasă care prinde stricarea dificultății. Se construiește în repo-ul WorldGuard, unde ia locul jocului de acolo.

## Intenția

Andrei vrea un joc de mobil de tip castle defense (așa l-a numit el) pe care să-l joace el, deocamdată. Tema de azi e de spațiu: ce aperi e o planetă, eroul e o navă, resursele sunt cristale și metal. Miezul, în cuvintele lui: „Jucătorul adună resurse și decide unde le investește.”

„Deocamdată” contează. Nimic din v1 nu trebuie să blocheze o publicare ulterioară, dar nimic nu se construiește pentru ea acum.

Referința pentru cum se simte jocul (comportament) este [prototipul de aruncat](https://claude.ai/artifact/ENwSUvGDA7eXnFRDiP7atc), pe care Andrei l-a încercat; aspectul lui e cel vechi, cu castel. Unde documentul ăsta și prototipul diferă, câștigă documentul. Aspectul de azi e „Orbită”, descris în [`docs/superpowers/specs/2026-11-17-tema-spatiu-design.md`](superpowers/specs/2026-11-17-tema-spatiu-design.md), care rămâne sursa pentru cum arată tema; documentul de față rămâne sursa pentru reguli.

## Cine a hotărât ce

**Hotărât de Andrei. Nu se redeschide fără el.**

1. Jocul e pentru el, deocamdată.
2. Totul e în timp real. Dușmanii vin continuu și investești sub presiune.
3. Resursele le strânge un erou controlat cu joystick virtual.
4. Eroul luptă și el: atacă singur ce e aproape și se poate investi în el.
5. A încercat prototipul și a spus că totul pare în regulă pentru acum.
6. Joacă pe un Samsung Galaxy A54.
7. Jocul se construiește în repo-ul WorldGuard.
8. Jocul nou înlocuiește ce e făcut acolo.

Hotărârile 1–8 sunt în cuvintele lor de dinainte de tema de spațiu: „eroul” de acolo e, pe ecran, „nava”. Următoarele cinci sunt din 2026-11-17, din [specul temei](superpowers/specs/2026-11-17-tema-spatiu-design.md), secțiunea „Cine a hotărât ce”:

9. Tema jocului devine planetă, spațiu, nave și resurse cosmice.
10. Se schimbă doar estetica. Fără inerție, fără zbor real: nava se mișcă exact ca eroul de dinainte.
11. Aspectul jocului este varianta 1, „Orbită”, din pagina cu machete (`docs/machete-tema-spatiu.html`).
12. Varianta 3, „Colonie”, e păstrată pentru misiuni speciale.
13. Se schimbă și numele din cod, nu doar ce se vede (abordarea 2 din spec).

**Propus de Claude și acceptat de Andrei când i-a fost arătat întregul.**

- Trei direcții de investit: economie, apărare, erou (pe ecran, navă).
- Nava doborâtă reapare la planetă după câteva secunde. Partida se termină doar când cade planeta.
- Partida nu are sfârșit și devine tot mai grea. Scorul e cât ai rezistat.
- Aspect din forme simple. Arta vine mai târziu.
- Fără îmbunătățiri păstrate de la o partidă la alta în prima versiune.
- Din spec, văzute de Andrei pe pagina cu machete și lăsate neschimbate: numele de pe ecran (Planetă, Navă, cristale, metal, Turelă, Colector, Mină) și viața planetei desenată ca inel în jurul ei, în locul barei de deasupra castelului.

**Hotărât de Claude, nevăzut încă de Andrei.**

Andrei a vorbit despre rezultate, nu despre unelte, deci alegerile de mai jos sunt ale lui Claude și pot fi respinse.

- Uneltele și împărțirea codului (secțiunea „Cum se construiește”), inclusiv desenatul pe Canvas 2D.
- Ce e nou față de prototip: pauza, instalarea, reluarea unei partide întrerupte.
- Plasa pentru dificultate, inclusiv care strategii trebuie să piardă.
- Ce se păstrează din WorldGuard și ce se înlocuiește.
- Jocul nou preia numele de lucru World Guard.
- Găzduirea pe GitHub Pages.
- Din spec: misiunile speciale sunt un proiect separat, după v1; tema se construiește înaintea fazei 2; numele din cod descriu rolul, nu aspectul; fontul titlului și al cifrelor e Exo 2; testul „aceeași partidă” a fost o schelă temporară (ștearsă la sfârșitul lucrării); inelul-scut se desenează peste nave; câmpurile loviturii au nume fără sabie, iar câmpul `walk` a dispărut din stare.

## Ce se întâmplă cu WorldGuard

Jocul nou ia locul celui din repo, iar designul vechi nu se continuă. Scheletul proiectului și regulile de lucru rămân.

Azi repo-ul are un singur commit, din 04.10.2026: designul v0.1 al unui tower defense roguelite pe hexagoane, cu țintă comercială pe Steam, și pasul 0 al prototipului lui. Designul are 19 decizii marcate „decis”. Codul are 1.122 de linii și, după jurnalul proiectului, 33 de teste.

| Ce e în repo | Soarta | De ce |
| --- | --- | --- |
| Designul vechi (`docs/GDD.md`) și cele 19 decizii din el | înlocuit | Jocul nou e alt joc: fără hexagoane și fără traseu, cu erou, pentru telefon. Deciziile vechi nu i se aplică. |
| Harta, drumul, jurnalul de decizii, desenatul și testele lor | înlocuite | Sunt regulile jocului vechi. |
| Scheletul: TypeScript, Vite, Vitest, poarta `npm run check` | păstrat | E exact ce cere jocul nou. |
| `rng.ts`, `result.ts`, `discipline.test.ts` | păstrate | Dau hazard cu sămânță și păzesc simularea de ceasul mașinii și de hazardul global. |
| Regulile de lucru din `CLAUDE.md` | păstrate | Sunt ale lui Andrei, nu ale jocului vechi. |
| `DEVLOG.md` | continuat | E un jurnal care doar crește. Primește o intrare despre înlocuire. |

Regulile de lucru care rămân:

- Poarta `npm run check` trece înainte de fiecare commit.
- Fiecare felie primește o intrare în `DEVLOG.md`.
- Fișierele se stagează explicit, niciodată cu `git add -A`.
- Designul e al lui Andrei. Ce propune Claude se marchează ca propunere până decide el.
- O cifră care ajunge într-o decizie se măsoară, nu se estimează.
- Cifrele de joc stau în `src/data/`, nu în cod.
- Întâi un joc jucabil, apoi infrastructura de verificare.

O regulă veche nu se păstrează: „orice acțiune a jucătorului e o decizie în jurnal”. Era făcută pentru un joc cu mutări rare. La un joc cu joystick, jurnalul ar însemna direcția la fiecare pas. Rămâne determinismul: aceeași sămânță cu aceleași comenzi dă aceeași stare.

Înlocuirea se face printr-un commit obișnuit pe o ramură, cu pull request. Istoria nu se rescrie. Ultimul commit al jocului vechi primește o etichetă, ca designul și codul vechi să poată fi regăsite oricând.

Jocul nou preia numele de lucru World Guard, care e și numele repo-ului. „Straja Castelului” a fost doar numele prototipului.

## Ce a arătat prototipul

Investiția doar în navă (în prototip, erou) ține la fel de mult ca a construi, deci tensiunea dintre cele trei direcții nu e încă asigurată de cifre. V1 trebuie să o asigure (vezi „Plasa pentru dificultate”).

Măsurători făcute în prototip cu jucători automați, la 30 de pași pe secundă:

| Jucător automat | Ce face | Cât a rezistat |
| --- | --- | --- |
| Nimic | stă pe loc | 94 s (o partidă) |
| Constructor | strânge și construiește într-o ordine fixă; nu luptă intenționat, nu repară | 247 s, 294 s, 303 s |
| Doar erou (navă) | pune totul în nivelul eroului și luptă lângă planetă | 291 s, 293 s, 295 s, 297 s |

Neverificat: performanța pe un telefon real. Despre cum se simte la atingere există doar spusa lui Andrei că e în regulă.

## Scopuri și limite

### Scopuri pentru v1

1. Jocul din prototip, cu aceleași reguli și aceeași senzație, reconstruit ca proiect.
2. Se instalează pe ecranul de pornire al telefonului, rulează pe tot ecranul și merge fără internet.
3. Se poate pune pe pauză, cu buton și automat când aplicația trece în fundal.
4. Recordul rămâne pe telefon între sesiuni.
5. Toate cifrele de echilibru stau într-un singur loc și se pot schimba fără a atinge restul codului.
6. O comandă arată cât rezistă jucătorii automați, iar testele pică dacă dificultatea iese din limite.
7. Nicio strategie care ignoră o direcție nu bate un amestec: nici „doar navă”, nici „fără navă”.
8. O partidă întreruptă de telefon se poate relua.

### Ne-scopuri pentru v1

- Conturi, salvare în cloud, clasamente, multiplayer.
- Magazin de aplicații, monetizare, reclame.
- Firebase sau orice alt server. Regula lui Andrei despre instanțe test și live nu are obiect aici până nu apare un backend.
- Sunet, muzică, vibrații.
- Grafică desenată. Rămân formele simple.
- Îmbunătățiri păstrate de la o partidă la alta, mai multe hărți, tipuri noi de clădiri sau de dușmani. Reluarea unei partide întrerupte nu intră aici; ea este în v1.
- Altă limbă decât româna.
- iPhone.

### Anti-scopuri

Jocul a eșuat, chiar dacă merge tehnic, dacă:

- **O singură direcție de investit e răspunsul evident.** Atunci nu mai există decizie, iar decizia e jocul.
- **Devine joc de acțiune.** Nava luptă, dar partida se câștigă prin ce alegi să construiești.
- **Cheltui fără să vrei.** Trecutul în fugă peste un cerc nu trebuie să consume resurse.
- **Are nevoie de internet ca să pornească o partidă.**
- **Primul minut cere citit.** Regulile trebuie să se vadă din ce e pe ecran.

### Constrângeri

- Telefon ținut vertical, jucat cu un singur deget. Orizontal trebuie doar să nu se strice.
- Telefonul de referință e Samsung Galaxy A54 al lui Andrei: Android, ecran de 120 Hz.
- Țintă de 60 de cadre pe secundă cu 150 de dușmani pe hartă, pe telefonul de referință. Simularea rulează la 60 de pași pe secundă indiferent de ecran.
- Fără niciun apel de rețea în timpul jocului.
- Interfața e în română. Textele stau într-un singur modul, ca o traducere să fie ieftină mai târziu.
- Simularea dă același rezultat pentru aceeași sămânță și aceleași comenzi, indiferent de numărul de cadre pe secundă.

## Regulile jocului

**Lumea.** Hartă văzută de sus, de 1100 × 1500 unități, aceeași la fiecare partidă. Planeta e un cerc cu raza 54, în centru (550, 750); în cod e „nucleul” (`core`). Camera urmărește nava și o ține puțin deasupra mijlocului ecranului, ca degetul să nu o acopere. Scara este cea mai mare dintre înălțimea ecranului / 880 și lățimea / 1100.

**Nava (eroul).** Se mișcă cu un joystick care apare unde atingi ecranul. Baza joystickului urmează degetul la o tragere lungă. Viteza maximă se atinge la 70% din cursă, iar sub 14% nava stă. Nu are inerție: pornește și se oprește pe loc. Pe calculator merg și tastele WASD sau săgețile. Nava se lovește de planetă, de cristalele și asteroizii negoliți și de clădiri. Trece prin dușmani.

**Strânsul.** Cât nava e la cel mult 16 unități de marginea unui cristal sau a unui asteroid, strânge singură, bucată cu bucată. Cristalul și asteroidul se micșorează pe măsură ce se golesc, apoi cresc la loc după un timp.

**Investitul.** Fiecare lucru de cumpărat are un cerc punctat pe hartă, cu raza 28, cu numele și costul rămas scrise sub el.

- Plata începe după 0,35 s de stat pe cerc și curge bucată cu bucată.
- Plata parțială rămâne în cerc dacă pleci.
- După ce un nivel e plătit, urmează o pauză de aproximativ o secundă înainte să înceapă plata pentru următorul.
- Un cost pe care nu ți-l permiți e scris estompat.
- Cât stai pe cercul unei turele, se vede raza ei de tragere.

**Ce se poate cumpăra.**

| Direcție | Ce | Ce face |
| --- | --- | --- |
| Apărare | 4 turele, la colțurile planetei (±125, ±125 față de centru) | trag singure în cea mai apropiată navă dușmană din rază |
| Apărare | reparat planeta | schimbă metal pe viața planetei |
| Economie | colectorul, lângă cristalele din vest | produce cristale singur |
| Economie | mina, lângă asteroizii din nord | produce metal singură |
| Navă | nivelul navei | mai multă viață și lovitură mai tare |

**Lupta.** Nava lovește singură, la intervale fixe, toți dușmanii aflați în raza ei într-un arc de aproximativ 143° în jurul celui mai apropiat, și îi împinge înapoi. Își reface viața dacă nu e lovită o vreme. Doborâtă, reapare lângă planetă după câteva secunde, timp în care nu strânge și nu plătește.

**Dușmanii.** Sunt nave. Apar într-un punct la întâmplare de pe marginea hărții și merg drept spre planetă. Ajunse la inelul ei, o lovesc. Dacă nava ta e la mai puțin de 90 de unități, o urmăresc și o lovesc pe ea. Nu atacă turelele sau clădirile. Există două feluri: nava invadatoare, obișnuită, și nava grea, care apare mai rar, mai târziu, cu mai multă viață.

**Sfârșitul.** Partida se termină când viața planetei ajunge la zero. Ecranul de final arată cât ai rezistat, recordul și câte nave ai doborât.

**Ce se vede mereu.** O bandă sus cu cristalele, metalul, ceasul și viața planetei, care se înroșește când planeta e lovită. Viața planetei se vede și ca inel-scut în jurul ei. Când planeta iese din ecran, un indicator pe margine arată încotro e și câtă viață are, și pulsează roșu când e atacată.

## Cifrele de pornire

Sunt cifrele cu care s-a încheiat prototipul. Sunt punct de plecare, nu țintă: se vor schimba ca să treacă plasa pentru dificultate. Timpul t e în secunde de la începutul partidei.

| Lucru | Valoare |
| --- | --- |
| Planetă | 400 viață |
| Navă (eroul) | raza 13; viteză 165/s; 60 viață, +20 pe nivel; lovitură 10, +6 pe nivel; raza loviturii 58; o lovitură la 0,45 s; împinge 140 (60 pe cei grei); reface 4 viață/s după 3 s fără lovituri; reapare după 5 s; nivel maxim 5 |
| Start | 20 cristale, 0 metal |
| Cristal | 8 cristale; o bucată la 0,3 s; crește la loc la 18 s după ce se golește |
| Asteroid | 6 metal; o bucată la 0,42 s; crește la loc la 24 s |
| Turelă | raza 190; o tragere la 0,8 s; lovitură 6 + 5 × (nivel − 1); nivel maxim 5 |
| Cost turelă, nivelul n | cristale 20 + 15 × (n − 1); metal 15 × (n − 1) |
| Colector, nivelurile 1–3 | un cristal la 1,6 / 1,0 / 0,7 s; cost 25 cristale / 40 cristale + 15 metal / 60 cristale + 35 metal |
| Mină, nivelurile 1–3 | un metal la 2,4 / 1,5 / 1,0 s; cost 35 cristale / 45 cristale + 20 metal / 60 cristale + 40 metal |
| Cost navă, nivelul n (2–5) | cristale 25 + 15 × (n − 2); metal 10 + 15 × (n − 2) |
| Reparat | 1 metal dă 5 viață planetei; 10 metal pe secundă |
| Plată | o bucată la 0,035 s |
| Primul dușman | la 10 s |
| Ritmul dușmanilor | unul la fiecare max(0,6; 5 / (1 + t / 90)) secunde |
| Viața dușmanului | 14 × (1 + t / 80) |
| Dușman obișnuit (navă invadatoare) | raza 10; viteză 46/s; 3 viață pe lovitură; lovește planeta o dată pe secundă, nava ta la 0,8 s |
| Dușman greu (navă grea) | fiecare al 7-lea, după 120 s; viață × 4; raza 15; viteză 30/s; 9 viață pe lovitură |

Resursele apropiate sunt puține, iar metalul mult e departe. Asta e intenționat: distanța e prețul.

| Fel | Centrul grupului | Câte | Raza grupului |
| --- | --- | --- | --- |
| cristale | (300, 640) | 6 | 62 |
| cristale | (810, 900) | 6 | 62 |
| cristale | (180, 230) | 8 | 78 |
| cristale | (420, 1300) | 8 | 78 |
| cristale | (900, 330) | 7 | 72 |
| asteroizi | (560, 400) | 4 | 50 |
| asteroizi | (980, 640) | 5 | 56 |
| asteroizi | (150, 1050) | 6 | 62 |
| asteroizi | (900, 1330) | 5 | 56 |

Cercurile de investit:

- Turelele au cercul la 44 de unități sub ele.
- Colectorul are clădirea la (300, 730) și cercul la (300, 776).
- Mina are clădirea la (650, 392) și cercul la (650, 438).
- Nava are cercul la 150 deasupra planetei.
- Reparatul are cercul la 100 sub planetă.

## Ce e nou față de prototip

1. **Pauză.** Buton în banda de sus și pauză automată când aplicația trece în fundal. Cartonașul de pauză are „Continuă” și „Partidă nouă”. Cât e pauză, simularea nu avansează.
2. **Instalare și joc fără internet.** Aplicație web instalabilă, cu toate fișierele păstrate pe telefon. O versiune nouă se activează la următoarea pornire, niciodată în mijlocul unei partide.
3. **Ecranul rămâne aprins** cât ține partida, acolo unde telefonul permite.
4. **Simulare cu pas fix și sămânță.** Fiecare partidă are o sămânță pentru punctele de apariție ale dușmanilor.
5. **Plasa pentru dificultate**, descrisă mai jos.
6. **Recordul** se păstrează sub o cheie cu versiune. Dacă telefonul refuză stocarea, jocul merge fără record.
7. **Reluarea partidei.** Telefoanele închid des aplicațiile trecute în fundal. La fiecare pauză, jocul salvează pe telefon starea întreagă a partidei, cu tot cu starea generatorului de hazard. La următoarea pornire, cartonașul de start oferă „Continuă partida” lângă „Partidă nouă”. Salvarea are versiune și se șterge la sfârșitul partidei sau la o partidă nouă. O salvare cu altă versiune se aruncă fără eroare.

## Abordări

Ales: joc web cu TypeScript și Vite, desenat pe Canvas 2D, fără dependențe de rulare. Andrei a lăsat alegerea uneltelor lui Claude, care a cântărit trei drumuri. Prima variantă a documentului alesese PixiJS; alegerea s-a schimbat după ce Andrei a ales WorldGuard, care folosește deja Canvas 2D.

| Drum | Ce aduce | Ce costă | Verdict |
| --- | --- | --- | --- |
| A. Joc web cu Canvas 2D | E ce folosește deja WorldGuard, fără nicio dependență de rulare. Desenatul din prototip se mută aproape neschimbat, deci jocul ajunge mai repede pe telefon. Se poate porni și testa în sesiunile din cloud. | Dacă vin grafică desenată, particule sau mult mai mulți dușmani, desenatul s-ar putea să trebuiască mutat pe PixiJS. | Ales. Costul unei mutări e mic, pentru că simularea e separată de desenat. |
| B. Joc web cu PixiJS | Mai multă rezervă de viteză și drum pregătit pentru grafică desenată. | O dependență nouă într-un proiect care nu are niciuna și desenatul din prototip rescris, înainte ca vreo măsurătoare să o ceară. | Rezervă. Se trece la el doar dacă măsurătoarea pe A54 o cere. |
| C. Motor de jocuri: Unity sau Godot | Drumul firesc dacă ținta ar fi magazinul de la început. | În sesiunile din cloud nu poate fi rulat, deci codul s-ar scrie fără a fi văzut mergând. Andrei ar construi și instala pe telefon la fiecare încercare. | Respins |

## Cum se construiește

Jocul are cinci părți care se pot înțelege separat. Trei dintre ele au deja folderul lor în WorldGuard:

- **Simularea** (`src/sim/`). TypeScript curat, fără browser. Ține starea partidei și o avansează cu un pas fix de 1/60 s, primind doar direcția joystickului. Hazardul vine din generatorul cu sămânță care există deja în repo. Starea e din date simple, ca să poată fi salvată și reluată.
- **Cifrele** (`src/data/`). Cifrele de echilibru și așezarea hărții, ca date.
- **Desenatul** (`src/render/`). Canvas 2D. Citește starea și o arată. Nu schimbă niciodată starea. Aspectul „Orbită” stă într-un singur modul, în spatele interfeței `Skin`, ca un al doilea aspect („Colonie”) să se poată adăuga fără a atinge regulile.
- **Comenzile.** Joystickul și tastele produc un vector de direcție.
- **Interfața.** Banda de sus și cartonașele (start, pauză, final) sunt HTML și CSS simplu peste zona de joc, fără bibliotecă de interfață.

Bucla rulează simularea cu acumulator: cel mult 5 pași pe cadru, restul se aruncă, ca un telefon lent să încetinească jocul în loc să-l blocheze.

**Teste.** Vitest pe simulare: plata pe cerc (inclusiv întârzierea și plata parțială), strânsul, ținta turelelor, curba dușmanilor, căderea și reapariția navei, sfârșitul partidei, faptul că aceeași sămânță cu aceleași comenzi dă aceeași stare, și faptul că o partidă salvată și reluată continuă identic cu una neîntreruptă.

**Găzduire.** GitHub Pages, publicat de GitHub Actions la fiecare push pe ramura principală. Repo-ul e public, deci adresa jocului va fi de forma `https://andreibesliu.github.io/WorldGuard/`. Poarta `npm run check` și plasa pentru dificultate rulează la fiecare pull request. Azi repo-ul nu are nici verificare automată, nici găzduire.

**Proiectul.** `CLAUDE.md`, `README.md` și `DEVLOG.md` se rescriu pentru jocul nou. Documentul ăsta ia locul lui `docs/GDD.md`, unde proiectul își ține deja designul.

**Ordinea.** Întâi jocul jucabil pe telefon, apoi pauza, instalarea și reluarea, la urmă plasa pentru dificultate și reechilibrarea. E regula din WorldGuard: întâi aflăm dacă e distractiv.

## Plasa pentru dificultate

Cinci jucători automați rulează simularea fără browser, pe 20 de semințe fixe fiecare. O comandă tipărește tabelul, iar limitele rulează ca teste și pică build-ul când sunt depășite.

| Jucător | Ce face | Limită, pe mediana celor 20 de partide |
| --- | --- | --- |
| Nimic | stă pe loc | între 60 și 130 s |
| Amestec | strânge și investește pe rând în turele, economie și navă | între 240 și 360 s |
| Doar navă | investește doar în nivelul navei și luptă lângă planetă | cel mult 75% din mediana „Amestec” |
| Fără navă | ca „Amestec”, dar nu investește niciodată în nivelul navei | cel mult 90% din mediana „Amestec” |
| Fără economie | ca „Amestec”, dar nu construiește colector sau mină | fără limită; doar tipărit |

Limita „Doar navă” nu e îndeplinită de cifrele de pornire (vezi măsurătorile). „Fără navă” și „Fără economie” nu au fost măsurate niciodată. Aducerea celor două limite în regulă face parte din v1.

Prima pârghie de încercat, fiindcă nu schimbă senzația navei pe care Andrei a aprobat-o: dușmanii vin și în grupuri simultane din părți opuse, astfel încât o singură navă să nu poată fi în două locuri.

Pârghia asta avantajează turelele, deci se verifică de fiecare dată și pe limita „Fără navă”. Dacă patru turele ajung singure, investiția în navă a devenit inutilă și anti-scopul e încălcat din partea cealaltă. Abia dacă pârghia nu ajunge se umblă la arcul și la împinsul loviturii navei.

„Fără economie” rămâne fără limită în v1, ca echilibrarea să nu aibă trei constrângeri care trag una de alta. Dacă tabelul arată că economia e inutilă, asta devine o problemă de rezolvat după v1.

## Înainte de construcție

Repo-ul e ales: WorldGuard, public. Au rămas două lucruri pe care le poate face doar Andrei:

- [ ] Aprobă accesul de scriere la WorldGuard pentru sesiunea care construiește, când apare cererea.
- [ ] Pornește GitHub Pages din setările repo-ului, cu sursa „GitHub Actions”. Poate aștepta până la prima publicare.

Construcția se face pe o ramură separată din WorldGuard, cu pull request.

## Sfârșitul v1

### Când e gata v1

- Andrei deschide linkul pe telefon, instalează jocul și joacă o partidă în mod avion.
- Tot ce e în „Regulile jocului” și în „Ce e nou față de prototip” funcționează.
- Testele trec, inclusiv limitele din plasă.
- Un pas de simulare cu 150 de dușmani durează în medie sub 1 ms în rularea testelor. Marja e largă intenționat, ca testul să nu depindă de mașină.
- Viteza reală se verifică pe telefonul lui Andrei, nu în cloud, unde nu există placă grafică. De aceea prima construcție jucabilă ajunge pe telefonul lui înainte de restul v1, cu un afișaj de cadre pe secundă care se poate porni și cu o partidă în care apar 150 de dușmani. Dacă acolo jocul scade sub 60 de cadre pe secundă, desenatul trece pe PixiJS înainte de restul v1.

### Ce ar putea veni după v1

Nimic de aici nu e promis și fiecare ar avea designul lui: sunet și vibrații, grafică desenată, feluri noi de dușmani (rapizi, care trag de la distanță, care atacă turelele), scuturi, limită la cât cară nava, îmbunătățiri păstrate între partide, mai multe hărți, împachetare pentru magazin, limba engleză.

**Misiunile speciale** (ideea lui Andrei, 2026-11-17): partide de alt fel, pe suprafața planetei, cu aspectul „Colonie” (varianta 3 din `docs/machete-tema-spatiu.html`, păstrată doar ca referință). Ce e o misiune, cum ajungi la ea și cum se termină nu s-a discutat. Ar fi un proiect separat, după v1, cu designul lui. Împărțirea desenului din tema de spațiu (aspectul în spatele interfeței `Skin`) există ca „Colonie” să fie, mai târziu, un al doilea modul și nu o rescriere.

### Lăsat constructorului

- Numele fișierelor și ale modulelor, în structura `src/sim`, `src/data`, `src/render`.
- CSS-ul exact, cât timp arată ca macheta „Orbită”.
- Cu ce unealtă se face partea de instalare și de joc fără internet.
- Dacă și cum se face o variantă într-un singur fișier, de arătat ca pagină privată înainte de publicare.
- Cum sunt scriși jucătorii automați, cât timp fac ce spune tabelul.
- Cifrele de echilibru, cât timp plasa trece și regulile rămân cele de mai sus.
