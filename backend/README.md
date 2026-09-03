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

# API lokaal starten (optioneel, voor Stap 2/4)
uvicorn app.main:app --reload
```

## Structuur

- `app/models.py` — datamodel (Customer, Trainer, Session, Credit, Booking)
- `app/engine.py` — **alle businessregels uit sectie 2**, puur en los van HTTP
- `app/errors.py` — typed exceptions per regelovertreding
- `app/main.py` — dunne FastAPI-laag rond `engine.py`
- `tests/` — één testbestand per regelgroep, draait rechtstreeks tegen `engine.py`

Zie de sessie-samenvatting voor het volledige datamodel en de gemaakte
aannames.
