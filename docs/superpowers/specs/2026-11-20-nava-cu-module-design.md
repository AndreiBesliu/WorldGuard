# World Guard: nava cu module

Scris pe 2026-11-20, din discuția cu Andrei din 18–20.11.2026, și aprobat de el în aceeași zi. E prima etapă de după v1.
Planul de construcție: [`docs/superpowers/plans/2026-11-20-world-guard-nava-cu-module.md`](../plans/2026-11-20-world-guard-nava-cu-module.md).
Machetele: [`docs/machete-nava-cu-module.html`](../../machete-nava-cu-module.html) (aceeași pagină pe care a văzut-o Andrei).
Regulile de azi ale jocului sunt în [`docs/GDD.md`](../../GDD.md); documentul de față spune doar ce se schimbă și ce se adaugă.

## Intenția

Andrei vrea ca nava să devină ceva ce construiești în timpul partidei, nu un număr care crește: arme și componente de mai multe feluri, experiență strânsă în luptă înainte de fiecare nivel, și o alegere adevărată la fiecare nivel. În cuvintele lui: „vreau să ai în vedere diferite tipuri de turnuri și arsenal, inclusiv pentru navă. Nava are nevoie de XP înainte de upgrade, dar tot folosește resurse. Și vreau un sistem complex de customizare pentru navă la levelup.”

Cererea întreagă e mai mare decât o etapă: turele de mai multe feluri, dușmani de mai multe feluri cu uneltele lor, elite de la care adopți obiecte, tipuri de nave care se deblochează. Le luăm pe rând (vezi „Etapele următoare”). Etapa de față e nava: experiența, nivelul cu alegere și modulele.

## Cine a hotărât ce

**Hotărât de Andrei. Nu se redeschide fără el.**

1. Nava are nevoie de experiență înainte de fiecare nivel, iar nivelul se plătește în continuare cu resurse.
2. La fiecare nivel alegi un cartonaș din trei (dintre trei feluri de a face alegerea, l-a ales pe acesta).
3. Cât alegi, jocul e pe pauză, panoul apare pe mijlocul ecranului, iar fundalul e încețoșat. Asta schimbă, doar pentru clipa alegerii, hotărârea 2 din `docs/GDD.md` („totul e în timp real”).
4. În joc, nivelul, experiența și locurile de module stau în banda de sus (macheta „Totul în banda de sus”).
5. Nava are arsenal de mai multe feluri și poate purta tot mai multe componente pe parcurs.
6. Pentru etapele următoare: turele de mai multe feluri; dușmani de mai multe feluri, fiecare cu uneltele lui; elite care poartă mai multe obiecte (defensive, ofensive, logistice, strategice și altele), de la care poți adopta un obiect când le dobori; poate tipuri de nave care se deblochează.
7. Faza 3 (plasa pentru dificultate) rămâne deocamdată în pull request-ul ei; lucrul acesta se așază peste ea.

**Propus de Claude și acceptat de Andrei când i-a fost arătat („e ok”, 19.11.2026).**

- Experiența vine din orice navă dușmană doborâtă, nu doar din cele lovite de navă.
- Când bara e plină, cercul navei se aprinde; plătești acolo, ca azi, și urci un nivel.
- Într-o partidă bună ajungi la 6–8 niveluri.
- Nava pornește cu 2 locuri (unul ocupat de unda de azi) și primește câte unul la fiecare două niveluri, până la 6.
- La nivel pui un modul nou într-un loc liber sau întărești unul pe care îl ai, până la treapta 3.
- Cele nouă module de la început (vezi „Modulele”), între ele Motorul, care schimbă viteza navei. Armele trag toate singure, fiecare în ritmul ei.
- Nivelul singur dă doar puțină viață; puterea vine din module.
- Ordinea etapelor: nava; apoi dușmanii și elitele; apoi turelele; apoi tipurile de nave.

**Propus de Claude și acceptat de Andrei odată cu documentul (20.11.2026).** I-au fost arătate ca listă de alegeri de verificat.

