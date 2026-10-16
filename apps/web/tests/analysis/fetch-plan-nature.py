"""Read-only WMS research; separate from the application and its caches."""
import argparse
import hashlib
import json
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import urlopen

ENDPOINT = 'https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse'
VALUES = ['skog', 'heiBuskmark', 'liteVegetertMark', 'vatmark', 'kyststrenderSvabergDyner']
COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#00ffff']
EXCLUDED = ['bebygdOpparbeidetAreal', 'dyrketmark', 'grasmark', 'elverBekkerKanaler',
            'innsjoerVannmagasiner', 'hav', 'bukterKilerTidevannsonen']


def style(values=VALUES, colors=COLORS):
    rules = ''.join(
        '<Rule><ogc:Filter><ogc:PropertyIsEqualTo>'
        f'<ogc:PropertyName>okosystemtypeniva1</ogc:PropertyName><ogc:Literal>{value}</ogc:Literal>'
        '</ogc:PropertyIsEqualTo></ogc:Filter><PolygonSymbolizer><Fill>'
        f'<CssParameter name="fill">{color}</CssParameter>'
        '</Fill></PolygonSymbolizer></Rule>'
        for value, color in zip(values, colors, strict=True)
    )
    return ('<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" '
            'xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>okosystemtype</Name>'
            f'<UserStyle><FeatureTypeStyle>{rules}</FeatureTypeStyle></UserStyle>'
            '</NamedLayer></StyledLayerDescriptor>')


def parameters(bbox, image_format='image/png; mode=8bit', size=1024):
    return dict(service='WMS', version='1.3.0', request='GetMap', layers='okosystemtype',
                styles='', crs='EPSG:25833', bbox=','.join(f'{v:.2f}' for v in bbox),
                width=str(size), height=str(size), format=image_format,
                transparent='true', sld_body=style())


def fetch(out, name, params):
    url = ENDPOINT + '?' + urlencode(params)
    start = time.perf_counter()
    try:
        with urlopen(url, timeout=120) as response:
            body, status, content_type = response.read(), response.status, response.headers.get('Content-Type')
    except HTTPError as error:
        body, status, content_type = error.read(), error.code, error.headers.get('Content-Type')
    (out / name).write_bytes(body)
    return dict(name=name, url=url, status=status, contentType=content_type, bytes=len(body),
                sha256=hashlib.sha256(body).hexdigest(), seconds=time.perf_counter()-start)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--all-tiles', action='store_true')
    parser.add_argument('--binary', action='store_true', help='Five separate class masks plus excluded-class control')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    inputs = json.loads((args.reference / 'inputs.json').read_text())
    jobs = []
    for service, version in [('WMS', '1.3.0'), ('WFS', '2.0.0'), ('WCS', '2.0.1')]:
        jobs.append((f'{service.lower()}-capabilities.xml', dict(service=service, version=version, request='GetCapabilities')))
    for tile in inputs['tiles'] if args.all_tiles else [inputs['tiles'][3]]:
        index = tile['name'].removeprefix('classification-').removesuffix('.png')
        for label, fmt in [('png8', 'image/png; mode=8bit'), ('png', 'image/png')]:
            jobs.append((f'{label}-{index}.png', parameters(tile['bbox'], fmt)))
        if args.binary:
            for category, values in enumerate([[v] for v in VALUES] + [EXCLUDED], 1):
                params = parameters(tile['bbox'], 'image/png')
                params['sld_body'] = style(values, ['#ffffff'] * len(values))
                jobs.append((f'binary-{index}-{category}.png', params))
    # Advertised vector/JSON output is tested in a small 1 km window, never assumed to be class data.
    jobs.append(('getmap-small.json', parameters([268000, 7035000, 269000, 7036000], 'application/json', 256)))
    with ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(lambda job: fetch(args.output, *job), jobs))
    (args.output / 'requests.json').write_text(json.dumps(records, indent=2)+'\n')
    print(json.dumps([{k: v for k, v in r.items() if k != 'url'} for r in records], indent=2))


if __name__ == '__main__':
    main()
