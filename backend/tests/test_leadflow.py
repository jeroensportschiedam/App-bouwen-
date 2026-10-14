"""Leadflow van de website: lead aanmaken en een gratis intake plannen
(CLAUDE.md §10). Draait rechtstreeks tegen app/leadflow.py."""
from datetime import datetime, timedelta, timezone

import pytest

from app import leadflow, models
from app.errors import (
    IntakeSlotTakenError,
    InvalidIntakeSlotError,
    InvalidLeadError,
    LeadAlreadyScheduledError,
    LeadNotFoundError,
)

# Woensdag 14 oktober 2026, 16:10: midden in de intake-uren.
WED_NOW = datetime(2026, 10, 14, 16, 10)
# Maandag 19 oktober 2026, 08:00: begin van een hele week.
MON_NOW = datetime(2026, 10, 19, 8, 0)


def make_lead(db, now=WED_NOW, **kwargs):
    data = {"first_name": "Sanne", "last_name": "de Vries", "phone": "06 12345678"}
    data.update(kwargs)
    return leadflow.create_lead(db, now=now, **data)


# --------------------------------------------------------------------------
# Intakemomenten
# --------------------------------------------------------------------------

def test_21_intakemomenten_per_week_op_dinsdag_tot_en_met_donderdag(db):
    slots = leadflow.list_intake_slots(db, now=MON_NOW, days=7)

    assert len(slots) == 21
    assert {s["starts_at"].strftime("%a") for s in slots} == {"Tue", "Wed", "Thu"}
    tuesday = [s["starts_at"].strftime("%H:%M") for s in slots if s["starts_at"].weekday() == 1]
    assert tuesday == ["15:00", "15:20", "15:40", "16:00", "16:20", "16:40", "17:00"]


def test_laatste_intake_eindigt_om_17_20(db):
    slots = leadflow.list_intake_slots(db, now=MON_NOW, days=7)
    assert max(s["ends_at"].time() for s in slots).strftime("%H:%M") == "17:20"


def test_voorbije_momenten_van_vandaag_vallen_weg(db):
    slots = leadflow.list_intake_slots(db, now=WED_NOW, days=1)
    assert [s["starts_at"].strftime("%H:%M") for s in slots] == ["16:20", "16:40", "17:00"]


def test_geboekt_moment_staat_als_bezet(db):
    lead = make_lead(db)
    taken = datetime(2026, 10, 15, 15, 20)
    leadflow.book_intake(db, lead_token=lead.public_token, starts_at=taken, now=WED_NOW)

    slots = {s["starts_at"]: s["available"] for s in leadflow.list_intake_slots(db, now=WED_NOW, days=2)}
    assert slots[taken] is False
    assert slots[datetime(2026, 10, 15, 15, 0)] is True


# --------------------------------------------------------------------------
# Leads
# --------------------------------------------------------------------------

def test_lead_ontstaat_met_genormaliseerd_nummer_en_doel(db):
    lead = make_lead(db, goal="  Sterker worden na mijn zwangerschap.  ")

    assert lead.phone == "0612345678"
    assert lead.goal == "Sterker worden na mijn zwangerschap."
    assert lead.source == "website"
    assert len(lead.public_token) >= 16


def test_doel_is_optioneel(db):
    assert make_lead(db, goal="   ").goal is None


@pytest.mark.parametrize("phone", ["+31 6 1234 5678", "0031612345678", "010-1234567"])
def test_geldige_telefoonnummers(db, phone):
    make_lead(db, phone=phone)


@pytest.mark.parametrize("phone", ["12345", "06 1234", "telefoon", ""])
def test_ongeldig_telefoonnummer_geeft_uitleg(db, phone):
    with pytest.raises(InvalidLeadError, match="06 12345678"):
        make_lead(db, phone=phone)


def test_naam_is_verplicht(db):
    with pytest.raises(InvalidLeadError, match="voornaam"):
        make_lead(db, first_name="  ")


def test_terug_naar_stap_1_werkt_dezelfde_lead_bij(db):
    lead = make_lead(db)
    updated = leadflow.update_lead(
        db, token=lead.public_token, first_name="Sanne", last_name="de Vries", phone="06 87654321"
    )

    assert updated.id == lead.id
    assert updated.phone == "0687654321"
    assert db.query(models.Lead).count() == 1


def test_onbekende_sleutel(db):
    with pytest.raises(LeadNotFoundError):
        leadflow.book_intake(db, lead_token="bestaat-niet", starts_at=datetime(2026, 10, 15, 15, 0), now=WED_NOW)


