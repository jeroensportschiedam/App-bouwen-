# BOUWOPDRACHT.md — van mockup naar werkende app

Voor Claude Code. Lees dit bestand en `CLAUDE.md` volledig voordat je begint.

---

## 0. Wat je krijgt en wat je maakt

**In de repository staan drie bestanden:**

| Bestand | Wat het is | Hoe je het gebruikt |
|---|---|---|
| `CLAUDE.md` | De businessregels. Producten, creditpool, klantreis, rollen, meldingen. | **Leidend.** Bij twijfel over een regel: hier kijken, en anders vragen. Niet zelf invullen. |
| `mockup/bedrijfsapp-mockup.html` | Doorklikbare mockup van de trainersapp, één HTML-bestand met voorbeelddata. | **Referentie voor schermen en vormgeving.** Open hem in de browser en klik hem door voordat je een scherm bouwt. |
| `BOUWOPDRACHT.md` | Dit bestand: stack, structuur, datamodel, volgorde. | Je werkplan. |

**Wat je oplevert:** een draaiende webapplicatie met een echte database, waarin een trainer kan inloggen, de agenda ziet, aanwezigheid afvinkt, klanten en leads beheert en facturen maakt. Geen mockup meer: elke knop schrijft naar de database en elke teller komt uit de engine.

De mockup is **geen code om te kopiëren**. De HTML en JavaScript daarin zijn wegwerpwerk om te laten zien hoe het werkt. Wat je overneemt is: de schermindeling, de teksten, de kleuren en het gedrag. Wat je opnieuw bouwt: alles daaronder.

---

## 1. Stack

Kies hier niet van af zonder overleg.

- **Next.js 15** (App Router, TypeScript) — server-rendered, één project voor de app en later de publieke website.
- **Prisma** met **SQLite** in ontwikkeling, **PostgreSQL** in productie. Zelfde schema, alleen de connectiestring verschilt.
- **Tailwind CSS** met de tokens uit §4 als CSS-variabelen. Geen kant-en-klaar componentenframework: de vormtaal ligt vast in de mockup.
- **Auth.js** (credentials provider) voor inloggen met e-mail en wachtwoord.
- **Vitest** voor de tests van de engine.
- **Mollie** voor betalingen, pas in fase 7.

```bash
npx create-next-app@latest impactclub --typescript --tailwind --app --src-dir
cd impactclub
npm i prisma @prisma/client zod date-fns next-auth bcryptjs
npm i -D vitest @vitest/coverage-v8 tsx
npx prisma init --datasource-provider sqlite
```

## 2. Projectstructuur

```
src/
  app/
    (app)/                    ← ingelogde trainersapp
      dashboard/page.tsx
      agenda/page.tsx
      klanten/page.tsx
      klanten/[id]/page.tsx
      leads/page.tsx
      financien/page.tsx
      rooster/page.tsx
      beschikbaarheid/page.tsx
      layout.tsx              ← zijbalk op ≥1024px, tabbalk daaronder
    api/                      ← route handlers
    login/page.tsx
  lib/
    engine/                   ← DE KERN, zie §5
      credits.ts
      booking.ts
      availability.ts
      evaluation.ts
      index.ts
    db.ts
    auth.ts
    money.ts                  ← één plek voor euro-formattering
    time.ts                   ← UTC opslaan, Europe/Amsterdam tonen
  components/
    ui/                       ← knop, badge, chip, sheet, segmented, switch
    agenda/                   ← dagtijdlijn, weekkalender, sessieblok
    dashboard/                ← sessiekaart met aandachtspunten, signaalbalk
prisma/
  schema.prisma
  seed.ts                     ← importeert de Trainin-CSV
tests/
  engine/*.test.ts
```

**Regel:** in `src/app` staat geen businesslogica. Een pagina haalt data op en toont die. Alles wat rekent — credits, beschikbaarheid, prijzen, het evaluatie-advies — staat in `src/lib/engine`.

---

## 3. Datamodel

Neem dit schema over als startpunt. Namen in het Engels, domeinbegrippen in het Nederlands waar ze zo heten (`Rittenkaart`, `Fundament`).

