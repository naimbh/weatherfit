/**
 * WMO weather codes, as Open-Meteo reports them, mapped to the vocabulary the
 * interface speaks: a short label and one of a small set of icon kinds.
 *
 * The icon set is deliberately smaller than the code list. Drizzle and light
 * rain are different readings but the same picture, and a forecast row that
 * draws twelve near-identical cloud variants is harder to scan, not easier.
 */

export type IconKind =
  | 'clear'
  | 'mostly-clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'sleet'
  | 'snow'
  | 'thunder';

export interface Condition {
  label: string;
  icon: IconKind;
}

const CODES: Record<number, Condition> = {
  0:  { label: 'Clear',                 icon: 'clear' },
  1:  { label: 'Mainly clear',          icon: 'mostly-clear' },
  2:  { label: 'Partly cloudy',         icon: 'partly-cloudy' },
  3:  { label: 'Cloudy',                icon: 'cloudy' },
  45: { label: 'Fog',                   icon: 'fog' },
  48: { label: 'Freezing fog',          icon: 'fog' },
  51: { label: 'Light drizzle',         icon: 'drizzle' },
  53: { label: 'Drizzle',               icon: 'drizzle' },
  55: { label: 'Heavy drizzle',         icon: 'drizzle' },
  56: { label: 'Freezing drizzle',      icon: 'sleet' },
  57: { label: 'Freezing drizzle',      icon: 'sleet' },
  61: { label: 'Light rain',            icon: 'rain' },
  63: { label: 'Rain',                  icon: 'rain' },
  65: { label: 'Heavy rain',            icon: 'heavy-rain' },
  66: { label: 'Freezing rain',         icon: 'sleet' },
  67: { label: 'Freezing rain',         icon: 'sleet' },
  71: { label: 'Light snow',            icon: 'snow' },
  73: { label: 'Snow',                  icon: 'snow' },
  75: { label: 'Heavy snow',            icon: 'snow' },
  77: { label: 'Snow grains',           icon: 'snow' },
  80: { label: 'Light showers',         icon: 'rain' },
  81: { label: 'Showers',               icon: 'rain' },
  82: { label: 'Heavy showers',         icon: 'heavy-rain' },
  85: { label: 'Snow showers',          icon: 'snow' },
  86: { label: 'Heavy snow showers',    icon: 'snow' },
  95: { label: 'Thunderstorm',          icon: 'thunder' },
  96: { label: 'Thunderstorm w/ hail',  icon: 'thunder' },
  99: { label: 'Thunderstorm w/ hail',  icon: 'thunder' },
};

const UNKNOWN: Condition = { label: 'Unknown', icon: 'cloudy' };

export function conditionFor(code: number): Condition {
  return CODES[code] ?? UNKNOWN;
}

/** Cloud cover overrules the code for the two clear-ish readings, because a
 *  code of 1 under 70% cloud looks nothing like a clear sky out the window. */
export function conditionForHour(code: number, cloudCover: number): Condition {
  const base = conditionFor(code);
  if (base.icon === 'clear' && cloudCover >= 25) {
    return { label: 'Mainly clear', icon: 'mostly-clear' };
  }
  if (base.icon === 'mostly-clear' && cloudCover >= 55) {
    return { label: 'Partly cloudy', icon: 'partly-cloudy' };
  }
  return base;
}