- Cele trei oferte sunt rânduri late în panou, nu cartonașe alăturate.
- Regulile după care se aleg ofertele, nivelul maxim 9, experiența în plus care se păstrează.
- Cifrele de pornire ale modulelor și ale experienței. Sunt propuneri; se reglează cu plasa.
- Cum se împacă Motorul cu hotărârea 10 din `docs/GDD.md` (nava se mișcă exact ca înainte): fără Motor, nava se mișcă neschimbat; cu el, mai repede, la alegerea jucătorului. Andrei a acceptat lista cu Motorul pe ea; dacă îl vrea scos, lista rămâne de opt module și nimic altceva nu se schimbă.
- Ce cifre se pot regla și ce nu (vezi „Plasa pentru dificultate”), și faptul că țintele de ritm ale nivelurilor sunt intenție, nu limite.
- Încețoșarea se face în pagină, nu pe canvas.
- Un rând nou, doar tipărit, în tabelul jucătorilor automați: „Fără turele”.

## Scopuri

1. Nava strânge experiență din navele dușmane doborâte și nu poate urca un nivel fără ea.
2. Nivelul se plătește la cercul navei, cu resurse, ca azi.
3. După fiecare nivel, jocul se oprește și jucătorul alege una din trei oferte.
4. Nava are locuri pentru module; numărul lor crește cu nivelul.
5. Există nouă module, de trei feluri, fiecare cu trei trepte. Fiecare schimbă ceva ce se vede sau se simte în joc.
6. Două partide cu semințe diferite primesc oferte diferite; aceeași sămânță dă aceleași oferte.
7. O partidă întreruptă în timpul alegerii se reia în aceeași alegere.
8. Plasa pentru dificultate trece cu regulile noi.

## Ne-scopuri

- Dușmani de feluri noi, elite, obiecte adoptate: etapa 2.
- Turele de mai multe feluri: etapa 3.
- Tipuri de nave și orice se păstrează de la o partidă la alta în afara recordului: etapa 4.
- Schimbatul sau aruncatul unui modul. În etapa asta un modul pus rămâne pus.
- Sunet, vibrații, grafică desenată, altă limbă.

## Anti-scopuri

Rămân cele din `docs/GDD.md`. Pentru etapa asta, în plus, jocul a eșuat dacă:

- **Un modul e răspunsul evident.** Dacă aceeași alegere e cea mai bună în orice partidă, nu mai e alegere.
- **Nava ajunge să facă tot.** Turelele și economia trebuie să rămână investiții care merită. De aceea există Releul, iar plasa își păstrează limitele.
- **Panoul cere citit mult.** O ofertă se înțelege din nume, pictogramă și cel mult două rânduri scurte.
- **Alegi fără să vrei.** O atingere rătăcită, rămasă de la joystick, nu are voie să aleagă un modul.

## Constrângeri

- Toate constrângerile din `docs/GDD.md` și regulile dure din `CLAUDE.md` rămân: simulare deterministă cu pas fix, stare care trece prin JSON, cifre doar în `src/data/`, texte doar în `src/ui/strings.ts`, telefon ținut vertical, un singur deget.
- Alegerea face parte din starea jocului. Cât o ofertă e deschisă, simularea stă pe loc: niciun pas nu schimbă nimic până nu se alege.
- Ofertele vin din sămânța partidei, printr-un flux de hazard al lor.
- Forma stării se schimbă, deci versiunea salvării urcă. O salvare veche se aruncă fără eroare, cum se întâmplă deja.
- Panoul e HTML și CSS peste canvas, ca celelalte cartonașe. Regula „fără `ctx.filter` și fără `shadowBlur` pe canvas” rămâne.
- Țintă de 60 de cadre pe secundă pe Samsung Galaxy A54, cu 150 de dușmani și cu toate armele trăgând. Se verifică pe telefonul lui Andrei, la sfârșit; nu blochează feliile de lucru.
- Se construiește peste ramura fazei 3, fiindcă folosește plasa și jucătorii automați de acolo. Dacă ajunge în același pull request sau într-unul nou, după unirea fazei 3, hotărăște Andrei.

