import argparse
import json
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

DATASET_UUID = "28c28e3a-d88f-4a34-8c60-5efe6d56a44d"
ATOM_URL = (
    "https://nedlasting.geonorge.no/geonorge/ATOM-feeds/"
    "GrunnkartArealanalyse_AtomFeedGML.xml"
)
ATOM_NS = {"a": "http://www.w3.org/2005/Atom"}


def resolve_distribution(
    municipality_number: str,
    *,
    epsg: str = "25832",
) -> dict[str, Any]:
    with urllib.request.urlopen(ATOM_URL, timeout=30) as response:
        root = ET.fromstring(response.read())

    matches: list[dict[str, str]] = []
    for entry in root.findall(".//a:entry", ATOM_NS):
        title = (
            entry.findtext("a:title", default="", namespaces=ATOM_NS) or ""
        ).strip()
        if municipality_number not in title:
            continue
        for link in entry.findall("a:link", ATOM_NS):
            link_title = link.attrib.get("title", "")
            href = link.attrib.get("href")
            if href and f"EPSG:{epsg}" in link_title:
                matches.append(
                    {
                        "municipalityNumber": municipality_number,
                        "entryTitle": title,
                        "epsg": epsg,
                        "url": href,
                    }
                )

    if len(matches) != 1:
        raise RuntimeError(
            f"Forventet én {municipality_number}-leveranse i EPSG:{epsg}, "
            f"fant {len(matches)}"
        )
    return matches[0]


def download_distribution(url: str, output: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "Naturregnskap-V3/1"})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(response.read())
    except urllib.error.HTTPError as error:
        if error.code == 403:
            raise RuntimeError(
                "Geonorge avviste nedlastingen med HTTP 403. Datasettet krever "
                "tilgangsrollen nd.filnedlasting/GeoID i dette miljøet. "
                "Selve kommuneleveransen er identifisert, men kan ikke hentes "
                "anonymt."
            ) from error
        raise


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Finn kommunevis Grunnkart 2025 GML-leveranse i Geonorge Atom"
    )
    parser.add_argument("--municipality", required=True)
    parser.add_argument("--epsg", default="25832")
    parser.add_argument("--download", type=Path)
    args = parser.parse_args()

    result = resolve_distribution(args.municipality, epsg=args.epsg)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.download:
        download_distribution(result["url"], args.download)
        print(args.download)


if __name__ == "__main__":
    main()
