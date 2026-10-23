"""Local direct-geodata diagnostic. No application imports, downloads or publication."""
import argparse
import csv
import hashlib
import json
import time
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

import fiona
import numpy as np
from pyproj import CRS, Transformer
from shapely import box, transform, union_all
from shapely.geometry import mapping, shape

REPO = Path(__file__).resolve().parents[5]
EXPECTED_MASK = 'c2282443c935dc02485b7bb380d4395147012f0d562f4b1c28f365534a15a46f'
CLASS_VALUES = {'skog', 'heiBuskmark', 'liteVegetertMark', 'vatmark', 'kyststrenderSvabergDyner',
                'bebygdOpparbeidetAreal', 'dyrketmark', 'grasmark', 'elverBekkerKanaler',
                'innsjoerVannmagasiner', 'hav', 'bukterKilerTidevannsonen'}


class PilotBlocked(ValueError):
    pass


def private_path(path):
    path = Path(path).resolve()
    if path == REPO or REPO in path.parents:
        raise PilotBlocked('Dataset/config/output must be outside the public repository')
    return path


def file_hash(path):
    path = Path(path)
    if path.is_dir():
        # Directory-backed FGDB: canonical relative names and content hashes.
        records = [(p.relative_to(path).as_posix(), file_hash(p)) for p in sorted(path.rglob('*')) if p.is_file()]
        return hashlib.sha256(json.dumps(records, separators=(',', ':')).encode()).hexdigest()
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024*1024), b''):
            h.update(block)
    return h.hexdigest()


def verify_manifest(config, dataset):
    if config.get('source_kind') not in {'official_2025', 'synthetic_fixture'}:
        raise PilotBlocked('Explicit official_2025 or synthetic_fixture source kind is required')
    if config.get('product') != 'Nasjonalt grunnkart for arealanalyse' or config.get('year') != 2025:
        raise PilotBlocked('A documented Grunnkart annual version 2025 is required')
    for key in ['version_evidence', 'rights_evidence', 'classification_evidence']:
        if not isinstance(config.get(key), str) or not config[key].strip():
            raise PilotBlocked(f'Missing {key}; a boolean alone does not verify the source/rights')
    if config.get('year_verified') is not True or config.get('local_analysis_permitted') is not True:
        raise PilotBlocked('Verified annual version and local-analysis permission are required')
    if config.get('municipality') != '5001':
        raise PilotBlocked('This pilot is scoped to Trondheim 5001')
    if config.get('data_sha256') != file_hash(dataset):
        raise PilotBlocked('Dataset hash differs from the verified local manifest')
    if not config.get('layer') or not config.get('documented_crs'):
        raise PilotBlocked('Actual layer and documented source CRS are required')
    fields = config.get('fields', {})
    for field in ['level1', 'municipality', 'object_id']:
        if not fields.get(field):
            raise PilotBlocked(f'An observed physical field is required: {field}')
    values = config.get('class_values', {})
    if not values or any(v not in CLASS_VALUES for v in values.values()):
        raise PilotBlocked('Explicit documented physical value → official level-1 mapping is required')
    groups = config.get('level0_groups', {})
    if groups and (config.get('level0_mapping_approved') is not True or not config.get('level0_mapping_evidence')):
        raise PilotBlocked('Level-0 mapping needs explicit faglig approval/evidence')
    if any(k not in CLASS_VALUES or v not in {'nature', 'agriculture', 'built', 'water', 'other'} for k, v in groups.items()):
        raise PilotBlocked('Invalid explicit level-0 mapping')
    if groups and set(groups) != set(values.values()):
        raise PilotBlocked('Level-0 mapping must cover every explicitly mapped level-1 class')


def row_geometry(array, extent, value):
    step_x = (extent[2]-extent[0])/array.shape[1]
    step_y = (extent[3]-extent[1])/array.shape[0]
    rectangles = []
    for row, selected in enumerate(array == value):
        transitions = np.diff(np.r_[False, selected, False].astype(np.int8))
        for start, end in zip(np.flatnonzero(transitions == 1), np.flatnonzero(transitions == -1), strict=True):
            rectangles.append(box(extent[0]+start*step_x, extent[3]-(row+1)*step_y,
                                  extent[0]+end*step_x, extent[3]-row*step_y))
    geometry = union_all(rectangles)
    pixel_area = np.count_nonzero(array == value)*step_x*step_y
    # Numerical floating-point check only; no snapping, buffer, repair or area redistribution.
    if not np.isclose(geometry.area, pixel_area, rtol=1e-12, atol=1e-6):
        raise PilotBlocked('Independent pixel-count vs row-union area check failed')
    return geometry


