import type { DayWeather, Forecast, HourWeather } from '../types';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

const HOURLY_FIELDS = [
  'temperature_2m', 'apparent_temperature', 'precipitation_probability',
  'precipitation', 'snowfall', 'wind_speed_10m', 'wind_gusts_10m',
  'uv_index', 'relative_humidity_2m', 'cloud_cover', 'is_day', 'weather_code',
].join(',');

const DAILY_FIELDS = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min',
  'precipitation_probability_max', 'precipitation_sum', 'wind_speed_10m_max',
  'uv_index_max', 'sunrise', 'sunset',
].join(',');

const CURRENT_FIELDS = [
  'temperature_2m', 'apparent_temperature', 'precipitation', 'snowfall',
  'wind_speed_10m', 'wind_gusts_10m', 'relative_humidity_2m', 'cloud_cover',
  'is_day', 'weather_code',
].join(',');

/** Days of outlook the multi-day list shows. */
export const FORECAST_DAYS = 10;

export class WeatherError extends Error {}

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
}

/** Browser geolocation, wrapped so a denied or slow fix resolves to null
 *  rather than leaving the UI waiting forever. */
export function getCoords(): Promise<{ lat: number; lon: number } | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const done = (v: { lat: number; lon: number } | null) => {
      if (!settled) { settled = true; resolve(v); }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => done({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => done(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );

    setTimeout(() => done(null), 9000);
  });
}

/** Best-effort place name. Never throws — an unnamed location still works. */
async function placeNameFor(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `${REVERSE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    if (!res.ok) return 'Your location';
    const json = await res.json();
    return json.city || json.locality || json.principalSubdivision || 'Your location';
  } catch {
    return 'Your location';
  }
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new WeatherError('Place search is unavailable right now.');
  const json = await res.json();
  return (json.results ?? []).map((r: Record<string, unknown>) => ({
    name: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '),
    latitude: r.latitude as number,
    longitude: r.longitude as number,
  }));
}

export async function fetchForecast(
  lat: number,
  lon: number,
  placeName?: string,
): Promise<Forecast> {
  const url =
    `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    `&hourly=${HOURLY_FIELDS}&daily=${DAILY_FIELDS}&current=${CURRENT_FIELDS}` +
    `&forecast_days=${FORECAST_DAYS}&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new WeatherError("Couldn't reach the forecast. Check your connection and retry.");
  }
  const json = await res.json();
  const h = json.hourly;
  if (!h?.time?.length) throw new WeatherError('No forecast came back for that place.');

  const hours: HourWeather[] = h.time.map((time: string, i: number) => ({
    time,
    tempC: h.temperature_2m[i],
    feelsLikeC: h.apparent_temperature?.[i] ?? h.temperature_2m[i],
    precipProb: h.precipitation_probability?.[i] ?? 0,
    precipMm: h.precipitation?.[i] ?? 0,
    snowfallCm: h.snowfall?.[i] ?? 0,
    windKph: h.wind_speed_10m?.[i] ?? 0,
    gustKph: h.wind_gusts_10m?.[i] ?? 0,
    uvIndex: h.uv_index?.[i] ?? 0,
    humidity: h.relative_humidity_2m?.[i] ?? 50,
    cloudCover: h.cloud_cover?.[i] ?? 0,
    isDay: (h.is_day?.[i] ?? 1) === 1,
    code: h.weather_code?.[i] ?? 0,
  }));

  const d = json.daily;
  const days: DayWeather[] = (d?.time ?? []).map((date: string, i: number) => ({
    date,
    code: d.weather_code?.[i] ?? 0,
    tempMaxC: d.temperature_2m_max?.[i] ?? 0,
    tempMinC: d.temperature_2m_min?.[i] ?? 0,
    precipProb: d.precipitation_probability_max?.[i] ?? 0,
    precipMm: d.precipitation_sum?.[i] ?? 0,
    windMaxKph: d.wind_speed_10m_max?.[i] ?? 0,
    uvMax: d.uv_index_max?.[i] ?? 0,
    sunrise: d.sunrise?.[i] ?? '',
    sunset: d.sunset?.[i] ?? '',
  }));

  return {
    placeName: placeName ?? (await placeNameFor(lat, lon)),
    latitude: lat,
    longitude: lon,
    timezone: json.timezone,
    hours,
    days,
    current: currentFrom(json.current, hours),
  };
}

/** The live reading, which the provider reports without a UV or precipitation
 *  probability. Both are filled from the hour it falls in so every consumer —
 *  including the outfit engine — sees a complete `HourWeather`. */
function currentFrom(
  c: Record<string, number | string> | undefined,
  hours: HourWeather[],
): HourWeather | undefined {
  if (!c || typeof c.time !== 'string') return undefined;

  const stamp = new Date(c.time).getTime();
  const nearest = hours.reduce<HourWeather | undefined>((best, h) => {
    if (!best) return h;
    const d = Math.abs(new Date(h.time).getTime() - stamp);
    return d < Math.abs(new Date(best.time).getTime() - stamp) ? h : best;
  }, undefined);

  const num = (key: string, fallback: number) =>
    typeof c[key] === 'number' ? (c[key] as number) : fallback;

  return {
    time: c.time,
    tempC: num('temperature_2m', nearest?.tempC ?? 0),
    feelsLikeC: num('apparent_temperature', nearest?.feelsLikeC ?? 0),
    precipProb: nearest?.precipProb ?? 0,
    precipMm: num('precipitation', nearest?.precipMm ?? 0),
    snowfallCm: num('snowfall', nearest?.snowfallCm ?? 0),
    windKph: num('wind_speed_10m', nearest?.windKph ?? 0),
    gustKph: num('wind_gusts_10m', nearest?.gustKph ?? 0),
    uvIndex: nearest?.uvIndex ?? 0,
    humidity: num('relative_humidity_2m', nearest?.humidity ?? 50),
    cloudCover: num('cloud_cover', nearest?.cloudCover ?? 0),
    isDay: num('is_day', nearest?.isDay ? 1 : 0) === 1,
    code: num('weather_code', nearest?.code ?? 0),
  };
}

/** Trim to the hours from the current one onwards. */
export function fromNow(hours: HourWeather[], span = 24): HourWeather[] {
  const cutoff = Date.now() - 60 * 60 * 1000;
  const i = hours.findIndex((x) => new Date(x.time).getTime() >= cutoff);
  const start = i === -1 ? 0 : i;
  return hours.slice(start, start + span);
}
