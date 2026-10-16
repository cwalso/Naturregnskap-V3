"""Synthetic analytic geometry checks. These are never real Grunnkart results."""
import importlib.util
import json
import zipfile
from pathlib import Path

import fiona
import pytest
from shapely import box
from shapely.geometry import Polygon, mapping

spec = importlib.util.spec_from_file_location('direct_pilot', Path(__file__).with_name('pilot.py'))
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)
REFERENCE = pilot.REPO/'docs/validation/2026-10-14-plan-area/reference-inputs.zip'
RESULT = pilot.REPO/'docs/validation/2026-10-14-plan-area/result.json'


def feature(geometry, category, object_id='synthetic-1'):
    return dict(geometry=geometry, **{'class': category}, object_id=object_id)


def test_exact_boundary_and_partial_overlap_preserve_area():
    support = box(0, 0, 10, 10)
    rows = [feature(box(-5, 0, 3.25, 10), 'skog', 'a'), feature(box(3.25, 0, 12, 10), 'vatmark', 'b')]
    r = pilot.partition_features(rows, support)
    assert r['exclusive']['skog'].area == 32.5
    assert r['exclusive']['vatmark'].area == 67.5
    assert r['missing'].area == r['conflict'].area == 0
    assert r['trace'][0]['outsideMaskM2'] == 50


def test_cross_class_overlap_is_withheld_from_both_classes():
    r = pilot.partition_features([feature(box(0, 0, 7, 10), 'skog'), feature(box(5, 0, 10, 10), 'vatmark', 'b')], box(0, 0, 10, 10))
    assert r['conflict'].area == 20
    assert r['exclusive']['skog'].area == 50
    assert r['exclusive']['vatmark'].area == 30
    assert r['missing'].area == 0


def test_holes_and_missing_class_are_distinct():
    donut = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)], holes=[[(2, 2), (4, 2), (4, 4), (2, 4)]])
    r = pilot.partition_features([feature(donut, '__missing_class__')], box(0, 0, 10, 10))
    assert r['missing'].area == 4
    assert r['exclusive']['__missing_class__'].area == 96


def test_same_class_duplicate_is_counted_once_and_reported():
    rows = [feature(box(0, 0, 10, 10), 'skog', 'a'), feature(box(0, 0, 10, 10), 'skog', 'b')]
    r = pilot.partition_features(rows, box(0, 0, 10, 10))
    assert r['exclusive']['skog'].area == 100
    assert r['same_class_duplicate_area_m2']['skog'] == 100
    assert r['conflict'].area == 0


def test_invalid_geometry_is_not_repaired_or_assigned():
    invalid = Polygon([(0, 0), (10, 10), (0, 10), (10, 0), (0, 0)])
    r = pilot.partition_features([feature(invalid, 'skog'), feature(None, 'vatmark', 'missing')], box(0, 0, 10, 10))
    assert r['invalid'] == ['synthetic-1', 'missing']
    assert r['missing'].area == 100
    assert not r['exclusive']


@pytest.fixture
def source(tmp_path):
    dataset = tmp_path/'synthetic.gpkg'
    schema = {'geometry': 'Polygon', 'properties': {'ecotype_x': 'str', 'comm_x': 'str', 'object_x': 'str'}}
    # Generated boxes cover the real reference extent; they are explicitly synthetic.
    bounds = [240496, 7009568, 294656, 7052896]
    with fiona.open(dataset, 'w', driver='GPKG', layer='synthetic_only', crs='EPSG:25833', schema=schema) as dst:
        dst.write({'geometry': mapping(box(*bounds)), 'properties': {'ecotype_x': 'F', 'comm_x': '5001', 'object_x': 'generated-box'}})
    config = {'source_kind': 'synthetic_fixture', 'product': 'Nasjonalt grunnkart for arealanalyse', 'year': 2025,
              'year_verified': True, 'version_evidence': 'synthetic test only, not annual source verification',
              'local_analysis_permitted': True, 'rights_evidence': 'test-created geometry, no Grunnkart rights asserted',
              'classification_evidence': 'test-created class symbol F=skog', 'municipality': '5001',
              'data_sha256': pilot.file_hash(dataset), 'layer': 'synthetic_only', 'documented_crs': 'EPSG:25833',
              'fields': {'level1': 'ecotype_x', 'municipality': 'comm_x', 'object_id': 'object_x'},
              'class_values': {'F': 'skog'}, 'level0_groups': {}}
    return dataset, config


@pytest.mark.parametrize('change', [{'year': 2024}, {'year_verified': False}, {'local_analysis_permitted': False},
                                    {'rights_evidence': ''}, {'version_evidence': ''}, {'classification_evidence': ''},
                                    {'data_sha256': 'wrong'}, {'fields': {}}, {'class_values': {'F': 'invented-class'}},
                                    {'level0_groups': {'skog': 'nature'}}])
def test_unverified_inputs_do_not_pass_gate(source, change):
    dataset, config = source
    config.update(change)
    with pytest.raises(pilot.PilotBlocked):
        pilot.verify_manifest(config, dataset)


