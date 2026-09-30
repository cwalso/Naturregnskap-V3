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
from app.domain.accounting_rules import ACCOUNT_CATEGORY_IDS, GRUNNKART_LEVEL0_RULES
from app.main import app
from app.models.municipality import Municipality
from app.services.account_balance import (
    PreparedAccountBalanceProvider,
    prepared_path,
    source_path,
)


def parquet(
    path: Path,
    municipalities: list[str],
    classes: list[str],
    areas: list[float],
    ecosystem_classes: list[str] | None = None,
) -> Path:
    table = pa.table(
        {
            "kommunenummer": municipalities,
            "arealdekkeniva1": classes,
            "arealdekkeniva2": ["ikke-et-arealfelt"] * len(areas),
            "arealbruklandhovedklasse": ["tekst"] * len(areas),
            "okosystemtypeniva1": ecosystem_classes or ["skog"] * len(areas),
            "SHAPE_Area": areas,
            "geometry": [b"unused"] * len(areas),
        }
    )
    pq.write_table(table, path, row_group_size=2)
    return path


def test_paths_are_generic(tmp_path: Path) -> None:
    assert source_path("4204", tmp_path).name == "grunnkart_4204.parquet"
    assert prepared_path("0301", tmp_path).name == "0301.json"


def test_verified_level_zero_mapping_is_exact_and_case_sensitive() -> None:
    assert GRUNNKART_LEVEL0_RULES.source_field == "okosystemtypeniva1"
    assert GRUNNKART_LEVEL0_RULES.mapping == {
        "bebygdOpparbeidetAreal": "built",
        "dyrketmark": "agriculture",
        "grasmark": "agriculture",
        "skog": "nature",
        "heiBuskmark": "nature",
        "liteVegetertMark": "nature",
        "vatmark": "nature",
        "elverBekkerKanaler": "nature",
        "innsjoerVannmagasiner": "nature",
        "kyststrenderSvabergDyner": "nature",
        "hav": "excluded",
    }


def test_inspector_reports_metadata_and_relevant_values(tmp_path: Path) -> None:
    path = parquet(tmp_path / "source.parquet", ["4204"], ["skog"], [10])
    report = inspect_parquet(path)
    assert report["rowCount"] == 1
    assert report["rowGroups"] == 1
    assert report["distinctValues"]["kommunenummer"] == ["4204"]
    assert report["distinctValues"]["arealdekkeniva1"] == ["skog"]
    assert report["distinctValues"]["okosystemtypeniva1"] == ["skog"]
    assert report["areaFields"] == ["SHAPE_Area"]


def test_prepare_sums_explicit_classes_and_writes_provenance(tmp_path: Path) -> None:
    path = parquet(
        tmp_path / "source.parquet",
        ["4204"] * 11,
        ["unused"] * 11,
        [
            30_000,
            120_000,
            80_000,
            400_000,
            60_000,
            40_000,
            100_000,
            50_000,
            50_000,
            100_000,
            5_000,
        ],
        [
            "bebygdOpparbeidetAreal",
            "dyrketmark",
            "grasmark",
            "skog",
            "heiBuskmark",
            "liteVegetertMark",
            "vatmark",
            "elverBekkerKanaler",
            "innsjoerVannmagasiner",
            "kyststrenderSvabergDyner",
            "hav",
        ],
    )
    output = tmp_path / "prepared.json"
    result = prepare_balance(path, "4204", output, area_field="SHAPE_Area")
    assert [metric.id for metric in result.metrics] == list(ACCOUNT_CATEGORY_IDS)
    assert [metric.area_m2 for metric in result.metrics] == [800_000, 200_000, 30_000]
    assert result.reconciliation.excluded_area_m2 == 5_000
    assert result.method_version == "level0-v0.3-prototype"
    assert result.method_status == GRUNNKART_LEVEL0_RULES.status
    assert result.source_format == "geoparquet"
    assert result.source_feature_count == 11
    assert result.area_method == "source-field:SHAPE_Area"
    assert result.source_sha256 is not None
    assert len(result.source_sha256) == 64
    assert json.loads(output.read_text())["municipalityNumber"] == "4204"


def test_prepare_rejects_multiple_municipalities(tmp_path: Path) -> None:
    path = parquet(
        tmp_path / "source.parquet",
        ["4204", "0301"],
        ["unused", "unused"],
        [1, 1],
        ["skog", "skog"],
    )
    with pytest.raises(PreparationError, match="Forventet bare kommune"):
        prepare_balance(path, "4204", tmp_path / "out.json", area_field="SHAPE_Area")


