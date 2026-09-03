"""Regel: PT-beschikbaarheid = kruising van (a) geldig credit en
(b) trainer heeft dat tijdslot beschikbaar gezet."""
import pytest
from datetime import datetime, timedelta

from app import engine as biz
from app import models
from app.errors import SessionNotAvailableError

from .helpers import TEST_NOW, grant, make_customer, make_trainer


def test_pt_booking_blocked_when_trainer_has_not_opened_slot(db):
    """Zelfs met een geldig PT-credit kan de klant niet boeken als de trainer
    dat tijdslot niet expliciet beschikbaar heeft gezet."""
    customer = make_customer(db, membership_type=models.SessionType.PT)
    trainer = make_trainer(db)
    grant(db, customer.id, models.SessionType.PT, amount=1)

    start_time = datetime(2026, 1, 15, 10, 0)
    closed_slot = biz.create_club_session(  # gebruikt als "niet-open" sessie-record
        db, start_time=start_time, end_time=start_time + timedelta(hours=1), capacity=1
    )
    # Simuleer een PT-slot dat nooit door de trainer geopend is: rechtstreeks
    # via het model aanmaken met is_open=False, zoals de engine ook een
    # gesloten slot zou tegenkomen.
    closed_pt_slot = models.Session(
        session_type=models.SessionType.PT,
        trainer_id=trainer.id,
        start_time=start_time,
        end_time=start_time + timedelta(hours=1),
        capacity=1,
        is_open=False,
    )
    db.add(closed_pt_slot)
    db.commit()
    db.refresh(closed_pt_slot)

    with pytest.raises(SessionNotAvailableError):
        biz.book_session(db, customer_id=customer.id, session_id=closed_pt_slot.id, now=TEST_NOW)


def test_pt_booking_allowed_once_trainer_opens_slot(db):
    customer = make_customer(db, membership_type=models.SessionType.PT)
    trainer = make_trainer(db)
    grant(db, customer.id, models.SessionType.PT, amount=1)

    slot = biz.open_trainer_slot(
        db, trainer_id=trainer.id, start_time=datetime(2026, 1, 15, 10, 0), end_time=datetime(2026, 1, 15, 11, 0)
    )

    booking = biz.book_session(db, customer_id=customer.id, session_id=slot.id, now=TEST_NOW)
    assert booking.status == models.BookingStatus.BOOKED


def test_closing_a_trainer_slot_blocks_future_bookings(db):
    customer = make_customer(db, membership_type=models.SessionType.PT)
    trainer = make_trainer(db)
    grant(db, customer.id, models.SessionType.PT, amount=1)

    slot = biz.open_trainer_slot(
        db, trainer_id=trainer.id, start_time=datetime(2026, 1, 15, 10, 0), end_time=datetime(2026, 1, 15, 11, 0)
    )
    biz.close_trainer_slot(db, slot.id)

    with pytest.raises(SessionNotAvailableError):
        biz.book_session(db, customer_id=customer.id, session_id=slot.id, now=TEST_NOW)
