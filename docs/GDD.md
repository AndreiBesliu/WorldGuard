# World Guard: designul primei versiuni

Scris pe 2026-11-13, actualizat pe 2026-11-21 („Explorează galaxia”; înainte, pe 2026-11-20: nava cu module; pe 2026-11-18: tema de spațiu, plasa pentru dificultate). Sursa: documentul „World Guard: designul primei versiuni”, aprobat de Andrei pe 2026-11-17.

Prima versiune este jocul din prototip făcut ca proiect adevărat: instalat pe telefon, jucabil fără internet, cu cifre ușor de reglat și cu o plasă care prinde stricarea dificultății. Se construiește în repo-ul WorldGuard, unde ia locul jocului de acolo.

## Intenția

Andrei vrea un joc de mobil de tip castle defense (așa l-a numit el) pe care să-l joace el, deocamdată. Tema de azi e de spațiu: ce aperi e o planetă, eroul e o navă, resursele sunt cristale și metal. Miezul, în cuvintele lui: „Jucătorul adună resurse și decide unde le investește.”

„Deocamdată” contează. Nimic din v1 nu trebuie să blocheze o publicare ulterioară, dar nimic nu se construiește pentru ea acum.

Referința pentru cum se simte jocul (comportament) este [prototipul de aruncat](https://claude.ai/artifact/ENwSUvGDA7eXnFRDiP7atc), pe care Andrei l-a încercat; aspectul lui e cel vechi, cu castel. Unde documentul ăsta și prototipul diferă, câștigă documentul. Aspectul de azi e „Orbită”, descris în [`docs/superpowers/specs/2026-11-17-tema-spatiu-design.md`](superpowers/specs/2026-11-17-tema-spatiu-design.md), care rămâne sursa pentru cum arată tema; documentul de față rămâne sursa pentru reguli.

## Cine a hotărât ce

**Hotărât de Andrei. Nu se redeschide fără el.**

1. Jocul e pentru el, deocamdată.
2. Totul e în timp real. Dușmanii vin continuu și investești sub presiune. (Singura excepție, hotărâtă tot de Andrei pe 2026-11-20: jocul stă pe loc cât alegi un modul la un nivel nou; vezi mai jos și [specul etapei](superpowers/specs/2026-11-20-nava-cu-module-design.md).)
3. Resursele le strânge un erou controlat cu joystick virtual.
4. Eroul luptă și el: atacă singur ce e aproape și se poate investi în el.
5. A încercat prototipul și a spus că totul pare în regulă pentru acum.
6. Joacă pe un Samsung Galaxy A54.
7. Jocul se construiește în repo-ul WorldGuard.
8. Jocul nou înlocuiește ce e făcut acolo.

Hotărârile 1–8 sunt în cuvintele lor de dinainte de tema de spațiu: „eroul” de acolo e, pe ecran, „nava”. Următoarele cinci sunt din 2026-11-17, din [specul temei](superpowers/specs/2026-11-17-tema-spatiu-design.md), secțiunea „Cine a hotărât ce”:

9. Tema jocului devine planetă, spațiu, nave și resurse cosmice.
10. Se schimbă doar estetica. Fără inerție, fără zbor real: nava se mișcă exact ca eroul de dinainte. (Singura excepție, din nava cu module, acceptată de Andrei odată cu documentul etapei pe 2026-11-20: Motorul. Fără Motor, nava se mișcă neschimbat; cu el, mai repede, la alegerea jucătorului; vezi [specul etapei](superpowers/specs/2026-11-20-nava-cu-module-design.md).)
11. Aspectul jocului este varianta 1, „Orbită”, din pagina cu machete (`docs/machete-tema-spatiu.html`).
12. Varianta 3, „Colonie”, e păstrată pentru misiuni speciale.
13. Se schimbă și numele din cod, nu doar ce se vede (abordarea 2 din spec).
14. A încercat tema de spațiu pe telefon, pe 2026-11-18, și a spus: „pe telefon, totul arată super bine”.

**Nava cu module, din 2026-11-20.** Hotărârile de mai jos sunt ale lui Andrei, din discuția din 18–20.11.2026, și sunt scrise în [specul etapei](superpowers/specs/2026-11-20-nava-cu-module-design.md), secțiunea „Cine a hotărât ce”. Nu se redeschid fără el.

15. Nava are nevoie de experiență înainte de fiecare nivel, iar nivelul se plătește în continuare cu resurse, la cercul navei.
16. La fiecare nivel alegi un cartonaș din trei (a ales această variantă dintre trei).
17. Cât alegi, jocul stă pe pauză, panoul apare pe mijlocul ecranului, iar fundalul e încețoșat. Asta e excepția de la hotărârea 2.
18. În joc, nivelul, experiența și locurile de module stau în banda de sus („totul în banda de sus”).
19. Nava are arsenal de mai multe feluri și poate purta tot mai multe componente pe parcurs.
20. Direcția etapelor următoare: dușmani de mai multe feluri și elite care poartă obiecte de adoptat; turele de mai multe feluri; poate tipuri de nave care se deblochează. Fiecare primește designul ei, cu el.

**Nava cu module: propus de Claude și acceptat de Andrei.** Nu sunt hotărârile lui, dar le-a văzut și le-a acceptat; lista întreagă, cu vorbele ei, e în [specul etapei](superpowers/specs/2026-11-20-nava-cu-module-design.md), secțiunea „Cine a hotărât ce”.

- Acceptate când i-au fost arătate („e ok”, 19.11.2026): experiența vine din orice navă dușmană doborâtă; când bara e plină, cercul navei se aprinde și plătești acolo; într-o partidă bună ajungi la 6–8 niveluri; nava pornește cu 2 locuri (unul ocupat de Undă) și primește câte unul la fiecare două niveluri, până la 6; la nivel pui un modul nou sau întărești unul, până la treapta 3; cele nouă module, între ele Motorul, iar armele trag singure, fiecare în ritmul ei; nivelul singur dă doar puțină viață, puterea vine din module; ordinea etapelor (nava, apoi dușmanii și elitele, apoi turelele, apoi tipurile de nave).
- Acceptate odată cu documentul (20.11.2026), ca listă de alegeri de verificat: ofertele ca rânduri late în panou; regulile ofertelor, nivelul maxim 9 și experiența în plus care se păstrează; cifrele de pornire ale modulelor și ale experienței (propuneri, de reglat cu plasa); cum se împacă Motorul cu hotărârea 10; ce cifre se pot regla și ce nu, iar țintele de ritm ale nivelurilor sunt intenție, nu limite; încețoșarea în pagină, nu pe canvas; rândul „Fără turele”, doar tipărit, în tabelul jucătorilor automați.

**Propuneri făcute în timpul construcției etapei, care așteaptă să le vadă Andrei în joc.** Nu sunt hotărâri; până le vede, pot fi schimbate.

- Cifrele: pragurile de experiență (6, 9, 11, 13, 20, 24, 28, 34; în design erau 6, 10, 13, 16, …), experiența pe dușman (1 și 4), prețul nivelului navei (cristale 15 + 5 × (n − 2), metal 5 × (n − 2); în design 25 + 15 × (n − 2) și 10 + 15 × (n − 2)), cifrele celor nouă module (cele din design, cu o singură schimbare: Releul 1,3 / 1,55 / 1,8 în loc de 1,2 / 1,35 / 1,5; Magnetul e cel din design, 40 / 60 / 80) și viața dușmanului 14 × (1 + t / 33) (înainte t / 45).
- Cele 400 ms de la deschiderea panoului în care nu se primește nicio alegere (`CHOICE_GRACE_MS`), ca un deget pus pe ecran chiar atunci să nu aleagă fără să vrea.
- Focusul de la deschiderea panoului stă pe cartonaș, nu pe prima ofertă.
- Inelul de experiență din bandă: alb cât se umple, galben la „gata”. Macheta aleasă de Andrei îl avea galben tot timpul.
- Înălțimea benzii: 122 px la 360 px lățime; în „Test de viteză” e mai înaltă (138 px) cu rândul fps.
- Formele modulelor pe navă și culoarea exploziei.
- Ceasul Scutului curge și cât nava e doborâtă (celelalte arme nu trag atunci).
- Regulile noi ale jucătorilor automați: plătesc nivelul navei când e gata și au bani, înaintea luptei, și își termină plata începută. Din valul de reparații de după recenzie (21.11.2026): purtările care nu cumpără turele („Doar navă”, „Fără turele”) iau Releul doar dacă nu au altă ofertă, fiindcă Releul grăbește doar turelele.
- Nava din „Test de viteză” (din valul de reparații de după recenzie, 21.11.2026): pornește la nivelul 3, care îi dă trei locuri, cu Unda, Laserul și Rachetele la treapta 3 și viața plină pentru nivelul ei, ca cifrele de cadre de pe telefon să fie cu toate armele trăgând. Experiența rămâne 0, nava nu urcă niveluri și panoul nu se deschide, numărul de nave dușmane rămâne 150. Partida obișnuită nu se schimbă.

**„Explorează galaxia”, din 2026-11-21.** Hotărârile de mai jos sunt ale lui Andrei, din discuția din 21.11.2026, și sunt scrise în [specul etapei](superpowers/specs/2026-11-21-exploreaza-galaxia-design.md), secțiunea „Cine a hotărât ce”. Nu se redeschid fără el.

21. Un mod nou, „Explorează galaxia”: nava zboară înainte și trage în dușmani care vin din partea de sus a ecranului; jucătorul se ferește de armele lor.
22. Din explorare aduci resurse cu care întărești arsenalul sau cifrele de bază ale navei.
23. Întăririle cumpărate contează peste tot, și în explorare, și la apărarea planetei. A ales asta dintre trei variante, după ce i s-a spus prețul: apărarea devine mai ușoară cu timpul, deci întăririle sunt mici și cu plafon, iar dificultatea se măsoară în continuare cu nava neîntărită.
24. Nava se conduce cu degetul (nava urmează mișcarea degetului), nu cu joystickul. Le-a încercat pe amândouă în prototip.
25. Focul dușman din prototip e în regulă deocamdată; se revede când apar dușmani de mai multe feluri, cu atacuri diferite.
26. Un zbor ține trei minute.
27. În zbor nava capătă arme și module, dar nu dintr-un panou: sunt lucruri peste care nava zboară ca să le culeagă, ca resursele, iar întăririle se aplică singure. Jocul nu se oprește.

(Hotărârea 2 de sus, „totul în timp real”, rămâne adevărată și pentru zbor; panoul de alegere de la apărare rămâne cum e.)

**„Explorează galaxia”: propus de Claude și acceptat de Andrei când i-a fost arătat („e ok, continuă”, 21.11.2026).**

- Modulele culese țin doar zborul acela. Acasă ajung doar cristalele și metalul, într-o rezervă care se păstrează între partide.
- Dacă nava e doborâtă, păstrezi ce ai strâns până atunci, dar nu mai primești prada navei de elită.
- La capătul fiecărui sector te așteaptă o navă de elită. Fiecare sector explorat îl deschide pe următorul, mai greu și mai bogat.
- Un atelier vinde puține întăriri, mici și cu plafon: viața navei, lovitura armelor, raza de strâns, viața planetei și modulul cu care pornești la drum.
- Apărarea planetei rămâne cum e, cu panoul ei de alegere la fiecare nivel.
- Ordinea: întâi bucla întreagă (zborul, rezerva, atelierul); apoi dușmanii de mai multe feluri, o singură dată, pentru amândouă modurile.

**„Explorează galaxia”: ales de Claude și acceptat de Andrei odată cu documentul (21.11.2026).** I-au fost arătate ca listă de verificat; până le vede în joc, rămân propuneri.

- Felul în care se construiește: un al doilea joc lângă primul, în aceeași aplicație.
- Cele cinci module din zbor și cifrele lor; navele de transport care le lasă în urmă; reparația.
- Cele trei feluri de dușmani, asteroizii, nava de elită și cifrele lor, din prototip.
- Lista din atelier, treptele, plafoanele și prețurile (prețurile de azi sunt mai jos, la propunerile din construcție).
- Cum cresc sectoarele și că poți zbura din nou un sector deja explorat.
- Recordul de la apărare rămâne unul singur, cu sau fără întăriri.
- Un zbor întrerupt de închiderea paginii nu se reia; ce ai strâns până atunci rămâne al tău.
- Lupta cu nava de elită nu are limită de timp: zborul ține până cade una dintre nave.
- Cum arată cartonașul de start cu două moduri, atelierul și cartonașul de la sfârșitul zborului (machetele).

**„Explorează galaxia”: propuneri făcute în timpul construcției, care așteaptă să le vadă Andrei în joc.** Nu sunt hotărâri; până le vede, pot fi schimbate. Cifrele sunt în `src/data/flight.ts` și `src/data/workshop.ts`.

- **Cifrele zborului și ale navelor dușmane.** Câmpul de 390 × 680 de unități; sectorul de 170 s, cu nava de elită la 2,5 s după; nava cu 5 lovituri, 1,2 s fără lovituri după una primită, punctul de lovire cu raza 6; condusul cu factorul 1,2 și cel mult 1100 de unități pe secundă; limita de sus a navei la 30% din înălțime; cifrele armelor, ale Scutului și ale Magnetului; viața, viteza și focul celor cinci feluri de nave dușmane; asteroizii; liniștea de la jumătatea sectorului; escorta navei de elită. Cele mai multe vin din prototip; toate sunt propuneri, și cele din tabelele specului (specul le-a ales, Andrei nu le-a hotărât: „până le vede în joc, toate rămân propuneri”). Plafonul sectorului e 999 (propunere, din valul de reparații de după recenzia etapei): un profil cu un sector mai mare e stricat, iar nici alegerea de pe cartonaș, nici un sector explorat nu trec de el. Formula sectoarelor: viața dușmanilor × (1 + 0,25 (n − 1)), pauzele dintre apariții × max(0,6; 0,94^(n − 1)), viața navei de elită × (1 + 0,35 (n − 1)), prada × (1 + 0,2 (n − 1)).
- **Prețurile atelierului și ținta de ritm.** Prețul treptei e baza × înmulțitorul^(treapta − 1), rotunjit la 5; bazele (cristale / metal) și înmulțitorii: Carenă 50 / 10, ×1,7; Armament 60 / 15, ×1,6; Colectare 40 / 0, ×1,8; Planetă 55 / 20, ×1,7; Arsenal de pornire 95 / 30, ×2. Cu toate la plafon costă 2960 de cristale și 770 de metal. Un zbor în sectorul 1 cu nava condusă de script aduce 99 de cristale și 32,5 metal (mediana pe 10 semințe), deci tot atelierul înseamnă cam 29,9 zboruri la cristale și 23,7 la metal, în ținta de 25–35 de zboruri (ținta se judecă la reglaj, din rândul „Atelierul la plafon” al lui `npm run balance`, nu dintr-un test); prima întărire (Colectarea, 40 de cristale) se poate cumpăra după primul zbor.
- **Formele și așezările de pe ecran.** Formele din zbor (nava cu modulele, cele cinci feluri de dușmani, focul dușman rotund și portocaliu, lucrurile de cules ca pătrate cu chenar, resursele); câmpul lipit de bandă (dușmanii ies de sub ea), cu cer în plus dedesubt sau fâșii în lături (lipit de bandă din valul de reparații de după recenzia etapei; înainte era lipit de jos și pe ecranele înalte dușmanii apăreau din senin sub bandă); banda zborului, cu cristalele și metalul doar ca semn și cifră (ca la 360 px lățime să încapă și 7 vieți), și rândul „ai cules” ca pastilă sub ea, ascuns cât zborul nu e în curs; „Înapoi la start” pe cartonașele de pauză și de final ale apărării; cartonașele de start, de pauză și de sfârșit ale zborului; atelierul ca panou peste cartonașul de unde s-a deschis, cu cele cinci rânduri.
- **Textele** din interfața zborului și a atelierului (în `src/ui/strings.ts`), între ele „Partidă nouă: cea salvată se pierde.” și rândul „{nume} e la maxim · +5 cristale”.
- **Purtări hotărâte în construcție, în numele lui Andrei** (fiecare se poate schimba după ce joacă):
  - după ce cade nava de elită, sectorul explorat nu se mai poate pierde: în cele 3,4 secunde nava ta nu mai poate fi lovită (nici nu mai trage), iar dușmanii rămași nu mai trag; prototipul lăsa nava să fie doborâtă și atunci;
  - nava grea și nava de elită trag indiferent cât de aproape e nava ta; doar dronele și șerpuitoarele nu trag de la mai puțin de 110 unități sau după ce au trecut de navă; în prototipul pe care Andrei l-a găsit în regulă la foc exista o fâșie de sus în care elita nu trăgea;
  - cartonașul de sfârșit al zborului apare imediat, peste cadrul înghețat, ca la apărare; căderea navei nu se vede;
  - când există o partidă salvată, „Continuă partida” e butonul principal, iar „Apără planeta” (stil secundar) avertizează că salvarea se pierde; fără salvare, „Apără planeta” e butonul principal;
  - Escape nu închide atelierul (cu atelierul deschis, Escape, pagina ascunsă și `pagehide` nu schimbă nimic).
- **Alte alegeri de purtare:** Scutul oprește o lovitură și lasă 0,45 s fără lovituri; transportul nu vine în liniștea de la jumătate; cu toate modulele la treapta 3, transportul lasă tot un modul (cules, dă 5 cristale); o reparație culeasă la viață plină dispare fără efect; transportul doborât se numără la dușmanii doborâți; lovitura unei rachete se hotărăște la lansare; la „Apără planeta” nava pornește cu viața plină, cu tot cu Carena; Magnetul și Colectarea se combină așa: distanța de la care vin resursele e (85 + adaosul Magnetului) × (1 + 0,1 × treapta Colectării).

**Propus de Claude și acceptat de Andrei când i-a fost arătat întregul.**

- Trei direcții de investit: economie, apărare, erou (pe ecran, navă).
- Nava doborâtă reapare la planetă după câteva secunde. Partida se termină doar când cade planeta.
- Partida nu are sfârșit și devine tot mai grea. Scorul e cât ai rezistat.
- Aspect din forme simple. Arta vine mai târziu.
- Fără îmbunătățiri păstrate de la o partidă la alta în prima versiune. (Din 2026-11-21 există: întăririle din atelierul modului „Explorează galaxia”, hotărâte de Andrei; vezi mai jos.)
- Din spec, văzute de Andrei pe pagina cu machete și lăsate neschimbate: numele de pe ecran (Planetă, Navă, cristale, metal, Turelă, Colector, Mină) și viața planetei desenată ca inel în jurul ei, în locul barei de deasupra castelului.

**Hotărât de Claude, nevăzut încă de Andrei.**

Andrei a vorbit despre rezultate, nu despre unelte, deci alegerile de mai jos sunt ale lui Claude și pot fi respinse.

- Uneltele și împărțirea codului (secțiunea „Cum se construiește”), inclusiv desenatul pe Canvas 2D.
- Ce e nou față de prototip: pauza, instalarea, reluarea unei partide întrerupte.
- Plasa pentru dificultate, inclusiv care strategii trebuie să piardă.
- Ce se păstrează din WorldGuard și ce se înlocuiește.
- Jocul nou preia numele de lucru World Guard.
- Găzduirea pe GitHub Pages.
- Purtarea jucătorilor automați din plasă: toți apără planeta (lasă totul când o navă dușmană e la mai puțin de 120 de centrul ei) și niciunul nu repară planeta. Razele 80 și 160 se tipăresc doar ca informație.
- Cifrele schimbate la reechilibrarea din 18.11.2026, propuneri până le vede Andrei în joc: lovitura navei crește cu 10 pe nivel în loc de 6; viața dușmanului e 14 × (1 + t / 45) în loc de 14 × (1 + t / 80). Pe înțelesul jocului: spre minutul 5 un dușman are 107 viață (înainte 66,5), iar nava de nivelul 5 lovește cu 50 (înainte 34). Primul minut se schimbă puțin: jucătorul automat „Nimic” rezistă exact la fel pe toate cele 20 de semințe, dar la secunda 60 un dușman are 32,7 viață în loc de 24,5, deci nava de nivelul 1 are nevoie de 4 lovituri în loc de 3. (Din 20.11.2026, odată cu nava cu module, lovitura navei nu mai crește cu nivelul, iar viața dușmanului e 14 × (1 + t / 33); vezi „Propuneri” de mai sus.)
- Ce face reechilibrarea cu turelele (măsurat cu jucătorii automați, cifrele vechi față de cele noi): în „Amestec”, nava dă 71,6% din toată lovitura (înainte 61,1%); o turelă de nivelul 1 are nevoie de 18 trageri (14,4 s) pentru un dușman de la minutul 5 (înainte 12, adică 9,6 s); un jucător care cumpără doar turele ține 79% din „Amestec” (înainte 90%), iar unul fără turele (economie și navă) 82% (înainte 79%). Turelele încă merită și „Amestec” rămâne peste toate, dar direcția e spre anti-scopul „Devine joc de acțiune”, iar plasa nu are un rând care s-o vadă. E o propunere: Andrei hotărăște dacă așa vrea jocul.
- Pârghia cu grupuri de dușmani din părți opuse a fost încercată în explorare și nu s-a folosit; a rămas notată mai jos, în „Plasa pentru dificultate”.
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

Investiția doar în navă (în prototip, erou) ține la fel de mult ca a construi, deci tensiunea dintre cele trei direcții nu e încă asigurată de cifre. V1 trebuie să o asigure (vezi „Plasa pentru dificultate”). Măsurătorile făcute apoi cu jucătorii automați din repo, cu cifrele de azi, sunt în „Plasa pentru dificultate”; cele ale prototipului sunt cele de mai jos.

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
- **Cercul navei are trei stări.** Cât nava n-a strâns experiența cerută, nu primește plată și scrie sub nume „experiență 14/40”. Când pragul e atins, cercul se aprinde și își arată prețul; plata merge ca la celelalte cercuri și o plată urcă un singur nivel (dacă experiența ajunge deja pentru următorul, cercul rămâne aprins). La nivelul 9 scrie „Navă · nivel maxim”.

**Experiența și nivelul navei.** Orice navă dușmană doborâtă dă experiență navei, oricine a doborât-o (nava, o turelă sau amândouă) și chiar cât nava e doborâtă: 1 pentru una obișnuită, 4 pentru una grea. Fiecare nivel are pragul lui (vezi „Cifrele jocului”); experiența strânsă peste prag trece la nivelul următor. Nivelul maxim e 9, iar de acolo experiența nu mai contează. Nivelul dă doar viață (+10 și viața navei se umple); puterea vine din module. În „Test de viteză” experiența nu se strânge și nava nu urcă niveluri: pornește la nivelul 3, cu Unda, Laserul și Rachetele la treapta 3, și rămâne așa (propunere).

**Modulele.** Nava are locuri pentru module: 2 la nivelurile 1–2, 3 la 3–4, 4 la 5–6, 5 la 7–8 și 6 la nivelul 9. Pornește cu Unda, arma de azi, la treapta 1, într-unul din locuri. Un modul ocupă un loc oricare i-ar fi treapta (1–3). Sunt nouă module, de trei feluri: arme (Undă, Laser, Rachete), corp (Blindaj, Scut, Reparator) și utilitare (Motor, Magnet, Releu); cifrele sunt în „Cifrele jocului”. Armele trag singure, fiecare cu ceasul ei. Fără Motor, nava se mișcă exact ca înainte. Un modul pus rămâne pus; nu se schimbă și nu se aruncă.

**Alegerea.** În pasul în care un nivel e plătit, jocul se oprește și apare un panou pe mijlocul ecranului, cu fundalul încețoșat și întunecat. Panoul arată nivelul nou, locurile navei și cel mult trei oferte, una sub alta: fiecare cu pictogramă, nume, felul, „Nou” sau „Întărire”, cel mult două rânduri de text și trei puncte pentru treapta la care ajunge. Jucătorul atinge o ofertă și jocul pornește mai departe; nu există „sari peste”. O ofertă e un modul nou (dacă e un loc liber și nava nu-l are) sau întărirea cu o treaptă a unui modul de sub treapta 3. Ofertele sunt diferite între ele; cât e un loc liber, cel puțin una e un modul nou, iar cât se poate întări ceva, cel puțin una e o întărire. Depind doar de sămânța partidei, de nivel și de modulele navei. Dacă nu se poate nimic (locurile pline, toate modulele la treapta 3), panoul nu se deschide. O partidă întreruptă cu panoul deschis se reia în același panou, cu aceleași oferte. Pe calculator, tastele 1, 2 și 3 aleg ofertele. Panoul nu primește alegeri în primele 400 ms de la deschidere (propunere), ca să nu aleagă o atingere rătăcită.

**Ce se poate cumpăra.**

| Direcție | Ce | Ce face |
| --- | --- | --- |
| Apărare | 4 turele, la colțurile planetei (±125, ±125 față de centru) | trag singure în cea mai apropiată navă dușmană din rază |
| Apărare | reparat planeta | schimbă metal pe viața planetei |
| Economie | colectorul, lângă cristalele din vest | produce cristale singur |
| Economie | mina, lângă asteroizii din nord | produce metal singură |
| Navă | nivelul navei (cere experiență) | mai multă viață, un loc nou de module din când în când și un modul de ales |

**Lupta.** Nava lovește singură, cu Unda, la intervale fixe, toți dușmanii aflați în raza ei într-un arc de aproximativ 143° la treapta 1 (arcul se lărgește cu treapta) în jurul celui mai apropiat și îi împinge înapoi; Laserul și Rachetele, când le are, trag singure în cel mai apropiat dușman. Își reface viața dacă nu e lovită o vreme. Doborâtă, reapare lângă planetă după câteva secunde, timp în care nu strânge și nu plătește. Nici Unda, nici Laserul, nici Rachetele nu trag atunci, iar ceasurile lor stau pe loc (repornesc de unde erau când nava reapare); o rachetă plecată înainte își termină zborul și explodează. Releul nu grăbește turelele cât nava e doborâtă. Ceasul Scutului curge totuși (propunere).

**Dușmanii.** Sunt nave. Apar într-un punct la întâmplare de pe marginea hărții și merg drept spre planetă. Ajunse la marginea ei, o lovesc. Dacă nava ta e la mai puțin de 90 de unități, o urmăresc și o lovesc pe ea. Nu atacă turelele sau clădirile. Există două feluri: nava invadatoare, obișnuită, și nava grea, care apare mai rar, mai târziu, cu mai multă viață.

**Sfârșitul.** Partida se termină când viața planetei ajunge la zero. Ecranul de final arată cât ai rezistat, recordul și câte nave ai doborât.

**Ce se vede mereu.** O bandă sus cu cristalele, metalul, ceasul și viața planetei, care se înroșește când planeta e lovită, și un rând al navei: nivelul într-un inel care se umple cu experiența (alb cât se umple, galben la „gata”; propunere), locurile navei ca pătrate mici (pictograma modulului în cele ocupate, contur punctat la cele libere, lacăt la următorul care se deschide) și, la dreapta, „experiență 14/40”, apoi „Nivel 4 gata” sau „Nivel maxim”. Viața planetei se vede și ca inel-scut în jurul ei. Când planeta iese din ecran, un indicator pe margine arată încotro e și câtă viață are, și pulsează roșu când e atacată.

## Cifrele jocului

Sunt cifrele de după nava cu module (20.11.2026): pragurile și prețul nivelului navei, experiența, modulele și viața dușmanului 14 × (1 + t / 33) sunt propuneri până le vede Andrei (vezi „Propuneri” de sus). Reechilibrarea din 18.11.2026 și cifrele cu care s-a încheiat prototipul sunt în `DEVLOG.md`. Timpul t e în secunde de la începutul partidei.

| Lucru | Valoare |
| --- | --- |
| Planetă | 400 viață |
| Navă (eroul) | raza 13; viteză 165/s; 60 viață, +10 pe nivel (lovitura vine din module, nu din nivel); Unda are raza 58, o lovitură la 0,45 s, împinge 140 (60 pe cei grei); reface 4 viață/s după 3 s fără lovituri (fără Reparator); reapare după 5 s; nivel maxim 9; locuri de module 2 / 2 / 3 / 3 / 4 / 4 / 5 / 5 / 6 la nivelurile 1–9 |
| Experiență pe dușman | 1 pentru unul obișnuit, 4 pentru unul greu (propunere) |
| Start | 20 cristale, 0 metal |
| Cristal | 8 cristale; o bucată la 0,3 s; crește la loc la 18 s după ce se golește |
| Asteroid | 6 metal; o bucată la 0,42 s; crește la loc la 24 s |
| Turelă | raza 190; o tragere la 0,8 s; lovitură 6 + 5 × (nivel − 1); nivel maxim 5 |
| Cost turelă, nivelul n | cristale 20 + 15 × (n − 1); metal 15 × (n − 1) |
| Colector, nivelurile 1–3 | un cristal la 1,6 / 1,0 / 0,7 s; cost 25 cristale / 40 cristale + 15 metal / 60 cristale + 35 metal |
| Mină, nivelurile 1–3 | un metal la 2,4 / 1,5 / 1,0 s; cost 35 cristale / 45 cristale + 20 metal / 60 cristale + 40 metal |
| Cost navă, nivelul n (2–9) | cristale 15 + 5 × (n − 2); metal 5 × (n − 2) (propunere din 20.11.2026; în design 25 + 15 × (n − 2) și 10 + 15 × (n − 2)) |
| Experiența cerută, nivelurile 2–9 | 6, 9, 11, 13, 20, 24, 28, 34 (propunere din 20.11.2026; în design 6, 10, 13, 16, 20, 24, 28, 34) |
| Reparat | 1 metal dă 5 viață planetei; 10 metal pe secundă |
| Plată | o bucată la 0,035 s |
| Primul dușman | la 10 s |
| Ritmul dușmanilor | unul la fiecare max(0,6; 5 / (1 + t / 90)) secunde |
| Viața dușmanului | 14 × (1 + t / 33) (propunere din 20.11.2026; înainte t / 45) |
| Releu | împarte timpul dintre trageri al turelelor aflate la cel mult 220 de navă la 1,3 / 1,55 / 1,8 (propunere din 20.11.2026; în design 1,2 / 1,35 / 1,5) |
| Dușman obișnuit (navă invadatoare) | raza 10; viteză 46/s; 3 viață pe lovitură; lovește planeta o dată pe secundă, nava ta la 0,8 s |
| Dușman greu (navă grea) | fiecare al 7-lea, după 120 s; viață × 4; raza 15; viteză 30/s; 9 viață pe lovitură |

**Modulele navei** (toate cifrele sunt propuneri din 20.11.2026: cele din design, cu o singură schimbare, la Releu; Magnetul a fost încercat la 50 / 75 / 100 la reglaj și pus la loc, fiindcă nu schimba nimic). Treptele 1 / 2 / 3:

| Modul | Fel | Ce face | Cifre |
| --- | --- | --- | --- |
| Undă | armă | lovește toți dușmanii dintr-un arc și îi împinge | lovitură 10 / 16 / 24; arcul 1,25 / 1,6 / 2,0 rad de la direcția celui mai apropiat; raza, ritmul și împinsul ca în rândul navei |
| Laser | armă | trage într-un singur dușman, cel mai apropiat, de departe | rază 170; o tragere la 0,9 s; lovitură 14 / 22 / 32 |
| Rachete | armă | rachetă lentă spre cel mai apropiat dușman; la sosire lovește o zonă | rază 200; una la 2,4 s; viteza 240; zonă 50; lovitură 12 / 18 / 26 |
| Blindaj | corp | mai multă viață | +30 / +60 / +100 viață |
| Scut | corp | oprește cu totul o lovitură, apoi se reface | se reface în 6 / 4,5 / 3 s |
| Reparator | corp | nava începe mai devreme să se refacă și se reface mai repede | după 2 / 1,5 / 1 s fără lovituri; 6 / 9 / 12 viață pe secundă |
| Motor | utilitar | nava merge mai repede | viteza × 1,12 / 1,22 / 1,3 |
| Magnet | utilitar | strânge de mai departe și mai repede | distanța de strâns 40 / 60 / 80; timpul între bucăți × 0,8 / 0,65 / 0,5 |
| Releu | utilitar | turelele de lângă navă trag mai repede | vezi rândul „Releu” de mai sus |

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

## „Explorează galaxia”: regulile și cifrele

Al doilea mod, adăugat pe 2026-11-21. Designul întreg, cu motivele, e în [specul etapei](superpowers/specs/2026-11-21-exploreaza-galaxia-design.md); aici stau regulile ca să le găsești lângă ale apărării. Cifrele sunt citite din `src/data/flight.ts` și `src/data/workshop.ts`; toate sunt propuneri, și cele din tabelele specului: specul le numește alese până le vede Andrei în joc. Hotărâri ale lui Andrei sunt cele șapte de la „Cine a hotărât ce” (între ele, cele trei minute și conducerea cu degetul), nu cifrele. Regulile zborului sunt în `src/flight/`, separate de ale apărării.

**Zborul.** Câmpul stă în picioare, 390 × 680 de unități, și nu depinde de ecran. Nava e jos; cerul curge în jos. Condusul: degetul se pune oriunde, iar nava face aceeași mișcare × 1,2, cu cel mult 1100 de unități pe secundă; nu sare sub deget; poate urca până la 30% din înălțime, măsurat de sus. Cu tastatura (săgeți sau WASD), 255 de unități pe secundă. Nava ține 5 lovituri (plus Carena); după una, 1,2 s fără lovituri; contează doar un punct cu raza 6 din mijlocul navei. Tunul trage singur, drept înainte, la 0,11 s. Până la secunda 170 apar dușmani obișnuiți; la 172,5 s vine nava de elită. Dacă cade, sectorul e explorat și mai ai 3,4 s să strângi ce a lăsat; dacă nava ta pierde a cincea viață, zborul se încheie pe loc. Lupta cu elita nu are limită de timp. La jumătatea sectorului sunt câteva secunde fără dușmani noi. Pauza: buton, Escape, pagina ascunsă.

**Modulele din zbor.** Nava pornește cu Tunul la treapta 1; restul se culeg, fiecare cu trei trepte (un modul cules a doua oară urcă o treaptă; la treapta 3 dă 5 cristale). Fără locuri limitate; la sfârșitul zborului dispar.

| Modul | Fel | Treapta 1 | Treapta 2 | Treapta 3 |
| --- | --- | --- | --- | --- |
| Tun | armă | 2 proiectile (lovitura 4) | 3, în evantai mic | 5, în evantai |
| Laser | armă | 14, la 0,9 s, până la 300 de unități | 22 | 32 |
| Rachete | armă | 12, la 2,4 s, explozie pe raza 50 | 18 | 26 |
| Scut | corp | oprește o lovitură, se reîncarcă în 6 s | 4,5 s | 3 s |
| Magnet | utilitar | resursele vin de la +45 de unități (fără el, de la 85) | +90 | +135 |

Modulele le lasă navele gri de transport (prima la secunda 5, apoi la 14–18 s; nu trag). Un modul coboară încet și nu vine spre navă: trebuie să zbori peste el. Cu nava lovită, în locul unui modul poate apărea o reparație, care dă înapoi o viață.

**Dușmanii.** Viața crește pe parcursul sectorului până la × 1,8.

| Dușman | Viață | Ce face |
| --- | --- | --- |
| Dronă | 14 | coboară drept; trage drept în jos, la 1,7 s |
| Șerpuitoare | 20 | coboară șerpuind; trage spre navă, la 2,1 s; apare după secunda 24 |
| Grea | 70 | se oprește sus și se plimbă; trei proiectile în evantai spre navă, la 1,9 s; pleacă după 9 s; apare după secunda 50 |
| Transport | 34 | nu trage; lasă un modul |
| Elită | 1400 | stă sus și se leagănă; cerc de 14 proiectile, apoi două salve de câte 5; sub jumătate din viață trage mai des și cercul are 18; o însoțesc drone |

Asteroizii coboară încet și nu trag; sparți, lasă metal. Dușmanii lasă cristale: 1 cei mici, 4 nava grea, 24 nava de elită. Sectorul n are viața dușmanilor × (1 + 0,25 (n − 1)), pauzele dintre apariții × max(0,6; 0,94^(n − 1)), viața elitei × (1 + 0,35 (n − 1)) și prada × (1 + 0,2 (n − 1)).

**Rezerva și sectoarele.** Cristalele și metalul rămase în urmă vin singure spre navă când e aproape. Ce a strâns zborul trece în rezervă exact o dată (la pauză, la sfârșit, și dacă nava e doborâtă; nimic nu se pierde, nimic nu se numără de două ori). Un sector explorat îl deschide pe următorul; se poate zbura orice sector până la primul neexplorat. Rezerva, sectorul cel mai îndepărtat și întăririle stau într-un singur loc din stocarea telefonului (`wg.v1.profile`), cu versiune, verificate la citire; un conținut stricat înseamnă rezervă goală și nicio întărire, nu o oprire a jocului.

**Atelierul.** Cinci întăriri, cu trepte, plafon și preț care crește cu treapta (prețurile și ținta de ritm sunt la „Cine a hotărât ce”). Procentele se aplică fără rotunjire. O cumpărare nu se dă înapoi.

| Întărire | La apărarea planetei | În zbor | Trepte |
| --- | --- | --- | --- |
| Carenă | viața navei + 6 pe treaptă | o lovitură în plus la treptele 2 și 4 (2 la treapta 4) | 4 |
| Armament | lovitura Undei, Laserului și Rachetelor + 4% pe treaptă | lovitura armelor + 4% pe treaptă | 5 |
| Colectare | nava strânge de la 10% mai departe pe treaptă | resursele vin de la 10% mai departe pe treaptă | 3 |
| Planetă | viața planetei + 5% pe treaptă | nimic | 4 |
| Arsenal de pornire | nimic | zborul pornește și cu Laserul; la treapta 2 și cu Rachetele; la 3 și cu Scutul (la treapta 1) | 3 |

La plafon, toate la un loc dau la apărare: nava cu 24 de viață în plus, armele cu 20% mai tari, strânsul cu 30% mai departe, planeta cu 480 de viață în loc de 400.

**Ce se schimbă la apărarea planetei.** O partidă nouă pornește cu întăririle din atelier, ținute în starea ei (`s.ups`), deci o partidă reluată continuă la fel chiar dacă atelierul s-a schimbat între timp; salvarea e la versiunea 3, iar una de versiunea 2 se primește ca „fără întăriri”. **Fără nicio întărire, partida de apărare e cea de dinainte, pas cu pas**; asta o păzește `src/bots/golden.test.ts`, care fixează trei partide întregi („Amestec”, semințele 1, 2 și 3) din codul de dinaintea întăririlor. „Test de viteză” pornește fără întăriri. Recordul rămâne unul singur. Un zbor nu atinge partida de apărare salvată și nici recordul.

**Ce se vede.** Cartonașul de start: „Apără planeta” și „Explorează galaxia” (cu sectorul ales, − și +), rezerva, „Atelier”, plus „Continuă partida” și „Test de viteză”. În zbor, banda de sus: ce a strâns zborul, viețile, drumul prin sector (devine viața navei de elită), modulele cu treptele lor, pauza; sub bandă, rândul „ai cules”. La sfârșit: „Sector explorat” sau „Nava a fost doborâtă”, ce ai adus, rezerva, „Sectorul următor” sau „Încă un zbor”, „Atelier” și „Înapoi”.

## Ce e nou față de prototip

1. **Pauză.** Buton în banda de sus și pauză automată când aplicația trece în fundal. Cartonașul de pauză are „Continuă” și „Partidă nouă”. Cât e pauză, simularea nu avansează.
2. **Instalare și joc fără internet.** Aplicație web instalabilă, cu toate fișierele păstrate pe telefon. O versiune nouă se activează la următoarea pornire, niciodată în mijlocul unei partide.
3. **Ecranul rămâne aprins** cât ține partida, acolo unde telefonul permite.
4. **Simulare cu pas fix și sămânță.** Fiecare partidă are o sămânță pentru punctele de apariție ale dușmanilor.
5. **Plasa pentru dificultate**, descrisă mai jos.
6. **Recordul** se păstrează sub o cheie cu versiune. Dacă telefonul refuză stocarea, jocul merge fără record.
7. **Reluarea partidei.** Telefoanele închid des aplicațiile trecute în fundal. La fiecare pauză, jocul salvează pe telefon starea întreagă a partidei, cu tot cu starea generatorului de hazard. La următoarea pornire, cartonașul de start oferă „Continuă partida” lângă „Partidă nouă”. Salvarea are versiune și se șterge la sfârșitul partidei sau la o partidă nouă. O salvare cu altă versiune se aruncă fără eroare.
8. **Nava cu module** (20.11.2026). Experiență înainte de nivel, alegere din trei oferte la fiecare nivel, nouă module. Salvarea păstrează acum și experiența, modulele, ceasurile armelor și oferta deschisă; versiunea ei e 2, deci o partidă salvată înainte de etapă nu se mai poate continua („Continuă partida” nu apare, fără eroare; recordul rămâne).
9. **„Explorează galaxia”** (21.11.2026). Al doilea mod: zborul, rezerva păstrată între partide și atelierul cu întăriri care contează și la apărare (vezi mai sus secțiunea cu regulile și cifrele modului). Salvarea apărării trece la versiunea 3 (ține întăririle partidei); o salvare de versiunea 2 se primește ca „fără întăriri”.

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
- **Interfața.** Banda de sus, cartonașele (start, pauză, final) și panoul de alegere al modulelor sunt HTML și CSS simplu peste zona de joc, fără bibliotecă de interfață.

Bucla rulează simularea cu acumulator: cel mult 5 pași pe cadru, restul se aruncă, ca un telefon lent să încetinească jocul în loc să-l blocheze.

**Teste.** Vitest pe simulare: plata pe cerc (inclusiv întârzierea și plata parțială), strânsul, ținta turelelor, curba dușmanilor, căderea și reapariția navei, sfârșitul partidei, faptul că aceeași sămânță cu aceleași comenzi dă aceeași stare, și faptul că o partidă salvată și reluată continuă identic cu una neîntreruptă.

**Găzduire.** GitHub Pages, publicat de GitHub Actions la fiecare push pe ramura principală. Repo-ul e public, deci adresa jocului va fi de forma `https://andreibesliu.github.io/WorldGuard/`. Poarta `npm run check` și plasa pentru dificultate rulează la fiecare pull request. Azi repo-ul nu are nici verificare automată, nici găzduire.

**Proiectul.** `CLAUDE.md`, `README.md` și `DEVLOG.md` se rescriu pentru jocul nou. Documentul ăsta ia locul lui `docs/GDD.md`, unde proiectul își ține deja designul.

**Ordinea.** Întâi jocul jucabil pe telefon, apoi pauza, instalarea și reluarea, la urmă plasa pentru dificultate și reechilibrarea. E regula din WorldGuard: întâi aflăm dacă e distractiv.

## Plasa pentru dificultate

Sunt șase jucători automați: patru au limită (Nimic, Amestec, Doar navă, Fără navă), iar doi sunt doar tipăriți (Fără economie, din faza 3, și Fără turele, din nava cu module). Toți rulează simularea fără browser, pe 20 de semințe fixe fiecare. O comandă tipărește tabelul, iar limitele rulează ca teste și pică build-ul când sunt depășite.

| Jucător | Ce face | Limită, pe mediana celor 20 de partide |
| --- | --- | --- |
| Nimic | stă pe loc | între 60 și 130 s |
| Amestec | strânge și investește pe rând în turele, economie și navă | între 240 și 360 s |
| Doar navă | investește doar în nivelul navei și luptă lângă planetă | cel mult 75% din mediana „Amestec” |
| Fără navă | ca „Amestec”, dar nu investește niciodată în nivelul navei | cel mult 90% din mediana „Amestec” |
| Fără economie | ca „Amestec”, dar nu construiește colector sau mină | fără limită; doar tipărit |
| Fără turele | economie și navă, nicio turelă (adăugat la nava cu module, ca să se vadă dacă turelele mai merită) | fără limită; doar tipărit |

Tabelul mai are trei coloane de informație, fără limită: nivelul navei la sfârșit (mediana) și secunda la care nava atinge nivelurile 2 și 5 (mediana; „—” când mediana nu le atinge). Țintele de ritm ale nivelurilor din spec (nivelul 2 pe la secunda 40, nivelul 5 pe la minutul 2, nivelul 8 pe la minutul 4) sunt intenție, nu limite: niciun test nu pică din ele.

**Cum sunt făcuți jucătorii automați** (`src/bots/`). Au aceeași purtare și diferă doar prin lista de cumpărături: strâng resursa care le lipsește, plătesc la cercul următor din listă și, când o navă dușmană e la mai puțin de 120 de centrul planetei, lasă totul și luptă cu ea. Niciunul nu repară planeta. Două reguli noi, din etapa cu module (propuneri; au mutat tabelul, deci cifrele de dinainte nu se mai compară cu cele de azi): când nava e gata de nivel și stocul acoperă ce a rămas de plătit la cercul ei, purtările care cumpără nava plătesc acolo înaintea luptei și a restului listei, și un jucător își termină plata începută (cât stă pe un cerc pe care plata curge și mai are cu ce plăti, acel cerc rămâne ținta). Alegerea modulului o face rularea, nu jucătorul automat: la o ofertă deschisă, prima ofertă cu modulul cel mai sus pe lista de preferințe, aceeași pentru toate purtările: Laser, Blindaj, Releu, Undă, Rachete, Scut, Reparator, Motor, Magnet. Purtările care nu cumpără turele („Doar navă”, „Fără turele”) iau Releul ultimul, deci doar dacă nu au altă ofertă: Releul grăbește doar turelele, iar la ele ar fi un loc irosit (propunere, din valul de reparații de după recenzie). Un jucător nu stă pe un cerc care nu e ținta lui, ca să nu plătească din greșeală, iar un cerc străin construit îl ocolește împreună cu clădirea lui, ca pe un singur obstacol (altfel nava rămânea în colțul dintre ele). Tabelul depinde de aceste alegeri: dacă purtarea se schimbă, se schimbă și cifrele.

**Cu „Explorează galaxia” (21.11.2026).** Jucătorii automați joacă mereu fără întăriri; limitele de mai sus nu s-au atins și trec neschimbate (tabelul din „Măsurat cu nava cu module” e și cel de azi, rulat din nou pe 21.11.2026 cu `npm run balance`: aceleași cifre). Tabelul capătă rânduri doar tipărite, fără limită (două la început, al treilea din valul de reparații):

- **„Amestec, cu toate întăririle la plafon”: 336 s (+9,7% față de Amestec).** Arată cât ușurează atelierul apărarea. Ținta de reglaj (nu limită) era ca rândul să nu treacă cu mai mult de un sfert peste „Amestec” fără întăriri; e la 9,7%. Dacă ar trece, se micșorează plafoanele, nu limitele.
- **„Zbor, sectorul 1, navă condusă de script: 99 cristale, 32,5 metal”** (mediana pe semințele 1…10; toate cele zece zboruri ajung la sector explorat, la 230–268 s). Nava scriptului se plimbă dintr-o margine în cealaltă în 7 s, la înălțimea de pornire, și nu poate fi lovită; nu e un jucător automat și nu păzește nimic, doar dă cifra de pornire pentru prețurile atelierului. Fiindcă stă jos pe ecran, cifra e mai degrabă de jos: un om care urcă după module și după resurse ar aduce mai mult. Rândul se măsoară pe loc, la fiecare `npm run balance`; nicio cifră nu stă scrisă de mână în cod.
- **„Atelierul la plafon (2960 cristale, 770 metal): 29,9 zboruri, după cristale (29,9 la cristale, 23,7 la metal)”** (din valul de reparații de după recenzia etapei): câte zboruri ca al scriptului costă toate întăririle de la treapta 1 la plafon, pe resursa care cere mai multe, cu cele două cifre între paranteze. Ținta de ritm din spec (vreo 30 de zboruri; ținta de lucru a fost 25–35) **se judecă la reglaj, din rândul acesta**, nu dintr-un test: designul spune că nava scriptului nu păzește nimic, iar ritmul e „țintă de reglaj”. Până la valul de reparații, `src/bots/flightYield.test.ts` cerea cifra exactă și fereastra de 25–35 de zboruri și pica `npm run check` la orice cifră de zbor mutată; acum păstrează doar testele că măsurătoarea e deterministă și că nava scriptului ajunge la capătul sectorului.

**Comanda.** `npm run balance` rulează cele 120 de partide (6 jucători × 20 de semințe, cam 15 s) și tipărește tabelul, plus cele trei rânduri de mai sus; cu `-- --raze` tipărește și razele de apărare 80 și 160 (cam 40 s). Comanda doar afișează. Limitele rulează ca teste în `src/bots/net.test.ts` și pică build-ul când sunt depășite. Zgomotul tabelului, măsurat la faza 3 (istorie, nerefăcut cu nava cu module): o schimbare mică de cifre (viața dușmanului cu t / 44 … t / 46 în loc de t / 45, cum era atunci) muta „Amestec” între 326 și 344 s și procentele cu până la 3 puncte; un ultim bit diferit în calcule, ca pe altă mașină, îl muta cu cam ±2 s și procentele cu sub un punct.

**Măsurat cu nava cu module, după regula Releului** (`npm run balance`, mediana pe 20 de semințe, raza de apărare 120, rulat în valul de reparații de după recenzie, 21.11.2026; cifrele rotunjite, procentele din „Amestec”):

| Jucător | Mediana | Procent din „Amestec” | Verdict | Nivel la sfârșit | Nivel 2 | Nivel 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Nimic | 66 s | | în limită | 1 | — | — |
| Amestec | 306 s | | în limită | 7 | 48 s | 145 s |
| Doar navă | 205 s | 66,9% | în limită | 2,5 | 47 s | — |
| Fără navă | 219 s | 71,6% | în limită | 1 | — | — |
| Fără economie | 278 s | | fără limită | 4 | 45 s | — |
| Fără turele | 246 s | 80,3% | fără limită | 7 | 48 s | 140 s |

Cifrele astea sunt rezultatul reglajului din etapă (prețul și pragurile navei, viața dușmanului, Releul; vezi „Propuneri” de sus și `DEVLOG.md`) și al regulii Releului la jucătorii fără turele. Înainte de regula Releului, tabelul din încheierea etapei din `DEVLOG.md` avea „Doar navă” 199 s (65,0%) și „Fără turele” 235 s; celelalte rânduri nu s-au mișcat. „Amestec” ajunge la nivelul 7 (ținta din spec era 6–8), la nivelul 2 la 48 s și la nivelul 5 pe la minutul 2,4. „Doar navă” rămâne la nivelul 2 sau 3 (cauza e mai jos, la „Ce nu vede plasa”; „2,5” e mediana a zece partide la nivelul 2 și zece la 3). „Fără turele” ține 246 s, 80,3% din „Amestec”: cu lista de preferințe din cod, turelele valorează cam 20% din cât ține „Amestec”. Razele 80 și 160, informație, rulate tot acum (`npm run balance -- --raze`): la 80, „Amestec” 290 s, „Doar navă” 67,1%, „Fără navă” 74,2%; la 160, „Amestec” 300 s, „Doar navă” 67,6%, „Fără navă” 73,5%.

**Ce nu vede plasa, la nava cu module.** Modulele de corp (Blindaj, Scut, Reparator) nu valorează aproape nimic pentru jucătorii automați, fiindcă nava lor e lovită rar și nu cade niciodată: cu „Amestec”, trei liste de preferințe dau armele întâi 303,7 s, utilitarele întâi 268,6 s și corpul întâi 250,5 s, deci armele bat corpul cu 21%. Cu cifre mult mai tari pentru corp, „corpul întâi” a urcat doar de la 250,5 la 252,8 s (măsurat la reglaj, vezi `DEVLOG.md`). Plasa nu poate spune deci dacă modulele de corp merită într-o partidă de om, unde nava ar putea fi lovită mai des. Releul se citește slab la scara jocului (un punct încercuit), iar la treapta 3 unele forme de pe navă se ating (țeava Laserului iese din inelul Scutului, potcoava Magnetului atinge cutia Rachetei); propuneri de aspect, de arătat lui Andrei.

**Ce nu vede plasa, la „Explorează galaxia”.** Nu există jucători automați pentru zbor: dificultatea lui (greutatea sectorului 1, cât durează până vine prima întărire, cât se simte un zbor de trei minute cu module) se reglează jucând, iar singura cifră măsurată e cea a navei conduse de script, care stă jos pe ecran. Plasa de la apărare măsoară doar apărarea fără întăriri și cu toate la plafon; ce se întâmplă între ele, cu un jucător care cumpără pe rând, nu e măsurat.

Tot aici, măsurate în valul de reparații de după recenzie (21.11.2026), cu un script de aruncat peste jucătorii automați din cod, după regula Releului (comanda și ieșirea sunt în raportul valului, nu în repo):

- **De ce „Doar navă” rămâne la nivelul 2 sau 3.** Nivelul 3 cere metal, iar jucătorul e ținut în luptă lângă planetă: pe cele 20 de semințe termină cu 0–5 metal și cu 45–92 de experiență strânsă, deci cu nivelul gata, dar neplătit. Limita „Doar navă ≤ 75%” măsoară deci o navă cu Unda și încă unul sau două module, nu o navă plină.
- **Plafonul navei singure.** „Doar navă” cu resurse nelimitate (cristalele și metalul puse la 999 la fiecare pas): 242,4 s (79,2% din „Amestec”, nivelul 7,5 la mediană) cu lista de preferințe din cod; 262,9 s (85,9%, nivelul 8) cu armele întâi (Laser, Undă, Rachete, Blindaj, Scut, Reparator, Motor, Magnet, Releu). Nava singură nu bate amestecul nici așa.
- **Cât valorează turelele depinde de lista de preferințe.** Cu armele întâi, „Fără turele” ține 264,6 s (86,5% din „Amestec”), deci turelele ar valora cam 13%, nu cam 20% ca în tabelul de mai sus.

La recenzia întregii ramuri, înainte de regula Releului, același fel de script dăduse: experiența de la sfârșit a lui „Doar navă” 43–82 (metalul tot 0–5), plafonul navei 236 s (77,2%, nivelul 7) cu lista din cod și 263 s (85,9%, nivelul 8) cu armele întâi, iar „Fără turele” cu armele întâi 264,6 s; cifrele cu armele întâi nu se mișcă la regula Releului, fiindcă acolo Releul e oricum ultimul.

**Măsurat după reechilibrarea din faza 3, înainte de nava cu module** (mediana pe 20 de semințe, raza de apărare 120, 18.11.2026; păstrat ca istorie, cifrele de azi sunt mai sus):

| Jucător | Mediana | Procent din „Amestec” | Verdict |
| --- | --- | --- | --- |
| Nimic | 65,6 s | | în limită |
| Amestec | 334,7 s | | în limită |
| Doar navă | 221,3 s | 66,1% | în limită |
| Fără navă | 250,5 s | 74,8% | în limită |
| Fără economie | 255,8 s | | fără limită |

„Amestec” iese puțin peste ținta de 330 s pe care și-o pusese planul fazei (pentru rezervă); limita din design, 360 s, ține. Înainte de reechilibrare, cu mersul de atunci, „Amestec” avea 372 s, peste limita de 360, iar „Doar navă” 67% și „Fără navă” 89%; cu mersul de acum, cifrele vechi dau „Amestec” 382 s.

**Razele 80 și 160** sunt informație, nu țintă. La raza 80: „Amestec” 299,1 s, „Doar navă” 72,3%, „Fără navă” 82,4%. La raza 160: „Amestec” 316,9 s, „Doar navă” 73,9%, „Fără navă” 79,2%.

**Ce e fragil, la nava cu module.** Viața dușmanului 14 × (1 + t / 33) a fost aleasă la reglaj și fiindcă t / 35 pica o regulă de mers a jucătorilor automați, nu o limită de dificultate: „cel mult 10 pași la rând pe un cerc străin” (`FOREIGN_STEPS` în `src/bots/bot.test.ts`), la „Fără turele”, sămânța 17, la 113,92 s (măsurat la reglajul din Task 3 și scris în `DEVLOG.md`; nerefăcut acum). Cine reglează mai departe se poate lovi de un test picat care nu ține de dificultate.

**Ce e fragil** (la faza 3, înainte de nava cu module; vezi mai sus „Ce nu vede plasa” pentru azi). „Amestec” e la 25 s de limita de sus (335 față de 360), iar la raza 160 „Doar navă” e la 73,9%, aproape de limită. Mai important, plasa măsoară mai puțin decât pare. „Doar navă” cumpără o singură dată: în 19 din 20 de partide ia nivelul 2 la secunda 18 și nimic altceva. Toți jucătorii sunt țintuiți lângă planetă în ultima treime a partidei (luptă în 88–95% din pași, iar „Amestec” termină cu 117–164 de cristale necheltuite), deci tabelul măsoară mai ales ce s-a cumpărat în prima jumătate. Raza 120 dă cel mai mic procent pentru „Doar navă” dintre 11 raze între 80 și 200 (la celelalte, 68,1–73,9%), iar o purtare la fel de rezonabilă (nava plecată la peste 200 de planetă se întoarce abia la două nave dușmane) dă „Doar navă” 76,7% din „Amestec”, peste limită. Plafonul navei a urcat cu reechilibrarea: nava de nivelul 2 primită pe gratis din prima secundă ține 80,8% din „Amestec” (înainte 73,7%), cea de nivelul 5, 98,7% (înainte 91,9%). Ce ține: niciuna din 13 variante de „Doar navă” care își amână lupta ca să cumpere mai mult n-a bătut „Amestec” (cel mai sus, 65,1%); deci „Doar navă nu bate amestecul” ține calitativ, dar pragul de 75% nu e robust la purtarea jucătorului automat.

Cu jucători care apără, limita „Doar navă” era îndeplinită chiar cu cifrele de dinainte (65% în explorare, 67% cu jucătorii din repo); peste limită era „Amestec” (368 s în explorare, 372 s cu jucătorii din repo). Problema văzută în prototip („Doar navă” ținea cât amestecul) a dispărut deci prin schimbarea instrumentului de măsură, adică jucători care apără planeta, nu printr-o schimbare a jocului. Cele două cifre schimbate la reechilibrare au adus „Amestec” în bandă fără să strice celelalte limite.

Prima pârghie de încercat, fiindcă nu schimbă senzația navei pe care Andrei a aprobat-o, era: dușmanii vin și în grupuri simultane din părți opuse, astfel încât o singură navă să nu poată fi în două locuri. A fost încercată în explorare, cu același număr total de nave: grupuri de 2 + 2 nu schimbă nimic (66% și 88%), iar grupuri de 3 + 3 fac jocul mai ușor („Amestec” 413 s) și duc „Fără navă” la 100%, fiindcă lovitura navei prinde tot grupul deodată. Nu s-a construit. Jucătorii de aruncat cu care a fost încercată pârghia nu s-au păstrat, deci cifrele acestea nu se mai pot reface.

Pârghia asta avantaja turelele, deci s-a verificat și pe limita „Fără navă”: dacă patru turele ajung singure, investiția în navă devine inutilă și anti-scopul e încălcat din partea cealaltă. Arcul și împinsul loviturii navei nu s-au atins.

„Fără economie” rămâne fără limită în v1, ca echilibrarea să nu aibă trei constrângeri care trag una de alta. Dacă tabelul arată că economia e inutilă, asta devine o problemă de rezolvat după v1.

## Înainte de construcție

Repo-ul e ales: WorldGuard, public. Erau două lucruri pe care le putea face doar Andrei; amândouă sunt făcute:

- [x] Aprobă accesul de scriere la WorldGuard pentru sesiunea care construiește, când apare cererea. Făcut pe 17.11.2026.
- [x] Pornește GitHub Pages din setările repo-ului, cu sursa „GitHub Actions”. Făcut de Andrei pe 17.11.2026; faza 1 e la `https://andreibesliu.github.io/WorldGuard/`.

Construcția se face pe o ramură separată din WorldGuard, cu pull request.

## Sfârșitul v1

### Când e gata v1

- Andrei deschide linkul pe telefon, instalează jocul și joacă o partidă în mod avion.
- Tot ce e în „Regulile jocului” și în „Ce e nou față de prototip” funcționează.
- Testele trec, inclusiv limitele din plasă.
- Un pas de simulare cu 150 de dușmani durează în medie sub 1 ms în rularea testelor. Marja e largă intenționat, ca testul să nu depindă de mașină.
- Viteza reală se verifică pe telefonul lui Andrei, nu în cloud, unde nu există placă grafică. De aceea prima construcție jucabilă ajunge pe telefonul lui înainte de restul v1, cu un afișaj de cadre pe secundă care se poate porni și cu o partidă în care apar 150 de dușmani. Dacă acolo jocul scade sub 60 de cadre pe secundă, desenatul trece pe PixiJS înainte de restul v1.

### Ce ar putea veni după v1

**Etapele următoare după „Explorează galaxia” (21.11.2026)**, în ordinea din spec (direcția e hotărâtă de Andrei, dar nimic nu e promis și fiecare etapă primește designul ei, cu el). Ce ține de „Explorează galaxia” și nu e încă făcut: proba lui pe telefon (vezi `DEVLOG.md`).

- **Întâi: dușmani de mai multe feluri și elite, pentru amândouă modurile.** Dușmani de mai multe feluri, fiecare cu unealta și atacurile lui, făcuți o singură dată pentru apărare și pentru zbor (tot atunci se revede focul dușman din zbor, hotărârea 25). Tot atunci, elitele care poartă mai multe obiecte (defensive, ofensive, logistice, strategice și altele), pe care le vezi pe ele; când dobori una, alegi un obiect de adoptat sau treci mai departe, în același panou. Propunere: obiectele adoptate intră în aceleași locuri ca modulele, iar când locurile sunt pline schimbi unul vechi pe cel nou.
- **Apoi: turele de mai multe feluri.** Felul se alege la construire. Propunere de pornire: laser (cea de azi), tun care lovește o zonă, frână care încetinește.
- **Apoi: tipuri de nave și deblocări.** Nave care pornesc altfel (armă, locuri, viață, viteză) și se deblochează între partide; tot aici, alegerea modulelor înainte de zbor.

Alte idei, fără ordine: sunet și vibrații, grafică desenată, feluri noi de dușmani (rapizi, care trag de la distanță, care atacă turelele), bariere, limită la cât cară nava, mai multe hărți, împachetare pentru magazin, limba engleză. (Îmbunătățirile păstrate între partide, care erau pe lista asta, sunt acum atelierul.)

**Misiunile speciale** (ideea lui Andrei, 2026-11-17): partide de alt fel, pe suprafața planetei, cu aspectul „Colonie” (varianta 3 din `docs/machete-tema-spatiu.html`, păstrată doar ca referință). Ce e o misiune, cum ajungi la ea și cum se termină nu s-a discutat. Ar fi un proiect separat, după v1, cu designul lui. Împărțirea desenului din tema de spațiu (aspectul în spatele interfeței `Skin`) există ca „Colonie” să fie, mai târziu, un al doilea modul și nu o rescriere.

### Lăsat constructorului

- Numele fișierelor și ale modulelor, în structura `src/sim`, `src/data`, `src/render`.
- CSS-ul exact, cât timp arată ca macheta „Orbită”.
- Cu ce unealtă se face partea de instalare și de joc fără internet.
- Dacă și cum se face o variantă într-un singur fișier, de arătat ca pagină privată înainte de publicare. (Făcut: `npm run single`, păzit din 21.11.2026 de `npm run check`.)
- Cum sunt scriși jucătorii automați, cât timp fac ce spune tabelul.
- Cifrele de echilibru, cât timp plasa trece și regulile rămân cele de mai sus.
