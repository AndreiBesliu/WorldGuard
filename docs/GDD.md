# World Guard — documentul de design, v0.1

**Nume:** **World Guard** (nume de lucru); jucătorii sunt **Guardians** · **Data:** 04.10.2026 · **Owner:** Andrei
**Stare:** preproducție. Designul de ansamblu e stabilit; urmează prototipul 1.
**Tabla de design (FigJam):** https://www.figma.com/board/OKHd5kH7tHWGhDcRH7GQP5

Documentul rezumă discuția de design din 04.10.2026 și cele trei scanări de piață. Ce e marcat **„propunere”** nu e decis; ce e marcat **„decis”** e al owner-ului.

---

## 1. Jocul într-o propoziție

> **Un tower defense roguelite în care modelezi pământul unor planete vii, iar ele țin minte ce le-ai făcut.**

**Imaginea de 5 secunde, cea care trebuie să se vadă într-un GIF:** arzi pădurea de lângă drum, iar inamicii unși cu ulei explodează în lanț pe traseul construit de tine.

## 2. Pilonii

1. **Harta e un partener de joc, nu un decor.** Traseul și terenul le modelezi tu, în partidă și între partide.
2. **Combinațiile.** Turnurile lasă stări pe inamici care reacționează între ele, vecinătatea dintre turnuri dă bonusuri, iar terenul participă la reacții.
3. **Investiția e decizia centrală.** Cheltui acum sau economisești? Întărești apărarea sau modelezi terenul?
4. **Lumea ține minte.** Fiecare hexagon modificat rămâne exact cum l-ai lăsat și evoluează în timp.
5. **Zeii răspund deciziilor tale.** Panteonul te favorizează după ce faci, iar zeul căzut te urmărește tot mai atent.

## 3. Universul — decis

- **Galaxia e bolnavă.** Corupția unui **zeu căzut**, rival celorlalți, trece de la o lume la alta și revine în valuri.
- **Planetele sunt vii.** Fiecare e un trup elementar adormit. Terraformarea îl vindecă sau îl rănește, iar cicatricile sunt memoria lui.
- **Panteonul** (propunere): cinci zei elementali — focul, apa, frigul, furtuna, pământul și creșterea. Familiile de turnuri și stările din combinații corespund lor.
- **Tu ești trimisul lor, un Guardian:** cobori pe o planetă, îi modelezi pământul și o cureți regiune cu regiune.
- **Tonul:** serios, mitic, science-fantasy.
- **Lore-ul se livrează ieftin:** o frază pe regiune, replici scurte, textul regiunii care se schimbă odată cu starea ei, fragmente deblocate de modificatorii de Amenințare.

## 4. Partida (20–30 de minute) — decis

```
val → recompense (aur, pământ) → alegi 1 din 3 cărți → modelezi harta / plasezi turnuri → combinații → val
boss la valurile 5, 10 și 15 (în prototip)
```

**Cărțile din draft:** o bucată de traseu, un turn, o îmbunătățire sau o relicvă.

## 5. Harta în partidă — decis

- **Grilă de hexagoane.**
- **Traseu cu capete fixe:** intrarea inamicilor și baza nu se mută. Pornești cu un drum drept între ele, iar la fiecare val aplici o bucată aleasă din trei: un **ocol** care **înlocuiește o porțiune de 1–3 hexagoane** cu un drum mai lung cu +1, +2 sau +3. Drumul se lungește ca o sfoară; puzzle-ul e *cât drum încape între două puncte fixe, și pe unde*.
  - **Drumul nu are voie să se atingă singur:** două hexagoane de drum neconsecutive nu pot fi vecine.
  - **Măsurat în prototip:** pe drum drept, un ocol de +k cere o porțiune de cel puțin k hexagoane. Prima variantă, inserția între doi vecini, nu permitea nimic peste +1.
- **Bucățile se aleg, nu se trag la noroc.** E răspunsul direct la reclamația numărul 1 din gen („când am nevoie de turn, primesc drum”).
- **Ramificații deterministe și lizibile.** Inamicii nu aleg o ramură la întâmplare; regula se vede pe ecran.
- **Terenul participă la reacții:**
  - **apa** de lângă drum îi udă pe inamici: ud + frig = îngheț, ud + fulger = electrocutare;
  - **pădurea** arde: pădure arsă + inamici unși cu ulei = explozie în lanț;
  - **dealul** dă rază mai mare, dar cu un cost, ca să nu existe un teren evident cel mai bun (capcana Nordhold);
  - **filonul** dă pământ dacă îl exploatezi.
