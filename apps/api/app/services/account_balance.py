import os
from pathlib import Path

from app.domain.accounting_rules import (
    ACCOUNT_CATEGORY_IDS,
    GRUNNKART_LEVEL0_RULES,
)
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
            or prepared.method_version != GRUNNKART_LEVEL0_RULES.version
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
                    (
                        "Prepared-resultatet er ufullstendig, gjelder en annen "
                        "kommune eller er beregnet med en utgått metodeversjon."
                    )
                ],
            )
        areas_m2 = {metric.id: metric.area_m2 for metric in prepared.metrics}
        return AccountOverview(
            municipality_number=municipality_number,
            municipality_name=municipality_name,
            status="available",
            metrics=[
                AccountOverviewMetric(
                    id=id,
                    area_km2=areas_m2[id] / 1_000_000,
                    # Prosent/andel publiseres ikke før nevneren er metodisk
                    # bekreftet. Feltet beholdes i kontrakten for senere bruk.
                    share_percent=None,
                )
                for id in ACCOUNT_CATEGORY_IDS
            ],
            method_version=prepared.method_version,
            method_status=prepared.method_status,
            source_versions=[prepared.dataset_version],
            source_sha256=prepared.source_sha256,
            source_format=prepared.source_format,
            source_feature_count=prepared.source_feature_count,
            area_method=prepared.area_method,
            classified_area_km2=(
                prepared.reconciliation.classified_area_m2 / 1_000_000
            ),
            excluded_area_km2=(
                prepared.reconciliation.excluded_area_m2 / 1_000_000
            ),
            warnings=prepared.warnings,
        )
