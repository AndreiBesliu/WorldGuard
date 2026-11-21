# World Guard: „Explorează galaxia”

Scris pe 2026-11-21, din discuția cu Andrei din aceeași zi. Așteaptă aprobarea lui.
Machetele: [`docs/machete-exploreaza-galaxia.html`](../../machete-exploreaza-galaxia.html).
Prototipul de aruncat pe care l-a încercat Andrei pe telefon, referință de **purtare** (nu de cod): [`docs/prototip-explorare.html`](../../prototip-explorare.html).
Regulile de azi ale jocului sunt în [`docs/GDD.md`](../../GDD.md); documentul de față spune doar ce se adaugă și ce se schimbă.

## Intenția

Andrei vrea un mod în care „jocul devine ceva diferit”: nava pleacă de lângă planetă și zboară prin galaxie. Înaintează singură, trage singură, dușmanii vin din partea de sus a ecranului, iar jucătorul o ferește de focul lor. Din zbor aduce acasă resurse, cu care își întărește nava pentru totdeauna.

De ce: să existe și altceva de făcut decât apărarea planetei, și un fir care leagă partidele între ele. Până acum fiecare partidă pornea de la zero.

## Cine a hotărât ce

**Hotărât de Andrei (21.11.2026). Nu se redeschide fără el.**

1. Un mod nou, „Explorează galaxia”: nava zboară înainte și trage în dușmani care vin din partea de sus a ecranului; jucătorul se ferește de armele lor.
2. Din explorare aduci resurse cu care întărești arsenalul sau cifrele de bază ale navei.
3. Întăririle cumpărate contează **peste tot**, și în explorare, și la apărarea planetei. A ales asta dintre trei variante, după ce i s-a spus prețul: apărarea devine mai ușoară cu timpul, deci întăririle trebuie ținute mici și cu plafon, iar dificultatea se măsoară în continuare cu nava neîntărită.
4. Nava se conduce **cu degetul** (nava urmează mișcarea degetului), nu cu joystickul. Le-a încercat pe amândouă în prototip.
5. Focul dușman din prototip e în regulă deocamdată. Se revede când apar dușmani de mai multe feluri, cu atacuri diferite.
6. Un zbor ține **trei minute**.
7. În zbor nava capătă arme și module, dar **nu dintr-un panou**: sunt lucruri peste care nava zboară ca să le culeagă, ca resursele, iar întăririle se aplică singure. Jocul nu se oprește.

**Propus de Claude și acceptat de Andrei când i-a fost arătat („e ok, continuă”, 21.11.2026).**

- Modulele culese țin doar zborul acela. Acasă ajung doar cristalele și metalul, într-o rezervă care se păstrează între partide.
- Dacă nava e doborâtă, păstrezi ce ai strâns până atunci, dar nu mai primești prada navei de elită.
- La capătul fiecărui sector te așteaptă o navă de elită. Fiecare sector explorat îl deschide pe următorul, mai greu și mai bogat.
- Un atelier vinde puține întăriri, mici și cu plafon: viața navei, lovitura armelor, raza de strâns, viața planetei și modulul cu care pornești la drum.
- Apărarea planetei rămâne cum e, cu panoul ei de alegere la fiecare nivel.
- Ordinea: întâi bucla întreagă (zborul, rezerva, atelierul); apoi dușmanii de mai multe feluri, o singură dată, pentru amândouă modurile.

**Ales de Claude, de verificat de Andrei odată cu documentul.** Până le vede în joc, toate sunt propuneri.

