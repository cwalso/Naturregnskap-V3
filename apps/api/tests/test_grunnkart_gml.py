from pathlib import Path

import pytest

from app.analysis.grunnkart_gml import (
    GmlPreparationError,
    inspect_gml,
    prepare_balance_from_gml,
)


def write_gml(
    path: Path,
    features: list[tuple[str, str, list[tuple[float, float]]]],
) -> None:
    members = []
    for index, (municipality, source_class, points) in enumerate(features):
        coordinates = " ".join(f"{x} {y}" for x, y in points)
        members.append(
            f"""
            <gml:featureMember>
              <ga:GrunnkartFlate gml:id="f{index}">
                <ga:kommunenummer>{municipality}</ga:kommunenummer>
                <ga:okosystemtypeniva1>{source_class}</ga:okosystemtypeniva1>
                <ga:område>
                  <gml:Polygon srsName="urn:ogc:def:crs:EPSG::25832">
                    <gml:exterior>
                      <gml:LinearRing>
                        <gml:posList>{coordinates}</gml:posList>
                      </gml:LinearRing>
                    </gml:exterior>
                  </gml:Polygon>
                </ga:område>
              </ga:GrunnkartFlate>
            </gml:featureMember>
            """
        )
    path.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
        <gml:FeatureCollection
          xmlns:gml="http://www.opengis.net/gml/3.2"
          xmlns:ga="https://example.test/grunnkart">
        """
        + "".join(members)
        + "</gml:FeatureCollection>"
    )


def square(x: float, y: float, size: float) -> list[tuple[float, float]]:
    return [
        (x, y),
        (x + size, y),
        (x + size, y + size),
        (x, y + size),
        (x, y),
    ]


def test_prepare_gml_level0_uses_all_2025_level1_classes(tmp_path: Path) -> None:
    source = tmp_path / "5001.gml"
    output = tmp_path / "5001.json"
    classes = [
        "bebygdOpparbeidetAreal",
        "dyrketmark",
        "grasmark",
        "skog",
        "heiBuskmark",
        "liteVegetertMark",
        "vatmark",
        "elverBekkerKanaler",
        "innsjoerVannmagasiner",
        "kyststrenderSvabergDyner",
        "hav",
    ]
    write_gml(
        source,
        [
            ("5001", source_class, square(index * 20, 0, 10))
            for index, source_class in enumerate(classes)
        ],
    )

    report = inspect_gml(source)
    assert report["featureCount"] == 11
    assert report["sourceField"] == "okosystemtypeniva1"
    assert set(report["sourceClasses"]) == set(classes)

    result = prepare_balance_from_gml(source, "5001", output)
    metrics = {metric.id: metric.area_m2 for metric in result.metrics}

    assert metrics == {
        "nature": 700.0,
        "agriculture": 200.0,
        "built": 100.0,
    }
    assert result.reconciliation.classified_area_m2 == 1000.0
    assert result.reconciliation.excluded_area_m2 == 100.0
    assert result.reconciliation.unmapped_area_m2 == 0
    assert result.method_version == "level0-v0.3-prototype"
    assert result.source_format == "gml"
    assert result.source_feature_count == 11
    assert result.area_method == "geometry:shoelace:metric-crs"
    assert result.source_sha256 is not None
    assert len(result.source_sha256) == 64
    assert output.exists()


def test_prepare_gml_blocks_unknown_level1_class(tmp_path: Path) -> None:
    source = tmp_path / "5001.gml"
    write_gml(source, [("5001", "nyUkjentKlasse", square(0, 0, 10))])

    with pytest.raises(GmlPreparationError, match="Ukjente okosystemtypeniva1-klasser"):
        prepare_balance_from_gml(source, "5001", tmp_path / "result.json")


def test_prepare_gml_subtracts_polygon_holes(tmp_path: Path) -> None:
    source = tmp_path / "5001.gml"
    source.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
        <gml:FeatureCollection
          xmlns:gml="http://www.opengis.net/gml/3.2"
          xmlns:ga="https://example.test/grunnkart">
          <gml:featureMember>
            <ga:GrunnkartFlate gml:id="f1">
              <ga:kommunenummer>5001</ga:kommunenummer>
              <ga:okosystemtypeniva1>skog</ga:okosystemtypeniva1>
              <ga:område>
                <gml:Polygon srsName="urn:ogc:def:crs:EPSG::25832">
                  <gml:exterior>
                    <gml:LinearRing>
                      <gml:posList>0 0 10 0 10 10 0 10 0 0</gml:posList>
                    </gml:LinearRing>
                  </gml:exterior>
                  <gml:interior>
                    <gml:LinearRing>
                      <gml:posList>2 2 4 2 4 4 2 4 2 2</gml:posList>
                    </gml:LinearRing>
                  </gml:interior>
                </gml:Polygon>
              </ga:område>
            </ga:GrunnkartFlate>
          </gml:featureMember>
        </gml:FeatureCollection>
        """
    )

    result = prepare_balance_from_gml(
        source,
        "5001",
        tmp_path / "result.json",
    )

    metrics = {metric.id: metric.area_m2 for metric in result.metrics}
    assert metrics["nature"] == 96.0
    assert result.reconciliation.classified_area_m2 == 96.0


def test_prepare_gml_rejects_non_metric_crs(tmp_path: Path) -> None:
    source = tmp_path / "5001.gml"
    source.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
        <gml:FeatureCollection
          xmlns:gml="http://www.opengis.net/gml/3.2"
          xmlns:ga="https://example.test/grunnkart">
          <gml:featureMember>
            <ga:GrunnkartFlate gml:id="f1">
              <ga:kommunenummer>5001</ga:kommunenummer>
              <ga:okosystemtypeniva1>skog</ga:okosystemtypeniva1>
              <ga:område>
                <gml:Polygon srsName="urn:ogc:def:crs:EPSG::4258">
                  <gml:exterior>
                    <gml:LinearRing>
                      <gml:posList>10 63 11 63 11 64 10 63</gml:posList>
                    </gml:LinearRing>
                  </gml:exterior>
                </gml:Polygon>
              </ga:område>
            </ga:GrunnkartFlate>
          </gml:featureMember>
        </gml:FeatureCollection>
        """
    )

    with pytest.raises(GmlPreparationError, match="Ustøttet CRS"):
        prepare_balance_from_gml(source, "5001", tmp_path / "result.json")
