"""Stratified GetFeatureInfo checks; these are diagnostic samples, not area truth."""
import argparse
import json
import xml.etree.ElementTree as ET
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Hyphenated analysis filenames are loaded explicitly, outside the application.
import importlib.util
spec = importlib.util.spec_from_file_location('fetch_plan', Path(__file__).with_name('fetch-plan-nature.py'))
fetch_plan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch_plan)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('samples', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    # Query each coordinate once even when it belongs to several strata.
    points = {}
    for sample in json.loads(args.samples.read_text()):
        key = (sample['tile'], sample['i'], sample['j'])
        if key not in points:
            points[key] = dict(sample, strata=[])
        points[key]['strata'].append(sample['stratum'])

    def query(item):
        index, sample = item
        params = fetch_plan.parameters(sample['bbox'])
        params.pop('sld_body')
        params.update(request='GetFeatureInfo', query_layers='okosystemtype',
                      info_format='application/vnd.ogc.gml', feature_count='20',
                      i=str(sample['i']), j=str(sample['j']))
        record = fetch_plan.fetch(args.output, f'sample-{index}.gml', params)
        root = ET.fromstring((args.output / record['name']).read_bytes())
        features = root.findall('.//okosystemtype_feature')
        values = sorted(set(f.findtext('okosystemtypeniva1') for f in features))
        code = sample['binary']
        expected = fetch_plan.VALUES[code-1] if 1 <= code <= 5 else None
        return dict(sample, request=record, sourceClasses=values, featureCount=len(features),
                    hasPolygonGeometry=bool(root.findall('.//{http://www.opengis.net/gml}Polygon')),
                    binaryClass=expected, compatible=expected in values if expected else None)

    with ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(query, enumerate(points.values())))
    summary = {}
    for stratum in sorted({s for r in records for s in r['strata']}):
        rows = [r for r in records if stratum in r['strata']]
        summary[stratum] = dict(points=len(rows), classes=dict(Counter(v for r in rows for v in r['sourceClasses'])),
                                binaryAssigned=sum(r['binaryClass'] is not None for r in rows),
                                binaryCompatible=sum(r['compatible'] is True for r in rows),
                                binaryIncompatible=sum(r['compatible'] is False for r in rows),
                                ambiguousQueries=sum(len(r['sourceClasses']) != 1 for r in rows))
    output = dict(summary=summary, records=records, warning='Stratified convenience sample; server query tolerance unverified; no polygon geometry or population error estimate')
    (args.output / 'sample-checks.json').write_text(json.dumps(output, indent=2)+'\n')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
