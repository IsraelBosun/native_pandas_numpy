// Covers the distribution and grid chart kinds (box, violin, heatmap) plus
// small multiples. The bar/line/scatter basics live in chart.test.js.
import { describe, expect, it } from 'vitest';

import { LAYOUT, layoutChart, normalizeChart, preferredHeight, valueDomain } from './chart';

const boxSpec = {
  kind: 'box',
  categories: ['Shoes', 'Bags'],
  boxes: [
    { low: 50, q1: 65, median: 82.5, q3: 101.25, high: 120 },
    { low: 45, q1: 56.25, median: 62.5, q3: 68.75, high: 80 },
  ],
};

const heatmapSpec = {
  kind: 'heatmap',
  rows: ['East', 'North', 'West'],
  columns: ['Bags', 'Shoes'],
  values: [
    [60, 165],
    [65, 50],
    [125, 120],
  ],
};

const panelsSpec = {
  kind: 'panels',
  columns: 2,
  panels: [
    { title: 'West', kind: 'bar', categories: ['Bags', 'Shoes'], series: [{ values: [125, 120] }] },
    { title: 'East', kind: 'bar', categories: ['Bags', 'Shoes'], series: [{ values: [60, 165] }] },
    { title: 'North', kind: 'bar', categories: ['Bags', 'Shoes'], series: [{ values: [65, 50] }] },
  ],
};

const BOX = { width: 320, height: 160 };

describe('normalizeChart — distribution and grid kinds', () => {
  it('fills a box spec optional fields', () => {
    const chart = normalizeChart({
      kind: 'box',
      categories: ['Shoes'],
      boxes: [{ low: 50, q1: 65, median: 82.5, q3: 101.25, high: 120 }],
    });
    expect(chart.boxes[0].outliers).toEqual([]);
    expect(chart.categories).toEqual(['Shoes']);
  });

  it('rejects a box entry with no median to anchor it', () => {
    expect(normalizeChart({ kind: 'box', boxes: [{ low: 1, high: 2 }] })).toBeNull();
  });

  it('rejects a heatmap whose value grid does not match its labels', () => {
    expect(
      normalizeChart({ kind: 'heatmap', rows: ['a', 'b'], columns: ['x'], values: [[1]] })
    ).toBeNull();
    expect(
      normalizeChart({ kind: 'heatmap', rows: ['a'], columns: ['x', 'y'], values: [[1]] })
    ).toBeNull();
  });

  it('accepts a well-formed heatmap', () => {
    expect(normalizeChart(heatmapSpec).values).toEqual(heatmapSpec.values);
  });

  it('drops a malformed panel but keeps the grid', () => {
    const chart = normalizeChart({
      kind: 'panels',
      panels: [
        { kind: 'bar', categories: ['a'], series: [{ values: [1] }] },
        { kind: 'pie', series: [] },
      ],
    });
    expect(chart.panels).toHaveLength(1);
  });

  it('returns null when no panel survives', () => {
    expect(normalizeChart({ kind: 'panels', panels: [{ kind: 'pie' }] })).toBeNull();
  });

  it('keeps a scatter fit line only when it has two endpoints', () => {
    expect(
      normalizeChart({ kind: 'scatter', points: [[1, 2]], fit: [[1, 2], [3, 4]] }).fit
    ).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(normalizeChart({ kind: 'scatter', points: [[1, 2]], fit: [[1, 2]] }).fit).toBeNull();
  });

  it('keeps scatter groups only when there is one per point', () => {
    const points = [
      [1, 2],
      [3, 4],
    ];
    expect(normalizeChart({ kind: 'scatter', points, groups: ['a', 'b'] }).groups).toEqual([
      'a',
      'b',
    ]);
    expect(normalizeChart({ kind: 'scatter', points, groups: ['a'] }).groups).toBeNull();
  });
});

describe('valueDomain — kinds that must not be pinned to zero', () => {
  it('does not force zero into a box plot, which would squash every box', () => {
    expect(valueDomain(normalizeChart(boxSpec))).toEqual([45, 120]);
  });

  it('includes outliers so they stay on the chart', () => {
    const chart = normalizeChart({
      kind: 'box',
      boxes: [{ low: 50, q1: 65, median: 82.5, q3: 101.25, high: 120, outliers: [200] }],
    });
    expect(valueDomain(chart)).toEqual([50, 200]);
  });

  it('pads around a single flat value instead of collapsing', () => {
    const chart = normalizeChart({
      kind: 'box',
      boxes: [{ low: 10, q1: 10, median: 10, q3: 10, high: 10 }],
    });
    const [min, max] = valueDomain(chart);
    expect(max).toBeGreaterThan(min);
  });

  it('spans every panel so shared facets are comparable', () => {
    expect(valueDomain(normalizeChart(panelsSpec))).toEqual([0, 165]);
  });

  it('covers a scatter fit line that runs past the points', () => {
    const chart = normalizeChart({ kind: 'scatter', points: [[1, 50]], fit: [[0, 10], [2, 90]] });
    expect(valueDomain(chart)).toEqual([10, 90]);
  });
});