# --------------------------------------------------------------------------
# Intake plannen
# --------------------------------------------------------------------------

def test_intake_plannen_bij_jeroen_voor_20_minuten(db):
    lead = make_lead(db)
    intake = leadflow.book_intake(
        db, lead_token=lead.public_token, starts_at=datetime(2026, 10, 15, 16, 40), now=WED_NOW
    )

    assert intake.trainer_name == "Jeroen"
    assert intake.ends_at - intake.starts_at == timedelta(minutes=20)
    assert intake.status == models.IntakeStatus.SCHEDULED
    assert intake.lead_id == lead.id


@pytest.mark.parametrize(
    "starts_at",
    [
        datetime(2026, 10, 19, 15, 0),  # maandag
        datetime(2026, 10, 16, 15, 0),  # vrijdag
        datetime(2026, 10, 17, 10, 0),  # zaterdag
        datetime(2026, 10, 15, 14, 40),  # voor 15:00
        datetime(2026, 10, 15, 17, 20),  # na de laatste start
        datetime(2026, 10, 15, 15, 10),  # niet op het 20-minutenrooster
    ],
)
def test_geen_intake_buiten_de_intakemomenten(db, starts_at):
    lead = make_lead(db)
    with pytest.raises(InvalidIntakeSlotError, match="dinsdag tot en met donderdag"):
        leadflow.book_intake(db, lead_token=lead.public_token, starts_at=starts_at, now=WED_NOW)


def test_geen_intake_in_het_verleden(db):
    lead = make_lead(db)
    with pytest.raises(InvalidIntakeSlotError, match="voorbij"):
        leadflow.book_intake(db, lead_token=lead.public_token, starts_at=datetime(2026, 10, 14, 16, 0), now=WED_NOW)


def test_bezet_moment_kan_niet_nog_een_keer(db):
    moment = datetime(2026, 10, 15, 15, 0)
    leadflow.book_intake(db, lead_token=make_lead(db).public_token, starts_at=moment, now=WED_NOW)

    other = make_lead(db, first_name="Bas", phone="06 11112222")
    with pytest.raises(IntakeSlotTakenError):
        leadflow.book_intake(db, lead_token=other.public_token, starts_at=moment, now=WED_NOW)


def test_database_laat_maar_een_intake_per_moment_toe(db):
    """Vangnet voor twee bezoekers die tegelijk op 'Bevestig' drukken: ook als
    de controle vooraf wordt overgeslagen, weigert de unieke index."""
    moment = datetime(2026, 10, 15, 15, 0)
    leadflow.book_intake(db, lead_token=make_lead(db).public_token, starts_at=moment, now=WED_NOW)
    other = make_lead(db, phone="06 11112222")

    db.add(
        models.Intake(
            lead_id=other.id, trainer_name="Jeroen", starts_at=moment, ends_at=moment + timedelta(minutes=20),
            status=models.IntakeStatus.SCHEDULED, created_at=WED_NOW,
        )
    )
    with pytest.raises(Exception):
        db.commit()
    db.rollback()


def test_geannuleerd_moment_komt_weer_vrij(db):
    moment = datetime(2026, 10, 15, 15, 0)
    intake = leadflow.book_intake(db, lead_token=make_lead(db).public_token, starts_at=moment, now=WED_NOW)
    intake.status = models.IntakeStatus.CANCELLED
    db.commit()

    other = make_lead(db, phone="06 11112222")
    leadflow.book_intake(db, lead_token=other.public_token, starts_at=moment, now=WED_NOW)


def test_een_lead_plant_maar_een_intake(db):
    lead = make_lead(db)
    leadflow.book_intake(db, lead_token=lead.public_token, starts_at=datetime(2026, 10, 15, 15, 0), now=WED_NOW)

    with pytest.raises(LeadAlreadyScheduledError):
        leadflow.book_intake(db, lead_token=lead.public_token, starts_at=datetime(2026, 10, 15, 15, 20), now=WED_NOW)


def test_tijd_met_tijdzone_wordt_lokale_studiotijd(db):
    """15:00 in Schiedam is in oktober (zomertijd) 13:00 UTC."""
    lead = make_lead(db)
    intake = leadflow.book_intake(
        db, lead_token=lead.public_token, starts_at=datetime(2026, 10, 15, 13, 0, tzinfo=timezone.utc), now=WED_NOW
    )
    assert intake.starts_at == datetime(2026, 10, 15, 15, 0)
