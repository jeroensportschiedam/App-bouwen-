# CLAUDE.md — De Impact Club app-ecosysteem

Projectcontext voor Claude Code. Lees dit bestand volledig voordat je code schrijft.

Dit bestand vervangt de eerdere versie. Het is bijgewerkt na het uitwerken van de **bedrijfsapp** (trainersapp) als doorklikbare mockup. Alles wat daar is vastgelegd staat hier, plus de uitgeschreven eisen voor de **trainingsapp** (klantapp), zodat beide op dezelfde regels draaien.

> **Stand van zaken §4:** de productnamen en aantallen komen uit de Trainin-export van 5 september 2026 en zijn genormaliseerd. De **prijzen** staan nog niet vast — die zitten niet in de export en moeten door Jeroen bevestigd worden voor de bouw begint. Onderaan §4 staan vijf punten die nog een besluit vragen, waarvan DUO-training de belangrijkste is.

---

## 1. Wat we bouwen

Eén backend met twee mobiele apps voor **De Impact Club**, een boutique small-group PT-studio in Schiedam (voorheen Jeroen Sport).

| App | Voor wie | Kern |
|---|---|---|
| **Bedrijfsapp** (trainersapp) | coaches + eigenaar | Dashboard met aandachtspunten, weekagenda, klanten, leads, rooster, financiën |
| **Trainingsapp** (klantapp) | leden | Eigen planning: sessies zien, af- en aanmelden, inhalen, bijboeken, berichten |

Beide apps draaien op **dezelfde engine**. Een afmelding in de klantapp is direct zichtbaar in de trainersagenda, en andersom. Er is één berichtenstroom per klant, gedeeld door beide apps.

De bedrijfsapp is ook op laptop en pc bruikbaar: vanaf 1024 pixels breed wordt het menu een vaste zijbalk, opent de agenda in weekweergave en worden pop-ups vensters. De klantapp is puur mobiel.

### Businessprincipe (leidend bij elke keuze)
Clubtraining in **vaste groepen** is de basis van de studio. De app mag dit niet uithollen tot een vrije inloopgym. Flexibiliteit (afmelden, inhalen, bijboeken) is een laag bóvenop de vaste reeks, geen vervanging ervan. De eigenaar wil zo min mogelijk handwerk: beschikbaarheid, prijzen, bevestigingen en incasso gaan automatisch.

---

## 2. De klantreis (leidend voor beide apps)

Dit is de volgorde die het systeem moet afdwingen. Elke stap heeft zijn eigen scherm en zijn eigen signaal op het dashboard van de bedrijfsapp.

1. **Lead** — iemand vult het websiteformulier in, vraagt zelf een intake aan, belt, loopt binnen of komt via een bestaand lid. Leads staan **apart van de klanten**, nooit ertussen.
2. **Eerste contact** — telefonisch of aan de balie. Wordt vastgelegd als notitie bij de lead.
3. **Intakegesprek op locatie** — 20 minuten, gratis, **geen product**. Formulier doornemen, verwachtingen bespreken, kort onderzoek naar waar iemand staat. **Er wordt niet getraind.** Geen factuur, geen checkout, geen betaalstap.
4. **Intake verwerken** — bevindingen uit het onderzoek, gemaakte afspraken en een eerste indruk (Club, PT of nog niet duidelijk) worden bij de lead vastgelegd. Bevindingen zijn verplicht.
5. **Fundament Traject** — 4 begeleide trainingen in 4 weken, € 255, eenmalige factuur met betaallink. **Verplicht voor iedere nieuwe klant.** Dit is tegelijk het proeftraject. Bij het starten wordt de lead een klant en worden de vier trainingen ingepland op hetzelfde tijdstip.
6. **Evaluatie na training 4** — het systeem meldt dit actief op het dashboard en geeft een **onderbouwd advies** voor Clubtraining of Personal Training (zie §6). Hier valt het besluit en start het abonnement met automatische incasso.
7. **Lidmaatschap** — Clubtraining of Personal Training, met de creditpool uit §5.

Zonder stap 6 loopt een klant stilletjes af. Die evaluatie is geen administratie maar het moment waarop de klant de begeleiding voelt; hij moet dus zichtbaar en makkelijk te doen zijn.

---

## 3. Leads

### Bronnen
`website` (formulier ingevuld), `intake` (zelf een intake aangevraagd via de site), `telefoon`, `langs` (langsgekomen of langsgereden), `doorverwijzing` (via een bestaand lid).

Een trainer of de eigenaar moet **zelf een lead kunnen aanmaken** met naam, telefoon, e-mail, bron en wat iemand wil, en meteen een intake kunnen inplannen. Dit gebeurt terwijl iemand aan de telefoon is, dus het moet in één doorlopende flow zitten. Naam en telefoonnummer zijn verplicht; zonder nummer kun je niet terugbellen.

