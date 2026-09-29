import xml.etree.ElementTree as ET
from collections import Counter
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.domain.accounting_rules import (
    ACCOUNT_CATEGORY_IDS,
    GRUNNKART_LEVEL0_RULES,
    Level0Rules,
)
from app.models.account import PreparedAccountBalance, PreparedMetric, Reconciliation


class GmlPreparationError(ValueError):
    pass


SUPPORTED_METRIC_EPSG = {"25832", "25833"}


def inspect_gml(path: Path) -> dict[str, Any]:
    feature_count = 0
    municipalities: Counter[str] = Counter()
    classes: Counter[str] = Counter()
    crs_values: Counter[str] = Counter()

    for feature in _iter_features(path):
        feature_count += 1
        municipality = _descendant_text(feature, "kommunenummer")
        source_class = _descendant_text(feature, "arealdekkeniva1")
        if municipality:
            municipalities[municipality] += 1
        if source_class:
            classes[source_class] += 1
        crs = _feature_crs(feature)
        if crs:
            crs_values[crs] += 1

    return {
        "path": str(path),
        "fileSizeBytes": path.stat().st_size,
        "featureCount": feature_count,
        "municipalities": dict(sorted(municipalities.items())),
        "arealdekkeNiva1": dict(sorted(classes.items())),
        "crs": dict(sorted(crs_values.items())),
    }


