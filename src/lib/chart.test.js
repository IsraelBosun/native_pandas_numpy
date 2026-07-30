import { describe, expect, it } from 'vitest';

import {
  barThickness,
  chartPosition,
  extremeIndex,
  formatValue,
  isCategoryKind,
  LAYOUT,
  layoutChart,
  lineSegments,
  niceTicks,
  normalizeChart,
  pointPositions,
  scale,
  scatterXDomain,
  valueDomain,
} from './chart';

const barSpec = {
  kind: 'bar',
  title: 'Revenue by region',
  categories: ['East', 'North', 'West'],
  series: [{ name: 'revenue', values: [225, 115, 245] }],
};

describe('normalizeChart', () => {
  it('fills in the optional fields', () => {
    const chart = normalizeChart({ kind: 'bar', series: [{ values: [1, 2] }] });
    expect(chart.title).toBe('');
    expect(chart.xLabel).toBe('');
    expect(chart.categories).toEqual(['', '']);
    expect(chart.series[0].name).toBe('');
  });

  it('pads categories to the longest series instead of shifting bars', () => {
    const chart = normalizeChart({ kind: 'bar', categories: ['a'], series: [{ values: [1, 2, 3] }] });
    expect(chart.categories).toEqual(['a', '', '']);
  });

  it('coerces category labels to strings', () => {
    const chart = normalizeChart({ kind: 'bar', categories: [2024, 2025], series: [{ values: [1, 2] }] });
    expect(chart.categories).toEqual(['2024', '2025']);
  });

  it('turns non-finite values into null so they render as gaps', () => {
    const chart = normalizeChart({ kind: 'line', series: [{ values: [1, null, 3] }] });
    expect(chart.series[0].values).toEqual([1, null, 3]);
  });

  it('rejects an unknown kind', () => {
    expect(normalizeChart({ kind: 'pie', series: [{ values: [1] }] })).toBeNull();
  });

  it('rejects a spec with no drawable data', () => {
    expect(normalizeChart({ kind: 'bar', series: [] })).toBeNull();
    expect(normalizeChart({ kind: 'scatter', points: [] })).toBeNull();
    expect(normalizeChart(null)).toBeNull();
    expect(normalizeChart(undefined)).toBeNull();
  });

  it('keeps only well-formed scatter points', () => {
    const chart = normalizeChart({ kind: 'scatter', points: [[1, 2], [3], ['a', 'b'], [4, 5]] });
    expect(chart.points).toEqual([
      [1, 2],
      [4, 5],
    ]);
  });
});

describe('isCategoryKind', () => {
  it('separates the banded kinds from scatter', () => {
    expect(isCategoryKind('bar')).toBe(true);
    expect(isCategoryKind('barh')).toBe(true);
    expect(isCategoryKind('line')).toBe(true);
    expect(isCategoryKind('hist')).toBe(true);
    expect(isCategoryKind('scatter')).toBe(false);
  });
});

describe('chartPosition', () => {
  it('defaults to the answer side so a chart never gives the answer away', () => {
    expect(chartPosition({ kind: 'bar' })).toBe('answer');
    expect(chartPosition(undefined)).toBe('answer');
    expect(chartPosition({ kind: 'bar', position: 'nonsense' })).toBe('answer');
  });

  it('honours an explicit prompt-side chart', () => {
    expect(chartPosition({ kind: 'bar', position: 'prompt' })).toBe('prompt');
  });
});

describe('valueDomain', () => {
  it('always includes zero for filled marks, so bars never misstate a value', () => {
    expect(valueDomain(normalizeChart(barSpec))).toEqual([0, 245]);
  });

  it('spans both sides when a series goes negative', () => {
    const chart = normalizeChart({ kind: 'bar', series: [{ values: [-30, 20] }] });
    expect(valueDomain(chart)).toEqual([-30, 20]);
  });

  it('does not force zero into a scatter domain', () => {
    const chart = normalizeChart({ kind: 'scatter', points: [[1, 50], [2, 90]] });
    expect(valueDomain(chart)).toEqual([50, 90]);
  });

  it('gives a flat series a drawable range', () => {
    expect(valueDomain(normalizeChart({ kind: 'bar', series: [{ values: [7, 7] }] }))).toEqual([0, 7]);
    expect(valueDomain(normalizeChart({ kind: 'bar', series: [{ values: [0, 0] }] }))).toEqual([0, 1]);
  });

  it('ignores missing values', () => {
    const chart = normalizeChart({ kind: 'line', series: [{ values: [10, null, 40] }] });
    expect(valueDomain(chart)).toEqual([0, 40]);
  });
});