def load_reference(archive, result_path):
    result = json.loads(Path(result_path).read_text())
    with zipfile.ZipFile(archive) as z:
        inputs = json.loads(z.read('inputs.json'))
        raw = z.read('parent-mask.bin')
        fine = z.read('result-mask.bin')
    if hashlib.sha256(raw).hexdigest() != EXPECTED_MASK or result['provenance']['maskHash'] != EXPECTED_MASK:
        raise PilotBlocked('Stored plan-mask SHA differs; no new plan source is allowed')
    if hashlib.sha256(fine).hexdigest() != result['provenance']['classificationHash']:
        raise PilotBlocked('Stored production classification SHA differs')
    parent = inputs['parent']
    a = np.frombuffer(raw, np.uint8).reshape(parent['height'], parent['width'])
    if not set(np.unique(a)).issubset({0, 1, 2}):
        raise PilotBlocked('Unexpected stored support codes')
    factor = result['provenance']['areaFactor']
    if factor != 0.9994795815751638:
        raise PilotBlocked('Reference area correction differs')
    support = {name: row_geometry(a, parent['extent'], value) for name, value in [('nature', 1), ('agriculture', 2)]}
    for name, geometry in support.items():
        if not np.isclose(geometry.area*factor/1000, result[name+'Daa'], rtol=1e-12, atol=1e-9):
            raise PilotBlocked('Reference support total differs')
    grid = result['grid']
    cells = np.frombuffer(fine, np.uint8).reshape(grid['height'], grid['width'])
    old_classes = {r['id']: row_geometry(cells, grid['extent'], r['code']) for r in result['categories']}
    for r in result['categories']:
        if np.count_nonzero(cells == r['code']) != r['cells']:
            raise PilotBlocked('Reference category count differs')
    return support, old_classes, result


def partition_features(features, support):
    """Disjoint classes plus explicit cross-class conflict and uncovered area."""
    by_class = defaultdict(list)
    trace = []
    invalid = []
    for row in features:
        geometry = row['geometry']
        if geometry is None or geometry.is_empty or geometry.geom_type not in {'Polygon', 'MultiPolygon'} or not geometry.is_valid:
            invalid.append(row['object_id'])
            continue
        overlap = geometry.intersection(support)
        if overlap.area == 0:
            continue
        by_class[row['class']].append(overlap)
        trace.append(dict(objectId=row['object_id'], sourceClass=row['class'], rawClass=row.get('raw_class'),
                          municipality=row.get('municipality'), sourceAreaM2=geometry.area,
                          insideMaskM2=overlap.area, outsideMaskM2=geometry.difference(support).area))
    unions = {key: union_all(values) for key, values in by_class.items()}
    conflicts = []
    keys = sorted(unions)
    for i, key in enumerate(keys):
        for other in keys[i+1:]:
            conflicts.append(unions[key].intersection(unions[other]))
    conflict = union_all(conflicts)
    coverage = union_all(list(unions.values()))
    exclusive = {key: geometry.difference(conflict) for key, geometry in unions.items()}
    missing = support.difference(coverage)
    count_sum = sum(g.area for g in exclusive.values()) + conflict.area + missing.area
    if not np.isclose(count_sum, support.area, rtol=1e-12, atol=1e-6):
        raise PilotBlocked('Areal conservation failed; no tolerance redistribution is applied')
    return dict(exclusive=exclusive, conflict=conflict, missing=missing, coverage=coverage,
                trace=trace, invalid=invalid,
                same_class_duplicate_area_m2={key: sum(g.area for g in by_class[key])-unions[key].area for key in keys})


def inspect_dataset(dataset, output, layer=None):
    dataset, output = private_path(dataset), private_path(output)
    output.mkdir(parents=True, exist_ok=True)
    records = []
    for name in [layer] if layer else fiona.listlayers(dataset):
        with fiona.open(dataset, layer=name) as src:
            counts = {key: Counter() for key in src.schema['properties']}
            null_geometry, invalid, features = 0, 0, 0
            for feature in src:
                features += 1
                if feature.geometry is None:
                    null_geometry += 1
                else:
                    geometry = shape(feature.geometry)
                    invalid += int(geometry.is_empty or not geometry.is_valid or geometry.geom_type not in {'Polygon', 'MultiPolygon'})
                for key, value in feature.properties.items():
                    # Exhaustive frequency tables are private; no object data goes to GitHub.
                    counts[key][str(value) if value is not None else '__NULL__'] += 1
            records.append(dict(layer=name, driver=src.driver, crsWkt=src.crs_wkt,
                                bounds=list(src.bounds), schema=src.schema, features=features,
                                nullGeometry=null_geometry, invalidOrNonPolygonGeometry=invalid,
                                values={key: dict(values) for key, values in counts.items()}))
    inventory = dict(dataSha256=file_hash(dataset), layers=records,
                     note='Observed private inventory; no annual-version or usage-right inference')
    (output/'inventory.json').write_text(json.dumps(inventory, indent=2)+'\n')
    return inventory