def prepare_balance_from_gml(
    input_path: Path,
    municipality_number: str,
    output_path: Path,
    *,
    rules: Level0Rules = GRUNNKART_LEVEL0_RULES,
    dataset_version: str = "grunnkart-2025",
) -> PreparedAccountBalance:
    totals: Counter[str] = Counter()
    unmapped: Counter[str] = Counter()
    unexpected_municipalities: Counter[str] = Counter()
    feature_count = 0
    source_area_m2 = 0.0

    for feature in _iter_features(input_path):
        feature_count += 1
        municipality = _required_text(feature, "kommunenummer")
        if municipality != municipality_number:
            unexpected_municipalities[municipality] += 1
            continue

        source_class = _required_text(feature, rules.source_field)
        area_m2 = _feature_area_m2(feature)
        if area_m2 < 0:
            raise GmlPreparationError("Geometrien ga negativt areal")
        source_area_m2 += area_m2

        target = rules.mapping.get(source_class)
        if target is None:
            unmapped[source_class] += area_m2
        else:
            totals[target] += area_m2

    if feature_count == 0:
        raise GmlPreparationError("Fant ingen GrunnkartFlate-objekter i GML-filen")
    if unexpected_municipalities:
        details = ", ".join(
            f"{number}: {count} objekter"
            for number, count in sorted(unexpected_municipalities.items())
        )
        raise GmlPreparationError(
            f"Kommuneleveransen inneholder andre kommuner enn {municipality_number}: "
            f"{details}"
        )
    if unmapped:
        details = ", ".join(
            f"{key}: {value:.2f} m²" for key, value in sorted(unmapped.items())
        )
        raise GmlPreparationError(
            f"Ukjente Arealdekke nivå 1-klasser blokkerer resultatet: {details}"
        )

    classified_area = sum(totals[id] for id in ACCOUNT_CATEGORY_IDS)
    excluded_area = totals["excluded"]
    reconciled_area = classified_area + excluded_area
    tolerance_m2 = max(1.0, source_area_m2 * 1e-10)
    if abs(reconciled_area - source_area_m2) > tolerance_m2:
        raise GmlPreparationError(
            "Rekonsiliering feilet: klassifisert + ekskludert areal "
            "er ikke lik geometriberegnet kildeareal"
        )

    result = PreparedAccountBalance(
        municipality_number=municipality_number,
        period="2025",
        dataset_version=dataset_version,
        source_file=input_path.name,
        geo_parquet_version=None,
        method_version=rules.version,
        method_status=rules.status,
        calculated_at=datetime.now(UTC).isoformat(),
        metrics=[
            PreparedMetric(id=id, area_m2=totals[id]) for id in ACCOUNT_CATEGORY_IDS
        ],
        reconciliation=Reconciliation(
            classified_area_m2=classified_area,
            excluded_area_m2=excluded_area,
            unmapped_area_m2=0,
        ),
        warnings=[
            "Areal er beregnet direkte fra GML-geometri i metrisk ETRS89 / UTM.",
            "Hav er eksplisitt ekskludert fra Level0-balansen i prototype-regelsettet.",
        ],
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(result.model_dump_json(by_alias=True, indent=2) + "\n")
    return result


def _iter_features(path: Path) -> Iterable[ET.Element]:
    for event, element in ET.iterparse(path, events=("end",)):
        if event == "end" and _local_name(element.tag).lower() == "grunnkartflate":
            yield element
            element.clear()


def _required_text(feature: ET.Element, name: str) -> str:
    value = _descendant_text(feature, name)
    if not value:
        raise GmlPreparationError(f"Mangler påkrevd egenskap {name}")
    return value


def _descendant_text(feature: ET.Element, name: str) -> str | None:
    wanted = name.lower()
    for element in feature.iter():
        if _local_name(element.tag).lower() == wanted:
            value = (element.text or "").strip()
            if value:
                return value
    return None


def _feature_crs(feature: ET.Element) -> str | None:
    for element in feature.iter():
        value = element.attrib.get("srsName")
        if value:
            return value
    return None


def _feature_area_m2(feature: ET.Element) -> float:
    crs = _feature_crs(feature)
    if not crs:
        raise GmlPreparationError("GML-geometrien mangler srsName")
    epsg = crs.rstrip("/").split("/")[-1].split(":")[-1]
    if epsg not in SUPPORTED_METRIC_EPSG:
        raise GmlPreparationError(
            f"Ustøttet CRS {crs}. Areal beregnes bare fra metrisk EPSG:25832/25833."
        )

    polygons = [
        element
        for element in feature.iter()
        if _local_name(element.tag).lower() == "polygon"
    ]
    if not polygons:
        polygons = [
            element
            for element in feature.iter()
            if _local_name(element.tag).lower() == "polygonpatch"
        ]
    if not polygons:
        raise GmlPreparationError("Fant ingen polygongeometri i GrunnkartFlate")

    return sum(_polygon_area(polygon) for polygon in polygons)


def _polygon_area(polygon: ET.Element) -> float:
    exterior = _first_descendant(polygon, {"exterior", "outerboundaryis"})
    if exterior is None:
        raise GmlPreparationError("Polygon mangler ytterringsgeometri")
    area = _ring_area(_ring_points(exterior))

    for element in polygon.iter():
        if _local_name(element.tag).lower() in {"interior", "innerboundaryis"}:
            area -= _ring_area(_ring_points(element))

    if area < -1e-6:
        raise GmlPreparationError("Polygonhull er større enn ytterringen")
    return max(area, 0.0)


def _first_descendant(
    element: ET.Element,
    local_names: set[str],
) -> ET.Element | None:
    for child in element.iter():
        if _local_name(child.tag).lower() in local_names:
            return child
    return None


def _ring_points(container: ET.Element) -> list[tuple[float, float]]:
    pos_list = _first_descendant(container, {"poslist"})
    if pos_list is not None and (pos_list.text or "").strip():
        values = [float(value) for value in (pos_list.text or "").split()]
        dimension = int(pos_list.attrib.get("srsDimension", "2"))
        if dimension < 2 or len(values) % dimension:
            raise GmlPreparationError("Ugyldig gml:posList")
        return [
            (values[index], values[index + 1])
            for index in range(0, len(values), dimension)
        ]

    positions = [
        child
        for child in container.iter()
        if _local_name(child.tag).lower() == "pos"
    ]
    if positions:
        points: list[tuple[float, float]] = []
        for position in positions:
            values = [float(value) for value in (position.text or "").split()]
            if len(values) < 2:
                raise GmlPreparationError("Ugyldig gml:pos")
            points.append((values[0], values[1]))
        return points

    coordinates = _first_descendant(container, {"coordinates"})
    if coordinates is not None and (coordinates.text or "").strip():
        points = []
        for pair in (coordinates.text or "").split():
            parts = pair.split(",")
            if len(parts) < 2:
                raise GmlPreparationError("Ugyldig gml:coordinates")
            points.append((float(parts[0]), float(parts[1])))
        return points

    raise GmlPreparationError("Fant ingen koordinater i polygonringen")


def _ring_area(points: list[tuple[float, float]]) -> float:
    if len(points) < 3:
        raise GmlPreparationError("Polygonring har færre enn tre punkter")
    if points[0] != points[-1]:
        points = [*points, points[0]]
    signed = sum(
        x1 * y2 - x2 * y1
        for (x1, y1), (x2, y2) in zip(points, points[1:], strict=True)
    )
    return abs(signed) / 2


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]
