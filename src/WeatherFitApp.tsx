import { useCallback, useEffect, useMemo, useState } from 'react';

import HourlyChart, { type ChartMetric } from './components/HourlyChart';
import DailyForecast from './components/DailyForecast';
import OutfitPanel from './components/OutfitPanel';
import WeatherIcon from './components/WeatherIcon';
import SkyScene from './components/SkyScene';
import PlacesSheet from './components/PlacesSheet';
import { fetchForecast, fromNow, getCoords, WeatherError, type Place } from './lib/weather';
import { buildHourlyOutfits, detectChanges, nextChange } from './lib/outfitEngine';
import { conditionForHour } from './lib/wmo';
import {
  clockLabel, degrees, humidityLabel, longDate, precipAmount, temp, tempWithUnit,
  uvLabel, windSpeed,
} from './lib/format';
import {
  cancelAll, permission, requestPermission, scheduleChangeAlerts, sendTestNotification,
} from './lib/notifications';
import {
  CURRENT_PLACE_ID, ageInMinutes, dropForecast, isUsable, loadAlerts, loadChartMetric,
  loadForecast, loadHomeId, loadPlaces, loadSelectedId, loadUnits, placeId, saveAlerts,
  saveChartMetric, saveForecast, saveHomeId, savePlaces, saveSelectedId, saveUnits,
} from './lib/cache';
import { skyFor } from './theme';
import type { Forecast, HourOutfit, HourWeather, SavedPlace, Units } from './types';

/** Hours the chart and the clothing rail cover. */
const SPAN = 24;

/**
 * The provider's live reading is minutes old; the hourly slot it falls in can
 * be nearly an hour old. Folding the live values into slot zero keeps the
 * hero, the chart's "Now" column and the outfit all describing one moment —
 * without it the header reads 18° while the chart reads 17° beneath it.
 *
 * Probability and UV stay with the hour, because the live block does not
 * report them and the hour's figures are the better answer anyway.
 */
function withLiveNow(forecast: Forecast | null): HourWeather[] {
  if (!forecast) return [];

  const hours = fromNow(forecast.hours, SPAN);
  const live = forecast.current;
  if (!live || hours.length === 0) return hours;

  const merged: HourWeather = {
    ...hours[0],
    tempC: live.tempC,
    feelsLikeC: live.feelsLikeC,
    windKph: live.windKph,
    gustKph: live.gustKph,
    humidity: live.humidity,
    cloudCover: live.cloudCover,
    isDay: live.isDay,
    code: live.code,
    precipMm: live.precipMm,
    snowfallCm: live.snowfallCm,
  };

  return [merged, ...hours.slice(1)];
}

const Logo = () => (
  <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" className="wf-brand__mark">
    <defs>
      <linearGradient id="wf-logo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--accent-2)" />
        <stop offset="100%" stopColor="var(--accent)" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="10" fill="url(#wf-logo)" />
    {/* a hanger: the weather app that dresses you */}
    <path
      d="M16 8.5a2.4 2.4 0 0 0-2.4 2.4h2.2a.4.4 0 1 1 .2.7L7.6 17a2 2 0 0 0 1 3.7h14.8a2 2 0 0 0 1-3.7l-6.6-3.9a2.4 2.4 0 0 0-1.8-4.6z"
      fill="#FFFFFF"
      opacity="0.95"
    />
  </svg>
);

