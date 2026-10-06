import json
from typing import Any

import httpx

from app.models.municipality import MunicipalityBoundary

TIMEOUT_SECONDS = 10.0


class ThematicUpstreamError(Exception):
    """Miljødirektoratets feature-tjeneste kunne ikke evalueres pålitelig."""


class MiljodirektoratetThematicAdapter:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def count_intersections(
        self,
        query_url: str,
        boundary: MunicipalityBoundary,
    ) -> int:
        geometry = self._to_esri_polygon(boundary.geometry)
        payload = {
            "f": "json",
            "where": "1=1",
            "geometry": json.dumps(geometry, separators=(",", ":")),
            "geometryType": "esriGeometryPolygon",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "returnCountOnly": "true",
        }

        try:
            if self._client is not None:
                response = await self._client.post(
                    query_url,
                    data=payload,
                    timeout=TIMEOUT_SECONDS,
                )
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        query_url,
                        data=payload,
                        timeout=TIMEOUT_SECONDS,
                    )
            response.raise_for_status()
            data: Any = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise ThematicUpstreamError(
                "Temadatatjenesten kunne ikke nås"
            ) from error

        if not isinstance(data, dict) or "count" not in data:
            raise ThematicUpstreamError("Ugyldig svar fra temadatatjenesten")
        try:
            count = int(data["count"])
        except (TypeError, ValueError) as error:
            raise ThematicUpstreamError(
                "Ugyldig antall fra temadatatjenesten"
            ) from error
        if count < 0:
            raise ThematicUpstreamError("Negativt antall fra temadatatjenesten")
        return count

    async def year_range(
        self,
        query_url: str,
        boundary: MunicipalityBoundary,
        field_name: str,
    ) -> tuple[int | None, int | None]:
        geometry = self._to_esri_polygon(boundary.geometry)
        statistics = [
            {
                "statisticType": "min",
                "onStatisticField": field_name,
                "outStatisticFieldName": "from_year",
            },
            {
                "statisticType": "max",
                "onStatisticField": field_name,
                "outStatisticFieldName": "to_year",
            },
        ]
        payload = {
            "f": "json",
            "where": "1=1",
            "geometry": json.dumps(geometry, separators=(",", ":")),
            "geometryType": "esriGeometryPolygon",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "returnGeometry": "false",
            "outStatistics": json.dumps(
                statistics,
                ensure_ascii=False,
                separators=(",", ":"),
            ),
        }

        try:
            if self._client is not None:
                response = await self._client.post(
                    query_url,
                    data=payload,
                    timeout=TIMEOUT_SECONDS,
                )
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        query_url,
                        data=payload,
                        timeout=TIMEOUT_SECONDS,
                    )
            response.raise_for_status()
            data: Any = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise ThematicUpstreamError(
                "Temadatatjenesten kunne ikke nås"
            ) from error

        try:
            features = data["features"]
            attributes = features[0]["attributes"] if features else {}
        except (KeyError, IndexError, TypeError) as error:
            raise ThematicUpstreamError(
                "Ugyldig statistikksvar fra temadatatjenesten"
            ) from error

        return (
            self._optional_year(attributes.get("from_year")),
            self._optional_year(attributes.get("to_year")),
        )

    @staticmethod
    def _optional_year(value: Any) -> int | None:
        if value is None:
            return None
        try:
            year = int(value)
        except (TypeError, ValueError) as error:
            raise ThematicUpstreamError(
                "Ugyldig årstall fra temadatatjenesten"
            ) from error
        if year < 1900 or year > 2200:
            raise ThematicUpstreamError(
                "Årstall fra temadatatjenesten er utenfor forventet intervall"
            )
        return year

    @classmethod
    def _to_esri_polygon(cls, geometry: dict[str, Any]) -> dict[str, Any]:
        geometry_type = geometry.get("type")
        coordinates = geometry.get("coordinates")

        if geometry_type == "Polygon" and isinstance(coordinates, list):
            polygons = [coordinates]
        elif geometry_type == "MultiPolygon" and isinstance(coordinates, list):
            polygons = [polygon for polygon in coordinates if isinstance(polygon, list)]
        else:
            raise ThematicUpstreamError("Kommunegeometrien er ikke et polygon")

        rings: list[list[list[float]]] = []
        for polygon in polygons:
            for index, ring in enumerate(polygon):
                if not isinstance(ring, list):
                    continue
                normalized = cls._normalize_ring(ring, clockwise=index == 0)
                rings.append(normalized)

        if not rings:
            raise ThematicUpstreamError("Kommunegeometrien mangler ringer")

        return {
            "rings": rings,
            "spatialReference": {"wkid": 4326},
        }

    @staticmethod
    def _normalize_ring(
        ring: list[Any],
        *,
        clockwise: bool,
    ) -> list[list[float]]:
        try:
            points = [[float(point[0]), float(point[1])] for point in ring]
        except (IndexError, TypeError, ValueError) as error:
            raise ThematicUpstreamError("Ugyldig ring i kommunegeometrien") from error

        if len(points) < 3:
            raise ThematicUpstreamError("For få punkter i kommunegeometrien")
        if points[0] != points[-1]:
            points.append(points[0].copy())

        signed_area = sum(
            points[index][0] * points[index + 1][1]
            - points[index + 1][0] * points[index][1]
            for index in range(len(points) - 1)
        ) / 2
        is_clockwise = signed_area < 0

        if is_clockwise != clockwise:
            points.reverse()
        return points
