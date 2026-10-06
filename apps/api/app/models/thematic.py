from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return "".join([first, *[part.title() for part in rest]])


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


ThematicDatasetId = Literal[
    "protected-areas",
    "wild-reindeer-areas",
    "valued-nature",
    "infrastructure-free-nature",
]
ThematicEvaluationStatus = Literal["hit", "no_hit", "unavailable"]
MappingCoverageStatus = Literal["present", "none", "unavailable"]


class ThematicMappingCoverage(CamelModel):
    status: MappingCoverageStatus
    feature_count: int | None = Field(default=None, ge=0)
    from_year: int | None = Field(default=None, ge=1900, le=2200)
    to_year: int | None = Field(default=None, ge=1900, le=2200)
    note: str


class ThematicDatasetEvaluation(CamelModel):
    dataset_id: ThematicDatasetId
    status: ThematicEvaluationStatus
    feature_count: int | None = Field(default=None, ge=0)
    note: str
    mapping_coverage: ThematicMappingCoverage | None = None


class ThematicCoverageResponse(CamelModel):
    municipality_number: str = Field(pattern=r"^\d{4}$")
    municipality_name: str
    method_version: Literal["thematic-intersection-v1"] = "thematic-intersection-v1"
    warnings: list[str] = Field(default_factory=list)
    results: list[ThematicDatasetEvaluation]