export default function WeatherFitApp() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [homeId, setHomeId] = useState(CURRENT_PLACE_ID);
  const [selectedId, setSelectedId] = useState(CURRENT_PLACE_ID);

  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [staleMinutes, setStaleMinutes] = useState<number | null>(null);
  const [booting, setBooting] = useState(true);
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState(0);
  const [metric, setMetric] = useState<ChartMetric>('temperature');
  const [units, setUnits] = useState<Units>('metric');
  const [alerts, setAlerts] = useState(false);

  const load = useCallback(async (place: SavedPlace) => {
    setError(null);
    try {
      const coords = place.isCurrent
        ? await getCoords()
        : { lat: place.latitude, lon: place.longitude };

      if (!coords) {
        setError('Allow location access, or add a city to your places.');
        return;
      }

      const data = await fetchForecast(
        coords.lat,
        coords.lon,
        place.isCurrent ? undefined : place.name,
      );
      setForecast(data);
      setStaleMinutes(null);
      setSelected(0);
      saveForecast(place.id, data);
    } catch (err) {
      const cached = loadForecast(place.id);
      if (isUsable(cached)) {
        setForecast(cached.forecast);
        setStaleMinutes(ageInMinutes(cached));
      } else {
        setError(
          err instanceof WeatherError
            ? err.message
            : "Couldn't load the forecast. Try again.",
        );
      }
    }
  }, []);

  // Restore everything saved, paint the cached forecast, then refresh behind it.
  useEffect(() => {
    const saved = loadPlaces();
    const home = loadHomeId();
    const last = loadSelectedId();
    const startId = saved.some((p) => p.id === last) ? last! : home;
    const start = saved.find((p) => p.id === startId) ?? saved[0];

    setPlaces(saved);
    setHomeId(home);
    setSelectedId(start.id);
    setUnits(loadUnits());
    setAlerts(loadAlerts());

    const savedMetric = loadChartMetric();
    if (savedMetric === 'temperature' || savedMetric === 'precipitation' || savedMetric === 'wind') {
      setMetric(savedMetric);
    }

    const cached = loadForecast(start.id);
    if (isUsable(cached)) {
      setForecast(cached.forecast);
      setStaleMinutes(ageInMinutes(cached));
    }
    setBooting(false);

    void load(start);
  }, [load]);

  const hours = useMemo(() => withLiveNow(forecast), [forecast]);
  const hourly: HourOutfit[] = useMemo(
    () => buildHourlyOutfits(hours, units),
    [hours, units],
  );
  const changes = useMemo(() => detectChanges(hourly), [hourly]);
  const upcoming = useMemo(() => nextChange(hourly, changes), [hourly, changes]);

  useEffect(() => {
    if (selected >= hours.length && hours.length > 0) setSelected(0);
  }, [hours.length, selected]);

  // Timers die with the tab, so reschedule on every change and whenever the
  // tab comes back to the foreground.
  useEffect(() => {
    if (!alerts || hourly.length === 0) {
      cancelAll();
      return;
    }
    scheduleChangeAlerts(hourly, changes);

    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleChangeAlerts(hourly, changes);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      cancelAll();
    };
  }, [alerts, hourly, changes]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const cached = loadForecast(selectedId);
      if (!cached || ageInMinutes(cached) >= 30) {
        const place = places.find((p) => p.id === selectedId);
        if (place) void load(place);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, places, selectedId]);

  // ------------------------------------------------------------- actions

  const chooseUnits = (next: Units) => {
    setUnits(next);
    saveUnits(next);
  };

  const chooseMetric = (next: ChartMetric) => {
    setMetric(next);
    saveChartMetric(next);
  };

  const toggleAlerts = async (on: boolean) => {
    if (on && !(await requestPermission())) {
      setError(
        permission() === 'denied'
          ? 'Notifications are blocked for this site. Allow them in your browser settings.'
          : 'Notifications were not enabled.',
      );
      return;
    }
    setAlerts(on);
    saveAlerts(on);
  };

  const selectPlace = useCallback((id: string) => {
    const place = places.find((p) => p.id === id);
    if (!place) return;

    setSelectedId(id);
    saveSelectedId(id);

    // Paint that city's last forecast immediately, so switching is instant
    // even though the network call is about to run.
    const cached = loadForecast(id);
    if (isUsable(cached)) {
      setForecast(cached.forecast);
      setStaleMinutes(ageInMinutes(cached));
    } else {
      setForecast(null);
      setStaleMinutes(null);
    }
    setSelected(0);
    void load(place);
  }, [load, places]);

  const addPlace = (found: Place) => {
    const id = placeId(found.latitude, found.longitude);
    const existing = places.find((p) => p.id === id);

    if (!existing) {
      const next = [...places, {
        id, name: found.name, latitude: found.latitude, longitude: found.longitude,
      }];
      setPlaces(next);
      savePlaces(next);
    }

    setSelectedId(id);
    saveSelectedId(id);
    setForecast(null);
    setSelected(0);
    void load(existing ?? {
      id, name: found.name, latitude: found.latitude, longitude: found.longitude,
    });
  };

  const removePlace = (id: string) => {
    if (id === CURRENT_PLACE_ID) return;

    const next = places.filter((p) => p.id !== id);
    setPlaces(next);
    savePlaces(next);
    dropForecast(id);

    if (homeId === id) {
      setHomeId(CURRENT_PLACE_ID);
      saveHomeId(CURRENT_PLACE_ID);
    }
    if (selectedId === id) {
      const fallback = next.find((p) => p.id === homeId) ?? next[0];
      setSelectedId(fallback.id);
      saveSelectedId(fallback.id);
      setForecast(null);
      void load(fallback);
    }
  };

  const movePlace = (id: string, delta: -1 | 1) => {
    const from = places.findIndex((p) => p.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= places.length) return;

    const next = [...places];
    [next[from], next[to]] = [next[to], next[from]];
    setPlaces(next);
    savePlaces(next);
  };

  const chooseHome = (id: string) => {
    setHomeId(id);
    saveHomeId(id);
  };

  // -------------------------------------------------------------- render

  const place = places.find((p) => p.id === selectedId);
  const live = hours[selected];
  const stamp = selected === 0 ? (forecast?.current?.time ?? live?.time) : live?.time;
  const condition = live ? conditionForHour(live.code, live.cloudCover) : null;
  const theme = skyFor(live);
  const otherUnits: Units = units === 'metric' ? 'imperial' : 'metric';

  // The high/low and the sun times belong to the day being shown, not to
  // today, or selecting tomorrow morning would caption it with today's range.
  const activeDay = live && forecast?.days
    ? forecast.days.find((d) => d.date === live.time.slice(0, 10)) ?? forecast.days[0]
    : undefined;

  return (
    <div className="wf-app">
      <header className="wf-top">
        <div className="wf-brand">
          <Logo />
          <span className="wf-brand__name">Weather<span>Fit</span></span>
        </div>

        <button
          type="button"
          className="wf-placebtn"
          onClick={() => setManaging(true)}
          aria-label="Your places"
        >
          <span className="wf-placebtn__pin" aria-hidden="true">◎</span>
          <span className="wf-placebtn__name">
            {forecast?.placeName ?? place?.name ?? 'Choose a place'}
          </span>
          <span className="wf-placebtn__caret" aria-hidden="true">▾</span>
        </button>

        <div className="wf-units" role="group" aria-label="Temperature units">
          <button
            type="button"
            className={`wf-unit${units === 'metric' ? ' wf-unit--on' : ''}`}
            aria-pressed={units === 'metric'}
            onClick={() => chooseUnits('metric')}
          >
            °C
          </button>
          <button
            type="button"
            className={`wf-unit${units === 'imperial' ? ' wf-unit--on' : ''}`}
            aria-pressed={units === 'imperial'}
            onClick={() => chooseUnits('imperial')}
          >
            °F
          </button>
        </div>
      </header>

      {error && (
        <div className="wf-notice" role="status">
          <p>{error}</p>
          <button
            type="button"
            className="wf-link"
            onClick={() => place && load(place)}
          >
            Try again
          </button>
        </div>
      )}

      {booting && !forecast && <div className="wf-loading">Loading the forecast…</div>}

      {live && condition && (
        <>
          <section
            className="wf-hero wf-rise"
            aria-label="Current conditions"
            style={{ color: theme.ink }}
          >
            <SkyScene theme={theme} className="wf-hero__sky" />

            <div className="wf-hero__inner">
              <div className="wf-hero__place">
                <h1>{forecast?.placeName ?? place?.name ?? 'Your location'}</h1>
                <p className="wf-hero__time">
                  {stamp && `${longDate(stamp)} · ${clockLabel(stamp)}`}
                  {staleMinutes !== null && ` · saved ${staleMinutes} min ago`}
                </p>
              </div>

              <div className="wf-hero__reading">
                <WeatherIcon
                  kind={condition.icon}
                  isDay={live.isDay}
                  size={104}
                  className="wf-hero__icon"
                  label={condition.label}
                />
                <div>
                  <div className="wf-hero__temp">
                    {degrees(live.tempC, units)}
                    <span className="wf-hero__deg">°{units === 'imperial' ? 'F' : 'C'}</span>
                    <span className="wf-hero__alt">
                      ({tempWithUnit(live.tempC, otherUnits)})
                    </span>
                  </div>
                  <p className="wf-hero__condition">{condition.label}</p>
                  <p className="wf-hero__feels">
                    Feels like {temp(live.feelsLikeC, units)}
                    {activeDay && ` · ${degrees(activeDay.tempMaxC, units)}° / ${degrees(activeDay.tempMinC, units)}°`}
                  </p>
                </div>
              </div>

              <dl className="wf-hero__stats">
                <div>
                  <dt>Precipitation</dt>
                  <dd>{Math.round(live.precipProb)}%</dd>
                </div>
                <div>
                  <dt>Humidity</dt>
                  <dd>{Math.round(live.humidity)}%</dd>
                </div>
                <div>
                  <dt>Wind</dt>
                  <dd>{windSpeed(live.windKph, units)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <OutfitPanel
            hourly={hourly}
            changes={changes}
            upcoming={upcoming}
            selected={selected}
            units={units}
            alerts={alerts}
            onToggleAlerts={toggleAlerts}
            onSelect={setSelected}
            onTest={() => sendTestNotification(upcoming)}
          />

          <HourlyChart
            hours={hours}
            units={units}
            metric={metric}
            onMetricChange={chooseMetric}
            selected={selected}
            onSelect={setSelected}
          />

          {forecast?.days && <DailyForecast days={forecast.days} units={units} />}

          <section className="wf-card wf-tiles" aria-label="Conditions in detail">
            <h2 className="wf-card__title">Conditions</h2>
            <div className="wf-tiles__grid">
              <div className="wf-tile">
                <span className="wf-tile__label">Feels like</span>
                <span className="wf-tile__value">{temp(live.feelsLikeC, units)}</span>
                <span className="wf-tile__note">
                  {Math.abs(live.feelsLikeC - live.tempC) < 1
                    ? 'Close to the actual temperature'
                    : live.feelsLikeC < live.tempC
                      ? 'Wind is making it feel colder'
                      : 'Humidity is making it feel warmer'}
                </span>
              </div>

              <div className="wf-tile">
                <span className="wf-tile__label">Humidity</span>
                <span className="wf-tile__value">{Math.round(live.humidity)}%</span>
                <span className="wf-tile__note">{humidityLabel(live.humidity)}</span>
              </div>

              <div className="wf-tile">
                <span className="wf-tile__label">Wind</span>
                <span className="wf-tile__value">{windSpeed(live.windKph, units)}</span>
                <span className="wf-tile__note">Gusts to {windSpeed(live.gustKph, units)}</span>
              </div>

              <div className="wf-tile">
                <span className="wf-tile__label">UV index</span>
                <span className="wf-tile__value">{Math.round(live.uvIndex)}</span>
                <span className="wf-tile__note">{uvLabel(live.uvIndex)}</span>
              </div>

              <div className="wf-tile">
                <span className="wf-tile__label">Precipitation</span>
                <span className="wf-tile__value">{precipAmount(live.precipMm, units)}</span>
                <span className="wf-tile__note">
                  {Math.round(live.precipProb)}% chance this hour
                </span>
              </div>

              <div className="wf-tile">
                <span className="wf-tile__label">Sun</span>
                <span className="wf-tile__value">
                  {activeDay?.sunrise ? clockLabel(activeDay.sunrise) : '—'}
                </span>
                <span className="wf-tile__note">
                  Sets {activeDay?.sunset ? clockLabel(activeDay.sunset) : '—'}
                </span>
              </div>
            </div>
          </section>

          <footer className="wf-foot">
            <span>WeatherFit · forecast from Open-Meteo</span>
          </footer>
        </>
      )}

      {managing && (
        <PlacesSheet
          places={places}
          homeId={homeId}
          selectedId={selectedId}
          onAdd={addPlace}
          onRemove={removePlace}
          onMove={movePlace}
          onSetHome={chooseHome}
          onSelect={selectPlace}
          onClose={() => setManaging(false)}
        />
      )}
    </div>
  );
}
