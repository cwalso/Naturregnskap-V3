"""Offline diagnosis of stored inputs; no production imports or source mutations."""
import argparse
import hashlib
import json
import time
from collections import Counter
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import ListedColormap
from scipy.ndimage import binary_erosion, distance_transform_edt
from PIL import Image

COLORS = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 0, 255), (0, 255, 255)]
CAUSES = ['transparent', 'low_alpha', 'nonexact_single_support', 'mixed_or_other']


def classify(rgba):
    code = np.full(rgba.shape[:2], 6, dtype=np.uint8)
    for i, color in enumerate(COLORS, 1):
        code[np.all(rgba[:, :, :3] == color, axis=2) & (rgba[:, :, 3] >= 100)] = i
    return code


def cause_grid(rgba, code):
    alpha = rgba[:, :, 3]
    # This describes channel support, not a guess at the underlying class.
    single = np.any([np.all((rgba[:, :, :3] > 0) == (np.array(c) > 0), axis=2) for c in COLORS], axis=0)
    result = np.zeros(code.shape, dtype=np.uint8)
    result[(code == 6) & (alpha == 0)] = 1
    result[(code == 6) & (alpha > 0) & (alpha < 100)] = 2
    result[(code == 6) & (alpha >= 100) & single] = 3
    result[(code == 6) & (alpha >= 100) & ~single] = 4
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=Path)
    parser.add_argument('experiment', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--canvas', type=Path, help='Optional stored Chromium RGBA roundtrip')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    inputs = json.loads((args.reference / 'inputs.json').read_text())
    reference = json.loads((args.reference / 'result.json').read_text())
    par, grid = inputs['parent'], reference['grid']
    parent = np.frombuffer((args.reference / 'parent-mask.bin').read_bytes(), np.uint8).reshape(par['height'], par['width'])
    step = (par['extent'][2] - par['extent'][0]) / par['width'] / 2
    cell_daa = step**2 * reference['provenance']['areaFactor'] / 1000
    assert np.count_nonzero(parent == 1) == 6234
    assert np.count_nonzero(parent == 2) == 1860
    assert hashlib.sha256(parent.tobytes()).hexdigest() == reference['provenance']['maskHash']
    detail = np.repeat(np.repeat(parent, 2, axis=0), 2, axis=1)
    bounds = (slice(grid['offsetY'], grid['offsetY']+grid['height']), slice(grid['offsetX'], grid['offsetX']+grid['width']))
    selected = detail[bounds]
    del detail
    baseline = np.where(selected == 1, 6, np.where(selected == 2, 7, 0)).astype(np.uint8)
    causes = np.zeros(baseline.shape, np.uint8)
    distance_to_exact = np.zeros(baseline.shape, np.float32)
    experiment = baseline.copy()
    binary = {threshold: baseline.copy() for threshold in [100, 128, 255]}
    excluded = np.zeros(baseline.shape, bool)
    overlaps = np.zeros(baseline.shape, bool)
    alpha_groups = Counter()
    tile_records = []
    samples = []
    canvas_changes = Counter()
    start = time.perf_counter()
    for index, tile in enumerate(inputs['tiles']):
        rgba = np.asarray(Image.open(args.reference / tile['name']).convert('RGBA'))
        raw_code = classify(rgba)
        if args.canvas:
            browser_rgba = np.frombuffer((args.canvas / tile['name'].replace('.png', '.rgba')).read_bytes(), np.uint8).reshape(rgba.shape)
            canvas_changes['rgbaChangesAll'] += int(np.any(browser_rgba != rgba, axis=2).sum())
            canvas_changes['alphaChangesAll'] += int((browser_rgba[:, :, 3] != rgba[:, :, 3]).sum())
        cause = cause_grid(rgba, raw_code)
        x = round((tile['bbox'][0] - par['extent'][0]) / step) - grid['offsetX']
        y = round((par['extent'][3] - tile['bbox'][3]) / step) - grid['offsetY']
        x0, x1, y0, y1 = max(x, 0), min(x+1024, grid['width']), max(y, 0), min(y+1024, grid['height'])
        dest = (slice(y0, y1), slice(x0, x1))
        source = (slice(y0-y, y1-y), slice(x0-x, x1-x))
        nature = selected[dest] == 1
        if args.canvas:
            canvas_changes['rgbaChangesNature'] += int(np.any(browser_rgba[source] != rgba[source], axis=2)[nature].sum())
            canvas_changes['classificationChangesNature'] += int((classify(browser_rgba)[source] != raw_code[source])[nature].sum())
        baseline[dest][nature] = raw_code[source][nature]
        causes[dest][nature] = cause[source][nature]
        distances = distance_transform_edt(raw_code == 6)
        distance_to_exact[dest][nature] = distances[source][nature]
        new_rgba = np.asarray(Image.open(args.experiment / f'png-{index}.png').convert('RGBA'))
        experiment[dest][nature] = classify(new_rgba)[source][nature]
        alpha = np.stack([np.asarray(Image.open(args.experiment / f'binary-{index}-{k}.png').convert('RGBA'))[:, :, 3] for k in range(1, 7)])
        for threshold, array in binary.items():
            eligible = alpha[:5] >= threshold
            count = eligible.sum(axis=0)
            code = np.where((count == 1) & (alpha[5] < threshold), eligible.argmax(axis=0)+1, 6).astype(np.uint8)
            array[dest][nature] = code[source][nature]
        excluded[dest][nature] = (alpha[5][source] >= 128)[nature]
        overlaps[dest][nature] = ((alpha[:5] >= 128).sum(axis=0)[source] > 1)[nature]
        selected_unknown = nature & (raw_code[source] == 6)
        alpha_groups.update(int(v) for v in rgba[source][:, :, 3][selected_unknown])
        tile_records.append(dict(index=index, bbox=tile['bbox'], natureCells=int(nature.sum()),
                                 causeCells=[int((nature & (cause[source] == k)).sum()) for k in range(1, 5)],
                                 rawPng8Unchanged=(args.reference / tile['name']).read_bytes() == (args.experiment / f'png8-{index}.png').read_bytes()))
        # Deterministic stratification; not a probability sample of the municipality.
        strata = [('exact', nature & (raw_code[source] < 6)),
                  *[(label, nature & (cause[source] == k)) for k, label in enumerate(CAUSES, 1)],
                  ('rescued', nature & (raw_code[source] == 6) & (binary[128][dest] < 6)),
                  ('excluded', nature & excluded[dest])]
        for label, cells in strata:
            positions = np.argwhere(cells)
            for n in np.unique(np.linspace(0, len(positions)-1, min(3, len(positions)), dtype=int)):
                row, col = positions[n]
                r, c = row + y0-y, col + x0-x
                samples.append(dict(tile=index, stratum=label, i=int(c), j=int(r), bbox=tile['bbox'],
                                    x=tile['bbox'][0]+(c+.5)*step, y=tile['bbox'][3]-(r+.5)*step,
                                    baseline=int(raw_code[r, c]), binary=int(binary[128][dest][row, col])))
    duration = time.perf_counter()-start
    stored = np.frombuffer((args.reference / 'result-mask.bin').read_bytes(), np.uint8).reshape(baseline.shape)
    assert np.array_equal(stored, baseline)
    for metric in reference['categories']:
        assert np.count_nonzero(baseline == metric['code']) == metric['cells']
    cause_counts = [int((causes == k).sum()) for k in range(1, 5)]
    assert sum(cause_counts) == 6319
    edge = (selected > 0) & ~binary_erosion(selected > 0, structure=np.ones((3, 3)))
    edge_distance = distance_transform_edt(~edge)
    unknown = baseline == 6

    def method(array):
        counts = [int((array == k).sum()) for k in range(1, 8)]
        return dict(cells=counts, areaDaa=[v*cell_daa for v in counts],
                    changesFromBaseline=int(((array != baseline) & (selected == 1)).sum()),
                    identifiedClassSwaps=int(((baseline < 6) & (baseline > 0) & (array < 6) & (array != baseline)).sum()),
                    newlyUnknown=int(((baseline < 6) & (baseline > 0) & (array == 6)).sum()))

    result = dict(baselineHead='b13670daf12b6b9ac276e1eb2200846912827c97',
                  cellDaa=cell_daa, stepM=step, classificationSeconds=duration,
                  causes=[dict(id=label, cells=count, areaDaa=count*cell_daa) for label, count in zip(CAUSES, cause_counts, strict=True)],
                  alphaHistogram=dict(sorted(alpha_groups.items())), tiles=tile_records,
                  methods={'A': method(baseline), 'B_png': method(experiment),
                           **{f'B_binary_{k}': method(v) for k, v in binary.items()}},
                  excludedWithinUnknownCells=int((unknown & excluded).sum()),
                  overlappingNatureMasksCells=int((unknown & overlaps).sum()),
                  geographic={str(radius): dict(nearExactWmsCells=int((unknown & (distance_to_exact <= radius)).sum()),
                                                nearSelectedMaskEdgeCells=int((unknown & (edge_distance <= radius)).sum())) for radius in [1, 2, 4]},
                  causeExperiments=[dict(id=label, recoveredCells=int(((causes == k) & (binary[128] < 6)).sum()),
                                         excludedMaskCells=int(((causes == k) & excluded).sum()),
                                         remainingAmbiguousCells=int(((causes == k) & (binary[128] == 6) & ~excluded).sum()))
                                    for k, label in enumerate(CAUSES, 1)],
                  canvas=dict(canvas_changes) if args.canvas else None)
    (args.output / 'diagnosis.json').write_text(json.dumps(result, indent=2)+'\n')
    (args.output / 'samples.json').write_text(json.dumps(samples, indent=2)+'\n')
    np.savez_compressed(args.output / 'diagnostic-grids.npz', baseline=baseline, cause=causes,
                        binary=binary[128], excluded=excluded, extent=grid['extent'])
    plot(baseline, causes, binary[128], grid, args.output)
    print(json.dumps({k: v for k, v in result.items() if k not in ['alphaHistogram', 'tiles']}, indent=2))


def plot(baseline, causes, binary, grid, out):
    palette = ['#ffffff', '#358342', '#b78c44', '#909090', '#a552c3', '#41a7c5', '#e34631', '#e7c148']
    cause_palette = ['#ffffff', '#111111', '#de8731', '#c93232', '#812f9b']
    ext = np.array(grid['extent']) / 1000
    extent = [ext[0], ext[2], ext[1], ext[3]]
    fig, axes = plt.subplots(1, 3, figsize=(15, 7), layout='constrained')
    for ax, values, colors, title in zip(axes, [baseline, causes, binary], [palette, cause_palette, palette],
                                       ['A: eksakt RGB/alpha', 'Ufordelt: observerte bildegrupper', 'B: separate klassemasker, alpha ≥128'], strict=True):
        ax.imshow(values, extent=extent, origin='upper', interpolation='nearest', cmap=ListedColormap(colors), vmin=0, vmax=len(colors)-1)
        ax.set(title=title, xlabel='Øst (km, EPSG:25833)', ylabel='Nord (km)')
        ax.grid(alpha=.15)
    fig.suptitle('Trondheim · lagret planstøtte · diagnostikk, ikke nytt regnskapsgrunnlag', fontsize=13)
    fig.text(.5, -.02, 'A/B: skog grønn · hei brun · våtmark lilla · ufordelt rød · jordbruk gul\n'
             'Bildegrupper: alpha 0 svart · alpha 1–99 oransje · avvikende én-fargestøtte rød · øvrige farger lilla', ha='center')
    fig.savefig(out / 'diagnostic-map.png', dpi=160, bbox_inches='tight')
    plt.close(fig)
    # Detailed window with the largest number of unclassified pixels, selected reproducibly.
    counts = np.array([[np.count_nonzero(causes[y:y+100, x:x+100]) for x in range(0, causes.shape[1], 100)] for y in range(0, causes.shape[0], 100)])
    cy, cx = np.unravel_index(counts.argmax(), counts.shape)
    y, x = cy*100, cx*100
    fig, axes = plt.subplots(1, 3, figsize=(12, 4), layout='constrained')
    for ax, values, colors, title in zip(axes, [baseline, causes, binary], [palette, cause_palette, palette], ['A', 'Bildegrupper', 'B'], strict=True):
        ax.imshow(values[y:y+100, x:x+100], origin='upper', interpolation='nearest', cmap=ListedColormap(colors), vmin=0, vmax=len(colors)-1)
        ax.set(title=title, xlabel='10,578125 m delceller', ylabel='Rad i kontrollutsnitt')
    fig.suptitle(f'Mest ufordelt i 100×100-vinduer · startkolonne {x}, startrad {y}')
    fig.savefig(out / 'diagnostic-detail.png', dpi=160)
    plt.close(fig)


if __name__ == '__main__':
    main()
