"""Regels: credit verbruiken bij boeken, geen oudste-eerst-verplichting,
en overboeking van een groep of trainer-tijdslot voorkomen."""
import pytest
from datetime import timedelta

from app import engine as biz
from app import models
from app.errors import CreditTypeMismatchError, InsufficientCreditError, SessionFullError

from .helpers import TEST_NOW, grant, make_club_session, make_customer, make_pt_slot, make_trainer


def test_book_session_consumes_exactly_one_credit(db):
    customer = make_customer(db, membership_type=models.SessionType.CLUB)
    session = make_club_session(db, capacity=5)
    grant(db, customer.id, models.SessionType.CLUB, amount=2)

    booking = biz.book_session(db, customer_id=customer.id, session_id=session.id, now=TEST_NOW)

    assert booking.status == models.BookingStatus.BOOKED
    remaining = biz.get_valid_credits(db, customer.id, session_type=models.SessionType.CLUB, now=TEST_NOW)
    assert len(remaining) == 1

    used_credit = db.query(models.Credit).filter(models.Credit.id == booking.credit_id).first()
    assert used_credit.status == models.CreditStatus.USED


def test_book_session_without_credit_is_rejected(db):
    customer = make_customer(db, membership_type=models.SessionType.CLUB)
    session = make_club_session(db, capacity=5)

    with pytest.raises(InsufficientCreditError):
        biz.book_session(db, customer_id=customer.id, session_id=session.id, now=TEST_NOW)


def test_booking_with_wrong_credit_type_is_rejected(db):
    customer = make_customer(db, membership_type=models.SessionType.PT)
    trainer = make_trainer(db)
    pt_session = make_pt_slot(db, trainer.id)
    club_credits = grant(db, customer.id, models.SessionType.CLUB, amount=1)

    with pytest.raises(CreditTypeMismatchError):
        biz.book_session(
            db, customer_id=customer.id, session_id=pt_session.id, credit_id=club_credits[0].id, now=TEST_NOW
        )


def test_customer_can_choose_which_valid_credit_to_spend(db):
    """Geen 'oudste eerst'-verplichting: de klant mag expliciet een later
    vervallende credit inzetten terwijl er een eerder vervallende bestaat."""
    customer = make_customer(db, membership_type=models.SessionType.CLUB)
    session = make_club_session(db, capacity=5)

    soon = grant(db, customer.id, models.SessionType.CLUB, amount=1, period_end=TEST_NOW + timedelta(days=2))[0]
    later = grant(db, customer.id, models.SessionType.CLUB, amount=1, period_end=TEST_NOW + timedelta(days=30))[0]

    booking = biz.book_session(db, customer_id=customer.id, session_id=session.id, credit_id=later.id, now=TEST_NOW)

    assert booking.credit_id == later.id
    db.refresh(soon)
    assert soon.status == models.CreditStatus.VALID  # de eerder vervallende credit blijft ongebruikt


def test_overbooking_of_club_group_is_prevented(db):
    trainer = make_trainer(db)
    session = make_club_session(db, capacity=2, trainer_id=trainer.id)

    c1 = make_customer(db, membership_type=models.SessionType.CLUB)
    c2 = make_customer(db, membership_type=models.SessionType.CLUB)
    c3 = make_customer(db, membership_type=models.SessionType.CLUB)
    for c in (c1, c2, c3):
        grant(db, c.id, models.SessionType.CLUB, amount=1)

    biz.book_session(db, customer_id=c1.id, session_id=session.id, now=TEST_NOW)
    biz.book_session(db, customer_id=c2.id, session_id=session.id, now=TEST_NOW)

    with pytest.raises(SessionFullError):
        biz.book_session(db, customer_id=c3.id, session_id=session.id, now=TEST_NOW)


def test_overbooking_of_pt_slot_is_prevented(db):
    trainer = make_trainer(db)
    pt_session = make_pt_slot(db, trainer.id)

    c1 = make_customer(db, membership_type=models.SessionType.PT)
    c2 = make_customer(db, membership_type=models.SessionType.PT)
    grant(db, c1.id, models.SessionType.PT, amount=1)
    grant(db, c2.id, models.SessionType.PT, amount=1)

    biz.book_session(db, customer_id=c1.id, session_id=pt_session.id, now=TEST_NOW)

    with pytest.raises(SessionFullError):
        biz.book_session(db, customer_id=c2.id, session_id=pt_session.id, now=TEST_NOW)