def test_public_repository_cannot_hold_private_inputs_outputs():
    with pytest.raises(pilot.PilotBlocked):
        pilot.private_path(pilot.REPO/'docs/restricted.gpkg')


def test_reference_hash_and_geometric_totals():
    parts, classes, reference = pilot.load_reference(REFERENCE, RESULT)
    factor = reference['provenance']['areaFactor']
    assert parts['nature'].area*factor/1000 == pytest.approx(2788.8047212052934, abs=1e-8)
    assert parts['agriculture'].area*factor/1000 == pytest.approx(832.0784057494137, abs=1e-8)
    assert classes['unclassified-nature'].area*factor/1000 == pytest.approx(706.7074524100195, abs=1e-8)


def test_modified_plan_mask_is_rejected(tmp_path):
    corrupt = tmp_path/'corrupt.zip'
    with zipfile.ZipFile(REFERENCE) as src, zipfile.ZipFile(corrupt, 'w') as dst:
        for name in ['inputs.json', 'parent-mask.bin', 'result-mask.bin']:
            value = src.read(name)
            if name == 'parent-mask.bin':
                value = bytes([2])+value[1:]
            dst.writestr(name, value)
    with pytest.raises(pilot.PilotBlocked, match='SHA'):
        pilot.load_reference(corrupt, RESULT)


def test_file_inventory_and_full_pipeline_use_observed_names_without_level0(source, tmp_path):
    dataset, config = source
    inventory = pilot.inspect_dataset(dataset, tmp_path/'inventory')
    assert inventory['layers'][0]['schema']['properties']['ecotype_x'] == 'str'
    assert inventory['layers'][0]['values']['ecotype_x'] == {'F': 1}
    manifest = tmp_path/'manifest.json'
    manifest.write_text(json.dumps(config))
    r = pilot.run(dataset, manifest, REFERENCE, RESULT, tmp_path/'result')
    assert r['sourceKind'] == 'synthetic_fixture'
    assert r['level0TotalsDaa'] is None
    assert r['uncoveredDaa'] == r['crossClassConflictDaa'] == 0
    assert r['areasDaa']['skog'] == pytest.approx(r['reference']['natureDaa']+r['reference']['agricultureDaa'], abs=1e-8)
    assert r['comparisonMatrixDaa']['unclassified-nature']['skog'] == pytest.approx(706.7074524100195, abs=1e-8)
    for category, values in r['comparisonMatrixDaa'].items():
        old = next(c['areaDaa'] for c in json.loads(RESULT.read_text())['categories'] if c['id'] == category)
        assert sum(values.values()) == pytest.approx(old, abs=1e-8)
    assert (tmp_path/'result/source-overlap.csv').exists()
    assert (tmp_path/'result/diagnostic.geojson').exists()


def test_wrong_physical_field_and_crs_are_rejected(source):
    dataset, config = source
    config['fields']['level1'] = 'document_model_name_not_in_file'
    with pytest.raises(pilot.PilotBlocked, match='field'):
        pilot.read_features(dataset, config, (0, 0, 1, 1))
    config['documented_crs'] = 'EPSG:4326'
    with pytest.raises(pilot.PilotBlocked, match='CRS'):
        pilot.read_features(dataset, config, (0, 0, 1, 1))


def test_foreign_municipality_is_withheld(source):
    dataset, config = source
    config['municipality'] = '0301'
    rows, _ = pilot.read_features(dataset, config, (240496, 7009568, 294656, 7052896))
    assert rows[0]['class'] == '__municipality_conflict__'


def test_unknown_physical_value_is_not_fuzzily_assigned(source):
    dataset, config = source
    config['class_values'] = {'f': 'skog'}
    rows, _ = pilot.read_features(dataset, config, (240496, 7009568, 294656, 7052896))
    assert rows[0]['class'] == '__unknown_class__'


def test_documented_alternative_crs_is_transformed(tmp_path):
    dataset = tmp_path/'synthetic-lonlat.gpkg'
    source_geometry = box(10.3, 63.3, 10.5, 63.5)
    schema = {'geometry': 'Polygon', 'properties': {'e': 'str', 'c': 'str', 'id': 'str'}}
    with fiona.open(dataset, 'w', driver='GPKG', layer='synthetic', crs='EPSG:4326', schema=schema) as dst:
        dst.write({'geometry': mapping(source_geometry), 'properties': {'e': 'F', 'c': '5001', 'id': 'synthetic'}})
    config = {'documented_crs': 'EPSG:4326', 'layer': 'synthetic', 'municipality': '5001',
              'fields': {'level1': 'e', 'municipality': 'c', 'object_id': 'id'}, 'class_values': {'F': 'skog'}}
    rows, _ = pilot.read_features(dataset, config, (240496, 7009568, 294656, 7052896))
    assert len(rows) == 1
    geometry = rows[0]['geometry']
    assert geometry.is_valid
    assert 260000 < geometry.centroid.x < 275000
    assert 7020000 < geometry.centroid.y < 7060000
    assert geometry.area > 1000000