def read_features(dataset, config, support_bounds):
    fields = config['fields']
    with fiona.open(dataset, layer=config['layer']) as src:
        actual_crs = CRS.from_user_input(src.crs_wkt or src.crs)
        if actual_crs != CRS.from_user_input(config['documented_crs']):
            raise PilotBlocked('Actual file CRS differs from documented manifest CRS')
        for name in fields.values():
            if name and name not in src.schema['properties']:
                raise PilotBlocked(f'Observed field does not exist in file: {name}')
        projection = Transformer.from_crs(actual_crs, 'EPSG:25833', always_xy=True)
        rows, candidates, null_geometry, invalid_global = [], 0, 0, 0
        values = {key: Counter() for key in fields if fields[key]}
        identifiers = Counter()
        for feature in src:
            attrs = feature.properties
            for key, name in fields.items():
                if name:
                    values[key][str(attrs[name]) if attrs[name] is not None else '__NULL__'] += 1
            object_id = attrs[fields['object_id']]
            identifier = str(object_id) if object_id is not None else '__NULL__'
            identifiers[identifier] += 1
            if feature.geometry is None:
                null_geometry += 1
                rows.append(dict(object_id=identifier, class_='__null_geometry__', geometry=None))
                continue
            geometry = transform(shape(feature.geometry), projection.transform, interleaved=False)
            invalid_geometry = geometry.is_empty or not geometry.is_valid or geometry.geom_type not in {'Polygon', 'MultiPolygon'}
            invalid_global += int(invalid_geometry)
            if geometry.is_empty or not np.isfinite(geometry.bounds).all():
                rows.append(dict(object_id=identifier, geometry=geometry))
                continue
            if not box(*support_bounds).intersects(box(*geometry.bounds)):
                continue
            candidates += 1
            raw = attrs[fields['level1']]
            municipality = attrs[fields['municipality']]
            label = config['class_values'].get(str(raw), '__unknown_class__') if raw is not None else '__missing_class__'
            if str(municipality) != config['municipality']:
                label = '__municipality_conflict__'
            rows.append(dict(object_id=identifier, geometry=geometry, raw_class=raw,
                             municipality=municipality, **{'class': label}))
        diagnostics = dict(driver=src.driver, crsWkt=actual_crs.to_wkt(), observedFields=src.schema['properties'],
                           featureCount=sum(identifiers.values()), candidateFeatures=candidates,
                           nullGeometry=null_geometry, invalidGeometryInFullLayer=invalid_global,
                           values={k: dict(v) for k, v in values.items()},
                           duplicateObjectIds={k: n for k, n in identifiers.items() if n > 1},
                           missingObjectIds=identifiers.get('__NULL__', 0))
    return rows, diagnostics


