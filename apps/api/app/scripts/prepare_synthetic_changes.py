import argparse
from pathlib import Path

from app.analysis.synthetic_changes import prepare_synthetic_changes
from app.services.changes import prepared_change_paths


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Forbered eksplisitt syntetiske endringspolygoner"
    )
    parser.add_argument("--municipality", required=True, help="Fire sifre")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    summary, features = prepared_change_paths(args.municipality, args.output_root)
    prepare_synthetic_changes(args.input, summary, features, args.municipality)
    print(summary)
    print(features)


if __name__ == "__main__":
    main()
