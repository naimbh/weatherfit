import { useId, useMemo } from 'react';
import type { HourWeather, Units } from '../types';
import { conditionForHour } from '../lib/wmo';
import { degrees, hourLabel, kphToMph } from '../lib/format';
import WeatherIcon from './WeatherIcon';

export type ChartMetric = 'temperature' | 'precipitation' | 'wind';

interface Props {
  hours: HourWeather[];
  units: Units;
  metric: ChartMetric;
  onMetricChange: (m: ChartMetric) => void;
  /** Index of the hour the rest of the page is describing. */
  selected: number;
  onSelect: (i: number) => void;
}

const COL = 64;
const HEIGHT = 168;
const PLOT_TOP = 34;
const PLOT_BOTTOM = 100;
const ICON_Y = 108;
const ICON_SIZE = 32;
const LABEL_Y = 158;

const TABS: { id: ChartMetric; label: string }[] = [
  { id: 'temperature', label: 'Temperature' },
  { id: 'precipitation', label: 'Precipitation' },
  { id: 'wind', label: 'Wind' },
];

interface Series {
  values: number[];
  format: (v: number) => string;
  /** Bars suit a quantity with a meaningful zero; a line suits a reading that
   *  only makes sense relative to the rest of the day. */
  shape: 'line' | 'bar';
  /** Fixed scale, where the range is known and a relative one would mislead. */
  domain?: [number, number];
}

function seriesFor(metric: ChartMetric, hours: HourWeather[], units: Units): Series {
  switch (metric) {
    case 'temperature':
      return {
        values: hours.map((h) => degrees(h.tempC, units)),
        format: (v) => `${Math.round(v)}°`,
        shape: 'line',
      };
    case 'precipitation':
      return {
        values: hours.map((h) => Math.round(h.precipProb)),
        format: (v) => `${Math.round(v)}%`,
        shape: 'bar',
        domain: [0, 100],
      };
    case 'wind':
      return {
        values: hours.map((h) =>
          Math.round(units === 'imperial' ? kphToMph(h.windKph) : h.windKph),
        ),
        format: (v) => `${Math.round(v)}`,
        shape: 'line',
      };
  }
}

/**
 * Catmull-Rom through every point, converted to cubic Béziers. A straight
 * polyline reads as a series of measurements; the curve reads as weather —
 * and it still passes exactly through each hour's value, so nothing is
 * smoothed away.
 */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  const d = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(' ');
}

export default function HourlyChart({
  hours, units, metric, onMetricChange, selected, onSelect,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const areaId = `area-${uid}`;
  const barId = `bar-${uid}`;
  const lineId = `line-${uid}`;

  const series = useMemo(() => seriesFor(metric, hours, units), [metric, hours, units]);
  const width = Math.max(hours.length * COL, COL);

  const { points, scaleY } = useMemo(() => {
    const [lo, hi] = series.domain ?? (() => {
      const min = Math.min(...series.values);
      const max = Math.max(...series.values);
      // A flat day would otherwise divide by zero and draw a line off-canvas.
      const pad = Math.max((max - min) * 0.3, 1.5);
      return [min - pad, max + pad] as [number, number];
    })();

    const span = hi - lo || 1;
    const y = (v: number) => PLOT_BOTTOM - ((v - lo) / span) * (PLOT_BOTTOM - PLOT_TOP);

    return {
      scaleY: y,
      points: series.values.map((v, i) => ({ x: i * COL + COL / 2, y: y(v) })),
    };
  }, [series]);

  const linePath = series.shape === 'line' ? smoothPath(points) : '';
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${PLOT_BOTTOM} L ${points[0].x} ${PLOT_BOTTOM} Z`
    : '';

  return (
    <section className="wf-card wf-hourly" aria-label="Hourly forecast">
      <header className="wf-hourly__head">
        <h2 className="wf-card__title">Next {hours.length} hours</h2>
        <div className="wf-tabs" role="tablist" aria-label="Hourly metric">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={metric === tab.id}
              className={`wf-tab${metric === tab.id ? ' wf-tab--on' : ''}`}
              onClick={() => onMetricChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="wf-hourly__scroll">
        <svg
          className="wf-hourly__svg"
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`${metric} by hour for the next ${hours.length} hours`}
        >
          <defs>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.38" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
            <linearGradient id={barId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-2)" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {series.shape === 'line' && (
            <>
              <path className="wf-hourly__area" d={areaPath} fill={`url(#${areaId})`} />
              <path className="wf-hourly__line" d={linePath} stroke={`url(#${lineId})`} />
            </>
          )}

          {hours.map((hour, i) => {
            const cx = i * COL + COL / 2;
            const value = series.values[i];
            const condition = conditionForHour(hour.code, hour.cloudCover);
            const on = i === selected;
            const barTop = scaleY(value);

            return (
              <g key={hour.time} className={`wf-col${on ? ' wf-col--on' : ''}`}>
                <rect
                  className="wf-col__pill"
                  x={i * COL + 4} y={6}
                  width={COL - 8} height={HEIGHT - 12} rx={18}
                />

                {series.shape === 'bar' ? (
                  <rect
                    className="wf-hourly__bar"
                    x={cx - 10}
                    y={Math.min(barTop, PLOT_BOTTOM - 3)}
                    width={20}
                    height={Math.max(PLOT_BOTTOM - barTop, 3)}
                    rx={10}
                    fill={`url(#${barId})`}
                  />
                ) : (
                  <circle className="wf-hourly__dot" cx={cx} cy={points[i].y} r={on ? 5.5 : 3.5} />
                )}

                <text
                  className="wf-hourly__value"
                  x={cx}
                  y={series.shape === 'bar'
                    ? Math.min(barTop, PLOT_BOTTOM - 3) - 10
                    : points[i].y - 14}
                  textAnchor="middle"
                >
                  {series.format(value)}
                </text>

                <g transform={`translate(${cx - ICON_SIZE / 2} ${ICON_Y})`}>
                  <WeatherIcon kind={condition.icon} isDay={hour.isDay} size={ICON_SIZE} />
                </g>

                <text className="wf-hourly__hour" x={cx} y={LABEL_Y} textAnchor="middle">
                  {i === 0 ? 'Now' : hourLabel(hour.time)}
                </text>

                {/* One hit target per column, so the whole strip is clickable
                    rather than only the dot or the bar. */}
                <rect
                  className="wf-col__hit"
                  x={i * COL} y={0} width={COL} height={HEIGHT}
                  onClick={() => onSelect(i)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${hourLabel(hour.time)}: ${condition.label}, ${series.format(value)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(i);
                    }
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {metric === 'wind' && (
        <p className="wf-hourly__foot">
          Wind speed in {units === 'imperial' ? 'mph' : 'km/h'}.
        </p>
      )}
    </section>
  );
}
