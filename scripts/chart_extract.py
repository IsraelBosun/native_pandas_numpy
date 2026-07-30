"""Pull the drawn numbers back out of a real matplotlib figure.

The app never runs pandas, seaborn or matplotlib — charting cards ship a
precomputed `chart` spec and the app only draws it. That makes the spec exactly
as capable of being wrong as any other content field, so it gets the same
treatment as `answer`: execute the real call, read the marks that were actually
produced, and compare.

We read the *artists*, never a rendered image. A PNG can't be diffed against a
spec, doesn't theme, and doesn't scale on a phone.
"""

import matplotlib

matplotlib.use("Agg")  # no display, no interactive backend, safe in CI

import matplotlib.pyplot as plt  # noqa: E402  (must follow the backend choice)
import numpy as np  # noqa: E402

# Must match VIOLIN_BANDS in src/lib/chart.js — the spec ships this many
# normalised half-widths and the comparison re-derives the same count.
VIOLIN_BANDS = 24


class ChartMismatch(Exception):
    """A chart spec doesn't match what the real call drew."""


def figure_of(result):
    """The figure a card's answer produced.

    Covers every shape a plotting call returns: an Axes (pandas/seaborn
    one-liners), a seaborn FacetGrid, a Figure, or nothing useful at all (a
    matplotlib card whose answer is several statements) — in which case the
    current pyplot figure is the answer.
    """
    for attr in ("figure", "fig"):
        candidate = getattr(result, attr, None)
        if candidate is not None and hasattr(candidate, "axes"):
            return candidate
    if hasattr(result, "axes") and hasattr(result, "canvas"):
        return result
    return plt.gcf()


def data_axes(fig, kind):
    """The axes holding the data, ignoring furniture like a colorbar.

    seaborn's heatmap adds a colorbar axes whose QuadMesh has 256 entries; the
    real grid is the one whose mesh matches the data.
    """
    axes = [ax for ax in fig.axes if not _is_colorbar(ax)]
    if not axes:
        axes = list(fig.axes)
    if kind == "panels":
        return axes
    return axes[:1]


def _is_colorbar(ax):
    # A colorbar's long axis carries a 256-step ramp and it has no other marks.
    if ax.patches or ax.lines or ax.containers:
        return False
    for coll in ax.collections:
        paths = getattr(coll, "get_paths", lambda: [])()
        if len(paths) >= 128:
            return True
    return False


def _series_from_containers(ax, horizontal):
    """One entry per plotted column, in draw order."""
    series = []
    for container in ax.containers:
        patches = getattr(container, "patches", None)
        if patches is None:
            continue  # e.g. a BoxPlotContainer — handled by the box extractor
        values = [(p.get_width() if horizontal else p.get_height()) for p in patches]
        label = container.get_label()
        series.append({"name": "" if label.startswith("_") else label, "values": values})
    return series


def _series_from_patches(ax, horizontal):
    values = [(p.get_width() if horizontal else p.get_height()) for p in ax.patches]
    return [{"name": "", "values": values}] if values else []


def extract(result, kind):
    """Return the chart that was actually drawn, in the app's spec shape.

    `kind` is the spec's declared kind. It selects which artists to read, so a
    card claiming 'bar' whose call really drew a line extracts as empty and
    fails the comparison — which is the point.
    """
    fig = figure_of(result)
    fig.canvas.draw()  # tick labels aren't populated until a draw

    if kind == "panels":
        axes = data_axes(fig, "panels")
        limits = [tuple(round(v, 6) for v in ax.get_ylim()) for ax in axes]
        return {
            "kind": "panels",
            "panels": [_extract_axes(ax, None) for ax in axes],
            # Whether the panels really are on one scale — the claim a spec
            # makes with shareDomain, and what sharey=True actually produces.
            "shareDomain": len(set(limits)) == 1,
        }

    ax = data_axes(fig, kind)[0]
    return _extract_axes(ax, kind)