### Statussen
`nieuw` → `gebeld` → `gepland` → `gehad` → `gewonnen` | `verloren`

- Leads met status `nieuw` of `gebeld` die **twee dagen of langer** open staan krijgen het label **Opvolgen** en verschijnen op het dashboard van de bedrijfsapp. Deze drempel is instelbaar (§12).
- Bij `gehad` verschijnt op het dashboard: *intake wacht op verwerking*.
- `verloren` bewaart de lead met reden, zodat later per bron gemeten kan worden wat leads oplevert.

### Aanvraagformulier
Wie via de website binnenkomt vult zelf gegevens in: doel, ervaring, blessures, voorkeursdagen en akkoord op de privacyverklaring. Dit is een volwaardig formulier, maar **zonder checkout en zonder factuur**. Die gegevens zijn zichtbaar bij de lead, worden gebruikt bij het intakegesprek en wegen mee in het advies bij de evaluatie (§6).

---

## 4. Producten en betaalwijzen

Er zijn vier soorten geld in het systeem. Houd ze uit elkaar; ze gedragen zich verschillend.

De aantallen komen uit de Trainin-export van 5 september 2026 (125 records, 65 actief, 60 inactief) en zijn genormaliseerd: de export gebruikt negentien schrijfwijzen voor wat in werkelijkheid acht producten zijn.

| Groep | Product | Sessies/week | Prijs | Betaalwijze | Actief |
|---|---|---|---|---|---|
| Club | Clubtraining BASIS | 1 | € 79 | automatische incasso | 13 |
| Club | Clubtraining GROEI | 2 | € 109 | automatische incasso | 19 |
| Club | Clubtraining INTENS | 3 | € 129 | automatische incasso | 1 |
| PT | Personal Training 1× per week | 1 | € 229 | automatische incasso | 15 |
| PT | Personal Training 2× per week | 2 | € 429 | automatische incasso | 5 |
| Combi | 1 PT + 1 Club | 1 + 1 | € 279 | automatische incasso | 0 (concept) |
| Rittenkaart | Rittenkaart PT, 25 sessies | — | € 1.375 | eenmalige factuur met betaallink | 1 |
| Rittenkaart | DUO rittenkaart, 10 sessies | — | nog bepalen | eenmalige factuur met betaallink | 1 |
| Traject | Fundament Traject, 4 trainingen | 4 totaal | € 255 | eenmalige factuur met betaallink | 1 |
| Los | Losse clubtraining | — | € 17,50 | direct afrekenen bij het boeken | 3 |
| Los | Losse Personal Training | — | € 65,00 | direct afrekenen bij het boeken | 9 |
| Gratis | Intakegesprek op locatie | — | — | **geen product, geen checkout** | — |

> **Prijzen zijn nog niet geverifieerd.** De export bevat geen bedragen. De structuur, de namen en de aantallen kloppen; de prijzen in deze tabel zijn ingevuld ter illustratie en moeten door Jeroen bevestigd worden voor de bouw begint.

### Normalisatie bij de import
De export gebruikt meerdere namen voor hetzelfde product. De importmodule moet deze samenvoegen:

| In de export | Wordt |
|---|---|
| `Small Group Lidmaatschap BASIS` (6), `Clubtraining BASIS` (7) | Clubtraining BASIS |
| `Small Group Lidmaatschap GROEI` (6), `Clubtraining GROEI` (13) | Clubtraining GROEI |
| `Clubtraining INTENS` (1) | Clubtraining INTENS |
| `1x per week PT - maandelijks lidmaatschap` (8), `1x per week PT - maandelijks` (1), `1x per week PT` (1), `Lidmaatschap PT - 1x per week` (2), `1x per week PT - Jaarlijks lidmaatschap` (3) | Personal Training 1× per week |
| `2x per week PT - maandelijks lidmaatschap` (2), `2x per week PT - maandelijks` (1), `Lidmaatschap PT - 2x per week` (1), `2x per week PT - Jaarlijks lidmaatschap` (1) | Personal Training 2× per week |
| `25 sessies - Privé Training` (1) | Rittenkaart PT, 25 sessies |
| `10x DUO Rittenkaart` (1) | DUO rittenkaart, 10 sessies |
| `Het Fundament` (1) | Fundament Traject |

Bouw deze koppeltabel als **configuratie, niet als code**: de export blijft nog maanden binnenkomen en er komen nieuwe schrijfwijzen bij.

