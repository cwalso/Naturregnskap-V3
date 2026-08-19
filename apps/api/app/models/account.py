from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.accounting_rules import AccountCategory


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return "".join([first, *[part.title() for part in rest]])


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PreparedMetric(CamelModel):
    id: AccountCategory
    area_m2: float = Field(ge=0)


class Reconciliation(CamelModel):
    classified_area_m2: float = Field(ge=0)
    excluded_area_m2: float = Field(ge=0)
    unmapped_area_m2: float = Field(ge=0)


class PreparedAccountBalance(CamelModel):
    municipality_number: str = Field(pattern=r"^\d{4}$")
    period: Literal["2025"]
    dataset_version: str
    source_file: str
    source_schema_version: str | None = None
    method_version: str
    method_status: Literal["prototype"]
    calculated_at: str
    metrics: list[PreparedMetric]
    reconciliation: Reconciliation
    warnings: list[str]


class AccountOverviewMetric(CamelModel):
    id: AccountCategory
    area_km2: float | None
    share_percent: None = None


class AccountOverview(CamelModel):
    municipality_number: str
    municipality_name: str
    period: Literal["2025"] = "2025"
    status: Literal["available", "not_available"]
    metrics: list[AccountOverviewMetric]
    method_version: str | None = None
    method_status: str | None = None
    source_versions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