## Cum merge

### Experiența

- Fiecare navă dușmană doborâtă dă experiență, oricine a doborât-o: nava, o turelă sau amândouă. Nava grea dă mai mult.
- Experiența se strânge și cât nava e doborâtă.
- Fiecare nivel are pragul lui. Experiența strânsă peste prag nu se pierde: trece la nivelul următor.
- La nivelul maxim (9), experiența nu mai contează și banda arată asta.
- În „Test de viteză” nu există experiență și niveluri.

Cifre de pornire: nava invadatoare dă 1, cea grea 4. Pragurile pentru nivelurile 2–9: 6, 10, 13, 16, 20, 24, 28, 34. Ținta lor: nivelul 2 pe la secunda 40, nivelul 5 pe la minutul 2, nivelul 8 pe la minutul 4, pentru un jucător care se descurcă.

Țintele astea, ca și „6–8 niveluri într-o partidă bună”, sunt intenție, nu limite. Comanda `npm run balance` tipărește pentru „Amestec” la ce nivel ajunge și când atinge nivelurile 2 și 5, ca să se vadă; niciun test nu pică din ele.

### Nivelul și plata

- Cât pragul nu e atins, cercul navei nu primește plată. Sub el scrie câtă experiență e strânsă din câtă trebuie.
- Când pragul e atins, cercul se aprinde și își arată prețul. Plata merge ca azi: stai pe cerc, resursele curg, plata parțială rămâne.
- Se poate urca un singur nivel la o plată. Dacă experiența ajunge deja și pentru următorul, cercul rămâne aprins.
- Costul nivelului n (2–9) pornește de la formula de azi, întinsă: cristale 25 + 15 × (n − 2), metal 10 + 15 × (n − 2). Se reglează cu plasa.
- Nivelul dă 10 viață în plus și umple viața navei, ca azi. Nu mai dă lovitură: lovitura vine din arme.

### Panoul de alegere

- În pasul în care nivelul e plătit, jocul se oprește și apare panoul, pe mijlocul ecranului. Terenul și banda se văd în spate, încețoșate și întunecate.
- Panoul arată nivelul nou, locurile navei și trei oferte, una sub alta. Fiecare ofertă are pictogramă, nume, felul modulului, dacă e nou sau întărire, cel mult două rânduri de text și trei puncte care arată la ce treaptă ajunge.
- Jucătorul atinge o ofertă și jocul pornește imediat mai departe. Nu există „sari peste” și nu există „altele”.
- Panoul nu se poate închide altfel. Butonul de pauză e ascuns cât panoul e deschis.
- Dacă pagina e ascunsă sau telefonul închide jocul, partida se salvează cu alegerea deschisă. La „Continuă partida” apare același panou, cu aceleași oferte.
- O atingere începută înainte să apară panoul nu alege nimic: oferta se alege doar dintr-o atingere începută pe ea după ce panoul a apărut.
- Pe calculator, tastele 1, 2 și 3 aleg ofertele.

### Ofertele

- Sunt trei, diferite între ele. Dacă nava are mai puțin de trei lucruri posibile, sunt câte se pot. Dacă nu se poate nimic (toate locurile pline, toate modulele la treapta 3), nivelul nu deschide panoul.
- O ofertă e fie un modul nou (doar dacă există un loc liber și nava nu are deja acel modul), fie întărirea cu o treaptă a unui modul pe care nava îl are și care e sub treapta 3.
- Cât există un loc liber, cel puțin o ofertă e un modul nou. Cât nava are un modul care se poate întări, cel puțin o ofertă e o întărire.
- Ce se oferă depinde doar de sămânța partidei, de nivelul la care s-a ajuns și de ce are nava.

### Locurile

| Nivelul navei | 1–2 | 3–4 | 5–6 | 7–8 | 9 |
| --- | --- | --- | --- | --- | --- |
| Locuri | 2 | 3 | 4 | 5 | 6 |