```prisma
enum Role { MEMBER TRAINER OWNER }
enum ProductGroup { CLUB PT COMBI KAART TRAJECT LOS GRATIS }
enum PayMethod { INCASSO EENMALIG LOS GRATIS }
enum PayRhythm { MAANDELIJKS JAARLIJKS }
enum CreditKind { CLUB PT }
enum CreditOrigin { PERIODIEK TERUGGEGEVEN LOS_GEKOCHT RITTENKAART }
enum SessionType { CLUB PT FUNDAMENT INTAKE }
enum BookingStatus { OPEN AANWEZIG AFWEZIG AFGEMELD }
enum LeadStatus { NIEUW GEBELD GEPLAND GEHAD GEWONNEN VERLOREN }
enum LeadSource { WEBSITE INTAKE TELEFOON LANGS DOORVERWIJZING }
enum InvoiceStatus { CONCEPT OPEN TELAAT BETAALD GEINCASSEERD STORNO }
enum TrajectAdvice { CLUB PT OPEN }

model User {
  id            String   @id @default(cuid())
  role          Role     @default(MEMBER)
  firstName     String
  lastName      String
  email         String?  @unique
  phone         String?
  active        Boolean  @default(true)
  memberSince   DateTime?
  trainingRef   String?  @unique   // klantreferentie uit Trainin, import-sleutel
  passwordHash  String?
  notifyFreeSpot Boolean @default(true)
  notifyReminder Boolean @default(true)
  notifyMessages Boolean @default(true)
  subscriptions Subscription[]
  credits       Credit[]
  bookings      Booking[]
  notes         Note[]     @relation("NoteAboutUser")
  rittenkaarten Rittenkaart[]
  traject       Traject?
  invoices      Invoice[]
}

model Product {
  id          String       @id @default(cuid())
  name        String       @unique
  group       ProductGroup
  description String
  sessionsPerWeek Int?     // club en pt
  totalSessions   Int?     // traject en rittenkaart
  priceCents  Int
  method      PayMethod
  concept     Boolean      @default(false)  // combi: bestaat nog niet
  active      Boolean      @default(true)
}

model Subscription {
  id         String    @id @default(cuid())
  userId     String
  productId  String
  rhythm     PayRhythm @default(MAANDELIJKS)
  startDate  DateTime
  endDate    DateTime?
  mandateRef String?
  active     Boolean   @default(true)
  user       User      @relation(fields:[userId], references:[id])
  product    Product   @relation(fields:[productId], references:[id])
  @@unique([userId, productId, startDate])   // weigert dubbele import
}

model Credit {
  id        String       @id @default(cuid())
  userId    String
  kind      CreditKind
  origin    CreditOrigin
  validFrom DateTime
  validUntil DateTime
  spentOnBookingId String? @unique
  user      User         @relation(fields:[userId], references:[id])
  @@index([userId, validUntil])
}

model Rittenkaart {
  id         String   @id @default(cuid())
  userId     String
  total      Int      // 25 bij PT, 10 bij duo
  used       Int      @default(0)
  perSession Int      @default(1)  // duo kost er mogelijk 2, zie CLAUDE.md §4
  validUntil DateTime
  user       User     @relation(fields:[userId], references:[id])
}

model Activity {           // lesvorm: CORE | KRACHT, HYBRID, Personal Training, Intake
  id        String      @id @default(cuid())
  name      String      @unique
  type      SessionType
  minutes   Int
  capacity  Int
  dropInCents Int?
}

model SessionTemplate {    // reeks
  id         String   @id @default(cuid())
  activityId String
  trainerId  String
  weekdays   Int[]          // 0 = maandag
  startTime  String         // "06:30"
  minutes    Int
  capacity   Int
  startDate  DateTime
  endDate    DateTime?
  active     Boolean  @default(true)
}

model Session {
  id         String      @id @default(cuid())
  templateId String?
  activityId String
  trainerId  String
  type       SessionType
  startsAt   DateTime     // UTC
  minutes    Int
  capacity   Int
  program    String?      // "wat gaan we doen", alleen intern
  leadId     String?      // bij een intake
  cancelled  Boolean      @default(false)
  bookings   Booking[]
  @@index([startsAt])
}

model Booking {
  id            String        @id @default(cuid())
  userId        String
  sessionId     String
  status        BookingStatus @default(OPEN)
  creditId      String?       @unique
  paidCents     Int?          // bij los bijboeken
  cancelledAt   DateTime?
  cancelledById String?
  creditReturned Boolean      @default(false)
  user     User    @relation(fields:[userId], references:[id])
  session  Session @relation(fields:[sessionId], references:[id])
  @@unique([userId, sessionId])   // nooit dubbel in dezelfde sessie
}

model TrainerAvailability {
  id         String   @id @default(cuid())
  trainerId  String
  startDate  DateTime
  endDate    DateTime?
  allDay     Boolean  @default(false)
  startTime  String
  endTime    String
  frequency  String   // EENMALIG | WEKELIJKS | OM_DE_WEEK | MAANDELIJKS
  weekdays   Int[]
  allActivities Boolean @default(true)
  activityIds   String[]
  active     Boolean  @default(true)
}

model Lead {
  id        String     @id @default(cuid())
  firstName String
  lastName  String
  phone     String
  email     String?
  source    LeadSource
  wish      String
  status    LeadStatus @default(NIEUW)
  form      Json?      // doel, ervaring, blessures, voorkeursdagen, akkoord
  findings  String?    // bevindingen uit de intake, verplicht bij verwerken
  agreements String?
  advice    TrajectAdvice?
  intakeSessionId String?
  convertedUserId String? @unique
  lostReason String?
  createdAt DateTime   @default(now())
  notes     LeadNote[]
}

model LeadNote {
  id       String   @id @default(cuid())
  leadId   String
  authorId String
  text     String
  createdAt DateTime @default(now())
  lead     Lead     @relation(fields:[leadId], references:[id])
}

model Traject {              // het Fundament, 4 trainingen
  id        String   @id @default(cuid())
  userId    String   @unique
  startedAt DateTime
  finishedAt DateTime?
  adviceFromIntake TrajectAdvice?
  weekNotes Json     // [{week, authorId, text}]
  outcome   String?  // productnaam, of GAAT_NIET_DOOR
  user      User     @relation(fields:[userId], references:[id])
}

model Note {                 // interne notitie bij een klant
  id       String   @id @default(cuid())
  userId   String
  authorId String
  text     String
  internal Boolean  @default(true)   // NOOIT zichtbaar in de klantapp
  createdAt DateTime @default(now())
  user     User     @relation("NoteAboutUser", fields:[userId], references:[id])
}

model Thread   { id String @id @default(cuid()) userId String @unique messages Message[] }
model Message  { id String @id @default(cuid()) threadId String fromStudio Boolean text String createdAt DateTime @default(now()) }

model Invoice {
  id        String        @id @default(cuid())
  number    String        @unique
  userId    String
  method    PayMethod
  status    InvoiceStatus @default(CONCEPT)
  issuedAt  DateTime
  dueAt     DateTime
  paidAt    DateTime?
  paidVia   String?
  mollieRef String?
  lines     InvoiceLine[]
  user      User          @relation(fields:[userId], references:[id])
}
model InvoiceLine { id String @id @default(cuid()) invoiceId String description String qty Int unitCents Int }

model Setting { key String @id  value String }   // §12 van CLAUDE.md
```

