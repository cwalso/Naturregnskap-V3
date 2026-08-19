import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.adapters.kartverket.municipalities import KartverketMunicipalitiesAdapter
from app.analysis.synthetic_changes import (
    DATASET,
    PURPOSE,
    prepare_synthetic_changes,
)
from app.api.municipalities import get_changes_provider, get_municipalities_adapter
from app.domain.changes import aggregate_transition_areas
from app.main import app
from app.models.municipality import Municipality
from app.services.changes import PreparedChangesProvider, prepared_change_paths


def fixture_path() -> Path:
    return (
        Path(__file__).resolve().parents[3] / "samples/changes/synthetic/5054.geojson"
    )


def prepare(root: Path) -> None:
    summary, features = prepared_change_paths("5054", root)
    prepare_synthetic_changes(fixture_path(), summary, features, "5054")


def test_aggregation_of_change_features() -> None:
    result = aggregate_transition_areas(
        [("nature", "built", 10), ("nature", "built", 15), ("agriculture", "built", 7)]
    )
    assert result == {("nature", "built"): 25, ("agriculture", "built"): 7}
    with pytest.raises(ValueError, match="utledet"):
        aggregate_transition_areas([(None, "built", 1)])


def test_preparation_uses_geometry_for_summary_and_marks_synthetic_source(
    tmp_path: Path,
) -> None:
    summary_path, features_path = prepared_change_paths("5054", tmp_path)
    summary, features = prepare_synthetic_changes(
        fixture_path(), summary_path, features_path, "5054"
    )
    assert summary.source.dataset == DATASET
    assert summary.source.purpose == PURPOSE
    assert summary.provenance.method_status == PURPOSE
    assert summary.total_area_m2 == 28_000
    assert summary.total_area_m2 == sum(feature.area_m2 for feature in features)
    assert {
        (item.from_level0, item.to_level0, item.area_m2) for item in summary.transitions
    } == {
        ("nature", "built", 10_000),
        ("agriculture", "built", 12_000),
        ("nature", "agriculture", 6_000),
    }
    assert all(feature.transition.from_source_class is None for feature in features)
    prepared_features = json.loads(features_path.read_text())
    assert prepared_features["generationId"] == summary.generation_id
    assert prepared_features["features"][0]["geometryCrs"] == "EPSG:25833"


def test_provider_rejects_mixed_preparation_generations(
    tmp_path: Path,
) -> None:
    run_a = tmp_path / "run-a"
    run_b = tmp_path / "run-b"
    mixed = tmp_path / "mixed"

    prepare(run_a)
    prepare(run_b)

    summary_a, _ = prepared_change_paths("5054", run_a)
    _, features_b = prepared_change_paths("5054", run_b)
    mixed_summary, mixed_features = prepared_change_paths("5054", mixed)

    mixed_summary.parent.mkdir(parents=True, exist_ok=True)
    mixed_summary.write_text(summary_a.read_text())
    mixed_features.write_text(features_b.read_text())

    summary_generation = json.loads(mixed_summary.read_text())["generationId"]
    features_generation = json.loads(mixed_features.read_text())["generationId"]
    assert summary_generation != features_generation

    result = PreparedChangesProvider(mixed).get("5054", "Indre Fosen")

    assert result.status == "not_available"
    assert result.transitions == []
    assert result.features == []


def test_provider_returns_available_and_missing_without_false_zero(
    tmp_path: Path,
) -> None:
    prepare(tmp_path)
    provider = PreparedChangesProvider(tmp_path)
    available = provider.get("5054", "Indre Fosen")
    missing = provider.get("0301", "Oslo")
    assert available.status == "available"
    assert available.source and available.source.purpose == PURPOSE
    assert len(available.features) == 3
    assert missing.status == "not_available"
    assert missing.transitions == []
    assert missing.features == []


def test_api_change_model(tmp_path: Path) -> None:
    class Adapter(KartverketMunicipalitiesAdapter):
        async def get_municipality(self, municipality_number: str) -> Municipality:
            return Municipality(number=municipality_number, name="Indre Fosen")

    prepare(tmp_path)
    app.dependency_overrides[get_municipalities_adapter] = lambda: Adapter()
    app.dependency_overrides[get_changes_provider] = lambda: PreparedChangesProvider(
        tmp_path
    )
    try:
        response = TestClient(app).get("/api/municipalities/5054/changes")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "available"
    assert body["source"] == {
        "dataset": DATASET,
        "version": "v1",
        "purpose": PURPOSE,
    }
    assert sum(item["areaM2"] for item in body["transitions"]) == 28_000
    assert sum(item["areaM2"] for item in body["features"]) == 28_000
