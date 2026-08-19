import argparse
import json
from pathlib import Path

from app.analysis.grunnkart_parquet import inspect_parquet


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inspiser Grunnkart-Parquet uten GeoPandas"
    )
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    print(
        json.dumps(
            inspect_parquet(args.path), ensure_ascii=False, indent=2, default=str
        )
    )


if __name__ == "__main__":
    main()
