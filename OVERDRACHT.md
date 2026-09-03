# Overdracht — Creditpool-engine prototype

Dit is een testprototype van het boekingssysteem uit `requirements-jeroensport-apps.md`,
sectie 2 (creditpool-engine). Gebouwd in stappen, elke stap met je akkoord. Geen
productiecode — bedoeld om de businessregels te valideren voordat een programmeur
het echte systeem bouwt.

**Stack:** Python, FastAPI, SQLAlchemy, SQLite, pytest. Zie `backend/README.md`
voor hoe je het lokaal draait (tests, scenario's, CSV-import, het testschermpje).

## 1. Geïmplementeerde regels

Alle regels uit sectie 2 zitten in `backend/app/engine.py`, los van de HTTP-laag:

| Regel | Status |
|---|---|
| Credits toekennen per klant/periode volgens lidmaatschap (Club/PT) | ✅ `grant_period_credits` |
| Credit verbruiken bij het boeken van een sessie | ✅ `book_session` |
| Credit terug bij op tijd afmelden — Club: tot 12u, geldig 7 dagen | ✅ `cancel_booking` |
| Credit terug bij op tijd afmelden — PT: tot 24u, geldig 14 dagen | ✅ `cancel_booking` |
| Te laat afmelden weigeren, met uitleg over zowel de Club- als PT-deadline | ✅ `LateCancellationError` |
| Credits vervallen automatisch na hun geldigheidstermijn | ✅ `expire_credits` |
| Geen "oudste eerst"-verplichting bij meerdere geldige credits | ✅ klant/UI kan altijd zelf een credit kiezen |
| PT-beschikbaarheid = klant heeft geldig credit ÉN trainer heeft tijdslot geopend | ✅ `book_session` + `is_open` op sessies |
| Overboeking van groep of trainer-tijdslot voorkomen | ✅ capaciteitscheck in `book_session` |

## 2. Testresultaten

**Unit tests (Stap 1 + 3) — 31/31 groen**, één bestand per regelgroep in
`backend/tests/`, draait rechtstreeks tegen de engine:
`cd backend && source .venv/bin/activate && python -m pytest -v`

**Scenario's (Stap 2) — 7/7 geslaagd**, tegen de echte HTTP-API
(`backend/scenarios/run_scenarios.py`):

| # | Scenario | Uitkomst |
|---|---|---|
| 1 | PT 20u van tevoren afmelden | PASS — geweigerd |
| 2 | PT 30u van tevoren afmelden | PASS — credit terug, 14 dagen geldig |
| 3 | Clubles 13u van tevoren afmelden | PASS — credit terug, 7 dagen geldig |
| 4 | Clubles 10u van tevoren afmelden | PASS — geweigerd |
| 5 | 2 geldige credits, verschillende vervaldatum | PASS — totaal 2, waarschuwing bij eerstvervallende |
| 6 | Credit verloopt zonder gebruik | PASS — verdwijnt automatisch uit de pool |
| 7 | Trainer geen tijdslot beschikbaar | PASS — niet boekbaar, ook niet met geldig credit |

**CSV-import (Stap 3)** — 6 tests bevestigen dat de dummy-CSV (`backend/data/dummy_customers.csv`,
12 rijen incl. 1 bewust foute rij) correct klanten en startcredits aanmaakt, en dat
een onherkenbare rij wordt overgeslagen zonder de rest te blokkeren.

**Testschermpje (Stap 4)** — **niet** geautomatiseerd getest, wel handmatig geverifieerd
in een echte browser (Playwright-screenshots tijdens deze sessie): vervalwaarschuwing,
geblokkeerde/actieve Afmelden-knop met uitleg, live bijwerken na afmelden, en boeken van
een alternatief. Voor een productieversie zou hier nog een geautomatiseerde UI-testsuite
bij moeten (bijv. Playwright).

## 3. Aannames om met je programmeur af te stemmen

1. **1 credit = 1 sessie**, niet deelbaar.
2. **Credits zijn getypeerd** (Club-credit ≠ PT-credit), niet kruislings inzetbaar.
3. Bij op tijd afmelden ontstaat een **nieuw** credit met nieuwe geldigheid; het
   oorspronkelijke (verbruikte) credit wordt niet gereactiveerd.
4. `grant_period_credits` is een **losse primitive** — het exacte aantal credits per
   periode en de cadans (wanneer/hoe vaak toekennen) staat niet in de gegeven sectie
   2-tekst en is dus niet ingevuld. Dat vraagt een scheduling-mechanisme (bijv. een
   maandelijkse cronjob) dat er nu niet is.
5. Geen log van geweigerde afmeldpogingen — alleen de foutmelding, geen DB-record.
6. Overboeking-preventie gebeurt via een check-then-insert binnen één DB-transactie.
   Voldoende voor dit prototype, maar bij productie met echte gelijktijdige boekingen
   (bijv. twee klanten die tegelijk op "boek" klikken voor de laatste plek) is een
   steviger lock-mechanisme het overwegen waard.
7. **Het echte klantenbestand wijkt af van de aanname in dit prototype.** De dummy-CSV
   gebruikt één schoon productveld per klant (Clubtraining/PT) en een kolom met
   resterende credits. Het echte bestand dat je hebt aangeleverd heeft geen
   e-mail/telefoon/klant-sinds/resterende-credits kolommen, en wél een vrije-tekst
   "Productnaam"-veld met soms meerdere producten per klant (bijv. "Clubtraining BASIS,
   1x per week PT - maandelijks lidmaatschap"). Er is nog geen mapping gebouwd van die
   echte productnamen naar CLUB/PT + aantal credits — dat is nodig voordat de echte data
   geïmporteerd kan worden.
8. Geïmporteerde credits (CSV) krijgen een **standaard geldigheid van 30 dagen** vanaf
   het importmoment, omdat de CSV geen vervaldatum per credit bevat.
9. **Geen authenticatie.** Het testschermpje laat je elke klant uit een dropdown kiezen,
   zonder login — puur voor testdoeleinden.
10. **"Vaste reeks" (Stap 4)** is geïnterpreteerd als de sessies die de klant al geboekt
    heeft. Er is geen apart concept van een terugkerend lesrooster/sjabloon — elke sessie
    is nu een losse rij die via de API aangemaakt wordt (handmatig of scriptmatig). Een
    echt roostersysteem (bijv. "elke maandag 10:00 Clubtraining GROEI") is er nog niet.
11. Als er geen specifieke credit wordt meegegeven bij het boeken, kiest de engine
    standaard de eerstvervallende credit — dit is een redelijke default, geen
    verplichting; klant/UI kunnen altijd een andere credit_id opgeven.

## 4. Wat hier bewust niet in zit

- Betalingen/facturatie, lidmaatschapsbeheer (opzeggen, upgraden, etc.)
- Een admin-scherm voor trainers om tijdsloten te openen/sluiten (kan nu alleen via de API)
- Automatische generatie van een terugkerend clublesrooster
- Productie-grade concurrency/locking en authenticatie

Alle code staat op branch `claude/creditpool-engine-booking-8jt7ui`.
