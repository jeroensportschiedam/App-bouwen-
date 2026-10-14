"""Typed exceptions voor overtredingen van de creditpool-businessregels."""


class CreditPoolError(Exception):
    """Basisklasse voor alle businessregel-fouten in de creditpool-engine."""


class NotFoundError(CreditPoolError):
    """Klant, sessie, credit of boeking bestaat niet."""


class InsufficientCreditError(CreditPoolError):
    """Klant heeft geen geldig credit van het juiste type."""


class CreditTypeMismatchError(CreditPoolError):
    """Het opgegeven credit hoort bij een ander sessietype (Club vs PT)."""


class SessionNotAvailableError(CreditPoolError):
    """PT-tijdslot is niet (meer) door de trainer beschikbaar gesteld."""


class SessionFullError(CreditPoolError):
    """Groep of trainer-tijdslot zit al vol (overboeking voorkomen)."""


class LateCancellationError(CreditPoolError):
    """Afmelden na de toegestane deadline (12u Club / 24u PT)."""


class AlreadyCancelledError(CreditPoolError):
    """Boeking is al geannuleerd of afgerond."""


class LeadFlowError(Exception):
    """Basisklasse voor fouten in de leadflow van de website (lead + intake).
    De meldingen zijn geschreven voor de bezoeker: de website toont ze direct."""


class InvalidLeadError(LeadFlowError):
    """Naam of telefoonnummer ontbreekt of klopt niet."""


class LeadNotFoundError(LeadFlowError):
    """Er is geen lead met deze sleutel."""


class InvalidIntakeSlotError(LeadFlowError):
    """Het gekozen moment is geen intakemoment, of ligt in het verleden."""


class IntakeSlotTakenError(LeadFlowError):
    """Iemand anders heeft dit intakemoment al."""


class LeadAlreadyScheduledError(LeadFlowError):
    """Deze lead heeft al een geplande intake."""