describe('layoutChart — box plots', () => {
  it('draws the interquartile box, a median rule and whiskers to the fences', () => {
    const layout = layoutChart(boxSpec, BOX);
    expect(layout.bars).toHaveLength(2);
    expect(layout.medians).toHaveLength(2);
    expect(layout.whiskers).toHaveLength(6); // stem + two caps per box

    const [first] = layout.bars;
    // A box has no baseline, so both ends are rounded.
    expect(first.radius).toEqual({ tl: 4, tr: 4, bl: 4, br: 4 });
    // The median rule falls inside the box it belongs to.
    expect(layout.medians[0].y).toBeGreaterThan(first.y);
    expect(layout.medians[0].y).toBeLessThan(first.y + first.height);
  });

  it('keeps the whole box, whiskers and median inside the plot', () => {
    const layout = layoutChart(boxSpec, BOX);
    [...layout.bars, ...layout.whiskers, ...layout.medians].forEach((mark) => {
      expect(mark.x).toBeGreaterThanOrEqual(-0.001);
      expect(mark.x + mark.width).toBeLessThanOrEqual(layout.plotWidth + 0.001);
      expect(mark.y).toBeGreaterThanOrEqual(-0.001);
      expect(mark.y + mark.height).toBeLessThanOrEqual(layout.plotHeight + 0.001);
    });
  });

  it('puts outliers on the chart as dots', () => {
    const layout = layoutChart(
      {
        kind: 'box',
        categories: ['a'],
        boxes: [{ low: 50, q1: 65, median: 82, q3: 101, high: 120, outliers: [200] }],
      },
      BOX
    );
    expect(layout.dots).toHaveLength(1);
    expect(layout.dots[0].y).toBeGreaterThanOrEqual(0);
  });

  it('names each category under its box', () => {
    expect(layoutChart(boxSpec, BOX).xTicks.map((t) => t.text)).toEqual(['Shoes', 'Bags']);
  });
});

describe('layoutChart — violins', () => {
  const violinSpec = {
    kind: 'violin',
    categories: ['a'],
    violins: [{ low: 0, q1: 25, median: 50, q3: 75, high: 100, widths: [0.2, 1, 0.4] }],
  };

  it('builds the silhouette from one band per density sample', () => {
    const layout = layoutChart(violinSpec, BOX);
    expect(layout.bands).toHaveLength(3);
    // The widest band is the densest sample, not the first or last.
    const widest = layout.bands.reduce((a, b) => (a.width > b.width ? a : b));
    expect(widest.key).toBe('band-0-1');
  });

  it('stacks bands upward from the low end, inside the plot', () => {
    const layout = layoutChart(violinSpec, BOX);
    layout.bands.forEach((band) => {
      expect(band.y).toBeGreaterThanOrEqual(-0.001);
      expect(band.y + band.height).toBeLessThanOrEqual(layout.plotHeight + 1);
    });
    // Later samples sit higher up (smaller y) than earlier ones.
    expect(layout.bands[2].y).toBeLessThan(layout.bands[0].y);
  });

  it('centres every band on the category, symmetrically', () => {
    const layout = layoutChart(violinSpec, BOX);
    const centres = layout.bands.map((b) => b.x + b.width / 2);
    centres.forEach((c) => expect(c).toBeCloseTo(centres[0], 5));
  });

  it('still draws something when a spec carries no density samples', () => {
    const layout = layoutChart(
      { kind: 'violin', categories: ['a'], violins: [{ low: 0, median: 5, high: 10 }] },
      BOX
    );
    expect(layout.bands).toHaveLength(1);
  });
});