### Regels per soort
- **Abonnementen** (Club, PT, straks Combi) lopen via **SEPA-incasso**, maandelijks op de eerste. Hiervoor gaat geen factuur met betaalverzoek uit; er is een incassorun met een overzicht per klant. Een **storno** is een aparte status: het bedrag staat open en de incasso probeert het bij de volgende run **niet** vanzelf opnieuw. Daar moet handmatig een betaallink op volgen.
- **Jaarlijkse betaling bestaat.** Vier actieve klanten betalen hun PT-abonnement per jaar in plaats van per maand. Het product is hetzelfde, het betaalritme verschilt. Modelleer dat als een eigenschap van het abonnement (`maandelijks` | `jaarlijks`), niet als een apart product.
- **Het combi-abonnement bestaat nog niet.** Bouw het product wel als concept in het model, zichtbaar met het label "In voorbereiding" en nul klanten. **Vijf actieve klanten hebben nu een PT- en een Club-abonnement naast elkaar**; dat is precies de reden dat dit product er komt, en meteen het aantal waarmee je kunt rekenen of het rendeert.
- **De rittenkaart** is een aparte pool: 25 PT-sessies, 12 maanden geldig, geen weekritme, geen vervaldatum per credit. Zie §5.
- **Het Fundament Traject** is verplicht voor iedere nieuwe klant en bestaat uit **4 vaste trainingen**. Het is tegelijk het proeftraject.
- **Het intakegesprek is geen product.** Ook niet voor nul euro. Het is een gratis activiteit die iemand één keer boekt. Er wordt nooit een factuur, order of checkout voor aangemaakt.

### Nog te beslissen
1. **DUO training.** Er is één 10× DUO rittenkaart, en vier klantrecords staan op twee namen ("Johan & Angela"). Twee personen op één account breekt de creditpool: wie boekt er, en gaan er twee credits van de kaart af? Dit vraagt een eigen productsoort met een eigen credit-regel, of twee gekoppelde accounts.
2. **Prijs van de DUO rittenkaart** en of dat product blijft bestaan.
3. **Bestaat er een PT 3× per week?** In de export komt die niet voor.
4. **Negen actieve klanten hebben geen enkel product.** Ze moeten voor de import een product krijgen of op inactief worden gezet, anders staan ze in de app zonder credits en zonder abonnement.
5. **Dubbele regels.** Bij twee records staat hetzelfde abonnement twee keer. De import moet dubbele abonnementen per klant weigeren, niet stilzwijgend optellen.


## 5. Kernlogica: de creditpool-engine

**Dit is het hart van het systeem. Bouw en test dit eerst, apart, vóór er UI komt.** Alle schermen bouwen hierop voort, en een bug hier is het meest zichtbare risico van het hele project.

### Clubtraining
- Afmelden kan tot **uiterlijk 12 uur van tevoren**.
- Buiten dat venster is de knop "Afmelden" in de klantapp **geblokkeerd**, met uitleg waarom.
- Tijdig afgemeld → credit terug in de pool, geldig **7 dagen vanaf het moment van afmelden**.
- Niet gebruikt binnen 7 dagen → credit vervalt automatisch.

### Personal Training
- Afmelden kan tot **uiterlijk 24 uur van tevoren**.
- Tijdig afgemeld → credit terug in de pool, geldig **14 dagen**.
- De klant ziet alleen tijdsloten die de kruising zijn van (a) zijn eigen creditgeldigheid en (b) de aangegeven beschikbaarheid van een trainer. De klant kiest zelf de trainer.
- **Geen aparte locatie- of ruimtecheck**: trainerbeschikbaarheid is leidend.

> Het verschil moet letterlijk zo in de businesslogica én in de foutmeldingen terugkomen: **PT is strenger in afmelden (24u) maar ruimer in inhalen (14 dagen); Club is soepeler in afmelden (12u) maar strakker in inhalen (7 dagen).**

### Rittenkaart
- 25 ritten in één pool, **12 maanden geldig vanaf aankoop**.
- Geen weekritme, geen vervaldatum per rit, alleen een einddatum voor de hele kaart.
- Afmeldtermijn gelijk aan PT (24 uur). Tijdig afgemeld → de rit blijft staan. Te laat → de rit is verbruikt.
- De klant ziet "18 van de 25 ritten over, geldig tot 12 maart 2027", niet een wekelijkse teller.

### Fundament Traject
- 4 sessies, ingepland bij de start op een vast tijdstip, week na week.
- Verzetten kan, maar het traject blijft 4 trainingen. Er komen geen credits bij of af.