def _extract_axes(ax, kind):
    """Read one Axes. `kind` of None means 'work it out from what's there'."""
    if kind is None:
        kind = _guess_kind(ax)

    horizontal = kind == "barh"

    if kind in ("bar", "barh", "hist"):
        series = _series_from_containers(ax, horizontal) or _series_from_patches(ax, horizontal)
        return {"kind": kind, "series": series, "categories": _tick_labels(ax, horizontal)}

    if kind == "line":
        series = [
            {
                "name": "" if line.get_label().startswith("_") else line.get_label(),
                "values": _ydata(line),
            }
            for line in ax.lines
            if len(line.get_ydata()) > 0
        ]
        return {"kind": kind, "series": series, "categories": _tick_labels(ax, False)}

    if kind == "scatter":
        points = []
        for collection in ax.collections:
            # Only the marker collection counts. A regplot also adds a filled
            # confidence band, whose lone [0, 0] offset would otherwise read as
            # a ninth data point.
            if type(collection).__name__ != "PathCollection":
                continue
            offsets = np.asarray(collection.get_offsets())
            if offsets.size:
                points.extend([[float(x), float(y)] for x, y in offsets])
        # A regplot draws its fit as a dense polyline; only the endpoints matter
        # for a straight fit, and that is all the spec carries.
        fit = None
        for line in ax.lines:
            xs, ys = np.asarray(line.get_xdata()), np.asarray(line.get_ydata())
            if len(xs) >= 2:
                fit = [[float(xs[0]), float(ys[0])], [float(xs[-1]), float(ys[-1])]]
                break
        return {"kind": "scatter", "points": points, "fit": fit, "series": [], "categories": []}

    if kind == "box":
        return {"kind": "box", "boxes": _boxes(ax), "categories": _tick_labels(ax, False)}

    if kind == "violin":
        return {"kind": "violin", "violins": _violins(ax), "categories": _tick_labels(ax, False)}

    if kind == "heatmap":
        mesh = next((c for c in ax.collections if _mesh_values(c) is not None), None)
        if mesh is None:
            raise ChartMismatch("no heatmap mesh on the axes — did the call draw a heatmap?")
        values = _mesh_values(mesh)
        rows = [t.get_text() for t in ax.get_yticklabels()]
        columns = [t.get_text() for t in ax.get_xticklabels()]
        grid = np.asarray(values).reshape(len(rows), len(columns)).tolist()
        return {"kind": "heatmap", "rows": rows, "columns": columns, "values": grid}

    raise ChartMismatch(f"unsupported chart kind {kind!r}")


def _guess_kind(ax):
    """Used for panels, where each facet declares no kind of its own."""
    if ax.containers and any(getattr(c, "patches", None) for c in ax.containers):
        return "bar"
    if ax.patches:
        return "bar"
    if any(np.asarray(c.get_offsets()).size for c in ax.collections):
        return "scatter"
    if ax.lines:
        return "line"
    raise ChartMismatch("empty facet — nothing was drawn on it")


def _unmask(values):
    """Plain floats, with masked entries back as nan.

    matplotlib masks the NaNs it won't draw — a rolling mean's leading gaps on a
    line, an empty cell in a heatmap mesh. Masked entries survive float() only
    with a UserWarning, and a declared gap in a spec has to compare against a
    real nan, so fill them before anything downstream reads them.
    """
    return np.ma.filled(np.ma.asarray(values).ravel().astype(float), np.nan).tolist()


def _ydata(line):
    return _unmask(line.get_ydata())


def _mesh_values(collection):
    array = getattr(collection, "get_array", lambda: None)()
    if array is None:
        return None
    flat = _unmask(array)
    return flat if flat else None


def _boxes(ax):
    """Quartiles, fences and outliers, read off the BoxPlotContainer."""
    container = next((c for c in ax.containers if hasattr(c, "boxes")), None)
    if container is None:
        raise ChartMismatch("no box-plot container on the axes — did the call draw a boxplot?")

    boxes = []
    for i, patch in enumerate(container.boxes):
        verts = patch.get_path().vertices
        ys = sorted({round(float(v[1]), 6) for v in verts})
        q1, q3 = ys[0], ys[-1]

        median = float(container.medians[i].get_ydata()[0])
        # Two whisker lines per box: the low one then the high one.
        low = float(np.min(container.whiskers[2 * i].get_ydata()))
        high = float(np.max(container.whiskers[2 * i + 1].get_ydata()))
        fliers = container.fliers[i] if i < len(container.fliers) else None
        outliers = [float(v) for v in np.asarray(fliers.get_ydata())] if fliers is not None else []

        boxes.append(
            {"low": low, "q1": q1, "median": median, "q3": q3, "high": high, "outliers": outliers}
        )
    return boxes


def _violins(ax):
    """Summary stats plus a fixed-count density silhouette per violin.

    The silhouette is resampled to VIOLIN_BANDS half-widths so a spec carries a
    couple of dozen numbers instead of the ~200-point KDE outline. Both the
    generator and this comparison use the same resampling, so it stays exact.
    """
    polys = [c for c in ax.collections if getattr(c, "get_paths", None) and c.get_paths()]
    if not polys:
        raise ChartMismatch("no violin bodies on the axes — did the call draw a violinplot?")

    # seaborn draws three lines per violin: range, interquartile box, median.
    lines = [ln for ln in ax.lines if len(ln.get_ydata()) > 0]
    violins = []

    for i, poly in enumerate(polys):
        verts = poly.get_paths()[0].vertices
        centre = float(np.mean([v[0] for v in verts]))
        ys = np.asarray([v[1] for v in verts], dtype=float)
        xs = np.asarray([v[0] for v in verts], dtype=float)
        low, high = float(ys.min()), float(ys.max())

        widths = _resample_widths(xs, ys, centre, low, high)

        group = lines[i * 3 : i * 3 + 3]
        if len(group) < 3:
            raise ChartMismatch(f"violin {i}: expected range, box and median lines")
        range_line, box_line, median_line = group
        violins.append(
            {
                "low": float(np.min(range_line.get_ydata())),
                "q1": float(np.min(box_line.get_ydata())),
                "median": float(median_line.get_ydata()[0]),
                "q3": float(np.max(box_line.get_ydata())),
                "high": float(np.max(range_line.get_ydata())),
                "widths": widths,
            }
        )
    return violins


