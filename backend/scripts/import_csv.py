"""CLI om een klanten-CSV te importeren in creditpool.db.

Gebruik:
    cd backend
    source .venv/bin/activate
    python scripts/import_csv.py data/dummy_customers.csv
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.csv_import import import_customers_from_csv  # noqa: E402
from app.database import SessionLocal, init_db  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2:
        print("Gebruik: python scripts/import_csv.py <pad-naar-csv>")
        return 1

    csv_path = sys.argv[1]
    init_db()
    db = SessionLocal()
    try:
        result = import_customers_from_csv(db, csv_path)
    finally:
        db.close()

    print(f"Klanten geïmporteerd: {result.customers_imported}")
    print(f"Credits geïmporteerd: {result.credits_imported}")
    if result.skipped_rows:
        print(f"Overgeslagen rijen ({len(result.skipped_rows)}):")
        for line_number, reason in result.skipped_rows:
            print(f"  regel {line_number}: {reason}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
