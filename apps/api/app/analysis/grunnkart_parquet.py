import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pyarrow.compute as pc
import pyarrow.parquet as pq

from app.domain.accounting_rules import (
    ACCOUNT_CATEGORY_IDS,
    GRUNNKART_LEVEL0_RULES,
    Level0Rules,
)
from app.models.account import PreparedAccountBalance, PreparedMetric, Reconciliation

MUNICIPALITY_FIELDS = ("kommunenummer", "KOMMUNENUMMER", "municipalityNumber")
RELEVANT_FIELD_NAMES = {
    "kommunenummer",
    "arealdekkeniva1",
    "arealdekkeniva2",
    "arealdekkekode",
    "okosystemtypeniva1",
    "okosystemtypeniva2",
    "okosystemtypeniva3",
    "SHAPE_Area",
    "geometry",
}


class PreparationError(ValueError):
    pass


def inspect_parquet(path: Path) -> dict[str, Any]:
    parquet = pq.ParquetFile(path)
    names = parquet.schema_arrow.names
    municipality_field = next(
        (name for name in MUNICIPALITY_FIELDS if name in names), None
    )
    relevant = [name for name in names if name in RELEVANT_FIELD_NAMES]
    report: dict[str, Any] = {
        "path": str(path),
        "fileSizeBytes": path.stat().st_size,
        "rowCount": parquet.metadata.num_rows,
        "rowGroups": parquet.metadata.num_row_groups,
        "schema": str(parquet.schema_arrow),
        "columns": [
            {"name": field.name, "type": str(field.type)}
            for field in parquet.schema_arrow
        ],
        "identifiedFields": relevant,
        "municipalityField": municipality_field,
        "areaFields": [
            name for name in names if name == "SHAPE_Area" or "area" in name.lower()
        ],
        "geoParquetMetadata": _geo_metadata(parquet),
        "distinctValues": {},
        "nullCounts": _metadata_null_counts(parquet),
    }
    scan_fields = list(
        dict.fromkeys(
            ([municipality_field] if municipality_field else [])
            + [name for name in relevant if name != "geometry"]
        )
    )
    if scan_fields:
        table = parquet.read(columns=scan_fields)
        for name in scan_fields:
            column = table[name]
            if name in {
                municipality_field,
                "arealdekkeniva1",
                "arealdekkeniva2",
                "arealdekkekode",
                "okosystemtypeniva1",
                "okosystemtypeniva2",
                "okosystemtypeniva3",
            }:
                report["distinctValues"][name] = pc.unique(column).to_pylist()
    return report


def prepare_balance(
    input_path: Path,
    municipality_number: str,
    output_path: Path,
    *,
    area_field: str,
    municipality_field: str = "kommunenummer",
    rules: Level0Rules = GRUNNKART_LEVEL0_RULES,
    dataset_version: str = "grunnkart-2025",
) -> PreparedAccountBalance:
    parquet = pq.ParquetFile(input_path)
    required = {municipality_field, rules.source_field, area_field}
    missing = required.difference(parquet.schema_arrow.names)
    if missing:
        raise PreparationError(
            f"Påkrevde kolonner mangler: {', '.join(sorted(missing))}"
        )
    table = parquet.read(columns=list(required))
    municipalities = {
        str(value)
        for value in pc.unique(table[municipality_field]).to_pylist()
        if value is not None
    }
    if municipalities != {municipality_number}:
        raise PreparationError(
            "Forventet bare kommune "
            f"{municipality_number}, fant {sorted(municipalities)}"
        )
    if (
        table[municipality_field].null_count
        or table[rules.source_field].null_count
        or table[area_field].null_count
    ):
        raise PreparationError("Påkrevde analysekolonner inneholder nullverdier")

    totals: Counter[str] = Counter()
    unmapped: Counter[str] = Counter()
    for source_class, area in zip(
        table[rules.source_field].to_pylist(),
        table[area_field].to_pylist(),
        strict=True,
    ):
        numeric_area = float(area)
        if numeric_area < 0:
            raise PreparationError("Arealfeltet inneholder negativt areal")
        target = rules.mapping.get(str(source_class))
        if target is None:
            unmapped[str(source_class)] += numeric_area
        else:
            totals[target] += numeric_area
    if unmapped:
        details = ", ".join(
            f"{key}: {value} m²" for key, value in sorted(unmapped.items())
        )
        raise PreparationError(f"Ukjente kildeklasser blokkerer resultatet: {details}")

    result = PreparedAccountBalance(
        municipality_number=municipality_number,
        period="2025",
        dataset_version=dataset_version,
        source_file=input_path.name,
        source_schema_version=_schema_version(parquet),
        method_version=rules.version,
        method_status=rules.status,
        calculated_at=datetime.now(UTC).isoformat(),
        metrics=[
            PreparedMetric(id=id, area_m2=totals[id]) for id in ACCOUNT_CATEGORY_IDS
        ],
        reconciliation=Reconciliation(
            classified_area_m2=sum(totals[id] for id in ACCOUNT_CATEGORY_IDS),
            excluded_area_m2=totals["excluded"],
            unmapped_area_m2=0,
        ),
        warnings=[f"Areal er summert fra kildefeltet {area_field}, tolket som m²."],
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(result.model_dump_json(by_alias=True, indent=2) + "\n")
    return result


def _geo_metadata(parquet: pq.ParquetFile) -> dict[str, Any] | None:
    metadata = parquet.schema_arrow.metadata or {}
    value = metadata.get(b"geo")
    if not value:
        return None
    try:
        return json.loads(value)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {"raw": value.decode(errors="replace")}


def _schema_version(parquet: pq.ParquetFile) -> str | None:
    geo = _geo_metadata(parquet)
    return str(geo.get("version")) if geo and geo.get("version") else None


def _metadata_null_counts(parquet: pq.ParquetFile) -> dict[str, int | None]:
    counts: dict[str, int | None] = {}
    for column_index, name in enumerate(parquet.schema_arrow.names):
        values = []
        for row_group_index in range(parquet.metadata.num_row_groups):
            statistics = (
                parquet.metadata.row_group(row_group_index)
                .column(column_index)
                .statistics
            )
            values.append(statistics.null_count if statistics else None)
        counts[name] = (
            sum(values) if all(value is not None for value in values) else None
        )
    return counts