- Felul în care se construiește (vezi „Abordări”).
- Cele cinci module din zbor și cifrele lor; navele de transport care le lasă în urmă; reparația.
- Cele trei feluri de dușmani, asteroizii, nava de elită și cifrele lor. Sunt cele din prototip.
- Lista din atelier, treptele, plafoanele și prețurile.
- Cum cresc sectoarele și că poți zbura din nou un sector deja explorat.
- Recordul de la apărare rămâne unul singur, cu sau fără întăriri.
- Un zbor întrerupt de închiderea paginii nu se reia; ce ai strâns până atunci rămâne al tău.
- Lupta cu nava de elită nu are limită de timp: zborul ține până cade una dintre nave.
- Cum arată cartonașul de start cu două moduri, atelierul și cartonașul de la sfârșitul zborului (machetele).

Andrei a încercat pe telefon prima variantă a prototipului (un minut și jumătate, fără module). Varianta a doua, cu trei minute și cu module culese din zbor, i-a fost dată, dar nu a spus dacă a încercat-o.

## Scopuri

1. De pe cartonașul de start se poate porni un zbor de explorare, la fel de ușor ca o partidă de apărare.
2. Un zbor ține cam trei minute și se încheie cu o navă de elită. Nava se conduce cu degetul.
3. În zbor, nava culege arme și module zburând peste ele; ele se pun singure pe navă și se întăresc la a doua culegere.
4. Cristalele și metalul strânse în zbor ajung într-o rezervă care se păstrează între partide și se vede pe cartonașul de start.
5. În atelier, rezerva se cheltuie pe întăriri care rămân pentru totdeauna.
6. Întăririle se simt și în zborul următor, și în următoarea partidă de apărare.
7. Un sector explorat îl deschide pe următorul, mai greu și mai bogat.
8. Cu rezerva goală și nicio întărire, apărarea planetei se joacă exact ca azi, pas cu pas.

## Ne-scopuri

- Dușmani de feluri noi și atacuri noi: etapa următoare, pentru amândouă modurile.
- Obiecte adoptate de la navele de elită, tipuri de turele, tipuri de nave, alegerea modulelor înainte de zbor.
- O hartă a galaxiei. Sectoarele sunt un șir numerotat.
- Sunet.
- Reluarea unui zbor după ce pagina a fost închisă.
- Jucători automați pentru zbor. Dificultatea zborului se reglează deocamdată jucând.
- Locuri limitate pentru module în zbor și module pierdute la o lovitură.

## Anti-scopuri

Ar fi un eșec, chiar dacă totul merge:

- **„Trebuie să explorezi ca să poți apăra.”** Apărarea trebuie să rămână întreagă și plăcută fără nicio întărire.
- **Întăririle golesc de sens dificultatea.** De aceea au plafon, iar limitele din design se măsoară cu nava neîntărită.
- **Ai pierdut ce ai strâns** fiindcă telefonul a închis pagina în mijlocul zborului.
- **Nu deosebești ce te ajută de ce te lovește.** Un modul de cules, o resursă și un proiectil dușman nu au voie să semene.
- **Cumperi fără să vrei** în atelier, dintr-o atingere scăpată.
- **Degetul acoperă nava.** Nava urmează mișcarea degetului, nu sare sub el.
- **Zborul schimbă apărarea pe furiș.** Regulile, salvarea și jucătorii automați de la apărare nu au voie să se strice din cauza modului nou.

## Constrângeri

