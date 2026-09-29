import argparse
import json
from pathlib import Path

from app.analysis.grunnkart_gml import inspect_gml


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inspiser kommunevis Grunnkart-GML før Level0-beregning"
    )
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    print(json.dumps(inspect_gml(args.path), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
