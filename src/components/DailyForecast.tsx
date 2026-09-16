import { useState } from 'react';
import type { DayWeather, Units } from '../types';
import { conditionFor } from '../lib/wmo';
import {
  clockLabel, dayName, degrees, isToday, longDate, precipAmount, uvLabel, windSpeed,
} from '../lib/format';
import WeatherIcon from './WeatherIcon';

interface Props {
  days: DayWeather[];
  units: Units;
}

/**
 * Every row's bar is drawn against the whole period's range, not its own, so
 * a cold Tuesday sits visibly left of a warm Friday. A per-row scale would
 * make every day look identical, which is the opposite of the point.
 */
export default function DailyForecast({ days, units }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  if (days.length === 0) return null;

  const lows = days.map((d) => degrees(d.tempMinC, units));
  const highs = days.map((d) => degrees(d.tempMaxC, units));
  const floor = Math.min(...lows);
  const ceiling = Math.max(...highs);
  const span = ceiling - floor || 1;

  return (
    <section className="wf-card wf-daily" aria-label={`${days.length} day forecast`}>
      <h2 className="wf-card__title">{days.length}-day forecast</h2>

      <ul className="wf-daily__list">
        {days.map((day, i) => {
          const condition = conditionFor(day.code);
          const low = lows[i];
          const high = highs[i];
          const left = ((low - floor) / span) * 100;
          const width = Math.max(((high - low) / span) * 100, 5);
          const expanded = open === day.date;

          return (
            <li key={day.date} className={`wf-day${expanded ? ' wf-day--open' : ''}`}>
              <button
                type="button"
                className="wf-day__row"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : day.date)}
              >
                <span className="wf-day__name">
                  {isToday(day.date) ? 'Today' : dayName(day.date)}
                </span>

                <span className="wf-day__icon">
                  <WeatherIcon kind={condition.icon} size={30} />
                </span>

                <span className="wf-day__rain">
                  {day.precipProb >= 10 ? `${Math.round(day.precipProb)}%` : ''}
                </span>

                <span className="wf-day__low">{low}°</span>

                <span className="wf-day__bar" aria-hidden="true">
                  <span
                    className="wf-day__range"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                </span>

                <span className="wf-day__high">{high}°</span>

                <span className="sr-only">
                  {condition.label}, high {high} degrees, low {low} degrees
                </span>
              </button>

              {expanded && (
                <div className="wf-day__detail">
                  <p className="wf-day__summary">
                    {longDate(day.date)} — {condition.label.toLowerCase()}.
                  </p>
                  <dl className="wf-day__facts">
                    <div><dt>Precipitation</dt><dd>{precipAmount(day.precipMm, units)}</dd></div>
                    <div><dt>Wind</dt><dd>{windSpeed(day.windMaxKph, units)}</dd></div>
                    <div><dt>UV index</dt><dd>{uvLabel(day.uvMax)} ({Math.round(day.uvMax)})</dd></div>
                    <div><dt>Sunrise</dt><dd>{day.sunrise ? clockLabel(day.sunrise) : '—'}</dd></div>
                    <div><dt>Sunset</dt><dd>{day.sunset ? clockLabel(day.sunset) : '—'}</dd></div>
                  </dl>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
