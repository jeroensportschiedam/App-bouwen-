"""Creditpool-engine: alle businessregels uit sectie 2.

Elke publieke functie hieronder komt overeen met (een deel van) één regel uit
de requirements. De functies werken op een meegegeven SQLAlchemy-sessie, zodat
ze zowel vanuit de API (app/main.py) als rechtstreeks vanuit unit tests
aan te roepen zijn zonder een server nodig te hebben.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from . import models
from .errors import (
    AlreadyCancelledError,
    CreditTypeMismatchError,
    InsufficientCreditError,
    LateCancellationError,
    NotFoundError,
    SessionFullError,
    SessionNotAvailableError,
)

# Deadlines en geldigheidstermijnen uit sectie 2.
CLUB_CANCEL_DEADLINE_HOURS = 12
PT_CANCEL_DEADLINE_HOURS = 24
CLUB_REFUND_VALIDITY_DAYS = 7
PT_REFUND_VALIDITY_DAYS = 14
EXPIRY_WARNING_WINDOW_HOURS = 48


def _now(now: Optional[datetime] = None) -> datetime:
    return now or datetime.utcnow()


# --------------------------------------------------------------------------
# Setup helpers (klanten, trainers, sessies)
# --------------------------------------------------------------------------

def create_customer(
    db,
    *,
    name: str,
    membership_type: models.SessionType,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    customer_since=None,
    status: models.CustomerStatus = models.CustomerStatus.ACTIVE,
) -> models.Customer:
    customer = models.Customer(
        name=name,
        email=email,
        phone=phone,
        customer_since=customer_since,
        membership_type=membership_type,
        status=status,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def create_trainer(db, *, name: str) -> models.Trainer:
    trainer = models.Trainer(name=name)
    db.add(trainer)
    db.commit()
    db.refresh(trainer)
    return trainer


def create_club_session(
    db, *, start_time: datetime, end_time: datetime, capacity: int, trainer_id: Optional[int] = None
) -> models.Session:
    """Sessie uit de vaste clubtraining-reeks; staat standaard open."""
    session = models.Session(
        session_type=models.SessionType.CLUB,
        trainer_id=trainer_id,
        start_time=start_time,
        end_time=end_time,
        capacity=capacity,
        is_open=True,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def open_trainer_slot(db, *, trainer_id: int, start_time: datetime, end_time: datetime) -> models.Session:
    """Trainer geeft een PT-tijdslot vrij. Zonder deze aanroep bestaat het
    tijdslot niet en kan niemand het boeken, ook niet met een geldig credit."""
    session = models.Session(
        session_type=models.SessionType.PT,
        trainer_id=trainer_id,
        start_time=start_time,
        end_time=end_time,
        capacity=1,
        is_open=True,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def close_trainer_slot(db, session_id: int) -> models.Session:
    session = _get_session(db, session_id)
    session.is_open = False
    db.commit()
    db.refresh(session)
    return session


# --------------------------------------------------------------------------
# Credits: toekennen, opvragen, laten vervallen
# --------------------------------------------------------------------------

def grant_period_credits(
    db,
    *,
    customer_id: int,
    session_type: models.SessionType,
    amount: int,
    period_start: datetime,
    period_end: datetime,
) -> list[models.Credit]:
    """Kent `amount` credits toe voor de opgegeven periode, volgens het
    lidmaatschap van de klant (Clubtraining of PT)."""
    if amount <= 0:
        raise ValueError("amount moet groter dan 0 zijn")
    _get_customer(db, customer_id)

    credits_ = [
        models.Credit(
            customer_id=customer_id,
            session_type=session_type,
            status=models.CreditStatus.VALID,
            source=models.CreditSource.GRANT,
            granted_at=period_start,
            expires_at=period_end,
        )
        for _ in range(amount)
    ]
    db.add_all(credits_)
    db.commit()
    for c in credits_:
        db.refresh(c)
    return credits_


def import_credits(
    db,
    *,
    customer_id: int,
    session_type: models.SessionType,
    amount: int,
    granted_at: datetime,
    expires_at: datetime,
) -> list[models.Credit]:
    """Voor Stap 3 (CSV-import): kent bestaande resterende credits van een
    klant toe met source=IMPORT, zodat ze traceerbaar blijven t.o.v. reguliere
    periodieke toekenningen en refunds."""
    if amount <= 0:
        return []
    _get_customer(db, customer_id)

    credits_ = [
        models.Credit(
            customer_id=customer_id,
            session_type=session_type,
            status=models.CreditStatus.VALID,
            source=models.CreditSource.IMPORT,
            granted_at=granted_at,
            expires_at=expires_at,
        )
        for _ in range(amount)
    ]
    db.add_all(credits_)
    db.commit()
    for c in credits_:
        db.refresh(c)
    return credits_


def expire_credits(db, now: Optional[datetime] = None) -> int:
    """Zet alle verlopen VALID credits om naar EXPIRED. Geeft het aantal
    geraakte credits terug. Wordt ook defensief aangeroepen vanuit
    get_valid_credits, zodat verlopen credits nooit meetellen."""
    now = _now(now)
    stale = (
        db.query(models.Credit)
        .filter(models.Credit.status == models.CreditStatus.VALID, models.Credit.expires_at <= now)
        .all()
    )
    for credit in stale:
        credit.status = models.CreditStatus.EXPIRED
    if stale:
        db.commit()
    return len(stale)


def get_valid_credits(
    db, customer_id: int, session_type: Optional[models.SessionType] = None, now: Optional[datetime] = None
) -> list[models.Credit]:
    """Geeft de geldige credits van een klant terug, ongesorteerd: er is geen
    'oudste eerst'-verplichting, de klant (of UI) kiest zelf welke credit wordt
    ingezet bij het boeken."""
    now = _now(now)
    expire_credits(db, now=now)

    query = db.query(models.Credit).filter(
        models.Credit.customer_id == customer_id,
        models.Credit.status == models.CreditStatus.VALID,
    )
    if session_type is not None:
        query = query.filter(models.Credit.session_type == session_type)
    return query.all()


def get_credit_summary(
    db, customer_id: int, session_type: Optional[models.SessionType] = None, now: Optional[datetime] = None
) -> dict:
    """Totaaloverzicht zoals de klant het te zien krijgt: aantal geldige
    credits (niet per credit apart), plus een waarschuwing als de
    eerstvervallende credit binnen 48 uur verloopt."""
    now = _now(now)
    valid = get_valid_credits(db, customer_id, session_type=session_type, now=now)
    if not valid:
        return {"total_valid": 0, "soonest_expiry": None, "warn_soon": False}

    soonest = min(c.expires_at for c in valid)
    warn_soon = (soonest - now) <= timedelta(hours=EXPIRY_WARNING_WINDOW_HOURS)
    return {"total_valid": len(valid), "soonest_expiry": soonest, "warn_soon": warn_soon}


# --------------------------------------------------------------------------
# Boeken en afmelden
# --------------------------------------------------------------------------

def book_session(
    db, *, customer_id: int, session_id: int, credit_id: Optional[int] = None, now: Optional[datetime] = None
) -> models.Booking:
    now = _now(now)
    _get_customer(db, customer_id)
    session = _get_session(db, session_id)

    # (b) trainer moet dit tijdslot beschikbaar hebben gesteld — geldt ook
    # als de klant een geldig credit heeft.
    if not session.is_open:
        raise SessionNotAvailableError(
            "Dit tijdslot is niet door de trainer beschikbaar gesteld en kan daarom "
            "niet geboekt worden, ook niet met een geldig credit."
        )

    # Voorkom overboeking van groep of trainer-tijdslot.
    active_bookings = (
        db.query(models.Booking)
        .filter(models.Booking.session_id == session.id, models.Booking.status == models.BookingStatus.BOOKED)
        .count()
    )
    if active_bookings >= session.capacity:
        raise SessionFullError("Deze sessie zit vol, er is geen plek meer beschikbaar.")

    # (a) klant moet een geldig credit van het juiste type hebben.
    if credit_id is not None:
        credit = (
            db.query(models.Credit)
            .filter(models.Credit.id == credit_id, models.Credit.customer_id == customer_id)
            .first()
        )
        if credit is None:
            raise NotFoundError(f"Credit {credit_id} niet gevonden voor deze klant.")
        if credit.session_type != session.session_type:
            raise CreditTypeMismatchError(
                f"Credit is van type {credit.session_type.value}, maar de sessie is van "
                f"type {session.session_type.value}."
            )
        expire_credits(db, now=now)
        db.refresh(credit)
        if credit.status != models.CreditStatus.VALID:
            raise InsufficientCreditError("Het opgegeven credit is niet (meer) geldig.")
    else:
        valid_credits = get_valid_credits(db, customer_id, session_type=session.session_type, now=now)
        if not valid_credits:
            raise InsufficientCreditError(
                f"Klant heeft geen geldig credit voor sessietype {session.session_type.value}."
            )
        # Geen verplichte volgorde; standaard pakken we de eerstvervallende,
        # maar de klant kan expliciet een andere credit_id meegeven.
        credit = min(valid_credits, key=lambda c: c.expires_at)

    credit.status = models.CreditStatus.USED

    booking = models.Booking(
        customer_id=customer_id,
        session_id=session.id,
        credit_id=credit.id,
        status=models.BookingStatus.BOOKED,
        booked_at=now,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def cancel_booking(db, *, booking_id: int, cancel_time: Optional[datetime] = None) -> models.Booking:
    cancel_time = _now(cancel_time)
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if booking is None:
        raise NotFoundError(f"Boeking {booking_id} niet gevonden.")
    if booking.status != models.BookingStatus.BOOKED:
        raise AlreadyCancelledError("Deze boeking is al geannuleerd of al afgerond.")

    session = _get_session(db, booking.session_id)
    hours_until_session = (session.start_time - cancel_time).total_seconds() / 3600

    if session.session_type == models.SessionType.CLUB:
        deadline_hours = CLUB_CANCEL_DEADLINE_HOURS
        refund_validity_days = CLUB_REFUND_VALIDITY_DAYS
    else:
        deadline_hours = PT_CANCEL_DEADLINE_HOURS
        refund_validity_days = PT_REFUND_VALIDITY_DAYS

    if hours_until_session < deadline_hours:
        raise LateCancellationError(
            "Te laat om af te melden: voor Clubtraining kan dit tot 12 uur van tevoren, "
            "voor PT-sessies tot 24 uur van tevoren. Deze sessie ("
            f"{session.session_type.value}) start over {hours_until_session:.1f} uur — "
            f"dat is binnen de deadline van {deadline_hours} uur."
        )

    booking.status = models.BookingStatus.CANCELLED_ON_TIME
    booking.cancelled_at = cancel_time

    # Nieuw credit met eigen geldigheid vanaf het afmeldmoment; het
    # oorspronkelijke (verbruikte) credit wordt niet gereactiveerd.
    refund_credit = models.Credit(
        customer_id=booking.customer_id,
        session_type=session.session_type,
        status=models.CreditStatus.VALID,
        source=models.CreditSource.REFUND,
        granted_at=cancel_time,
        expires_at=cancel_time + timedelta(days=refund_validity_days),
        refunded_from_booking_id=booking.id,
    )
    db.add(refund_credit)
    db.commit()
    db.refresh(booking)
    return booking


# --------------------------------------------------------------------------
# Interne helpers
# --------------------------------------------------------------------------

def _get_customer(db, customer_id: int) -> models.Customer:
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if customer is None:
        raise NotFoundError(f"Klant {customer_id} niet gevonden.")
    return customer


def _get_session(db, session_id: int) -> models.Session:
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if session is None:
        raise NotFoundError(f"Sessie {session_id} niet gevonden.")
    return session