**Tijd:** alles in UTC in de database, tonen in `Europe/Amsterdam`. Gebruik `date-fns-tz`. Let op zomertijd bij terugkerende reeksen en bij de afmeldvensters van 12 en 24 uur.

---

## 4. Vormgeving

Palet **Zand & Blauwsteen**. Zet deze tokens in `globals.css` en gebruik ze overal; geen losse hexcodes in componenten.

```css
:root{
  --zand:#F7F5F1; --zand-2:#F1EFEB; --mist:#E8EAE9; --wit:#FFFFFF;
  --nacht:#1E2733; --diep:#23303C;
  --ink:#1E2733; --ink-2:#5D6874;
  --line:#E0E1DE; --line-2:#EDEDEA;
  --steen:#4C6274; --steen-600:#3B4E5E; --steen-400:#8FA5B5; --steen-50:#E4E9EC;
  --klei:#D8C3B1; --klei-600:#B79773;
  --sage:#5F7A63; --amber:#B98A3E; --wijn:#9A3B3B;
  --display:"Righteous",system-ui,sans-serif;
  --body:"Funnel Sans",-apple-system,"Segoe UI",Helvetica,sans-serif;
}
```

Regels die je niet mag oprekken:

- **Blauwsteen is de enige actiekleur.** Knoppen, actieve chip, gekozen optie. Zodra die kleur ook koppen en randjes vult, verliest hij zijn functie.
- **Club is blauwsteen, PT is klei.** In de agenda, in badges, overal hetzelfde. Fundament krijgt een zachte sagetint, een intake blijft neutraal grijs — dat is geen training en geen product.
- **Righteous** voor koppen, tijden en grote cijfers. **Funnel Sans** voor alles wat gelezen of ingevuld wordt. Cijfers die onder elkaar staan krijgen `tabular-nums`.
- Nachtblauwe header met een kleistreep van 3px eronder.
- Eén primaire knop per scherm. Een uitgeschakelde knop krijgt **altijd** tekst eronder die vertelt waarom.
- Vanaf 1024px: menu wordt een vaste zijbalk, tabbalk verdwijnt, agenda opent in weekweergave, pop-ups worden vensters in het midden.

