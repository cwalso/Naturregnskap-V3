import json
from urllib.parse import parse_qs

import httpx
from fastapi.testclient import TestClient

from app.adapters.kartverket.municipalities import KartverketMunicipalitiesAdapter
from app.adapters.miljodirektoratet.thematic import MiljodirektoratetThematicAdapter
from app.api.municipalities import get_municipalities_adapter, get_thematic_adapter
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

def test_thematic_coverage_evaluates_real_feature_sources() -> None:
    municipality_transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={
                "kommunenummer": "5001",
                "kommunenavn": "Trondheim",
                "omrade": {
                    "type": "Polygon",
                    "coordinates": [[
                        [10.0, 63.0],
                        [11.0, 63.0],
                        [11.0, 64.0],
                        [10.0, 63.0],
                    ]],
                },
            },
        )
    )
    municipality_adapter = adapter_with(municipality_transport)

    seen_requests: list[httpx.Request] = []

    def thematic_handler(request: httpx.Request) -> httpx.Response:
        seen_requests.append(request)
        if "/vern/MapServer/0/query" in str(request.url):
            return httpx.Response(200, json={"count": 2})
        if "/villrein/MapServer/1/query" in str(request.url):
            return httpx.Response(200, json={"count": 0})
        return httpx.Response(404)

    thematic_client = httpx.AsyncClient(transport=httpx.MockTransport(thematic_handler))
    thematic_adapter = MiljodirektoratetThematicAdapter(thematic_client)

    app.dependency_overrides[get_municipalities_adapter] = lambda: municipality_adapter
    app.dependency_overrides[get_thematic_adapter] = lambda: thematic_adapter
    try:
        response = TestClient(app).get("/api/municipalities/5001/thematic-coverage")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "municipalityNumber": "5001",
        "municipalityName": "Trondheim",
        "methodVersion": "thematic-intersection-v1",
        "warnings": [
            "Treffstatus er beregnet mot løpende kildetjenester som ikke er "
            "låst til en dataversjon i prototypen."
        ],
        "results": [
            {
                "datasetId": "protected-areas",
                "status": "hit",
                "featureCount": 2,
                "note": (
                    "Ett eller flere registrerte objekter i kilden "
                    "krysser kommunegrensen."
                ),
            },
            {
                "datasetId": "wild-reindeer-areas",
                "status": "no_hit",
                "featureCount": 0,
                "note": (
                    "Spørringen fant ingen registrerte objekter som krysser "
                    "kommunegrensen. Datasettet har regional dekning, så statusen "
                    "skal ikke tolkes som en generell vurdering av temaet."
                ),
            },
        ],
    }
    assert len(seen_requests) == 2
    for request in seen_requests:
        body = request.content.decode()
        assert "returnCountOnly=true" in body
        assert "geometryType=esriGeometryPolygon" in body
        assert "spatialRel=esriSpatialRelIntersects" in body


def test_thematic_coverage_preserves_source_failure_as_unavailable() -> None:
    municipality_transport = httpx.MockTransport(
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
    municipality_adapter = adapter_with(municipality_transport)

    def thematic_handler(request: httpx.Request) -> httpx.Response:
        if "/vern/MapServer/0/query" in str(request.url):
            return httpx.Response(503)
        return httpx.Response(200, json={"count": 0})

    thematic_adapter = MiljodirektoratetThematicAdapter(
        httpx.AsyncClient(transport=httpx.MockTransport(thematic_handler))
    )

    app.dependency_overrides[get_municipalities_adapter] = lambda: municipality_adapter
    app.dependency_overrides[get_thematic_adapter] = lambda: thematic_adapter
    try:
        response = TestClient(app).get("/api/municipalities/5001/thematic-coverage")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    results = {item["datasetId"]: item for item in response.json()["results"]}
    assert results["protected-areas"]["status"] == "unavailable"
    assert results["protected-areas"]["featureCount"] is None
    assert results["wild-reindeer-areas"]["status"] == "no_hit"

def test_thematic_query_normalizes_multipolygon_to_esri_rings() -> None:
    municipality_transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={
                "kommunenummer": "5001",
                "kommunenavn": "Trondheim",
                "omrade": {
                    "type": "MultiPolygon",
                    "coordinates": [
                        [[
                            [10.0, 63.0],
                            [11.0, 63.0],
                            [11.0, 64.0],
                            [10.0, 63.0],
                        ]],
                        [[
                            [12.0, 63.0],
                            [13.0, 63.0],
                            [13.0, 64.0],
                            [12.0, 63.0],
                        ]],
                    ],
                },
            },
        )
    )
    municipality_adapter = adapter_with(municipality_transport)

    posted_geometries: list[dict] = []

    def thematic_handler(request: httpx.Request) -> httpx.Response:
        form = parse_qs(request.content.decode())
        posted_geometries.append(json.loads(form["geometry"][0]))
        return httpx.Response(200, json={"count": 0})

    thematic_adapter = MiljodirektoratetThematicAdapter(
        httpx.AsyncClient(transport=httpx.MockTransport(thematic_handler))
    )

    app.dependency_overrides[get_municipalities_adapter] = lambda: municipality_adapter
    app.dependency_overrides[get_thematic_adapter] = lambda: thematic_adapter
    try:
        response = TestClient(app).get("/api/municipalities/5001/thematic-coverage")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert len(posted_geometries) == 2
    for geometry in posted_geometries:
        assert geometry["spatialReference"] == {"wkid": 4326}
        assert len(geometry["rings"]) == 2
        for ring in geometry["rings"]:
            assert ring[0] == ring[-1]

