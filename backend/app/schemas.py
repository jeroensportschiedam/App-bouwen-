"""Pydantic in/output-schema's voor de dunne FastAPI-laag rond engine.py."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import CustomerStatus, SessionType


class CustomerCreate(BaseModel):
    name: str
    membership_type: SessionType
    email: Optional[str] = None
    phone: Optional[str] = None
    customer_since: Optional[date] = None
    status: CustomerStatus = CustomerStatus.ACTIVE


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    customer_since: Optional[date] = None
    membership_type: SessionType
    status: CustomerStatus


class TrainerCreate(BaseModel):
    name: str


class TrainerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ClubSessionCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    capacity: int
    trainer_id: Optional[int] = None


class TrainerSlotCreate(BaseModel):
    trainer_id: int
    start_time: datetime
    end_time: datetime


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_type: SessionType
    trainer_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    capacity: int
    is_open: bool


class GrantCreditsRequest(BaseModel):
    customer_id: int
    session_type: SessionType
    amount: int
    period_start: datetime
    period_end: datetime


class CreditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    session_type: SessionType
    status: str
    source: str
    granted_at: datetime
    expires_at: datetime
    refunded_from_booking_id: Optional[int] = None


class BookSessionRequest(BaseModel):
    customer_id: int
    session_id: int
    credit_id: Optional[int] = None


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    session_id: int
    credit_id: int
    status: str
    booked_at: datetime
    cancelled_at: Optional[datetime] = None


class CreditSummaryOut(BaseModel):
    total_valid: int
    soonest_expiry: Optional[datetime] = None
    warn_soon: bool


class UpcomingBookingOut(BaseModel):
    booking_id: int
    session_id: int
    session_type: SessionType
    start_time: datetime
    end_time: datetime
    trainer_id: Optional[int] = None
    can_cancel: bool
    cancel_reason: str


# --------------------------------------------------------------------------
# Leadflow van de website (lead + intake)
# --------------------------------------------------------------------------

class LeadIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=1, max_length=30)
    goal: Optional[str] = Field(default=None, max_length=1000)


class LeadOut(BaseModel):
    token: str
    first_name: str
    last_name: str
    phone: str
    goal: Optional[str] = None
    created_at: datetime


class IntakeSlotOut(BaseModel):
    starts_at: datetime
    ends_at: datetime
    available: bool


class IntakeSlotsOut(BaseModel):
    trainer: str
    duration_minutes: int
    slots: list[IntakeSlotOut]


class IntakeIn(BaseModel):
    lead_token: str = Field(min_length=1, max_length=64)
    starts_at: datetime


class IntakeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trainer_name: str
    starts_at: datetime
    ends_at: datetime
    status: str