### Gemeenschappelijk
- Het systeem weet op elk moment exact hoeveel geldige credits een klant heeft en wanneer de eerstvolgende vervalt.
- Communiceer proactief: **"Nog x sessies in te plannen"**, en zodra een credit binnen ~48 uur vervalt ook **"credit vervalt op [datum]"**.
- **Geen verplichte volgorde**: de klant kiest zelf welke credit hij wanneer inzet. Intern houdt het systeem per credit een eigen vervaldatum bij; de klant ziet één totaal plus een waarschuwing bij bijna-verval.
- **Bijboeken** komt pas in beeld als er geen geldige credits meer zijn; dan geldt het losse tarief met checkout.
- **Nooit overboeken**: realtime beschikbaarheidscheck op groepsplekken en trainer-tijdsloten bij elke schrijfactie.

### Implementatie-eisen
- Elke credit is een eigen record met `valid_until`, niet een teller op de klant.
- Verval is een afgeleide van `valid_until` (bereken bij uitlezen), niet iets dat van een cronjob afhangt.
- Boeken, afmelden en bijboeken zijn **transactioneel**: credit verbruiken/teruggeven en de plek claimen/vrijgeven gebeuren in één transactie.
- Alles wat de teller beïnvloedt loopt via de engine. Geen enkel scherm rekent zelf saldi uit.
- De teller is in beide apps **te allen tijde exact gelijk**.

---

## 6. Aanwezigheid, afmelden en de evaluatie

### Aanwezigheid
Wie in de deelnemerslijst staat, is **aangemeld**. Dat is geen status die je aanvinkt. Per deelnemer zijn er twee knoppen: **Aanwezig** en **Afwezig**. Vooraf staat geen van beide aan, zodat zichtbaar is wie nog niet is afgevinkt. Nogmaals tikken maakt de keuze ongedaan. Er is een knop **Iedereen aanwezig** met het aantal erbij, want in de praktijk is bijna iedereen er.

Statussen per deelnemer: `open` | `aanwezig` | `afwezig` | `afgemeld`.

### Afmelden door de studio
Alleen **de trainer van die sessie en de eigenaar** kunnen aanwezigheid bijwerken of iemand afmelden. Andere trainers zien de knoppen uitgeschakeld met uitleg.

Bij afmelden toont het systeem of het binnen of buiten de termijn valt, met het aantal uur tot de sessie. Buiten de termijn kan de klant zelf niet meer afmelden; de trainer of eigenaar wel, en **kiest expliciet of de credit terugkomt**. Standaard staat dat vinkje aan binnen de termijn en uit erbuiten.

### Vrije plek na een afmelding
Zodra er een plek vrijkomt, biedt het systeem meteen aan om een pushmelding te sturen naar **klanten met een geldige credit van het juiste soort die nog niet in die les zitten**. Dat is de manier om de les weer vol te krijgen: wie het eerst boekt, heeft de plek.

Klanten kunnen deze meldingen **uitzetten** (§11). Wie ze uit heeft staan valt automatisch af, en de app laat dat zien met naam en aantal, zodat een trainer weet dat iemand niet vergeten is maar bewust is overgeslagen.

### Evaluatie na het Fundament Traject
Na de vierde training verschijnt de klant op het dashboard onder **Klaar voor de evaluatie**, met een advies en de twee zwaarstwegende redenen. Het advies wordt opgebouwd uit drie bronnen die de studio zelf al vult:

1. **Het aanvraagformulier** — trainingservaring en opgegeven blessures.
2. **De notities per trainingsweek** — klachten, techniek, zelfstandigheid.
3. **De cijfers** — aanwezigheid en annuleringspercentage.

Regels die het advies naar Personal Training duwen: een klacht genoteerd tijdens het traject (zwaarst wegend), zelf opgegeven blessure, annulering boven de drempel, weinig trainingservaring. Regels die naar Clubtraining duwen: techniek beoordeeld als voldoende of zelfstandig, hoge aanwezigheid, eerdere trainingservaring.

Elke reden wordt **met bron getoond**, inclusief het citaat uit de notitie. Het advies is nooit een besluit: de trainer kiest. Maar kiest hij Clubtraining terwijl er klachten genoteerd staan, dan verschijnt een waarschuwing: *in een clubtraining verwachten we dat iemand zelfstandig en klachtenvrij op niveau kan bewegen; bij klachten is Personal Training meestal de eerlijkere keuze, ook voor de rest van de groep.* Het blokkeert niet, het maakt de keuze bewust.

Na het vastleggen start het abonnement met incasso per de eerste van de volgende maand en krijgt de klant standaard een bericht met de uitkomst. Er is ook een uitkomst **Gaat niet door**, want dat cijfer wil de eigenaar op termijn zien.

---

## 7. Rollen en rechten

| | Trainer | Eigenaar |
|---|---|---|
| Alle klanten zien | ja | ja |
| Aanwezigheid bijwerken | alleen eigen sessies | altijd |
| Klant afmelden | alleen eigen sessies | altijd |
| Leads en intakes | ja | ja |
| Rooster en reeksen | ja | ja |
| Financiën | **nee** | ja |

