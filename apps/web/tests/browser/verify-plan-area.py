"""Independent raw PNG/NumPy classification and GEOS row-strip area check.
Run with an audit output directory; no production JS classifier is used.
"""
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image
from shapely import box, union_all

root = Path(sys.argv[1])
inputs = json.loads((root / 'inputs.json').read_text())
result = json.loads((root / 'result.json').read_text())
parent = inputs['parent']
mask = np.frombuffer((root / 'parent-mask.bin').read_bytes(), dtype=np.uint8).reshape(parent['height'], parent['width'])
detail = np.repeat(np.repeat(mask, 2, axis=0), 2, axis=1)
expected = np.where(detail == 1, 6, np.where(detail == 2, 7, 0)).astype(np.uint8)
step = (parent['extent'][2] - parent['extent'][0]) / parent['width'] / 2
colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 0, 255), (0, 255, 255)]
unknown = Counter()
for tile in inputs['tiles']:
    assert tile['status'] == 200
    rgba = np.asarray(Image.open(root / tile['name']).convert('RGBA'))
    assert rgba.shape == (1024, 1024, 4)
    x = round((tile['bbox'][0] - parent['extent'][0]) / step)
    y = round((parent['extent'][3] - tile['bbox'][3]) / step)
    target = expected[y:y+1024, x:x+1024]
    selected = detail[y:y+1024, x:x+1024] == 1
    code = np.full((1024, 1024), 6, dtype=np.uint8)
    for i, color in enumerate(colors, 1):
        code[np.all(rgba[:, :, :3] == color, axis=2) & (rgba[:, :, 3] >= 100)] = i
    target[selected] = code[selected]
    unknown.update(map(tuple, rgba[selected & (code == 6)].tolist()))
grid = result['grid']
cropped = expected[grid['offsetY']:grid['offsetY']+grid['height'], grid['offsetX']:grid['offsetX']+grid['width']]
actual = np.frombuffer((root / 'result-mask.bin').read_bytes(), dtype=np.uint8).reshape(grid['height'], grid['width'])
assert np.array_equal(cropped, actual), 'Mapped category pixels differ from raw-data calculation'
factor = result['provenance']['areaFactor']
assert abs(np.count_nonzero(mask == 1)*(step*2)**2*factor/1000-result['natureDaa']) < 1e-8
assert abs(np.count_nonzero(mask == 2)*(step*2)**2*factor/1000-result['agricultureDaa']) < 1e-8
checks = []
for metric in result['categories']:
    occupied = cropped == metric['code']
    rectangles = []
    for y, row in enumerate(occupied):
        transitions = np.diff(np.concatenate(([False], row, [False])).astype(np.int8))
        for start, end in zip(np.flatnonzero(transitions == 1), np.flatnonzero(transitions == -1)):
            rectangles.append(box(grid['extent'][0]+start*step, grid['extent'][3]-(y+1)*step, grid['extent'][0]+end*step, grid['extent'][3]-y*step))
    area = union_all(rectangles).area if rectangles else 0
    count_area = np.count_nonzero(occupied)*step**2
    assert abs(area-count_area) < .01
    assert abs(area*factor/1000-metric['areaDaa']) < .00001
    assert abs(area-next(g['projectedM2'] for g in result['geometryAreas'] if g['id'] == metric['id'])) < .01
    checks.append({'id': metric['id'], 'rawPngCells': int(np.count_nonzero(occupied)), 'geosAreaDaa': area*factor/1000, 'jsAreaDaa': metric['areaDaa']})
output = {'status': 'passed', 'independentMethod': 'Pillow raw PNG + NumPy exact classification + GEOS row-strip union', 'checks': checks, 'unclassifiedRgba': [{'rgba': [int(v) for v in color], 'cells': count} for color, count in unknown.most_common()], 'parentNatureCells': int(np.count_nonzero(mask == 1)), 'parentAgricultureCells': int(np.count_nonzero(mask == 2)), 'maskAndGeographicMappingIdentical': True}
(root / 'independent-check.json').write_text(json.dumps(output, indent=2)+'\n')
print(json.dumps(output))