Nava pornește cu Unda la treapta 1 într-unul din cele două locuri. Un modul ocupă un loc, oricare i-ar fi treapta.

### Modulele

Cifrele sunt de pornire. Se reglează cu plasa, cât timp fiecare treaptă rămâne mai bună decât cea dinainte.

| Modul | Fel | Ce face | Treptele 1 / 2 / 3 |
| --- | --- | --- | --- |
| Undă | armă | Cea de azi: lovește toți dușmanii dintr-un arc, aproape de navă, și îi împinge. | lovitură 10 / 16 / 24; arc 1,25 / 1,6 / 2,0 rad; restul ca azi |
| Laser | armă | Trage într-un singur dușman, cel mai apropiat, de departe. | rază 170; o tragere la 0,9 s; lovitură 14 / 22 / 32 |
| Rachete | armă | O rachetă lentă spre cel mai apropiat dușman; la sosire lovește tot ce e într-o zonă. | rază 200; una la 2,4 s; zonă 50; lovitură 12 / 18 / 26 |
| Blindaj | corp | Mai multă viață. | +30 / +60 / +100 viață |
| Scut | corp | Oprește cu totul o lovitură, apoi se reface. | se reface în 6 / 4,5 / 3 s |
| Reparator | corp | Nava începe mai devreme să se refacă și se reface mai repede. | pornește după 2 / 1,5 / 1 s; 6 / 9 / 12 viață pe secundă |
| Motor | utilitar | Nava merge mai repede. | +12% / +22% / +30% viteză |
| Magnet | utilitar | Nava strânge resurse de mai departe și mai repede. | distanța de strâns 40 / 60 / 80; timpul între bucăți × 0,8 / 0,65 / 0,5 |
| Releu | utilitar | Turelele aflate aproape de navă trag mai repede. | turelele la cel mult 220 de navă; ritm +20% / +35% / +50% |

- Armele trag singure, fiecare cu ceasul ei, și pot trage în același pas.
- Unda rămâne arma de pornire și păstrează felul în care se simte azi la treapta 1: aceeași rază, același ritm, același împins.
- Fiecare modul se vede pe navă ca o formă simplă adăugată (macheta are o schiță). Laserul și racheta se văd când trag; scutul se vede când oprește o lovitură.

### Ce se schimbă față de azi

- Nivelul navei merge până la 9 (azi 5) și cere experiență.
- „+10 lovitură pe nivel” dispare; „+20 viață pe nivel” devine +10.
- Cercul navei are trei stări: încă nu (arată experiența), gata (aprins, arată prețul), nivel maxim.
- Banda de sus are un rând în plus.

## Ce se vede

Referința e pagina cu machete. Pe scurt:

- **Banda de sus**, rândul al treilea: numărul nivelului într-un inel care se umple cu experiența; lângă el, locurile navei ca pătrate mici (pictograma modulului în cele ocupate, contur punctat la cele libere, lacăt la următorul care se deschide); la dreapta, „experiență 14/40”. Când pragul e atins, inelul e plin și textul devine „Nivel 4 gata”.
- **Cercul navei**: sub nume, „experiență 14/40” cât nu e gata; aprins, cu prețul, când e gata.
- **Panoul**: ca în macheta „Pauză, panou pe mijloc”. Culoarea felului: arma în galbenul navei, corpul în albastrul scutului, utilitarul în movul metalului.
- **Pe navă**: forme simple pentru module, în stilul „Orbită”. Desenul lor stă în spatele interfeței `Skin`, ca al doilea aspect să le poată desena altfel.

## Textele

Toate în `src/ui/strings.ts`, în română. Propuneri de pornire, scurte anume ca să încapă în panou:

| Modul | Rândurile pentru „nou” | Rândul pentru „întărire” |
| --- | --- | --- |
| Undă | (e pe navă de la început) | Mai lată și mai puternică. |
| Laser | Un dușman, de departe. / Bun contra navelor grele. | Lovește mai tare. |
| Rachete | Lente, lovesc o zonă. / Bune contra grupurilor. | Explozie mai puternică. |
| Blindaj | Mai multă viață. | Și mai multă viață. |
| Scut | Oprește o lovitură / la câteva secunde. | Se reface mai repede. |
| Reparator | Te refaci mai repede. | Te refaci și mai repede. |
| Motor | Nava merge mai repede. | Și mai repede. |
| Magnet | Strângi de mai departe. | Mai departe și mai iute. |
| Releu | Turelele de lângă navă / trag mai repede. | Trag și mai repede. |

Celelalte: „Alege un modul”, „Nivel {n}”, „Armă”, „Corp”, „Utilitar”, „Nou”, „Întărire”, „Treapta {t} din 3”, „Jocul stă pe loc cât alegi.”, „experiență {a}/{b}”, „Nivel {n} gata”, „Nivel maxim”.

## Salvarea și reluarea

- Starea capătă experiența navei, modulele cu treptele lor, ceasurile armelor și oferta deschisă, dacă e una. Totul rămâne date simple.
- `SAVE_VERSION` urcă la 2. Testul amprentei din `src/app/save.test.ts` o cere singur.
- O partidă salvată cu versiunea 1 nu mai poate fi continuată: „Continuă partida” nu apare, fără eroare. Recordul rămâne.

## Plasa pentru dificultate

- Jucătorii automați trebuie să poată alege o ofertă. Fiecare alege după o listă fixă de preferințe, scrisă în `src/bots/`, aceeași la fiecare rulare.
- Limitele din `docs/GDD.md` rămân cele de azi și se verifică pe regulile noi: „Nimic”, „Amestec”, „Doar navă”, „Fără navă”. „Fără navă” înseamnă acum o navă rămasă la nivelul 1, doar cu Unda.
- Cifrele se reglează până trec limitele. Reglajul e o felie a lui, după ce regulile merg. Dacă limitele nu pot fi atinse fără a schimba o regulă din documentul ăsta, constructorul se oprește și raportează; nu slăbește limitele.
- Se poate regla orice cifră din `src/data/balance.ts`, și cele de bază (viața și ritmul dușmanilor, turelele, costurile, viața planetei), fiindcă nava nu mai crește ca azi: Unda ajunge cel mult la lovitura 24, față de 50 la nava de nivelul 5 de azi. Nu se ating: harta și cercurile, joystickul, viteza navei fără Motor și felul în care se simte Unda la treapta 1 (raza, ritmul, împinsul).
- Cele două cifre propuse la faza 3 (lovitura navei pe nivel și viața dușmanilor) nu sunt o bază fixă: prima dispare odată cu regula ei, a doua se reglează din nou aici. Toate cifrele rămân propuneri până le vede Andrei în joc.
- Tabelul capătă un rând doar tipărit, „Fără turele” (economie și navă, nicio turelă), ca să se vadă dacă turelele mai merită. Fără limită deocamdată.

## Abordări

Trei feluri de a face alegerea de la nivel, arătate lui Andrei:

| Varianta | Ce aduce | Ce costă | Verdict |
| --- | --- | --- | --- |
| 1. Trei cartonașe, alegi unul | Fiecare partidă iese altfel; se citește ușor pe telefon. | Uneori nu primești ce voiai. | Ales de Andrei. |
| 2. Atelier cu tot catalogul | Control deplin. | Mult de citit în mijlocul partidei; odată găsită combinația cea mai bună, se repetă mereu. | Respins. |
| 3. Ramuri la nivelurile 2, 4 și 6 | Cel mai simplu. | Doar trei decizii pe partidă. | Respins. |

Ce face jocul cât alegi: se oprește, încetinește mult sau merge mai departe cu ofertele ca cercuri pe teren. Andrei a ales întâi „încetinește”, apoi, după ce a văzut machetele, „se oprește”, cu panoul pe mijloc și fundalul încețoșat.

Unde stau experiența și locurile: în banda de sus cu locurile mari jos, sau totul în banda de sus. Andrei a ales a doua.

## Cum se verifică