Alle trainers zien alle klanten; er is geen afscherming per trainer. Financiën is afgeschermd voor de eigenaar.

---

## 8. Datamodel (richtlijn)

Namen in het Engels, domeinbegrippen in het Nederlands waar ze zo heten.

- **User** — id, rol (`member` | `trainer` | `owner`), naam, e-mail, telefoon, status, `member_since`, **klantreferentie uit Trainin** (import-sleutel).
- **Lead** — naam, telefoon, e-mail, bron, wens, status, `created_at`, eigenaar van de opvolging, gekoppelde klant na conversie.
- **LeadForm** — het door de klant ingevulde aanvraagformulier: doel, ervaring, blessures, voorkeursdagen, akkoord privacyverklaring, tijdstip.
- **LeadNote** — auteur, tekst, tijdstip.
- **Intake** — lead, datum/tijd, trainer, duur 20 min, status; **nooit gekoppeld aan een order of factuur**.
- **IntakeResult** — bevindingen, afspraken, eerste indruk (`club` | `pt` | `open`).
- **Product** — naam, groep (`club` | `pt` | `combi` | `kaart` | `traject` | `los` | `gratis`), sessies per week of totaal, prijs, betaalwijze (`incasso` | `eenmalig` | `los` | `gratis`), actief of concept.
- **MembershipSubscription** — user ↔ product, startdatum, einddatum, **betaalritme** (`maandelijks` | `jaarlijks`), incassomandaat, actief.
- **Traject** — user, product Fundament, 4 sessies, weeknotities, status, evaluatie-uitkomst.
- **Credit** — id, user, herkomst (`periodiek` | `teruggegeven` | `los gekocht` | `rittenkaart`), soort (`club` | `pt`), `valid_from`, `valid_until`, status, boeking waaraan besteed.
- **Rittenkaart** — user, soort (`pt` | `duo`), totaal, verbruikt, `valid_until`. Bij duo: hoeveel ritten een sessie kost.
- **SessionTemplate (reeks)** — activiteit, dagen, tijd, duur, capaciteit, vaste trainer, startdatum, einddatum, actief.
- **Session** — datum/tijd, type (`club` | `pt` | `fundament` | `intake`), trainer, capaciteit, status, programma (wat gaan we doen), gekoppelde reeks of lead.
- **Booking** — user, sessie, credit of betaling, status (`open` | `aanwezig` | `afwezig` | `afgemeld`), `cancelled_at`, `cancelled_by`, credit teruggegeven ja/nee.
- **TrainerAvailability** — trainer, startdatum, tijdvak, herhaling, dagen, einddatum, hele dag, van toepassing op alle privéactiviteiten of een selectie.
- **Invoice** — nummer, klant, regels, bedrag, wijze (`incasso` | `eenmalig`), status (`concept` | `open` | `telaat` | `betaald` | `geincasseerd` | `storno`), vervaldatum, Mollie-referentie.
- **Note** — klant, auteur, tekst, tijdstip, `internal: true` (nooit zichtbaar voor de klant).
- **Message / Thread** — één doorlopende draad per klant, gedeeld door beide apps.
- **NotificationPreference** — per klant: meldingen bij vrije plekken aan of uit, sessieherinneringen, berichten.
- **Setting** — instelbare drempelwaarden en termijnen (§12).

Alle tijden in UTC opslaan, weergeven in **Europe/Amsterdam**. Let op zomer-/wintertijd bij terugkerende sessies en bij afmeldvensters (12u/24u).

---

## 9. Bedrijfsapp (trainersapp) — bestaat als mockup

Kort, want deze is uitgewerkt. De klantapp moet hierop aansluiten.

**Navigatie:** hamburgermenu linksboven en een tabbalk onderin met Dashboard, Agenda, Klanten, Financiën, Menu. Op laptop en pc wordt het menu een vaste zijbalk en verdwijnt de tabbalk.

**Dashboard** — vier cijfertegels (actieve klanten, aanwezig, afmeldingen, bezetting), signaalbalken voor leads die wachten, intakes die verwerkt moeten worden en credits die vervallen, de sectie **Klaar voor de evaluatie**, dan **Waar je op moet letten**: de eerstvolgende zes sessies met per sessie het programma en de aandachtspunten per klant (blessure, credit, nieuw, afmelding). Onderaan **Eerder vandaag** met wat nog afgevinkt moet worden.

**Agenda** — dagweergave als tijdlijn met parallelle kolommen bij overlap, weekweergave (compact op mobiel, volledige weekkalender op pc), filter per trainer, kleur per type. Tik op een sessie voor deelnemers, aanwezigheid, afmelden, het programma en een pushmelding.