describe('layoutChart — heatmap', () => {
  it('lays one cell per value with a surface gap between them', () => {
    const layout = layoutChart(heatmapSpec, BOX);
    expect(layout.cells).toHaveLength(6);
    expect(layout.cells[0].width).toBeCloseTo(layout.plotWidth / 2 - 2, 5);
  });

  it('scales intensity across the value range, low to high', () => {
    const layout = layoutChart(heatmapSpec, BOX);
    expect(layout.cells.find((c) => c.text === '50').intensity).toBe(0);
    expect(layout.cells.find((c) => c.text === '165').intensity).toBe(1);
  });

  it('labels every cell, so a value never depends on colour alone', () => {
    layoutChart(heatmapSpec, BOX).cells.forEach((cell) => expect(cell.text).not.toBe(''));
  });

  it('spends no room on a value axis and names rows down the side', () => {
    const layout = layoutChart(heatmapSpec, BOX);
    expect(layout.valueTicks).toEqual([]);
    expect(layout.categoryTicks.map((t) => t.text)).toEqual(['East', 'North', 'West']);
    expect(layout.xTicks.map((t) => t.text)).toEqual(['Bags', 'Shoes']);
  });

  it('marks a missing cell as empty rather than as a zero', () => {
    const layout = layoutChart(
      { kind: 'heatmap', rows: ['a'], columns: ['x', 'y'], values: [[null, 5]] },
      BOX
    );
    expect(layout.cells[0].empty).toBe(true);
    expect(layout.cells[0].text).toBe('');
  });

  it('keeps every cell inside the grid', () => {
    const layout = layoutChart(heatmapSpec, BOX);
    layout.cells.forEach((cell) => {
      expect(cell.x + cell.width).toBeLessThanOrEqual(layout.plotWidth + 0.001);
      expect(cell.y + cell.height).toBeLessThanOrEqual(layout.plotHeight + 0.001);
    });
  });
});

describe('layoutChart — small multiples', () => {
  const box = { width: 320, height: 200 };

  it('lays panels out in a grid, wrapping at the column count', () => {
    const layout = layoutChart(panelsSpec, box);
    expect(layout.panels).toHaveLength(3);
    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(2);
    expect(layout.panels.map((p) => [p.row, p.column])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
  });

  it('gives every panel one shared scale, so facets are comparable', () => {
    const layout = layoutChart(panelsSpec, box);
    const tallest = layout.panels.map((p) => Math.max(...p.layout.bars.map((b) => b.height)));
    // Only the panel holding the global max (East, 165) reaches full height.
    expect(Math.max(...tallest)).toBeCloseTo(layout.panels[0].layout.plotHeight, 0);
    expect(tallest[0]).toBeLessThan(tallest[1]);
    expect(tallest[2]).toBeLessThan(tallest[0]);
  });

  it('lets each panel keep its own scale when sharing is turned off', () => {
    const layout = layoutChart({ ...panelsSpec, shareDomain: false }, box);
    const tallest = layout.panels.map((p) =>
      Math.round(Math.max(...p.layout.bars.map((b) => b.height)))
    );
    // Every panel now maxes out its own plot, so all are the same height.
    expect(new Set(tallest).size).toBe(1);
  });

  it('keeps every panel inside the box', () => {
    const layout = layoutChart(panelsSpec, box);
    layout.panels.forEach((panel) => {
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.x + panel.width).toBeLessThanOrEqual(box.width + 0.001);
      expect(panel.y + panel.height).toBeLessThanOrEqual(box.height + 0.001);
    });
  });

  it('carries each panel title through for captioning', () => {
    expect(layoutChart(panelsSpec, box).panels.map((p) => p.title)).toEqual([
      'West',
      'East',
      'North',
    ]);
  });

  // The panel boxes are positioned absolutely, so anything a panel draws past
  // its own height lands on top of the row below it. A caption and a row of x
  // tick labels both sit outside plotHeight, so both have to be reserved.
  it('leaves room inside each panel for its caption and tick labels', () => {
    const layout = layoutChart(panelsSpec, box);
    expect(layout.titleLane).toBeGreaterThan(0);
    layout.panels.forEach((panel) => {
      const content = layout.titleLane + panel.layout.boxHeight + LAYOUT.xTickLane;
      expect(content).toBeLessThanOrEqual(panel.height + 0.001);
    });
  });

  it('reserves no caption lane when no panel is captioned', () => {
    const bare = {
      ...panelsSpec,
      panels: panelsSpec.panels.map(({ title, ...rest }) => rest),
    };
    expect(layoutChart(bare, box).titleLane).toBe(0);
  });

  it('asks for more height as rows are added, so facets stay readable', () => {
    const oneRow = { ...panelsSpec, columns: 3 };
    const twoRows = { ...panelsSpec, columns: 2 };
    expect(preferredHeight(twoRows, 132)).toBeGreaterThan(preferredHeight(oneRow, 132));
    // Each facet earns the same plot height whatever the grid shape.
    const plots = [oneRow, twoRows].map((spec) => {
      const layout = layoutChart(spec, { width: 320, height: preferredHeight(spec, 132) });
      return Math.round(layout.panels[0].layout.plotHeight);
    });
    expect(new Set(plots).size).toBe(1);
  });

  it('leaves the height of a single plot alone', () => {
    expect(preferredHeight(boxSpec, 132)).toBe(132);
    expect(preferredHeight(null, 132)).toBe(132);
  });
});
