"""Regel: credits toekennen per klant/periode volgens lidmaatschap (Club of PT)."""
from datetime import datetime, timedelta

from app import engine as biz
from app import models

from .helpers import TEST_NOW, make_customer


def test_grant_period_credits_creates_correct_amount_and_type(db):
    customer = make_customer(db, membership_type=models.SessionType.PT)

    credits = biz.grant_period_credits(
        db,
        customer_id=customer.id,
        session_type=models.SessionType.PT,
        amount=4,
        period_start=datetime(2026, 1, 1),
        period_end=datetime(2026, 1, 31),
    )

    assert len(credits) == 4
    assert all(c.session_type == models.SessionType.PT for c in credits)
    assert all(c.status == models.CreditStatus.VALID for c in credits)
    assert all(c.source == models.CreditSource.GRANT for c in credits)


def test_club_and_pt_credits_are_separate_pools(db):
    customer = make_customer(db, membership_type=models.SessionType.CLUB)
    biz.grant_period_credits(
        db, customer_id=customer.id, session_type=models.SessionType.CLUB, amount=2,
        period_start=TEST_NOW, period_end=TEST_NOW + timedelta(days=30),
    )
    biz.grant_period_credits(
        db, customer_id=customer.id, session_type=models.SessionType.PT, amount=1,
        period_start=TEST_NOW, period_end=TEST_NOW + timedelta(days=30),
    )

    club_credits = biz.get_valid_credits(db, customer.id, session_type=models.SessionType.CLUB, now=TEST_NOW)
    pt_credits = biz.get_valid_credits(db, customer.id, session_type=models.SessionType.PT, now=TEST_NOW)

    assert len(club_credits) == 2
    assert len(pt_credits) == 1


def test_grant_zero_or_negative_amount_rejected(db):
    customer = make_customer(db)
    try:
        biz.grant_period_credits(
            db, customer_id=customer.id, session_type=models.SessionType.CLUB, amount=0,
            period_start=datetime(2026, 1, 1), period_end=datetime(2026, 1, 31),
        )
        assert False, "had een ValueError moeten geven"
    except ValueError:
        pass
