"""Stap 3: test dat de dummy-CSV correct klanten aanmaakt en dat hun
resterende credits als geldige startcredits in de engine terechtkomen."""
import os
from datetime import datetime

from app import models
from app.csv_import import import_customers_from_csv

CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "dummy_customers.csv")
IMPORT_TIME = datetime(2026, 1, 1)


def test_import_creates_expected_number_of_customers_and_skips_bad_rows(db):
    result = import_customers_from_csv(db, CSV_PATH, import_time=IMPORT_TIME)

    # 12 rijen in de CSV, 1 daarvan heeft een leeg product en moet worden overgeslagen.
    assert result.customers_imported == 11
    assert len(result.skipped_rows) == 1
    line_number, reason = result.skipped_rows[0]
    assert line_number == 11  # "Fictieve Klant Tien", lege product-kolom
    assert "product" in reason

    all_customers = db.query(models.Customer).all()
    assert len(all_customers) == 11
    assert all(c.name != "Fictieve Klant Tien" for c in all_customers)


def test_import_grants_correct_starting_credits_per_customer(db):
    import_customers_from_csv(db, CSV_PATH, import_time=IMPORT_TIME)

    een = db.query(models.Customer).filter(models.Customer.name == "Fictieve Klant Een").first()
    een_credits = db.query(models.Credit).filter(models.Credit.customer_id == een.id).all()
    assert een.membership_type == models.SessionType.CLUB
    assert een.status == models.CustomerStatus.ACTIVE
    assert len(een_credits) == 3
    assert all(c.status == models.CreditStatus.VALID for c in een_credits)
    assert all(c.source == models.CreditSource.IMPORT for c in een_credits)

    twee = db.query(models.Customer).filter(models.Customer.name == "Fictieve Klant Twee").first()
    twee_credits = db.query(models.Credit).filter(models.Credit.customer_id == twee.id).all()
    assert twee.membership_type == models.SessionType.PT
    assert len(twee_credits) == 5


def test_import_customer_with_zero_credits_gets_no_credit_rows(db):
    import_customers_from_csv(db, CSV_PATH, import_time=IMPORT_TIME)

    drie = db.query(models.Customer).filter(models.Customer.name == "Fictieve Klant Drie").first()
    assert drie.status == models.CustomerStatus.INACTIVE
    credits = db.query(models.Credit).filter(models.Credit.customer_id == drie.id).all()
    assert credits == []


def test_import_total_credits_across_all_customers(db):
    result = import_customers_from_csv(db, CSV_PATH, import_time=IMPORT_TIME)

    # Club: 3+0+0+8+2+1 = 14, PT: 5+1+2+4+0 = 12
    assert result.credits_imported == 26


def test_imported_credits_are_usable_and_expire_like_any_other_credit(db):
    from app import engine as biz

    import_customers_from_csv(db, CSV_PATH, import_time=IMPORT_TIME)

    twee = db.query(models.Customer).filter(models.Customer.name == "Fictieve Klant Twee").first()
    valid_now = biz.get_valid_credits(db, twee.id, session_type=models.SessionType.PT, now=IMPORT_TIME)
    assert len(valid_now) == 5

    # Standaard geldigheid is 30 dagen vanaf import; na die termijn zijn ze verlopen.
    from datetime import timedelta

    still_valid_after_10d = biz.get_valid_credits(
        db, twee.id, session_type=models.SessionType.PT, now=IMPORT_TIME + timedelta(days=10)
    )
    expired_after_31d = biz.get_valid_credits(
        db, twee.id, session_type=models.SessionType.PT, now=IMPORT_TIME + timedelta(days=31)
    )
    assert len(still_valid_after_10d) == 5
    assert len(expired_after_31d) == 0


def test_missing_optional_fields_default_to_none(db):
    import_customers_from_csv(db, CSV_PATH, import_time=IMPORT_TIME)

    negen = db.query(models.Customer).filter(models.Customer.name == "Fictieve Klant Negen").first()
    assert negen.phone is None
