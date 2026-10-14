"""Dunne FastAPI-laag rond de creditpool-engine. Bevat geen eigen
businesslogica — alles delegeert naar app/engine.py."""
import os
from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session as DBSession

from . import engine as biz
from . import leadflow, models, schemas
from .database import get_db, init_db
from .errors import (
    AlreadyCancelledError,
    CreditPoolError,
    CreditTypeMismatchError,
    InsufficientCreditError,
    IntakeSlotTakenError,
    InvalidIntakeSlotError,
    InvalidLeadError,
    LateCancellationError,
    LeadAlreadyScheduledError,
    LeadFlowError,
    LeadNotFoundError,
    NotFoundError,
    SessionFullError,
    SessionNotAvailableError,
)

app = FastAPI(title="Creditpool Engine (prototype)")

# De website draait straks op een eigen domein (open punt O7). Zet dat domein
# in WEBSITE_ORIGINS (komma-gescheiden) zodat de browser de API mag aanroepen.
# Lokaal is dit niet nodig: de site staat dan onder /site op deze server.
_website_origins = [o.strip() for o in os.environ.get("WEBSITE_ORIGINS", "").split(",") if o.strip()]
if _website_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_website_origins,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Content-Type"],
    )

ERROR_STATUS = {
    NotFoundError: 404,
    InsufficientCreditError: 409,
    CreditTypeMismatchError: 409,
    SessionNotAvailableError: 409,
    SessionFullError: 409,
    LateCancellationError: 422,
    AlreadyCancelledError: 409,
}


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.exception_handler(CreditPoolError)
def handle_creditpool_error(request, exc: CreditPoolError):
    status_code = ERROR_STATUS.get(type(exc), 400)
    return JSONResponse(status_code=status_code, content={"detail": str(exc)})


LEADFLOW_ERROR_STATUS = {
    InvalidLeadError: 422,
    LeadNotFoundError: 404,
    InvalidIntakeSlotError: 422,
    IntakeSlotTakenError: 409,
    LeadAlreadyScheduledError: 409,
}


@app.exception_handler(LeadFlowError)
def handle_leadflow_error(request, exc: LeadFlowError):
    status_code = LEADFLOW_ERROR_STATUS.get(type(exc), 400)
    return JSONResponse(status_code=status_code, content={"detail": str(exc)})


def get_now() -> datetime:
    """Lokale tijd in de studio. Tests overschrijven deze dependency."""
    return leadflow.local_now()


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/ui/")


@app.post("/customers", response_model=schemas.CustomerOut)
def create_customer(payload: schemas.CustomerCreate, db: DBSession = Depends(get_db)):
    return biz.create_customer(db, **payload.model_dump())


@app.get("/customers", response_model=list[schemas.CustomerOut])
def list_customers(db: DBSession = Depends(get_db)):
    return biz.list_customers(db)


@app.post("/trainers", response_model=schemas.TrainerOut)
def create_trainer(payload: schemas.TrainerCreate, db: DBSession = Depends(get_db)):
    return biz.create_trainer(db, name=payload.name)


@app.post("/sessions/club", response_model=schemas.SessionOut)
def create_club_session(payload: schemas.ClubSessionCreate, db: DBSession = Depends(get_db)):
    return biz.create_club_session(db, **payload.model_dump())


@app.post("/sessions/pt-slot", response_model=schemas.SessionOut)
def open_trainer_slot(payload: schemas.TrainerSlotCreate, db: DBSession = Depends(get_db)):
    return biz.open_trainer_slot(db, **payload.model_dump())


@app.post("/credits/grant", response_model=list[schemas.CreditOut])
def grant_credits(payload: schemas.GrantCreditsRequest, db: DBSession = Depends(get_db)):
    return biz.grant_period_credits(db, **payload.model_dump())


@app.get("/customers/{customer_id}/credits", response_model=list[schemas.CreditOut])
def list_valid_credits(
    customer_id: int, session_type: Optional[models.SessionType] = None, db: DBSession = Depends(get_db)
):
    return biz.get_valid_credits(db, customer_id, session_type=session_type)


@app.get("/customers/{customer_id}/credits/summary", response_model=schemas.CreditSummaryOut)
def credit_summary(
    customer_id: int, session_type: Optional[models.SessionType] = None, db: DBSession = Depends(get_db)
):
    return biz.get_credit_summary(db, customer_id, session_type=session_type)