def _resample_widths(xs, ys, centre, low, high):
    """Normalised half-width at VIOLIN_BANDS evenly spaced heights, low→high."""
    if high == low:
        return [1.0] * VIOLIN_BANDS

    widths = []
    for band in range(VIOLIN_BANDS):
        # Sample the middle of each band rather than its edge, so the first and
        # last samples aren't pinned to the zero-width tips.
        y = low + (high - low) * (band + 0.5) / VIOLIN_BANDS
        near = np.abs(ys - y) <= (high - low) / VIOLIN_BANDS
        widths.append(float(np.max(np.abs(xs[near] - centre))) if near.any() else 0.0)

    peak = max(widths)
    return [round(w / peak, 4) if peak else 0.0 for w in widths]


def _tick_labels(ax, horizontal):
    ticks = ax.get_yticklabels() if horizontal else ax.get_xticklabels()
    return [t.get_text() for t in ticks]


def close_all():
    plt.close("all")


def _is_nan(value):
    return value != value


def compare(spec, drawn, tolerance=0.005):
    """Raise ChartMismatch describing the first disagreement, or return None.

    Values are the correctness claim and are always checked. Category labels are
    checked only when matplotlib produced a complete set of them (true for
    categorical charts, not for date or numeric axes, where the tick text is a
    formatting decision rather than the data).

    The tolerance lets specs carry values rounded for readability (a rolling
    mean is written 98.33, not 98.33333333333333) while still catching any error
    large enough to change what a learner sees.
    """
    kind = spec["kind"]

    if kind == "panels":
        want, got = spec.get("panels", []), drawn["panels"]
        if len(want) != len(got):
            raise ChartMismatch(f"spec has {len(want)} panel(s), the call drew {len(got)}")
        for i, (w, g) in enumerate(zip(want, got)):
            try:
                compare({**w, "kind": g["kind"]}, g, tolerance)
            except ChartMismatch as exc:
                raise ChartMismatch(f"panel {i}: {exc}") from exc

        # The app renders facets on one scale unless told otherwise, so the flag
        # is a truth claim about the chart and gets checked like any value.
        declared = spec.get("shareDomain", True)
        if bool(declared) != bool(drawn["shareDomain"]):
            raise ChartMismatch(
                f"spec says shareDomain={declared}, but the panels the call drew "
                f"{'do' if drawn['shareDomain'] else 'do not'} share one y-scale"
            )
        return None

    if kind == "heatmap":
        return _compare_heatmap(spec, drawn, tolerance)

    if kind == "box":
        return _compare_distribution(spec, drawn, "boxes", tolerance)

    if kind == "violin":
        return _compare_distribution(spec, drawn, "violins", tolerance)

    if kind == "scatter":
        return _compare_scatter(spec, drawn, tolerance)

    want_series = spec.get("series", [])
    got_series = drawn["series"]
    if len(want_series) != len(got_series):
        raise ChartMismatch(f"spec has {len(want_series)} series, the call drew {len(got_series)}")

    for s_index, (want, got) in enumerate(zip(want_series, got_series)):
        if len(want["values"]) != len(got["values"]):
            raise ChartMismatch(
                f"series {s_index}: spec has {len(want['values'])} value(s), "
                f"the call drew {len(got['values'])}"
            )
        for i, (w, g) in enumerate(zip(want["values"], got["values"])):
            # null in the spec is a declared gap and must line up with a real
            # nan; the two directions are checked separately so a spec can
            # neither invent a gap nor paper one over with a number.
            if w is None:
                if not _is_nan(float(g)):
                    raise ChartMismatch(
                        f"series {s_index} value {i}: spec declares a gap, the call drew {g}"
                    )
                continue
            if _is_nan(float(g)):
                raise ChartMismatch(
                    f"series {s_index} value {i}: spec {w} but the call drew nan (a gap)"
                )
            if abs(float(w) - float(g)) > tolerance:
                raise ChartMismatch(f"series {s_index} value {i}: spec {w} != drawn {g}")
        if want.get("name") and got["name"] and want["name"] != got["name"]:
            raise ChartMismatch(
                f"series {s_index}: spec name {want['name']!r} != drawn {got['name']!r}"
            )

    _compare_categories(spec, drawn)
    return None


