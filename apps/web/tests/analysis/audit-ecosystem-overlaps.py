"""Offline differential diagnosis of existing methods, not a new production method."""

import argparse
import gzip
import hashlib
import json
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import ListedColormap
from PIL import Image
from scipy.ndimage import binary_erosion, binary_propagation, label, uniform_filter

COLORS = np.array([[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 0, 255], [0, 255, 255]])
IDS = ["skog", "hei-buskmark", "lite-vegetert-mark", "vatmark", "kyst", "unclassified"]
ACCOUNT = np.array(
    [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 128, 255],
        [0, 128, 255],
        [255, 128, 128],
    ],
    dtype=float,
)


def lookup():
    """Independently reproduce the legacy 5-bit segment-color lookup, including ties."""
    q = np.arange(32768)
    points = np.stack([q >> 10, (q >> 5) & 31, q & 31], axis=1) * 255 / 31
    best = np.full(len(q), np.inf)
    result = np.zeros(len(q), np.uint8)
    for a in range(6):
        for b in range(a + 1, 6):
            delta = ACCOUNT[a] - ACCOUNT[b]
            length = sum(delta[c] ** 2 for c in range(3))
            projection = sum(
                (points[:, c] - ACCOUNT[b, c]) * delta[c] for c in range(3)
            )
            t = np.clip(projection / length, 0, 1)
            error = sum(
                (points[:, c] - ACCOUNT[b, c] - t * delta[c]) ** 2 for c in range(3)
            )
            better = error < best
            result[better] = np.where(np.floor(t[better] * 255 + 0.5) >= 128, a, b)
            best[better] = error[better]
    return result


def account_code(rgba, lut):
    rgb = rgba[:, :, :3].astype(np.int32)
    q = ((rgb[:, :, 0] >> 3) << 10) | ((rgb[:, :, 1] >> 3) << 5) | (rgb[:, :, 2] >> 3)
    return lut[q]


