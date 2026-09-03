"""SQLAlchemy datamodel voor de creditpool-engine (sectie 2)."""
import enum

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String
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
