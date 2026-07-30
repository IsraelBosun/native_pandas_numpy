// Pure chart geometry — no React, no DB, no course knowledge, same discipline
// as scheduler.js and merge.js. Everything the renderer needs to place a mark is
// computed here so it can be tested without mounting a component.
//
// A chart spec is *precomputed output*: content ships the numbers a real
// pandas/matplotlib call produced (verified by scripts/verify_content.py), and
// the app only draws them. Nothing here executes or approximates pandas.

// Chart kinds mirror pandas' `kind=` argument on purpose — the thing the cards
// teach is the pandas name, so the content field uses the pandas name.
export const CHART_KINDS = [
  'bar',
  'barh',
  'line',
  'scatter',
  'hist',
  'box',
  'violin',
  'heatmap',
  'panels',
];

const CATEGORY_KINDS = ['bar', 'barh', 'line', 'hist', 'box', 'violin'];

// How many density bands a violin silhouette is drawn from. The spec ships this
// many normalised half-widths, sampled low→high; scripts/chart_extract.py uses
// the same count when it re-derives them from the real seaborn path.
export const VIOLIN_BANDS = 24;

export function isCategoryKind(kind) {
  return CATEGORY_KINDS.includes(kind);
}

/**
 * Fills in the optional parts of a chart spec so the renderer can assume a
 * fixed shape. Returns null for anything it can't draw, so a malformed spec
 * degrades to "no chart" rather than a crashed review session.
 */
function commonFields(spec) {
  return {
    title: spec.title ?? '',
    xLabel: spec.xLabel ?? '',
    yLabel: spec.yLabel ?? '',
  };
}

const EMPTY = { series: [], categories: [], points: [], boxes: [], violins: [], fit: null };

export function normalizeChart(spec) {
  if (!spec || !CHART_KINDS.includes(spec.kind)) return null;

  if (spec.kind === 'panels') {
    // Small multiples: each panel is a chart in its own right, so a malformed
    // one drops out rather than taking the whole grid down with it.
    const panels = (spec.panels ?? [])
      .map((panel) => normalizeChart(panel))
      .filter(Boolean)
      .map((panel, i) => ({ ...panel, key: `p${i}` }));
    if (panels.length === 0) return null;
    return {
      kind: 'panels',
      ...commonFields(spec),
      ...EMPTY,
      panels,
      columns: Math.max(1, spec.columns ?? 2),
      // Facets are only comparable when every panel shares one scale.
      shareDomain: spec.shareDomain !== false,
    };
  }

  if (spec.kind === 'heatmap') {
    const rows = (spec.rows ?? []).map(String);
    const columns = (spec.columns ?? []).map(String);
    const values = (spec.values ?? []).map((row) =>
      (row ?? []).map((v) => (Number.isFinite(v) ? v : null))
    );
    if (rows.length === 0 || columns.length === 0 || values.length !== rows.length) return null;
    if (values.some((row) => row.length !== columns.length)) return null;
    return { kind: 'heatmap', ...commonFields(spec), ...EMPTY, rows, columns, values };
  }

  if (spec.kind === 'scatter') {
    const points = (spec.points ?? []).filter(
      (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])
    );
    if (points.length === 0) return null;
    // An optional straight fit line (regplot); two endpoints is all a line needs.
    const fit =
      Array.isArray(spec.fit) && spec.fit.length === 2 && spec.fit.every((p) => Array.isArray(p))
        ? spec.fit
        : null;
    return {
      kind: 'scatter',
      ...commonFields(spec),
      ...EMPTY,
      points,
      fit,
      // Optional per-point group label, one per point, for hue= scatters.
      groups: Array.isArray(spec.groups) && spec.groups.length === points.length
        ? spec.groups.map(String)
        : null,
    };
  }

  if (spec.kind === 'box' || spec.kind === 'violin') {
    const key = spec.kind === 'box' ? 'boxes' : 'violins';
    const entries = (spec[key] ?? []).filter((e) => e && Number.isFinite(e.median));
    if (entries.length === 0) return null;
    const categories = (spec.categories ?? []).map(String);
    while (categories.length < entries.length) categories.push('');
    return {
      kind: spec.kind,
      ...commonFields(spec),
      ...EMPTY,
      categories: categories.slice(0, entries.length),
      [key]: entries.map((e) => ({
        low: e.low,
        q1: e.q1,
        median: e.median,
        q3: e.q3,
        high: e.high,
        outliers: (e.outliers ?? []).filter(Number.isFinite),
        widths: (e.widths ?? []).filter(Number.isFinite),
      })),
    };
  }

  const series = (spec.series ?? []).filter((s) => Array.isArray(s.values) && s.values.length > 0);
  if (series.length === 0) return null;

  const length = Math.max(...series.map((s) => s.values.length));
  const categories = (spec.categories ?? []).map(String);
  // A chart with fewer labels than points still draws; the missing ticks are
  // simply blank rather than shifting every bar out of alignment.
  while (categories.length < length) categories.push('');

  return {
    kind: spec.kind,
    ...commonFields(spec),
    ...EMPTY,
    categories: categories.slice(0, length),
    series: series.map((s) => ({
      name: s.name ?? '',
      values: s.values.map((v) => (Number.isFinite(v) ? v : null)),
    })),
  };
}