def clean(classes):
    # Existing rule keeps an entire 8-connected component if any pixel has
    # all four orthogonal neighbours. It is not a fixed-width edge erosion.
    valid = classes > 0
    seeds = binary_erosion(valid, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]))
    kept = binary_propagation(seeds, structure=np.ones((3, 3)), mask=valid)
    return np.where(kept, classes, 0).astype(np.uint8)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("capture", type=Path)
    parser.add_argument("web_root", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument(
        "--boundary-check",
        action="store_true",
        help="Also check saved Kartverket geometry using optional pyproj",
    )
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    record = json.loads((args.capture / "capture.json").read_text())
    assert record["completed"] and not record["errors"]
    assert (
        hashlib.sha256(
            (
                args.web_root / "public/data/grunnkart/2025/overview/5001.png"
            ).read_bytes()
        ).hexdigest()
        == record["overviewSha256"]
    )
    r = record["results"]
    parent = r["parentGrid"]
    assert parent == r["oldGrid"]
    h, w = parent["height"], parent["width"]
    step = 21.15625
    fine = step / 2
    cell_daa = fine * fine * r["newResult"]["provenance"]["areaFactor"] / 1000

    def saved(name, shape=(h, w)):
        return np.frombuffer(
            gzip.decompress((args.capture / (name + ".gz")).read_bytes()), np.uint8
        ).reshape(shape)

    for response in record["network"]:
        assert (
            hashlib.sha256((args.capture / response["name"]).read_bytes()).hexdigest()
            == response["sha256"]
        )
    plans, details = {}, {}
    for response in record["network"]:
        url = urlsplit(response["url"])
        query = parse_qs(url.query)
        if "bbox" not in query:
            continue
        bbox = [float(v) for v in query["bbox"][0].split(",")]
        coordinate = (
            round((bbox[0] + 2500000) / 10832),
            round((9045984 - bbox[3]) / 10832),
        )
        (plans if url.hostname == "nap.ft.dibk.no" else details)[coordinate] = (
            np.asarray(Image.open(args.capture / response["name"]).convert("RGBA"))
        )

    lut = lookup()
    old_raw = np.zeros((h, w), np.uint8)
    new_raw = np.zeros_like(old_raw)
    plan_mask = np.zeros_like(old_raw, bool)
    old_any = np.zeros_like(old_raw)
    old_account = np.zeros_like(old_raw)
    new_account = np.zeros_like(old_raw)
    overview = json.loads(
        (args.web_root / "public/data/grunnkart/2025/overview/index.json").read_text()
    )["municipalities"]["5001"]
    source = np.asarray(
        Image.open(
            args.web_root / "public/data/grunnkart/2025/overview/5001.png"
        ).convert("RGBA")
    )
    for tile in record["intermediateTiles"]:
        _, x, y = tile["coordinate"]
        x0, y0 = x * 512 - parent["cx0"], y * 512 - parent["cy0"]
        dest = (slice(y0, y0 + 512), slice(x0, x0 + 512))
        plan = plans[x, y][:, :, 3] >= 128
        old = np.frombuffer(
            gzip.decompress((args.capture / tile["name"]).read_bytes()), np.uint8
        ).reshape(512, 512, 4)
        xmin, ymax = -2500000 + x * 10832, 9045984 - y * 10832
        sx = np.floor(
            (xmin - overview["extent"][0] + (np.arange(512) + 0.5) * step)
            * overview["width"]
            / (overview["extent"][2] - overview["extent"][0])
        ).astype(int)
        sy = np.floor(
            (overview["extent"][3] - ymax + (np.arange(512) + 0.5) * step)
            * overview["height"]
            / (overview["extent"][3] - overview["extent"][1])
        ).astype(int)
        valid = (
            (sy[:, None] >= 0)
            & (sy[:, None] < overview["height"])
            & (sx[None, :] >= 0)
            & (sx[None, :] < overview["width"])
        )
        new = source[
            np.clip(sy, 0, overview["height"] - 1)[:, None],
            np.clip(sx, 0, overview["width"] - 1)[None, :],
        ].copy()
        new[~valid] = 0
        for rgba, target, account in [
            (old, old_raw, old_account),
            (new, new_raw, new_account),
        ]:
            code = account_code(rgba, lut)
            support = plan & (rgba[:, :, 3] >= 100)
            target[dest] = np.where(
                support & (code == 2), 1, np.where(support & (code == 1), 2, 0)
            )
            account[dest] = np.where(rgba[:, :, 3] >= 100, code + 1, 0)
        plan_mask[dest] = plan
        old_any[dest] = plan & (old[:, :, 3] >= 100)
    assert np.array_equal(old_raw, saved("old-raw.bin"))
    assert np.array_equal(new_raw, saved("new-parent.bin"))
    old_clean, new_clean = clean(old_raw), clean(new_raw)
    assert np.array_equal(old_clean, saved("old-clean.bin"))
    assert np.array_equal(clean(old_any), saved("old-analysis-mask.bin"))

    # Common fine grid enclosing the support of both methods, including old-only cells.
    rr, cc = np.nonzero((old_raw > 0) | (new_raw > 0))
    y0, y1, x0, x1 = int(rr.min()), int(rr.max() + 1), int(cc.min()), int(cc.max() + 1)
    shape = ((y1 - y0) * 2, (x1 - x0) * 2)
    exact = np.full(shape, 6, np.uint8)
    nearest = np.full(shape, 6, np.uint8)
    rgba_alpha = np.zeros(shape, np.uint8)
    for (tx, ty), rgba in details.items():
        x, y = (
            tx * 1024 - parent["cx0"] * 2 - x0 * 2,
            ty * 1024 - parent["cy0"] * 2 - y0 * 2,
        )
        xa, xb, ya, yb = (
            max(x, 0),
            min(x + 1024, shape[1]),
            max(y, 0),
            min(y + 1024, shape[0]),
        )
        if xa >= xb or ya >= yb:
            continue
        source_slice = (slice(ya - y, yb - y), slice(xa - x, xb - x))
        block = rgba[source_slice]
        diff = (
            block[:, :, :3].astype(np.int32)[:, :, None, :] - COLORS[None, None, :, :]
        )
        dist = (diff * diff).sum(axis=3)
        good = block[:, :, 3] >= 100
        exact[ya:yb, xa:xb] = np.where(
            good & (dist.min(axis=2) == 0), dist.argmin(axis=2) + 1, 6
        )
        nearest[ya:yb, xa:xb] = np.where(good, dist.argmin(axis=2) + 1, 6)
        rgba_alpha[ya:yb, xa:xb] = block[:, :, 3]

    def expand(array):
        return np.repeat(np.repeat(array[y0:y1, x0:x1], 2, axis=0), 2, axis=1)

    rows, outputs = [], {}
    parents = {
        "canvas/raw": old_raw,
        "canvas/clean": old_clean,
        "midpoint/raw": new_raw,
        "midpoint/clean": new_clean,
    }
    for name, array in parents.items():
        nature = expand(array) == 1
        for classifier, code in [("nearest", nearest), ("exact", exact)]:
            key = f"{name}/{classifier}"
            output = np.where(nature, code, 0).astype(np.uint8)
            counts = [int((output == i).sum()) for i in range(1, 7)]
            rows.append(
                {
                    "method": key,
                    "natureDaa": int((array == 1).sum()) * 4 * cell_daa,
                    "agricultureDaa": int((array == 2).sum()) * 4 * cell_daa,
                    "cells": dict(zip(IDS, counts)),
                    "daa": dict(zip(IDS, [n * cell_daa for n in counts])),
                }
            )
            outputs[key] = output
    old = outputs["canvas/clean/nearest"]
    new = outputs["midpoint/raw/exact"]
    old_row = next(row for row in rows if row["method"] == "canvas/clean/nearest")
    for metric in r["oldBreakdown"]["metrics"]:
        assert abs(old_row["daa"][metric["id"]] - metric["areaKm2"] * 1000) < 1e-8
    assert (
        abs(
            old_row["daa"]["unclassified"]
            - r["oldBreakdown"]["unclassifiedAreaKm2"] * 1000
        )
        < 1e-8
    )
    new_row = next(row for row in rows if row["method"] == "midpoint/raw/exact")
    for metric in r["newResult"]["categories"][:6]:
        key = "unclassified" if metric["code"] == 6 else metric["id"]
        assert abs(new_row["daa"][key] - metric["areaDaa"]) < 1e-8
    ng = r["newGrid"]
    canonical = saved("new-detail.bin", (ng["height"], ng["width"]))
    current = np.where(
        expand(new_raw) == 1, exact, np.where(expand(new_raw) == 2, 7, 0)
    )
    oy, ox = ng["offsetY"] - y0 * 2, ng["offsetX"] - x0 * 2
    assert np.array_equal(
        current[oy : oy + ng["height"], ox : ox + ng["width"]], canonical
    )

    matrix = [
        [int(((old == a) & (new == b)).sum()) for b in range(7)] for a in range(7)
    ]
    same_support = (old > 0) & (new > 0)
    stages = [
        "canvas/clean/nearest",
        "canvas/raw/nearest",
        "midpoint/raw/nearest",
        "midpoint/raw/exact",
    ]
    stage_rows = [next(row for row in rows if row["method"] == key) for key in stages]
    deltas = [
        {
            "from": a["method"],
            "to": b["method"],
            "daa": {k: b["daa"][k] - a["daa"][k] for k in IDS},
            "natureDaa": b["natureDaa"] - a["natureDaa"],
        }
        for a, b in zip(stage_rows, stage_rows[1:])
    ]
    for name in ["skog", "vatmark"]:
        assert (
            abs(
                sum(d["daa"][name] for d in deltas)
                - (new_row["daa"][name] - old_row["daa"][name])
            )
            < 1e-8
        )
    removed = (old_raw > 0) & (old_clean == 0)
    components, count = label(old_raw > 0, structure=np.ones((3, 3)))
    removed_components = np.unique(components[removed])
    support_changed = expand((old_clean == 1)) != expand((new_raw == 1))
    # Closeness to raster plan edge, not distance to the original legal plan polygon.
    plan_boundary = expand(plan_mask & ~binary_erosion(plan_mask))
    from scipy.ndimage import distance_transform_edt

    distance = distance_transform_edt(~plan_boundary)
    changed = old != new
    geography = {
        "differentFineCells": int(changed.sum()),
        "differentFineDaa": float(changed.sum() * cell_daa),
        "oldOnlyNatureCells": int(((old > 0) & (new == 0)).sum()),
        "newOnlyNatureCells": int(((old == 0) & (new > 0)).sum()),
        "changedInsideSharedSupport": int((same_support & changed).sum()),
        "supportChangedFineCells": int(support_changed.sum()),
        "changedWithinOneFineCellOfPlanRasterEdge": int(
            (changed & (distance <= 1)).sum()
        ),
        "removedCoarseNatureCells": int(((old_raw == 1) & (old_clean == 0)).sum()),
        "removedCoarseAgricultureCells": int(((old_raw == 2) & (old_clean == 0)).sum()),
        "removedConnectedComponents": int(len(removed_components)),
        "allConnectedComponents": int(count),
    }
    # Locate why exact classification is unassigned on the shared/removed supports.
    unknown = (expand(new_raw) == 1) & (exact == 6)
    geography["newUnclassifiedAlpha"] = {
        "transparent": int((unknown & (rgba_alpha == 0)).sum()),
        "alpha1to99": int((unknown & (rgba_alpha > 0) & (rgba_alpha < 100)).sum()),
        "nonExactAlphaAtLeast100": int((unknown & (rgba_alpha >= 100)).sum()),
    }
    if args.boundary_check:
        import shapely
        from shapely.geometry import shape as geometry_shape
        from pyproj import Transformer

        boundary_record = next(
            item for item in record["network"] if item["url"].endswith("/5001/omrade")
        )
        boundary = json.loads((args.capture / boundary_record["name"]).read_text())
        transformer = Transformer.from_crs(4326, 25833, always_xy=True)
        geometry = shapely.transform(
            geometry_shape(boundary["omrade"]), transformer.transform, interleaved=False
        )
        boundary_checks = {}
        for name, array in [("old-clean", old_clean), ("new-parent", new_raw)]:
            yy, xx = np.nonzero(array)
            east = parent["extent"][0] + (xx + 0.5) * step
            north = parent["extent"][3] - (yy + 0.5) * step
            outside = ~shapely.contains_xy(geometry, east, north)
            boundary_checks[name] = {
                "selectedCells": int(len(xx)),
                "outsideCenterPoints": [
                    {
                        "x": float(east[i]),
                        "y": float(north[i]),
                        "class": int(array[yy[i], xx[i]]),
                        "distanceMeters": float(
                            shapely.distance(geometry, shapely.Point(east[i], north[i]))
                        ),
                    }
                    for i in np.flatnonzero(outside)
                ],
            }
        midpoint = (geometry.bounds[0] + geometry.bounds[2]) / 2
        factor = 1 / (0.9996 * (1 + (midpoint - 500000) ** 2 / (2 * 6380000**2))) ** 2
        assert abs(factor - r["newResult"]["provenance"]["areaFactor"]) < 1e-12
        boundary_checks["independentAreaFactor"] = factor
        geography["boundaryCheck"] = boundary_checks
    np.savez_compressed(
        args.output / "difference-grids.npz",
        old=old,
        new=new,
        old_raw=expand(old_raw),
        old_clean=expand(old_clean),
        midpoint_raw=expand(new_raw),
        exact=exact,
        nearest=nearest,
        plan_edge=plan_boundary,
    )
    extent = [
        parent["extent"][0] + x0 * step,
        parent["extent"][0] + x1 * step,
        parent["extent"][3] - y1 * step,
        parent["extent"][3] - y0 * step,
    ]
    report = {
        "verified": {
            "rawResponsesSha256": True,
            "oldRawMask": True,
            "oldCleanMask": True,
            "oldBinaryAnalysisMask": True,
            "newParentMask": True,
            "newDetailedMask": True,
            "bothCategoryTotals": True,
        },
        "cellDaa": cell_daa,
        "extent": extent,
        "rows": rows,
        "orderedDecomposition": deltas,
        "transitionCells": matrix,
        "geography": geography,
        "note": "Counterfactual rows only isolate existing rules; not proposed replacement calculations. Contribution depends on ordering. 0 in transition table means outside each method nature support.",
    }
    (args.output / "audit.json").write_text(json.dumps(report, indent=2) + "\n")
    colors = [
        "#ffffff",
        "#78a855",
        "#d6b86c",
        "#e1dbbd",
        "#bf9ed9",
        "#c7ccce",
        "#607a77",
    ]
    fig, axes = plt.subplots(1, 3, figsize=(15, 6), layout="constrained")
    for ax, data, title in [
        (axes[0], old, "Temaside: Canvas + smalfeltfilter + nærmeste farge"),
        (axes[1], new, "Planareal: midtpunkt + alle felt + eksakt farge"),
    ]:
        ax.imshow(
            data,
            extent=extent,
            cmap=ListedColormap(colors),
            vmin=0,
            vmax=6,
            interpolation="none",
        )
        ax.set_title(title, fontsize=9)
    diagnostic = np.zeros(shape, np.uint8)
    diagnostic[(old > 0) & (new == 0)] = 1
    diagnostic[(old == 0) & (new > 0)] = 2
    diagnostic[same_support & changed] = 3
    axes[2].imshow(
        diagnostic,
        extent=extent,
        cmap=ListedColormap(["#fff", "#df8a32", "#477cba", "#a65a98"]),
        vmin=0,
        vmax=3,
        interpolation="none",
    )
    axes[2].set_title(
        "Oransje: bare gammel støtte · blå: bare ny\nLilla: endret klasse innen felles støtte",
        fontsize=9,
    )
    for ax in axes:
        ax.set_xlabel("Øst, EPSG:25833")
        ax.set_ylabel("Nord")
        ax.ticklabel_format(style="plain", useOffset=False)
        ax.tick_params(labelsize=7)
    fig.suptitle(
        "Diagnostikk av eksisterende rastermetoder – ikke originale plan-/naturpolygoner",
        fontsize=12,
    )
    fig.savefig(args.output / "geographic-differences.png", dpi=160)
    plt.close(fig)
    # Deterministic detail: highest density of differing cells in a 120-cell window.
    density = uniform_filter(changed.astype(np.float32), size=120, mode="constant")
    row, col = np.unravel_index(density.argmax(), density.shape)
    ya, yb = max(0, row - 60), min(shape[0], row + 60)
    xa, xb = max(0, col - 60), min(shape[1], col + 60)
    detail_extent = [
        extent[0] + xa * fine,
        extent[0] + xb * fine,
        extent[3] - yb * fine,
        extent[3] - ya * fine,
    ]
    report["detailExtent"] = detail_extent
    (args.output / "audit.json").write_text(json.dumps(report, indent=2) + "\n")
    fig, axes = plt.subplots(1, 3, figsize=(15, 5), layout="constrained")
    for ax, data, title, cmap, vmax in [
        (axes[0], old, "Temaside", ListedColormap(colors), 6),
        (axes[1], new, "Planareal", ListedColormap(colors), 6),
        (
            axes[2],
            diagnostic,
            "Differanse: oransje gammel / blå ny støtte",
            ListedColormap(["#fff", "#df8a32", "#477cba", "#a65a98"]),
            3,
        ),
    ]:
        ax.imshow(
            data[ya:yb, xa:xb],
            extent=detail_extent,
            cmap=cmap,
            vmin=0,
            vmax=vmax,
            interpolation="none",
        )
        ax.set_title(title, fontsize=10)
        ax.set_xlabel("Øst, EPSG:25833")
        ax.ticklabel_format(style="plain", useOffset=False)
        ax.tick_params(labelsize=7)
    fig.suptitle(
        "Detaljutsnitt valgt etter flest differanseceller · grønn: skog · grågrønn: ufordelt · lilla: klasseendring i differansekart",
        fontsize=10,
    )
    fig.savefig(args.output / "geographic-detail.png", dpi=160)
    plt.close(fig)
    print(
        json.dumps(
            {
                "verified": report["verified"],
                "orderedDecomposition": deltas,
                "geography": geography,
            }
        )
    )


if __name__ == "__main__":
    main()
