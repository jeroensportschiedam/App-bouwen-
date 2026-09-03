"""Stap 2 — Testscenario's voor de randgevallen (sectie 2).

Draait de 7 afgesproken scenario's tegen de echte FastAPI-app (via
TestClient, dus over de HTTP-laag inclusief foutafhandeling), met een eigen
kortstondige in-memory database. Raakt creditpool.db niet aan.

Gebruik:
    cd backend
    source .venv/bin/activate
    python scenarios/run_scenarios.py

Sluit af met exitcode 0 als alle scenario's slagen, anders 1.
"""
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import models  # noqa: E402
from app.database import get_db  # noqa: E402
from app.main import app  # noqa: E402

# ---------------------------------------------------------------------------
# Isolated in-memory database voor deze scenariorun. StaticPool is nodig
# omdat FastAPI requests in een andere thread afhandelt dan waarin de
# tabellen worden aangemaakt; zonder StaticPool krijgt elke thread zijn
# eigen (lege) :memory:-database.
# ---------------------------------------------------------------------------
engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
models.Base.metadata.create_all(engine)
TestingSessionLocal = sessionmaker(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

NOW = datetime.utcnow()
RESULTS: list[tuple[str, bool, str]] = []


def record(scenario: str, passed: bool, detail: str) -> None:
    RESULTS.append((scenario, passed, detail))
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {scenario}")
    print(f"       {detail}")
    print()


# ---------------------------------------------------------------------------
# HTTP-helpers
# ---------------------------------------------------------------------------

def create_customer(name, membership_type):
    r = client.post("/customers", json={"name": name, "membership_type": membership_type})
    assert r.status_code == 200, r.text
    return r.json()


def create_trainer(name="Trainer Piet"):
    r = client.post("/trainers", json={"name": name})
    assert r.status_code == 200, r.text
    return r.json()


def grant_credits(customer_id, session_type, amount, period_start, period_end):
    r = client.post(
        "/credits/grant",
        json={
            "customer_id": customer_id,
            "session_type": session_type,
            "amount": amount,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


def create_club_session(start_time, capacity=5, trainer_id=None):
    r = client.post(
        "/sessions/club",
        json={
            "start_time": start_time.isoformat(),
            "end_time": (start_time + timedelta(hours=1)).isoformat(),
            "capacity": capacity,
            "trainer_id": trainer_id,
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


def open_pt_slot(trainer_id, start_time):
    r = client.post(
        "/sessions/pt-slot",
        json={
            "trainer_id": trainer_id,
            "start_time": start_time.isoformat(),
            "end_time": (start_time + timedelta(hours=1)).isoformat(),
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


def book(customer_id, session_id):
    return client.post("/bookings", json={"customer_id": customer_id, "session_id": session_id})


def cancel(booking_id):
    return client.post(f"/bookings/{booking_id}/cancel")


def credit_summary(customer_id, session_type=None):
    params = {"session_type": session_type} if session_type else {}
    r = client.get(f"/customers/{customer_id}/credits/summary", params=params)
    assert r.status_code == 200, r.text
    return r.json()


def list_credits(customer_id, session_type=None):
    params = {"session_type": session_type} if session_type else {}
    r = client.get(f"/customers/{customer_id}/credits", params=params)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------------------
# Scenario 1 — PT-sessie 20 uur van tevoren afmelden -> geweigerd
# ---------------------------------------------------------------------------

def scenario_1():
    customer = create_customer("Scenario1 PT-klant", "PT")
    trainer = create_trainer()
    session = open_pt_slot(trainer["id"], NOW + timedelta(hours=20))
    grant_credits(customer["id"], "PT", 1, NOW - timedelta(days=1), NOW + timedelta(days=30))
    booking = book(customer["id"], session["id"]).json()

    r = cancel(booking["id"])
    remaining = credit_summary(customer["id"], "PT")

    passed = r.status_code == 422 and "24 uur" in r.json()["detail"] and "12 uur" in r.json()["detail"]
    passed = passed and remaining["total_valid"] == 0  # geen refund: credit blijft verbruikt
    record(
        "1. PT-sessie 20u van tevoren afmelden -> geweigerd",
        passed,
        f"HTTP {r.status_code}, melding: \"{r.json().get('detail')}\", "
        f"resterende PT-credits: {remaining['total_valid']}",
    )


# ---------------------------------------------------------------------------
# Scenario 2 — PT-sessie 30 uur van tevoren afmelden -> credit terug, 14 dagen
# ---------------------------------------------------------------------------

def scenario_2():
    customer = create_customer("Scenario2 PT-klant", "PT")
    trainer = create_trainer()
    session = open_pt_slot(trainer["id"], NOW + timedelta(hours=30))
    grant_credits(customer["id"], "PT", 1, NOW - timedelta(days=1), NOW + timedelta(days=30))
    booking = book(customer["id"], session["id"]).json()

    before = datetime.utcnow()
    r = cancel(booking["id"])
    after = datetime.utcnow()

    refund = [c for c in list_credits(customer["id"], "PT") if c["source"] == "REFUND"]
    passed = r.status_code == 200 and r.json()["status"] == "CANCELLED_ON_TIME" and len(refund) == 1
    if passed:
        expires_at = datetime.fromisoformat(refund[0]["expires_at"])
        passed = (before + timedelta(days=14) - timedelta(seconds=5)) <= expires_at <= (
            after + timedelta(days=14) + timedelta(seconds=5)
        )
    record(
        "2. PT-sessie 30u van tevoren afmelden -> credit terug, 14 dagen geldig",
        passed,
        f"HTTP {r.status_code}, status: {r.json().get('status')}, "
        f"nieuw credit vervalt op: {refund[0]['expires_at'] if refund else '-'}",
    )


# ---------------------------------------------------------------------------
# Scenario 3 — Clubles 13 uur van tevoren afmelden -> credit terug, 7 dagen
# ---------------------------------------------------------------------------

def scenario_3():
    customer = create_customer("Scenario3 Club-klant", "CLUB")
    session = create_club_session(NOW + timedelta(hours=13))
    grant_credits(customer["id"], "CLUB", 1, NOW - timedelta(days=1), NOW + timedelta(days=30))
    booking = book(customer["id"], session["id"]).json()

    before = datetime.utcnow()
    r = cancel(booking["id"])
    after = datetime.utcnow()

    refund = [c for c in list_credits(customer["id"], "CLUB") if c["source"] == "REFUND"]
    passed = r.status_code == 200 and r.json()["status"] == "CANCELLED_ON_TIME" and len(refund) == 1
    if passed:
        expires_at = datetime.fromisoformat(refund[0]["expires_at"])
        passed = (before + timedelta(days=7) - timedelta(seconds=5)) <= expires_at <= (
            after + timedelta(days=7) + timedelta(seconds=5)
        )
    record(
        "3. Clubles 13u van tevoren afmelden -> credit terug, 7 dagen geldig",
        passed,
        f"HTTP {r.status_code}, status: {r.json().get('status')}, "
        f"nieuw credit vervalt op: {refund[0]['expires_at'] if refund else '-'}",
    )


# ---------------------------------------------------------------------------
# Scenario 4 — Clubles 10 uur van tevoren afmelden -> geweigerd
# ---------------------------------------------------------------------------

def scenario_4():
    customer = create_customer("Scenario4 Club-klant", "CLUB")
    session = create_club_session(NOW + timedelta(hours=10))
    grant_credits(customer["id"], "CLUB", 1, NOW - timedelta(days=1), NOW + timedelta(days=30))
    booking = book(customer["id"], session["id"]).json()

    r = cancel(booking["id"])
    remaining = credit_summary(customer["id"], "CLUB")

    passed = r.status_code == 422 and "12 uur" in r.json()["detail"] and "24 uur" in r.json()["detail"]
    passed = passed and remaining["total_valid"] == 0
    record(
        "4. Clubles 10u van tevoren afmelden -> geweigerd",
        passed,
        f"HTTP {r.status_code}, melding: \"{r.json().get('detail')}\", "
        f"resterende Club-credits: {remaining['total_valid']}",
    )


# ---------------------------------------------------------------------------
# Scenario 5 — 2 geldige credits, verschillende vervaldatum -> totaal + waarschuwing
# ---------------------------------------------------------------------------

def scenario_5():
    customer = create_customer("Scenario5 Club-klant", "CLUB")
    grant_credits(customer["id"], "CLUB", 1, NOW - timedelta(days=1), NOW + timedelta(hours=30))  # binnen 48u
    grant_credits(customer["id"], "CLUB", 1, NOW - timedelta(days=1), NOW + timedelta(days=30))  # ver weg

    summary = credit_summary(customer["id"], "CLUB")

    passed = summary["total_valid"] == 2 and summary["warn_soon"] is True
    record(
        "5. Twee geldige credits met verschillende vervaldatum -> totaal 'nog 2 sessies' + waarschuwing",
        passed,
        f"total_valid={summary['total_valid']}, warn_soon={summary['warn_soon']}, "
        f"eerstvervallende op {summary['soonest_expiry']}",
    )


# ---------------------------------------------------------------------------
# Scenario 6 — Credit verloopt zonder gebruik -> verdwijnt automatisch
# ---------------------------------------------------------------------------

def scenario_6():
    customer = create_customer("Scenario6 Club-klant", "CLUB")
    # Grant zelf triggert geen vervalcontrole, dus dit toont de status
    # onmiddellijk na toekennen: nog gewoon VALID, ook al ligt expires_at
    # al in het verleden (credit is nooit gebruikt vóór de vervaldatum).
    granted = grant_credits(customer["id"], "CLUB", 1, NOW - timedelta(days=10), NOW - timedelta(days=1))
    status_at_grant = granted[0]["status"]

    r = client.post("/maintenance/expire-credits")
    after = credit_summary(customer["id"], "CLUB")

    passed = status_at_grant == "VALID" and r.status_code == 200 and r.json()["expired"] >= 1 and after["total_valid"] == 0
    record(
        "6. Credit verloopt zonder gebruik -> verdwijnt automatisch uit de pool",
        passed,
        f"status bij toekennen: {status_at_grant}, expire-run: {r.json()}, "
        f"geldige credits na opruimen: {after['total_valid']}",
    )


# ---------------------------------------------------------------------------
# Scenario 7 — Trainer heeft geen tijdslot beschikbaar -> niet boekbaar,
# ook niet met geldig credit.
# ---------------------------------------------------------------------------

def scenario_7():
    customer = create_customer("Scenario7 PT-klant", "PT")
    grant_credits(customer["id"], "PT", 1, NOW - timedelta(days=1), NOW + timedelta(days=30))

    # Trainer heeft dit tijdslot nooit beschikbaar gezet: rechtstreeks een
    # gesloten sessie aanmaken (zoals de engine 'm ook zou zien).
    raw_db = TestingSessionLocal()
    trainer = models.Trainer(name="Trainer Onbeschikbaar")
    raw_db.add(trainer)
    raw_db.commit()
    raw_db.refresh(trainer)
    closed_slot = models.Session(
        session_type=models.SessionType.PT,
        trainer_id=trainer.id,
        start_time=NOW + timedelta(hours=48),
        end_time=NOW + timedelta(hours=49),
        capacity=1,
        is_open=False,
    )
    raw_db.add(closed_slot)
    raw_db.commit()
    raw_db.refresh(closed_slot)
    closed_slot_id = closed_slot.id
    raw_db.close()

    r = book(customer["id"], closed_slot_id)
    remaining = credit_summary(customer["id"], "PT")

    passed = r.status_code == 409 and remaining["total_valid"] == 1  # credit blijft ongebruikt
    record(
        "7. Trainer heeft geen tijdslot beschikbaar -> niet boekbaar, ook niet met geldig credit",
        passed,
        f"HTTP {r.status_code}, melding: \"{r.json().get('detail')}\", "
        f"PT-credit nog geldig: {remaining['total_valid']}",
    )


def main() -> int:
    print("=" * 78)
    print("Stap 2 — Testscenario's creditpool-engine")
    print("=" * 78)
    print()

    for scenario in (scenario_1, scenario_2, scenario_3, scenario_4, scenario_5, scenario_6, scenario_7):
        scenario()

    print("=" * 78)
    passed_count = sum(1 for _, ok, _ in RESULTS if ok)
    for name, ok, _ in RESULTS:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
    print("-" * 78)
    print(f"{passed_count}/{len(RESULTS)} scenario's geslaagd")
    print("=" * 78)

    return 0 if passed_count == len(RESULTS) else 1


if __name__ == "__main__":
    sys.exit(main())
