import argparse
from pathlib import Path

from app.analysis.grunnkart_gml import prepare_balance_from_gml
from app.services.account_balance import prepared_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Forbered kommunevis Level0-balanse direkte fra Grunnkart-GML"
    )
    parser.add_argument("--municipality", required=True, help="Fire sifre")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    output_path = args.output or prepared_path(args.municipality)
    result = prepare_balance_from_gml(
        args.input,
        args.municipality,
        output_path,
    )
    print(output_path)
    for metric in result.metrics:
        print(f"{metric.id}: {metric.area_m2 / 1000:.1f} dekar")
    print(f"excluded: {result.reconciliation.excluded_area_m2 / 1000:.1f} dekar")


if __name__ == "__main__":
    main()