- Teste pe simulare: experiența crește la fiecare navă doborâtă, oricine a doborât-o; cercul navei nu primește plată sub prag; un nivel pe plată; experiența în plus trece mai departe; simularea stă pe loc cât oferta e deschisă; alegerea pune modulul sau urcă treapta; locurile după nivel; regulile ofertelor (diferite, cel puțin una nouă cât e loc, cel puțin o întărire cât se poate, niciuna imposibilă); aceeași sămânță dă aceleași oferte; fiecare modul, la fiecare treaptă, face ce spune tabelul; nimic din toate astea în „Test de viteză”.
- O partidă salvată cu oferta deschisă și reluată continuă identic cu una neîntreruptă.
- Plasa: limitele trec; tabelul are rândul nou.
- Proba din browser: după un nivel plătit apare panoul cu trei oferte și jocul stă; o ofertă atinsă îl închide și jocul merge; pagina reîncărcată cu panoul deschis îl arată din nou la „Continuă partida”; banda arată nivelul, inelul și locurile. Rândul `SMOKE INFO` măsoară desenul cu 150 de nave și cu toate armele pe navă și se compară cu cifra de dinainte de etapă, măsurată în aceeași rulare; o creștere de peste un sfert se raportează, nu pică proba.
- Pe telefonul lui Andrei: vezi „Când e gata”.

## Documente de adus la zi

`docs/GDD.md` (regulile navei, cifrele, „Cine a hotărât ce”, trimiterea la documentul ăsta), `CLAUDE.md`, `README.md`, `DEVLOG.md`. Tot atunci se îndreaptă două formulări rămase de la faza 3: zgomotul tabelului pe altă mașină („sub un punct”, nu „±0,6 puncte”) în `docs/GDD.md` și „în primul minut” din `CLAUDE.md` (adevărat doar spre secunda 60).

## Etapele următoare

Nu sunt promise aici și fiecare primește designul ei. Sunt scrise ca direcția să nu se piardă.

2. **Dușmani și elite.** Dușmani de mai multe feluri, fiecare cu unealta lui. Elite care poartă mai multe obiecte, pe care le vezi pe ele; când dobori una, alegi un obiect de adoptat sau treci mai departe, în același panou. Propunere: obiectele adoptate intră în aceleași locuri ca modulele, iar când locurile sunt pline schimbi unul vechi pe cel nou.
3. **Turele de mai multe feluri.** Felul se alege la construire. Propunere de pornire: laser (cea de azi), tun care lovește o zonă, frână care încetinește.
4. **Tipuri de nave și deblocări.** Nave care pornesc altfel (armă, locuri, viață, viteză) și se deblochează între partide.

## Lăsat constructorului

- Numele fișierelor, ale tipurilor și ale câmpurilor din stare.
- Cum ajunge alegerea în simulare (o comandă separată de direcția joystickului), cât timp simularea rămâne deterministă și stă pe loc cu oferta deschisă.
- Regula exactă după care se trag ofertele, în limitele din „Ofertele”.
- Cifrele, cât timp plasa trece, fiecare treaptă e mai bună decât cea dinainte și Unda de treapta 1 se simte ca azi.
- Formele modulelor pe navă și ale tragerilor, în stilul „Orbită”.
- CSS-ul panoului și al benzii, cât timp arată ca macheta. Cum se face încețoșarea în pagină și ce se vede pe un browser care nu o poate face (măcar fundalul întunecat).
- Câte pătrate de locuri arată banda când nava are 5–6 locuri, cât timp încap.
- Listele de preferințe ale jucătorilor automați.

## Când e gata

- Andrei deschide jocul pe telefon, doboară câteva nave, vede inelul umplându-se, plătește nivelul la cercul aprins și alege un modul din panoul de pe mijlocul ecranului, cu fundalul încețoșat.
- După câteva niveluri, nava lui arată și se poartă altfel decât la început, iar la următoarea partidă primește alte oferte.
- Închide jocul cu panoul deschis, îl redeschide și găsește aceeași alegere.
- `npm run check` (cu plasa) și `npm run smoke` trec.