def run(dataset, manifest, archive, reference_result, output):
    dataset, manifest, output = private_path(dataset), private_path(manifest), private_path(output)
    config = json.loads(manifest.read_text())
    verify_manifest(config, dataset)
    support_parts, old_classes, reference = load_reference(archive, reference_result)
    support = union_all(list(support_parts.values()))
    start = time.perf_counter()
    features, inventory = read_features(dataset, config, support.bounds)
    partition = partition_features(features, support)
    if file_hash(dataset) != config['data_sha256']:
        raise PilotBlocked('Dataset changed during read; no result is written')
    factor = reference['provenance']['areaFactor']
    exclusive = partition['exclusive']
    matrix = {old: {**{new: g.intersection(old_g).area*factor/1000 for new, g in exclusive.items()},
                    '__uncovered__': partition['missing'].intersection(old_g).area*factor/1000,
                    '__cross_class_conflict__': partition['conflict'].intersection(old_g).area*factor/1000}
              for old, old_g in old_classes.items()}
    groups = config.get('level0_groups', {})
    grouped = {name: sum(g.area for k, g in exclusive.items() if groups.get(k) == name)*factor/1000
               for name in sorted(set(groups.values()))} if groups and set(exclusive).issubset(groups) else None
    quality_failures = []
    if partition['invalid']:
        quality_failures.append('invalid/empty/nonpolygon/null geometries; valid-part diagnostics only')
    if inventory['duplicateObjectIds'] or inventory['missingObjectIds']:
        quality_failures.append('object ID uniqueness/completeness unresolved')
    if partition['conflict'].area > 0:
        quality_failures.append('cross-class overlap withheld, not assigned by precedence')
    if partition['missing'].area > 0:
        quality_failures.append('uncovered support; classified coverage is incomplete')
    if any(key.startswith('__') for key in exclusive):
        quality_failures.append('unknown/missing classification or municipality conflict withheld')
    summary = dict(status='diagnostic_only', sourceKind=config['source_kind'], productionMethodChanged=False, municipality='5001',
                   sourceYear=2025, dataSha256=config['data_sha256'], maskSha256=EXPECTED_MASK,
                   areaFactor=factor, supportMeaning='Stored plan × prototype level-0 Nature/Agriculture, not full legal plan polygons',
                   source=inventory, elapsedSeconds=time.perf_counter()-start,
                   qualityFailures=quality_failures, invalidObjectIds=partition['invalid'],
                   areasDaa={k: g.area*factor/1000 for k, g in exclusive.items()},
                   uncoveredDaa=partition['missing'].area*factor/1000,
                   crossClassConflictDaa=partition['conflict'].area*factor/1000,
                   sameClassDuplicateAreaDaa={k: v*factor/1000 for k, v in partition['same_class_duplicate_area_m2'].items()},
                   level0TotalsDaa=grouped,
                   level0DifferenceFromReferenceDaa={name: grouped[name]-reference[name+'Daa'] for name in ['nature', 'agriculture'] if name in grouped} if grouped else None,
                   level0Note='Known exclusive area only, not a complete total if gaps/conflicts/invalid geometry remain; no level-0 totals without approved complete mapping',
                   reference={'natureDaa': reference['natureDaa'], 'agricultureDaa': reference['agricultureDaa'],
                              'unclassifiedNatureDaa': reference['classification']['unclassifiedDaa']},
                   conservationErrorM2=sum(g.area for g in exclusive.values())+partition['missing'].area+partition['conflict'].area-support.area,
                   comparisonMatrixDaa=matrix)
    output.mkdir(parents=True, exist_ok=True)
    (output/'result.json').write_text(json.dumps(summary, indent=2)+'\n')
    with (output/'source-overlap.csv').open('w', newline='') as stream:
        fieldnames = ['objectId', 'sourceClass', 'rawClass', 'municipality', 'sourceAreaM2', 'insideMaskM2', 'outsideMaskM2']
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(partition['trace'])
    # Geographic results always stay local; this tool has no publication command.
    geographic = {**exclusive, '__uncovered__': partition['missing'], '__cross_class_conflict__': partition['conflict']}
    geographic_features = [{'type': 'Feature', 'properties': {'method': 'direct_diagnostic', 'category': k}, 'geometry': mapping(g)} for k, g in geographic.items()]
    geographic_features.extend({'type': 'Feature', 'properties': {'method': 'stored_reference', 'category': k}, 'geometry': mapping(g)} for k, g in old_classes.items())
    (output/'diagnostic.geojson').write_text(json.dumps({'type': 'FeatureCollection',
        'crs': {'type': 'name', 'properties': {'name': 'EPSG:25833'}},
        'features': geographic_features})+'\n')
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    inspect = sub.add_parser('inspect')
    inspect.add_argument('--data', required=True, type=Path)
    inspect.add_argument('--output', required=True, type=Path)
    inspect.add_argument('--layer')
    execute = sub.add_parser('run')
    for argument in ['data', 'manifest', 'reference', 'reference-result', 'output']:
        execute.add_argument('--'+argument, required=True, type=Path)
    args = parser.parse_args()
    try:
        if args.command == 'inspect':
            result = inspect_dataset(args.data, args.output, args.layer)
            print(json.dumps({'status': 'private_inventory_written', 'layers': len(result['layers'])}))
        else:
            result = run(args.data, args.manifest, args.reference, args.reference_result, args.output)
            print(json.dumps({'status': result['status'], 'qualityFailures': result['qualityFailures'], 'sourceYear': 2025}))
    except (PilotBlocked, FileNotFoundError) as error:
        parser.exit(2, f'Pilot blocked: {error}\n')


if __name__ == '__main__':
    main()
