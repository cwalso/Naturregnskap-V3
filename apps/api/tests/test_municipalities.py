import httpx
from fastapi.testclient import TestClient

from app.adapters.kartverket.municipalities import KartverketMunicipalitiesAdapter
from app.api.municipalities import get_municipalities_adapter
from app.main import app


def adapter_with(handler: httpx.MockTransport) -> KartverketMunicipalitiesAdapter:
    client = httpx.AsyncClient(base_url="https://kartverket.test", transport=handler)
    return KartverketMunicipalitiesAdapter(client)


def test_adapter_normalizes_and_sorts_municipalities() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json=[
                {"kommunenummer": "5001", "kommunenavnNorsk": "Trondheim"},
                {"kommunenummer": "0301", "kommunenavnNorsk": "Oslo"},
            ],
        )
    )
    adapter = adapter_with(transport)

    async def override() -> KartverketMunicipalitiesAdapter:
        return adapter

    app.dependency_overrides[get_municipalities_adapter] = override
    try:
        response = TestClient(app).get("/api/municipalities")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == [
        {"number": "0301", "name": "Oslo"},
        {"number": "5001", "name": "Trondheim"},
    ]


def test_boundary_endpoint_returns_normalized_geojson_feature() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={
                "kommunenummer": "5001",
                "kommunenavn": "Trondheim",
                "omrade": {
                    "type": "Polygon",
                    "coordinates": [[[10.0, 63.0], [11.0, 63.0], [10.0, 63.0]]],
                },
            },
        )
    )
    adapter = adapter_with(transport)
    app.dependency_overrides[get_municipalities_adapter] = lambda: adapter
    try:
        response = TestClient(app).get("/api/municipalities/5001/boundary")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["type"] == "Feature"
    assert response.json()["properties"] == {"number": "5001", "name": "Trondheim"}
    assert response.json()["geometry"]["type"] == "Polygon"


def test_upstream_failure_is_reported_as_bad_gateway() -> None:
    transport = httpx.MockTransport(lambda request: httpx.Response(503))
    adapter = adapter_with(transport)
    app.dependency_overrides[get_municipalities_adapter] = lambda: adapter
    try:
        response = TestClient(app).get("/api/municipalities")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 502
    assert response.json() == {"detail": "Kommunelisten er midlertidig utilgjengelig"}
