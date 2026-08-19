from typing import Any

import httpx

from app.models.municipality import Municipality, MunicipalityBoundary

BASE_URL = "https://api.kartverket.no/kommuneinfo/v1"
TIMEOUT_SECONDS = 10.0


class MunicipalityUpstreamError(Exception):
    """Kartverket svarte ikke med data adapteren kan bruke."""


class KartverketMunicipalitiesAdapter:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def get_municipalities(self) -> list[Municipality]:
        data = await self._get_json("/kommuner")
        if not isinstance(data, list):
            raise MunicipalityUpstreamError("Ugyldig kommuneliste fra Kartverket")

        try:
            municipalities = [
                Municipality(
                    number=item["kommunenummer"], name=item["kommunenavnNorsk"]
                )
                for item in data
            ]
        except (KeyError, TypeError, ValueError) as error:
            raise MunicipalityUpstreamError(
                "Ugyldig kommuneoppføring fra Kartverket"
            ) from error
        return sorted(municipalities, key=lambda item: item.name.casefold())

    async def get_boundary(self, municipality_number: str) -> MunicipalityBoundary:
        data = await self._get_json(f"/kommuner/{municipality_number}/omrade")
        try:
            geometry = data["omrade"]
            if geometry.get("type") not in {"Polygon", "MultiPolygon"}:
                raise ValueError("Ugyldig geometritype")
            return MunicipalityBoundary(
                geometry=geometry,
                properties=Municipality(
                    number=data["kommunenummer"], name=data["kommunenavn"]
                ),
            )
        except (KeyError, TypeError, ValueError) as error:
            raise MunicipalityUpstreamError(
                "Ugyldig kommunegeometri fra Kartverket"
            ) from error

    async def get_municipality(self, municipality_number: str) -> Municipality:
        data = await self._get_json(f"/kommuner/{municipality_number}")
        try:
            return Municipality(
                number=data["kommunenummer"], name=data["kommunenavnNorsk"]
            )
        except (KeyError, TypeError, ValueError) as error:
            raise MunicipalityUpstreamError("Ugyldig kommune fra Kartverket") from error

    async def _get_json(self, path: str) -> Any:
        try:
            if self._client is not None:
                response = await self._client.get(path, timeout=TIMEOUT_SECONDS)
            else:
                async with httpx.AsyncClient(base_url=BASE_URL) as client:
                    response = await client.get(path, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise MunicipalityUpstreamError("Kartverket kunne ikke nås") from error
