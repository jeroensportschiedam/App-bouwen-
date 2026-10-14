"""Leadflow over de HTTP-laag, zoals de website hem aanroept."""
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.database import get_db
from app.main import app, get_now

WED_NOW = datetime(2026, 10, 14, 16, 10)
LEAD = {"first_name": "Sanne", "last_name": "de Vries", "phone": "06 12345678", "goal": "Weer een vast sportmoment."}


@pytest.fixture()
def client():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    models.Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_now] = lambda: WED_NOW
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_van_formulier_tot_intake(client):
    lead = client.post("/leads", json=LEAD)
    assert lead.status_code == 201
    token = lead.json()["token"]

    slots = client.get("/intake-slots").json()
    assert slots["trainer"] == "Jeroen"
    assert slots["duration_minutes"] == 20
    first = slots["slots"][0]
    assert first["starts_at"] == "2026-10-14T16:20:00"
    assert first["available"] is True

    intake = client.post("/intakes", json={"lead_token": token, "starts_at": first["starts_at"]})
    assert intake.status_code == 201
    assert intake.json()["trainer_name"] == "Jeroen"
    assert intake.json()["ends_at"] == "2026-10-14T16:40:00"

    again = client.get("/intake-slots").json()["slots"][0]
    assert again["available"] is False


def test_bezet_moment_geeft_409_met_uitleg(client):
    a = client.post("/leads", json=LEAD).json()["token"]
    b = client.post("/leads", json={**LEAD, "phone": "06 11112222"}).json()["token"]
    client.post("/intakes", json={"lead_token": a, "starts_at": "2026-10-15T15:00:00"})

    response = client.post("/intakes", json={"lead_token": b, "starts_at": "2026-10-15T15:00:00"})
    assert response.status_code == 409
    assert "ander moment" in response.json()["detail"]


def test_ongeldig_telefoonnummer_geeft_422_met_uitleg(client):
    response = client.post("/leads", json={**LEAD, "phone": "12345"})
    assert response.status_code == 422
    assert "06 12345678" in response.json()["detail"]


def test_geen_intakemoment_geeft_422(client):
    token = client.post("/leads", json=LEAD).json()["token"]
    response = client.post("/intakes", json={"lead_token": token, "starts_at": "2026-10-16T15:00:00"})
    assert response.status_code == 422


def test_lead_bijwerken_met_sleutel(client):
    token = client.post("/leads", json=LEAD).json()["token"]
    response = client.patch(f"/leads/{token}", json={**LEAD, "last_name": "de Vries-Bakker"})
    assert response.status_code == 200
    assert response.json()["last_name"] == "de Vries-Bakker"
    assert client.patch("/leads/onbekend", json=LEAD).status_code == 404
