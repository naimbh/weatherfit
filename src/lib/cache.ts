import type { Forecast, SavedPlace, Units } from '../types';

/**
 * Everything the app remembers between visits: the saved cities and their
 * order, which one is home, the unit choice, the alert switch, and the last
 * forecast for each city.
 *
 * Every access is wrapped, because `localStorage` throws rather than returning
 * null in a private window with site data blocked — and a weather app that
 * refuses to start because it could not save a preference is a worse app than
 * one that forgets.
 */

const KEY = {
  places: 'wf.places',
  home: 'wf.home',
  selected: 'wf.selected',
  units: 'wf.units',
  alerts: 'wf.alerts',
  metric: 'wf.chartMetric',
  forecast: (id: string) => `wf.forecast.${id}`,
};

/** How long a saved forecast is worth showing before it is only a fallback. */
const USABLE_MINUTES = 180;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Out of quota or blocked — the app still works, it just forgets.
  }
}

function drop(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Same as above.
  }
}

// ------------------------------------------------------------- the places

/** The device-location entry. It is always in the list, cannot be removed,
 *  and is home until the reader stars something else. */
export const CURRENT_PLACE_ID = 'here';

export const currentLocationPlace = (): SavedPlace => ({
  id: CURRENT_PLACE_ID,
  name: 'My location',
  latitude: 0,
  longitude: 0,
  isCurrent: true,
});

/** Coordinates are rounded into the id so the same city added twice — once by
 *  search, once from a different spelling — resolves to one entry. */
export const placeId = (lat: number, lon: number) =>
  `${lat.toFixed(3)},${lon.toFixed(3)}`;

export function loadPlaces(): SavedPlace[] {
  const saved = read<SavedPlace[]>(KEY.places);
  if (!saved || !Array.isArray(saved) || saved.length === 0) {
    return [currentLocationPlace()];
  }
  // The current-location entry is structural: restore it if an old payload or
  // a hand-edited value dropped it.
  return saved.some((p) => p.id === CURRENT_PLACE_ID)
    ? saved
    : [currentLocationPlace(), ...saved];
}

export const savePlaces = (places: SavedPlace[]) => write(KEY.places, places);

export function loadHomeId(): string {
  return read<string>(KEY.home) ?? CURRENT_PLACE_ID;
}

export const saveHomeId = (id: string) => write(KEY.home, id);

/** The city shown when the app opens: whatever was last viewed, falling back
 *  to home. Kept separate from home so a quick look at another city does not
 *  quietly redefine which one is home. */
export const loadSelectedId = () => read<string>(KEY.selected);
export const saveSelectedId = (id: string) => write(KEY.selected, id);

// -------------------------------------------------------------- the rest

export const saveUnits = (u: Units) => write(KEY.units, u);
export const loadUnits = (): Units => read<Units>(KEY.units) ?? 'metric';

export const saveAlerts = (on: boolean) => write(KEY.alerts, on);
export const loadAlerts = () => read<boolean>(KEY.alerts) ?? false;

export const saveChartMetric = (m: string) => write(KEY.metric, m);
export const loadChartMetric = () => read<string>(KEY.metric);

// ---------------------------------------------------------- the forecasts

export interface CachedForecast {
  forecast: Forecast;
  savedAt: number;
}

export const saveForecast = (id: string, forecast: Forecast) =>
  write(KEY.forecast(id), { forecast, savedAt: Date.now() } satisfies CachedForecast);

export const loadForecast = (id: string) =>
  read<CachedForecast>(KEY.forecast(id));

export const dropForecast = (id: string) => drop(KEY.forecast(id));

export const ageInMinutes = (cached: CachedForecast) =>
  Math.max(0, Math.round((Date.now() - cached.savedAt) / 60000));

export function isUsable(cached: CachedForecast | null): cached is CachedForecast {
  if (!cached?.forecast?.hours?.length) return false;
  return ageInMinutes(cached) < USABLE_MINUTES;
}
