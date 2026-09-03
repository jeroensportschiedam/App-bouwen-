"""Dunne FastAPI-laag rond de creditpool-engine. Bevat geen eigen
businesslogica — alles delegeert naar app/engine.py."""
from typing import Optional

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session as DBSession

from . import engine as biz
from . import models, schemas
from .database import get_db, init_db
from .errors import (
    AlreadyCancelledError,
    CreditPoolError,
    CreditTypeMismatchError,
    InsufficientCreditError,
    LateCancellationError,
    NotFoundError,
    SessionFullError,
    SessionNotAvailableError,
)

app = FastAPI(title="Creditpool Engine (prototype)")

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


@app.post("/customers", response_model=schemas.CustomerOut)
def create_customer(payload: schemas.CustomerCreate, db: DBSession = Depends(get_db)):
    return biz.create_customer(db, **payload.model_dump())


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


@app.post("/maintenance/expire-credits")
def expire_credits(db: DBSession = Depends(get_db)):
    count = biz.expire_credits(db)
    return {"expired": count}
