from typing import Any, Literal

from pydantic import Field

from app.domain.changes import Level0
from app.models.account import CamelModel


class ChangeSource(CamelModel):
    dataset: str
    version: str
    purpose: str


class ChangeTransition(CamelModel):
    from_level0: Level0 | None
    to_level0: Level0
    from_source_class: str | None = None
    to_source_class: str | None = None


class ChangeProvenance(CamelModel):
    method_version: str
    method_status: str
    calculated_at: str
    warnings: list[str] = Field(default_factory=list)


class ChangeFeature(CamelModel):
    change_id: str
    municipality_number: str = Field(pattern=r"^\d{4}$")
    geometry: dict[str, Any]
    geometry_crs: str
    area_m2: float = Field(ge=0)
    period: str
    source: ChangeSource
    transition: ChangeTransition
    provenance: ChangeProvenance


class ChangeArea(CamelModel):
    from_level0: Level0
    to_level0: Level0
    area_m2: float = Field(ge=0)


class PreparedChangeSummary(CamelModel):
    municipality_number: str = Field(pattern=r"^\d{4}$")
    period: str
    source: ChangeSource
    provenance: ChangeProvenance
    feature_count: int = Field(ge=0)
    total_area_m2: float = Field(ge=0)
    transitions: list[ChangeArea]


class ChangeCollection(CamelModel):
    municipality_number: str
    municipality_name: str
    status: Literal["available", "not_available"]
    period: str | None = None
    source: ChangeSource | None = None
    provenance: ChangeProvenance | None = None
    transitions: list[ChangeArea] = Field(default_factory=list)
    features: list[ChangeFeature] = Field(default_factory=list)