/**
 * Where a card's chart belongs. 'prompt' is for cards that ask you to read a
 * chart ("which call produced this?"); everything else shows the chart as the
 * result, on reveal, so it can't give the answer away.
 */
export function chartPosition(spec) {
  return spec?.position === 'prompt' ? 'prompt' : 'answer';
}

/**
 * Value-axis domain. Always includes zero for the kinds drawn as filled marks —
 * a bar that doesn't start at zero misstates the value it encodes.
 */
function domainValues(chart) {
  if (chart.kind === 'scatter') {
    return [...chart.points.map((p) => p[1]), ...(chart.fit ?? []).map((p) => p[1])];
  }
  if (chart.kind === 'box' || chart.kind === 'violin') {
    const entries = chart.kind === 'box' ? chart.boxes : chart.violins;
    return entries.flatMap((e) => [e.low, e.high, e.median, ...e.outliers]).filter(Number.isFinite);
  }
  if (chart.kind === 'heatmap') {
    return chart.values.flat().filter((v) => v !== null);
  }
  return chart.series.flatMap((s) => s.values).filter((v) => v !== null);
}

// Kinds whose marks are filled from a baseline must include zero, or the bar
// length misstates the value. Distribution and point marks must not — forcing
// zero into a box plot squashes every box into the top of the plot.
const ZERO_ANCHORED = ['bar', 'barh', 'line', 'hist'];

export function valueDomain(chart) {
  // A panel grid's shared scale is the union of what each panel would pick on
  // its own — so a grid of bar charts still gets the zero anchor its bars need.
  if (chart.kind === 'panels') {
    const domains = chart.panels.map((panel) => valueDomain(panel));
    return [
      Math.min(...domains.map(([min]) => min)),
      Math.max(...domains.map(([, max]) => max)),
    ];
  }

  const values = domainValues(chart);

  if (values.length === 0) return [0, 1];

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (ZERO_ANCHORED.includes(chart.kind)) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }

  if (min === max) {
    // A flat series still needs a drawable range.
    if (max === 0) return [0, 1];
    if (ZERO_ANCHORED.includes(chart.kind)) return max > 0 ? [0, max] : [min, 0];
    // Nothing to anchor to, so pad around the single value.
    const pad = Math.abs(max) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  return [min, max];
}

export function scatterXDomain(chart) {
  const xs = chart.points.map((p) => p[0]);
  if (xs.length === 0) return [0, 1];
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

/**
 * Maps a value in `domain` onto `size` pixels. Returns 0 for a degenerate
 * domain instead of NaN, so a bad spec can never produce a NaN style.
 */
export function scale(value, domain, size) {
  const [min, max] = domain;
  if (!Number.isFinite(value) || max === min) return 0;
  return ((value - min) / (max - min)) * size;
}

/**
 * Clean axis ticks (…, 0, 25, 50, …) rather than raw data extremes, so the
 * numbers the reader checks against are round ones.
 */
export function niceTicks(domain, targetCount = 3) {
  const [min, max] = domain;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];

  const rawStep = (max - min) / Math.max(1, targetCount);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const stepMultiple = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = stepMultiple * magnitude;

  const ticks = [];
  const start = Math.ceil(min / step) * step;
  for (let t = start; t <= max + step / 1000; t += step) {
    // Floating-point steps accumulate error; round to the step's own precision.
    const decimals = Math.max(0, -Math.floor(Math.log10(step)));
    ticks.push(Number(t.toFixed(decimals)));
  }
  return ticks.length > 0 ? ticks : [min, max];
}