- **Terraformarea e o acțiune activă,** plătită cu pământ: sapi un canal, ridici un deal, arzi o pădure.

## 6. Turnuri și combinații

**Decis:** reacții pe inamic + bonusuri de vecinătate; fuziunea turnurilor rămâne pentru mai târziu.

**Propunerea pentru prototip** (din cercetare):
- 4 stări de durată (arde, uns cu ulei, ud, înghețat parțial) și 2 lovituri instantanee (impact, fulger), ca la Mindustry.
- ~5–6 reacții: explozie (ulei + foc, consumă uleiul), îngheț (ud + frig), spargere (înghețat + impact, consumă înghețul), electrocutare (ud + fulger, sare la vecinii uzi), abur sau smoală. Focul anulează udul și frigul.
- **Regulile se scriu pe etichete, nu pe perechi.** De exemplu „inflamabil + foc”, ca un viitor „smoală” să moștenească reacția automat.
- **Vecinătatea schimbă cifre sau etichete, nu creează reacții noi.** Contează câte etichete *diferite* ai în jur (plafon ~3), ca șase turnuri identice lipite să nu fie soluția. Câteva vecinătăți negative dau tensiune la plasare.
- **Prezentare:**
  - la plasare, un preview cu bonusurile și cu reacțiile care s-ar produce pe traseu;
  - prima reacție descoperită apare cu numele ei și un scurt freeze-frame;
  - un codex care se completează pe măsură ce descoperi, cu necunoscutele ca siluete;
  - nicio cifră ascunsă.
- **Împotriva combo-ului dominant:**
  - valuri cu trăsături care contracarează anumite etichete (imun la foc, uscat, greu de înghețat);
  - draftul ține cont de ce ai, dar oferă mereu și o carte din afara stilului tău;
  - win rate pe combinații, măsurat din playtest.

## 7. Economia — decis

- **Aur:** din inamici uciși, plus dobândă pe ce economisești. Se cheltuiește pe turnuri și îmbunătățiri.
- **Pământ:** din filoane și din valurile încheiate. Se cheltuiește doar pe terraformare.
- **Tensiunea:** apărare acum sau teren mai bun pentru mai târziu.

## 8. Inamicii

- **Prototip:** normal, rapid, blindat, roi, plus boss.
- **Manifestările zeului căzut** diferă după tipul de planetă.
- **Previzualizarea valului următor** e obligatorie; lipsa ei e o reclamație frecventă în gen.

## 9. Între partide: meta-progresia

### 9.1 Stratul C — Lumea (decis, se construiește primul)

- **Structura:** galaxie → planetă → regiune → partidă.
  - **Galaxia** e harta planetelor și rămâne pentru totdeauna.
  - **Planeta** e un ciclu: generată din seed, cu 6–10 partide. Ultima regiune e **inima planetei**, cu un boss.
  - **Regiunile** sunt hexagoane pe planetă; fiecare regiune e o partidă.
  - **Planeta salvată** rămâne pe harta galaxiei; te poți întoarce pe ea.
- **Persistență exactă pe fiecare hexagon** (decis). Metoda (propunere tehnică):
  - planeta = seed + versiunea generatorului, fixată pe planetă (un generator schimbat nu strică planetele vechi);
  - se salvează doar **jurnalul de editări** (hexagon + ora lumii);
  - **reguli deterministe de evoluție:** cenușa devine puiet, apoi pădure; canalele se colmatează;
  - starea = generator + editări + timp scurs, recalculată identic oricând; după fiecare partidă, compactare într-un instantaneu;
  - cost: câțiva KB pe planetă.
- **Echilibru fără compromis pe date:**
  - traseul și turnurile se reiau la fiecare partidă; rămâne doar terenul;
  - urme cu două tăișuri (cenușa nu mai arde, dar cenușă + apă = noroi care încetinește);
  - regiunea reacționează (canalul săpat aduce inamici amfibii);
  - un bot joacă în simulare regiunile modificate și le semnalează pe cele devenite banale;
  - o opțiune scumpă de a relua regiunea de la zero.
