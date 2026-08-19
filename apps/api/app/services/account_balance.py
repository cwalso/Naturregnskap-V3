import os
from pathlib import Path

from app.domain.accounting_rules import ACCOUNT_CATEGORY_IDS
from app.models.account import (
    AccountOverview,
    AccountOverviewMetric,
    PreparedAccountBalance,
)

PERIOD = "2025"


def data_root() -> Path:
    configured_root = os.environ.get("NATURREGNSKAP_DATA_ROOT")
    if configured_root:
        return Path(configured_root)

    repo_root = Path(__file__).resolve().parents[4]
    return repo_root / ".data"


def source_path(municipality_number: str, root: Path | None = None) -> Path:
    return (
        (root or data_root())
        / "grunnkart"
        / PERIOD
        / "source"
        / (f"grunnkart_{municipality_number}.parquet")
    )


def prepared_path(municipality_number: str, root: Path | None = None) -> Path:
    return (
        (root or data_root())
        / "grunnkart"
        / PERIOD
        / "prepared"
        / (f"{municipality_number}.json")
    )


class PreparedAccountBalanceProvider:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root

    def get(self, municipality_number: str, municipality_name: str) -> AccountOverview:
        path = prepared_path(municipality_number, self.root)
        if not path.is_file():
            return AccountOverview(
                municipality_number=municipality_number,
                municipality_name=municipality_name,
                status="not_available",
                metrics=[
                    AccountOverviewMetric(id=id, area_km2=None)
                    for id in ACCOUNT_CATEGORY_IDS
                ],
            )
        prepared = PreparedAccountBalance.model_validate_json(path.read_text())
        if (
            prepared.municipality_number != municipality_number
            or prepared.reconciliation.unmapped_area_m2 > 1e-6
        ):
            return AccountOverview(
                municipality_number=municipality_number,
                municipality_name=municipality_name,
                status="not_available",
                metrics=[
                    AccountOverviewMetric(id=id, area_km2=None)
                    for id in ACCOUNT_CATEGORY_IDS
                ],
                warnings=[
                    "Prepared-resultatet er ufullstendig eller gjelder en annen "
                    "kommune."
                ],
            )
        areas = {metric.id: metric.area_m2 / 1_000_000 for metric in prepared.metrics}
        return AccountOverview(
            municipality_number=municipality_number,
            municipality_name=municipality_name,
            status="available",
            metrics=[
                AccountOverviewMetric(id=id, area_km2=areas[id])
                for id in ACCOUNT_CATEGORY_IDS
            ],
            method_version=prepared.method_version,
            method_status=prepared.method_status,
            source_versions=[prepared.dataset_version],
            warnings=prepared.warnings,
        )