/**
 * Bar thickness for a band. Capped so a two-bar chart doesn't render two
 * slabs — the leftover band width is deliberate air (dataviz mark spec).
 */
export function barThickness(bandSize, maxThickness = 24, gap = 2) {
  return Math.max(2, Math.min(maxThickness, bandSize - gap));
}

/**
 * Line segments as {x, y, length, angle} so a renderer with no SVG can draw
 * each one as a rotated 2px view. Skips gaps where a value is missing.
 */
export function lineSegments(values, { width, height, domain }) {
  const points = pointPositions(values, { width, height, domain });
  const segments = [];

  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    if (!from || !to) continue;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) continue;
    segments.push({
      x: from.x,
      y: from.y,
      length,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    });
  }
  return segments;
}

/**
 * Pixel positions for each value, y measured downward from the top of the plot
 * (React Native's coordinate direction). null for missing values.
 */
export function pointPositions(values, { width, height, domain }) {
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((value, i) => {
    if (value === null || !Number.isFinite(value)) return null;
    return {
      x: values.length > 1 ? i * step : width / 2,
      y: height - scale(value, domain, height),
    };
  });
}

/**
 * Index of the value worth direct-labelling — the extreme. Charts label one
 * point, not every point; the axis carries the rest.
 */
export function extremeIndex(values) {
  let best = -1;
  let bestValue = -Infinity;
  values.forEach((value, i) => {
    if (value === null) return;
    if (Math.abs(value) > bestValue) {
      bestValue = Math.abs(value);
      best = i;
    }
  });
  return best;
}

/**
 * The single mark worth labelling across every series — the biggest one on the
 * chart. Labelling series 0's extreme instead would put a number on a shorter
 * bar while the tallest one next to it goes unlabelled, which reads as a bug.
 */
export function globalExtreme(series) {
  let best = null;
  series.forEach((s, seriesIndex) => {
    const index = extremeIndex(s.values);
    if (index < 0) return;
    const value = s.values[index];
    if (best === null || Math.abs(value) > Math.abs(best.value)) {
      best = { seriesIndex, index, value };
    }
  });
  return best;
}

/**
 * Keeps a label box inside the plot, so a value at either edge is nudged in
 * rather than clipped by the surface.
 */
export function clampLabel(left, width, plotWidth) {
  return Math.max(0, Math.min(left, plotWidth - width));
}

/**
 * Axis-tick / direct-label formatting: round all displayed numbers (CLAUDE.md
 * §8) and compact the big ones so a tick never wraps.
 */