@app.post("/bookings", response_model=schemas.BookingOut)
def book_session(payload: schemas.BookSessionRequest, db: DBSession = Depends(get_db)):
    return biz.book_session(db, **payload.model_dump())


@app.post("/bookings/{booking_id}/cancel", response_model=schemas.BookingOut)
def cancel_booking(booking_id: int, db: DBSession = Depends(get_db)):
    return biz.cancel_booking(db, booking_id=booking_id)


@app.get("/customers/{customer_id}/bookings/upcoming", response_model=list[schemas.UpcomingBookingOut])
def list_upcoming_bookings(customer_id: int, db: DBSession = Depends(get_db)):
    bookings = biz.list_upcoming_bookings(db, customer_id)
    out = []
    for booking in bookings:
        session = booking.session
        window = biz.get_cancellation_window(db, booking.id)
        out.append(
            schemas.UpcomingBookingOut(
                booking_id=booking.id,
                session_id=session.id,
                session_type=session.session_type,
                start_time=session.start_time,
                end_time=session.end_time,
                trainer_id=session.trainer_id,
                can_cancel=window["can_cancel"],
                cancel_reason=window["reason"],
            )
        )
    return out


@app.get("/sessions", response_model=list[schemas.SessionOut])
def list_available_sessions(
    session_type: Optional[models.SessionType] = None,
    before: Optional[datetime] = None,
    db: DBSession = Depends(get_db),
):
    return biz.list_available_sessions(db, session_type=session_type, before=before)


@app.post("/maintenance/expire-credits")
def expire_credits(db: DBSession = Depends(get_db)):
    count = biz.expire_credits(db)
    return {"expired": count}


# --------------------------------------------------------------------------
# Leadflow van de website: lead aanmaken (stap 1) en een intake plannen
# (stap 2). Geen betaalflow.
# --------------------------------------------------------------------------

def _lead_out(lead: models.Lead) -> schemas.LeadOut:
    return schemas.LeadOut(
        token=lead.public_token,
        first_name=lead.first_name,
        last_name=lead.last_name,
        phone=lead.phone,
        goal=lead.goal,
        created_at=lead.created_at,
    )


@app.post("/leads", response_model=schemas.LeadOut, status_code=201)
def create_lead(payload: schemas.LeadIn, db: DBSession = Depends(get_db), now: datetime = Depends(get_now)):
    return _lead_out(leadflow.create_lead(db, now=now, **payload.model_dump()))


@app.patch("/leads/{token}", response_model=schemas.LeadOut)
def update_lead(token: str, payload: schemas.LeadIn, db: DBSession = Depends(get_db)):
    return _lead_out(leadflow.update_lead(db, token=token, **payload.model_dump()))


@app.get("/intake-slots", response_model=schemas.IntakeSlotsOut)
def list_intake_slots(
    days: int = leadflow.DEFAULT_SLOT_HORIZON_DAYS, db: DBSession = Depends(get_db), now: datetime = Depends(get_now)
):
    return schemas.IntakeSlotsOut(
        trainer=leadflow.INTAKE_TRAINER,
        duration_minutes=int(leadflow.INTAKE_DURATION.total_seconds() // 60),
        slots=leadflow.list_intake_slots(db, now=now, days=days),
    )


@app.post("/intakes", response_model=schemas.IntakeOut, status_code=201)
def book_intake(payload: schemas.IntakeIn, db: DBSession = Depends(get_db), now: datetime = Depends(get_now)):
    return leadflow.book_intake(db, lead_token=payload.lead_token, starts_at=payload.starts_at, now=now)


# De website (map ../website) lokaal meeserveren onder /site, met een
# config.js die naar deze server wijst. Zo werkt het intakeformulier
# lokaal van begin tot eind, zonder CORS of losse webserver.
website_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "website")
if os.path.isdir(website_dir):

    @app.get("/site/assets/config.js", include_in_schema=False)
    def website_config():
        with open(os.path.join(website_dir, "assets", "config.js"), encoding="utf-8") as fh:
            source = fh.read()
        source += '\n// Geserveerd door de backend: intakeformulier praat met deze server.\nwindow.CLUBHOUSE.apiBase = "";\n'
        return Response(content=source, media_type="application/javascript")

    app.mount("/site", StaticFiles(directory=website_dir, html=True), name="site")

static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
app.mount("/ui", StaticFiles(directory=static_dir, html=True), name="ui")
