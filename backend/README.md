# Creditpool Engine (prototype — Stap 1)

Backend die uitsluitend de businesslogica uit sectie 2 van
`requirements-jeroensport-apps.md` implementeert: credits toekennen,
verbruiken bij boeken, teruggeven bij op tijd afmelden, automatisch laten
vervallen, en overboeking voorkomen. Geen UI.

## Draaien

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Unit tests (alle businessregels)
python -m pytest -v

# Stap 2 — testscenario's voor de randgevallen, met pass/fail per scenario
python scenarios/run_scenarios.py

# Stap 3 — dummy-CSV importeren in creditpool.db
python scripts/import_csv.py data/dummy_customers.csv

# Stap 4 — API + testschermpje samen starten, open daarna http://localhost:8000/ui/
uvicorn app.main:app --reload

# Website met werkend intakeformulier: http://localhost:8000/site/
```

## Structuur

- `app/models.py` — datamodel (Customer, Trainer, Session, Credit, Booking)
- `app/engine.py` — **alle businessregels uit sectie 2**, puur en los van HTTP
- `app/errors.py` — typed exceptions per regelovertreding
- `app/main.py` — dunne FastAPI-laag rond `engine.py`
- `tests/` — één testbestand per regelgroep, draait rechtstreeks tegen `engine.py`
- `scenarios/run_scenarios.py` — Stap 2: de 7 afgesproken randgeval-scenario's
  tegen de echte HTTP-API, met duidelijke pass/fail-uitkomst per scenario
- `app/csv_import.py` — Stap 3: importeert klanten + resterende credits uit
  een CSV in het datamodel van Stap 1
- `data/dummy_customers.csv` — voorbeeld-CSV met dummy-klantdata (12 rijen,
  waaronder één rij met een ontbrekend product om de foutafhandeling te
  demonstreren)
- `scripts/import_csv.py` — CLI om een CSV te importeren in `creditpool.db`
- `app/leadflow.py` — leadflow van de website (CLAUDE.md §10): lead aanmaken
  en een gratis intake plannen (di t/m do, 15:00–17:20, blokken van 20
  minuten). Tests in `tests/test_leadflow.py` en `tests/test_leadflow_api.py`.
  De website zelf staat in `../website` en wordt lokaal meegeserveerd onder
  `/site`
- `static/index.html` — Stap 4: dun testschermpje, rechtstreeks tegen deze
  API aan (geen mockdata), geserveerd door FastAPI zelf onder `/ui/`

Zie de sessie-samenvatting voor het volledige datamodel en de gemaakte
aannames.
