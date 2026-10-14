"""Leadflow van de website (CLAUDE.md §10): een lead aanmaken en een gratis
intake plannen.

Regels:
- Stap 1 van "Intake aanvragen" maakt altijd een lead aan, ook als de bezoeker
  daarna via WhatsApp verdergaat in plaats van zelf een moment te kiezen.
- Jeroen doet de intakes, dinsdag t/m donderdag.
- Blokken van 20 minuten. Eerste start 15:00, laatste start 17:00 (klaar om
  17:20). Dat zijn 7 momenten per dag en 21 per week.
- Een intake heeft nooit een betaalflow.

Tijden zijn lokale tijd in Schiedam (Europe/Amsterdam) en worden zonder
tijdzone opgeslagen, net als de sessies in engine.py. Business-tijd (`now`)
wordt altijd expliciet meegegeven, zodat de tests niet van de klok afhangen.
"""
from __future__ import annotations

import re
import secrets
from datetime import date, datetime, time, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError

from . import models
from .errors import (
    IntakeSlotTakenError,
    InvalidIntakeSlotError,
    InvalidLeadError,
    LeadAlreadyScheduledError,
    LeadNotFoundError,
)

STUDIO_TZ = ZoneInfo("Europe/Amsterdam")
INTAKE_TRAINER = "Jeroen"
INTAKE_WEEKDAYS = (1, 2, 3)  # dinsdag, woensdag, donderdag (maandag = 0)
INTAKE_FIRST_START = time(15, 0)
INTAKE_LAST_START = time(17, 0)
INTAKE_DURATION = timedelta(minutes=20)
DEFAULT_SLOT_HORIZON_DAYS = 14
MAX_SLOT_HORIZON_DAYS = 56

# Nederlands mobiel nummer, of een ander nummer met 9 tot 13 cijfers.
_PHONE_RE = re.compile(r"^(?:(?:\+31|0031|0)6\d{8}|(?:\+|00|0)\d{9,13})$")


def local_now() -> datetime:
    """Huidige lokale tijd in de studio, zonder tijdzone (zoals opgeslagen)."""
    return datetime.now(STUDIO_TZ).replace(tzinfo=None)


def _to_local_naive(moment: datetime) -> datetime:
    if moment.tzinfo is not None:
        return moment.astimezone(STUDIO_TZ).replace(tzinfo=None)
    return moment


# --------------------------------------------------------------------------
# Intakemomenten
# --------------------------------------------------------------------------

def intake_starts_on(day: date) -> list[datetime]:
    """Alle mogelijke intakestarts op één dag (leeg buiten di t/m do)."""
    if day.weekday() not in INTAKE_WEEKDAYS:
        return []
    starts = []
    moment = datetime.combine(day, INTAKE_FIRST_START)
    last = datetime.combine(day, INTAKE_LAST_START)
    while moment <= last:
        starts.append(moment)
        moment += INTAKE_DURATION
    return starts


def is_intake_start(moment: datetime) -> bool:
    return moment in intake_starts_on(moment.date())


def _taken_starts(db, start: datetime, end: datetime) -> set[datetime]:
    rows = (
        db.query(models.Intake.starts_at)
        .filter(
            models.Intake.trainer_name == INTAKE_TRAINER,
            models.Intake.status == models.IntakeStatus.SCHEDULED,
            models.Intake.starts_at >= start,
            models.Intake.starts_at < end,
        )
        .all()
    )
    return {row[0] for row in rows}


def list_intake_slots(db, *, now: datetime, days: int = DEFAULT_SLOT_HORIZON_DAYS) -> list[dict]:
    """Intakemomenten vanaf vandaag voor `days` dagen, met per moment of het
    nog vrij is. Momenten die al begonnen of voorbij zijn, vallen weg."""
    days = max(1, min(days, MAX_SLOT_HORIZON_DAYS))
    first_day = now.date()
    window_start = datetime.combine(first_day, time.min)
    window_end = window_start + timedelta(days=days)
    taken = _taken_starts(db, window_start, window_end)

    slots = []
    for offset in range(days):
        for start in intake_starts_on(first_day + timedelta(days=offset)):
            if start <= now:
                continue
            slots.append({"starts_at": start, "ends_at": start + INTAKE_DURATION, "available": start not in taken})
    return slots