export function formatValue(value) {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${trimZero(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${trimZero(value / 1_000)}K`;
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(abs < 1 ? 2 : 1)));
}

function trimZero(value) {
  return String(Number(value.toFixed(1)));
}

// ---------------------------------------------------------------------------
// Layout
//
// Everything above computes one number; layoutChart puts a whole chart together
// and hands the renderer a flat list of positioned marks. Keeping it here rather
// than in the component means the layout is unit-testable and can be rendered
// by a preview script without a device — the same reason scheduler.js is pure.
// ---------------------------------------------------------------------------

export const LAYOUT = {
  labelLane: 16, // headroom so the tallest bar's direct label isn't clipped
  tipLane: 40, // room to the right of a barh bar for its tip label
  valueGutter: 34, // left column for value-axis ticks
  categoryGutter: 62, // left column for barh category names
  marker: 9,
  maxBarThickness: 24,
  maxXLabels: 6,
  maxBoxThickness: 40, // a box carries more shape than a bar, so it earns width
  maxViolinWidth: 44,
  panelGap: 10, // surface gap between small multiples
  // These two mirror chart-view.jsx (styles.xAxisRow height + margin, and the
  // panel caption's line + margin). They sit below/above the plot rather than
  // inside it, so only a panel grid — which stacks plots — has to reserve them.
  xTickLane: 20,
  panelTitleLane: 15,
  panelPlot: 72, // plot height each facet earns before the card grows instead
};

const TIP_GAP = 4; // breathing room between a barh bar's end and its label

/**
 * The height a spec should be given, so the caller doesn't have to guess.
 *
 * Everything except a panel grid is happy in one plot's worth of space. A grid
 * stacks whole plots — each with its own caption and tick row — so it grows to
 * give every facet the same readable plot area rather than dividing one card
 * height by the row count and making a 2x2 unreadable.
 */
export function preferredHeight(spec, base) {
  const chart = normalizeChart(spec);
  if (!chart || chart.kind !== 'panels') return base;

  const columns = Math.min(chart.columns, chart.panels.length);
  const rows = Math.ceil(chart.panels.length / columns);
  const titleLane = chart.panels.some((panel) => panel.title) ? LAYOUT.panelTitleLane : 0;
  const perRow = LAYOUT.panelPlot + LAYOUT.labelLane + LAYOUT.xTickLane + titleLane;
  return rows * perRow + LAYOUT.panelGap * (rows - 1);
}

/**
 * `domainOverride` pins the value axis to a range chosen elsewhere — used by
 * small multiples so every facet shares one scale and stays comparable.
 */
export function layoutChart(spec, { width, height, domainOverride }) {
  const chart = normalizeChart(spec);
  if (!chart || !(width > 0) || !(height > 0)) return null;

  if (chart.kind === 'panels') return layoutPanels(chart, { width, height });
  if (chart.kind === 'heatmap') return layoutHeatmap(chart, { width, height });

  const horizontal = chart.kind === 'barh';
  const gutter = horizontal ? LAYOUT.categoryGutter : LAYOUT.valueGutter;
  const plotWidth = Math.max(0, width - gutter - (horizontal ? LAYOUT.tipLane : 0));
  const plotHeight = Math.max(0, height - LAYOUT.labelLane);
  const domain = domainOverride ?? valueDomain(chart);
  const ticks = niceTicks(domain, 3);

  const base = {
    kind: chart.kind,
    title: chart.title,
    axisLabel: [chart.yLabel && `y: ${chart.yLabel}`, chart.xLabel && `x: ${chart.xLabel}`]
      .filter(Boolean)
      .join('   '),
    gutter,
    plotWidth,
    plotHeight,
    labelLane: LAYOUT.labelLane,
    boxHeight: height,
    bars: [],
    lines: [],
    dots: [],
    gridlines: [],
    valueTicks: [],
    categoryTicks: [],
    xTicks: [],
    directLabels: [],
    whiskers: [],
    medians: [],
    bands: [],
    cells: [],
    panels: [],
    // A single series needs no legend — the title names it.
    legend:
      chart.series.length > 1
        ? chart.series.map((s, i) => ({ key: s.name || `s${i}`, name: s.name, colorIndex: i }))
        : [],
  };

  if (plotWidth === 0 || plotHeight === 0) return base;

  if (horizontal) return layoutBarh(chart, base, { domain, ticks });
  if (chart.kind === 'scatter') return layoutScatter(chart, base, { domain });

  // Line markers draw on an inset box (see layoutLine), so its gridlines have
  // to be inset by the same amount or the ticks won't line up with the points.
  const tickInset = chart.kind === 'line' ? markInset() : 0;
  const tickHeight = plotHeight - tickInset * 2;
  const tickY = (tick) => tickHeight - scale(tick, domain, tickHeight) + tickInset;

  base.gridlines = ticks.map((tick) => ({ key: `g${tick}`, y: tickY(tick) }));
  base.valueTicks = ticks.map((tick) => ({
    key: `t${tick}`,
    text: formatValue(tick),
    y: tickY(tick),
  }));

  if (chart.kind === 'line') return layoutLine(chart, base, { domain });
  if (chart.kind === 'box') return layoutBoxes(chart, base, { domain });
  if (chart.kind === 'violin') return layoutViolins(chart, base, { domain });
  return layoutColumns(chart, base, { domain });
}

function categoryTicks(chart, plotWidth, { centred, inset = 0 }) {
  const count = chart.categories.length;
  const stride = Math.ceil(count / LAYOUT.maxXLabels);
  const band = plotWidth / count;
  const pointSpan = plotWidth - inset * 2;
  const labelWidth = 48;

  return chart.categories.flatMap((label, i) => {
    if (i % stride !== 0) return [];
    // Line points sit *on* their coordinate, bars sit inside a band — so the
    // label hangs off a fixed-width box centred on the point, or fills the band.
    const left = centred
      ? clampLabel(
          (count > 1 ? (i * pointSpan) / (count - 1) : pointSpan / 2) + inset - labelWidth / 2,
          labelWidth,
          plotWidth
        )
      : i * band;
    return [
      { key: `x${i}`, text: label, left, width: centred ? labelWidth : band, align: 'center' },
    ];
  });
}

function layoutColumns(chart, base, { domain }) {
  const { plotWidth, plotHeight } = base;
  const band = plotWidth / chart.categories.length;
  const subBand = band / chart.series.length;
  const thickness = barThickness(
    subBand,
    chart.kind === 'hist' ? subBand : LAYOUT.maxBarThickness
  );
  const zeroY = plotHeight - scale(0, domain, plotHeight);

  chart.series.forEach((series, s) => {
    series.values.forEach((value, i) => {
      if (value === null) return;
      const valueY = plotHeight - scale(value, domain, plotHeight);
      const up = value >= 0;
      base.bars.push({
        key: `${s}-${i}`,
        x: i * band + s * subBand + (subBand - thickness) / 2,
        y: Math.min(valueY, zeroY),
        width: thickness,
        height: Math.max(1, Math.abs(zeroY - valueY)),
        colorIndex: s,
        // Rounded data-end, square where it meets the baseline.
        radius: { tl: up ? 4 : 0, tr: up ? 4 : 0, bl: up ? 0 : 4, br: up ? 0 : 4 },
      });
    });
  });

  const extreme = globalExtreme(chart.series);
  if (extreme) {
    // Centre the label on the bar it belongs to, which in a grouped chart is a
    // sub-band, not the whole band.
    const bar = base.bars.find((b) => b.key === `${extreme.seriesIndex}-${extreme.index}`);
    base.directLabels.push({
      key: 'extreme',
      text: formatValue(extreme.value),
      left: clampLabel(bar.x + bar.width / 2 - band / 2, band, plotWidth),
      width: band,
      top: Math.min(plotHeight - scale(extreme.value, domain, plotHeight), zeroY) - LAYOUT.labelLane,
      align: 'center',
    });
  }

  base.xTicks = categoryTicks(chart, plotWidth, { centred: false });
  base.baselineY = plotHeight;
  return base;
}

function layoutBarh(chart, base, { domain, ticks }) {
  const { plotWidth, plotHeight } = base;
  const band = plotHeight / chart.categories.length;
  const subBand = band / chart.series.length;
  const thickness = barThickness(subBand, LAYOUT.maxBarThickness);
  const zeroX = scale(0, domain, plotWidth);

  chart.series.forEach((series, s) => {
    series.values.forEach((value, i) => {
      if (value === null) return;
      const valueX = scale(value, domain, plotWidth);
      const right = value >= 0;
      base.bars.push({
        key: `${s}-${i}`,
        x: Math.min(valueX, zeroX),
        y: i * band + s * subBand + (subBand - thickness) / 2,
        width: Math.max(1, Math.abs(valueX - zeroX)),
        height: thickness,
        colorIndex: s,
        radius: { tl: right ? 0 : 4, tr: right ? 4 : 0, bl: right ? 0 : 4, br: right ? 4 : 0 },
      });
    });
  });

  const extreme = extremeIndex(chart.series[0].values);
  if (extreme >= 0) {
    const value = chart.series[0].values[extreme];
    base.directLabels.push({
      key: 'extreme',
      text: formatValue(value),
      left: scale(value, domain, plotWidth) + TIP_GAP,
      // The lane covers the gap plus the text, so the longest bar's label
      // still ends inside the box rather than being clipped.
      width: LAYOUT.tipLane - TIP_GAP,
      top: extreme * band + (band - 14) / 2,
      align: 'left',
    });
  }

  base.categoryTicks = chart.categories.map((label, i) => ({
    key: `c${i}`,
    text: label,
    top: i * band,
    height: band,
  }));
  base.xTicks = ticks.map((tick) => ({
    key: `x${tick}`,
    text: formatValue(tick),
    left: scale(tick, domain, plotWidth) - 16,
    width: 32,
    align: 'center',
  }));
  base.baselineY = plotHeight;
  return base;
}

// Round marks sit *on* their coordinate, so a point at either end of a domain
// would hang half outside the plot. Inset the drawable box by the marker radius
// and shift everything in by the same amount.
function markInset() {
  return LAYOUT.marker / 2;
}

function layoutLine(chart, base, { domain }) {
  const { plotWidth, plotHeight } = base;
  const inset = markInset();
  const box = {
    width: Math.max(0, plotWidth - LAYOUT.marker),
    height: Math.max(0, plotHeight - LAYOUT.marker),
    domain,
  };

  chart.series.forEach((series, s) => {
    lineSegments(series.values, box).forEach((segment, i) => {
      base.lines.push({
        key: `${s}-${i}`,
        ...segment,
        x: segment.x + inset,
        y: segment.y + inset,
        colorIndex: s,
      });
    });
    pointPositions(series.values, box).forEach((point, i) => {
      if (!point) return;
      base.dots.push({
        key: `${s}-${i}`,
        x: point.x + inset,
        y: point.y + inset,
        size: LAYOUT.marker,
        colorIndex: s,
      });
    });
  });

  const extreme = globalExtreme(chart.series);
  if (extreme) {
    const positions = pointPositions(chart.series[extreme.seriesIndex].values, box);
    const x = (positions[extreme.index]?.x ?? 0) + inset;
    base.directLabels.push({
      key: 'extreme',
      text: formatValue(extreme.value),
      left: clampLabel(x - LAYOUT.tipLane / 2, LAYOUT.tipLane, plotWidth),
      width: LAYOUT.tipLane,
      top: box.height - scale(extreme.value, domain, box.height) + inset - LAYOUT.labelLane - 2,
      align: 'center',
    });
  }

  base.xTicks = categoryTicks(chart, plotWidth, { centred: true, inset });
  base.baselineY = plotHeight;
  return base;
}

// A box plot's marks: the interquartile box, a median rule across it, whisker
// rules out to the fences, and any outliers as dots.
function layoutBoxes(chart, base, { domain }) {
  const { plotWidth, plotHeight } = base;
  const band = plotWidth / chart.boxes.length;
  const thickness = barThickness(band, LAYOUT.maxBoxThickness);
  const y = (value) => plotHeight - scale(value, domain, plotHeight);

  chart.boxes.forEach((box, i) => {
    const centre = i * band + band / 2;
    const left = centre - thickness / 2;

    base.bars.push({
      key: `box-${i}`,
      x: left,
      y: y(box.q3),
      width: thickness,
      height: Math.max(1, y(box.q1) - y(box.q3)),
      colorIndex: 0,
      // A box is not anchored to a baseline, so both ends are rounded.
      radius: { tl: 4, tr: 4, bl: 4, br: 4 },
    });

    // The vertical whisker stem, then a short cap rule at each fence.
    base.whiskers.push(
      { key: `stem-${i}`, x: centre - 1, y: y(box.high), width: 2, height: Math.max(1, y(box.low) - y(box.high)) },
      { key: `caphigh-${i}`, x: centre - thickness / 4, y: y(box.high), width: thickness / 2, height: 2 },
      { key: `caplow-${i}`, x: centre - thickness / 4, y: y(box.low) - 2, width: thickness / 2, height: 2 }
    );

    base.medians.push({
      key: `median-${i}`,
      x: left,
      y: y(box.median) - 1,
      width: thickness,
      height: 2,
    });

    box.outliers.forEach((value, j) => {
      base.dots.push({
        key: `out-${i}-${j}`,
        x: centre,
        y: y(value),
        size: LAYOUT.marker - 2,
        colorIndex: 0,
      });
    });
  });

  base.xTicks = categoryTicks(chart, plotWidth, { centred: false });
  base.baselineY = plotHeight;
  return base;
}

// A violin is drawn as a stack of horizontal bands whose widths follow the
// density the spec shipped — the same silhouette, made of boxes.
function layoutViolins(chart, base, { domain }) {
  const { plotWidth, plotHeight } = base;
  const band = plotWidth / chart.violins.length;
  const maxWidth = barThickness(band, LAYOUT.maxViolinWidth);
  const y = (value) => plotHeight - scale(value, domain, plotHeight);

  chart.violins.forEach((violin, i) => {
    const centre = i * band + band / 2;
    const widths = violin.widths.length > 0 ? violin.widths : [1];
    const top = y(violin.high);
    const bottom = y(violin.low);
    const bandHeight = Math.max(1, (bottom - top) / widths.length);

    widths.forEach((width, j) => {
      const half = Math.max(0.5, (width * maxWidth) / 2);
      base.bands.push({
        key: `band-${i}-${j}`,
        // Bands are stacked from the low end upward, matching the spec order.
        x: centre - half,
        y: bottom - (j + 1) * bandHeight,
        width: half * 2,
        height: bandHeight + 0.5, // overlap slightly so the silhouette has no seams
        colorIndex: 0,
      });
    });

    base.medians.push({
      key: `median-${i}`,
      x: centre - maxWidth / 4,
      y: y(violin.median) - 1,
      width: maxWidth / 2,
      height: 2,
    });
  });

  base.xTicks = categoryTicks(chart, plotWidth, { centred: false });
  base.baselineY = plotHeight;
  return base;
}

// A heatmap spends its whole plot area on the grid: no value axis, because
// colour carries magnitude and every cell shows its own number.
function layoutHeatmap(chart, { width, height }) {
  const gutter = LAYOUT.categoryGutter;
  const plotWidth = Math.max(0, width - gutter);
  const plotHeight = Math.max(0, height);
  const domain = valueDomain(chart);

  const base = {
    kind: 'heatmap',
    ...commonFields(chart),
    axisLabel: [chart.yLabel && `y: ${chart.yLabel}`, chart.xLabel && `x: ${chart.xLabel}`]
      .filter(Boolean)
      .join('   '),
    gutter,
    plotWidth,
    plotHeight,
    labelLane: 0,
    boxHeight: height,
    baselineY: plotHeight,
    bars: [],
    lines: [],
    dots: [],
    gridlines: [],
    valueTicks: [],
    categoryTicks: [],
    xTicks: [],
    directLabels: [],
    whiskers: [],
    medians: [],
    bands: [],
    cells: [],
    panels: [],
    legend: [],
  };
  if (plotWidth === 0 || plotHeight === 0) return base;

  const cellWidth = plotWidth / chart.columns.length;
  const cellHeight = plotHeight / chart.rows.length;
  const [min, max] = domain;

  chart.values.forEach((row, r) => {
    row.forEach((value, c) => {
      base.cells.push({
        key: `${r}-${c}`,
        x: c * cellWidth,
        y: r * cellHeight,
        // A 2px gap in the surface colour is what separates touching cells.
        width: Math.max(1, cellWidth - 2),
        height: Math.max(1, cellHeight - 2),
        // Position on the ramp, 0..1; the renderer picks the step.
        intensity: value === null || max === min ? 0 : (value - min) / (max - min),
        text: value === null ? '' : formatValue(value),
        empty: value === null,
      });
    });
  });

  base.categoryTicks = chart.rows.map((label, i) => ({
    key: `r${i}`,
    text: label,
    top: i * cellHeight,
    height: cellHeight,
  }));
  base.xTicks = chart.columns.map((label, i) => ({
    key: `c${i}`,
    text: label,
    left: i * cellWidth,
    width: cellWidth,
    align: 'center',
  }));
  return base;
}

// Small multiples. Each panel is laid out independently in its own box, then
// re-scaled onto one shared domain so the facets are actually comparable.
function layoutPanels(chart, { width, height }) {
  const columns = Math.min(chart.columns, chart.panels.length);
  const rows = Math.ceil(chart.panels.length / columns);
  const panelWidth = Math.max(0, (width - LAYOUT.panelGap * (columns - 1)) / columns);
  const panelHeight = Math.max(0, (height - LAYOUT.panelGap * (rows - 1)) / rows);

  const shared = chart.shareDomain ? valueDomain(chart) : null;

  // A panel box has to hold its caption and its own row of x tick labels as well
  // as the plot — both sit outside plotHeight, and the boxes are positioned
  // absolutely, so anything unreserved lands on top of the row underneath.
  const titleLane = chart.panels.some((panel) => panel.title) ? LAYOUT.panelTitleLane : 0;
  const innerHeight = Math.max(0, panelHeight - titleLane - LAYOUT.xTickLane);

  const panels = chart.panels.map((panel, i) => {
    const layout = layoutChart(panel, {
      width: panelWidth,
      height: innerHeight,
      domainOverride: shared ?? undefined,
    });
    return {
      key: `p${i}`,
      title: panel.title,
      column: i % columns,
      row: Math.floor(i / columns),
      x: (i % columns) * (panelWidth + LAYOUT.panelGap),
      y: Math.floor(i / columns) * (panelHeight + LAYOUT.panelGap),
      width: panelWidth,
      height: panelHeight,
      layout,
    };
  });

  return {
    kind: 'panels',
    ...commonFields(chart),
    axisLabel: [chart.yLabel && `y: ${chart.yLabel}`, chart.xLabel && `x: ${chart.xLabel}`]
      .filter(Boolean)
      .join('   '),
    gutter: 0,
    plotWidth: width,
    plotHeight: height,
    labelLane: 0,
    boxHeight: height,
    baselineY: height,
    columns,
    rows,
    titleLane,
    panels,
    bars: [],
    lines: [],
    dots: [],
    gridlines: [],
    valueTicks: [],
    categoryTicks: [],
    xTicks: [],
    directLabels: [],
    whiskers: [],
    medians: [],
    bands: [],
    cells: [],
    legend: [],
  };
}

function layoutScatter(chart, base, { domain }) {
  const { plotWidth, plotHeight } = base;
  const inset = markInset();
  const drawWidth = Math.max(0, plotWidth - LAYOUT.marker);
  const drawHeight = Math.max(0, plotHeight - LAYOUT.marker);
  const xDomain = scatterXDomain(chart);
  const ticks = niceTicks(domain, 3);

  base.gridlines = ticks.map((tick) => ({
    key: `g${tick}`,
    y: drawHeight - scale(tick, domain, drawHeight) + inset,
  }));
  base.valueTicks = ticks.map((tick) => ({
    key: `t${tick}`,
    text: formatValue(tick),
    y: drawHeight - scale(tick, domain, drawHeight) + inset,
  }));
  // hue= scatters colour by group; the palette slot follows the group's first
  // appearance, so a colour always means the same group.
  const groupOrder = chart.groups ? [...new Set(chart.groups)] : null;

  base.dots = chart.points.map(([x, y], i) => ({
    key: `p${i}`,
    x: scale(x, xDomain, drawWidth) + inset,
    y: drawHeight - scale(y, domain, drawHeight) + inset,
    size: LAYOUT.marker,
    colorIndex: groupOrder ? groupOrder.indexOf(chart.groups[i]) : 0,
  }));

  if (groupOrder && groupOrder.length > 1) {
    base.legend = groupOrder.map((name, i) => ({ key: name, name, colorIndex: i }));
  }

  if (chart.fit) {
    const [a, b] = chart.fit;
    const x0 = scale(a[0], xDomain, drawWidth) + inset;
    const y0 = drawHeight - scale(a[1], domain, drawHeight) + inset;
    const x1 = scale(b[0], xDomain, drawWidth) + inset;
    const y1 = drawHeight - scale(b[1], domain, drawHeight) + inset;
    const dx = x1 - x0;
    const dy = y1 - y0;
    base.lines.push({
      key: 'fit',
      x: x0,
      y: y0,
      length: Math.sqrt(dx * dx + dy * dy),
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      // The fit is a second visual element on the same data, so it takes the
      // next palette slot rather than restating the points' colour.
      colorIndex: 1,
    });
  }

  base.baselineY = plotHeight;
  return base;
}