**Klanten** — tabs Leads, Klanten, Producten, Tabel. Leads staan altijd apart.

**Financiën** — tabs Overzicht, Facturen, Omzet. Incassorun, storno's, eenmalige facturen, omzet per maand en per product.

**Menu** — Rooster (reeksen, losse sessies, activiteiten), Beschikbaarheid, Afmeldcijfers, Instellingen, gebruiker wisselen.

---

## 10. Trainingsapp (klantapp) — nog te bouwen

De klantapp vervangt de webpagina-bookmark, e-mailcommunicatie en persoonlijke WhatsApp of telefoon van trainers. Puur mobiel. Eén studio-gebrande app waar alles in staat.

### 10.1 Mijn week (startscherm)
- Bovenaan prominent de teller: **"Nog x sessies in te plannen"**, met bij een rittenkaart in plaats daarvan "18 van de 25 ritten over, geldig tot [datum]".
- Waarschuwing met vervaldatum zodra een credit binnen ~48 uur vervalt.
- Lijst van aankomende sessies uit de vaste reeks, met dag, tijd, activiteit, trainer en status.
- **Afmelden**: één tik met bevestiging. Buiten het venster is de knop geblokkeerd met een concrete uitleg: *"Afmelden kan tot 12 uur voor de training. Bel de studio als het echt niet lukt."*
- **Inhalen**: vanuit de teller direct door naar beschikbare alternatieven binnen de geldigheidstermijn. Dit mag **niet** voelen als bijboeken; het valt binnen de bestaande pool.
- Bij PT kiest de klant zelf de trainer uit diens vrijgegeven tijdsloten.
- Geen geldige credits meer → knop "Extra sessie bijboeken" (§10.3).

### 10.2 Inschrijven en inhalen
- Een klant moet zich kunnen inschrijven voor een clubtraining waar plek is, zolang hij een geldige credit heeft.
- Volle sessies tonen als vol, met de mogelijkheid om een bericht te sturen (wachtlijst komt in een latere fase).
- Bij een pushmelding over een vrijgekomen plek moet de klant **vanuit die melding direct kunnen boeken**. Dat is het hele punt: wie het eerst is, heeft de plek. Maak dat pad zo kort mogelijk.
- Elke schrijfactie realtime tegen de backend valideren, nooit optimistisch bevestigen.

### 10.3 Extra sessie bijboeken (checkout)
- Alleen zichtbaar als er geen geldige credits meer zijn.
- Toont beschikbare momenten met vrije plekken, **prijs direct zichtbaar per optie**, geen verrassingen bij checkout.
- Checkout in 1–2 tikken via Mollie (iDEAL, creditcard, opgeslagen betaalmethode).
- Directe bevestiging in de app en via push, **niet via e-mail**.

### 10.4 Berichten
- Eén doorlopende chat met de studio, dezelfde draad die de trainers zien.
- Hierin komen ook automatische berichten: boekingsbevestigingen, de uitkomst van de evaluatie, een factuur met betaallink, een melding over een vrije plek.

### 10.5 Mijn lidmaatschap
- Huidig product, wat het inhoudt (sessies per week, welke creditregels), en de betaalwijze.
- Bij incasso: eerstvolgende afschrijving en bedrag. Bij een storno een duidelijke melding met betaallink.
- Bij een rittenkaart: saldo en einddatum.
- Facturen en betalingen inzien.
- **Meldingsvoorkeuren** (§11), waaronder de schakelaar voor vrije plekken.

### 10.6 Mijn traject (alleen tijdens het Fundament)
- Toont welke van de vier trainingen zijn geweest en wanneer de volgende is.
- Na de evaluatie: de uitkomst en het gekozen abonnement, met de eerste incassodatum.
- **Niet** de interne bevindingen, notities of het advies van de engine. De klant ziet de conclusie zoals de trainer die met hem heeft besproken, niet het dossier.

### 10.7 Intake aanvragen (voor wie nog geen klant is)
- Openbaar toegankelijk scherm of webformulier: naam, telefoon, e-mail, doel, ervaring, blessures, voorkeursdagen, akkoord privacyverklaring.
- Optioneel meteen een tijdslot kiezen uit de vrijgegeven intakemomenten.
- **Geen betaalstap, geen factuur, geen order.** Het eindigt met een bevestiging en een bericht naar de studio, waar het als lead binnenkomt.

### 10.8 Wat de klant nooit ziet
- Interne notities, tenzij een trainer die bewust doorzet als bericht.
- Het advies van de evaluatiemotor en de onderbouwing.
- Cijfers over andere klanten, bezettingsgraden, omzet en marges.
- De namen van andere deelnemers in een groep (te bepalen; nu conservatief: niet tonen).

