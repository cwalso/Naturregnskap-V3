import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.domain.changes import aggregate_transition_areas
from app.models.change import (
    ChangeArea,
    ChangeFeature,
    ChangeProvenance,
    ChangeSource,
    ChangeTransition,
    PreparedChangeSummary,
)

DATASET = "synthetic-change-fixture"
PURPOSE = "architecture_test"
METHOD_VERSION = "synthetic-change-preparation-v0.1"


class ChangePreparationError(ValueError):
    pass


def polygon_area_m2(geometry: dict[str, Any]) -> float:
    if geometry.get("type") != "Polygon":
        raise ChangePreparationError("Fixture støtter bare Polygon")
    rings = geometry.get("coordinates")
    if not isinstance(rings, list) or not rings:
        raise ChangePreparationError("Polygon mangler koordinater")

    def ring_area(ring: list[list[float]]) -> float:
        if len(ring) < 4 or ring[0] != ring[-1]:
            raise ChangePreparationError("Polygonring må være lukket")
        return (
            abs(
                sum(
                    float(first[0]) * float(second[1])
                    - float(second[0]) * float(first[1])
                    for first, second in zip(ring, ring[1:], strict=False)
                )
            )
            / 2
        )

    return ring_area(rings[0]) - sum(ring_area(ring) for ring in rings[1:])


def prepare_synthetic_changes(
    input_path: Path,
    summary_path: Path,
    features_path: Path,
    municipality_number: str,
) -> tuple[PreparedChangeSummary, list[ChangeFeature]]:
    fixture = json.loads(input_path.read_text())
    if fixture.get("fixtureType") != PURPOSE:
        raise ChangePreparationError("Kilden er ikke merket architecture_test")
    if fixture.get("municipalityNumber") != municipality_number:
        raise ChangePreparationError("Fixture gjelder en annen kommune")
    source = ChangeSource.model_validate(fixture["source"])
    if source.dataset != DATASET or source.purpose != PURPOSE:
        raise ChangePreparationError("Ugyldig syntetisk source-status")
    period = str(fixture["period"])
    crs = str(fixture["geometryCrs"])
    calculated_at = datetime.now(UTC).isoformat()
    provenance = ChangeProvenance(
        method_version=METHOD_VERSION,
        method_status="architecture_test",
        calculated_at=calculated_at,
        warnings=["Syntetiske polygoner; representerer ikke observerte endringer."],
    )
    features: list[ChangeFeature] = []
    for item in fixture["features"]:
        properties = item["properties"]
        area_m2 = polygon_area_m2(item["geometry"])
        features.append(
            ChangeFeature(
                change_id=properties["changeId"],
                municipality_number=municipality_number,
                geometry=item["geometry"],
                geometry_crs=crs,
                area_m2=area_m2,
                period=period,
                source=source,
                transition=ChangeTransition.model_validate(properties["transition"]),
                provenance=provenance,
            )
        )
    totals = aggregate_transition_areas(
        [
            (
                feature.transition.from_level0,
                feature.transition.to_level0,
                feature.area_m2,
            )
            for feature in features
        ]
    )
    transitions = [
        ChangeArea(from_level0=before, to_level0=after, area_m2=area)
        for (before, after), area in sorted(totals.items())
    ]
    summary = PreparedChangeSummary(
        municipality_number=municipality_number,
        period=period,
        source=source,
        provenance=provenance,
        feature_count=len(features),
        total_area_m2=sum(feature.area_m2 for feature in features),
        transitions=transitions,
    )
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    features_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(summary.model_dump_json(by_alias=True, indent=2) + "\n")
    features_path.write_text(
        json.dumps(
            [feature.model_dump(by_alias=True) for feature in features],
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    return summary, features