- **Ceasul lumii** (decis): lucrurile evoluează în timp. Propunere: ceasul personal merge după **timpul jucat**, cel al galaxiei comune în **timp real**.
- **Tipuri de planete** (decis: 3–4 la lansare), cu specializare: experiența pe un tip deblochează turnuri și abilități ale biomului.

  | Tip | Elemente |
  |---|---|
  | Ocean | apă, frig, fulger |
  | Vulcanică | foc, ulei, rocă |
  | Junglă | pădure, otravă, creștere |
  | Gheață | frig, spargere, teren care se rupe |

### 9.2 Dificultatea — decis

- **Dificultatea implicită e fixă.**
- **După ce bați o regiune,** la revenire poți alege modificatori care o fac mai grea, pentru recompense mai mari.
- **Propunerea de structură** (din cercetare: Thronefall, Hades, Deep Rock Galactic):
  - 6–8 modificatori pe regiune, ~5 globali și 1–2 legați de terenul ei; fiecare cu 1–3 trepte care dau puncte de **Amenințare**; presetări cu un clic (I / II / III);
  - **modificatori care schimbă reguli, nu doar cifre:** Sezonul inundațiilor, Avangarda de cenușă, Drumuri rare, Al doilea front, Ceață;
  - **recompensele se plătesc o singură dată pe prag**, per regiune; peste un prag, doar cosmetice (sigiliu de bronz, argint sau aur pe hartă); modificatorul-semnătură deblochează lore;
  - un singur modificator pe axă; preview pe hartă înainte de start; alegerile sunt blocate în partidă.

### 9.3 Stratul A — Favoarea zeilor (decis în principiu; detaliile când ajungem la el)

Favoarea crește din ce faci, nu se alege: arzi păduri, te favorizează zeul focului. Favoarea deblochează variante și reacții noi în familia zeului.

### 9.4 Stratul B — Cronica (decis în principiu; detaliile când ajungem la el)

Fapte notabile deblochează conținut (de exemplu, 200 de păduri arse dau doctrina *Piromantului*), inclusiv fapte care te împing spre stiluri neîncercate.

### 9.5 Notorietatea — decis

- Crește în ochii zeului căzut cu cât joci și câștigi. Cu cât e mai mare, manifestările lui sunt mai puternice, cu **rezistențe la elementele tale preferate, vizibile și plafonate**, iar recompensele sunt mai rare.
- **Scade când nu joci:** revenirea după pauză e mai blândă, nu o pedeapsă.

### 9.6 Războiul galactic comun — decis ca strat opțional, după ce bucla de bază e dovedită

- O singură galaxie pentru toți jucătorii. Fiecare joacă pe planetele lui, dar planetele curățate împing frontul comun. Jucătorii nu interacționează direct; vezi doar **ecouri** (numele păzitorilor care au salvat planete în sectorul tău).
- **Sezoane automate**, generate din reguli, **plus Inițiativele zeului căzut**, create de owner: documente de date care compun efecte din piese existente (ex. planetele-ocean inundate la 3 valuri, corupția rezistă la foc, notorietate ×2), cu un obiectiv comun și două deznodăminte. Fiecare se testează pe instanța de test cu botul și se publică pe live doar de owner, cu confirmare și jurnal.
- **Condiții:**
  - jocul merge complet offline;
  - partidele se verifică pe server rejucând seed-ul și jurnalul deciziilor;
  - obiectivele se scalează după jucătorii activi;
  - backend candidat: Firebase.

## 10. Prototipul 1

**Intră:**
- grila hex, traseul cu inserții (3 variante pe val), 4 tipuri de teren care participă la reacții;
- terraformare: canal, deal, arde;
- 4 turnuri de bază (fizic, foc, frig, fulger), ~6 reacții și bonusuri de vecinătate;
- 4 inamici + boss la valurile 5 și 10, 15 valuri, draft 1 din 3;
- aur cu dobândă și pământ;
- **jurnalul deciziilor din prima zi**: e baza meta-progresiei, a verificării pe server și a datelor de playtest.

**Formă:** forme simple, zero artă.

**Criteriu:** o partidă de 20–30 de minute în care fiecare val pune o alegere reală. Dacă nu trece, refacem bucla înainte să adăugăm conținut.

**Nu intră:** meta-progresia, harta lumii, zeii, partea online.

## 11. Tehnic

