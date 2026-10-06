import asyncio
from dataclasses import dataclass
from typing import Literal

from app.adapters.miljodirektoratet.thematic import (
    MiljodirektoratetThematicAdapter,
    ThematicUpstreamError,
)
from app.models.municipality import MunicipalityBoundary
from app.models.thematic import (
    ThematicCoverageResponse,
    ThematicDatasetEvaluation,
    ThematicDatasetId,
)


@dataclass(frozen=True)
class ThematicAnalysisDataset:
    id: ThematicDatasetId
    query_url: str
    coverage_scope: Literal["nationwide", "regional", "partial"]


DATASETS: tuple[ThematicAnalysisDataset, ...] = (
    ThematicAnalysisDataset(
        id="protected-areas",
        query_url=(
            "https://kart.miljodirektoratet.no/arcgis/rest/services/"
            "vern/MapServer/0/query"
        ),
        coverage_scope="nationwide",
    ),
    ThematicAnalysisDataset(
        id="valued-nature",
        query_url=(
            "https://kart.miljodirektoratet.no/arcgis/rest/services/"
            "naturtyper_kuverdi/MapServer/0/query"
        ),
        coverage_scope="partial",
    ),
    ThematicAnalysisDataset(
        id="wild-reindeer-areas",
        query_url=(
            "https://kart.miljodirektoratet.no/arcgis/rest/services/"
            "villrein/MapServer/1/query"
        ),
        coverage_scope="regional",
    ),
)


class ThematicCoverageService:
    def __init__(self, adapter: MiljodirektoratetThematicAdapter) -> None:
        self._adapter = adapter

    async def evaluate(
        self,
        boundary: MunicipalityBoundary,
    ) -> ThematicCoverageResponse:
        results = await asyncio.gather(
            *(self._evaluate_dataset(dataset, boundary) for dataset in DATASETS)
        )
        return ThematicCoverageResponse(
            municipality_number=boundary.properties.number,
            municipality_name=boundary.properties.name,
            warnings=[
                "Treffstatus er beregnet mot løpende kildetjenester som ikke "
                "er låst til en dataversjon i prototypen."
            ],
            results=list(results),
        )

    async def _evaluate_dataset(
        self,
        dataset: ThematicAnalysisDataset,
        boundary: MunicipalityBoundary,
    ) -> ThematicDatasetEvaluation:
        try:
            count = await self._adapter.count_intersections(
                dataset.query_url,
                boundary,
            )
        except ThematicUpstreamError:
            return ThematicDatasetEvaluation(
                dataset_id=dataset.id,
                status="unavailable",
                feature_count=None,
                note=(
                    "Temadatatjenesten kunne ikke evalueres nå. "
                    "Dette skal ikke tolkes som manglende treff."
                ),
            )

        if count > 0:
            return ThematicDatasetEvaluation(
                dataset_id=dataset.id,
                status="hit",
                feature_count=count,
                note=(
                    "Ett eller flere registrerte objekter i kilden "
                    "krysser kommunegrensen."
                ),
            )

        if dataset.coverage_scope == "regional":
            note = (
                "Spørringen fant ingen registrerte objekter som krysser "
                "kommunegrensen. Datasettet har regional dekning, så statusen "
                "skal ikke tolkes som en generell vurdering av temaet."
            )
        elif dataset.coverage_scope == "partial":
            note = (
                "Spørringen fant ingen registrerte lokaliteter som krysser "
                "kommunegrensen. Datasettet er ikke heldekkende, så dette skal "
                "ikke tolkes som fravær av naturverdi."
            )
        else:
            note = (
                "Spørringen fant ingen registrerte objekter i kilden "
                "som krysser kommunegrensen."
            )

        return ThematicDatasetEvaluation(
            dataset_id=dataset.id,
            status="no_hit",
            feature_count=0,
            note=note,
        )