describe('scatterXDomain', () => {
  it('spans the x values', () => {
    const chart = normalizeChart({ kind: 'scatter', points: [[5, 1], [9, 2]] });
    expect(scatterXDomain(chart)).toEqual([5, 9]);
  });

  it('pads a single-x column so the points stay drawable', () => {
    const chart = normalizeChart({ kind: 'scatter', points: [[5, 1], [5, 2]] });
    expect(scatterXDomain(chart)).toEqual([4, 6]);
  });
});

describe('scale', () => {
  it('maps a value onto the pixel range', () => {
    expect(scale(50, [0, 100], 200)).toBe(100);
    expect(scale(0, [0, 100], 200)).toBe(0);
    expect(scale(100, [0, 100], 200)).toBe(200);
  });

  it('handles a domain that starts below zero', () => {
    expect(scale(0, [-50, 50], 100)).toBe(50);
  });

  it('never returns NaN for a degenerate domain or value', () => {
    expect(scale(5, [3, 3], 100)).toBe(0);
    expect(scale(NaN, [0, 10], 100)).toBe(0);
  });
});

describe('niceTicks', () => {
  it('rounds to clean numbers rather than data extremes', () => {
    expect(niceTicks([0, 245], 3)).toEqual([0, 100, 200]);
  });

  it('keeps small domains readable', () => {
    expect(niceTicks([0, 12], 3)).toEqual([0, 5, 10]);
  });

  it('snaps to a 1/2/5 step rather than dividing the domain evenly', () => {
    expect(niceTicks([0, 1], 4)).toEqual([0, 0.5, 1]);
  });

  it('does not accumulate floating-point error across fractional steps', () => {
    expect(niceTicks([0, 1], 6)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('degenerates safely', () => {
    expect(niceTicks([5, 5])).toEqual([5]);
  });
});

describe('barThickness', () => {
  it('caps thickness so wide bands keep their air', () => {
    expect(barThickness(120)).toBe(24);
  });

  it('leaves a gap between touching bars', () => {
    expect(barThickness(10)).toBe(8);
  });

  it('stays positive in a cramped band', () => {
    expect(barThickness(1)).toBe(2);
  });
});

describe('pointPositions', () => {
  it('measures y downward from the top of the plot', () => {
    const positions = pointPositions([0, 100], { width: 100, height: 50, domain: [0, 100] });
    expect(positions[0]).toEqual({ x: 0, y: 50 });
    expect(positions[1]).toEqual({ x: 100, y: 0 });
  });

  it('centres a lone point', () => {
    const positions = pointPositions([10], { width: 100, height: 50, domain: [0, 10] });
    expect(positions[0].x).toBe(50);
  });

  it('returns null for a missing value', () => {
    const positions = pointPositions([10, null], { width: 100, height: 50, domain: [0, 10] });
    expect(positions[1]).toBeNull();
  });
});

describe('lineSegments', () => {
  it('emits one segment per adjacent pair', () => {
    const segments = lineSegments([0, 100], { width: 100, height: 100, domain: [0, 100] });
    expect(segments).toHaveLength(1);
    expect(segments[0].x).toBe(0);
    expect(segments[0].y).toBe(100);
    expect(Math.round(segments[0].angle)).toBe(-45);
    expect(Math.round(segments[0].length)).toBe(141);
  });

  it('breaks the line at a missing value instead of bridging it', () => {
    const segments = lineSegments([10, null, 30], { width: 100, height: 100, domain: [0, 30] });
    expect(segments).toHaveLength(0);
  });

  it('produces nothing for a single point', () => {
    expect(lineSegments([10], { width: 100, height: 100, domain: [0, 10] })).toEqual([]);
  });
});

describe('extremeIndex', () => {
  it('finds the value worth direct-labelling', () => {
    expect(extremeIndex([225, 115, 245])).toBe(2);
  });

  it('prefers the largest magnitude, including negatives', () => {
    expect(extremeIndex([10, -80, 20])).toBe(1);
  });

  it('skips missing values', () => {
    expect(extremeIndex([null, 5])).toBe(1);
    expect(extremeIndex([null])).toBe(-1);
  });
});

describe('formatValue', () => {
  it('rounds all displayed numbers', () => {
    expect(formatValue(245)).toBe('245');
    expect(formatValue(24.567)).toBe('24.6');
    expect(formatValue(0.456)).toBe('0.46');
  });

  it('compacts big numbers so a tick never wraps', () => {
    expect(formatValue(1500)).toBe('1.5K');
    expect(formatValue(2_400_000)).toBe('2.4M');
  });

  it('returns an empty string for a non-number', () => {
    expect(formatValue(NaN)).toBe('');
  });
});

describe('layoutChart', () => {
  const box = { width: 320, height: 132 };

  it('returns null when there is nothing to draw or no room to draw it', () => {
    expect(layoutChart(barSpec, { width: 0, height: 132 })).toBeNull();
    expect(layoutChart(barSpec, { width: 320, height: 0 })).toBeNull();
    expect(layoutChart(null, box)).toBeNull();
  });

  it('reserves a label lane above the plot so the tallest bar keeps its label', () => {
    const layout = layoutChart(barSpec, box);
    expect(layout.plotHeight).toBe(box.height - LAYOUT.labelLane);

    const tallest = layout.bars.reduce((a, b) => (a.height > b.height ? a : b));
    expect(tallest.y).toBe(0);
    // The label sits in the lane, above the plot, never at a negative offset.
    expect(layout.directLabels[0].top).toBe(-LAYOUT.labelLane);
    expect(layout.labelLane + layout.directLabels[0].top).toBe(0);
  });

  it('anchors bars to the baseline with a rounded data-end', () => {
    const layout = layoutChart(barSpec, box);
    layout.bars.forEach((bar) => {
      expect(bar.y + bar.height).toBeCloseTo(layout.baselineY, 5);
      expect(bar.radius).toEqual({ tl: 4, tr: 4, bl: 0, br: 0 });
    });
  });

  it('caps bar thickness so a three-bar chart keeps its air', () => {
    const layout = layoutChart(barSpec, box);
    layout.bars.forEach((bar) => expect(bar.width).toBeLessThanOrEqual(LAYOUT.maxBarThickness));
  });

  it('flips a negative bar to grow downward with the rounding at its tip', () => {
    const layout = layoutChart({ kind: 'bar', series: [{ values: [-30, 20] }] }, box);
    const negative = layout.bars[0];
    expect(negative.y).toBe(layout.baselineY - scale(0, [-30, 20], layout.plotHeight));
    expect(negative.radius).toEqual({ tl: 0, tr: 0, bl: 4, br: 4 });
  });

  it('keeps every mark inside the plot box', () => {
    const layout = layoutChart(barSpec, box);
    layout.bars.forEach((bar) => {
      expect(bar.x).toBeGreaterThanOrEqual(0);
      expect(bar.x + bar.width).toBeLessThanOrEqual(layout.plotWidth + 0.001);
      expect(bar.y).toBeGreaterThanOrEqual(0);
      expect(bar.y + bar.height).toBeLessThanOrEqual(layout.plotHeight + 0.001);
    });
  });

  it('gives barh a wider gutter for names and a tip lane for the label', () => {
    const layout = layoutChart({ ...barSpec, kind: 'barh' }, box);
    expect(layout.gutter).toBe(LAYOUT.categoryGutter);
    expect(layout.plotWidth).toBe(box.width - LAYOUT.categoryGutter - LAYOUT.tipLane);
    expect(layout.categoryTicks.map((t) => t.text)).toEqual(['East', 'North', 'West']);
    // The tip label starts past the longest bar and still fits in the lane.
    const label = layout.directLabels[0];
    expect(label.left).toBeGreaterThan(layout.plotWidth - 1);
    expect(label.left + label.width).toBeLessThanOrEqual(box.width - LAYOUT.categoryGutter);
  });

  it('shows a legend only once there are two or more series', () => {
    expect(layoutChart(barSpec, box).legend).toEqual([]);

    const two = layoutChart(
      {
        kind: 'bar',
        categories: ['East', 'West'],
        series: [
          { name: 'revenue', values: [225, 245] },
          { name: 'units', values: [22, 25] },
        ],
      },
      box
    );
    expect(two.legend.map((l) => l.name)).toEqual(['revenue', 'units']);
    expect(two.legend.map((l) => l.colorIndex)).toEqual([0, 1]);
  });

  it('assigns each series its own palette slot, in order', () => {
    const layout = layoutChart(
      {
        kind: 'bar',
        categories: ['East', 'West'],
        series: [
          { name: 'a', values: [1, 2] },
          { name: 'b', values: [3, 4] },
        ],
      },
      box
    );
    expect(new Set(layout.bars.filter((b) => b.key.startsWith('0-')).map((b) => b.colorIndex)))
      .toEqual(new Set([0]));
    expect(new Set(layout.bars.filter((b) => b.key.startsWith('1-')).map((b) => b.colorIndex)))
      .toEqual(new Set([1]));
  });

  it('thins x labels so a 14-point series does not overlap', () => {
    const layout = layoutChart(
      {
        kind: 'line',
        categories: Array.from({ length: 14 }, (_, i) => `d${i}`),
        series: [{ values: Array.from({ length: 14 }, (_, i) => i) }],
      },
      box
    );
    expect(layout.xTicks.length).toBeLessThanOrEqual(LAYOUT.maxXLabels);
    expect(layout.xTicks[0].text).toBe('d0');
  });

  it('draws a line as segments plus one marker per point, breaking at gaps', () => {
    const layout = layoutChart(
      { kind: 'line', categories: ['a', 'b', 'c'], series: [{ values: [10, null, 30] }] },
      box
    );
    expect(layout.dots).toHaveLength(2);
    expect(layout.lines).toHaveLength(0);
  });

  it('lays scatter points out on their own x domain, with no category ticks', () => {
    const layout = layoutChart(
      { kind: 'scatter', points: [[5, 45], [12, 120]] },
      box
    );
    expect(layout.dots).toHaveLength(2);
    expect(layout.xTicks).toEqual([]);
    // Round marks sit on their coordinate, so the extremes are inset by the
    // marker radius and stay wholly inside the plot instead of being clipped.
    layout.dots.forEach((dot) => {
      expect(dot.x - dot.size / 2).toBeGreaterThanOrEqual(0);
      expect(dot.x + dot.size / 2).toBeLessThanOrEqual(layout.plotWidth + 0.001);
      expect(dot.y - dot.size / 2).toBeGreaterThanOrEqual(0);
      expect(dot.y + dot.size / 2).toBeLessThanOrEqual(layout.plotHeight + 0.001);
    });
  });

  it('produces no NaN coordinate for a flat series', () => {
    const layout = layoutChart({ kind: 'bar', categories: ['a'], series: [{ values: [0] }] }, box);
    layout.bars.forEach((bar) => {
      expect(Number.isFinite(bar.x)).toBe(true);
      expect(Number.isFinite(bar.y)).toBe(true);
      expect(Number.isFinite(bar.width)).toBe(true);
      expect(Number.isFinite(bar.height)).toBe(true);
    });
  });
});

describe('layoutChart edge containment', () => {
  const box = { width: 320, height: 132 };

  it('keeps line markers and their labels inside the plot at both ends', () => {
    const layout = layoutChart(
      {
        kind: 'line',
        categories: ['a', 'b', 'c'],
        series: [{ values: [100, 10, 50] }],
      },
      box
    );
    layout.dots.forEach((dot) => {
      expect(dot.x - dot.size / 2).toBeGreaterThanOrEqual(0);
      expect(dot.x + dot.size / 2).toBeLessThanOrEqual(layout.plotWidth + 0.001);
      expect(dot.y - dot.size / 2).toBeGreaterThanOrEqual(0);
      expect(dot.y + dot.size / 2).toBeLessThanOrEqual(layout.plotHeight + 0.001);
    });
    const label = layout.directLabels[0];
    expect(label.left).toBeGreaterThanOrEqual(0);
    expect(label.left + label.width).toBeLessThanOrEqual(layout.plotWidth + 0.001);
  });

  it('keeps every x tick inside the plot', () => {
    ['bar', 'line'].forEach((kind) => {
      const layout = layoutChart(
        { kind, categories: ['a', 'b', 'c'], series: [{ values: [1, 2, 3] }] },
        box
      );
      layout.xTicks.forEach((tick) => {
        expect(tick.left).toBeGreaterThanOrEqual(0);
        expect(tick.left + tick.width).toBeLessThanOrEqual(layout.plotWidth + 0.001);
      });
    });
  });

  it('aligns line gridlines with the inset the points actually use', () => {
    const layout = layoutChart(
      { kind: 'line', categories: ['a', 'b'], series: [{ values: [0, 100] }] },
      box
    );
    const top = layout.gridlines[layout.gridlines.length - 1];
    const highest = layout.dots.reduce((a, b) => (a.y < b.y ? a : b));
    expect(top.y).toBeCloseTo(highest.y, 5);
  });

  it('labels the biggest mark on the chart, not just the first series', () => {
    const layout = layoutChart(
      {
        kind: 'bar',
        categories: ['East', 'West'],
        series: [
          { name: 'bags', values: [60, 125] },
          { name: 'shoes', values: [165, 120] },
        ],
      },
      box
    );
    expect(layout.directLabels[0].text).toBe('165');
    // …and it is centred over the sub-band that bar occupies.
    const tallest = layout.bars.reduce((a, b) => (a.height > b.height ? a : b));
    const label = layout.directLabels[0];
    expect(label.left + label.width / 2).toBeCloseTo(tallest.x + tallest.width / 2, 5);
  });
});
