from typing import Any, Literal

from pydantic import BaseModel


class Municipality(BaseModel):
    number: str
    name: str


class MunicipalityBoundary(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict[str, Any]
    properties: Municipality