---

## 11. Meldingen

Alles gaat via **push en in-app**. Geen e-mail voor operationele communicatie.

Soorten meldingen, elk apart aan of uit te zetten door de klant:
- **Vrije plekken en inhaalmomenten** — er is een plek vrijgekomen in een les waar hij credits voor heeft. Staat dit uit, dan valt hij zonder meer af; hij mag zich nooit gespamd voelen.
- **Sessieherinneringen** — de dag ervoor of enkele uren vooraf.
- **Berichten van de studio**.
- **Credits die bijna vervallen**.
- **Betalingen** — factuur klaar, incasso mislukt.

De trainer ziet in de bedrijfsapp welke klanten meldingen over vrije plekken uit hebben staan, met naam, zodat duidelijk is dat ze bewust zijn overgeslagen.

---

## 12. Instelbaar, niet hardcoded

Bouw deze waarden als instellingen met verstandige defaults:

- Afmeldvensters: 12 uur Club, 24 uur PT.
- Geldigheidstermijnen: 7 dagen Club, 14 dagen PT, 12 maanden rittenkaart.
- Waarschuwing "credit vervalt binnenkort": 48 uur.
- Drempel voor "Aandacht" (lage bezoekfrequentie) en "Signaal" (hoog annuleringspercentage).
- Drempel voor "Opvolgen" bij leads: 2 dagen.
- Losse tarieven per activiteit, en alle productprijzen.
- Duur van het intakegesprek: 20 minuten.
- Aantal trainingen in het Fundament Traject: 4.
- Wegingen van de adviesmotor bij de evaluatie (§6).

---

## 13. Betalingen

- **Abonnementen** via SEPA-incasso, maandelijks op de eerste. Mandaat vastleggen bij de start van het abonnement.
- **Eenmalig** (Fundament, rittenkaart) via een Mollie-betaallink met vervaldatum, standaard 14 dagen.
- **Los bijboeken** direct afrekenen bij het boeken.
- **Storno** is een eigen status en vraagt handmatige opvolging met een betaallink.
- **Intake** kent geen betaalstroom.
- Nooit zelf kaartgegevens aanraken. PSD2/SCA-conform.

---

## 14. Databron en migratie

**Trainin heeft geen bruikbare API** — alleen tegen € 219 per maand, en dat doen we niet. We bouwen een **eigen backend als bron van waarheid**.

### De export van 5 september 2026
Het klantenbestand wordt handmatig als CSV uit Trainin geëxporteerd en via Google Drive aangeleverd. De eerste export bevat:

- **125 records**: 65 actief, 60 inactief.
- **Vijf kolommen**: voornaam, achternaam, klantreferentie, productnaam, status.
- Productnamen als kommagescheiden lijst in één veld, met negentien schrijfwijzen voor acht producten (zie de koppeltabel in §4).

### Wat nog ontbreekt
Deze vier velden staan wél in de minimale set en **niet** in de export. Vraag Trainin om een aangepaste export voordat de import gebouwd wordt:

| Ontbreekt | Waarom het blokkeert |
|---|---|
| e-mailadres | Zonder e-mail kan geen klantaccount aangemaakt of gekoppeld worden. Blokkerend voor inloggen. |
| telefoonnummer | Nodig voor de dagelijkse praktijk en voor de leadopvolging. |
| klant-sinds-datum | Staat op het klantprofiel en in de cijfers; nu niet af te leiden. |
| resterende credits per product | Zonder dit start iedereen op nul en klopt de creditpool vanaf dag één niet. |

### Regels voor de importmodule
- **Sleutel is de klantreferentie** (`CDK3ZJP` en dergelijke). Die is stabiel en uniek; match daarop, met e-mail als tweede sleutel zodra dat veld er is.
- **Idempotent**: opnieuw draaien met dezelfde export levert geen dubbele klanten en geen dubbele abonnementen op.
- **Normaliseer productnamen** via de koppeltabel uit §4, en laad die tabel als configuratie zodat een nieuwe schrijfwijze geen code-wijziging vraagt.
- **Weiger dubbele abonnementen** binnen één record in plaats van ze op te tellen; log ze voor handmatige controle.
- **Records zonder product** (negen actieve klanten) komen in een controlelijst, niet stilzwijgend als klant zonder abonnement in de app.
- **Records op twee namen** ("Johan & Angela") worden gemarkeerd en niet automatisch geïmporteerd, zolang §4 punt 1 niet beslist is.
- **Inactieve klanten** worden wel geïmporteerd, met status inactief, zodat de historie bewaard blijft en iemand die terugkomt zijn oude referentie houdt.