def _compare_scatter(spec, drawn, tolerance):
    want = [[float(x), float(y)] for x, y in spec.get("points", [])]
    got = [[float(x), float(y)] for x, y in drawn["points"]]
    if len(want) != len(got):
        raise ChartMismatch(f"spec has {len(want)} point(s), the call drew {len(got)}")
    for i, (w, g) in enumerate(zip(sorted(want), sorted(got))):
        if abs(w[0] - g[0]) > tolerance or abs(w[1] - g[1]) > tolerance:
            raise ChartMismatch(f"point {i}: spec {w} != drawn {g}")

    want_fit, got_fit = spec.get("fit"), drawn.get("fit")
    if want_fit:
        if not got_fit:
            raise ChartMismatch("spec declares a fit line but the call drew none")
        for i, (w, g) in enumerate(zip(want_fit, got_fit)):
            if abs(float(w[0]) - g[0]) > tolerance or abs(float(w[1]) - g[1]) > tolerance:
                raise ChartMismatch(f"fit endpoint {i}: spec {w} != drawn {g}")
    return None


def _compare_distribution(spec, drawn, key, tolerance):
    want, got = spec.get(key, []), drawn[key]
    if len(want) != len(got):
        raise ChartMismatch(f"spec has {len(want)} {key[:-1]}(es), the call drew {len(got)}")

    for i, (w, g) in enumerate(zip(want, got)):
        for field in ("low", "q1", "median", "q3", "high"):
            if w.get(field) is None:
                continue
            if abs(float(w[field]) - float(g[field])) > tolerance:
                raise ChartMismatch(f"{key[:-1]} {i} {field}: spec {w[field]} != drawn {g[field]}")

        want_out = sorted(float(v) for v in w.get("outliers", []))
        got_out = sorted(float(v) for v in g.get("outliers", []))
        if len(want_out) != len(got_out):
            raise ChartMismatch(
                f"{key[:-1]} {i}: spec has {len(want_out)} outlier(s), the call drew {len(got_out)}"
            )
        for a, b in zip(want_out, got_out):
            if abs(a - b) > tolerance:
                raise ChartMismatch(f"{key[:-1]} {i} outlier: spec {a} != drawn {b}")

        want_widths = w.get("widths", [])
        if want_widths:
            got_widths = g.get("widths", [])
            if len(want_widths) != len(got_widths):
                raise ChartMismatch(
                    f"{key[:-1]} {i}: spec has {len(want_widths)} density band(s), "
                    f"the call drew {len(got_widths)}"
                )
            for j, (a, b) in enumerate(zip(want_widths, got_widths)):
                # The silhouette is a resampled curve, so it gets a looser
                # tolerance than the quartiles — those are exact.
                if abs(float(a) - float(b)) > 0.02:
                    raise ChartMismatch(f"{key[:-1]} {i} density band {j}: spec {a} != drawn {b}")

    _compare_categories(spec, drawn, count=len(want))
    return None


def _compare_heatmap(spec, drawn, tolerance):
    for field in ("rows", "columns"):
        want = [str(v) for v in spec.get(field, [])]
        got = [str(v) for v in drawn[field]]
        if want != got:
            raise ChartMismatch(f"heatmap {field}: spec {want} != drawn {got}")

    want_values = spec.get("values", [])
    got_values = drawn["values"]
    for r, (want_row, got_row) in enumerate(zip(want_values, got_values)):
        for c, (w, g) in enumerate(zip(want_row, got_row)):
            if w is None:
                if not _is_nan(float(g)):
                    raise ChartMismatch(f"cell [{r}][{c}]: spec declares a gap, drawn {g}")
                continue
            if abs(float(w) - float(g)) > tolerance:
                raise ChartMismatch(f"cell [{r}][{c}]: spec {w} != drawn {g}")
    return None


def _compare_categories(spec, drawn, count=None):
    declared = [str(c) for c in spec.get("categories", [])]
    if not declared:
        return

    expected = (
        count
        if count is not None
        else max((len(s["values"]) for s in spec.get("series", [])), default=0)
    )
    if len(declared) != expected:
        raise ChartMismatch(f"spec has {len(declared)} categories for {expected} value(s)")

    drawn_labels = [label for label in drawn["categories"] if label]
    # Only a complete, non-empty tick set is evidence; date and numeric axes get
    # thinned or reformatted by matplotlib and prove nothing about the data.
    if len(drawn_labels) != expected:
        return
    if declared != drawn_labels:
        raise ChartMismatch(f"categories {declared} != drawn tick labels {drawn_labels}")