def test_unmapped_class_blocks_output(tmp_path: Path) -> None:
    path = parquet(
        tmp_path / "source.parquet",
        ["4204"],
        ["unused"],
        [50],
        ["ukjentOkosystemklasse"],
    )
    output = tmp_path / "out.json"
    with pytest.raises(PreparationError, match="Ukjente kildeklasser"):
        prepare_balance(path, "4204", output, area_field="SHAPE_Area")
    assert not output.exists()


def test_arealdekke_is_not_used_for_level_zero(tmp_path: Path) -> None:
    path = parquet(
        tmp_path / "source.parquet",
        ["4204"],
        ["Ukjent arealdekke"],
        [50],
        ["skog"],
    )
    result = prepare_balance(
        path,
        "4204",
        tmp_path / "out.json",
        area_field="SHAPE_Area",
    )
    assert result.metrics[0].area_m2 == 50


def test_level0_shares_use_land_and_freshwater_balance_as_denominator(
    tmp_path: Path,
) -> None:
    path = parquet(
        tmp_path / "source.parquet",
        ["4204"] * 4,
        ["unused"] * 4,
        [600_000, 200_000, 200_000, 250_000],
        ["skog", "dyrketmark", "bebygdOpparbeidetAreal", "hav"],
    )
    prepare_balance(
        path,
        "4204",
        prepared_path("4204", tmp_path),
        area_field="SHAPE_Area",
    )
    result = PreparedAccountBalanceProvider(tmp_path).get("4204", "Kristiansand")
    shares = {metric.id: metric.share_percent for metric in result.metrics}

    assert shares == {
        "nature": 60.0,
        "agriculture": 20.0,
        "built": 20.0,
    }
    assert result.classified_area_km2 == 1.0
    assert result.excluded_area_km2 == 0.25
    assert sum(value for value in shares.values() if value is not None) == 100.0


def test_provider_available_and_not_available(tmp_path: Path) -> None:
    path = parquet(
        tmp_path / "source.parquet",
        ["4204"],
        ["unused"],
        [2_000_000],
        ["skog"],
    )
    prepare_balance(
        path, "4204", prepared_path("4204", tmp_path), area_field="SHAPE_Area"
    )
    provider = PreparedAccountBalanceProvider(tmp_path)
    available = provider.get("4204", "Kristiansand")
    missing = provider.get("0301", "Oslo")
    assert available.status == "available"
    assert available.metrics[0].area_km2 == 2
    assert available.metrics[0].share_percent == 100
    assert available.classified_area_km2 == 2
    assert available.excluded_area_km2 == 0
    assert available.source_format == "geoparquet"
    assert available.source_feature_count == 1
    assert available.area_method == "source-field:SHAPE_Area"
    assert available.source_sha256 is not None
    assert missing.status == "not_available"
    assert all(metric.area_km2 is None for metric in missing.metrics)


def test_provider_rejects_prepared_balance_from_superseded_method(
    tmp_path: Path,
) -> None:
    path = parquet(
        tmp_path / "source.parquet",
        ["4204"],
        ["unused"],
        [2_000_000],
        ["skog"],
    )
    prepared = prepare_balance(
        path,
        "4204",
        prepared_path("4204", tmp_path),
        area_field="SHAPE_Area",
    )
    payload = prepared.model_dump(by_alias=True)
    payload["methodVersion"] = "level0-v0.1-prototype"
    prepared_path("4204", tmp_path).write_text(json.dumps(payload))

    result = PreparedAccountBalanceProvider(tmp_path).get(
        "4204",
        "Kristiansand",
    )

    assert result.status == "not_available"
    assert all(metric.area_km2 is None for metric in result.metrics)
    assert result.warnings
    assert "utgått metodeversjon" in result.warnings[0]


def test_api_returns_missing_as_expected_state(tmp_path: Path) -> None:
    class Adapter(KartverketMunicipalitiesAdapter):
        async def get_municipality(self, municipality_number: str) -> Municipality:
            return Municipality(number=municipality_number, name="Testkommune")

    app.dependency_overrides[get_municipalities_adapter] = lambda: Adapter()
    app.dependency_overrides[get_account_provider] = lambda: (
        PreparedAccountBalanceProvider(tmp_path)
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


def test_default_data_root_is_repo_relative(monkeypatch, tmp_path: Path) -> None:
    from app.services.account_balance import data_root

    monkeypatch.delenv("NATURREGNSKAP_DATA_ROOT", raising=False)
    monkeypatch.chdir(tmp_path)

    root = data_root()

    assert root.name == ".data"
    assert root.parent.name == "Naturregnskap-V3"


def test_data_root_can_be_overridden_by_environment(
    monkeypatch, tmp_path: Path
) -> None:
    from app.services.account_balance import data_root

    custom_root = tmp_path / "custom-data"
    monkeypatch.setenv("NATURREGNSKAP_DATA_ROOT", str(custom_root))

    assert data_root() == custom_root