### Authenticatie
Eigen accounts voor klanten en trainers, gekoppeld aan de klantreferentie of het e-mailadres uit Trainin.

---

## 15. Bouwvolgorde

| Fase | Functieblok | Bedrijfsapp | Trainingsapp |
|---|---|---|---|
| 0 | Creditpool-engine (§5) | backend, geen UI | — |
| 1 | Planning & agenda | agenda, deelnemers, aanwezigheid | Mijn week, afmelden, inhalen |
| 2 | Klant & lidmaatschap | klantprofiel, klantenlijst | Mijn lidmaatschap |
| 3 | Communicatie | berichten, pushmeldingen, vrije plekken | berichten, meldingsvoorkeuren |
| 4 | Bijboeken & betalen | losse boekingen zichtbaar | bijboeken met checkout |
| 5 | Leads & intake | leadslijst, intake plannen en verwerken | intakeformulier aanvragen |
| 6 | Fundament & evaluatie | traject starten, evaluatie met advies | mijn traject, uitkomst |
| 7 | Financiën | incasso, facturen, omzet | facturen en betaalstatus |

Elke fase levert een werkend, testbaar stuk op **beide** apps op.

---

## 16. Niet in scope (v1)

- Automatische wachtlijstafhandeling — v1 doet dit via een bericht.
- Nieuwsbrieven en marketingmailings.
- Boekhoudkoppeling, btw-behandeling, creditfacturen en exports naar de accountant.
- Kortingscodes en cadeaubonnen.
- Meerdere locaties en ruimtes; trainerbeschikbaarheid is leidend.

**Wel in scope, anders dan in de vorige versie van dit document:** roosterbeheer (reeksen, losse sessies, activiteiten) en financiën met incasso en facturatie zijn er alsnog bij gekomen.

---

## 17. Bekende gaten ten opzichte van Trainin

Deze punten zitten nog niet in de mockup en moeten voor go-live een besluit krijgen:

1. **Een klant handmatig inschrijven in een sessie.** Dit gebeurt dagelijks aan de balie en kan nu niet. Blokkerend.
2. **Klantfoto's** in plaats van initialen.
3. **Een sessie verplaatsen, annuleren of van trainer wisselen**, met bericht aan de deelnemers.
4. **Paginering en kolominstellingen** in de klantenlijst; bij 125 klanten werkt een enkele lijst niet.
5. **Vakanties en feestdagen blokkeren** in de beschikbaarheid.
6. **Conversie per leadbron meten**: hoeveel leads uit welke bron worden klant.
7. **Inloggen en autorisatie**; nu is de rolwissel een knop.
8. **Aanwezigheid laten doortellen** in de cijfers op het klantprofiel.
9. **AVG**: toestemming vastleggen, gegevens verwijderen, bewaartermijnen.
10. **Logboek** van wie wat wijzigde.
11. **DUO-training**: één rittenkaart en vier accounts op twee namen. Zie §4, punt 1. Blokkerend voor die vijf klanten.
12. **Jaarabonnementen**: vier klanten betalen per jaar; de incassorun gaat nu uit van maandelijks.

---

## 18. Werkafspraken voor Claude Code

- **Nederlands** in UI-teksten, foutmeldingen en commits; Engelse identifiers in code.
- **Geen businesslogica in schermen.** Alles wat met credits, beschikbaarheid, prijzen of het evaluatie-advies te maken heeft, gaat door de engine.
- **Foutmeldingen zijn concreet**: zeg wat er misging én wat de klant nu kan doen.
- **Geen e-mail** voor operationele communicatie. Push en in-app.
- **Interne notities lekken nooit** naar de klantapp. Alleen als een trainer ze bewust doorzet als bericht.
- Bij twijfel over een regel uit §5 of §6: **niet zelf invullen**, maar vragen. De creditregels en de klantreis zijn de kern van het bedrijfsmodel.
- Voeg bij elke wijziging aan de engine een test toe die het scenario vastlegt: op tijd en te laat afmelden per type, verval op de grens, meerdere credits, laatste plek, dubbele boeking, zomertijd, rittenkaart zonder weekritme, storno bij incasso.

---

## 19. Referentie: bestaande mockup

Er bestaat een doorklikbare mockup van de **bedrijfsapp** met voorbeelddata, in de vormtaal van de huidige software: donkergroene header, tabbalk onderin, avatars met initialen, dagagenda als tijdlijn. Gebruik die als visuele referentie voor kleur per sessietype, bezetting per blok, badges voor lidmaatschap en signalen, en de creditpool als blokjes in de klantenrij.

**Status:** mockup met voorbeelddata, geen backend, geen echte klantgegevens.
