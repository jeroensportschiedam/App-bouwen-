"""CSV-import (Stap 3): laadt bestaande klanten met hun resterende credits
in de creditpool-database uit Stap 1.

Aanname (met de programmeur af te stemmen): de CSV bevat één product per
klant (Clubtraining of PT) en een aantal resterende credits, maar geen
vervaldatum per credit. Geïmporteerde credits krijgen daarom een standaard
geldigheidstermijn vanaf het importmoment (DEFAULT_IMPORT_VALIDITY_DAYS).
Een rij met een onherkenbaar product wordt overgeslagen (en gerapporteerd),
de rest van het bestand blijft gewoon importeren.
"""
import csv
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Optional

from . import engine as biz
from . import models

DEFAULT_IMPORT_VALIDITY_DAYS = 30

PRODUCT_TO_SESSION_TYPE = {
    "clubtraining": models.SessionType.CLUB,
    "club": models.SessionType.CLUB,
    "pt": models.SessionType.PT,
    "personal training": models.SessionType.PT,
}

STATUS_MAP = {
    "actief": models.CustomerStatus.ACTIVE,
    "active": models.CustomerStatus.ACTIVE,
    "inactief": models.CustomerStatus.INACTIVE,
    "inactive": models.CustomerStatus.INACTIVE,
}


@dataclass
class ImportResult:
    customers_imported: int = 0
    credits_imported: int = 0
    skipped_rows: list[tuple[int, str]] = field(default_factory=list)


def _parse_date(value: Optional[str]) -> Optional[date]:
    value = (value or "").strip()
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


def import_customers_from_csv(
    db,
    csv_path: str,
    import_time: Optional[datetime] = None,
    credit_validity_days: int = DEFAULT_IMPORT_VALIDITY_DAYS,
) -> ImportResult:
    import_time = import_time or datetime.utcnow()
    result = ImportResult()

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for line_number, row in enumerate(reader, start=2):  # regel 1 is de header
            try:
                product_key = (row.get("product") or "").strip().lower()
                session_type = PRODUCT_TO_SESSION_TYPE.get(product_key)
                if session_type is None:
                    raise ValueError(f"onbekend of leeg product: '{row.get('product')}'")

                status_key = (row.get("status") or "").strip().lower()
                status = STATUS_MAP.get(status_key, models.CustomerStatus.ACTIVE)

                amount = int((row.get("resterende_credits") or "0").strip() or 0)

                customer = biz.create_customer(
                    db,
                    name=row["naam"].strip(),
                    email=(row.get("email") or "").strip() or None,
                    phone=(row.get("telefoon") or "").strip() or None,
                    customer_since=_parse_date(row.get("klant_sinds")),
                    membership_type=session_type,
                    status=status,
                )
                result.customers_imported += 1

                if amount > 0:
                    biz.import_credits(
                        db,
                        customer_id=customer.id,
                        session_type=session_type,
                        amount=amount,
                        granted_at=import_time,
                        expires_at=import_time + timedelta(days=credit_validity_days),
                    )
                    result.credits_imported += amount
            except Exception as exc:  # noqa: BLE001 — CSV is externe input; één foute rij mag de rest niet blokkeren
                result.skipped_rows.append((line_number, str(exc)))

    return result
