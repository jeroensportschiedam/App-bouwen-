"""Regels: credits vervallen automatisch na hun geldigheidstermijn, en bij
meerdere geldige credits toont het systeem een totaal met waarschuwing bij de
eerstvervallende — niet per credit."""
from datetime import datetime, timedelta

from app import engine as biz
from app import models

from .helpers import make_customer


def test_expired_credit_is_marked_expired_and_excluded_from_valid_list(db):
    customer = make_customer(db, membership_type=models.SessionType.CLUB)
    biz.grant_period_credits(
        db, customer_id=customer.id, session_type=models.SessionType.CLUB, amount=1,
        period_start=datetime(2026, 1, 1), period_end=datetime(2026, 1, 10),
    )

    after_expiry = datetime(2026, 1, 11)
    expired_count = biz.expire_credits(db, now=after_expiry)

    assert expired_count == 1
    assert biz.get_valid_credits(db, customer.id, now=after_expiry) == []

    credit = db.query(models.Credit).filter(models.Credit.customer_id == customer.id).first()
    assert credit.status == models.CreditStatus.EXPIRED


def test_expired_credit_cannot_be_used_to_book(db):
    from app.errors import InsufficientCreditError
    import pytest

    customer = make_customer(db, membership_type=models.SessionType.CLUB)
    biz.grant_period_credits(
        db, customer_id=customer.id, session_type=models.SessionType.CLUB, amount=1,
        period_start=datetime(2026, 1, 1), period_end=datetime(2026, 1, 10),
    )
    session = biz.create_club_session(
        db, start_time=datetime(2026, 1, 20, 10, 0), end_time=datetime(2026, 1, 20, 11, 0), capacity=5
    )

    with pytest.raises(InsufficientCreditError):
        biz.book_session(db, customer_id=customer.id, session_id=session.id, now=datetime(2026, 1, 15))


def test_credit_summary_reports_total_not_per_credit(db):
    customer = make_customer(db, membership_type=models.SessionType.CLUB)
    biz.grant_period_credits(
        db, customer_id=customer.id, session_type=models.SessionType.CLUB, amount=1,
        period_start=datetime(2026, 1, 1), period_end=datetime(2026, 2, 1),
    )
    biz.grant_period_credits(
        db, customer_id=customer.id, session_type=models.SessionType.CLUB, amount=1,
        period_start=datetime(2026, 1, 1), period_end=datetime(2026, 3, 1),
    )

    summary = biz.get_credit_summary(db, customer.id, now=datetime(2026, 1, 5))

    assert summary["total_valid"] == 2
    assert summary["soonest_expiry"] == datetime(2026, 2, 1)


def test_credit_summary_warns_when_soonest_expiry_within_48_hours(db):
    customer = make_customer(db, membership_type=models.SessionType.CLUB)
    now = datetime(2026, 1, 5, 12, 0)
    biz.grant_period_credits(
        db, customer_id=customer.id, session_type=models.SessionType.CLUB, amount=1,
        period_start=datetime(2026, 1, 1), period_end=now + timedelta(hours=30),
    )

    summary = biz.get_credit_summary(db, customer.id, now=now)

    assert summary["warn_soon"] is True


def test_credit_summary_no_warning_when_expiry_far_away(db):
    customer = make_customer(db, membership_type=models.SessionType.CLUB)
    now = datetime(2026, 1, 5, 12, 0)
    biz.grant_period_credits(
        db, customer_id=customer.id, session_type=models.SessionType.CLUB, amount=1,
        period_start=datetime(2026, 1, 1), period_end=now + timedelta(days=10),
    )

    summary = biz.get_credit_summary(db, customer.id, now=now)

    assert summary["warn_soon"] is False
