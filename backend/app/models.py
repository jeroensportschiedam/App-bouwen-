"""SQLAlchemy datamodel voor de creditpool-engine (sectie 2)."""
import enum

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class SessionType(str, enum.Enum):
    CLUB = "CLUB"
    PT = "PT"


class CustomerStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class CreditStatus(str, enum.Enum):
    VALID = "VALID"
    USED = "USED"
    EXPIRED = "EXPIRED"


class CreditSource(str, enum.Enum):
    GRANT = "GRANT"
    REFUND = "REFUND"
    IMPORT = "IMPORT"


class BookingStatus(str, enum.Enum):
    BOOKED = "BOOKED"
    CANCELLED_ON_TIME = "CANCELLED_ON_TIME"
    COMPLETED = "COMPLETED"


class IntakeStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    CANCELLED = "CANCELLED"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    customer_since = Column(Date, nullable=True)
    membership_type = Column(SAEnum(SessionType), nullable=False)
    status = Column(SAEnum(CustomerStatus), nullable=False, default=CustomerStatus.ACTIVE)

    credits = relationship("Credit", back_populates="customer")
    bookings = relationship("Booking", back_populates="customer")


class Trainer(Base):
    __tablename__ = "trainers"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)


class Session(Base):
    """Eén bookbaar moment: een clubles uit de vaste reeks, of een PT-slot
    dat een trainer expliciet beschikbaar heeft gezet."""

    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)
    session_type = Column(SAEnum(SessionType), nullable=False)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    capacity = Column(Integer, nullable=False, default=1)
    is_open = Column(Boolean, nullable=False, default=True)

    trainer = relationship("Trainer")
    bookings = relationship("Booking", back_populates="session")


class Credit(Base):
    __tablename__ = "credits"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    session_type = Column(SAEnum(SessionType), nullable=False)
    status = Column(SAEnum(CreditStatus), nullable=False, default=CreditStatus.VALID)
    source = Column(SAEnum(CreditSource), nullable=False)
    granted_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    # Alleen gezet voor credits die zijn ontstaan uit een op-tijd afmelding.
    refunded_from_booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)

    customer = relationship("Customer", back_populates="credits")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    credit_id = Column(Integer, ForeignKey("credits.id"), nullable=False)
    status = Column(SAEnum(BookingStatus), nullable=False, default=BookingStatus.BOOKED)
    booked_at = Column(DateTime, nullable=False)
    cancelled_at = Column(DateTime, nullable=True)

    customer = relationship("Customer", back_populates="bookings")
    session = relationship("Session", back_populates="bookings")


class Lead(Base):
    """Geïnteresseerde vóór de intake (CLAUDE.md §3). Ontstaat bij stap 1 van
    "Intake aanvragen" op de website, nog vóór er een moment gekozen is."""

    __tablename__ = "leads"

    id = Column(Integer, primary_key=True)
    # Onraadbare sleutel voor de website: het formulier werkt zonder login,
    # dus het oplopende id mag niet genoeg zijn om een lead aan te passen.
    public_token = Column(String, nullable=False, unique=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    goal = Column(String, nullable=True)
    source = Column(String, nullable=False, default="website")
    created_at = Column(DateTime, nullable=False)

    intakes = relationship("Intake", back_populates="lead")


class Intake(Base):
    """Gratis gesprek van 20 minuten. Nooit een product, nooit een betaalflow."""

    __tablename__ = "intakes"
    # Eén geplande intake per trainer per moment. De database dwingt dit af,
    # zodat twee bezoekers die tegelijk hetzelfde moment kiezen niet allebei
    # slagen.
    __table_args__ = (
        Index(
            "uq_intakes_scheduled_slot",
            "trainer_name",
            "starts_at",
            unique=True,
            sqlite_where=text("status = 'SCHEDULED'"),
            postgresql_where=text("status = 'SCHEDULED'"),
        ),
    )

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    trainer_name = Column(String, nullable=False)
    starts_at = Column(DateTime, nullable=False)
    ends_at = Column(DateTime, nullable=False)
    status = Column(SAEnum(IntakeStatus), nullable=False, default=IntakeStatus.SCHEDULED)
    created_at = Column(DateTime, nullable=False)

    lead = relationship("Lead", back_populates="intakes")