---

## 5. De engine — bouw dit eerst, met tests, vóór er UI is

Dit is het hart van het systeem en het meest zichtbare risico van het project. Lees `CLAUDE.md` §5 en implementeer die regels letterlijk.

**`lib/engine/credits.ts`**
```ts
geldigeCredits(userId, kind, op = new Date()): Credit[]
saldo(userId): { club: number, pt: number, eerstvolgendeVervaldatum: Date | null }
kenCreditsToe(userId, productId, periode): Credit[]     // bij start abonnement en bij de maandwissel
```

**`lib/engine/booking.ts`**
```ts
boek(userId, sessionId): Booking          // transactioneel: plek claimen + credit verbruiken
meldAf(bookingId, doorUserId, geefCreditTerug?): void
kanZelfAfmelden(booking): { mag: boolean, reden?: string, urenTotStart: number }
vrijePlekKandidaten(sessionId): User[]    // geldige credit, juiste soort, niet al ingeschreven, meldingen aan
```

Harde eisen:

- Elke credit is een **eigen record** met `validUntil`. Geen teller op de klant.
- Verval is een **afgeleide** van `validUntil`, berekend bij uitlezen. Geen cronjob die records omzet.
- Boeken en afmelden zijn **één transactie**. Credit verbruiken en de plek claimen kunnen niet los van elkaar slagen.
- **Nooit overboeken.** Controleer de bezetting binnen dezelfde transactie, niet ervoor.
- Club: afmelden tot 12 uur vooraf, credit 7 dagen geldig. PT: 24 uur vooraf, 14 dagen geldig. Deze waarden komen uit `Setting`, niet uit code.
- Rittenkaart is een eigen pool: geen weekritme, geen vervaldatum per rit, alleen een einddatum voor de kaart.

**Tests die er moeten zijn** (`tests/engine/`), elk als apart scenario:

1. Op tijd afmelden bij Club geeft een credit terug die 7 dagen geldig is.
2. Te laat afmelden bij Club geeft geen credit terug en de knop is voor de klant geblokkeerd.
3. Hetzelfde voor PT met 24 uur en 14 dagen.
4. Een credit die precies op de grens van `validUntil` staat, telt niet meer mee.
5. Twee klanten boeken tegelijk de laatste plek: precies één slaagt.
6. Dezelfde klant kan zich niet twee keer in één sessie boeken.
7. Een sessie die over de zomertijdgrens valt, houdt de juiste lokale starttijd.
8. Een rittenkaart telt af zonder weekritme en blokkeert na de einddatum.
9. Een storno zet de factuur op `STORNO` en probeert het bij de volgende run niet vanzelf opnieuw.
10. De teller die de trainer ziet en de teller die de klant ziet zijn hetzelfde getal.

**`lib/engine/evaluation.ts`** — het advies na het Fundament, zie `CLAUDE.md` §6. Weeg drie bronnen: het aanvraagformulier, de weeknotities en de cijfers. Geef altijd de **redenen met bron** terug, inclusief het citaat uit de notitie. Het advies is nooit een besluit. Kiest de trainer Clubtraining terwijl er klachten genoteerd staan, dan toont de UI een waarschuwing. Die blokkeert niet.

```ts
adviesNaTraject(userId): {
  keuze: 'club' | 'pt' | 'twijfel',
  redenen: { soort: 'blessure'|'credit'|'nieuw'|'cijfer', tekst: string, bron: string }[],
  klachtenGenoteerd: boolean
}
```

De wegingen komen uit `Setting`, zodat Jeroen ze kan bijstellen zonder nieuwe versie.

---

## 6. Bouwvolgorde

Werk fase voor fase. Elke fase levert iets op dat werkt en te testen is. Niet aan de volgende beginnen voordat de vorige draait.