- **Prototip:** TypeScript + Vite + Canvas 2D (sau PixiJS).
- **Simulare deterministă:** seed, generator aleator pe fluxuri numite, tick fix, nicio dependență de ceasul mașinii. Aceeași simulare servește prototipul, botul de echilibrare, persistența hărții și verificarea pe server.
- **Teste pe logica de joc** (valuri, daune, reacții, economie). Fără infrastructură de verificare înaintea unui joc jucabil — lecția de la Kinstead.
- **Motorul pentru varianta comercială se decide după ce prototipul dovedește că e distractiv.** Riscuri cunoscute pentru tehnologia web pe Steam: overlay-ul Steam în Electron, performanța în valurile târzii, Steam Deck. Niciun TD de succes găsit pe tehnologie web.

## 12. Piața — din scanarea de pe 04.10.2026

Cifrele vin din extrase de căutare; vânzările sunt estimări.

- **Genul e aglomerat:** ~550–650 de TD-uri pe an; doar ~3,5% ajung la 1.000 de recenzii (≈ $150.000 brut). Succesele recente sunt hibrizi: Thronefall, 9 Kings, Tower Dominion.
- **Concurenții direcți:**
  - Tower Dominion (~219k copii);
  - Hexguardian (hex + bucăți de traseu, ~52k);
  - Nordhold (hex + teren);
  - Rogue Tower;
  - Emberward (capete fixe, reacții prin relicve);
  - Isle of Arrows.
- **Golul găsit, nefiind la nimeni:**
  - capete fixe + bucăți alese;
  - terraformare activă cu resursa ei;
  - reacții legate de teren;
  - **terenul care persistă între partide** (n-am găsit niciun TD care să facă asta).
- **Ținte comerciale orientative:**
  - preț $9,99–14,99;
  - demo pe Steam, pentru că jocurile cu demo au în medie 90% recenzii pozitive, față de 82% fără;
  - 5–7k wishlist-uri înainte de Next Fest și ~15k la lansare (reperul Gnomes: $367k brut).
- **Riscuri:**
  - echilibrarea cere testeri din afară devreme;
  - prea multe sisteme diluează identitatea;
  - eticheta „tower defense” vinde mai prost; poziționare pe roguelite / strategie.

## 13. Întrebări deschise

- **Numele comercial.** Numele de lucru e World Guard. Înainte de varianta comercială se verifică pe Steam, ca marcă și ca domeniu. „WorldGuard” e deja un plugin foarte cunoscut de Minecraft, deci concurează la căutări.
- Numele și personalitatea zeilor; identitatea zeului căzut.
- Stilul vizual pentru varianta comercială.
- Detaliile straturilor A și B.
- Câte regiuni are o planetă; ce înseamnă „curățată”.
- Modelul de preț și eventualul DLC (nediscutat).

## 14. Registrul deciziilor (04.10.2026)

| Decizie | Stare |
|---|---|
| Roguelite TD, traseu fix, prototip în browser, țintă comercială | decis |
| Grilă de hexagoane | decis |
| Combinații: reacții pe inamic + vecinătate; fuziunea mai târziu | decis |
| Modelarea hărții: bucăți de traseu + terraformare | decis |
| Partide de 20–30 de minute | decis |
| Traseu cu capete fixe, lungit prin ocoluri (o porțiune de 1–3 hexagoane devine un drum mai lung) | decis |
| Terenul participă la reacții | decis |
| Meta-progresie în trei straturi (A, B, C); se începe cu C | decis |
| Fiecare ciclu = o planetă nouă; galaxie salvată planetă cu planetă | decis |
| Persistență exactă pe fiecare hexagon | decis |
| Ceasul lumii: lucrurile evoluează în timp | decis |
| Dificultate implicită fixă + modificatori la revenire, cu recompense | decis |
| Corupția = un zeu căzut; favoarea zeilor crește din ce faci | decis |
| Ton serios; 3–4 tipuri de planete la lansare | decis |
| Notorietatea: crește jucând, scade la pauză | decis |
| Două ceasuri: personal după timpul jucat, galaxia în timp real | decis |
| Războiul galactic comun ca strat opțional, după ce bucla e dovedită | decis |
| Sezoane automate + Inițiativele zeului create de owner | decis |
| Numele de lucru: World Guard; jucătorii sunt Guardians | decis |