# --------------------------------------------------------------------------
# Leads
# --------------------------------------------------------------------------

def normalize_phone(raw: str) -> str:
    phone = re.sub(r"[\s\-.()]", "", raw or "")
    if not _PHONE_RE.match(phone):
        raise InvalidLeadError("Dit telefoonnummer klopt niet. Gebruik bijvoorbeeld 06 12345678.")
    return phone


def _clean_name(value: str, label: str) -> str:
    value = (value or "").strip()
    if not value:
        raise InvalidLeadError(f"Vul je {label} in.")
    return value


def _clean_goal(goal: Optional[str]) -> Optional[str]:
    goal = (goal or "").strip()
    return goal or None


def create_lead(
    db, *, first_name: str, last_name: str, phone: str, goal: Optional[str] = None, now: datetime
) -> models.Lead:
    lead = models.Lead(
        public_token=secrets.token_urlsafe(16),
        first_name=_clean_name(first_name, "voornaam"),
        last_name=_clean_name(last_name, "achternaam"),
        phone=normalize_phone(phone),
        goal=_clean_goal(goal),
        source="website",
        created_at=now,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def get_lead(db, token: str) -> models.Lead:
    lead = db.query(models.Lead).filter(models.Lead.public_token == token).one_or_none()
    if lead is None:
        raise LeadNotFoundError("We kunnen je aanvraag niet meer vinden. Vul je gegevens opnieuw in.")
    return lead


def update_lead(
    db, *, token: str, first_name: str, last_name: str, phone: str, goal: Optional[str] = None
) -> models.Lead:
    """Bezoeker gaat terug naar stap 1 en past iets aan: dezelfde lead
    bijwerken in plaats van een dubbele aanmaken."""
    lead = get_lead(db, token)
    lead.first_name = _clean_name(first_name, "voornaam")
    lead.last_name = _clean_name(last_name, "achternaam")
    lead.phone = normalize_phone(phone)
    lead.goal = _clean_goal(goal)
    db.commit()
    db.refresh(lead)
    return lead


# --------------------------------------------------------------------------
# Intake plannen
# --------------------------------------------------------------------------

def book_intake(db, *, lead_token: str, starts_at: datetime, now: datetime) -> models.Intake:
    lead = get_lead(db, lead_token)
    starts_at = _to_local_naive(starts_at)

    if not is_intake_start(starts_at):
        raise InvalidIntakeSlotError(
            "Dit is geen intakemoment. Intakes zijn op dinsdag tot en met donderdag, tussen 15:00 en 17:20."
        )
    if starts_at <= now:
        raise InvalidIntakeSlotError("Dit moment is al voorbij. Kies een ander moment.")

    existing = (
        db.query(models.Intake)
        .filter(
            models.Intake.lead_id == lead.id,
            models.Intake.status == models.IntakeStatus.SCHEDULED,
            models.Intake.starts_at > now,
        )
        .first()
    )
    if existing is not None:
        raise LeadAlreadyScheduledError("Je hebt al een intake gepland. Wil je die verzetten? Stuur ons een WhatsApp.")

    if starts_at in _taken_starts(db, starts_at, starts_at + INTAKE_DURATION):
        raise IntakeSlotTakenError("Dit moment is net door iemand anders gekozen. Kies een ander moment.")

    intake = models.Intake(
        lead_id=lead.id,
        trainer_name=INTAKE_TRAINER,
        starts_at=starts_at,
        ends_at=starts_at + INTAKE_DURATION,
        status=models.IntakeStatus.SCHEDULED,
        created_at=now,
    )
    db.add(intake)
    try:
        db.commit()
    except IntegrityError:
        # Twee bezoekers kozen tegelijk hetzelfde moment; de unieke index
        # laat er één winnen.
        db.rollback()
        raise IntakeSlotTakenError("Dit moment is net door iemand anders gekozen. Kies een ander moment.")
    db.refresh(intake)
    return intake
