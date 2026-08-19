import json
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import pytest
from fastapi.testclient import TestClient

from app.adapters.kartverket.municipalities import KartverketMunicipalitiesAdapter
from app.analysis.grunnkart_parquet import (
    PreparationError,
    inspect_parquet,
    prepare_balance,
)
from app.api.municipalities import get_account_provider, get_municipalities_adapter
from app.domain.accounting_rules import ACCOUNT_CATEGORY_IDS
from app.main import app
from app.models.municipality import Municipality
from app.services.account_balance import (
    PreparedAccountBalanceProvider,
    prepared_path,
    source_path,
)


def parquet(
    path: Path, municipalities: list[str], classes: list[str], areas: list[float]
) -> Path:
    table = pa.table(
        {
            "kommunenummer": municipalities,
            "arealdekkeniva1": classes,
            "SHAPE_Area": areas,
            "geometry": [b"unused"] * len(areas),
        }
    )
    pq.write_table(table, path, row_group_size=2)
    return path


def test_paths_are_generic(tmp_path: Path) -> None:
    assert source_path("4204", tmp_path).name == "grunnkart_4204.parquet"
    assert prepared_path("0301", tmp_path).name == "0301.json"


def test_inspector_reports_metadata_and_relevant_values(tmp_path: Path) -> None:
    path = parquet(tmp_path / "source.parquet", ["4204"], ["Skog"], [10])
    report = inspect_parquet(path)
    assert report["rowCount"] == 1
    assert report["rowGroups"] == 1
    assert report["distinctValues"]["kommunenummer"] == ["4204"]
    assert report["distinctValues"]["arealdekkeniva1"] == ["Skog"]
    assert "SHAPE_Area" in report["areaFields"]


def test_prepare_sums_explicit_classes_and_writes_provenance(tmp_path: Path) -> None:
    path = parquet(
        tmp_path / "source.parquet",
        ["4204"] * 4,
        ["Skog", "Dyrket mark", "Bebygd og opparbeidet areal", "Hav"],
        [1_000_000, 200_000, 30_000, 5_000],
    )
    output = tmp_path / "prepared.json"
    result = prepare_balance(path, "4204", output, area_field="SHAPE_Area")
    assert [metric.id for metric in result.metrics] == list(ACCOUNT_CATEGORY_IDS)
    assert [metric.area_m2 for metric in result.metrics] == [1_000_000, 200_000, 30_000]
    assert result.reconciliation.excluded_area_m2 == 5_000
    assert result.method_version == "level0-v0.1-prototype"
    assert json.loads(output.read_text())["municipalityNumber"] == "4204"


def test_prepare_rejects_multiple_municipalities(tmp_path: Path) -> None:
    path = parquet(
        tmp_path / "source.parquet", ["4204", "0301"], ["Skog", "Skog"], [1, 1]
    )
    with pytest.raises(PreparationError, match="Forventet bare kommune"):
        prepare_balance(path, "4204", tmp_path / "out.json", area_field="SHAPE_Area")


def test_unmapped_class_blocks_output(tmp_path: Path) -> None:
    path = parquet(tmp_path / "source.parquet", ["4204"], ["Ukjent"], [50])
    output = tmp_path / "out.json"
    with pytest.raises(PreparationError, match="Ukjente kildeklasser"):
        prepare_balance(path, "4204", output, area_field="SHAPE_Area")
    assert not output.exists()


def test_provider_available_and_not_available(tmp_path: Path) -> None:
    path = parquet(tmp_path / "source.parquet", ["4204"], ["Skog"], [2_000_000])
    prepare_balance(
        path, "4204", prepared_path("4204", tmp_path), area_field="SHAPE_Area"
    )
    provider = PreparedAccountBalanceProvider(tmp_path)
    available = provider.get("4204", "Kristiansand")
    missing = provider.get("0301", "Oslo")
    assert available.status == "available"
    assert available.metrics[0].area_km2 == 2
    assert available.metrics[0].share_percent is None
    assert missing.status == "not_available"
    assert all(metric.area_km2 is None for metric in missing.metrics)


def test_api_returns_missing_as_expected_state(tmp_path: Path) -> None:
    class Adapter(KartverketMunicipalitiesAdapter):
        async def get_municipality(self, municipality_number: str) -> Municipality:
            return Municipality(number=municipality_number, name="Testkommune")

    app.dependency_overrides[get_municipalities_adapter] = lambda: Adapter()
    app.dependency_overrides[get_account_provider] = (
        lambda: PreparedAccountBalanceProvider(tmp_path)
    )
    try:
        response = TestClient(app).get("/api/municipalities/4204/account-overview")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "not_available"
    assert [metric["id"] for metric in body["metrics"]] == list(ACCOUNT_CATEGORY_IDS)
    assert all(
        metric["areaKm2"] is None and metric["sharePercent"] is None
        for metric in body["metrics"]
    )
