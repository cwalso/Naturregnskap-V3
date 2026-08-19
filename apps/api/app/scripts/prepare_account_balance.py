import argparse
from pathlib import Path

from app.analysis.grunnkart_parquet import prepare_balance
from app.services.account_balance import prepared_path, source_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Forbered kommunevis nivå-0-balanse")
    parser.add_argument("--municipality", required=True, help="Fire sifre")
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument(
        "--area-field", required=True, help="Validert polygonareal i m²"
    )
    parser.add_argument("--municipality-field", default="kommunenummer")
    args = parser.parse_args()
    input_path = args.input or source_path(args.municipality)
    output_path = args.output or prepared_path(args.municipality)
    prepare_balance(
        input_path,
        args.municipality,
        output_path,
        area_field=args.area_field,
        municipality_field=args.municipality_field,
    )
    print(output_path)


if __name__ == "__main__":
    main()
