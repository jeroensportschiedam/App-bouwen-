"""Regels: credit teruggeven bij op tijd afmelden (Club 12u/7 dagen,
PT 24u/14 dagen), en te laat afmelden weigeren met een duidelijke,
type-specifieke foutmelding."""
import pytest
from datetime import datetime, timedelta

from app import engine as biz
from app import models
from app.errors import AlreadyCancelledError, LateCancellationError

from .helpers import TEST_NOW, grant, make_club_session, make_customer, make_pt_slot, make_trainer

SESSION_START = TEST_NOW + timedelta(days=5)


def _book_club(db):
    customer = make_customer(db, membership_type=models.SessionType.CLUB)
    session = make_club_session(db, start_time=SESSION_START, capacity=5)
    grant(db, customer.id, models.SessionType.CLUB, amount=1)
    booking = biz.book_session(db, customer_id=customer.id, session_id=session.id, now=TEST_NOW)
    return customer, session, booking


def _book_pt(db):
    customer = make_customer(db, membership_type=models.SessionType.PT)
    trainer = make_trainer(db)
    session = make_pt_slot(db, trainer.id, start_time=SESSION_START)
    grant(db, customer.id, models.SessionType.PT, amount=1)
    booking = biz.book_session(db, customer_id=customer.id, session_id=session.id, now=TEST_NOW)
    return customer, session, booking


def test_club_cancel_exactly_at_12_hours_is_allowed(db):
    _, _, booking = _book_club(db)
    cancel_time = SESSION_START - timedelta(hours=12)

    result = biz.cancel_booking(db, booking_id=booking.id, cancel_time=cancel_time)

    assert result.status == models.BookingStatus.CANCELLED_ON_TIME


def test_club_cancel_below_12_hours_is_rejected_with_explanatory_message(db):
    _, _, booking = _book_club(db)
    cancel_time = SESSION_START - timedelta(hours=10)  # scenario: 10 uur van tevoren

    with pytest.raises(LateCancellationError) as exc_info:
        biz.cancel_booking(db, booking_id=booking.id, cancel_time=cancel_time)

    message = str(exc_info.value)
    assert "12 uur" in message
    assert "24 uur" in message


def test_club_cancel_13_hours_before_gives_credit_valid_7_days(db):
    customer, _, booking = _book_club(db)
    cancel_time = SESSION_START - timedelta(hours=13)

    biz.cancel_booking(db, booking_id=booking.id, cancel_time=cancel_time)

    refund_credits = [
        c for c in db.query(models.Credit).filter(models.Credit.customer_id == customer.id).all()
        if c.source == models.CreditSource.REFUND
    ]
    assert len(refund_credits) == 1
    refund = refund_credits[0]
    assert refund.status == models.CreditStatus.VALID
    assert refund.expires_at == cancel_time + timedelta(days=7)


def test_club_cancel_10_hours_before_is_rejected(db):
    _, _, booking = _book_club(db)
    cancel_time = SESSION_START - timedelta(hours=10)

    with pytest.raises(LateCancellationError):
        biz.cancel_booking(db, booking_id=booking.id, cancel_time=cancel_time)

    fresh = db.query(models.Booking).filter(models.Booking.id == booking.id).first()
    assert fresh.status == models.BookingStatus.BOOKED  # boeking blijft ongewijzigd staan


def test_pt_cancel_exactly_at_24_hours_is_allowed(db):
    _, _, booking = _book_pt(db)
    cancel_time = SESSION_START - timedelta(hours=24)

    result = biz.cancel_booking(db, booking_id=booking.id, cancel_time=cancel_time)

    assert result.status == models.BookingStatus.CANCELLED_ON_TIME


def test_pt_cancel_20_hours_before_is_rejected(db):
    _, _, booking = _book_pt(db)
    cancel_time = SESSION_START - timedelta(hours=20)

    with pytest.raises(LateCancellationError):
        biz.cancel_booking(db, booking_id=booking.id, cancel_time=cancel_time)


def test_pt_cancel_30_hours_before_gives_credit_valid_14_days(db):
    customer, _, booking = _book_pt(db)
    cancel_time = SESSION_START - timedelta(hours=30)

    biz.cancel_booking(db, booking_id=booking.id, cancel_time=cancel_time)

    refund = [
        c for c in db.query(models.Credit).filter(models.Credit.customer_id == customer.id).all()
        if c.source == models.CreditSource.REFUND
    ][0]
    assert refund.expires_at == cancel_time + timedelta(days=14)


def test_cancelling_an_already_cancelled_booking_is_rejected(db):
    _, _, booking = _book_club(db)
    cancel_time = SESSION_START - timedelta(hours=13)
    biz.cancel_booking(db, booking_id=booking.id, cancel_time=cancel_time)

    with pytest.raises(AlreadyCancelledError):
        biz.cancel_booking(db, booking_id=booking.id, cancel_time=cancel_time)
