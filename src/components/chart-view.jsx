import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useChartColors, useChartSequential, useTheme } from '@/hooks/use-theme';
import { layoutChart, preferredHeight } from '@/lib/chart';

// Paints a precomputed chart spec. All the geometry lives in lib/chart.js —
// this component only turns positioned marks into Views, so the layout stays
// testable and can be previewed without a device.
//
// Deliberately built from plain Views rather than react-native-svg: every mark
// is a box, a line segment is a 2px box rotated about its left edge, and a
// violin is a stack of boxes. That keeps charts free of a native dependency,
// so shipping them needs no rebuild.
//
// Mark specs follow the house data-viz rules: bars capped with a 4px rounded
// data-end and a square baseline, 2px lines, 9px markers ringed in the surface
// colour, a 2px surface gap between touching marks, hairline recessive
// gridlines, one direct label (the extreme) rather than a number on every
// point, and a legend only once there are two or more series. Text always wears
// text tokens — never the series colour — except a heatmap cell's own number,
// which flips to the surface colour on dark fills so it always clears contrast.

const DEFAULT_HEIGHT = 132;
const DENSE_INTENSITY = 0.55; // above this, a cell's label flips to the surface colour

export function ChartView({ chart: spec, height = DEFAULT_HEIGHT }) {
  const theme = useTheme();
  const colors = useChartColors();
  const sequential = useChartSequential();
  const [boxWidth, setBoxWidth] = useState(0);

  // A panel grid needs more room than one plot; the lib decides how much so the
  // facets stay readable instead of being divided down to nothing.
  const layout = useMemo(
    () => layoutChart(spec, { width: boxWidth, height: preferredHeight(spec, height) }),
    [spec, boxWidth, height]
  );

  // The spec itself decides whether there is anything to draw; width arrives on
  // the first layout pass, so the box renders empty for exactly one frame.
  if (!spec) return null;

  const paint = { theme, colors, sequential };

  return (
    <View style={styles.container} onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}>
      {layout?.title ? (
        <ThemedText type="smallBold" numberOfLines={2}>
          {layout.title}
        </ThemedText>
      ) : null}

      {layout &&
        (layout.kind === 'panels' ? (
          <Panels layout={layout} paint={paint} />
        ) : (
          <PlotBody layout={layout} paint={paint} />
        ))}

      {layout && layout.legend.length > 0 && (
        <View style={[styles.legend, { marginLeft: layout.gutter }]}>
          {layout.legend.map((item) => (
            <View key={item.key} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors[item.colorIndex % colors.length] },
                ]}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.tickText}>
                {item.name}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {layout?.axisLabel ? (
        <ThemedText type="code" themeColor="textSecondary" style={styles.tickText}>
          {layout.axisLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

// Small multiples. Each panel already carries its own finished layout, so this
// only places them and captions each one.
function Panels({ layout, paint }) {
  return (
    <View style={{ height: layout.plotHeight }}>
      {layout.panels.map((panel) => (
        <View
          key={panel.key}
          style={{
            position: 'absolute',
            left: panel.x,
            top: panel.y,
            width: panel.width,
            height: panel.height,
          }}>
          {panel.title ? (
            <ThemedText
              type="code"
              themeColor="textSecondary"
              numberOfLines={1}
              style={styles.panelTitle}>
              {panel.title}
            </ThemedText>
          ) : null}
          {panel.layout && <PlotBody layout={panel.layout} paint={paint} />}
        </View>
      ))}
    </View>
  );
}

function PlotBody({ layout, paint }) {
  const { theme, colors, sequential } = paint;

  return (
    <View style={styles.plotRow}>
      <View style={{ width: layout.gutter, marginTop: layout.labelLane }}>
        {/* barh and heatmap name their rows down the left; every other kind
            puts the value ticks there. */}
        {layout.categoryTicks.map((tick) => (
          <View key={tick.key} style={[styles.categoryCell, { height: tick.height }]}>
            <ThemedText
              type="code"
              themeColor="textSecondary"
              numberOfLines={1}
              style={[styles.tickText, styles.rightAligned]}>
              {tick.text}
            </ThemedText>
          </View>
        ))}
        {layout.valueTicks.map((tick) => (
          <ThemedText
            key={tick.key}
            type="code"
            themeColor="textSecondary"
            numberOfLines={1}
            style={[styles.tickText, styles.valueTick, { top: tick.y - 7 }]}>
            {tick.text}
          </ThemedText>
        ))}
      </View>

      <View style={styles.plotColumn}>
        <View style={{ height: layout.boxHeight }}>
          <View
            style={[
              styles.plot,
              { top: layout.labelLane, height: layout.plotHeight, width: layout.plotWidth },
            ]}>
            {layout.gridlines.map((line) => (
              <View
                key={line.key}
                style={[styles.gridline, { top: line.y, backgroundColor: theme.border }]}
              />
            ))}
            {layout.kind !== 'heatmap' && (
              <View
                style={[styles.baseline, { top: layout.baselineY, backgroundColor: theme.border }]}
              />
            )}

            {/* Heatmap cells: colour carries magnitude, and every cell shows
                its own number so the value never depends on colour alone. */}
            {layout.cells.map((cell) => {
              const step = Math.min(
                sequential.length - 1,
                Math.round(cell.intensity * (sequential.length - 1))
              );
              return (
                <View
                  key={cell.key}
                  style={{
                    position: 'absolute',
                    left: cell.x,
                    top: cell.y,
                    width: cell.width,
                    height: cell.height,
                    borderRadius: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: cell.empty ? theme.backgroundSelected : sequential[step],
                  }}>
                  <ThemedText
                    type="code"
                    numberOfLines={1}
                    style={[
                      styles.cellText,
                      {
                        color:
                          cell.intensity >= DENSE_INTENSITY
                            ? theme.backgroundElement
                            : theme.text,
                      },
                    ]}>
                    {cell.text}
                  </ThemedText>
                </View>
              );
            })}

            {/* Violin silhouette, under everything so the median reads on top. */}
            {layout.bands.map((band) => (
              <View
                key={band.key}
                style={{
                  position: 'absolute',
                  left: band.x,
                  top: band.y,
                  width: band.width,
                  height: band.height,
                  backgroundColor: colors[band.colorIndex % colors.length],
                }}
              />
            ))}

            {layout.bars.map((bar) => (
              <View
                key={bar.key}
                style={{
                  position: 'absolute',
                  left: bar.x,
                  top: bar.y,
                  width: bar.width,
                  height: bar.height,
                  backgroundColor: colors[bar.colorIndex % colors.length],
                  borderTopLeftRadius: bar.radius.tl,
                  borderTopRightRadius: bar.radius.tr,
                  borderBottomLeftRadius: bar.radius.bl,
                  borderBottomRightRadius: bar.radius.br,
                }}
              />
            ))}

            {/* Whisker stems and fence caps are structure, not data weight, so
                they wear a text token rather than the series colour. */}
            {layout.whiskers.map((mark) => (
              <View
                key={mark.key}
                style={{
                  position: 'absolute',
                  left: mark.x,
                  top: mark.y,
                  width: mark.width,
                  height: mark.height,
                  backgroundColor: theme.textSecondary,
                }}
              />
            ))}

            {/* The median sits inside a filled mark, so it takes the surface
                colour to stay legible against the fill. */}
            {layout.medians.map((mark) => (
              <View
                key={mark.key}
                style={{
                  position: 'absolute',
                  left: mark.x,
                  top: mark.y,
                  width: mark.width,
                  height: mark.height,
                  backgroundColor: theme.backgroundElement,
                }}
              />
            ))}

            {layout.lines.map((segment) => (
              <View
                key={segment.key}
                style={[
                  styles.lineSegment,
                  {
                    left: segment.x,
                    top: segment.y - 1,
                    width: segment.length,
                    backgroundColor: colors[segment.colorIndex % colors.length],
                    transform: [{ rotate: `${segment.angle}deg` }],
                  },
                ]}
              />
            ))}

            {layout.dots.map((dot) => (
              <View
                key={dot.key}
                style={[
                  styles.dot,
                  {
                    left: dot.x - dot.size / 2,
                    top: dot.y - dot.size / 2,
                    width: dot.size,
                    height: dot.size,
                    borderRadius: dot.size / 2,
                    backgroundColor: colors[dot.colorIndex % colors.length],
                    // Surface ring keeps a marker legible where it crosses the
                    // line or another point.
                    borderColor: theme.backgroundElement,
                  },
                ]}
              />
            ))}
          </View>

          {layout.directLabels.map((label) => (
            <ThemedText
              key={label.key}
              type="code"
              numberOfLines={1}
              style={[
                styles.directLabel,
                {
                  left: label.left,
                  top: layout.labelLane + label.top,
                  width: label.width,
                  textAlign: label.align,
                },
              ]}>
              {label.text}
            </ThemedText>
          ))}
        </View>

        <View style={[styles.xAxisRow, { width: layout.plotWidth }]}>
          {layout.xTicks.map((tick) => (
            <ThemedText
              key={tick.key}
              type="code"
              themeColor="textSecondary"
              numberOfLines={1}
              style={[
                styles.tickText,
                styles.xTick,
                { left: tick.left, width: tick.width, textAlign: tick.align },
              ]}>
              {tick.text}
            </ThemedText>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  plotRow: {
    flexDirection: 'row',
  },
  plotColumn: {
    flex: 1,
  },
  plot: {
    position: 'relative',
  },
  panelTitle: {
    fontSize: 10,
    marginBottom: Spacing.half,
  },
  categoryCell: {
    justifyContent: 'center',
    paddingRight: Spacing.two,
  },
  valueTick: {
    position: 'absolute',
    right: Spacing.two,
    textAlign: 'right',
  },
  rightAligned: {
    textAlign: 'right',
  },
  cellText: {
    fontSize: 10,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
    borderWidth: 2,
  },
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  xAxisRow: {
    position: 'relative',
    height: 16,
    marginTop: Spacing.one,
  },
  xTick: {
    position: 'absolute',
    top: 0,
  },
  directLabel: {
    position: 'absolute',
    fontSize: 11,
  },
  tickText: {
    fontSize: 11,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
});