| Fase | Wat | Klaar wanneer |
|---|---|---|
| 0 | Schema, seed vanuit de CSV, engine met tests | `npm test` is groen, `npx prisma studio` toont 125 klanten |
| 1 | Inloggen en rollen | Trainer en eigenaar loggen in, eigenaar ziet Financiën, trainer niet |
| 2 | Agenda: dagtijdlijn en weekkalender, sessiedetail, aanwezigheid | Aanwezig en afwezig afvinken schrijft naar de database; alleen de trainer van die sessie en de eigenaar mogen dat |
| 3 | Dashboard | Eerstvolgende zes sessies met programma en aandachtspunten per klant; signaalbalken voor leads, intakes en evaluaties |
| 4 | Klanten en klantprofiel | Zoeken, filteren, pagineren; profiel met creditteller uit de engine en interne notities |
| 5 | Leads, intake plannen en verwerken, Fundament starten | Volledige route van telefoontje tot vier ingeplande trainingen |
| 6 | Evaluatie met advies | Advies met onderbouwing, keuze vastleggen, abonnement start |
| 7 | Financiën: incassorun, storno, facturen, omzet, Mollie | Betaallink werkt end-to-end in de Mollie-testomgeving |
| 8 | Rooster en beschikbaarheid | Reeks aanmaken vult de agenda vanaf vandaag, sessies die al geweest zijn blijven staan |

## 7. Seed vanuit de Trainin-export

`prisma/seed.ts` leest de CSV en vult de database. Zie `CLAUDE.md` §14.

- Sleutel is de **klantreferentie**, niet de naam.
- **Idempotent**: twee keer draaien levert geen dubbele klanten en geen dubbele abonnementen op.
- Normaliseer de productnamen via een koppeltabel in `prisma/productmap.json`, dus **configuratie en geen code** — er komen nieuwe schrijfwijzen bij.
- Records op twee namen ("Johan & Angela") en records zonder product komen in een controlelijst, niet stilzwijgend in de app.
- Inactieve klanten importeer je wel, met status inactief.
- E-mail, telefoon, klant-sinds-datum en resterende credits ontbreken in de huidige export. Bouw de import zo dat die kolommen er later bij kunnen zonder herschrijven, en laat de seed zichtbaar loggen wat er ontbreekt.

## 8. Werkafspraken

- **Nederlands** in alle UI-teksten, foutmeldingen en commits. Engelse identifiers in code.
- **Foutmeldingen zijn concreet**: zeg wat er misging én wat de gebruiker nu kan doen. Niet "Er ging iets mis" maar "Afmelden kan tot 12 uur voor de training. Bel de studio als het echt niet lukt."
- **Geen businesslogica in schermen.** Alles via de engine.
- **Interne notities lekken nooit** naar de klant. Alleen als een trainer ze bewust doorzet als bericht.
- **Geen e-mail** voor operationele communicatie. Push en in-app.
- Bij elke wijziging aan de engine hoort een test die het scenario vastlegt.
- Bij twijfel over een regel uit `CLAUDE.md` §5 of §6: **vragen, niet zelf invullen.** De creditregels en de klantreis zijn het bedrijfsmodel.

## 9. Niet bouwen in v1

Wachtlijstautomatisering, nieuwsbrieven, boekhoudkoppeling en btw, kortingscodes, meerdere locaties. Zie `CLAUDE.md` §16.

## 10. Open punten die een antwoord van Jeroen nodig hebben

Bouw hier omheen, maar vraag ernaar zodra je ze tegenkomt:

1. **DUO-training.** Eén rittenkaart van tien ritten en vier accounts op twee namen. Twee personen op één creditpool: wie boekt er en hoeveel ritten gaan eraf?
2. **Prijzen.** De bedragen in `CLAUDE.md` §4 zijn nog niet bevestigd; ze staan niet in de export.
3. **Small Group versus Clubtraining.** Voorlopig samengevoegd tot drie clubniveaus.
4. **Negen actieve klanten zonder product.** Krijgen ze er een of gaan ze op inactief?
5. **Jaarabonnementen.** Vier klanten betalen per jaar; de incassorun gaat nu uit van maandelijks.

---

## Startprompt voor Claude Code

Plak dit in je eerste bericht:

> Lees `CLAUDE.md` en `BOUWOPDRACHT.md` volledig. Open daarna `mockup/bedrijfsapp-mockup.html` in de browser en klik hem door, zodat je weet hoe de app hoort te werken.
>
> Begin met fase 0: zet het Prisma-schema op, schrijf de creditpool-engine en de tien tests uit §5, en maak de seed die de Trainin-CSV inleest. Bouw nog geen UI.
>
> Laat me het schema en de testresultaten zien voordat je verdergaat. Stel me je vragen over de open punten uit §10 zodra ze in de weg zitten.
