/**
 * Unit conversion and display formatting.
 *
 * Every measurement is stored metric and converted at the edge, so a unit
 * toggle never has to touch stored or cached data. Imperial mode converts
 * wind and precipitation too, not only temperature.
 */
import type { Units } from '../types';

export const cToF = (c: number) => (c * 9) / 5 + 32;
export const kphToMph = (k: number) => k * 0.621371;
export const mmToIn = (mm: number) => mm / 25.4;

/** Rounded degrees with no unit suffix, for the places that show a bare number. */
export const degrees = (c: number, units: Units) =>
  Math.round(units === 'imperial' ? cToF(c) : c);

export const temp = (c: number, units: Units) => `${degrees(c, units)}°`;

/** Degrees with the scale spelled out, for text that stands on its own. */
export const tempWithUnit = (c: number, units: Units) =>
  `${degrees(c, units)}°${units === 'imperial' ? 'F' : 'C'}`;

export const windSpeed = (kph: number, units: Units) =>
  units === 'imperial'
    ? `${Math.round(kphToMph(kph))} mph`
    : `${Math.round(kph)} km/h`;

export const precipAmount = (mm: number, units: Units) => {
  if (mm <= 0) return units === 'imperial' ? '0 in' : '0 mm';
  return units === 'imperial'
    ? `${mmToIn(mm).toFixed(mmToIn(mm) < 0.1 ? 2 : 1)} in`
    : `${mm.toFixed(mm < 1 ? 1 : 0)} mm`;
};

/**
 * Open-Meteo returns local wall-clock stamps with no zone offset. Parsing them
 * as local time is what makes "3 PM" mean 3 PM at the place described.
 *
 * Date-only stamps need the explicit midnight: `new Date('2026-09-15')` is
 * defined to parse as UTC, so west of Greenwich every day in the outlook would
 * render as the day before — which is exactly what it did.
 */
export const at = (iso: string) =>
  new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);

export const hourLabel = (iso: string) =>
  at(iso).toLocaleTimeString([], { hour: 'numeric' });

export const clockLabel = (iso: string) =>
  at(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const dayName = (iso: string) =>
  at(iso).toLocaleDateString([], { weekday: 'short' });

export const longDate = (iso: string) =>
  at(iso).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

export const isToday = (iso: string) => {
  const d = at(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

/** Compass point for a bearing, for the wind tile's arrow label. */
export const compass = (deg: number) => {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(deg / 45) % 8];
};

export const uvLabel = (uv: number) => {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very high';
  return 'Extreme';
};

export const humidityLabel = (h: number) => {
  if (h < 30) return 'Dry';
  if (h < 60) return 'Comfortable';
  if (h < 80) return 'Humid';
  return 'Very humid';
};