- Aceeași aplicație, aceleași unelte: TypeScript, Vite, Vitest fără DOM simulat, Canvas 2D, nicio dependență nouă la rulare.
- Regulile zborului respectă disciplina din `src/sim/`: pas fix de 1/60 s, fără DOM, fără ceasul sistemului, fără hazard global; aceeași sămânță și aceleași comenzi dau aceeași stare; starea e date simple.
- Regulile zborului nu depind de mărimea ecranului. Pe telefonul de referință (Samsung Galaxy A54, în picioare) tot câmpul de joc se vede.
- Cifrele de joc stau în `src/data/`; textele pentru jucător în `src/ui/strings.ts`, în română.
- Pe canvas: doar forme pline și linii, culorile din paletă; fără `shadowBlur`, fără `ctx.filter`; gradient și decupaj doar unde le îngăduie azi `src/render/discipline.test.ts` sau într-un loc nou, numit anume acolo.
- 60 de cadre pe secundă pe telefonul de referință în clipa cea mai plină a unui zbor.
- Aspectul e al jocului („Orbită”), fără să copieze vreun joc existent.
- Lucrul se așază pe ramura de lucru, peste nava cu module (pull request-ul #15, neîmbinat). Îmbinarea publică jocul și rămâne hotărârea lui Andrei.

## Cum merge

### Zborul

- Câmpul de joc stă în picioare și are 390 de unități lățime. Nava e în partea de jos; cerul curge în jos, ca nava să pară că înaintează.
- **Condusul.** Jucătorul pune degetul oriunde și îl mișcă; nava face aceeași mișcare, de 1,2 ori mai mare, cu cel mult 1100 de unități pe secundă. Nu sare sub deget. La marginea câmpului se oprește, iar întoarcerea degetului se simte imediat. Nava poate urca până la 30% din înălțimea câmpului, măsurat de sus. Cu tastatura (săgeți sau WASD) merge cu 255 de unități pe secundă.
- **Viața.** Nava ține cinci lovituri. O lovește un proiectil dușman, o navă dușmană sau un asteroid care o atinge. După o lovitură are 1,2 secunde în care nu mai poate fi lovită și clipește. Contează doar un punct mic din mijlocul navei (raza 6), desenat vizibil.
- **Tunul** trage singur, drept înainte, tot timpul.
- **Sfârșitul.** La 2 minute și 50 de secunde dușmanii obișnuiți nu mai apar și vine nava de elită. Dacă e doborâtă, sectorul e explorat; jucătorul mai are 3,4 secunde să strângă ce a lăsat. Dacă nava jucătorului pierde a cincea viață, zborul se încheie pe loc.
- **Lupta cu nava de elită nu are limită de timp.** Zborul ține până cade una dintre cele două nave; alt sfârșit nu există. „Trei minute” înseamnă drumul până la ea plus o luptă scurtă. Tunul trage tot timpul, deci lupta nu poate rămâne pe loc.
- La jumătatea sectorului sunt câteva secunde fără dușmani noi.
- **Pauza** merge ca la apărare: buton, Escape, pagina ascunsă.

### Armele și modulele din zbor

Nava pornește doar cu Tunul la treapta 1. Restul se culeg. Fiecare are trei trepte; culegerea unui modul pe care îl ai îl urcă o treaptă. Un modul cules când e deja la treapta 3 dă 5 cristale.

| Modul | Fel | Ce face | Treapta 1 | Treapta 2 | Treapta 3 |
| --- | --- | --- | --- | --- | --- |
| Tun | armă | proiectile drept înainte, la 0,11 s, 4 lovitură fiecare | 2 proiectile | 3, în evantai mic | 5, în evantai |
| Laser | armă | la 0,9 s lovește cel mai apropiat dușman, până la 300 de unități | 14 | 22 | 32 |
| Rachete | armă | la 2,4 s pleacă o rachetă care își caută ținta și lovește tot pe o rază de 50 | 12 | 18 | 26 |
| Scut | corp | oprește o lovitură, apoi se reîncarcă | în 6 s | în 4,5 s | în 3 s |
| Magnet | utilitar | resursele vin spre navă de mai departe (fără el, de la 85 de unități) | +45 | +90 | +135 |

- **De unde vin.** Din când în când (la 14–18 secunde, prima la secunda 5) trece o **navă de transport**, gri, care nu trage. Doborâtă, lasă în urmă un modul. Dacă scapă, modulul e pierdut. De cele mai multe ori lasă ceva ce nava încă nu are.
- **Cum se culeg.** Modulul coboară încet. Nu vine spre navă, nici cu Magnetul: trebuie să zbori peste el. Se pune singur, fără oprire; un rând scurt de text spune ce ai luat („Laser · nou”, „Tun · treapta 2”).
- **Reparația.** Când nava e lovită, transportul poate lăsa în locul unui modul o reparație, care dă înapoi o viață.
- Nu există locuri limitate: nava poate avea toate cele cinci module. Modulele nu se pierd la o lovitură. La sfârșitul zborului dispar.
- Numele, culorile felurilor și pictogramele sunt cele de la apărare, unde modulul există și acolo. Tunul e nou.

### Dușmanii

Cei din prototip. Viața lor crește pe parcursul sectorului, până la de 1,8 ori spre capăt, ca armele culese să aibă de lucru.

| Dușman | Viață | Ce face |
| --- | --- | --- |
| Dronă | 14 | coboară drept; trage drept în jos, la 1,7 s |
| Șerpuitoare | 20 | coboară șerpuind; trage spre navă, la 2,1 s |
| Grea | 70 | se oprește sus și se plimbă; trage trei proiectile în evantai spre navă, la 1,9 s; pleacă după 9 s |
| Transport | 34 | nu trage; lasă un modul |
| Elită | 1400 | stă sus și se leagănă; alternează un cerc de 14 proiectile cu două salve de câte 5 spre navă; sub jumătate din viață trage mai des și cercul are 18 |

- Proiectilele dușmane merg cu 120–185 de unități pe secundă. Un dușman nu trage de foarte aproape și nici după ce a trecut de navă.
- **Asteroizii** coboară încet și nu trag. Lovesc nava dacă o ating. Sparți, lasă metal.
- Dușmanii lasă cristale: unul cei mici, 4 nava grea, 24 nava de elită.
- Dronele vin tot mai des pe parcurs; șerpuitoarele apar după secunda 24, navele grele după secunda 50.

### Resursele, rezerva și sectoarele

- Cristalele și metalul rămase în urmă coboară încet și vin singure spre navă când e aproape.
- Banda de sus arată ce a strâns zborul. La sfârșit, totul se adaugă la **rezervă**.
- **Nimic strâns nu se pierde.** Dacă nava e doborâtă, ce a strâns rămâne. Dacă pagina e închisă în mijlocul zborului, la fel. Nimic nu se numără de două ori.
- **Sectoarele** sunt numerotate de la 1. Sectorul explorat cel mai departe se ține minte. Se poate zbura orice sector până la următorul neexplorat.
- De la un sector la altul cresc viața dușmanilor, desimea lor, viața navei de elită și cât lasă în urmă. Viteza și forma focului dușman nu se schimbă în etapa asta (hotărârea 5).
- Sectorul 1 e cel din prototip.

### Atelierul

Se deschide de pe cartonașul de start. Arată rezerva și cinci întăriri. Fiecare are trepte, un plafon și un preț care crește cu treapta.

| Întărire | La apărarea planetei | În explorare | Trepte |
| --- | --- | --- | --- |
| Carenă | viața navei +6 pe treaptă | o lovitură în plus la treptele 2 și 4 | 4 |
| Armament | lovitura tuturor armelor navei +4% pe treaptă | la fel | 5 |
| Colectare | nava strânge de la 10% mai departe pe treaptă | resursele vin de la 10% mai departe pe treaptă | 3 |
| Planetă | viața planetei +5% pe treaptă | nimic | 4 |
| Arsenal de pornire | nimic | zborul pornește și cu Laserul; la treapta 2 și cu Rachetele; la treapta 3 și cu Scutul (toate la treapta 1) | 3 |

- La plafon, toate la un loc dau la apărare: nava cu 24 de viață în plus (la nivelul 1 are 60), armele cu 20% mai tari, strânsul cu 30% mai departe, planeta cu 20% mai multă viață (are 400).
- **Ritmul, ca țintă de reglaj:** prima întărire se poate cumpăra după primul sector explorat; toate la plafon după vreo 30 de zboruri. Prețurile se aleg ca să iasă așa și se scriu ca propuneri.
- **Cum se află cât aduce un sector:** se măsoară cu o navă condusă de un script simplu, care se plimbă dintr-o parte în alta și nu poate fi lovită. Nu e un jucător automat și nu păzește nimic; dă doar o cifră de pornire, care se scrie în `DEVLOG.md`. Prețurile stau în `src/data/`, ușor de schimbat după ce joacă Andrei.
- **Procentele se aplică fără rotunjire.** Lovitura unei arme poate fi un număr cu zecimale (Tunul la Armament 5: 4,8).
- O cumpărare e o apăsare pe butonul cu prețul și nu se poate da înapoi. Butonul nu se poate apăsa când rezerva nu ajunge sau când întărirea e la plafon.

### Ce se schimbă la apărarea planetei

- O partidă nouă pornește cu întăririle din atelier. Ele se țin minte în partida însăși, ca o partidă reluată să continue la fel chiar dacă atelierul s-a schimbat între timp.
- Fără nicio întărire, partida e identică, pas cu pas, cu cea de azi.
- Recordul rămâne unul singur.
- Cartonașul de start capătă al doilea mod, rezerva și atelierul. „Continuă partida” și „Test de viteză” rămân. Un zbor nu șterge partida de apărare salvată.

## Ce se vede

Machetele arată cartonașul de start, atelierul și cartonașul de la sfârșitul zborului. Zborul însuși arată ca în prototip, cu formele trecute în stilul jocului.

- **Cartonașul de start**: două butoane mari, „Apără planeta” și „Explorează galaxia”, cu sectorul sub al doilea; un rând cu rezerva și butonul „Atelier”.
- **În zbor**, banda de sus: ce a strâns zborul, viețile navei, drumul prin sector (care devine viața navei de elită), modulele navei cu treptele lor, butonul de pauză.
- **Sfârșitul zborului**: „Sector explorat” sau „Nava a fost doborâtă”, ce ai adus, cât are acum rezerva, și butoanele „Sectorul următor” (sau „Încă un zbor”), „Atelier” și „Înapoi”.
- **Atelierul**: rezerva sus; câte un rând pe întărire, cu numele, ce face, treptele ca puncte și butonul cu prețul.

## Stocarea

- Rezerva, întăririle și sectorul cel mai îndepărtat stau într-un singur loc din stocarea telefonului, lângă record și lângă partida salvată, cu versiune și verificate la citire. Un conținut stricat înseamnă „rezervă goală, nicio întărire”, nu o oprire a jocului.
- Rezerva nu poate fi negativă, iar o întărire nu poate trece de plafon, nici dintr-un conținut alterat.
- Întăririle cu care a pornit o partidă de apărare fac parte din starea ei: regulile le citesc de acolo, nu din stocare. Forma stării se schimbă deci, iar versiunea salvării crește. O salvare cu versiunea de azi se primește în continuare și se citește ca „fără întăriri”.
- „Apărarea rămâne neatinsă” se referă la purtare, nu la fișiere. Înainte de schimbare, un test fixează rezultatul unei partide întregi; după schimbare, aceeași partidă, fără întăriri, trebuie să dea același rezultat.

## Plasa pentru dificultate

- Jucătorii automați joacă mereu fără întăriri. Limitele din design nu se ating și trebuie să treacă neschimbate.
- Tabelul capătă un rând doar tipărit: „Amestec, cu toate întăririle la plafon”. Arată cât de mult ușurează atelierul apărarea.
- **Țintă de reglaj, nu limită:** rândul acela să nu treacă cu mai mult de un sfert peste „Amestec” fără întăriri. Dacă trece, se micșorează plafoanele, nu limitele.

## Abordări

1. **Un al doilea joc lângă primul, în aceeași aplicație (aleasă).** Zborul are starea, pasul, cifrele și desenul lui, separate de apărare. Cele două se ating în două locuri: rezerva cu întăririle, și aplicația care știe ce joc e pe ecran. Apărarea, testele ei și jucătorii automați rămân neatinse. Prețul: o parte din ce există la apărare (ținta cea mai apropiată, rachetele) se scrie a doua oară, pentru zbor.
2. **Același joc, cu un comutator de mod.** Ar refolosi armele navei. Dar modurile diferă în aproape tot (fără planetă și cercuri, cu foc dușman și lucruri de cules): starea ar ține câmpuri fără rost în fiecare mod, iar salvarea și jucătorii automați de la apărare s-ar putea strica din cauza zborului.
3. **O pagină separată pentru explorare.** Cea mai izolată, dar ar dubla instalarea și jocul fără internet și n-ar mai părea un singur joc.

Andrei lasă felul de construit în seama lui Claude; alegerea e a lui Claude.

## Cum se verifică

- **Regulile zborului**, cu teste: aceeași sămânță și aceleași comenzi dau aceeași stare; nava nu iese din câmp; un modul cules se pune și se oprește la treapta 3; Scutul oprește o lovitură și se reîncarcă; nava de elită doborâtă încheie sectorul, a cincea lovitură încheie zborul; ce s-a strâns ajunge în rezervă o singură dată, și la sfârșit, și la pagina închisă.
- **Rezerva și atelierul**, cu teste: conținut stricat sau alterat; cumpărare fără destule resurse; plafonul.
- **Apărarea**, cu teste: fără întăriri, o partidă întreagă iese identică cu cea de azi; cu întăriri, viața navei, lovitura, strânsul și viața planetei sunt cele din tabel; salvarea veche se citește.
- **Plasa** trece neschimbată; rândul nou se tipărește.
- **Proba din browser**: un zbor pornit de pe cartonaș; un modul cules; sfârșitul; rezerva crescută pe cartonașul de start; o întărire cumpărată; o partidă de apărare care o are. Se măsoară timpul de desen în clipa cea mai plină a zborului.
- **Jocul într-un singur fișier** (`npm run single`) e rulat de o verificare automată. S-a stricat o dată fără să se vadă.
- **Pe telefon**, de Andrei: cum se simte un zbor de trei minute cu module; cât de greu e sectorul 1; dacă prima întărire vine la timp.

## Documente de adus la zi

`docs/GDD.md` („Cine a hotărât ce”, regulile și cifrele modului nou, plasa), `CLAUDE.md` (ce e, arhitectura, starea), `README.md`, `DEVLOG.md`.

## Etapele următoare

- Dușmani de mai multe feluri, cu atacurile lor, pentru amândouă modurile; tot atunci, obiectele adoptate de la navele de elită.
- Tipuri de turele. Tipuri de nave și alegerea modulelor înainte de zbor.

Fiecare își primește designul ei, cu Andrei.

## Lăsat constructorului

- Unde stau fișierele și cum se numesc, în cadrul abordării alese.
- Cum arată comanda de condus pe care o primește pasul zborului.
- Mărimea exactă a câmpului și cum se potrivește pe ecrane mai înalte sau mai scunde.
- Formele din zbor, în stilul jocului; prototipul e reper de purtare, nu de aspect.
- Formulele după care cresc sectoarele și prețurile din atelier, în limitele țintelor de mai sus. Toate se scriu ca propuneri.
- Cum se ține minte ce s-a strâns ca să nu se piardă și să nu se numere de două ori.
- Așezarea exactă în bandă și în cartonașe, pornind de la machete.

## Când e gata

Andrei deschide jocul pe telefon și alege „Explorează galaxia”. Zboară trei minute prin sectorul 1, culege câteva module, doboară nava de elită și vede ce a adus. Pe cartonașul de start, rezerva a crescut. Deschide atelierul, cumpără o întărire, și o simte și în zborul următor, și în următoarea partidă de apărare.
