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

    @staticmethod
    def _to_esri_polygon(geometry: dict[str, Any]) -> dict[str, Any]:
        geometry_type = geometry.get("type")
        coordinates = geometry.get("coordinates")

        if geometry_type == "Polygon" and isinstance(coordinates, list):
            rings = coordinates
        elif geometry_type == "MultiPolygon" and isinstance(coordinates, list):
            rings = [
                ring
                for polygon in coordinates
                if isinstance(polygon, list)
                for ring in polygon
                if isinstance(ring, list)
            ]
        else:
            raise ThematicUpstreamError("Kommunegeometrien er ikke et polygon")

        if not rings:
            raise ThematicUpstreamError("Kommunegeometrien mangler ringer")

        return {
            "rings": rings,
            "spatialReference": {"wkid": 4326},
        }
