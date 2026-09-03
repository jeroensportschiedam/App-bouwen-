"""Kleine bouwstenen die tests hergebruiken om setup-boilerplate te vermijden.

Business-tijd wordt in de hele testsuite altijd expliciet meegegeven aan de
engine (via `now=`/`cancel_time=`), nooit de wall-clock. TEST_NOW is het
vaste referentiepunt waar alle relatieve tijden in fixtures op gebaseerd
zijn, zodat de suite niet afhankelijk is van de datum waarop hij draait.
"""
from datetime import datetime, timedelta

from app import engine as biz
from app import models

TEST_NOW = datetime(2026, 1, 10, 8, 0)


def make_customer(db, membership_type=models.SessionType.CLUB, **kwargs):
    return biz.create_customer(db, name="Test Klant", membership_type=membership_type, **kwargs)


def make_trainer(db, name="Trainer Piet"):
    return biz.create_trainer(db, name=name)


def make_club_session(db, start_time=None, capacity=1, trainer_id=None):
    start_time = start_time or (TEST_NOW + timedelta(days=5))
    return biz.create_club_session(
        db, start_time=start_time, end_time=start_time + timedelta(hours=1), capacity=capacity, trainer_id=trainer_id
    )


def make_pt_slot(db, trainer_id, start_time=None):
    start_time = start_time or (TEST_NOW + timedelta(days=5))
    return biz.open_trainer_slot(db, trainer_id=trainer_id, start_time=start_time, end_time=start_time + timedelta(hours=1))


def grant(db, customer_id, session_type, amount=1, period_start=None, period_end=None):
    period_start = period_start or (TEST_NOW - timedelta(days=5))
    period_end = period_end or (TEST_NOW + timedelta(days=60))
    return biz.grant_period_credits(
        db, customer_id=customer_id, session_type=session_type, amount=amount,
        period_start=period_start, period_end=period_end,
    )
